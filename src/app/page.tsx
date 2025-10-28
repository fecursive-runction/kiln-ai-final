"use client";
import React, { useActionState, useState} from 'react';
import { useData } from '@/context/DataProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertsFeed } from '@/components/dashboard/alerts-feed';
import { 
  Play, 
  Square, 
  AlertTriangle, 
  Flame, 
  Gauge, 
  Beaker,
  TestTube,
  Download,
  FileText,
} from 'lucide-react';
import { formatNumber } from '@/lib/formatters';

export default function DashboardPage() {
  const { liveMetrics, alerts, loading } = useData();
  const [activeTab, setActiveTab] = useState('tab1');

  const getPlantStatus = () => {
    if (loading) return 'LOADING';
    if (!liveMetrics) return 'STOPPED';
    
    if (liveMetrics.kilnTemperature < 1420 || liveMetrics.kilnTemperature > 1480) {
      return 'EMERGENCY';
    }
    if (liveMetrics.lsf < 92 || liveMetrics.lsf > 100) {
      return 'FAULT';
    }
    if (liveMetrics.kilnTemperature >= 1420 && liveMetrics.kilnTemperature <= 1480) {
      return 'RUNNING';
    }
    return 'STOPPED';
  };

  const plantStatus = getPlantStatus();

  const getStatusVariant = () => {
    switch (plantStatus) {
      case 'RUNNING':
        return 'running';
      case 'STOPPED':
        return 'stopped';
      case 'EMERGENCY':
        return 'emergency';
      case 'FAULT':
        return 'fault';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
          <Skeleton className="lg:col-span-3 h-full" />
          <Skeleton className="lg:col-span-6 h-full" />
          <Skeleton className="lg:col-span-3 h-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-screen overflow-hidden flex flex-col">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-hidden">
        {/* LEFT COLUMN - Plant Status & Controls */}
        <div className="lg:col-span-3 space-y-4 overflow-y-auto">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-primary" />
                Plant Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-3">
                <Badge variant={getStatusVariant()} className="text-lg px-4 py-2">
                  {plantStatus}
                </Badge>
                {liveMetrics && (
                  <div className="space-y-2 text-left">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Temperature:</span>
                      <span className="font-mono font-bold text-primary">
                        {formatNumber(liveMetrics.kilnTemperature, { decimals: 1 })}°C
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Feed Rate:</span>
                      <span className="font-mono font-bold">
                        {formatNumber(liveMetrics.feedRate, { decimals: 1 })} TPH
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">LSF:</span>
                      <span className="font-mono font-bold">
                        {formatNumber(liveMetrics.lsf, { decimals: 1 })}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <Button 
                  variant="success" 
                  className="w-full"
                  disabled={plantStatus === 'RUNNING'}
                >
                  <Play className="w-4 h-4" />
                  Start Plant
                </Button>
                <Button 
                  variant="warning" 
                  className="w-full"
                  disabled={plantStatus === 'STOPPED'}
                >
                  <Square className="w-4 h-4" />
                  Stop Plant
                </Button>
                <Button 
                  variant="destructive" 
                  className="w-full"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Emergency Stop
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MIDDLE COLUMN - Tabbed KPI Cards */}
        <div className="lg:col-span-6 overflow-y-auto">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Live Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="tab1" className="font-mono text-xs">
                    Primary
                  </TabsTrigger>
                  <TabsTrigger value="tab2" className="font-mono text-xs">
                    Oxides
                  </TabsTrigger>
                  <TabsTrigger value="tab3" className="font-mono text-xs">
                    Phases
                  </TabsTrigger>
                </TabsList>

                {liveMetrics && (
                  <>
                    <TabsContent value="tab1" className="space-y-4">
                      <MetricCard
                        icon={<Flame className="w-6 h-6" />}
                        label="Kiln Temperature"
                        value={liveMetrics.kilnTemperature}
                        unit="°C"
                        color="text-primary"
                      />
                      <MetricCard
                        icon={<Gauge className="w-6 h-6" />}
                        label="Feed Rate"
                        value={liveMetrics.feedRate}
                        unit="TPH"
                        color="text-chart-blue"
                      />
                      <MetricCard
                        icon={<Beaker className="w-6 h-6" />}
                        label="LSF"
                        value={liveMetrics.lsf}
                        unit="%"
                        color="text-chart-purple"
                      />
                    </TabsContent>

                    <TabsContent value="tab2" className="space-y-4">
                      <MetricCard
                        icon={<TestTube className="w-6 h-6" />}
                        label="Calcium Oxide (CaO)"
                        value={liveMetrics.cao}
                        unit="%"
                        color="text-chart-blue"
                      />
                      <MetricCard
                        icon={<TestTube className="w-6 h-6" />}
                        label="Silicon Dioxide (SiO₂)"
                        value={liveMetrics.sio2}
                        unit="%"
                        color="text-chart-purple"
                      />
                      <MetricCard
                        icon={<TestTube className="w-6 h-6" />}
                        label="Aluminum Oxide (Al₂O₃)"
                        value={liveMetrics.al2o3}
                        unit="%"
                        color="text-chart-yellow"
                      />
                      <MetricCard
                        icon={<TestTube className="w-6 h-6" />}
                        label="Iron Oxide (Fe₂O₃)"
                        value={liveMetrics.fe2o3}
                        unit="%"
                        color="text-chart-orange"
                      />
                    </TabsContent>

                    <TabsContent value="tab3" className="space-y-4">
                      <MetricCard
                        icon={<Beaker className="w-6 h-6" />}
                        label="C₃S (Alite)"
                        value={liveMetrics.c3s}
                        unit="%"
                        color="text-primary"
                      />
                      <MetricCard
                        icon={<Beaker className="w-6 h-6" />}
                        label="C₂S (Belite)"
                        value={liveMetrics.c2s}
                        unit="%"
                        color="text-chart-blue"
                      />
                      <MetricCard
                        icon={<Beaker className="w-6 h-6" />}
                        label="C₃A"
                        value={liveMetrics.c3a}
                        unit="%"
                        color="text-chart-purple"
                      />
                      <MetricCard
                        icon={<Beaker className="w-6 h-6" />}
                        label="C₄AF"
                        value={liveMetrics.c4af}
                        unit="%"
                        color="text-chart-orange"
                      />
                    </TabsContent>
                  </>
                )}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN - Alerts Feed */}
        <div className="lg:col-span-3 overflow-y-auto">
          <AlertsFeed alerts={alerts} liveMetrics={liveMetrics} />
        </div>
      </div>

      {/* BOTTOM SECTION - Export */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Export Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1">
              <FileText className="w-4 h-4" />
              Export PDF
            </Button>
            <Button variant="outline" className="flex-1">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
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
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className={`${color} opacity-80`}>
            {icon}
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {label}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-bold font-mono ${color}`}>
                {formatNumber(value, { decimals: label.includes('Temperature') ? 1 : 2 })}
              </span>
              <span className="text-sm text-muted-foreground font-mono">{unit}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}