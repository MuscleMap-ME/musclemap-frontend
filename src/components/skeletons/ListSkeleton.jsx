import React from 'react';

/**
 * Reusable List skeleton
 */
function ListSkeleton({
  count = 5,
  hasAvatar = false,
  hasSecondaryAction = false,
  variant = 'default',
  className = '',
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <ListItemSkeleton
          key={i}
          hasAvatar={hasAvatar}
          hasSecondaryAction={hasSecondaryAction}
          variant={variant}
          style={{ animationDelay: `${i * 75}ms` }}
        />
      ))}
    </div>
  );
}

/**
 * Single list item skeleton
 */
export function ListItemSkeleton({
  hasAvatar = false,
  hasSecondaryAction = false,
  variant = 'default',
  className = '',
  style = {},
}) {
  return (
    <div
      className={`flex items-center gap-4 p-4 bg-gray-900/50 rounded-xl ${className}`}
      style={style}
    >
      {/* Avatar/Icon */}
      {hasAvatar && (
        <div className={`shrink-0 bg-gray-800 animate-pulse ${
          variant === 'compact' ? 'w-8 h-8 rounded-lg' : 'w-12 h-12 rounded-full'
        }`} />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {variant === 'default' && (
          <>
            <div className="h-5 bg-gray-800/60 rounded w-3/4 animate-pulse mb-2" />
            <div className="h-3 bg-gray-800/40 rounded w-1/2 animate-pulse" />
          </>
        )}

        {variant === 'compact' && (
          <div className="h-4 bg-gray-800/60 rounded w-2/3 animate-pulse" />
        )}

        {variant === 'detailed' && (
          <>
            <div className="h-5 bg-gray-800/60 rounded w-3/4 animate-pulse mb-2" />
            <div className="h-3 bg-gray-800/40 rounded w-full animate-pulse mb-1" />
            <div className="h-3 bg-gray-800/40 rounded w-2/3 animate-pulse" />
          </>
        )}

        {variant === 'message' && (
          <>
            <div className="flex justify-between items-center mb-2">
              <div className="h-4 bg-gray-800/60 rounded w-32 animate-pulse" />
              <div className="h-3 bg-gray-800/40 rounded w-16 animate-pulse" />
            </div>
            <div className="h-3 bg-gray-800/40 rounded w-full animate-pulse" />
          </>
        )}
      </div>

      {/* Secondary action */}
      {hasSecondaryAction && (
        <div className="h-8 w-8 bg-gray-800/40 rounded-lg animate-pulse shrink-0" />
      )}
    </div>
  );
}

/**
 * Notification-style list skeleton
 */
export function NotificationListSkeleton({ count = 5, className = '' }) {
  return (
    <ListSkeleton
      count={count}
      hasAvatar
      variant="message"
      className={className}
    />
  );
}

/**
 * Activity feed skeleton
 */
export function ActivityFeedSkeleton({ count = 5, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      {/* Timeline line */}
      <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gray-800" />

      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="relative flex gap-4">
            {/* Timeline dot */}
            <div className="w-12 h-12 rounded-full bg-gray-800 animate-pulse z-10 shrink-0" />

            {/* Content */}
            <div className="flex-1 p-4 bg-gray-900/50 rounded-xl">
              <div className="h-4 bg-gray-800/60 rounded w-3/4 animate-pulse mb-2" />
              <div className="h-3 bg-gray-800/40 rounded w-1/2 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ListSkeleton;
