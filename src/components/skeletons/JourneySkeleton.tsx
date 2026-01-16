import React from 'react';

/**
 * Skeleton for Journey/Progress page
 */
function JourneySkeleton({ className = '' }) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with progress ring */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 bg-gray-800 rounded-lg w-48 animate-pulse" />
          <div className="h-4 bg-gray-800/60 rounded w-32 animate-pulse" />
        </div>

        {/* Progress ring skeleton */}
        <div className="relative w-20 h-20">
          <svg className="w-full h-full" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="35"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-gray-800"
            />
            <circle
              cx="40"
              cy="40"
              r="35"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="220"
              strokeDashoffset="80"
              className="text-gray-700 animate-pulse"
              transform="rotate(-90 40 40)"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-6 w-8 bg-gray-800 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-800" />

        {/* Timeline items */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="relative flex gap-4 pb-8 last:pb-0">
            {/* Node */}
            <div
              className="w-12 h-12 rounded-full bg-gray-800 animate-pulse z-10 shrink-0"
              style={{ animationDelay: `${i * 150}ms` }}
            />

            {/* Content */}
            <div className="flex-1 pt-2">
              <div className="p-4 bg-gray-900/50 rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <div className="h-5 bg-gray-800/60 rounded w-32 animate-pulse" />
                  <div className="h-4 bg-gray-800/40 rounded w-20 animate-pulse" />
                </div>
                <div className="h-4 bg-gray-800/40 rounded w-full animate-pulse" />
                <div className="h-4 bg-gray-800/40 rounded w-3/4 animate-pulse" />

                {/* Milestone badge */}
                {i === 1 && (
                  <div className="flex gap-2 mt-2">
                    <div className="h-6 w-20 bg-blue-900/30 rounded-full animate-pulse" />
                    <div className="h-6 w-16 bg-green-900/30 rounded-full animate-pulse" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Achievement section */}
      <div className="space-y-3">
        <div className="h-6 bg-gray-800 rounded w-40 animate-pulse" />
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="aspect-square bg-gray-900/50 rounded-xl p-3 flex flex-col items-center justify-center gap-2"
            >
              <div className="w-10 h-10 rounded-full bg-gray-800 animate-pulse" />
              <div className="h-3 w-12 bg-gray-800/60 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default JourneySkeleton;
