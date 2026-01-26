import React from 'react';
import { SafeMotion } from '@/utils/safeMotion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface RPETrendData {
  dates: string[];
  rpeValues: number[];
  rirValues: number[];
  loadValues: number[];
  trend: 'up' | 'down' | 'stable';
}

interface RPETrendChartProps {
  data: RPETrendData;
  exerciseName?: string;
}

export function RPETrendChart({ data, exerciseName }: RPETrendChartProps) {
  const { dates, rpeValues, rirValues, loadValues, trend } = data;

  const maxRPE = 10;
  const minLoad = Math.min(...loadValues.filter(v => v > 0));
  const maxLoad = Math.max(...loadValues);
  const loadRange = maxLoad - minLoad || 1;

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-5 h-5 text-emerald-400" />;
      case 'down':
        return <TrendingDown className="w-5 h-5 text-red-400" />;
      default:
        return <Minus className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTrendLabel = () => {
    switch (trend) {
      case 'up':
        return 'Improving';
      case 'down':
        return 'Fatiguing';
      default:
        return 'Stable';
    }
  };

  const getRPEColor = (rpe: number) => {
    if (rpe <= 6) return 'bg-emerald-500';
    if (rpe <= 7.5) return 'bg-yellow-500';
    if (rpe <= 8.5) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (dates.length === 0) {
    return (
      <div className="bg-gray-800 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">📊</div>
        <p className="text-gray-400">No RPE data available</p>
        <p className="text-sm text-gray-500 mt-1">Log RPE during your workouts to see trends</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm text-gray-400 uppercase">RPE Trend</h3>
          {exerciseName && (
            <p className="text-white font-medium mt-1">{exerciseName}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {getTrendIcon()}
          <span className="text-sm text-gray-300">{getTrendLabel()}</span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-48 mb-4">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-gray-500">
          <span>10</span>
          <span>7.5</span>
          <span>5</span>
        </div>

        {/* Chart area */}
        <div className="ml-10 h-full flex items-end gap-1">
          {rpeValues.map((rpe, index) => {
            const heightPercent = (rpe / maxRPE) * 100;
            const loadNormalized = loadValues[index] ? ((loadValues[index] - minLoad) / loadRange) * 100 : 0;

            return (
              <div key={index} className="flex-1 flex flex-col items-center justify-end h-full">
                {/* RPE Bar */}
                <SafeMotion.div
                  className={`w-full max-w-6 rounded-t ${getRPEColor(rpe)}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPercent}%` }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  title={`RPE: ${rpe}, RIR: ${rirValues[index]}, Load: ${loadValues[index]}lbs`}
                />

                {/* Load indicator line */}
                {loadValues[index] > 0 && (
                  <div
                    className="absolute w-1.5 h-1.5 rounded-full bg-purple-400 border border-purple-300"
                    style={{
                      bottom: `${Math.min(95, (loadNormalized * 0.9) + 5)}%`,
                      left: `${10 + ((index + 0.5) / rpeValues.length) * 90}%`,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="ml-10 flex justify-between text-xs text-gray-500">
        {dates.length > 5 ? (
          <>
            <span>{formatDate(dates[0])}</span>
            <span>{formatDate(dates[Math.floor(dates.length / 2)])}</span>
            <span>{formatDate(dates[dates.length - 1])}</span>
          </>
        ) : (
          dates.map((date, i) => (
            <span key={i}>{formatDate(date)}</span>
          ))
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="w-3 h-3 rounded bg-emerald-500" />
          Easy (≤6)
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="w-3 h-3 rounded bg-yellow-500" />
          Moderate (6-7.5)
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="w-3 h-3 rounded bg-orange-500" />
          Hard (7.5-8.5)
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="w-3 h-3 rounded bg-red-500" />
          Max (&gt;8.5)
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-700">
        <div className="text-center">
          <div className="text-lg font-bold text-white">
            {rpeValues.length > 0 ? (rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length).toFixed(1) : '—'}
          </div>
          <div className="text-xs text-gray-400">Avg RPE</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-white">
            {rirValues.length > 0 ? (rirValues.reduce((a, b) => a + b, 0) / rirValues.length).toFixed(1) : '—'}
          </div>
          <div className="text-xs text-gray-400">Avg RIR</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-white">
            {loadValues.length > 0 ? Math.round(loadValues.reduce((a, b) => a + b, 0) / loadValues.length) : '—'}
          </div>
          <div className="text-xs text-gray-400">Avg Load (lbs)</div>
        </div>
      </div>
    </div>
  );
}
