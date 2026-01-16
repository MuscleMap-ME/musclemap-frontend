/**
 * RPE Trends Chart Component
 *
 * Visualizes RPE data over time with:
 * - Line chart showing RPE trends
 * - Fatigue indicators
 * - Volume correlation
 * - Interactive tooltips
 *
 * @example
 * <RPETrendsChart exerciseId="ex_123" />
 */

import React, { useMemo } from 'react';
// motion import reserved for future animation features
// import { motion } from 'framer-motion';
import { Activity, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react';
import { useQuery, gql } from '@apollo/client';
import { getRPEColor } from './RPESelector';

// GraphQL query for RPE trends
const GET_RPE_TRENDS = gql`
  query GetRPETrends($exerciseId: ID!, $days: Int) {
    rpeTrends(exerciseId: $exerciseId, days: $days) {
      exerciseId
      exerciseName
      trends {
        date
        avgRpe
        avgRir
        setCount
        avgWeight
        maxWeight
        avgReps
      }
      summary {
        avgRpe
        totalSets
        daysWithData
        trend
      }
    }
  }
`;

// GraphQL query for fatigue analysis
const GET_FATIGUE = gql`
  query GetFatigue {
    rpeFatigue {
      fatigueScore
      classification
      indicators
      recommendation
      suggestedIntensity
      recentRpeTrend
    }
  }
`;

/**
 * Simple sparkline chart for RPE trends
 */
function RPESparkline({ data, width = 200, height = 60 }) {
  const points = useMemo(() => {
    if (!data || data.length === 0) return '';

    const minRpe = Math.min(...data.map((d) => d.avgRpe));
    const maxRpe = Math.max(...data.map((d) => d.avgRpe));
    const range = maxRpe - minRpe || 1;

    return data
      .map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((d.avgRpe - minRpe) / range) * (height - 10);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [data, width, height]);

  if (!data || data.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-gray-500 text-sm"
        style={{ width, height }}
      >
        Not enough data
      </div>
    );
  }

  const lastRpe = data[data.length - 1].avgRpe;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Gradient fill */}
      <defs>
        <linearGradient id="rpeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={getRPEColor(lastRpe)} stopOpacity="0.3" />
          <stop offset="100%" stopColor={getRPEColor(lastRpe)} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Area under line */}
      <path
        d={`${points} L ${width} ${height} L 0 ${height} Z`}
        fill="url(#rpeGradient)"
      />

      {/* Line */}
      <path
        d={points}
        fill="none"
        stroke={getRPEColor(lastRpe)}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* End point */}
      <circle
        cx={width}
        cy={height - ((lastRpe - Math.min(...data.map((d) => d.avgRpe))) / (Math.max(...data.map((d) => d.avgRpe)) - Math.min(...data.map((d) => d.avgRpe)) || 1)) * (height - 10)}
        r="4"
        fill={getRPEColor(lastRpe)}
      />
    </svg>
  );
}

/**
 * Trend indicator icon and text
 */
function TrendIndicator({ trend }) {
  const config = {
    increasing: { icon: TrendingUp, color: 'text-red-400', label: 'Increasing', bgColor: 'bg-red-500/10' },
    decreasing: { icon: TrendingDown, color: 'text-green-400', label: 'Decreasing', bgColor: 'bg-green-500/10' },
    stable: { icon: Minus, color: 'text-gray-400', label: 'Stable', bgColor: 'bg-gray-500/10' },
  };

  const { icon: Icon, color, label, bgColor } = config[trend] || config.stable;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color} ${bgColor}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

/**
 * Fatigue indicator card
 */
