//
// FILE: src/ai/tools/plant-data-tools.ts (Corrected)
//

import {
  optimizeCementProduction,
} from '../flows/optimize-cement-production';
// Import types from the new schemas file
import {
  type OptimizeCementProductionInput,
  type OptimizeCementProductionOutput,
} from '../flows/optimization-schemas'; 
import {
  getLatestMetric as getLatestMetricFromDB,
  getMetricsHistory as getMetricsHistoryFromDB,
  getRecentAlerts as getRecentAlertsFromDB,
  getHistoricalData as getHistoricalDataFromDB,
  insertMetric as insertMetricToDB,
  type ProductionMetric as ProductionMetricType,
} from '@/lib/data/metrics';

// *** NEW ***
// Helper function to calculate LSF (copied from api/ingest/route.ts)
const calculateLSF = (cao: number, sio2: number, al2o3: number, fe2o3: number) => {
  const denominator = 2.8 * sio2 + 1.18 * al2o3 + 0.65 * fe2o3;
  if (denominator === 0) return 0;
  return (cao / denominator) * 100;
};

// *** NEW ***
// Helper function to parse adjustment strings like "+2%" or "-1.5%"
const parseAdjustment = (adjustmentString: string): number => {
  try {
    const numericValue = parseFloat(adjustmentString.replace('%', ''));
    if (isNaN(numericValue)) return 0;
    return numericValue / 100; // Convert percentage to decimal, e.g., 2 -> 0.02
  } catch {
    return 0;
  }
};


export async function getLiveMetrics() {
  const latest = await getLatestMetricFromDB();
  return latest ? latest : null;
}

export async function getRecentAlerts() {
  return await getRecentAlertsFromDB();
}

export async function getHistoricalData(metricName: string, daysAgo: number) {
  return await getHistoricalDataFromDB(metricName, daysAgo);
}

//
// *** MODIFIED ***
// This function now performs the final calculation.
//
export async function runOptimization(goal: string): Promise<OptimizeCementProductionOutput> {
  try {
    const latest = await getLatestMetricFromDB();
    if (!latest) throw new Error('No live metrics available');

    const aiInput: OptimizeCementProductionInput = {
      plantId: 'poc_plant_01',
      kilnTemperature: latest.kiln_temp,
      feedRate: latest.feed_rate,
      lsf: latest.lsf,
      cao: latest.cao,
      sio2: latest.sio2,
      al2o3: latest.al2o3,
      fe2o3: latest.fe2o3,
      constraints: [goal],
    };

    // 1. Get the AI recommendations (this is fast now)
    const aiResult = await optimizeCementProduction(aiInput);

    // 2. Parse the AI's recommended adjustments
    const limestoneAdj = parseAdjustment(aiResult.limestoneAdjustment);
    const clayAdj = parseAdjustment(aiResult.clayAdjustment);

    // 3. Calculate the predicted chemical composition
    const predictedCao = latest.cao * (1 + limestoneAdj);
    const predictedSio2 = latest.sio2 * (1 + clayAdj);
    const predictedAl2o3 = latest.al2o3 * (1 + clayAdj);
    // Fe2O3 remains unchanged

    // 4. Calculate the final LSF using our helper function
    const predictedLSF = calculateLSF(
      predictedCao,
      predictedSio2,
      predictedAl2o3,
      latest.fe2o3
    );

    // 5. Return the complete recommendation object
    return {
      ...aiResult,
      predictedLSF: parseFloat(predictedLSF.toFixed(1)), // Format to one decimal place
    };

  } catch (error: any) { 
    console.error('Error in runOptimization tool:', error);
    // This correctly throws the error so the page can catch it
    throw new Error(`Optimization failed: ${error.message}`);
  }
}