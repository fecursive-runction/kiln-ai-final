// src/ai/tools/plant-data-tools.ts
import { supabase } from '@/lib/supabaseClient';
import { optimizeCementProduction } from '../flows/optimize-cement-production';

export async function getLiveMetrics() {
  const { data, error } = await supabase
    .from('sensor_readings')
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
    .from('sensor_readings')
    .select('*')
    .eq('sensor_id', sensorId)
    .gte('timestamp', startDate.toISOString())
    .order('timestamp', { ascending: true });
  
  if (error) throw error;
  return data;
}

export async function runOptimization(goal: string) {
  const result = await optimizeCementProduction({
    plantId: 'plant-1',
    kilnTemperature: 1450,
    feedRate: 100,
    lsf: 0.92,
    cao: 65,
    sio2: 22,
    al2o3: 5,
    fe2o3: 3,
    constraints: [goal]
  });
  return result;
}