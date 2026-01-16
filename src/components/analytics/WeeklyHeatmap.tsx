import React from 'react';

export interface WeeklyHeatmapProps {
  /** Activity values for each day (Mon-Sun), 0 = no activity */
  data: number[];
  /** Day labels (defaults to single letters) */
  dayLabels?: string[];
  /** Color scheme */
  colorScheme?: 'teal' | 'purple' | 'blue' | 'orange';
  /** Show value tooltip on hover */
  showTooltip?: boolean;
  /** Optional className */
  className?: string;
}

const colorSchemes = {
  teal: {
    empty: 'bg-slate-800',
    low: 'bg-teal-700',
    medium: 'bg-teal-600',
    high: 'bg-teal-500',
    max: 'bg-teal-400',
  },
  purple: {
    empty: 'bg-slate-800',
    low: 'bg-purple-700',
    medium: 'bg-purple-600',
    high: 'bg-purple-500',
    max: 'bg-purple-400',
  },
  blue: {
    empty: 'bg-slate-800',
    low: 'bg-blue-700',
    medium: 'bg-blue-600',
    high: 'bg-blue-500',
    max: 'bg-blue-400',
  },
  orange: {
    empty: 'bg-slate-800',
    low: 'bg-orange-700',
    medium: 'bg-orange-600',
    high: 'bg-orange-500',
    max: 'bg-orange-400',
  },
};

/**
 * WeeklyHeatmap - GitHub-style activity heatmap for the week
 *
 * @example
 * <WeeklyHeatmap data={[3, 0, 2, 4, 1, 5, 0]} />
 */
export const WeeklyHeatmap: React.FC<WeeklyHeatmapProps> = ({
  data,
  dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  colorScheme = 'teal',
  showTooltip = true,
  className = '',
}) => {
  const colors = colorSchemes[colorScheme];
  const maxValue = Math.max(...data, 1); // Prevent division by zero

  const getColorClass = (value: number): string => {
    if (value === 0) return colors.empty;
    const intensity = value / maxValue;
    if (intensity > 0.75) return colors.max;
    if (intensity > 0.5) return colors.high;
    if (intensity > 0.25) return colors.medium;
    return colors.low;
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      {dayLabels.map((day, i) => (
        <div key={`${day}-${i}`} className="flex-1 text-center group relative">
          <div
            className={`aspect-square rounded-lg ${getColorClass(data[i] || 0)} transition-all hover:ring-2 hover:ring-white/20`}
            title={showTooltip ? `${data[i] || 0} activities` : undefined}
          />
          <span className="text-xs text-slate-500 mt-1 block">{day}</span>
          {showTooltip && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              {data[i] || 0} {data[i] === 1 ? 'workout' : 'workouts'}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default WeeklyHeatmap;
