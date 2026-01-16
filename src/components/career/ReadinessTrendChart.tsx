/**
 * ReadinessTrendChart - Shows career readiness trends over time
 *
 * Displays a line chart of readiness scores with progress indicators.
 */

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function getTrendIcon(trend) {
  if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-400" />;
  if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-400" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
}

export function ReadinessTrendChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="p-4 text-center text-white/50">
        <p>No trend data available yet.</p>
        <p className="text-sm mt-1">Complete assessments to see your progress!</p>
      </div>
    );
  }

  // Calculate trend
  const latestValue = data[data.length - 1]?.value || 0;
  const previousValue = data.length > 1 ? data[data.length - 2]?.value || 0 : latestValue;
  const trend = latestValue - previousValue;

  // Normalize values for chart (0-100 scale)
  const maxValue = Math.max(...data.map(d => d.value || 0), 100);
  const normalizedData = data.map(d => ({
    ...d,
    normalized: ((d.value || 0) / maxValue) * 100,
  }));

  return (
    <div className="p-4 bg-gray-900/50 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-white/70">Readiness Trend</span>
        <div className="flex items-center gap-2">
          {getTrendIcon(trend)}
          <span className={`text-sm font-medium ${trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Simple bar chart */}
      <div className="flex items-end gap-1 h-24">
        {normalizedData.map((point, index) => (
          <motion.div
            key={index}
            className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t"
            initial={{ height: 0 }}
            animate={{ height: `${point.normalized}%` }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            title={`${point.label || `Day ${index + 1}`}: ${point.value?.toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-2 text-xs text-white/40">
        <span>{data[0]?.label || 'Start'}</span>
        <span>{data[data.length - 1]?.label || 'Latest'}</span>
      </div>

      {/* Current score */}
      <div className="mt-4 text-center">
        <span className="text-3xl font-bold text-white">{latestValue.toFixed(1)}%</span>
        <span className="text-sm text-white/50 ml-2">Current Score</span>
      </div>
    </div>
  );
}

export default ReadinessTrendChart;
