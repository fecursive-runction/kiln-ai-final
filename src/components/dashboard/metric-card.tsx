'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatNumber, getRelativeTime } from '@/lib/formatters';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  name: string;
  value: number;
  unit: string;
  decimals?: number;
  delta?: number;
  lastUpdated?: Date;
  badgeVariant?: 'default' | 'destructive' | 'secondary';
  icon?: React.ReactNode;
}

export function MetricCard({
  name,
  value,
  unit,
  decimals = 2,
  delta,
  lastUpdated,
  badgeVariant = 'default',
  icon,
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (!delta || Math.abs(delta) < 0.1) {
      return <Minus className="w-3 h-3" />;
    }
    return delta > 0 ? (
      <TrendingUp className="w-3 h-3" />
    ) : (
      <TrendingDown className="w-3 h-3" />
    );
  };

  const getTrendColor = () => {
    if (!delta || Math.abs(delta) < 0.1) return 'text-gray-500';
    return delta > 0 ? 'text-emerald-600' : 'text-rose-600';
  };

  const getCardGradient = () => {
    if (badgeVariant === 'destructive') {
      return 'bg-gradient-to-br from-red-50 via-white to-white border-red-200 hover:shadow-red-100';
    }
    return 'bg-gradient-to-br from-blue-50/50 via-white to-white hover:shadow-blue-100';
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 0.9, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card className={`p-6 transition-all duration-300 hover:shadow-xl ${getCardGradient()} border-2 relative overflow-hidden group`}>
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {icon && (
                <motion.div 
                  className="text-blue-600 bg-blue-100 p-2 rounded-lg"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                >
                  {icon}
                </motion.div>
              )}
              <h3 className="text-sm font-semibold text-slate-700">{name}</h3>
            </div>
            {badgeVariant && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <Badge variant={badgeVariant} className="text-xs font-medium shadow-sm">
                  {badgeVariant === 'destructive' ? '⚠️ Alert' : '✓ Normal'}
                </Badge>
              </motion.div>
            )}
          </div>

          <div className="space-y-3">
            {/* Main value with counter animation */}
            <motion.div
              key={value}
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 0.3 }}
              className="flex items-baseline gap-2"
            >
              <span className="text-4xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                {formatNumber(value, { decimals })}
              </span>
              <span className="text-xl font-medium text-slate-500">{unit}</span>
            </motion.div>

            {/* Delta indicator with animation */}
            {delta !== undefined && (
              <motion.div 
                className={`flex items-center gap-1.5 text-sm font-medium ${getTrendColor()}`}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <motion.div
                  animate={{ y: delta > 0 ? [-2, 0, -2] : [2, 0, 2] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  {getTrendIcon()}
                </motion.div>
                <span>
                  {delta > 0 ? '+' : ''}
                  {formatNumber(delta, { decimals: 1 })}% vs avg
                </span>
              </motion.div>
            )}

            {/* Last updated with pulse */}
            {lastUpdated && (
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-2 h-2 bg-green-500 rounded-full"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
                <p className="text-xs text-slate-500 font-medium">
                  Updated {getRelativeTime(lastUpdated)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Corner decoration */}
        <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
      </Card>
    </motion.div>
  );
}