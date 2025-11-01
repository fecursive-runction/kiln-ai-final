"use client";
import React from 'react';
import { useData } from '@/context/DataProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertsFeed } from '@/components/dashboard/alerts-feed';
import { PlantStatus } from '@/components/dashboard/plant-status';
import { LiveMetricsPanel } from '@/components/dashboard/live-metrics';
import { 
  Download,
  FileText,
} from 'lucide-react';

export default function DashboardPage() {
  const { liveMetrics, alerts, loading } = useData();

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-96" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Mobile Layout */}
      <div className="lg:hidden p-4 space-y-4 pb-20">
  <PlantStatus />
        <LiveMetricsPanel liveMetrics={liveMetrics} />
        <AlertsFeed alerts={alerts} liveMetrics={liveMetrics} />
        

      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block p-6 space-y-6 h-screen overflow-hidden">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-180px)]">
          {/* LEFT COLUMN - Plant Status */}
          <div className="col-span-3 overflow-hidden h-full">
            <PlantStatus />
          </div>

          {/* MIDDLE COLUMN - Live Metrics */}
          <div className="col-span-6 overflow-hidden h-full">
            <LiveMetricsPanel liveMetrics={liveMetrics} />
          </div>

          {/* RIGHT COLUMN - Alerts Feed */}
          <div className="col-span-3 overflow-y-auto h-full">
            <AlertsFeed alerts={alerts} liveMetrics={liveMetrics} />
          </div>
        </div>

        
      </div>
    </div>
  );
}