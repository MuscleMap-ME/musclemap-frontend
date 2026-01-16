/**
 * MuscleHistory - 7-day activation history chart for a muscle
 *
 * Displays a mini bar chart showing recent training activity
 * for the selected muscle group.
 *
 * @module MuscleHistory
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { getActivationColor } from './muscleData';
import { useMotionAllowed } from '../../hooks/useReducedMotion';

// ============================================
// CONSTANTS
// ============================================

/**
 * Number of days to show in the chart
 */
const DAYS_TO_SHOW = 7;

/**
 * Day abbreviations
 */
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Get the last N days as date strings
 * @param {number} n - Number of days
 * @returns {string[]} Array of date strings (YYYY-MM-DD)
 */
function getLastNDays(n) {
  const days = [];
  const today = new Date();

  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    days.push(date.toISOString().split('T')[0]);
  }

  return days;
}

/**
 * Get day abbreviation from date string
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {string} Day abbreviation
 */
function getDayAbbr(dateStr) {
  const date = new Date(dateStr + 'T12:00:00'); // Noon to avoid timezone issues
  return DAY_ABBR[date.getDay()];
}

// ============================================
// BAR COMPONENT
// ============================================

/**
 * HistoryBar - Individual bar in the chart
 */
const HistoryBar = React.memo(({
  date,
  activation,
  maxActivation,
  muscleColor,
  index,
  isToday,
  motionAllowed,
}) => {
  // Calculate bar height (minimum 4px for empty days)
  const heightPercent = maxActivation > 0
    ? Math.max(4, (activation / maxActivation) * 100)
    : 4;

  // Determine color based on activation
  const barColor = activation > 0
    ? getActivationColor(activation)
    : 'rgba(71, 85, 105, 0.2)';

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Bar container */}
      <div className="relative h-16 w-8 flex items-end justify-center">
        <motion.div
          className="w-full rounded-t-sm"
          style={{
            backgroundColor: barColor,
            boxShadow: activation > 50 ? `0 0 8px ${muscleColor}40` : 'none',
          }}
          initial={motionAllowed ? { height: 0 } : false}
          animate={{ height: `${heightPercent}%` }}
          transition={{
            delay: motionAllowed ? index * 0.05 : 0,
            duration: motionAllowed ? 0.4 : 0,
            ease: 'easeOut',
          }}
        />

        {/* Value tooltip on hover */}
        {activation > 0 && (
          <div
            className={clsx(
              'absolute -top-5 left-1/2 -translate-x-1/2',
              'px-1.5 py-0.5 rounded text-[10px] font-medium',
              'bg-[var(--void-deep,#0f172a)] text-[var(--text-primary,#f1f5f9)]',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              'pointer-events-none whitespace-nowrap'
            )}
          >
            {Math.round(activation)}%
          </div>
        )}
      </div>

      {/* Day label */}
      <span
        className={clsx(
          'text-[10px] font-medium',
          isToday
            ? 'text-[var(--brand-teal-400,#2dd4bf)]'
            : 'text-[var(--text-quaternary,#64748b)]'
        )}
      >
        {getDayAbbr(date)}
      </span>

      {/* Today indicator */}
      {isToday && (
        <div
          className="w-1 h-1 rounded-full"
          style={{ backgroundColor: muscleColor }}
        />
      )}
    </div>
  );
});

HistoryBar.displayName = 'HistoryBar';

// ============================================
// MAIN MUSCLE HISTORY COMPONENT
// ============================================

/**
 * MuscleHistory - 7-day activation history chart
 *
 * @param {Object} props
 * @param {string} props.muscleId - The muscle identifier
 * @param {Object} props.history - Map of date strings to activation levels
 * @param {string} props.muscleColor - Color for the muscle
 * @param {string} props.className - Additional CSS classes
 */
