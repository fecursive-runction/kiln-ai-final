"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useData } from '@/context/DataProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Flame,
  Gauge,
  Beaker,
  TestTube,
  TrendingUp,
} from 'lucide-react';
import { LiveMetrics, ProductionMetric } from '@/context/DataProvider';

const MAX_POINTS = 50;

function getMetric(metrics: LiveMetrics | ProductionMetric, key: string): number | undefined {
    const keys = [
        key,
        key.replace(/([A-Z])/g, '_$1').toLowerCase(),
        key.replace(/_([a-z])/g, (g) => g[1].toUpperCase()),
        key === 'kilnTemperature' ? 'kiln_temp' : null,
        key === 'feedRate' ? 'feed_rate' : null
    ].filter(Boolean) as string[];

    for (const k of keys) {
        if (k in metrics) {
            return (metrics as any)[k];
        }
    }

    return undefined;
}

function formatNumber(value: number, options: { decimals?: number } = {}) {
  const { decimals = 0 } = options;
  return value.toFixed(decimals);
}

// Custom hook for live chart data management
function useLiveChartData(metricKey: string, metricsHistory: any[]) {
  const [chartData, setChartData] = useState<any[]>([]);
  const lastProcessedTimestampRef = useRef<string | null>(null);

  useEffect(() => {
    if (!metricsHistory || metricsHistory.length === 0) {
      return;
    }

    const newMetrics = lastProcessedTimestampRef.current
      ? metricsHistory.filter(m => m.timestamp > lastProcessedTimestampRef.current!)
      : metricsHistory;

    if (newMetrics.length === 0) {
      return;
    }

    newMetrics.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const newPoints = newMetrics.map(metric => ({
      time: new Date(metric.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      value: getMetric(metric, metricKey),
    }));

    setChartData(prevData => {
      const updatedData = [...prevData, ...newPoints].slice(-MAX_POINTS);
      if (updatedData.length > 0) {
        lastProcessedTimestampRef.current = metricsHistory[metricsHistory.length - 1].timestamp;
      }
      return updatedData;
    });

  }, [metricsHistory, metricKey]);

  return chartData;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs font-mono text-muted-foreground mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium" style={{ color: entry.color }}>
              {entry.name}:
            </span>
            <span className="text-xs font-bold font-mono text-foreground">
              {formatNumber(entry.value, { decimals: 2 })}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const MetricCard = React.memo(({ metricKey, label, unit, color, icon: Icon, metricsHistory, liveMetrics }: any) => {
    const chartData = useLiveChartData(metricKey, metricsHistory);

    const currentValue = liveMetrics ? getMetric(liveMetrics, metricKey) : undefined;

    // Calculate dynamic y-axis domain with padding
    const dataValues = chartData.map(d => d.value).filter(v => v !== undefined && v !== null);
    const minVal = dataValues.length > 0 ? Math.min(...dataValues) : 0;
    const maxVal = dataValues.length > 0 ? Math.max(...dataValues) : 100;
    const padding = (maxVal - minVal) * 0.1 || 5;
    const yDomain = [minVal - padding, maxVal + padding];

    const formatYAxis = (value: number) => {
      return value.toFixed(1);
    };

    return (
      <Card className="card-hover">
        <CardHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Icon className="w-4 h-4" style={{ color }} />
              {label}
            </CardTitle>
            {currentValue !== undefined && (
              <span className="text-sm font-bold font-mono" style={{ color }}>
                {formatNumber(currentValue as number, { decimals: 2 })} {unit}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart 
              data={chartData}
              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="time"
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '10px', fontFamily: 'var(--font-space-mono)' }}
                interval="preserveStartEnd"
                tickCount={3}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '10px', fontFamily: 'var(--font-space-mono)' }}
                width={45}
                domain={yDomain}
                tickCount={8}
                tickFormatter={formatYAxis}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                name={label}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
});

export default function AnalyticsPage() {
  const { liveMetrics, metricsHistory, loading } = useData();
  const [activeTab, setActiveTab] = useState('tab1');

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }



  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono uppercase tracking-wider text-foreground">
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time process trends and analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <span className="text-xs font-mono text-muted-foreground">
            Last {MAX_POINTS} readings
          </span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-center">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="tab1">Primary</TabsTrigger>
            <TabsTrigger value="tab2">Raw Mix</TabsTrigger>
            <TabsTrigger value="tab3">Phases</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="tab1" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              metricKey="kilnTemperature"
              label="Kiln Temperature"
              unit="°C"
              color="hsl(var(--primary))"
              icon={Flame}
              metricsHistory={metricsHistory}
              liveMetrics={liveMetrics}
            />
            <MetricCard
              metricKey="feedRate"
              label="Feed Rate"
              unit="TPH"
              color="hsl(var(--chart-blue))"
              icon={Gauge}
              metricsHistory={metricsHistory}
              liveMetrics={liveMetrics}
            />
            <MetricCard
              metricKey="lsf"
              label="LSF"
              unit="%"
              color="hsl(var(--chart-purple))"
              icon={Beaker}
              metricsHistory={metricsHistory}
              liveMetrics={liveMetrics}
            />
          </div>
        </TabsContent>

        <TabsContent value="tab2" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              metricKey="cao"
              label="CaO"
              unit="%"
              color="hsl(var(--chart-blue))"
              icon={TestTube}
              metricsHistory={metricsHistory}
              liveMetrics={liveMetrics}
            />
            <MetricCard
              metricKey="sio2"
              label="SiO₂"
              unit="%"
              color="hsl(var(--chart-purple))"
              icon={TestTube}
              metricsHistory={metricsHistory}
              liveMetrics={liveMetrics}
            />
            <MetricCard
              metricKey="al2o3"
              label="Al₂O₃"
              unit="%"
              color="hsl(var(--chart-yellow))"
              icon={TestTube}
              metricsHistory={metricsHistory}
              liveMetrics={liveMetrics}
            />
            <MetricCard
              metricKey="fe2o3"
              label="Fe₂O₃"
              unit="%"
              color="hsl(var(--chart-orange))"
              icon={TestTube}
              metricsHistory={metricsHistory}
              liveMetrics={liveMetrics}
            />
          </div>
        </TabsContent>

        <TabsContent value="tab3" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              metricKey="c3s"
              label="C₃S (Alite)"
              unit="%"
              color="hsl(var(--primary))"
              icon={Beaker}
              metricsHistory={metricsHistory}
              liveMetrics={liveMetrics}
            />
            <MetricCard
              metricKey="c2s"
              label="C₂S (Belite)"
              unit="%"
              color="hsl(var(--chart-blue))"
              icon={Beaker}
              metricsHistory={metricsHistory}
              liveMetrics={liveMetrics}
            />
            <MetricCard
              metricKey="c3a"
              label="C₃A"
              unit="%"
              color="hsl(var(--chart-purple))"
              icon={Beaker}
              metricsHistory={metricsHistory}
              liveMetrics={liveMetrics}
            />
            <MetricCard
              metricKey="c4af"
              label="C₄AF"
              unit="%"
              color="hsl(var(--chart-orange))"
              icon={Beaker}
              metricsHistory={metricsHistory}
              liveMetrics={liveMetrics}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}