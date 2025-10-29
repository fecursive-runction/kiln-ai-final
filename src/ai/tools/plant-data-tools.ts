//
// FILE: src/ai/tools/plant-data-tools.ts (Corrected)
//

import { supabase } from '@/lib/supabaseClient'; // CITE: fecursive-runction/kiln-ai-final/kiln-ai-final-6c4ad047dd097f90294ec7a1e57cada0dae72532/src/lib/supabaseClient.ts
// FIX 1: Import the *function* and *type* from the flow file
import {
  optimizeCementProduction,
  type OptimizeCementProductionInput,
} from '../flows/optimize-cement-production'; // CITE: fecursive-runction/kiln-ai-final/kiln-ai-final-6c4ad047dd097f90294ec7a1e57cada0dae72532/src/ai/flows/optimize-cement-production.ts

// FIX 2: Import the getLiveMetrics server action to get the data we need
import { getLiveMetrics as getLiveMetricsFromAction } from '@/app/actions'; // CITE: fecursive-runction/kiln-ai-final/kiln-ai-final-6c4ad047dd097f90294ec7a1e57cada0dae72532/src/app/actions.ts

export async function getLiveMetrics() {
  const { data, error } = await supabase
    .from('production_metrics') // Using table from actions.ts
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(10);

  if (error) throw error;
  return data;
}

export async function getRecentAlerts() {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) throw error;
  return data;
}

export async function getHistoricalData(sensorId: string, daysAgo: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysAgo);

  const { data, error } = await supabase
    .from('production_metrics') // Using table from actions.ts
    .select('*')
    .eq('sensor_id', sensorId) // Assuming sensor_id is a column
    .gte('timestamp', startDate.toISOString())
    .order('timestamp', { ascending: true });

  if (error) throw error;
  return data;
}

//
// FIX 3: This function is now correct
//
export async function runOptimization(goal: string) {
  try {
    // 1. Get the current plant status from the server action
    const liveMetrics = await getLiveMetricsFromAction();

    // 2. Build the full input object
    const aiInput: OptimizeCementProductionInput = {
      plantId: 'poc_plant_01',
      kilnTemperature: liveMetrics.kilnTemperature,
      feedRate: liveMetrics.feedRate,
      lsf: liveMetrics.lsf,
      cao: liveMetrics.cao,
      sio2: liveMetrics.sio2,
      al2o3: liveMetrics.al2o3,
      fe2o3: liveMetrics.fe2o3,
      constraints: [goal], // Use the agent's goal as the constraint
    };

    // 3. Call the function directly
    const result = await optimizeCementProduction(aiInput);
    return result;
  } catch (error: any) {
    console.error('Error in runOptimization tool:', error);
    return { error: error.message };
  }
}