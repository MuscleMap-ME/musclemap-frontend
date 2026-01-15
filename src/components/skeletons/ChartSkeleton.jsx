/**
 * ChartSkeleton - Chart placeholder skeleton with shimmer animation
 *
 * Provides skeleton states for chart components (line, bar, area, radar)
 * with proper shimmer animation matching the design system.
 *
 * @example
 * // Line chart skeleton
 * <ChartSkeleton type="line" height={300} />
 *
 * // Bar chart skeleton
 * <ChartSkeleton type="bar" height={250} />
 *
 * // Radar chart skeleton
 * <ChartSkeleton type="radar" height={300} />
 *
 * // Area chart skeleton
 * <ChartSkeleton type="area" height={200} />
 */

import React from 'react';
import clsx from 'clsx';
import SkeletonBase, { SkeletonText } from './SkeletonBase';

/**
 * Generate points for radar polygon
 */
function getRadarPoints(sides, radius, cx, cy, values = null) {
  const points = [];
  const angleStep = (Math.PI * 2) / sides;

  for (let i = 0; i < sides; i++) {
    const angle = angleStep * i - Math.PI / 2;
    const r = values ? radius * values[i] : radius;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push(`${x},${y}`);
  }

  return points.join(' ');
}

/**
 * ChartSkeleton - Chart placeholder with shimmer animation
 *
 * @param {Object} props
 * @param {'line'|'bar'|'area'|'radar'|'pie'|'donut'} [props.type='line'] - Chart type
 * @param {number} [props.height=300] - Chart height in pixels
 * @param {boolean} [props.showLegend=false] - Show legend skeleton
 * @param {boolean} [props.showXAxis=true] - Show X-axis labels
 * @param {boolean} [props.showYAxis=false] - Show Y-axis labels
 * @param {boolean} [props.showTitle=false] - Show chart title
 * @param {number} [props.barCount=10] - Number of bars (for bar chart)
 * @param {'shimmer'|'pulse'|'wave'|'none'} [props.animation='shimmer'] - Animation type
 * @param {number} [props.animationDelay] - Animation delay index
 */
