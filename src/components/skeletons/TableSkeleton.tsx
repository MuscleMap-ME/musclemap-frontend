import React from 'react';

/**
 * Skeleton for table/data grid components
 */
function TableSkeleton({
  rows = 5,
  columns = 4,
  hasHeader = true,
  hasActions = false,
  className = '',
}) {
  return (
    <div className={`overflow-hidden rounded-xl bg-gray-900/50 ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Header */}
          {hasHeader && (
            <thead>
              <tr className="border-b border-gray-800">
                {Array.from({ length: columns + (hasActions ? 1 : 0) }).map((_, i) => (
                  <th key={i} className="px-4 py-3 text-left">
                    <div
                      className="h-4 bg-gray-800/60 rounded animate-pulse"
                      style={{
                        width: i === 0 ? '40%' : i === columns ? '60px' : '70%',
                      }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
          )}

          {/* Body */}
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-gray-800/50 last:border-b-0"
              >
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-4 py-3">
                    <div
                      className="h-4 bg-gray-800/40 rounded animate-pulse"
                      style={{
                        width: colIndex === 0 ? '80%' : `${50 + Math.random() * 40}%`,
                        animationDelay: `${(rowIndex * columns + colIndex) * 50}ms`,
                      }}
                    />
                  </td>
                ))}

                {/* Actions column */}
                {hasActions && (
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <div className="h-7 w-7 bg-gray-800/40 rounded animate-pulse" />
                      <div className="h-7 w-7 bg-gray-800/40 rounded animate-pulse" />
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
        <div className="h-4 w-32 bg-gray-800/40 rounded animate-pulse" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-8 w-8 bg-gray-800/40 rounded animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact data table skeleton
 */
export function CompactTableSkeleton({
  rows = 3,
  className = '',
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg"
        >
          <div className="h-4 bg-gray-800/60 rounded w-1/3 animate-pulse" />
          <div className="h-4 bg-gray-800/40 rounded w-1/4 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/**
 * Leaderboard-style table skeleton
 */
export function LeaderboardSkeleton({
  rows = 10,
  className = '',
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-3 bg-gray-900/50 rounded-xl"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {/* Rank */}
          <div className="w-8 h-8 rounded-full bg-gray-800 animate-pulse flex items-center justify-center shrink-0" />

          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gray-800/60 animate-pulse shrink-0" />

          {/* Name */}
          <div className="flex-1">
            <div className="h-4 bg-gray-800/60 rounded w-32 animate-pulse" />
          </div>

          {/* Score */}
          <div className="h-6 w-16 bg-gray-800/40 rounded-lg animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default TableSkeleton;
