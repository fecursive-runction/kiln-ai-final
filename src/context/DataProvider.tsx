'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from 'react';
import { getAiAlerts } from '@/app/actions';
import { getLatestMetric, getMetricsHistory } from '@/lib/data/metrics';
import { toast } from '@/hooks/use-toast';
import { formatChartTime } from '@/lib/formatters';

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
  plantStatus: 'RUNNING' | 'STOPPED' | 'EMERGENCY' | 'FAULT' | 'LOADING';
  refreshData: () => Promise<void>;
  startPlant: () => Promise<void>;
  stopPlant: () => Promise<void>;
  emergencyStop: () => Promise<void>;
  
  pendingOptimization: {
    isGenerating: boolean;
    progress: number;
    error: string | null;
    recommendation: OptimizationRecommendation | null;
  };
  
  startOptimization: (formData: FormData) => Promise<void>;
  clearOptimization: () => void;
  
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
  plantStatus: 'RUNNING',
  refreshData: async () => {},
  startPlant: async () => {},
  stopPlant: async () => {},
  emergencyStop: async () => {},
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
  const [manualStatus, setManualStatus] = useState<'RUNNING' | 'STOPPED' | 'EMERGENCY' | null>(null);
  const ingestRef = useRef<any>(0);

  const plantStatus = usePlantStatus(liveMetrics, loading, manualStatus);

  const [optimizationState, setOptimizationState] = useState({
    isGenerating: false,
    progress: 0,
    error: null as string | null,
    recommendation: null as OptimizationRecommendation | null,
  });

  const [applicationState, setApplicationState] = useState({
    isApplying: false,
    success: false,
    message: '',
  });

  const optimizationPromiseRef = useRef<Promise<any> | null>(null);
  const progressIntervalRef = useRef<any>(null);

  const fetchData = async () => {
    try {
      const [latestMetric, aiAlerts, history] = await Promise.all([
        getLatestMetric(),
        getAiAlerts(),
        getMetricsHistory(50),
      ]);

      if (latestMetric) {
        setLiveMetrics({
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
        });
      } else {
        setLiveMetrics({
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
        });
      }

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

  const startOptimization = async (formData: FormData) => {
    if (optimizationState.isGenerating) {
      toast({
        title: 'Optimization in progress',
        description: 'Please wait for current optimization to complete.',
        variant: 'destructive',
      });
      return;
    }

    setApplicationState({
      isApplying: false,
      success: false,
      message: '',
    });

    setOptimizationState({
      isGenerating: true,
      progress: 0,
      error: null,
      recommendation: null,
    });

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

    const { runOptimization } = await import('@/app/actions');
    const promise = runOptimization({ error: null, recommendation: null }, formData);
    optimizationPromiseRef.current = promise;

    try {
      const result = await promise;

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

  const clearOptimization = () => {
    setOptimizationState({
      isGenerating: false,
      progress: 0,
      error: null,
      recommendation: null,
    });
    setApplicationState({
      isApplying: false,
      success: false,
      message: '',
    });
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

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
      const { applyOptimization } = await import('@/app/actions');

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

  useEffect(() => {
    if (plantRunning) {
      fetchData();
      const pollInterval = setInterval(fetchData, 5000);
      return () => clearInterval(pollInterval);
    }
  }, [plantRunning]);

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
        plantStatus,
        refreshData: fetchData,
        startPlant: async () => {
          setPlantRunning(true);
          setManualStatus('RUNNING');
          try {
            await fetchData();
            toast({ title: 'Plant started', description: 'Data ingestion resumed.' });
          } catch (e) {
            console.error('startPlant failed to fetch data', e);
            toast({ title: 'Start failed', description: 'Could not fetch data after starting.', variant: 'destructive' });
          }
        },
        stopPlant: async () => {
          setPlantRunning(false);
          setManualStatus('STOPPED');
          try {
            await fetchData();
            toast({ title: 'Plant stopped', description: 'Data ingestion paused.' });
          } catch (e) {
            console.error('stopPlant failed to fetch data', e);
            toast({ title: 'Stop failed', description: 'Could not fetch data after stopping.', variant: 'destructive' });
          }
        },
        emergencyStop: async () => {
          setPlantRunning(false);
          setManualStatus('EMERGENCY');
          try {
            await fetchData();
            toast({ title: 'EMERGENCY STOP', description: 'All systems halted. Check plant immediately.', variant: 'destructive' });
          } catch (e) {
            console.error('emergencyStop failed to fetch data', e);
            toast({ title: 'Emergency stop failed', description: 'Could not fetch data after emergency stop.', variant: 'destructive' });
          }
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

function usePlantStatus(
  liveMetrics: LiveMetrics | null,
  loading: boolean,
  manualStatus: 'RUNNING' | 'STOPPED' | 'EMERGENCY' | null
): 'RUNNING' | 'STOPPED' | 'EMERGENCY' | 'FAULT' | 'LOADING' {
  if (manualStatus) {
    return manualStatus;
  }

  if (loading) {
    return 'LOADING';
  }

  if (!liveMetrics) {
    return 'STOPPED';
  }

  if (liveMetrics.kilnTemperature < 1300 || liveMetrics.kilnTemperature > 1500) {
    return 'EMERGENCY';
  }
  if (liveMetrics.lsf < 90 || liveMetrics.lsf > 102) {
    return 'FAULT';
  }
  if (liveMetrics.kilnTemperature >= 1300 && liveMetrics.kilnTemperature <= 1500) {
    return 'RUNNING';
  }

  return 'STOPPED';
}