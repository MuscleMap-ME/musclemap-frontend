/**
 * MuscleStats - Quick stats card for a muscle group
 *
 * Displays:
 * - Times trained
 * - Total volume
 * - Last trained date
 * - Trend indicator (up/down/stable)
 * - Mini sparkline chart
 *
 * @module MuscleStats
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Dumbbell,
  Calendar,
  Activity,
  Flame,
} from 'lucide-react';
import { MUSCLE_DATA, getActivationColor } from './muscleData';
import { MuscleHistorySparkline } from './MuscleHistory';
import { useMotionAllowed } from '../../hooks/useReducedMotion';

// ============================================
// CONSTANTS
// ============================================

/**
 * Trend calculation threshold
 */
const TREND_THRESHOLD = 5; // Percentage change to consider a trend

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate trend from history data
 * @param {Object} history - Map of dates to activation values
 * @returns {{ direction: 'up' | 'down' | 'stable', percentage: number }}
 */
function calculateTrend(history) {
  if (!history || Object.keys(history).length < 2) {
    return { direction: 'stable', percentage: 0 };
  }

  const values = Object.entries(history)
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .map(([, val]) => val);

  if (values.length < 2) {
    return { direction: 'stable', percentage: 0 };
  }

  // Compare last 3 days vs previous 3 days
  const recentDays = values.slice(-3);
  const previousDays = values.slice(-6, -3);

  if (previousDays.length === 0) {
    return { direction: 'stable', percentage: 0 };
  }

  const recentAvg = recentDays.reduce((a, b) => a + b, 0) / recentDays.length;
  const previousAvg = previousDays.reduce((a, b) => a + b, 0) / previousDays.length;

  if (previousAvg === 0) {
    return { direction: recentAvg > 0 ? 'up' : 'stable', percentage: 100 };
  }

  const change = ((recentAvg - previousAvg) / previousAvg) * 100;

  if (change > TREND_THRESHOLD) {
    return { direction: 'up', percentage: Math.abs(change) };
  }
  if (change < -TREND_THRESHOLD) {
    return { direction: 'down', percentage: Math.abs(change) };
  }
  return { direction: 'stable', percentage: Math.abs(change) };
}

/**
 * Format volume for display
 * @param {number} volume - Volume in lbs/kg
 * @returns {string} Formatted volume string
 */
function formatVolume(volume) {
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(1)}M`;
  }
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K`;
  }
  return Math.round(volume).toString();
}

/**
 * Format relative date
 * @param {string} dateStr - Date string (YYYY-MM-DD or ISO)
 * @returns {string} Relative date string
 */
function formatLastTrained(dateStr) {
  if (!dateStr) return 'Never';

  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return '1 month ago';
  return `${Math.floor(diffDays / 30)} months ago`;
}

// ============================================
// TREND INDICATOR COMPONENT
// ============================================

/**
 * TrendIndicator - Shows trend direction with icon and percentage
 */
const TrendIndicator = React.memo(({ trend, size = 'md' }) => {
  const { direction, percentage } = trend;

  const iconClass = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textClass = size === 'sm' ? 'text-[10px]' : 'text-xs';

  const config = {
    up: {
      Icon: TrendingUp,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    down: {
      Icon: TrendingDown,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
    stable: {
      Icon: Minus,
      color: 'text-gray-400',
      bg: 'bg-gray-500/10',
    },
  };

  const { Icon, color, bg } = config[direction];

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        bg,
        color
      )}
    >
      <Icon className={iconClass} />
      <span className={clsx('font-medium', textClass)}>
        {percentage.toFixed(0)}%
      </span>
    </div>
  );
});

TrendIndicator.displayName = 'TrendIndicator';

// ============================================
// STAT ITEM COMPONENT
// ============================================

/**
 * StatItem - Individual stat display
 */
