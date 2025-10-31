import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabaseClient';

const METRICS_TABLE = 'production_metrics';
const ALERTS_TABLE = 'alerts';

export type ProductionMetric = {
  timestamp: string;
  plant_id: string;
  kiln_temp: number;
  feed_rate: number;
  lsf: number;
  cao: number;
  sio2: number;
  al2o3: number;
  fe2o3: number;
  c3s: number;
  c2s: number;
  c3a: number;
  c4af: number;
};

const allowedMetrics = [
  'kiln_temp',
  'feed_rate',
  'lsf',
  'cao',
  'sio2',
  'al2o3',
  'fe2o3',
  'c3s',
  'c2s',
  'c3a',
  'c4af',
];

function serverSupabase() {
  return createSupabaseServerClient();
}

export async function getLatestMetric(): Promise<ProductionMetric | null> {
  const supabase = serverSupabase();
  const { data, error } = await supabase
    .from(METRICS_TABLE)
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as ProductionMetric | null;
}

export async function getMetricsHistory(limit = 50) {
  const supabase = serverSupabase();
  const { data, error } = await supabase
    .from(METRICS_TABLE)
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function insertMetric(metric: ProductionMetric) {
  const supabase = serverSupabase();
  const { error } = await supabase.from(METRICS_TABLE).insert([metric]);
  if (error) throw error;
  return true;
}

export async function getRecentAlerts(limit = 5) {
  const supabase = serverSupabase();
  const { data, error } = await supabase
    .from(ALERTS_TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    // If alerts table doesn't exist, return empty list instead of throwing in some cases
    console.warn('getRecentAlerts error:', error.message || error);
    return [];
  }
  return data ?? [];
}

export async function getHistoricalData(metricName: string, daysAgo: number) {
  if (!allowedMetrics.includes(metricName)) {
    throw new Error(`Invalid metric name: ${metricName}`);
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysAgo);

  const supabase = serverSupabase();
  const { data, error } = await supabase
    .from(METRICS_TABLE)
    .select(`timestamp, ${metricName}`)
    .gte('timestamp', startDate.toISOString())
    .order('timestamp', { ascending: true });

  if (error) throw error;

  return (data as Array<Record<string, any>>).map((row) => ({
    timestamp: row.timestamp,
    metric: metricName,
    value: row[metricName],
  }));
}

export async function insertAlert(record: { severity: string; message: string; metadata?: any }) {
  const supabase = serverSupabase();
  const payload = {
    created_at: new Date().toISOString(),
    severity: record.severity,
    message: record.message,
    metadata: record.metadata || null,
  };
  const { error } = await supabase.from(ALERTS_TABLE).insert([payload]);
  if (error) {
    console.warn('Failed to insert alert:', error.message || error);
    return false;
  }
  return true;
}

// Export a simple schema for production metric validation (optional)
export const ProductionMetricSchema = z.object({
  timestamp: z.string(),
  plant_id: z.string(),
  kiln_temp: z.number(),
  feed_rate: z.number(),
  lsf: z.number(),
  cao: z.number(),
  sio2: z.number(),
  al2o3: z.number(),
  fe2o3: z.number(),
  c3s: z.number(),
  c2s: z.number(),
  c3a: z.number(),
  c4af: z.number(),
});
