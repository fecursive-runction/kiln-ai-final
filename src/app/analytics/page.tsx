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
  Legend,
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
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
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
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="tab1">Primary</TabsTrigger>
          <TabsTrigger value="tab2">Oxides</TabsTrigger>
          <TabsTrigger value="tab3">Phases</TabsTrigger>
        </TabsList>

        {liveMetrics && (
          <>
            <TabsContent value="tab1" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ThinMetricCard
                  icon={<Flame className="w-5 h-5" />}
                  label="Kiln Temperature"
                  value={liveMetrics.kilnTemperature}
                  unit="°C"
                  color="text-primary"
                />
                <ThinMetricCard
                  icon={<Gauge className="w-5 h-5" />}
                  label="Feed Rate"
                  value={liveMetrics.feedRate}
                  unit="TPH"
                  color="text-chart-blue"
                />
                <ThinMetricCard
                  icon={<Beaker className="w-5 h-5" />}
                  label="LSF"
                  value={liveMetrics.lsf}
                  unit="%"
                  color="text-chart-purple"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Primary Metrics Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="time" 
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: '11px', fontFamily: 'var(--font-space-mono)' }}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: '11px', fontFamily: 'var(--font-space-mono)' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ fontSize: '12px', fontFamily: 'var(--font-space-mono)' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="kilnTemp" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        name="Kiln Temp (°C)"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="feedRate" 
                        stroke="hsl(var(--chart-blue))" 
                        strokeWidth={2}
                        name="Feed Rate (TPH)"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="lsf" 
                        stroke="hsl(var(--chart-purple))" 
                        strokeWidth={2}
                        name="LSF (%)"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tab2" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <ThinMetricCard
                  icon={<TestTube className="w-5 h-5" />}
                  label="CaO"
                  value={liveMetrics.cao}
                  unit="%"
                  color="text-chart-blue"
                />
                <ThinMetricCard
                  icon={<TestTube className="w-5 h-5" />}
                  label="SiO₂"
                  value={liveMetrics.sio2}
                  unit="%"
                  color="text-chart-purple"
                />
                <ThinMetricCard
                  icon={<TestTube className="w-5 h-5" />}
                  label="Al₂O₃"
                  value={liveMetrics.al2o3}
                  unit="%"
                  color="text-chart-yellow"
                />
                <ThinMetricCard
                  icon={<TestTube className="w-5 h-5" />}
                  label="Fe₂O₃"
                  value={liveMetrics.fe2o3}
                  unit="%"
                  color="text-chart-orange"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Oxide Composition Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="time" 
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: '11px', fontFamily: 'var(--font-space-mono)' }}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: '11px', fontFamily: 'var(--font-space-mono)' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ fontSize: '12px', fontFamily: 'var(--font-space-mono)' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cao" 
                        stroke="hsl(var(--chart-blue))" 
                        strokeWidth={2}
                        name="CaO (%)"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="sio2" 
                        stroke="hsl(var(--chart-purple))" 
                        strokeWidth={2}
                        name="SiO₂ (%)"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="al2o3" 
                        stroke="hsl(var(--chart-yellow))" 
                        strokeWidth={2}
                        name="Al₂O₃ (%)"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="fe2o3" 
                        stroke="hsl(var(--chart-orange))" 
                        strokeWidth={2}
                        name="Fe₂O₃ (%)"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tab3" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <ThinMetricCard
                  icon={<Beaker className="w-5 h-5" />}
                  label="C₃S (Alite)"
                  value={liveMetrics.c3s}
                  unit="%"
                  color="text-primary"
                />
                <ThinMetricCard
                  icon={<Beaker className="w-5 h-5" />}
                  label="C₂S (Belite)"
                  value={liveMetrics.c2s}
                  unit="%"
                  color="text-chart-blue"
                />
                <ThinMetricCard
                  icon={<Beaker className="w-5 h-5" />}
                  label="C₃A"
                  value={liveMetrics.c3a}
                  unit="%"
                  color="text-chart-purple"
                />
                <ThinMetricCard
                  icon={<Beaker className="w-5 h-5" />}
                  label="C₄AF"
                  value={liveMetrics.c4af}
                  unit="%"
                  color="text-chart-orange"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Clinker Phase Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="time" 
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: '11px', fontFamily: 'var(--font-space-mono)' }}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: '11px', fontFamily: 'var(--font-space-mono)' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ fontSize: '12px', fontFamily: 'var(--font-space-mono)' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="c3s" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        name="C₃S (%)"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="c2s" 
                        stroke="hsl(var(--chart-blue))" 
                        strokeWidth={2}
                        name="C₂S (%)"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="c3a" 
                        stroke="hsl(var(--chart-purple))" 
                        strokeWidth={2}
                        name="C₃A (%)"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="c4af" 
                        stroke="hsl(var(--chart-orange))" 
                        strokeWidth={2}
                        name="C₄AF (%)"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

function ThinMetricCard({ 
  icon, 
  label, 
  value, 
  unit, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number; 
  unit: string;
  color: string;
}) {
  return (
    <Card className="card-hover">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`${color} opacity-80`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider truncate">
              {label}
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className={`text-xl font-bold font-mono ${color}`}>
                {formatNumber(value, { decimals: 2 })}
              </span>
              <span className="text-xs text-muted-foreground font-mono">{unit}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}