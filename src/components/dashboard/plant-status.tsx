'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LiveMetrics } from '@/context/DataProvider';
import { Play, Square, AlertTriangle, Flame } from 'lucide-react';

interface PlantStatusProps {
  liveMetrics: LiveMetrics | null;
  loading: boolean;
}

export function PlantStatus({ liveMetrics, loading }: PlantStatusProps) {
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

  return (
    <Card className="card-hover h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <Flame className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          Plant Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 md:space-y-6">
        <div className="text-center space-y-3">
          <Badge variant={getStatusVariant()} className="text-base md:text-lg px-4 py-2">
            {plantStatus}
          </Badge>
        </div>

        <div className="border-t border-border pt-4 space-y-2">
          <Button 
            variant="success" 
            className="w-full text-sm md:text-base"
            size="default"
            disabled={plantStatus === 'RUNNING'}
          >
            <Play className="w-4 h-4 mr-2" />
            Start Plant
          </Button>
          <Button 
            variant="warning" 
            className="w-full text-sm md:text-base"
            size="default"
            disabled={plantStatus === 'STOPPED'}
          >
            <Square className="w-4 h-4 mr-2" />
            Stop Plant
          </Button>
          <Button 
            variant="destructive" 
            className="w-full text-sm md:text-base"
            size="default"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Emergency Stop
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}