/**
 * Exercise History Graph
 *
 * Visual progression charts for exercise history.
 * Shows weight, volume, and estimated 1RM over time.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  LineChart,
  Activity,
  Target,
  Info,
  X,
} from 'lucide-react';

// Types
interface SetData {
  weight: number;
  reps: number;
  rpe?: number;
  timestamp: string;
}

interface WorkoutEntry {
  id: string;
  date: string;
  sets: SetData[];
  notes?: string;
}

interface ExerciseHistoryGraphProps {
  exerciseId: string;
  exerciseName: string;
  history: WorkoutEntry[];
  onClose?: () => void;
  compact?: boolean;
}

// Time range options
type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

const TIME_RANGES: { value: TimeRange; label: string; days: number }[] = [
  { value: '1M', label: '1 Month', days: 30 },
  { value: '3M', label: '3 Months', days: 90 },
  { value: '6M', label: '6 Months', days: 180 },
  { value: '1Y', label: '1 Year', days: 365 },
  { value: 'ALL', label: 'All Time', days: Infinity },
];

// Metric types for the graph
type MetricType = 'weight' | 'volume' | 'e1rm' | 'reps';

const METRICS: { value: MetricType; label: string; unit: string; description: string }[] = [
  { value: 'weight', label: 'Max Weight', unit: 'kg', description: 'Heaviest weight lifted per session' },
  { value: 'volume', label: 'Total Volume', unit: 'kg', description: 'Weight × Reps summed across all sets' },
  { value: 'e1rm', label: 'Est. 1RM', unit: 'kg', description: 'Estimated one-rep max (Epley formula)' },
  { value: 'reps', label: 'Total Reps', unit: '', description: 'Total repetitions per session' },
];

// Calculate estimated 1RM using Epley formula
function calculateE1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps > 12) return weight * (1 + reps / 30); // Less accurate above 12 reps
  return weight * (1 + reps / 30);
}

// Format date for display
function formatDate(dateStr: string, compact = false): string {
  const date = new Date(dateStr);
  if (compact) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Calculate percentage change
function calculateChange(current: number, previous: number): { value: number; direction: 'up' | 'down' | 'same' } {
  if (previous === 0) return { value: 0, direction: 'same' };
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 0.5) return { value: 0, direction: 'same' };
  return {
    value: Math.abs(change),
    direction: change > 0 ? 'up' : 'down',
  };
}

// Simple SVG Line Chart Component
function LineGraph({
  data,
  metric,
  height = 200,
}: {
  data: { date: string; value: number }[];
  metric: MetricType;
  height?: number;
}) {
  const metricInfo = METRICS.find(m => m.value === metric);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-white/40">
        No data available for this period
      </div>
    );
  }

  const values = data.map(d => d.value);
  const minValue = Math.min(...values) * 0.9;
  const maxValue = Math.max(...values) * 1.1;
  const range = maxValue - minValue || 1;

  // Generate path data
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1 || 1)) * 100,
    y: 100 - ((d.value - minValue) / range) * 100,
  }));

  const pathD = points.length > 1
    ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`
    : '';

  // Area under the curve
  const areaD = points.length > 1
    ? `M ${points[0].x},100 L ${points.map(p => `${p.x},${p.y}`).join(' L ')} L ${points[points.length - 1].x},100 Z`
    : '';

  // Y-axis labels
  const yLabels = [minValue, (minValue + maxValue) / 2, maxValue].map(v =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)
  );

  return (
    <div className="relative" style={{ height }}>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-white/40 pr-2">
        <span className="text-right">{yLabels[2]}{metricInfo?.unit}</span>
        <span className="text-right">{yLabels[1]}{metricInfo?.unit}</span>
        <span className="text-right">{yLabels[0]}{metricInfo?.unit}</span>
      </div>

      {/* Chart area */}
      <div className="ml-12 h-full pr-2">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-[calc(100%-2rem)]"
        >
          {/* Grid lines */}
          <line x1="0" y1="0" x2="100" y2="0" stroke="white" strokeOpacity="0.1" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="white" strokeOpacity="0.1" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
          <line x1="0" y1="100" x2="100" y2="100" stroke="white" strokeOpacity="0.1" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />

          {/* Gradient area */}
          <defs>
            <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {areaD && (
            <path
              d={areaD}
              fill={`url(#gradient-${metric})`}
            />
          )}

          {/* Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#8B5CF6"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="3"
              fill="#8B5CF6"
              stroke="white"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              className="cursor-pointer hover:r-4 transition-all"
            >
              <title>{`${formatDate(data[i].date)}: ${data[i].value.toFixed(1)}${metricInfo?.unit}`}</title>
            </circle>
          ))}
        </svg>

        {/* X-axis labels */}
        <div className="flex justify-between text-xs text-white/40 mt-1">
          {data.length > 0 && (
            <>
              <span>{formatDate(data[0].date, true)}</span>
              {data.length > 2 && (
                <span>{formatDate(data[Math.floor(data.length / 2)].date, true)}</span>
              )}
              <span>{formatDate(data[data.length - 1].date, true)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Stats summary card
function StatCard({
  label,
  value,
  unit,
  change,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  change?: { value: number; direction: 'up' | 'down' | 'same' };
  icon?: React.ElementType;
}) {
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className="w-4 h-4 text-violet-400" />}
        <span className="text-xs text-white/60">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">{value}</span>
        {unit && <span className="text-sm text-white/40">{unit}</span>}
      </div>
      {change && change.direction !== 'same' && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${
          change.direction === 'up' ? 'text-green-400' : 'text-red-400'
        }`}>
          {change.direction === 'up' ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>{change.value.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

export function ExerciseHistoryGraph({
  exerciseId: _exerciseId,
  exerciseName,
  history,
  onClose,
  compact = false,
}: ExerciseHistoryGraphProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('3M');
  const [metric, setMetric] = useState<MetricType>('weight');
  const [showInfo, setShowInfo] = useState(false);

  // Filter data by time range
  const filteredHistory = useMemo(() => {
    const range = TIME_RANGES.find(r => r.value === timeRange);
    if (!range || range.days === Infinity) return history;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - range.days);

    return history.filter(entry => new Date(entry.date) >= cutoff);
  }, [history, timeRange]);

  // Calculate metrics for each entry
  const graphData = useMemo(() => {
    return filteredHistory.map(entry => {
      const sets = entry.sets;

      let value: number;
      switch (metric) {
        case 'weight':
          value = Math.max(...sets.map(s => s.weight));
          break;
        case 'volume':
          value = sets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
          break;
        case 'e1rm':
          value = Math.max(...sets.map(s => calculateE1RM(s.weight, s.reps)));
          break;
        case 'reps':
          value = sets.reduce((sum, s) => sum + s.reps, 0);
          break;
        default:
          value = 0;
      }

      return {
        date: entry.date,
        value,
        entry,
      };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredHistory, metric]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (graphData.length === 0) return null;

    const values = graphData.map(d => d.value);
    const current = values[values.length - 1];
    const previous = values.length > 1 ? values[values.length - 2] : current;
    const first = values[0];
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    return {
      current,
      max,
      avg,
      totalWorkouts: graphData.length,
      periodChange: calculateChange(current, first),
      lastChange: calculateChange(current, previous),
    };
  }, [graphData]);

  const metricInfo = METRICS.find(m => m.value === metric);

  if (compact) {
    return (
      <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{exerciseName}</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          )}
        </div>

        {/* Compact metric selector */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {METRICS.map(m => (
            <button
              key={m.value}
              onClick={() => setMetric(m.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                metric === m.value
                  ? 'bg-violet-500 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <LineGraph data={graphData} metric={metric} height={160} />

        {stats && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <div>
              <span className="text-white/60">Current:</span>{' '}
              <span className="text-white font-semibold">{stats.current.toFixed(1)}{metricInfo?.unit}</span>
            </div>
            <div>
              <span className="text-white/60">Peak:</span>{' '}
              <span className="text-white font-semibold">{stats.max.toFixed(1)}{metricInfo?.unit}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{exerciseName}</h2>
              <p className="text-sm text-white/60">Progress over time</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Info className="w-5 h-5 text-white/60" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            )}
          </div>
        </div>

        {/* Time range selector */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TIME_RANGES.map(range => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                timeRange === range.value
                  ? 'bg-violet-500 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info panel */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-white/10 overflow-hidden"
          >
            <div className="p-4 bg-violet-500/10">
              <p className="text-sm text-white/80">
                <strong>Estimated 1RM</strong> uses the Epley formula: Weight × (1 + Reps/30).
                Most accurate for 1-10 reps.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metric selector */}
      <div className="p-4 border-b border-white/10">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {METRICS.map(m => (
            <button
              key={m.value}
              onClick={() => setMetric(m.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                metric === m.value
                  ? 'bg-white/10 text-white border border-violet-500/50'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
              }`}
            >
              {m.value === 'weight' && <Activity className="w-4 h-4" />}
              {m.value === 'volume' && <BarChart3 className="w-4 h-4" />}
              {m.value === 'e1rm' && <Target className="w-4 h-4" />}
              {m.value === 'reps' && <LineChart className="w-4 h-4" />}
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-white/40 mt-2">{metricInfo?.description}</p>
      </div>

      {/* Graph */}
      <div className="p-6">
        <LineGraph data={graphData} metric={metric} height={240} />
      </div>

      {/* Stats summary */}
      {stats && (
        <div className="p-6 border-t border-white/10">
          <h3 className="text-sm font-medium text-white/60 mb-4">Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Current"
              value={stats.current.toFixed(1)}
              unit={metricInfo?.unit}
              change={stats.lastChange}
              icon={Activity}
            />
            <StatCard
              label="Peak"
              value={stats.max.toFixed(1)}
              unit={metricInfo?.unit}
              icon={Target}
            />
            <StatCard
              label="Average"
              value={stats.avg.toFixed(1)}
              unit={metricInfo?.unit}
              icon={BarChart3}
            />
            <StatCard
              label="Workouts"
              value={stats.totalWorkouts}
              icon={Calendar}
            />
          </div>

          {stats.periodChange.direction !== 'same' && (
            <div className={`mt-4 p-4 rounded-xl ${
              stats.periodChange.direction === 'up' ? 'bg-green-500/10' : 'bg-red-500/10'
            }`}>
              <div className="flex items-center gap-2">
                {stats.periodChange.direction === 'up' ? (
                  <TrendingUp className="w-5 h-5 text-green-400" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-400" />
                )}
                <span className={`text-sm font-medium ${
                  stats.periodChange.direction === 'up' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {stats.periodChange.direction === 'up' ? '+' : '-'}
                  {stats.periodChange.value.toFixed(1)}% over this period
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No data state */}
      {graphData.length === 0 && (
        <div className="p-12 text-center">
          <BarChart3 className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">No workout data for this period</p>
          <p className="text-sm text-white/40 mt-1">
            Complete some workouts to see your progress
          </p>
        </div>
      )}
    </div>
  );
}

export default ExerciseHistoryGraph;
