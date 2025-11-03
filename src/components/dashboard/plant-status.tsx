'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/context/DataProvider';
import { Play, Square, AlertTriangle, Flame } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useState } from 'react';

export function PlantStatus() {
  const { plantStatus, loading, startPlant, stopPlant, emergencyStop } = useData();
  const [isEmergencyStopOpen, setIsEmergencyStopOpen] = useState(false);
  const [isStopPlantOpen, setIsStopPlantOpen] = useState(false);

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
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Flame className="w-4 h-4 text-primary" />
          Plant Status
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
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
            disabled={plantStatus === 'RUNNING' || loading}
            onClick={() => startPlant()}
          >
            <Play className="w-4 h-4 mr-2" />
            Start Plant
          </Button>

          <AlertDialog open={isStopPlantOpen} onOpenChange={setIsStopPlantOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="warning"
                className="w-full text-sm md:text-base"
                size="default"
                disabled={plantStatus === 'STOPPED' || loading}
              >
                <Square className="w-4 h-4 mr-2" />
                Stop Plant
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to stop the plant?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will pause data ingestion. You can restart the plant at any time.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={async () => await stopPlant()}>Confirm</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={isEmergencyStopOpen} onOpenChange={setIsEmergencyStopOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full text-sm md:text-base"
                size="default"
                disabled={plantStatus === 'STOPPED' || loading}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Emergency Stop
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will immediately stop all plant operations. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={async () => await emergencyStop()}>Confirm</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}