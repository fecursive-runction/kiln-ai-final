'use client';

import { Card } from '@/components/ui/card';
import { ChartDataPoint } from '@/context/DataProvider';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { formatNumber } from '@/lib/formatters';
import { Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface KilnTempChartProps {
  data: ChartDataPoint[];
}

export function KilnTempChart({ data }: KilnTempChartProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-slate-900 p-4 border-2 border-blue-500 rounded-xl shadow-2xl backdrop-blur-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Temperature
            </p>
          </div>
          <p className="text-2xl font-black text-white">
            {formatNumber(payload[0].value, { decimals: 1 })}°C
          </p>
          <p className="text-xs text-slate-400 mt-1">{payload[0].payload.time}</p>
        </motion.div>
      );
    }
    return null;
  };

  // Calculate min/max for dynamic domain
  const temperatures = data.map(d => d.temperature);
  const minTemp = Math.min(...temperatures);
  const maxTemp = Math.max(...temperatures);

  return (
    <Card className="p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-slate-700 shadow-2xl relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
      
      {/* Glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <motion.div 
                className="bg-blue-500/20 p-2.5 rounded-xl border border-blue-500/30"
                animate={{ 
                  boxShadow: ['0 0 20px rgba(59, 130, 246, 0.3)', '0 0 30px rgba(59, 130, 246, 0.5)', '0 0 20px rgba(59, 130, 246, 0.3)']
                }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Activity className="w-6 h-6 text-blue-400" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-black text-white">
                  Kiln Temperature Trend
                </h2>
                <p className="text-sm text-slate-400 font-medium">Real-time monitoring</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.div
              className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-full border border-green-500/30"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-green-400">LIVE</span>
            </motion.div>
            <div className="px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700">
              <span className="text-xs font-semibold text-slate-300">Last 50 readings</span>
            </div>
          </div>
        </div>

        <div className="w-full h-[380px] relative">
          {/* Gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent pointer-events-none z-20" />
          
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <defs>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#334155" 
                strokeOpacity={0.3}
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                stroke="#475569"
                strokeWidth={2}
              />
              <YAxis
                domain={[minTemp - 20, maxTemp + 20]}
                tickFormatter={(value) => `${value}°C`}
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                stroke="#475569"
                strokeWidth={2}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3b82f6', strokeWidth: 2 }} />
              <Area
                type="monotone"
                dataKey="temperature"
                stroke="url(#lineGradient)"
                strokeWidth={3}
                fill="url(#tempGradient)"
                animationDuration={1000}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend with gradient */}
        <div className="mt-6 flex items-center justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-12 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full" />
            <span className="text-slate-300 font-semibold">Kiln Temperature</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-slate-600 rounded-full" />
            <span className="text-slate-400 text-xs">Ideal Range: 1430-1470°C</span>
          </div>
        </div>
      </div>
    </Card>
  );
}