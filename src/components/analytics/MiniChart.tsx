import React from 'react';

export interface MiniChartDataPoint {
  /** Label shown below the bar */
  label: string;
  /** Numeric value */
  value: number;
}

export interface MiniChartProps {
  /** Array of data points to display */
  data: MiniChartDataPoint[];
  /** Color scheme for the bars */
  colorScheme?: 'teal' | 'purple' | 'blue' | 'orange';
  /** Height of the chart in pixels */
  height?: number;
  /** Show values on hover */
  showTooltip?: boolean;
  /** Optional className */
  className?: string;
}

const gradients = {
  teal: 'from-teal-600 to-teal-400',
  purple: 'from-purple-600 to-purple-400',
  blue: 'from-blue-600 to-blue-400',
  orange: 'from-orange-600 to-orange-400',
};

/**
 * MiniChart - Compact bar chart for quick stat visualization
 *
 * @example
 * <MiniChart
 *   data={[
 *     { label: 'M', value: 40 },
 *     { label: 'T', value: 65 },
 *     { label: 'W', value: 55 },
 *   ]}
 * />
 */
export const MiniChart: React.FC<MiniChartProps> = ({
  data,
  colorScheme = 'teal',
  height = 80,
  showTooltip = true,
  className = '',
}) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const gradient = gradients[colorScheme];

  return (
    <div className={`flex items-end gap-1 ${className}`} style={{ height }}>
      {data.map((point, i) => {
        const barHeight = (point.value / maxValue) * 100;
        return (
          <div key={`${point.label}-${i}`} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className={`w-full rounded-t bg-gradient-to-t ${gradient} transition-all hover:opacity-80`}
              style={{ height: `${barHeight}%`, minHeight: point.value > 0 ? '4px' : '0' }}
            />
            <span className="text-xs text-slate-500">{point.label}</span>
            {showTooltip && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {point.value}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MiniChart;