const StatItem = React.memo(({ icon: Icon, label, value, subtext, color }) => (
  <div className="flex items-center gap-2">
    <div
      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
      style={{ backgroundColor: color ? `${color}15` : 'rgba(255, 255, 255, 0.05)' }}
    >
      <Icon
        className="w-4 h-4"
        style={{ color: color || 'var(--text-tertiary)' }}
      />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-[var(--text-quaternary,#64748b)]">{label}</p>
      <p className="text-sm font-semibold text-[var(--text-primary,#f1f5f9)] truncate">
        {value}
        {subtext && (
          <span className="text-xs font-normal text-[var(--text-tertiary,#94a3b8)] ml-1">
            {subtext}
          </span>
        )}
      </p>
    </div>
  </div>
));

StatItem.displayName = 'StatItem';

// ============================================
// MAIN MUSCLE STATS COMPONENT
// ============================================

/**
 * MuscleStats - Quick stats card for a muscle group
 *
 * @param {Object} props
 * @param {string} props.muscleId - The muscle identifier
 * @param {number} props.timesTrained - Number of times this muscle was trained
 * @param {number} props.totalVolume - Total volume (weight * reps) in lbs
 * @param {string} props.lastTrained - Date string of last training session
 * @param {Object} props.history - Map of dates to activation levels for sparkline
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.compact - Use compact layout
 * @param {boolean} props.showSparkline - Show mini sparkline chart
 */
const MuscleStats = ({
  muscleId,
  timesTrained = 0,
  totalVolume = 0,
  lastTrained,
  history = {},
  className,
  compact = false,
  showSparkline = true,
}) => {
  const motionAllowed = useMotionAllowed();
  const muscle = MUSCLE_DATA[muscleId];

  // Calculate trend from history
  const trend = useMemo(() => calculateTrend(history), [history]);

  // Calculate current activation (today)
  const currentActivation = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return history[today] || 0;
  }, [history]);

  if (!muscle) {
    return null;
  }

  // Compact layout for inline use
  if (compact) {
    return (
      <motion.div
        initial={motionAllowed ? { opacity: 0, y: 5 } : false}
        animate={{ opacity: 1, y: 0 }}
        className={clsx(
          'flex items-center gap-3 p-2 rounded-lg',
          'bg-[var(--glass-white-5,rgba(255,255,255,0.05))]',
          'border border-[var(--border-subtle,#1e293b)]',
          className
        )}
      >
        {/* Muscle color indicator */}
        <div
          className="w-2 h-8 rounded-full flex-shrink-0"
          style={{ backgroundColor: muscle.color }}
        />

        {/* Stats row */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div>
            <p className="text-[10px] text-[var(--text-quaternary,#64748b)]">
              Trained
            </p>
            <p className="text-sm font-semibold text-[var(--text-primary,#f1f5f9)]">
              {timesTrained}x
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--text-quaternary,#64748b)]">
              Volume
            </p>
            <p className="text-sm font-semibold text-[var(--text-primary,#f1f5f9)]">
              {formatVolume(totalVolume)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--text-quaternary,#64748b)]">
              Last
            </p>
            <p className="text-sm font-semibold text-[var(--text-primary,#f1f5f9)]">
              {formatLastTrained(lastTrained)}
            </p>
          </div>
        </div>

        {/* Trend */}
        <TrendIndicator trend={trend} size="sm" />

        {/* Sparkline */}
        {showSparkline && Object.keys(history).length > 0 && (
          <MuscleHistorySparkline
            history={history}
            muscleColor={muscle.color}
            width={60}
            height={20}
          />
        )}
      </motion.div>
    );
  }

  // Full card layout
  return (
    <motion.div
      initial={motionAllowed ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        'p-4 rounded-xl',
        'bg-[var(--glass-white-5,rgba(255,255,255,0.05))]',
        'border border-[var(--border-subtle,#1e293b)]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor: muscle.color,
              boxShadow: `0 0 8px ${muscle.color}80`,
            }}
          />
          <h4 className="text-sm font-semibold text-[var(--text-primary,#f1f5f9)]">
            {muscle.commonName} Stats
          </h4>
        </div>
        <TrendIndicator trend={trend} />
      </div>

      {/* Current activation bar */}
      {currentActivation > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[var(--text-tertiary,#94a3b8)]">
              Today's Activation
            </span>
            <span
              className="font-medium"
              style={{ color: getActivationColor(currentActivation) }}
            >
              {Math.round(currentActivation)}%
            </span>
          </div>
          <div className="h-1.5 bg-[var(--glass-white-5,rgba(255,255,255,0.05))] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: getActivationColor(currentActivation) }}
              initial={{ width: 0 }}
              animate={{ width: `${currentActivation}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatItem
          icon={Dumbbell}
          label="Times Trained"
          value={timesTrained}
          color={muscle.color}
        />
        <StatItem
          icon={Activity}
          label="Total Volume"
          value={formatVolume(totalVolume)}
          subtext="lbs"
          color={muscle.color}
        />
        <StatItem
          icon={Calendar}
          label="Last Trained"
          value={formatLastTrained(lastTrained)}
          color={muscle.color}
        />
        <StatItem
          icon={Flame}
          label="Avg Activation"
          value={`${Math.round(Object.values(history).reduce((a, b) => a + b, 0) / Math.max(Object.keys(history).length, 1))}%`}
          color={muscle.color}
        />
      </div>

      {/* Sparkline chart */}
      {showSparkline && Object.keys(history).length > 0 && (
        <div>
          <p className="text-xs text-[var(--text-quaternary,#64748b)] mb-2">
            7-Day Activity
          </p>
          <MuscleHistorySparkline
            history={history}
            muscleColor={muscle.color}
            width={120}
            height={32}
            className="w-full"
          />
        </div>
      )}
    </motion.div>
  );
};

MuscleStats.displayName = 'MuscleStats';

// ============================================
// MUSCLE STATS MINI (inline badge)
// ============================================

/**
 * MuscleStatsMini - Minimal inline stats badge
 */
export const MuscleStatsMini = React.memo(({
  muscleId,
  timesTrained = 0,
  lastTrained,
  history = {},
  className,
}) => {
  const muscle = MUSCLE_DATA[muscleId];
  const trend = useMemo(() => calculateTrend(history), [history]);

  if (!muscle) return null;

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-2 px-2 py-1 rounded-full',
        'bg-[var(--glass-white-5,rgba(255,255,255,0.05))]',
        'border border-[var(--border-subtle,#1e293b)]',
        className
      )}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: muscle.color }}
      />
      <span className="text-xs text-[var(--text-secondary,#cbd5e1)]">
        {timesTrained}x trained
      </span>
      {trend.direction !== 'stable' && (
        <>
          <span className="text-[var(--text-quaternary,#64748b)]">|</span>
          <span
            className={clsx(
              'text-xs',
              trend.direction === 'up' ? 'text-green-400' : 'text-red-400'
            )}
          >
            {trend.direction === 'up' ? '+' : '-'}{trend.percentage.toFixed(0)}%
          </span>
        </>
      )}
    </div>
  );
});

MuscleStatsMini.displayName = 'MuscleStatsMini';

export default MuscleStats;
