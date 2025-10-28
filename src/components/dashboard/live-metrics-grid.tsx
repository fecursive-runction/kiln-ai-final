'use client';

import { MetricCard } from './metric-card';
import { LiveMetrics } from '@/context/DataProvider';
import { getLSFBadgeVariant, getTemperatureStatus } from '@/lib/thresholds';
import { Flame, Gauge, Beaker, TestTube } from 'lucide-react';

interface LiveMetricsGridProps {
  metrics: LiveMetrics;
  lastUpdated?: Date;
}

export function LiveMetricsGrid({ metrics, lastUpdated }: LiveMetricsGridProps) {
  // Calculate some deltas (mock for now - you can calculate from history)
  const calculateDelta = (current: number, historical: number = 0) => {
    if (historical === 0) return 0;
    return ((current - historical) / historical) * 100;
  };

  const tempStatus = getTemperatureStatus(metrics.kilnTemperature);
  const lsfBadge = getLSFBadgeVariant(metrics.lsf);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Kiln Temperature */}
      <MetricCard
        name="Kiln Temperature"
        value={metrics.kilnTemperature}
        unit="°C"
        decimals={1}
        delta={0.5}
        lastUpdated={lastUpdated}
        badgeVariant={tempStatus.status === 'critical' ? 'destructive' : 'default'}
        icon={<Flame className="w-5 h-5" />}
      />

      {/* Feed Rate */}
      <MetricCard
        name="Feed Rate"
        value={metrics.feedRate}
        unit="TPH"
        decimals={1}
        delta={-0.2}
        lastUpdated={lastUpdated}
        icon={<Gauge className="w-5 h-5" />}
      />

      {/* LSF */}
      <MetricCard
        name="Lime Saturation Factor"
        value={metrics.lsf}
        unit="%"
        decimals={1}
        delta={0.3}
        lastUpdated={lastUpdated}
        badgeVariant={lsfBadge}
        icon={<Beaker className="w-5 h-5" />}
      />

      {/* CaO */}
      <MetricCard
        name="Calcium Oxide (CaO)"
        value={metrics.cao}
        unit="%"
        decimals={2}
        delta={0.1}
        lastUpdated={lastUpdated}
        icon={<TestTube className="w-5 h-5" />}
      />

      {/* Additional metrics in expandable section or separate row */}
      <MetricCard
        name="Silicon Dioxide (SiO₂)"
        value={metrics.sio2}
        unit="%"
        decimals={2}
        lastUpdated={lastUpdated}
      />

      <MetricCard
        name="Aluminum Oxide (Al₂O₃)"
        value={metrics.al2o3}
        unit="%"
        decimals={2}
        lastUpdated={lastUpdated}
      />

      <MetricCard
        name="Iron Oxide (Fe₂O₃)"
        value={metrics.fe2o3}
        unit="%"
        decimals={2}
        lastUpdated={lastUpdated}
      />

      <MetricCard
        name="Tricalcium Silicate (C₃S)"
        value={metrics.c3s}
        unit="%"
        decimals={1}
        lastUpdated={lastUpdated}
      />
    </div>
  );
}