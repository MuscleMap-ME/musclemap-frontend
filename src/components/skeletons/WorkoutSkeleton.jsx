import React from 'react';

/**
 * Skeleton for Workout page
 */
function WorkoutSkeleton({ className = '' }) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Workout header */}
      <div className="p-6 bg-gray-900/50 rounded-xl space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-8 bg-gray-800 rounded-lg w-56 animate-pulse" />
            <div className="h-4 bg-gray-800/60 rounded w-40 animate-pulse" />
          </div>
          <div className="h-10 w-24 bg-blue-900/40 rounded-lg animate-pulse" />
        </div>

        {/* Timer display */}
        <div className="flex items-center justify-center py-8">
          <div className="h-16 w-40 bg-gray-800 rounded-xl animate-pulse" />
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4">
          {['Sets', 'Reps', 'Volume'].map((label) => (
            <div key={label} className="text-center">
              <div className="h-8 bg-gray-800/60 rounded-lg w-12 mx-auto animate-pulse mb-1" />
              <div className="h-3 bg-gray-800/40 rounded w-12 mx-auto animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Current exercise */}
      <div className="p-6 bg-gray-900/50 rounded-xl space-y-4">
        <div className="h-6 bg-gray-800/60 rounded w-32 animate-pulse" />

        <div className="flex gap-4">
          {/* Exercise thumbnail */}
          <div className="w-20 h-20 bg-gray-800 rounded-lg animate-pulse shrink-0" />

          {/* Exercise details */}
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-gray-800 rounded-lg w-3/4 animate-pulse" />
            <div className="h-4 bg-gray-800/60 rounded w-1/2 animate-pulse" />
            <div className="flex gap-2 mt-2">
              <div className="h-6 w-16 bg-gray-800/40 rounded-full animate-pulse" />
              <div className="h-6 w-20 bg-gray-800/40 rounded-full animate-pulse" />
            </div>
          </div>
        </div>

        {/* Set tracking */}
        <div className="space-y-2 mt-4">
          <div className="h-4 bg-gray-800/60 rounded w-24 animate-pulse" />
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((set) => (
              <div
                key={set}
                className="h-12 bg-gray-800/40 rounded-lg animate-pulse"
                style={{ animationDelay: `${set * 100}ms` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Exercise list */}
      <div className="space-y-3">
        <div className="h-5 bg-gray-800/60 rounded w-28 animate-pulse" />
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 bg-gray-900/50 rounded-xl"
          >
            <div className="w-10 h-10 rounded-lg bg-gray-800 animate-pulse shrink-0" />
            <div className="flex-1">
              <div className="h-5 bg-gray-800/60 rounded w-40 animate-pulse mb-1" />
              <div className="h-3 bg-gray-800/40 rounded w-24 animate-pulse" />
            </div>
            <div className="h-8 w-8 bg-gray-800/40 rounded-full animate-pulse" />
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-4">
        <div className="flex-1 h-12 bg-gray-800/40 rounded-xl animate-pulse" />
        <div className="flex-1 h-12 bg-blue-900/40 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

export default WorkoutSkeleton;
