/**
 * VolumeChart Component
 *
 * Displays workout volume trends over time using Recharts.
 * Supports daily, weekly, and per-exercise views.
 */

import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Calendar, Dumbbell } from 'lucide-react';

// Format volume for display
const formatVolume = (value) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
};

// Calculate trend
const calculateTrend = (data) => {
  if (!data || data.length < 2) return { direction: 'flat', percentage: 0 };

  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));

  const firstAvg = firstHalf.reduce((sum, d) => sum + (d.total_volume || 0), 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, d) => sum + (d.total_volume || 0), 0) / secondHalf.length;

  if (firstAvg === 0) return { direction: 'up', percentage: 100 };

  const percentage = ((secondAvg - firstAvg) / firstAvg) * 100;

  return {
    direction: percentage > 5 ? 'up' : percentage < -5 ? 'down' : 'flat',
    percentage: Math.abs(percentage).toFixed(1),
  };
};

// Time period options
const TIME_PERIODS = [
  { label: '7D', days: 7, type: 'daily' },
  { label: '30D', days: 30, type: 'daily' },
  { label: '12W', weeks: 12, type: 'weekly' },
  { label: '6M', weeks: 26, type: 'weekly' },
];

// Chart type options
const CHART_TYPES = [
  { label: 'Volume', key: 'total_volume' },
  { label: 'Sets', key: 'total_sets' },
  { label: 'Reps', key: 'total_reps' },
];

export function VolumeChart({ data = [], title = 'Training Volume', loading = false }) {
  const [period, setPeriod] = useState(TIME_PERIODS[1]); // Default 30D
  const [chartType, setChartType] = useState(CHART_TYPES[0]); // Default Volume

  // Calculate trend
  const trend = useMemo(() => calculateTrend(data), [data]);

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    if (period.type === 'weekly') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
        <p className="text-sm text-gray-400 mb-1">{formatDate(label)}</p>
        <p className="text-lg font-bold text-white">
          {formatVolume(payload[0].value)} {chartType.key === 'total_volume' ? 'lbs' : ''}
        </p>
        {payload[0].payload.total_sets && chartType.key === 'total_volume' && (
          <p className="text-xs text-gray-500">
            {payload[0].payload.total_sets} sets • {payload[0].payload.total_reps} reps
          </p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6 animate-pulse">
        <div className="h-6 bg-gray-800 rounded w-1/3 mb-4" />
        <div className="h-64 bg-gray-800/50 rounded" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-blue-400" />
            {title}
          </h3>

          {/* Trend Indicator */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
            trend.direction === 'up' ? 'bg-green-500/20 text-green-400' :
            trend.direction === 'down' ? 'bg-red-500/20 text-red-400' :
            'bg-gray-700/50 text-gray-400'
          }`}>
            {trend.direction === 'up' && <TrendingUp className="w-4 h-4" />}
            {trend.direction === 'down' && <TrendingDown className="w-4 h-4" />}
            {trend.direction === 'flat' && <Minus className="w-4 h-4" />}
            {trend.percentage}%
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          {/* Time Period Selector */}
          <div className="flex gap-1">
            {TIME_PERIODS.map((p) => (
              <button
                key={p.label}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                  period.label === p.label
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Chart Type Selector */}
          <div className="flex gap-1">
            {CHART_TYPES.map((type) => (
              <button
                key={type.key}
                onClick={() => setChartType(type)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                  chartType.key === type.key
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        {data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No data for this period</p>
              <p className="text-sm">Complete some workouts to see trends</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={formatVolume}
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey={chartType.key}
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#volumeGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary Stats */}
      {data.length > 0 && (
        <div className="grid grid-cols-3 gap-4 p-4 border-t border-gray-800 bg-gray-900/30">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Total Volume</p>
            <p className="text-lg font-bold text-white">
              {formatVolume(data.reduce((sum, d) => sum + (d.total_volume || 0), 0))}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Total Sets</p>
            <p className="text-lg font-bold text-white">
              {data.reduce((sum, d) => sum + (d.total_sets || 0), 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Avg/Day</p>
            <p className="text-lg font-bold text-white">
              {formatVolume(data.reduce((sum, d) => sum + (d.total_volume || 0), 0) / data.length)}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default VolumeChart;
