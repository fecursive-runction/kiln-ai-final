'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
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

export interface OptimizationRecommendation {
  recommendationId: string;
  timestamp: string;
  feedRateSetpoint: number;
  limestoneAdjustment: string;
  clayAdjustment: string;
  predictedLSF: number;
  explanation: string;
  originalMetrics: {
    kilnTemperature: number;
    feedRate: number;
    lsf: number;
    cao: number;
    sio2: number;
    al2o3: number;
    fe2o3: number;
  };
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
  
  // Optimization state
  pendingOptimization: {
    isGenerating: boolean;
    progress: number;
    error: string | null;
    recommendation: OptimizationRecommendation | null;
  };
  
  // Optimization actions
  startOptimization: (formData: FormData) => Promise<void>;
  clearOptimization: () => void;
  
  // Application state
  pendingApplication: {
    isApplying: boolean;
    success: boolean;
    message: string;
  };
  applyRecommendation: (recommendation: OptimizationRecommendation) => Promise<void>;
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
  pendingOptimization: {
    isGenerating: false,
    progress: 0,
    error: null,
    recommendation: null,
  },
  startOptimization: async () => {},
  clearOptimization: () => {},
  pendingApplication: {
    isApplying: false,
    success: false,
    message: '',
  },
  applyRecommendation: async () => {},
});

