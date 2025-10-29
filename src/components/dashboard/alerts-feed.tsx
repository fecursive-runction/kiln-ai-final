'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, LiveMetrics } from '@/context/DataProvider';
import { ALERT_STYLES } from '@/lib/thresholds';
import { getRelativeTime } from '@/lib/formatters';
import { AlertCircle, AlertTriangle, ChevronRight, Bell } from 'lucide-react';

interface AlertsFeedProps {
  alerts: Alert[];
  liveMetrics: LiveMetrics | null;
}

export function AlertsFeed({ alerts, liveMetrics }: AlertsFeedProps) {
  const router = useRouter();

  const handleAlertClick = (alert: Alert) => {
    const isActionable =
      (alert.severity === 'CRITICAL' || alert.severity === 'WARNING') &&
      liveMetrics;

    if (!isActionable) return;

    const params = new URLSearchParams({
      kilnTemperature: liveMetrics.kilnTemperature.toString(),
      feedRate: liveMetrics.feedRate.toString(),
      lsf: liveMetrics.lsf.toString(),
      cao: liveMetrics.cao.toString(),
      sio2: liveMetrics.sio2.toString(),
      al2o3: liveMetrics.al2o3.toString(),
      fe2o3: liveMetrics.fe2o3.toString(),
      trigger: 'true',
    });

    router.push(`/optimize?${params.toString()}`);
  };

  const getAlertIcon = (severity: 'CRITICAL' | 'WARNING') => {
    return severity === 'CRITICAL' ? (
      <AlertCircle className="w-5 h-5" />
    ) : (
      <AlertTriangle className="w-5 h-5" />
    );
  };

  const getAnimationDelay = (index: number) => index * 0.1;

  return (
    <Card className="flex flex-col max-h-[600px]">
      <CardHeader className="border-b border-border flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Alerts Feed
          </div>
          <Badge variant="secondary" className="text-xs">
            {alerts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4">
        {alerts.length === 0 ? (
          <div 
            className="text-center py-12"
          >
            <div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 mb-4 border border-success/30"
            >
              <span className="text-3xl">✓</span>
            </div>
            <p className="text-foreground font-bold text-sm mb-1">All Systems Normal</p>
            <p className="text-xs text-muted-foreground">
              No alerts detected
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, index) => {
              const style = ALERT_STYLES[alert.severity];
              const isActionable =
                (alert.severity === 'CRITICAL' || alert.severity === 'WARNING') &&
                liveMetrics;

              return (
                <div
                  key={alert.id}
                  className={`
                    p-3 rounded-lg border-l-4 ${style.borderColor} bg-secondary/50
                    ${isActionable ? 'cursor-pointer hover:bg-secondary transition-colors' : ''}
                  `}
                  onClick={() => handleAlertClick(alert)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${
                      alert.severity === 'CRITICAL' 
                        ? 'text-destructive' 
                        : 'text-warning'
                    }`}>
                      {getAlertIcon(alert.severity)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={
                            alert.severity === 'CRITICAL'
                              ? 'destructive'
                              : 'warning'
                          }
                          className="text-xs"
                        >
                          {alert.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          {getRelativeTime(alert.timestamp)}
                        </span>
                      </div>

                      <p className="text-sm text-foreground leading-relaxed">
                        {alert.message}
                      </p>

                      {isActionable && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-primary font-bold font-mono uppercase">
                          <span>Open Optimizer</span>
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}