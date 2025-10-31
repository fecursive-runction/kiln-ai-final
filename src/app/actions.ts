'use server';

import { optimizeCementProduction, type OptimizeCementProductionInput } from '@/ai/flows/optimize-cement-production';
import { generateAlerts } from '@/ai/flows/generate-alerts';
import { z } from 'zod';
import {
  getLatestMetric,
  getMetricsHistory as getMetricsHistoryFromDB,
  insertMetric,
  getRecentAlerts as getRecentAlertsFromDB,
  getHistoricalData as getHistoricalDataFromDB,
  insertAlert,
} from '@/lib/data/metrics';
import { plantAgentFlow } from '@/ai/flows/plant-agent'; // ✅ updated import
import { Action } from 'genkit';

export async function getLiveMetrics() {
  try {
    const latestMetric = await getLatestMetric();

    if (!latestMetric) {
      return {
        kilnTemperature: 1450,
        feedRate: 220,
        lsf: 96,
        cao: 44,
        sio2: 14,
        al2o3: 3.5,
        fe2o3: 2.5,
        c3s: 65,
        c2s: 15,
        c3a: 9,
        c4af: 8,
      };
    }
    return {
      kilnTemperature: latestMetric.kiln_temp,
      feedRate: latestMetric.feed_rate,
      lsf: latestMetric.lsf,
      cao: latestMetric.cao,
      sio2: latestMetric.sio2,
      al2o3: latestMetric.al2o3,
      fe2o3: latestMetric.fe2o3,
      c3s: latestMetric.c3s,
      c2s: latestMetric.c2s,
      c3a: latestMetric.c3a,
      c4af: latestMetric.c4af,
    };
  } catch (e: any) {
    console.error('Failed to get live metrics:', e);
    return {
      kilnTemperature: 1450,
      feedRate: 220,
      lsf: 96,
      cao: 44,
      sio2: 14,
      al2o3: 3.5,
      fe2o3: 2.5,
      c3s: 65,
      c2s: 15,
      c3a: 9,
      c4af: 8,
    };
  }
}

export async function getMetricsHistory() {
  try {
    const history = await getMetricsHistoryFromDB(50);
    return history ?? [];
  } catch (e: any) {
    console.error('Failed to get metrics history:', e);
    return [];
  }
}

const optimizationSchema = z.object({
  constraints: z.string().optional(),
});

export async function runOptimization(prevState: any, formData: FormData) {
  const validatedFields = optimizationSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    console.error(validatedFields.error.flatten().fieldErrors);
    return {
      ...prevState,
      error: 'Invalid data submitted for optimization.',
      recommendation: null,
    };
  }

  try {
    const liveMetrics = await getLiveMetrics();

    const { constraints } = validatedFields.data;
    const constraintsList =
      constraints && constraints.trim()
        ? constraints.split(',').map((c) => c.trim())
        : ['TARGET_LSF_94_98'];

    const aiInput: OptimizeCementProductionInput = {
      plantId: 'poc_plant_01',
      kilnTemperature: liveMetrics.kilnTemperature,
      feedRate: liveMetrics.feedRate,
      lsf: liveMetrics.lsf,
      cao: liveMetrics.cao,
      sio2: liveMetrics.sio2,
      al2o3: liveMetrics.al2o3,
      fe2o3: liveMetrics.fe2o3,
      constraints: constraintsList,
    };

    const aiRecommendation = await optimizeCementProduction(aiInput);

    const finalRecommendation = {
      ...aiRecommendation,
      timestamp: new Date().toISOString(),
    };

    return {
      error: null,
      recommendation: finalRecommendation,
    };
  } catch (e: any) {
    console.error('Error in runOptimization:', e);
    return {
      ...prevState,
      error: e.message || 'An error occurred while generating the recommendation.',
      recommendation: null,
    };
  }
}