function transformHistoryToChartData(
  history: ProductionMetric[]
): ChartDataPoint[] {
  return history
    .map((metric) => ({
      time: formatChartTime(metric.timestamp),
      temperature: metric.kiln_temp,
    }))
    .reverse()
    .slice(-50);
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [metricsHistory, setMetricsHistory] = useState<ProductionMetric[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [plantRunning, setPlantRunning] = useState(true);
  const ingestRef = useRef<any>(0);

  // Optimization state
  const [optimizationState, setOptimizationState] = useState({
    isGenerating: false,
    progress: 0,
    error: null as string | null,
    recommendation: null as OptimizationRecommendation | null,
  });

  // Application state
  const [applicationState, setApplicationState] = useState({
    isApplying: false,
    success: false,
    message: '',
  });

  // Track active optimization promise
  const optimizationPromiseRef = useRef<Promise<any> | null>(null);
  const progressIntervalRef = useRef<any>(null);

  // Data fetching function
  const fetchData = async () => {
    try {
      const [metrics, aiAlerts, history] = await Promise.all([
        getLiveMetrics(),
        getAiAlerts(),
        getMetricsHistory(),
      ]);

      if (metrics) setLiveMetrics(metrics);
      if (aiAlerts) {
        const typedAlerts: Alert[] = aiAlerts.map(alert => ({
          ...alert, severity: alert.severity as 'CRITICAL' | 'WARNING' }));
        setAlerts(typedAlerts);
      }
      if (history) {
        setMetricsHistory(history);
        const transformed = transformHistoryToChartData(history);
        setChartData(transformed);
      }

      setLoading(false);
    } catch (error) {
      console.error('Data fetch error:', error);
      setLoading(false);
    }
  };

  // Start optimization (persistent across navigation)
  const startOptimization = async (formData: FormData) => {
    // If already generating, ignore
    if (optimizationState.isGenerating) {
      toast({
        title: 'Optimization in progress',
        description: 'Please wait for current optimization to complete.',
        variant: 'destructive',
      });
      return;
    }

    // Reset state
    setOptimizationState({
      isGenerating: true,
      progress: 0,
      error: null,
      recommendation: null,
    });

    // Start progress simulation
    progressIntervalRef.current = setInterval(() => {
      setOptimizationState(prev => ({
        ...prev,
        progress: Math.min(prev.progress + Math.random() * 10, 90),
      }));
    }, 500);

    toast({
      title: 'Generating optimization...',
      description: 'This may take 10-15 seconds. Feel free to navigate away.',
    });

    // Import the action dynamically to avoid circular deps
    const { runOptimization } = await import('@/app/actions');

    // Start the optimization (non-blocking)
    const promise = runOptimization({ error: null, recommendation: null }, formData);
    optimizationPromiseRef.current = promise;

    try {
      const result = await promise;

      // Clear progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      if (result.error) {
        setOptimizationState({
          isGenerating: false,
          progress: 0,
          error: result.error,
          recommendation: null,
        });
        toast({
          variant: 'destructive',
          title: 'Optimization Error',
          description: result.error,
        });
      } else if (result.recommendation) {
        setOptimizationState({
          isGenerating: false,
          progress: 100,
          error: null,
          recommendation: result.recommendation,
        });
        toast({
          title: 'Optimization Complete',
          description: 'Recommendation generated successfully.',
        });
      }
    } catch (err: any) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      console.error('Optimization error:', err);
      setOptimizationState({
        isGenerating: false,
        progress: 0,
        error: err.message || 'An unexpected error occurred.',
        recommendation: null,
      });
      toast({
        variant: 'destructive',
        title: 'Optimization Failed',
        description: err.message || 'Please try again.',
      });
    } finally {
      optimizationPromiseRef.current = null;
    }
  };

  // Clear optimization state
  const clearOptimization = () => {
    setOptimizationState({
      isGenerating: false,
      progress: 0,
      error: null,
      recommendation: null,
    });
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  // Apply recommendation (persistent across navigation)
  const applyRecommendation = async (recommendation: OptimizationRecommendation) => {
    if (applicationState.isApplying) {
      toast({
        title: 'Application in progress',
        description: 'Please wait for current application to complete.',
        variant: 'destructive',
      });
      return;
    }

    setApplicationState({
      isApplying: true,
      success: false,
      message: '',
    });

    toast({
      title: 'Applying recommendation...',
      description: 'Updating plant parameters.',
    });

    try {
      // Import action
      const { applyOptimization } = await import('@/app/actions');

      // Create FormData
      const formData = new FormData();
      formData.append('predictedLSF', recommendation.predictedLSF.toString());
      formData.append('limestoneAdjustment', recommendation.limestoneAdjustment);
      formData.append('clayAdjustment', recommendation.clayAdjustment);
      formData.append('feedRateSetpoint', recommendation.feedRateSetpoint.toString());
      formData.append('kilnTemperature', recommendation.originalMetrics.kilnTemperature.toString());
      formData.append('feedRate', recommendation.originalMetrics.feedRate.toString());
      formData.append('lsf', recommendation.originalMetrics.lsf.toString());
      formData.append('cao', recommendation.originalMetrics.cao.toString());
      formData.append('sio2', recommendation.originalMetrics.sio2.toString());
      formData.append('al2o3', recommendation.originalMetrics.al2o3.toString());
      formData.append('fe2o3', recommendation.originalMetrics.fe2o3.toString());

      const result = await applyOptimization({ success: false, message: '' }, formData);

      setApplicationState({
        isApplying: false,
        success: result.success,
        message: result.message,
      });

      if (result.success) {
        toast({
          title: 'Recommendation Applied',
          description: 'Plant parameters updated successfully. Data will reflect changes shortly.',
        });
        
        // Refresh data after short delay
        setTimeout(() => {
          fetchData();
        }, 2000);
      } else {
        toast({
          variant: 'destructive',
          title: 'Application Failed',
          description: result.message,
        });
      }
    } catch (err: any) {
      console.error('Application error:', err);
      setApplicationState({
        isApplying: false,
        success: false,
        message: err.message || 'Failed to apply recommendation.',
      });
      toast({
        variant: 'destructive',
        title: 'Application Failed',
        description: err.message || 'Please try again.',
      });
    }
  };

  // Ingestion interval
  useEffect(() => {
    const startIngest = () => {
      if (ingestRef.current) return;
      ingestRef.current = setInterval(async () => {
        try {
          await fetch('/api/ingest', { method: 'POST' });
        } catch (error) {
          console.error('Ingestion failed:', error);
        }
      }, 5000);
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

  // Polling interval
  useEffect(() => {
    fetchData();
    const pollInterval = setInterval(fetchData, 5000);
    return () => clearInterval(pollInterval);
  }, []);

  // Visibility change handler
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
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
          setPlantRunning(false);
          toast({ title: 'EMERGENCY STOP', description: 'All systems halted. Check plant immediately.', variant: 'destructive' });
        },
        pendingOptimization: optimizationState,
        startOptimization,
        clearOptimization,
        pendingApplication: applicationState,
        applyRecommendation,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}