function FatigueCard({ fatigue }) {
  const fatigueConfig = {
    recovered: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    fresh: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    moderate: { icon: Activity, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    elevated: { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    high: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  };

  const config = fatigueConfig[fatigue.classification] || fatigueConfig.moderate;
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-lg border ${config.bg} ${config.border}`}>
      <div className="flex items-center gap-3 mb-2">
        <Icon className={`w-5 h-5 ${config.color}`} />
        <div>
          <p className={`font-medium capitalize ${config.color}`}>
            {fatigue.classification} Fatigue
          </p>
          <p className="text-xs text-gray-500">Score: {fatigue.fatigueScore}/100</p>
        </div>
      </div>
      <p className="text-sm text-gray-400">{fatigue.recommendation}</p>
      {fatigue.indicators.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {fatigue.indicators.slice(0, 2).map((indicator, i) => (
            <span key={i} className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-400">
              {indicator}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Main RPE Trends Chart Component
 */
export function RPETrendsChart({ exerciseId, days = 30, showFatigue = true }) {
  const { data: trendsData, loading: trendsLoading, error: trendsError } = useQuery(GET_RPE_TRENDS, {
    variables: { exerciseId, days },
    skip: !exerciseId,
  });

  const { data: fatigueData, loading: fatigueLoading } = useQuery(GET_FATIGUE, {
    skip: !showFatigue,
  });

  const trends = trendsData?.rpeTrends;
  const fatigue = fatigueData?.rpeFatigue;

  if (trendsLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-800 rounded w-1/3" />
        <div className="h-32 bg-gray-800 rounded" />
        <div className="h-4 bg-gray-800 rounded w-2/3" />
      </div>
    );
  }

  if (trendsError) {
    return (
      <div className="text-red-400 text-sm p-4 bg-red-500/10 rounded-lg">
        Failed to load RPE trends
      </div>
    );
  }

  if (!trends || trends.trends.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No RPE data recorded yet</p>
        <p className="text-sm mt-1">Log sets with RPE to see your trends</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {trends.exerciseName || 'Exercise'} RPE Trends
          </h3>
          <p className="text-sm text-gray-400">
            {trends.summary.daysWithData} sessions over {days} days
          </p>
        </div>
        <TrendIndicator trend={trends.summary.trend} />
      </div>

      {/* Chart */}
      <div className="p-4 bg-gray-800/50 rounded-lg">
        <RPESparkline data={trends.trends.slice().reverse()} width={280} height={80} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-gray-800/50 rounded-lg text-center">
          <p className="text-2xl font-bold" style={{ color: getRPEColor(trends.summary.avgRpe) }}>
            {trends.summary.avgRpe}
          </p>
          <p className="text-xs text-gray-500">Avg RPE</p>
        </div>
        <div className="p-3 bg-gray-800/50 rounded-lg text-center">
          <p className="text-2xl font-bold text-white">{trends.summary.totalSets}</p>
          <p className="text-xs text-gray-500">Total Sets</p>
        </div>
        <div className="p-3 bg-gray-800/50 rounded-lg text-center">
          <p className="text-2xl font-bold text-white">{trends.summary.daysWithData}</p>
          <p className="text-xs text-gray-500">Sessions</p>
        </div>
      </div>

      {/* Recent Sessions Table */}
      {trends.trends.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs">
                <th className="text-left py-2">Date</th>
                <th className="text-center py-2">RPE</th>
                <th className="text-center py-2">Sets</th>
                <th className="text-right py-2">Weight</th>
              </tr>
            </thead>
            <tbody>
              {trends.trends.slice(0, 5).map((session, i) => (
                <tr key={i} className="border-t border-gray-800">
                  <td className="py-2 text-gray-400">
                    {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="py-2 text-center">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${getRPEColor(session.avgRpe)}20`,
                        color: getRPEColor(session.avgRpe),
                      }}
                    >
                      {session.avgRpe}
                    </span>
                  </td>
                  <td className="py-2 text-center text-gray-400">{session.setCount}</td>
                  <td className="py-2 text-right text-gray-400">{session.maxWeight} lbs</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Fatigue Analysis */}
      {showFatigue && fatigue && !fatigueLoading && (
        <div className="pt-2 border-t border-gray-800">
          <p className="text-sm font-medium text-gray-400 mb-2">Current Fatigue Status</p>
          <FatigueCard fatigue={fatigue} />
        </div>
      )}
    </div>
  );
}

/**
 * Compact RPE Summary Card
 */
export function RPESummaryCard({ exerciseId }) {
  const { data, loading, error } = useQuery(GET_RPE_TRENDS, {
    variables: { exerciseId, days: 14 },
    skip: !exerciseId,
  });

  if (loading) {
    return <div className="animate-pulse h-16 bg-gray-800 rounded-lg" />;
  }

  if (error || !data?.rpeTrends) {
    return null;
  }

  const { summary, trends } = data.rpeTrends;

  if (trends.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg">
      <div className="flex-shrink-0">
        <RPESparkline data={trends.slice().reverse()} width={80} height={30} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">RPE {summary.avgRpe}</span>
          <TrendIndicator trend={summary.trend} />
        </div>
        <p className="text-xs text-gray-500">{summary.totalSets} sets logged</p>
      </div>
    </div>
  );
}

export default RPETrendsChart;
