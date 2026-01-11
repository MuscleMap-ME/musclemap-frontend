import React from 'react';

/**
 * Skeleton for Profile page
 */
function ProfileSkeleton({ className = '' }) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header section */}
      <div className="flex items-start gap-6">
        {/* Avatar */}
        <div className="w-24 h-24 rounded-full bg-gray-800 animate-pulse shrink-0" />

        {/* Name and stats */}
        <div className="flex-1 space-y-3">
          <div className="h-8 bg-gray-800 rounded-lg w-48 animate-pulse" />
          <div className="h-4 bg-gray-800/60 rounded w-32 animate-pulse" />
          <div className="flex gap-4 mt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <div className="h-6 w-12 bg-gray-800 rounded animate-pulse mb-1" />
                <div className="h-3 w-16 bg-gray-800/60 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bio section */}
      <div className="p-4 bg-gray-900/50 rounded-xl space-y-3">
        <div className="h-4 bg-gray-800/60 rounded w-full animate-pulse" />
        <div className="h-4 bg-gray-800/60 rounded w-4/5 animate-pulse" />
        <div className="h-4 bg-gray-800/60 rounded w-2/3 animate-pulse" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 bg-gray-900/50 rounded-xl space-y-2">
            <div className="h-8 bg-gray-800 rounded-lg w-16 animate-pulse" />
            <div className="h-4 bg-gray-800/60 rounded w-24 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="space-y-3">
        <div className="h-6 bg-gray-800 rounded w-32 animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 bg-gray-900/50 rounded-xl"
          >
            <div className="w-10 h-10 rounded-lg bg-gray-800 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-800/60 rounded w-3/4 animate-pulse" />
              <div className="h-3 bg-gray-800/40 rounded w-1/2 animate-pulse" />
            </div>
            <div className="h-4 w-16 bg-gray-800/60 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProfileSkeleton;
