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
        <PlantStatus liveMetrics={liveMetrics} loading={loading} />
        <LiveMetricsPanel liveMetrics={liveMetrics} />
        <AlertsFeed alerts={alerts} liveMetrics={liveMetrics} />
        
        {/* Export Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3">
              <CardTitle className="text-sm">Export Reports</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block p-6 space-y-6 h-screen overflow-hidden">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-180px)]">
          {/* LEFT COLUMN - Plant Status */}
          <div className="col-span-3 overflow-hidden h-full">
            <PlantStatus liveMetrics={liveMetrics} loading={loading} />
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

        {/* BOTTOM SECTION - Export */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Export Reports</CardTitle>
              <div className="flex gap-3">
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}