function ChartSkeleton({
  type = 'line',
  height = 300,
  showLegend = false,
  showXAxis = true,
  showYAxis = false,
  showTitle = false,
  barCount = 10,
  animation = 'shimmer',
  animationDelay = 0,
  className,
  ...props
}) {
  return (
    <div
      className={clsx('relative overflow-hidden', className)}
      style={{ height }}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {/* Chart title */}
      {showTitle && (
        <div className="mb-4">
          <SkeletonText width={160} size="lg" animation={animation} animationDelay={animationDelay} />
        </div>
      )}

      {/* Main chart container */}
      <div className="glass rounded-xl p-4 h-full flex flex-col">
        {/* Legend */}
        {showLegend && (
          <div className="flex gap-4 mb-4 justify-end">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <SkeletonBase
                  width={12}
                  height={12}
                  variant="rounded"
                  animation={animation}
                  animationDelay={animationDelay + i}
                />
                <SkeletonText
                  width={48 + i * 8}
                  size="xs"
                  animation={animation}
                  animationDelay={animationDelay + i + 1}
                />
              </div>
            ))}
          </div>
        )}

        {/* Chart area */}
        <div className="flex-1 flex">
          {/* Y-axis labels */}
          {showYAxis && (
            <div className="flex flex-col justify-between pr-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <SkeletonText
                  key={i}
                  width={32}
                  size="xs"
                  animation={animation}
                  animationDelay={animationDelay + i}
                />
              ))}
            </div>
          )}

          {/* Chart content */}
          <div className="flex-1 relative">
            {type === 'bar' && (
              <BarChartContent
                count={barCount}
                animation={animation}
                animationDelay={animationDelay}
              />
            )}

            {type === 'line' && (
              <LineChartContent
                animation={animation}
                animationDelay={animationDelay}
              />
            )}

            {type === 'area' && (
              <AreaChartContent
                animation={animation}
                animationDelay={animationDelay}
              />
            )}

            {type === 'radar' && (
              <RadarChartContent
                animation={animation}
                animationDelay={animationDelay}
              />
            )}

            {type === 'pie' && (
              <PieChartContent
                animation={animation}
                animationDelay={animationDelay}
              />
            )}

            {type === 'donut' && (
              <DonutChartContent
                animation={animation}
                animationDelay={animationDelay}
              />
            )}
          </div>
        </div>

        {/* X-axis labels */}
        {showXAxis && type !== 'radar' && type !== 'pie' && type !== 'donut' && (
          <div className="flex justify-between pt-3">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
              <SkeletonText
                key={day}
                width={24}
                size="xs"
                animation={animation}
                animationDelay={animationDelay + i}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Bar chart skeleton content
 */
function BarChartContent({ count = 10, animation, animationDelay }) {
  const heights = [40, 65, 45, 80, 55, 70, 50, 75, 60, 85].slice(0, count);

  return (
    <div className="h-full flex items-end justify-between gap-2">
      {heights.map((h, i) => (
        <SkeletonBase
          key={i}
          width="100%"
          height={`${h}%`}
          variant="rounded"
          borderRadius="sm"
          animation={animation}
          animationDelay={(animationDelay + i) % 10}
          className="flex-1"
        />
      ))}
    </div>
  );
}

/**
 * Line chart skeleton content
 */
function LineChartContent({ animation: _animation, animationDelay }) {
  return (
    <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
      {/* Grid lines */}
      {[0, 50, 100, 150, 200].map((y) => (
        <line
          key={y}
          x1="0"
          y1={y}
          x2="400"
          y2={y}
          strokeWidth="1"
          className="stroke-[var(--glass-white-10)]"
        />
      ))}

      {/* Animated line placeholder using CSS animation */}
      <defs>
        <linearGradient id="skeleton-shimmer-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--glass-white-5)" />
          <stop offset="40%" stopColor="var(--glass-white-5)" />
          <stop offset="50%" stopColor="var(--glass-white-15)" />
          <stop offset="60%" stopColor="var(--glass-white-5)" />
          <stop offset="100%" stopColor="var(--glass-white-5)" />
          <animateTransform
            attributeName="gradientTransform"
            type="translate"
            from="-1 0"
            to="1 0"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </linearGradient>
      </defs>

      {/* Area under line */}
      <path
        d="M0,150 Q50,120 100,130 T200,100 T300,120 T400,80 L400,200 L0,200 Z"
        fill="url(#skeleton-shimmer-gradient)"
        className="opacity-60"
      />

      {/* Line */}
      <path
        d="M0,150 Q50,120 100,130 T200,100 T300,120 T400,80"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-[var(--glass-white-20)] skeleton-shimmer"
        style={{
          animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
          animationDelay: `${animationDelay * 100}ms`,
        }}
      />

      {/* Data points */}
      {[
        { x: 0, y: 150 },
        { x: 100, y: 130 },
        { x: 200, y: 100 },
        { x: 300, y: 120 },
        { x: 400, y: 80 },
      ].map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r="4"
          className="fill-[var(--glass-white-20)]"
        />
      ))}
    </svg>
  );
}

/**
 * Area chart skeleton content
 */
function AreaChartContent({ animation: _animation, animationDelay }) {
  return (
    <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
      {/* Grid lines */}
      {[0, 50, 100, 150, 200].map((y) => (
        <line
          key={y}
          x1="0"
          y1={y}
          x2="400"
          y2={y}
          strokeWidth="1"
          className="stroke-[var(--glass-white-10)]"
        />
      ))}

      {/* Area gradient */}
      <defs>
        <linearGradient id="area-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--glass-white-20)" />
          <stop offset="100%" stopColor="var(--glass-white-5)" />
        </linearGradient>
      </defs>

      {/* Area fills */}
      <path
        d="M0,160 Q80,140 160,120 T320,100 T400,80 L400,200 L0,200 Z"
        fill="url(#area-gradient)"
        className="skeleton-shimmer"
        style={{
          animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
          animationDelay: `${animationDelay * 100}ms`,
        }}
      />
      <path
        d="M0,180 Q80,160 160,150 T320,130 T400,120 L400,200 L0,200 Z"
        fill="url(#area-gradient)"
        className="skeleton-shimmer opacity-50"
        style={{
          animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
          animationDelay: `${(animationDelay + 2) * 100}ms`,
        }}
      />
    </svg>
  );
}

