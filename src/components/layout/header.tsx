'use client';

import { useState, useEffect } from 'react';
import { useData } from '@/context/DataProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Menu, X, Factory } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
  isSidebarOpen: boolean;
}

export function Header({ onMenuClick, isSidebarOpen }: HeaderProps) {
  const { liveMetrics, loading } = useData();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 glass-strong">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            {isSidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>

          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg border border-primary/30 neon-glow">
              <Factory className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-mono text-foreground tracking-wider">
                kiln.AI
              </h1>
            </div>
          </div>
        </div>

        <div className="absolute left-1/2 transform -translate-x-1/2 hidden md:block">
          <h2 className="text-sm font-bold font-mono uppercase tracking-widest text-muted-foreground">
            Plant Control System
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={getStatusVariant()} className="hidden sm:flex">
            {plantStatus}
          </Badge>

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-md border border-border">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-wider text-foreground">
              {formatTime(currentTime)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}