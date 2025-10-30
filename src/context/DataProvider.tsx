'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { getLiveMetrics, getAiAlerts, getMetricsHistory } from '@/app/actions';
import { toast } from '@/hooks/use-toast';
import { formatChartTime } from '@/lib/formatters';

// Type definitions based on API contract
export interface LiveMetrics {
  kilnTemperature: number;
  feedRate: number;
  lsf: number;
  cao: number;
  sio2: number;
  al2o3: number;
  fe2o3: number;
  c3s: number;
  c2s: number;
  c3a: number;
  c4af: number;
}

export interface Alert {
  id: string;
  timestamp: Date;
  severity: 'CRITICAL' | 'WARNING';
  message: string;
}

export interface ProductionMetric {
  id: number;
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
}

export interface ChartDataPoint {
  time: string;
  temperature: number;
}

interface DataContextValue {
  liveMetrics: LiveMetrics | null;
  alerts: Alert[];
  metricsHistory: ProductionMetric[];
  chartData: ChartDataPoint[];
  loading: boolean;
  refreshData: () => Promise<void>;
  startPlant: () => Promise<void>;
  stopPlant: () => void;
  emergencyStop: () => void;
}

const DataContext = createContext<DataContextValue>({
  liveMetrics: null,
  alerts: [],
  metricsHistory: [],
  chartData: [],
  loading: true,
  refreshData: async () => {},
  startPlant: async () => {},
  stopPlant: () => {},
  emergencyStop: () => {},
});

/**
 * Transform history data to chart format
 * Keeps last 50 points in chronological order
 */
function transformHistoryToChartData(
  history: ProductionMetric[]
): ChartDataPoint[] {
  return history
    .map((metric) => ({
      time: formatChartTime(metric.timestamp),
      temperature: metric.kiln_temp,
    }))
    .reverse() // Chronological order (oldest → newest)
    .slice(-50); // Keep last 50 points maximum
}

/**
 * DataProvider Component
 * Manages real-time data fetching with dual-interval system:
 * 1. Ingestion interval - triggers backend data generation every 5s
 * 2. Polling interval - fetches fresh data every 5s
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [metricsHistory, setMetricsHistory] = useState<ProductionMetric[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [plantRunning, setPlantRunning] = useState(true);
  const ingestRef = { current: 0 as any } as { current: any };

  // Data fetching function (used by both initial load and refresh)
  const fetchData = async () => {
    try {
      const [metrics, aiAlerts, history] = await Promise.all([
        getLiveMetrics(),
        getAiAlerts(),
        getMetricsHistory(),
      ]);

      if (metrics) setLiveMetrics(metrics);
      if (aiAlerts) {
        // Ensure severity is correctly typed
        const typedAlerts: Alert[] = aiAlerts.map(alert => ({
          ...alert, severity: alert.severity as 'CRITICAL' | 'WARNING' }));
        setAlerts(typedAlerts);
      }
      if (history) {
        setMetricsHistory(history);
        // Transform for chart
        const transformed = transformHistoryToChartData(history);
        setChartData(transformed);
      }

      setLoading(false);
    } catch (error) {
      console.error('Data fetch error:', error);
      setLoading(false);
    }
  };

  // Interval 1: Data Ingestion Trigger
  // Calls /api/ingest to generate new simulated data when plantRunning
  useEffect(() => {
    const startIngest = () => {
      // avoid multiple intervals
      if (ingestRef.current) return;
      ingestRef.current = setInterval(async () => {
        try {
          await fetch('/api/ingest', { method: 'POST' });
        } catch (error) {
          console.error('Ingestion failed:', error);
        }
      }, 5000); // 5 seconds
    };

    const stopIngest = () => {
      if (ingestRef.current) {
        clearInterval(ingestRef.current);
        ingestRef.current = 0;
      }
    };

    if (plantRunning) startIngest();
    else stopIngest();

    return () => stopIngest();
  }, [plantRunning]);

  // Interval 2: Data Polling
  // Fetches fresh data from server actions
  useEffect(() => {
    // Initial fetch
    fetchData();

    // Poll every 5 seconds
    const pollInterval = setInterval(fetchData, 5000);

    return () => clearInterval(pollInterval);
  }, []);

  // Optional: Only fetch when tab is visible (performance optimization)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <DataContext.Provider
      value={{
        liveMetrics,
        alerts,
        metricsHistory,
        chartData,
        loading,
        refreshData: fetchData,
        startPlant: async () => {
          // start ingestion and fetch an immediate data point
          setPlantRunning(true);
          try {
            await fetchData();
            toast({ title: 'Plant started', description: 'Data ingestion resumed.' });
          } catch (e) {
            console.error('startPlant failed to fetch data', e);
            toast({ title: 'Start failed', description: 'Could not fetch data after starting.', variant: 'destructive' });
          }
        },
        stopPlant: () => {
          setPlantRunning(false);
          toast({ title: 'Plant stopped', description: 'Data ingestion paused.' });
        },
        emergencyStop: () => {
          // stop ingestion but keep the last known live metrics visible
          setPlantRunning(false);
          toast({ title: 'EMERGENCY STOP', description: 'All systems halted. Check plant immediately.', variant: 'destructive' });
          // Optionally, add an alert here in the future
        },
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

/**
 * Custom hook to access data context
 * Usage: const { liveMetrics, alerts, loading } = useData();
 */
export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

/**
 * Usage Example:
 * 
 * // In app/layout.tsx
 * import { DataProvider } from '@/context/DataProvider';
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <DataProvider>
 *           {children}
 *         </DataProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * 
 * // In any component
 * 'use client';
 * import { useData } from '@/context/DataProvider';
 * 
 * function Dashboard() {
 *   const { liveMetrics, alerts, loading } = useData();
 *   
 *   if (loading) return <LoadingSkeleton />;
 *   
 *   return (
 *     <div>
 *       <div>Temperature: {liveMetrics.kilnTemperature}°C</div>
 *       <div>{alerts.length} alerts</div>
 *     </div>
 *   );
 * }
 */