/**
 * Radar chart skeleton content
 */
function RadarChartContent({ animation: _animation, animationDelay }) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg className="w-4/5 h-4/5" viewBox="0 0 200 200">
        {/* Radar web layers */}
        {[1, 0.75, 0.5, 0.25].map((scale, i) => (
          <polygon
            key={i}
            points={getRadarPoints(6, 80 * scale, 100, 100)}
            fill="none"
            strokeWidth="1"
            className="stroke-[var(--glass-white-10)]"
          />
        ))}

        {/* Axis lines */}
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
          const x = 100 + 80 * Math.cos(angle);
          const y = 100 + 80 * Math.sin(angle);
          return (
            <line
              key={i}
              x1="100"
              y1="100"
              x2={x}
              y2={y}
              strokeWidth="1"
              className="stroke-[var(--glass-white-10)]"
            />
          );
        })}

        {/* Radar data placeholder */}
        <polygon
          points={getRadarPoints(6, 50, 100, 100, [0.6, 0.8, 0.4, 0.7, 0.5, 0.9])}
          className="fill-[var(--glass-white-10)] stroke-[var(--glass-white-20)] skeleton-shimmer"
          strokeWidth="2"
          style={{
            animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
            animationDelay: `${animationDelay * 100}ms`,
          }}
        />

        {/* Data points on radar */}
        {getRadarPoints(6, 50, 100, 100, [0.6, 0.8, 0.4, 0.7, 0.5, 0.9])
          .split(' ')
          .map((point, i) => {
            const [x, y] = point.split(',');
            return (
              <circle
                key={i}
                cx={parseFloat(x)}
                cy={parseFloat(y)}
                r="4"
                className="fill-[var(--glass-white-20)]"
              />
            );
          })}

        {/* Center dot */}
        <circle cx="100" cy="100" r="3" className="fill-[var(--glass-white-20)]" />

        {/* Axis labels */}
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
          const x = 100 + 95 * Math.cos(angle);
          const y = 100 + 95 * Math.sin(angle);
          return (
            <g key={i}>
              <rect
                x={x - 16}
                y={y - 6}
                width="32"
                height="12"
                rx="2"
                className="fill-[var(--glass-white-8)] skeleton-shimmer"
                style={{
                  animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
                  animationDelay: `${(animationDelay + i) * 100}ms`,
                }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Pie chart skeleton content
 */
function PieChartContent({ animation: _animation, animationDelay }) {
  const segments = [
    { start: 0, end: 90, color: 'var(--glass-white-20)' },
    { start: 90, end: 180, color: 'var(--glass-white-15)' },
    { start: 180, end: 270, color: 'var(--glass-white-12)' },
    { start: 270, end: 360, color: 'var(--glass-white-8)' },
  ];

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg className="w-3/4 h-3/4" viewBox="0 0 200 200">
        {segments.map((segment, i) => {
          const startAngle = (segment.start * Math.PI) / 180 - Math.PI / 2;
          const endAngle = (segment.end * Math.PI) / 180 - Math.PI / 2;
          const largeArc = segment.end - segment.start > 180 ? 1 : 0;
          const x1 = 100 + 80 * Math.cos(startAngle);
          const y1 = 100 + 80 * Math.sin(startAngle);
          const x2 = 100 + 80 * Math.cos(endAngle);
          const y2 = 100 + 80 * Math.sin(endAngle);

          return (
            <path
              key={i}
              d={`M100,100 L${x1},${y1} A80,80 0 ${largeArc},1 ${x2},${y2} Z`}
              fill={segment.color}
              className="skeleton-shimmer"
              style={{
                animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
                animationDelay: `${(animationDelay + i) * 150}ms`,
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Donut chart skeleton content
 */
function DonutChartContent({ animation: _animation, animationDelay }) {
  const segments = [
    { start: 0, end: 120, color: 'var(--glass-white-20)' },
    { start: 120, end: 210, color: 'var(--glass-white-15)' },
    { start: 210, end: 300, color: 'var(--glass-white-12)' },
    { start: 300, end: 360, color: 'var(--glass-white-8)' },
  ];

  const createArcPath = (innerRadius, outerRadius, startDeg, endDeg) => {
    const startAngle = (startDeg * Math.PI) / 180 - Math.PI / 2;
    const endAngle = (endDeg * Math.PI) / 180 - Math.PI / 2;
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;

    const x1Outer = 100 + outerRadius * Math.cos(startAngle);
    const y1Outer = 100 + outerRadius * Math.sin(startAngle);
    const x2Outer = 100 + outerRadius * Math.cos(endAngle);
    const y2Outer = 100 + outerRadius * Math.sin(endAngle);
    const x1Inner = 100 + innerRadius * Math.cos(endAngle);
    const y1Inner = 100 + innerRadius * Math.sin(endAngle);
    const x2Inner = 100 + innerRadius * Math.cos(startAngle);
    const y2Inner = 100 + innerRadius * Math.sin(startAngle);

    return `M${x1Outer},${y1Outer} A${outerRadius},${outerRadius} 0 ${largeArc},1 ${x2Outer},${y2Outer} L${x1Inner},${y1Inner} A${innerRadius},${innerRadius} 0 ${largeArc},0 ${x2Inner},${y2Inner} Z`;
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg className="w-3/4 h-3/4" viewBox="0 0 200 200">
        {segments.map((segment, i) => (
          <path
            key={i}
            d={createArcPath(45, 80, segment.start, segment.end)}
            fill={segment.color}
            className="skeleton-shimmer"
            style={{
              animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
              animationDelay: `${(animationDelay + i) * 150}ms`,
            }}
          />
        ))}

        {/* Center content placeholder */}
        <circle cx="100" cy="100" r="35" className="fill-[var(--bg-primary)]" />
        <rect
          x="82"
          y="92"
          width="36"
          height="16"
          rx="4"
          className="fill-[var(--glass-white-10)] skeleton-shimmer"
          style={{
            animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
            animationDelay: `${(animationDelay + 4) * 100}ms`,
          }}
        />
      </svg>
    </div>
  );
}

/**
 * SkeletonChartCard - Full chart card skeleton with header and legend
 *
 * @param {Object} props
 * @param {'line'|'bar'|'area'|'radar'|'pie'|'donut'} [props.type='line'] - Chart type
 * @param {number} [props.height=300] - Chart height
 * @param {boolean} [props.showTitle=true] - Show chart title
 * @param {boolean} [props.showLegend=true] - Show legend
 * @param {boolean} [props.showControls=false] - Show control buttons
 */
export function SkeletonChartCard({
  type = 'line',
  height = 300,
  showTitle = true,
  showLegend = true,
  showControls = false,
  className,
  ...props
}) {
  return (
    <div
      className={clsx('glass rounded-xl p-4 space-y-4', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {/* Header */}
      {(showTitle || showControls) && (
        <div className="flex items-center justify-between">
          {showTitle && <SkeletonText width={160} size="lg" animationDelay={0} />}
          {showControls && (
            <div className="flex gap-2">
              <SkeletonBase width={80} height={28} variant="rounded" animationDelay={1} />
              <SkeletonBase width={32} height={28} variant="rounded" animationDelay={2} />
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <ChartSkeleton
        type={type}
        height={height - (showTitle ? 40 : 0) - (showLegend ? 40 : 0)}
        showLegend={showLegend}
        showXAxis={type !== 'pie' && type !== 'donut' && type !== 'radar'}
        animationDelay={3}
      />
    </div>
  );
}

/**
 * SkeletonSparkline - Small inline chart skeleton
 *
 * @param {Object} props
 * @param {number} [props.width=100] - Sparkline width
 * @param {number} [props.height=24] - Sparkline height
 */
export function SkeletonSparkline({
  width = 100,
  height = 24,
  animationDelay = 0,
  className,
  ...props
}) {
  return (
    <div
      className={clsx('inline-block', className)}
      style={{ width, height }}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      <svg className="w-full h-full" viewBox="0 0 100 24" preserveAspectRatio="none">
        <path
          d="M0,18 Q15,12 30,14 T60,8 T100,6"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          className="stroke-[var(--glass-white-20)] skeleton-shimmer"
          style={{
            animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
            animationDelay: `${animationDelay * 100}ms`,
          }}
        />
      </svg>
    </div>
  );
}

export default ChartSkeleton;
