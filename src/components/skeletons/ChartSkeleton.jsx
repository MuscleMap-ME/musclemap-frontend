import React from 'react';

/**
 * Skeleton for chart components (radar, line, bar charts)
 */
function ChartSkeleton({ type = 'line', height = 300, className = '' }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gray-900/50 p-4 ${className}`}
      style={{ height }}
    >
      {/* Chart area */}
      <div className="h-full w-full flex items-end justify-between gap-2">
        {type === 'bar' && (
          <>
            {/* Bar chart skeleton */}
            {[40, 65, 45, 80, 55, 70, 50, 75, 60, 85].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-gray-700/50 rounded-t animate-pulse"
                style={{
                  height: `${h}%`,
                  animationDelay: `${i * 100}ms`,
                }}
              />
            ))}
          </>
        )}

        {type === 'line' && (
          <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
            {/* Grid lines */}
            {[0, 50, 100, 150, 200].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="400"
                y2={y}
                stroke="currentColor"
                strokeWidth="1"
                className="text-gray-800"
              />
            ))}

            {/* Animated line placeholder */}
            <path
              d="M0,150 Q50,120 100,130 T200,100 T300,120 T400,80"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-gray-700 animate-pulse"
              strokeLinecap="round"
            />

            {/* Area under line */}
            <path
              d="M0,150 Q50,120 100,130 T200,100 T300,120 T400,80 L400,200 L0,200 Z"
              fill="currentColor"
              className="text-gray-800/30"
            />
          </svg>
        )}

        {type === 'radar' && (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-4/5 h-4/5" viewBox="0 0 200 200">
              {/* Radar web */}
              {[1, 0.75, 0.5, 0.25].map((scale, i) => (
                <polygon
                  key={i}
                  points={getRadarPoints(6, 80 * scale, 100, 100)}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-gray-800"
                />
              ))}

              {/* Radar data placeholder */}
              <polygon
                points={getRadarPoints(6, 50, 100, 100, [0.6, 0.8, 0.4, 0.7, 0.5, 0.9])}
                fill="currentColor"
                className="text-blue-500/20 animate-pulse"
                stroke="currentColor"
                strokeWidth="2"
                style={{ stroke: 'rgb(59, 130, 246)' }}
              />

              {/* Center dot */}
              <circle cx="100" cy="100" r="3" className="fill-gray-600" />
            </svg>
          </div>
        )}
      </div>

      {/* X-axis labels */}
      {type !== 'radar' && (
        <div className="absolute bottom-0 left-4 right-4 flex justify-between text-xs text-gray-600">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <span key={day} className="animate-pulse">
              {day}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

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

export default ChartSkeleton;