const MuscleHistory = ({
  muscleId: _muscleId,
  history = {},
  muscleColor = '#14b8a6',
  className,
}) => {
  const motionAllowed = useMotionAllowed();
  const today = new Date().toISOString().split('T')[0];

  // Get the last 7 days
  const days = useMemo(() => getLastNDays(DAYS_TO_SHOW), []);

  // Get activation values for each day
  const activations = useMemo(() => {
    return days.map(date => ({
      date,
      activation: history[date] || 0,
    }));
  }, [days, history]);

  // Find max activation for scaling
  const maxActivation = useMemo(() => {
    return Math.max(100, ...activations.map(a => a.activation));
  }, [activations]);

  // Calculate stats
  const stats = useMemo(() => {
    const values = activations.map(a => a.activation).filter(v => v > 0);
    if (values.length === 0) {
      return { average: 0, daysActive: 0, total: 0 };
    }

    return {
      average: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      daysActive: values.length,
      total: Math.round(values.reduce((a, b) => a + b, 0)),
    };
  }, [activations]);

  return (
    <div className={clsx('group', className)}>
      {/* Chart */}
      <div className="flex items-end justify-between gap-1 px-2">
        {activations.map((item, index) => (
          <HistoryBar
            key={item.date}
            date={item.date}
            activation={item.activation}
            maxActivation={maxActivation}
            muscleColor={muscleColor}
            index={index}
            isToday={item.date === today}
            motionAllowed={motionAllowed}
          />
        ))}
      </div>

      {/* Stats summary */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="text-[var(--text-quaternary,#64748b)]">
            <span className="font-medium text-[var(--text-secondary,#cbd5e1)]">
              {stats.daysActive}
            </span>{' '}
            day{stats.daysActive !== 1 ? 's' : ''} active
          </span>
        </div>
        <span className="text-[var(--text-quaternary,#64748b)]">
          Avg:{' '}
          <span
            className="font-medium"
            style={{ color: stats.average > 0 ? muscleColor : undefined }}
          >
            {stats.average}%
          </span>
        </span>
      </div>

      {/* Empty state */}
      {stats.daysActive === 0 && (
        <p className="mt-2 text-xs text-center text-[var(--text-quaternary,#64748b)]">
          No activity recorded this week
        </p>
      )}
    </div>
  );
};

MuscleHistory.displayName = 'MuscleHistory';

// ============================================
// COMPACT HISTORY VARIANT
// ============================================

/**
 * MuscleHistoryCompact - Smaller inline version of history
 */
export const MuscleHistoryCompact = React.memo(({
  history = {},
  muscleColor: _muscleColor = '#14b8a6',
  className,
}) => {
  const days = useMemo(() => getLastNDays(DAYS_TO_SHOW), []);

  return (
    <div className={clsx('flex items-center gap-0.5', className)}>
      {days.map((date) => {
        const activation = history[date] || 0;
        return (
          <div
            key={date}
            className="w-2 h-4 rounded-sm"
            style={{
              backgroundColor: activation > 0
                ? getActivationColor(activation)
                : 'rgba(71, 85, 105, 0.2)',
            }}
            title={`${getDayAbbr(date)}: ${Math.round(activation)}%`}
          />
        );
      })}
    </div>
  );
});

MuscleHistoryCompact.displayName = 'MuscleHistoryCompact';

// ============================================
// SPARKLINE HISTORY VARIANT
// ============================================

/**
 * MuscleHistorySparkline - SVG sparkline version
 */
export const MuscleHistorySparkline = React.memo(({
  history = {},
  muscleColor = '#14b8a6',
  width = 80,
  height = 24,
  className,
}) => {
  const days = useMemo(() => getLastNDays(DAYS_TO_SHOW), []);
  const motionAllowed = useMotionAllowed();

  // Build path data
  const pathData = useMemo(() => {
    const values = days.map(date => history[date] || 0);
    const max = Math.max(100, ...values);
    const step = width / (values.length - 1);
    const padding = 2;

    const points = values.map((val, i) => {
      const x = i * step;
      const y = height - padding - ((val / max) * (height - padding * 2));
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [days, history, width, height]);

  // Build fill area path
  const fillPath = useMemo(() => {
    const values = days.map(date => history[date] || 0);
    const max = Math.max(100, ...values);
    const step = width / (values.length - 1);
    const padding = 2;

    const points = values.map((val, i) => {
      const x = i * step;
      const y = height - padding - ((val / max) * (height - padding * 2));
      return `${x},${y}`;
    });

    return `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;
  }, [days, history, width, height]);

  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Fill area */}
      <motion.path
        d={fillPath}
        fill={`${muscleColor}20`}
        initial={motionAllowed ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      />

      {/* Line */}
      <motion.path
        d={pathData}
        fill="none"
        stroke={muscleColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={motionAllowed ? { pathLength: 0, opacity: 0 } : false}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />

      {/* Current value dot */}
      {history[days[days.length - 1]] > 0 && (
        <motion.circle
          cx={width}
          cy={height - 2 - ((history[days[days.length - 1]] / 100) * (height - 4))}
          r="2"
          fill={muscleColor}
          initial={motionAllowed ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6 }}
        />
      )}
    </svg>
  );
});

MuscleHistorySparkline.displayName = 'MuscleHistorySparkline';

export default MuscleHistory;
