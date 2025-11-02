import {
  optimizeCementProduction,
} from '../flows/optimize-cement-production';
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

const calculateLSF = (cao: number, sio2: number, al2o3: number, fe2o3: number) => {
  const denominator = 2.8 * sio2 + 1.18 * al2o3 + 0.65 * fe2o3;
  if (denominator === 0) return 0;
  return (cao / denominator) * 100;
};

const parseAdjustment = (adjustmentString: string): number => {
  try {
    const numericValue = parseFloat(adjustmentString.replace('%', ''));
    if (isNaN(numericValue)) return 0;
    return numericValue / 100;
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

    const aiResult = await optimizeCementProduction(aiInput);

    const limestoneAdj = parseAdjustment(aiResult.limestoneAdjustment);
    const clayAdj = parseAdjustment(aiResult.clayAdjustment);

    const predictedCao = latest.cao * (1 + limestoneAdj);
    const predictedSio2 = latest.sio2 * (1 + clayAdj);
    const predictedAl2o3 = latest.al2o3 * (1 + clayAdj);

    const predictedLSF = calculateLSF(
      predictedCao,
      predictedSio2,
      predictedAl2o3,
      latest.fe2o3
    );

    return {
      ...aiResult,
      predictedLSF: parseFloat(predictedLSF.toFixed(1)),
    };

  } catch (error: any) { 
    console.error('Error in runOptimization tool:', error);
    throw new Error(`Optimization failed: ${error.message}`);
  }
}