export async function getAiAlerts() {
  try {
    const liveMetrics = await getLiveMetrics();
    const alertResponse = await generateAlerts({
      kilnTemperature: liveMetrics.kilnTemperature,
      lsf: liveMetrics.lsf,
    });

    if (!alertResponse || !alertResponse.alerts || alertResponse.alerts.length === 0) {
      return [];
    }

    return alertResponse.alerts.map((alert, index) => ({
      ...alert,
      id: `alert-${Date.now()}-${index}`,
      timestamp: new Date(),
    }));
  } catch (e: any) {
    console.error('Failed to get AI alerts:', e);
    return [
      {
        id: 'err-alert-static',
        timestamp: new Date(),
        severity: 'WARNING',
        message: 'Could not retrieve AI-powered alerts.',
      },
    ];
  }
}

export async function applyOptimization(prevState: any, formData: FormData) {
  const currentMetrics = await getLiveMetrics();

  const lsf = parseFloat(formData.get('predictedLSF') as string);
  const limestoneAdj = parseFloat((formData.get('limestoneAdjustment') as string).replace('%', ''));
  const clayAdj = parseFloat((formData.get('clayAdjustment') as string).replace('%', ''));

  const newCao = currentMetrics.cao * (1 + limestoneAdj / 100);
  const newSio2 = currentMetrics.sio2 * (1 - clayAdj / 200);
  const newAl2o3 = currentMetrics.al2o3 * (1 - clayAdj / 200);

  const newFeedRate = parseFloat(formData.get('feedRateSetpoint') as string);
  const newKilnTemp =
    currentMetrics.kilnTemperature + (lsf > 98 ? -5 : lsf < 94 ? 5 : 0);

  const freeLime = 1.5;
  const cao_prime = newCao - freeLime;
  const newC3S = Math.max(
    0,
    4.071 * cao_prime -
      7.602 * newSio2 -
      6.719 * newAl2o3 -
      1.43 * currentMetrics.fe2o3
  );
  const newC2S = Math.max(0, 2.867 * newSio2 - 0.754 * newC3S);
  const newC3A = Math.max(0, 2.65 * newAl2o3 - 1.692 * currentMetrics.fe2o3);
  const newC4AF = Math.max(0, 3.043 * currentMetrics.fe2o3);

  try {
    const payload = {
      timestamp: new Date().toISOString(),
      plant_id: 'poc_plant_01',
      kiln_temp: parseFloat(newKilnTemp.toFixed(2)),
      feed_rate: parseFloat(newFeedRate.toFixed(2)),
      lsf: parseFloat(lsf.toFixed(1)),
      cao: parseFloat(newCao.toFixed(2)),
      sio2: parseFloat(newSio2.toFixed(2)),
      al2o3: parseFloat(newAl2o3.toFixed(2)),
      fe2o3: parseFloat(currentMetrics.fe2o3.toFixed(2)),
      c3s: parseFloat(newC3S.toFixed(2)),
      c2s: parseFloat(newC2S.toFixed(2)),
      c3a: parseFloat(newC3A.toFixed(2)),
      c4af: parseFloat(newC4AF.toFixed(2)),
    };

  await insertMetric(payload as any);

  return { success: true, message: 'Optimization applied successfully!' };
  } catch (error: any) {
    console.error('Failed to apply optimization:', error);
    return { success: false, message: 'Failed to apply optimization.' };
  }
}

