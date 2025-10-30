// src/app/analytics/page.tsx
"use client";
import React, { useState } from 'react';
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
import { formatNumber } from '@/lib/formatters';
import {
  Flame,
  Gauge,
  Beaker,
  TestTube,
  TrendingUp,
} from 'lucide-react';

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

  const chartData = metricsHistory.map((metric) => ({
    time: new Date(metric.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    kilnTemp: metric.kiln_temp,
    feedRate: metric.feed_rate,
    lsf: metric.lsf,
    cao: metric.cao,
    sio2: metric.sio2,
    al2o3: metric.al2o3,
    fe2o3: metric.fe2o3,
    c3s: metric.c3s,
    c2s: metric.c2s,
    c3a: metric.c3a,
    c4af: metric.c4af,
  })).reverse();

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

  const MetricCard = ({ metricKey, label, unit, color, icon: Icon }: any) => {
    // liveMetrics in DataProvider uses some different naming for keys
    // e.g. DataProvider.LiveMetrics defines `kilnTemperature` while
    // chart data uses `kilnTemp`. Try multiple fallbacks so the value
    // is shown correctly:
    const getLiveMetricValue = () => {
      if (!liveMetrics) return undefined;

      // explicit aliases for mismatched names
      const aliasMap: Record<string, string> = {
        kilnTemp: 'kilnTemperature',
      };

      // try list: exact, alias, camel->snake
      const snake = metricKey.replace(/([A-Z])/g, '_$1').toLowerCase();
      const tryKeys = [metricKey, aliasMap[metricKey], snake];

      for (const k of tryKeys) {
        if (!k) continue;
        const v = (liveMetrics as any)[k];
        if (v !== undefined) return v;
      }

      return undefined;
    };

    const currentValue = getLiveMetricValue();

    return (
      <Card className="card-hover">
        <CardHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Icon className="w-4 h-4" style={{ color }} />
              {label}
            </CardTitle>
            {currentValue !== undefined && (
              // Make value the same font size as the CardTitle (text-sm)
              <span className="text-sm font-bold font-mono" style={{ color }}>
                {formatNumber(currentValue as number, { decimals: 2 })} {unit}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
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
                domain={['auto', 'auto']}
                tickCount={5}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey={metricKey}
                stroke={color}
                strokeWidth={2}
                name={label}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

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
            Last 50 readings
          </span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-center">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="tab1">Primary</TabsTrigger>
            <TabsTrigger value="tab2">Oxides</TabsTrigger>
            <TabsTrigger value="tab3">Phases</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="tab1" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              metricKey="kilnTemp"
              label="Kiln Temperature"
              unit="°C"
              color="hsl(var(--primary))"
              icon={Flame}
            />
            <MetricCard
              metricKey="feedRate"
              label="Feed Rate"
              unit="TPH"
              color="hsl(var(--chart-blue))"
              icon={Gauge}
            />
            <MetricCard
              metricKey="lsf"
              label="LSF"
              unit="%"
              color="hsl(var(--chart-purple))"
              icon={Beaker}
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
            />
            <MetricCard
              metricKey="sio2"
              label="SiO₂"
              unit="%"
              color="hsl(var(--chart-purple))"
              icon={TestTube}
            />
            <MetricCard
              metricKey="al2o3"
              label="Al₂O₃"
              unit="%"
              color="hsl(var(--chart-yellow))"
              icon={TestTube}
            />
            <MetricCard
              metricKey="fe2o3"
              label="Fe₂O₃"
              unit="%"
              color="hsl(var(--chart-orange))"
              icon={TestTube}
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
            />
            <MetricCard
              metricKey="c2s"
              label="C₂S (Belite)"
              unit="%"
              color="hsl(var(--chart-blue))"
              icon={Beaker}
            />
            <MetricCard
              metricKey="c3a"
              label="C₃A"
              unit="%"
              color="hsl(var(--chart-purple))"
              icon={Beaker}
            />
            <MetricCard
              metricKey="c4af"
              label="C₄AF"
              unit="%"
              color="hsl(var(--chart-orange))"
              icon={Beaker}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}