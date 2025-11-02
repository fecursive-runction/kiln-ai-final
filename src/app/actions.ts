// src/app/actions.ts - FIXED VERSION
'use server';

import { optimizeCementProduction } from '@/ai/flows/optimize-cement-production';
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
import { plantAgentFlow } from '@/ai/flows/plant-agent';
import { Action } from 'genkit';

// CRITICAL: Import the activation function from the route
// This ensures we can trigger optimization
import { activateOptimizationTarget } from '@/app/api/ingest/route';

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
  kilnTemperature: z.string(),
  feedRate: z.string(),
  lsf: z.string(),
  cao: z.string(),
  sio2: z.string(),
  al2o3: z.string(),
  fe2o3: z.string(),
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
    const {
      kilnTemperature,
      feedRate,
      lsf,
      cao,
      sio2,
      al2o3,
      fe2o3,
      constraints,
    } = validatedFields.data;

    const constraintsList =
      constraints && constraints.trim()
        ? constraints.split(',').map((c) => c.trim())
        : ['TARGET_LSF_94_98'];

    const aiInput = {
      plantId: 'poc_plant_01',
      kilnTemperature: Number(kilnTemperature),
      feedRate: Number(feedRate),
      lsf: Number(lsf),
      cao: Number(cao),
      sio2: Number(sio2),
      al2o3: Number(al2o3),
      fe2o3: Number(fe2o3),
      constraints: constraintsList,
    };

    const aiRecommendation = await optimizeCementProduction(aiInput);

    const parseAdjustment = (adjustmentString: string) => {
      try {
        const numericValue = parseFloat(String(adjustmentString).replace('%', ''));
        if (isNaN(numericValue)) return 0;
        return numericValue / 100;
      } catch {
        return 0;
      }
    };

    const limestoneAdj = parseAdjustment(aiRecommendation.limestoneAdjustment);
    const clayAdj = parseAdjustment(aiRecommendation.clayAdjustment);

    const predictedCao = aiInput.cao * (1 + limestoneAdj);
    const predictedSio2 = aiInput.sio2 * (1 + clayAdj);
    const predictedAl2o3 = aiInput.al2o3 * (1 + clayAdj);

    const denominator = 2.8 * predictedSio2 + 1.18 * predictedAl2o3 + 0.65 * aiInput.fe2o3;
    const predictedLSF = denominator === 0 ? 0 : (predictedCao / denominator) * 100;

    const finalRecommendation = {
      ...aiRecommendation,
      timestamp: new Date().toISOString(),
      originalMetrics: aiInput,
      predictedLSF: parseFloat(Number.isFinite(predictedLSF) ? predictedLSF.toFixed(1) : '0'),
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
  console.log('[APPLY] ═══════════════════════════════════════');
  console.log('[APPLY] 🚀 STARTING OPTIMIZATION APPLICATION');
  console.log('[APPLY] ═══════════════════════════════════════');

  const originalMetrics = {
    kilnTemperature: parseFloat(formData.get('kilnTemperature') as string),
    feedRate: parseFloat(formData.get('feedRate') as string),
    lsf: parseFloat(formData.get('lsf') as string),
    cao: parseFloat(formData.get('cao') as string),
    sio2: parseFloat(formData.get('sio2') as string),
    al2o3: parseFloat(formData.get('al2o3') as string),
    fe2o3: parseFloat(formData.get('fe2o3') as string),
  };

  const predictedLSF = parseFloat(formData.get('predictedLSF') as string);
  const limestoneAdjStr = formData.get('limestoneAdjustment') as string;
  const clayAdjStr = formData.get('clayAdjustment') as string;
  const newFeedRate = parseFloat(formData.get('feedRateSetpoint') as string);

  // Parse adjustments (remove % sign if present)
  const limestoneAdj = parseFloat(limestoneAdjStr.replace('%', '')) / 100;
  const clayAdj = parseFloat(clayAdjStr.replace('%', '')) / 100;

  console.log('[APPLY] Current State:');
  console.log('[APPLY]   LSF:', originalMetrics.lsf.toFixed(2), '%');
  console.log('[APPLY]   CaO:', originalMetrics.cao.toFixed(2), '%');
  console.log('[APPLY]   SiO2:', originalMetrics.sio2.toFixed(2), '%');
  console.log('[APPLY]   Temperature:', originalMetrics.kilnTemperature.toFixed(1), '°C');
  console.log('[APPLY] ───────────────────────────────────────');
  console.log('[APPLY] Target State:');
  console.log('[APPLY]   LSF:', predictedLSF.toFixed(2), '% (Δ', (predictedLSF - originalMetrics.lsf).toFixed(2), '%)');
  console.log('[APPLY]   Limestone adjustment:', (limestoneAdj * 100).toFixed(2), '%');
  console.log('[APPLY]   Clay adjustment:', (clayAdj * 100).toFixed(2), '%');
  console.log('[APPLY]   Feed rate:', newFeedRate.toFixed(1), 'TPH');
  console.log('[APPLY] ───────────────────────────────────────');

  try {
    // CRITICAL: Directly call the activation function
    console.log('[APPLY] 🎯 Calling activateOptimizationTarget...');
    await activateOptimizationTarget(
      predictedLSF,
      newFeedRate,
      limestoneAdj,
      clayAdj
    );
    console.log('[APPLY] ✅ activateOptimizationTarget completed successfully');

    console.log('[APPLY] ═══════════════════════════════════════');
    console.log('[APPLY] ✅ OPTIMIZATION ACTIVATED');
    console.log('[APPLY] 🔄 Data ingestion now controlled by optimizer');
    console.log('[APPLY] ⏱️  Expected completion: ~3.3 minutes (40 ticks @ 5s)');
    console.log('[APPLY] 📊 Watch the Dashboard/Analytics for real-time convergence');
    console.log('[APPLY] 📝 Check browser console for tick-by-tick logs');
    console.log('[APPLY] ═══════════════════════════════════════');

    return { 
      success: true, 
      message: `Optimization activated! System converging from ${originalMetrics.lsf.toFixed(1)}% to ${predictedLSF.toFixed(1)}% LSF. Monitor the dashboard for smooth, direct convergence over the next 3.3 minutes.` 
    };
  } catch (error: any) {
    console.error('[APPLY] ❌ FAILED:', error);
    console.error('[APPLY] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      message: `Failed to apply optimization: ${error?.message ?? String(error)}`
    };
  }
}

export async function askPlantGuardian(
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>
) {
  try {
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

async function runFlow(flow: any, input: any): Promise<any> {
  const isAsyncIterable = (v: any): v is AsyncIterable<any> =>
    v != null && typeof v[Symbol.asyncIterator] === 'function';

  try {
    let result: any;

    if (typeof flow === 'function') {
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

    if (isAsyncIterable(result)) {
      let last: any = undefined;
      for await (const chunk of result) {
        last = chunk;
      }
      return last;
    }

    return result;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(String(err));
  }
}