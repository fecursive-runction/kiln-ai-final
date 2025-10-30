'use client';

import { useData } from '@/context/DataProvider';
import { MetricsDataTable } from '@/components/history/metrics-data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History as HistoryIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { useMemo } from 'react';

export default function HistoryPage() {
  const { metricsHistory, loading } = useData();

  const stats = useMemo(() => {
    if (metricsHistory.length === 0) {
      return {
        avgTemp: 0,
        avgLSF: 0,
        avgFeedRate: 0,
        criticalTemp: 0,
      };
    }

    const avgTemp =
      metricsHistory.reduce((sum, m) => sum + m.kiln_temp, 0) /
      metricsHistory.length;
    const avgLSF =
      metricsHistory.reduce((sum, m) => sum + m.lsf, 0) /
      metricsHistory.length;
    const avgFeedRate =
      metricsHistory.reduce((sum, m) => sum + m.feed_rate, 0) /
      metricsHistory.length;
    const criticalTemp = metricsHistory.filter(
      (m) => m.kiln_temp < 1420 || m.kiln_temp > 1480
    ).length;

    return {
      avgTemp,
      avgLSF,
      avgFeedRate,
      criticalTemp,
    };
  }, [metricsHistory]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-3 rounded-lg border border-primary/30 neon-glow">
          <HistoryIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-mono uppercase tracking-wider text-foreground">
            Production History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and analyze historical production metrics (Last 50 records)
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="card-hover">
          {/* MODIFICATION: Added p-4 to reduce header height */}
          <CardHeader className="border-b border-border/50 p-4">
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Avg. Temperature</span>
              <TrendingUp className="w-4 h-4 text-primary" />
            </CardTitle>
          </CardHeader>
          {/* MODIFICATION: Changed p-6 to p-4 */}
          <CardContent className="p-4">
            {/* MODIFICATION: Changed text-3xl to text-2xl */}
            <p className="text-2xl font-bold font-mono text-primary">
              {stats.avgTemp.toFixed(1)}
              {/* MODIFICATION: Changed text-lg to text-base */}
              <span className="text-base text-muted-foreground ml-2">°C</span>
            </p>
            {/* MODIFICATION: Changed mt-2 to mt-1 */}
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Ideal: 1430-1470°C
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          {/* MODIFICATION: Added p-4 to reduce header height */}
          <CardHeader className="border-b border-border/50 p-4">
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Avg. LSF</span>
              <TrendingUp className="w-4 h-4 text-chart-purple" />
            </CardTitle>
          </CardHeader>
          {/* MODIFICATION: Changed p-6 to p-4 */}
          <CardContent className="p-4">
            {/* MODIFICATION: Changed text-3xl to text-2xl */}
            <p className="text-2xl font-bold font-mono text-chart-purple">
              {stats.avgLSF.toFixed(1)}
              {/* MODIFICATION: Changed text-lg to text-base */}
              <span className="text-base text-muted-foreground ml-2">%</span>
            </p>
            {/* MODIFICATION: Changed mt-2 to mt-1 */}
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Ideal: 94-98%
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          {/* MODIFICATION: Added p-4 to reduce header height */}
          <CardHeader className="border-b border-border/50 p-4">
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Avg. Feed Rate</span>
              <TrendingUp className="w-4 h-4 text-chart-blue" />
            </CardTitle>
          </CardHeader>
          {/* MODIFICATION: Changed p-6 to p-4 */}
          <CardContent className="p-4">
            {/* MODIFICATION: Changed text-3xl to text-2xl */}
            <p className="text-2xl font-bold font-mono text-chart-blue">
              {stats.avgFeedRate.toFixed(1)}
              {/* MODIFICATION: Changed text-lg to text-base */}
              <span className="text-base text-muted-foreground ml-2">TPH</span>
            </p>
            {/* MODIFICATION: Changed mt-2 to mt-1 */}
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Target: 220 TPH
            </p>
          </CardContent>
        </Card>
      </div>

      <MetricsDataTable data={metricsHistory} />

      <Card className="bg-secondary/30">
        <CardHeader>
          <CardTitle className="text-sm">About This Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-2">
              <h4 className="font-bold text-foreground font-mono uppercase tracking-wider text-xs">
                Data Retention
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The table displays the last 50 production metrics. Data is
                generated every 5 seconds and stored in the database. Historical
                data older than the last 50 records is still stored but not
                displayed here.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-foreground font-mono uppercase tracking-wider text-xs">
                Column Descriptions
              </h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li><strong>LSF:</strong> Lime Saturation Factor (ideal: 94-98%)</li>
                <li><strong>C₃S/C₂S:</strong> Clinker phases for strength</li>
                <li><strong>CaO/SiO₂:</strong> Raw material composition</li>
                <li><strong>Color coding:</strong> Red = critical, Yellow = warning, Green = normal</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}