export async function askPlantGuardian(
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>
) {
  try {
    // FIX: You MUST use runFlow to execute a Genkit flow
    const response = await runFlow(plantAgentFlow, { chatHistory });
    return { status: 'success' as const, data: response };
  } catch (error) {
    console.error('PlantGPT error:', error);
    return {
      status: 'error' as const,
      message:
        error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

/**
 * Execute a Genkit Action flow.
 *
 * The function attempts several common invocation patterns:
 * - If the flow is a function, call it directly.
 * - If the flow has a `.run()` / `.execute()` / `.start()` method, call that.
 * - If the result is an async iterable, consume it and return the last yielded value.
 */
async function runFlow(flow: any, input: any): Promise<any> {
  const isAsyncIterable = (v: any): v is AsyncIterable<any> =>
    v != null && typeof v[Symbol.asyncIterator] === 'function';

  try {
    let result: any;

    if (typeof flow === 'function') {
      // Some genkit flows may be plain functions
      result = await flow(input);
    } else if (flow && typeof flow.run === 'function') {
      result = await flow.run(input);
    } else if (flow && typeof flow.execute === 'function') {
      result = await flow.execute(input);
    } else if (flow && typeof flow.start === 'function') {
      result = await flow.start(input);
    } else {
      throw new Error('Unsupported flow shape: unable to execute flow');
    }

    // If the flow returns an async iterator (streaming), consume it and return last value
    if (isAsyncIterable(result)) {
      let last: any = undefined;
      for await (const chunk of result) {
        last = chunk;
      }
      return last;
    }

    return result;
  } catch (err) {
    // Normalize and rethrow so callers can handle the error consistently
    if (err instanceof Error) throw err;
    throw new Error(String(err));
  }
}
// 'use server';

// import { optimizeCementProduction, type OptimizeCementProductionInput } from '@/ai/flows/optimize-cement-production';
// import { generateAlerts } from '@/ai/flows/generate-alerts';
// import { z } from 'zod';
// import { getDb } from '@/lib/db';

// export async function getLiveMetrics() {
//     try {
//         const db = await getDb();
//         // Fetch the most recent record from the database
//         const latestMetric = await db.get('SELECT * FROM production_metrics ORDER BY timestamp DESC LIMIT 1');

//         if (!latestMetric) {
//             // Return a default/fallback state if the database is empty
//             return {
//                 kilnTemperature: 1450,
//                 feedRate: 220,
//                 lsf: 96,
//                 cao: 44,
//                 sio2: 14,
//                 al2o3: 3.5,
//                 fe2o3: 2.5,
//                 c3s: 65,
//                 c2s: 15,
//                 c3a: 9,
//                 c4af: 8,
//             };
//         }

//         return {
//             kilnTemperature: latestMetric.kiln_temp,
//             feedRate: latestMetric.feed_rate,
//             lsf: latestMetric.lsf,
//             cao: latestMetric.cao,
//             sio2: latestMetric.sio2,
//             al2o3: latestMetric.al2o3,
//             fe2o3: latestMetric.fe2o3,
//             c3s: latestMetric.c3s,
//             c2s: latestMetric.c2s,
//             c3a: latestMetric.c3a,
//             c4af: latestMetric.c4af,
//         };
//     } catch (e: any) {
//         console.error("Failed to get live metrics from SQLite:", e);
//         // Return default values on error
//         return {
//             kilnTemperature: 1450,
//             feedRate: 220,
//             lsf: 96,
//             cao: 44,
//             sio2: 14,
//             al2o3: 3.5,
//             fe2o3: 2.5,
//             c3s: 65,
//             c2s: 15,
//             c3a: 9,
//             c4af: 8,
//         };
//     }
// }

// export async function getMetricsHistory() {
//     try {
//         const db = await getDb();
//         const history = await db.all('SELECT * FROM production_metrics ORDER BY timestamp DESC LIMIT 50');
//         return history;
//     } catch (e: any) {
//         console.error("Failed to get metrics history from SQLite:", e);
//         return [];
//     }
// }


// const optimizationSchema = z.object({
//   constraints: z.string().optional(),
// });


// export async function runOptimization(prevState: any, formData: FormData) {
//   const validatedFields = optimizationSchema.safeParse(Object.fromEntries(formData.entries()));

//   if (!validatedFields.success) {
//     console.error(validatedFields.error.flatten().fieldErrors);
//     return {
//       ...prevState,
//       error: 'Invalid data submitted for optimization.',
//       recommendation: null,
//     };
//   }
  
//   try {
//     const liveMetrics = await getLiveMetrics();
    
//     const { constraints } = validatedFields.data;
//     const constraintsList = (constraints && constraints.trim()) 
//       ? constraints.split(',').map(c => c.trim()) 
//       : ["TARGET_LSF_94_98"];

//     const aiInput: OptimizeCementProductionInput = {
//       plantId: "poc_plant_01",
//       kilnTemperature: liveMetrics.kilnTemperature,
//       feedRate: liveMetrics.feedRate,
//       lsf: liveMetrics.lsf,
//       cao: liveMetrics.cao,
//       sio2: liveMetrics.sio2,
//       al2o3: liveMetrics.al2o3,
//       fe2o3: liveMetrics.fe2o3,
//       constraints: constraintsList,
//     };

//     const aiRecommendation = await optimizeCementProduction(aiInput);

//     const finalRecommendation = {
//         ...aiRecommendation,
//         timestamp: new Date().toISOString(),
//     };
    
//     return {
//       error: null,
//       recommendation: finalRecommendation,
//     };

//   } catch (e: any) {
//     console.error("Error in runOptimization:", e);
//     return {
//       ...prevState,
//       error: e.message || 'An error occurred while generating the recommendation.',
//       recommendation: null,
//     };
//   }
// }

// export async function getAiAlerts() {
//     try {
//         const liveMetrics = await getLiveMetrics();
//         const alertResponse = await generateAlerts({
//             kilnTemperature: liveMetrics.kilnTemperature,
//             lsf: liveMetrics.lsf,
//         });

//         if (!alertResponse || !alertResponse.alerts || alertResponse.alerts.length === 0) {
//             return [];
//         }

//         // Programmatically add a unique ID and timestamp to each alert
//         return alertResponse.alerts.map((alert, index) => ({
//             ...alert,
//             id: `alert-${Date.now()}-${index}`,
//             timestamp: new Date(),
//         }));

//     } catch (e: any) {
//         console.error("Failed to get AI alerts:", e);
//         // On failure, return an array with a single, clear error alert
//         return [{
//             id: 'err-alert-static',
//             timestamp: new Date(),
//             severity: 'WARNING',
//             message: 'Could not retrieve AI-powered alerts.',
//         }];
//     }
// }


// export async function applyOptimization(prevState: any, formData: FormData) {
//     const db = await getDb();
//     const currentMetrics = await getLiveMetrics();
    
//     const lsf = parseFloat(formData.get('predictedLSF') as string);
//     const limestoneAdj = parseFloat((formData.get('limestoneAdjustment') as string).replace('%', ''));
//     const clayAdj = parseFloat((formData.get('clayAdjustment') as string).replace('%', ''));

//     const newCao = currentMetrics.cao * (1 + limestoneAdj / 100);
//     const newSio2 = currentMetrics.sio2 * (1 - clayAdj / 200);
//     const newAl2o3 = currentMetrics.al2o3 * (1 - clayAdj / 200);

//     const newFeedRate = parseFloat(formData.get('feedRateSetpoint') as string);
//     const newKilnTemp = currentMetrics.kilnTemperature + (lsf > 98 ? -5 : (lsf < 94 ? 5 : 0));
    
//     // Recalculate Bogue's phases based on new composition
//     const freeLime = 1.5;
//     const cao_prime = newCao - freeLime;
//     const newC3S = Math.max(0, 4.071 * cao_prime - 7.602 * newSio2 - 6.719 * newAl2o3 - 1.430 * currentMetrics.fe2o3);
//     const newC2S = Math.max(0, 2.867 * newSio2 - 0.754 * newC3S);
//     const newC3A = Math.max(0, 2.650 * newAl2o3 - 1.692 * currentMetrics.fe2o3);
//     const newC4AF = Math.max(0, 3.043 * currentMetrics.fe2o3);

//     try {
//         const newMetricRecord = [
//             new Date().toISOString(),
//             'poc_plant_01',
//             parseFloat(newKilnTemp.toFixed(2)),
//             parseFloat(newFeedRate.toFixed(2)),
//             parseFloat(lsf.toFixed(1)),
//             parseFloat(newCao.toFixed(2)),
//             parseFloat(newSio2.toFixed(2)),
//             parseFloat(newAl2o3.toFixed(2)),
//             parseFloat(currentMetrics.fe2o3.toFixed(2)),
//             parseFloat(newC3S.toFixed(2)),
//             parseFloat(newC2S.toFixed(2)),
//             parseFloat(newC3A.toFixed(2)),
//             parseFloat(newC4AF.toFixed(2)),
//         ];
//         await db.run(
//             'INSERT INTO production_metrics (timestamp, plant_id, kiln_temp, feed_rate, lsf, cao, sio2, al2o3, fe2o3, c3s, c2s, c3a, c4af) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
//             newMetricRecord
//         );
//         return { success: true, message: 'Optimization applied successfully!' };
//     } catch (error: any) {
//         console.error('Failed to apply optimization:', error);
//         return { success: false, message: 'Failed to apply optimization.' };
//     }
// }
