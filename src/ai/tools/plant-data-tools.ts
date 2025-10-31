//
// FILE: src/ai/tools/plant-data-tools.ts (Corrected)
//

import {
  optimizeCementProduction,
  type OptimizeCementProductionInput,
} from '../flows/optimize-cement-production';
import {
  getLatestMetric as getLatestMetricFromDB,
  getMetricsHistory as getMetricsHistoryFromDB,
  getRecentAlerts as getRecentAlertsFromDB,
  getHistoricalData as getHistoricalDataFromDB,
  insertMetric as insertMetricToDB,
  type ProductionMetric as ProductionMetricType,
} from '@/lib/data/metrics';

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
// FIX 3: This function is now correct
//
export async function runOptimization(goal: string) {
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

    const result = await optimizeCementProduction(aiInput);
    return result;
  } catch (error: any) {
    console.error('Error in runOptimization tool:', error);
    return { error: error.message };
  }
}