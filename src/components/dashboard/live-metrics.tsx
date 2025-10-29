'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LiveMetrics } from '@/context/DataProvider';
import { Flame, Gauge, Beaker, TestTube } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';

interface LiveMetricsProps {
  liveMetrics: LiveMetrics | null;
}

export function LiveMetricsPanel({ liveMetrics }: LiveMetricsProps) {
  const [activeTab, setActiveTab] = useState('tab1');

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-base md:text-lg">Live Metrics</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 mb-4 flex-shrink-0">
            <TabsTrigger value="tab1" className="font-mono text-xs md:text-sm">
              Primary
            </TabsTrigger>
            <TabsTrigger value="tab2" className="font-mono text-xs md:text-sm">
              Oxides
            </TabsTrigger>
            <TabsTrigger value="tab3" className="font-mono text-xs md:text-sm">
              Phases
            </TabsTrigger>
          </TabsList>

          {liveMetrics && (
            <div className="flex-1 overflow-y-auto lg:overflow-hidden">
              <TabsContent value="tab1" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <MetricCard
                    icon={<Flame className="w-5 h-5" />}
                    label="Kiln Temperature"
                    value={liveMetrics.kilnTemperature}
                    unit="°C"
                    color="text-primary"
                  />
                  <MetricCard
                    icon={<Gauge className="w-5 h-5" />}
                    label="Feed Rate"
                    value={liveMetrics.feedRate}
                    unit="TPH"
                    color="text-chart-blue"
                  />
                  <MetricCard
                    icon={<Beaker className="w-5 h-5" />}
                    label="LSF"
                    value={liveMetrics.lsf}
                    unit="%"
                    color="text-chart-purple"
                  />
                </div>
              </TabsContent>

              <TabsContent value="tab2" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <MetricCard
                    icon={<TestTube className="w-5 h-5" />}
                    label="Calcium Oxide (CaO)"
                    value={liveMetrics.cao}
                    unit="%"
                    color="text-chart-blue"
                  />
                  <MetricCard
                    icon={<TestTube className="w-5 h-5" />}
                    label="Silicon Dioxide (SiO₂)"
                    value={liveMetrics.sio2}
                    unit="%"
                    color="text-chart-purple"
                  />
                  <MetricCard
                    icon={<TestTube className="w-5 h-5" />}
                    label="Aluminum Oxide (Al₂O₃)"
                    value={liveMetrics.al2o3}
                    unit="%"
                    color="text-chart-yellow"
                  />
                  <MetricCard
                    icon={<TestTube className="w-5 h-5" />}
                    label="Iron Oxide (Fe₂O₃)"
                    value={liveMetrics.fe2o3}
                    unit="%"
                    color="text-chart-orange"
                  />
                </div>
              </TabsContent>

              <TabsContent value="tab3" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <MetricCard
                    icon={<Beaker className="w-5 h-5" />}
                    label="C₃S (Alite)"
                    value={liveMetrics.c3s}
                    unit="%"
                    color="text-primary"
                  />
                  <MetricCard
                    icon={<Beaker className="w-5 h-5" />}
                    label="C₂S (Belite)"
                    value={liveMetrics.c2s}
                    unit="%"
                    color="text-chart-blue"
                  />
                  <MetricCard
                    icon={<Beaker className="w-5 h-5" />}
                    label="C₃A"
                    value={liveMetrics.c3a}
                    unit="%"
                    color="text-chart-purple"
                  />
                  <MetricCard
                    icon={<Beaker className="w-5 h-5" />}
                    label="C₄AF"
                    value={liveMetrics.c4af}
                    unit="%"
                    color="text-chart-orange"
                  />
                </div>
              </TabsContent>
            </div>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function MetricCard({ 
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
    <Card className="card-hover border-border/50">
      <CardContent className="p-3 md:p-4">
        <div className="flex items-center gap-3">
          <div className={`${color} opacity-80 flex-shrink-0`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
              {label}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl md:text-2xl font-bold font-mono ${color} leading-none`}>
                {formatNumber(value, { decimals: label.includes('Temperature') ? 1 : 2 })}
              </span>
              <span className="text-xs md:text-sm text-muted-foreground font-mono">{unit}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}