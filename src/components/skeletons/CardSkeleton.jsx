import React from 'react';

/**
 * Reusable Card skeleton with various configurations
 */
function CardSkeleton({
  variant = 'default',
  hasImage = false,
  hasActions = false,
  className = '',
}) {
  return (
    <div className={`bg-gray-900/50 rounded-xl overflow-hidden ${className}`}>
      {/* Image placeholder */}
      {hasImage && (
        <div className="aspect-video bg-gray-800 animate-pulse" />
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        {variant === 'default' && (
          <>
            <div className="h-5 bg-gray-800/60 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-gray-800/40 rounded w-full animate-pulse" />
            <div className="h-4 bg-gray-800/40 rounded w-2/3 animate-pulse" />
          </>
        )}

        {variant === 'stat' && (
          <>
            <div className="h-4 bg-gray-800/40 rounded w-24 animate-pulse" />
            <div className="h-10 bg-gray-800 rounded-lg w-20 animate-pulse" />
          </>
        )}

        {variant === 'user' && (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-800 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-800/60 rounded w-32 animate-pulse" />
              <div className="h-3 bg-gray-800/40 rounded w-24 animate-pulse" />
            </div>
          </div>
        )}

        {variant === 'exercise' && (
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-gray-800 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-800/60 rounded w-40 animate-pulse" />
              <div className="h-4 bg-gray-800/40 rounded w-28 animate-pulse" />
              <div className="flex gap-2">
                <div className="h-5 w-14 bg-gray-800/30 rounded-full animate-pulse" />
                <div className="h-5 w-18 bg-gray-800/30 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {hasActions && (
          <div className="flex gap-2 pt-2 border-t border-gray-800">
            <div className="h-8 flex-1 bg-gray-800/40 rounded-lg animate-pulse" />
            <div className="h-8 w-8 bg-gray-800/40 rounded-lg animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Grid of card skeletons
 */
export function CardSkeletonGrid({
  count = 6,
  columns = 3,
  variant = 'default',
  hasImage = false,
  className = '',
}) {
  return (
    <div
      className={`grid gap-4 ${className}`}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton
          key={i}
          variant={variant}
          hasImage={hasImage}
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  );
}

export default CardSkeleton;
