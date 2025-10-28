'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/context/DataProvider';
import {
  LayoutDashboard,
  TrendingUp,
  Sparkles,
  MessageSquare,
  History,
  Factory,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: TrendingUp,
  },
  {
    name: 'Optimizer',
    href: '/optimize',
    icon: Sparkles,
  },
  {
    name: 'PlantGPT',
    href: '/plantgpt',
    icon: MessageSquare,
  },
  {
    name: 'History',
    href: '/history',
    icon: History,
  },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { liveMetrics, loading } = useData();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

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
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{
          x: isOpen ? 0 : -240,
        }}
        transition={{ duration: 0.3, ease: [0.22, 0.9, 0.36, 1] }}
        className="fixed top-0 left-0 z-50 h-full w-[240px] bg-card border-r border-border flex flex-col lg:translate-x-0 glass-strong"
      >
        <div className="flex items-center gap-3 p-6 border-b border-border">
          <div className="bg-primary/10 p-2 rounded-lg border border-primary/30 neon-glow">
            <Factory className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-lg font-mono text-foreground tracking-wider">kiln.AI</h2>
            <p className="text-xs text-muted-foreground font-medium">Control System</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.name} href={item.href} onClick={onClose}>
                <div
                  className={`
                    relative flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-all duration-200 font-mono text-sm uppercase tracking-wider
                    ${
                      active
                        ? 'bg-primary/20 text-primary border border-primary/50 shadow-neon-sm'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'
                    }
                  `}
                >
                  {active && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
                      transition={{ duration: 0.3 }}
                    />
                  )}

                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-bold">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-3">
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground">
                Status
              </span>
              <Badge variant={getStatusVariant()} className="text-xs">
                {plantStatus}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-xs font-mono font-bold tracking-wider text-foreground">
                {formatTime(currentTime)}
              </span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground text-center font-mono">
            v1.0.0 POC
          </div>
        </div>
      </motion.aside>
    </>
  );
}