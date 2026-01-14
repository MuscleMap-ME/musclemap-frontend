/**
 * ListSkeleton - List items skeleton with shimmer animation
 *
 * Provides skeleton states for list components with configurable
 * avatar, action buttons, and content variations. Supports custom
 * item heights and staggered animations.
 *
 * @example
 * // Basic list
 * <ListSkeleton count={5} />
 *
 * // List with avatars and actions
 * <ListSkeleton count={5} hasAvatar hasAction />
 *
 * // Custom item height
 * <ListSkeleton count={5} itemHeight={60} />
 *
 * // Staggered shimmer animation
 * <ListSkeleton count={10} />
 */

import React from 'react';
import clsx from 'clsx';
import SkeletonBase, { SkeletonText, SkeletonAvatar, SkeletonBadge } from './SkeletonBase';

/**
 * SkeletonListItem - Single list item skeleton
 *
 * @param {Object} props
 * @param {boolean} [props.hasAvatar=false] - Show avatar/icon placeholder
 * @param {boolean} [props.hasAction=false] - Show action button
 * @param {'default'|'compact'|'detailed'|'message'|'exercise'|'notification'} [props.variant='default'] - Item style
 * @param {number} [props.avatarSize=48] - Avatar size
 * @param {number} [props.itemHeight] - Custom item height
 * @param {number} [props.animationDelay] - Animation delay index
 */
export function SkeletonListItem({
  hasAvatar = false,
  hasAction = false,
  variant = 'default',
  avatarSize = 48,
  itemHeight,
  animationDelay = 0,
  className,
  style,
  ...props
}) {
  const itemStyle = itemHeight ? { minHeight: `${itemHeight}px`, ...style } : style;

  return (
    <div
      className={clsx(
        'glass p-4 rounded-xl flex items-center gap-4',
        className
      )}
      style={itemStyle}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {/* Avatar/Icon */}
      {hasAvatar && (
        variant === 'compact' ? (
          <SkeletonBase width={32} height={32} borderRadius="lg" animationDelay={animationDelay} />
        ) : variant === 'exercise' ? (
          <SkeletonBase width={avatarSize} height={avatarSize} borderRadius="lg" animationDelay={animationDelay} />
        ) : (
          <SkeletonAvatar size={avatarSize} animationDelay={animationDelay} />
        )
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {variant === 'default' && (
          <>
            <SkeletonText width="70%" size="md" animationDelay={animationDelay + 1} />
            <SkeletonText width="45%" size="xs" animationDelay={animationDelay + 2} />
          </>
        )}

        {variant === 'compact' && (
          <SkeletonText width="60%" size="sm" animationDelay={animationDelay + 1} />
        )}

        {variant === 'detailed' && (
          <>
            <SkeletonText width="75%" size="md" animationDelay={animationDelay + 1} />
            <SkeletonText width="100%" size="xs" animationDelay={animationDelay + 2} />
            <SkeletonText width="60%" size="xs" animationDelay={animationDelay + 3} />
          </>
        )}

        {variant === 'message' && (
          <>
            <div className="flex justify-between items-center">
              <SkeletonText width={120} size="sm" animationDelay={animationDelay + 1} />
              <SkeletonText width={48} size="xs" animationDelay={animationDelay + 2} />
            </div>
            <SkeletonText width="85%" size="xs" animationDelay={animationDelay + 3} />
          </>
        )}

        {variant === 'exercise' && (
          <>
            <SkeletonText width="65%" size="md" animationDelay={animationDelay + 1} />
            <SkeletonText width="40%" size="xs" animationDelay={animationDelay + 2} />
            <div className="flex gap-2 pt-1">
              <SkeletonBadge width={48} animationDelay={animationDelay + 3} />
              <SkeletonBadge width={64} animationDelay={animationDelay + 4} />
            </div>
          </>
        )}

        {variant === 'notification' && (
          <>
            <SkeletonText width="80%" size="sm" animationDelay={animationDelay + 1} />
            <div className="flex items-center gap-2">
              <SkeletonText width={64} size="xs" animationDelay={animationDelay + 2} />
              <SkeletonBase width={6} height={6} borderRadius="full" animationDelay={animationDelay + 3} />
              <SkeletonText width={48} size="xs" animationDelay={animationDelay + 4} />
            </div>
          </>
        )}
      </div>

      {/* Action button */}
      {hasAction && (
        <SkeletonBase width={32} height={32} borderRadius="lg" animationDelay={animationDelay + 5} />
      )}
    </div>
  );
}

/**
 * ListSkeleton - List of skeleton items with staggered animation
 *
 * @param {Object} props
 * @param {number} [props.count=5] - Number of items
 * @param {boolean} [props.hasAvatar=false] - Items have avatars
 * @param {boolean} [props.hasAction=false] - Items have action buttons
 * @param {'default'|'compact'|'detailed'|'message'|'exercise'|'notification'} [props.variant='default'] - Item variant
 * @param {number} [props.avatarSize=48] - Avatar size
 * @param {number} [props.itemHeight] - Custom item height in pixels
 * @param {number} [props.gap=2] - Gap between items (Tailwind spacing)
 */
function ListSkeleton({
  count = 5,
  hasAvatar = false,
  hasAction = false,
  variant = 'default',
  avatarSize = 48,
  itemHeight,
  gap = 2,
  className,
  ...props
}) {
  return (
    <div
      className={clsx(`space-y-${gap}`, className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem
          key={i}
          hasAvatar={hasAvatar}
          hasAction={hasAction}
          variant={variant}
          avatarSize={avatarSize}
          itemHeight={itemHeight}
          animationDelay={i % 10}
        />
      ))}
    </div>
  );
}

/**
 * SkeletonNotificationList - Notification-style list skeleton
 *
 * @param {Object} props
 * @param {number} [props.count=5] - Number of notifications
 * @param {boolean} [props.showUnread=true] - Show unread indicator dots
 */
export function SkeletonNotificationList({ count = 5, showUnread = true, className, ...props }) {
  return (
    <div
      className={clsx('space-y-1', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-3 rounded-lg flex items-start gap-3"
          style={{ background: 'var(--glass-white-3)' }}
        >
          {showUnread && i < 2 && (
            <SkeletonBase
              width={8}
              height={8}
              borderRadius="full"
              animationDelay={i}
              className="mt-2 flex-shrink-0"
            />
          )}
          <SkeletonAvatar size={40} animationDelay={i + 1} />
          <div className="flex-1 min-w-0 space-y-1">
            <SkeletonText width="90%" size="sm" animationDelay={i + 2} />
            <SkeletonText width="60%" size="xs" animationDelay={i + 3} />
          </div>
          <SkeletonText width={40} size="xs" animationDelay={i + 4} />
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonActivityFeed - Activity feed with timeline
 *
 * @param {Object} props
 * @param {number} [props.count=5] - Number of activity items
 * @param {boolean} [props.showTimeline=true] - Show timeline line
 */
export function SkeletonActivityFeed({ count = 5, showTimeline = true, className, ...props }) {
  return (
    <div
      className={clsx('relative', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {/* Timeline line */}
      {showTimeline && (
        <div
          className="absolute left-6 top-6 bottom-6 w-0.5"
          style={{ background: 'var(--glass-white-10)' }}
        />
      )}

      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="relative flex gap-4">
            {/* Timeline dot */}
            <SkeletonAvatar size={48} animationDelay={i} />

            {/* Content card */}
            <div className="flex-1 glass p-4 rounded-xl space-y-2">
              <div className="flex justify-between items-start">
                <SkeletonText width="70%" size="sm" animationDelay={i + 1} />
                <SkeletonText width={48} size="xs" animationDelay={i + 2} />
              </div>
              <SkeletonText width="45%" size="xs" animationDelay={i + 3} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * SkeletonConversationList - Chat conversation list
 *
 * @param {Object} props
 * @param {number} [props.count=5] - Number of conversations
 * @param {boolean} [props.showOnline=true] - Show online indicator
 */
export function SkeletonConversationList({ count = 5, showOnline = true, className, ...props }) {
  return (
    <div
      className={clsx('space-y-1', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-3 rounded-lg flex items-center gap-3"
          style={{ background: 'var(--glass-white-3)' }}
        >
          <div className="relative">
            <SkeletonAvatar size={44} animationDelay={i} />
            {showOnline && i < 2 && (
              <SkeletonBase
                width={12}
                height={12}
                borderRadius="full"
                animationDelay={i + 1}
                className="absolute -bottom-0.5 -right-0.5"
                style={{ border: '2px solid var(--bg-primary)' }}
              />
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex justify-between items-center">
              <SkeletonText width={100} size="sm" animationDelay={i + 2} />
              <SkeletonText width={40} size="xs" animationDelay={i + 3} />
            </div>
            <SkeletonText width="75%" size="xs" animationDelay={i + 4} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonSearchResults - Search results list
 *
 * @param {Object} props
 * @param {number} [props.count=5] - Number of results
 * @param {boolean} [props.showCategory=true] - Show category badge
 */
export function SkeletonSearchResults({ count = 5, showCategory = true, className, ...props }) {
  return (
    <div
      className={clsx('space-y-2', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-3 rounded-lg flex items-center gap-3"
          style={{ background: 'var(--glass-white-5)' }}
        >
          <SkeletonBase width={24} height={24} borderRadius="md" animationDelay={i} />
          <div className="flex-1 space-y-1">
            <SkeletonText width="60%" size="sm" animationDelay={i + 1} />
            <div className="flex items-center gap-2">
              <SkeletonText width="40%" size="xs" animationDelay={i + 2} />
              {showCategory && (
                <SkeletonBadge width={48} animationDelay={i + 3} />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonMenuList - Menu/navigation list skeleton
 *
 * @param {Object} props
 * @param {number} [props.count=5] - Number of menu items
 * @param {boolean} [props.hasIcons=true] - Show icons
 */
export function SkeletonMenuList({ count = 5, hasIcons = true, className, ...props }) {
  return (
    <div
      className={clsx('space-y-1', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="px-3 py-2 rounded-lg flex items-center gap-3"
        >
          {hasIcons && (
            <SkeletonBase width={20} height={20} borderRadius="sm" animationDelay={i} />
          )}
          <SkeletonText width={100 + (i * 10) % 40} size="sm" animationDelay={i + 1} />
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonCommentList - Comment/reply list skeleton
 *
 * @param {Object} props
 * @param {number} [props.count=3] - Number of comments
 * @param {boolean} [props.showReplies=false] - Show nested replies
 */
export function SkeletonCommentList({ count = 3, showReplies = false, className, ...props }) {
  return (
    <div
      className={clsx('space-y-4', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          {/* Main comment */}
          <div className="flex gap-3">
            <SkeletonAvatar size={36} animationDelay={i} />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <SkeletonText width={80} size="sm" animationDelay={i + 1} />
                <SkeletonText width={48} size="xs" animationDelay={i + 2} />
              </div>
              <SkeletonText width="90%" size="sm" animationDelay={i + 3} />
              <SkeletonText width="60%" size="sm" animationDelay={i + 4} />
              <div className="flex gap-4 pt-1">
                <SkeletonText width={40} size="xs" animationDelay={i + 5} />
                <SkeletonText width={40} size="xs" animationDelay={i + 6} />
              </div>
            </div>
          </div>

          {/* Nested replies */}
          {showReplies && i === 0 && (
            <div className="ml-12 space-y-3">
              <div className="flex gap-3">
                <SkeletonAvatar size={28} animationDelay={7} />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <SkeletonText width={60} size="xs" animationDelay={8} />
                    <SkeletonText width={40} size="xs" animationDelay={9} />
                  </div>
                  <SkeletonText width="80%" size="xs" animationDelay={10} />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonGridList - Grid layout skeleton
 *
 * @param {Object} props
 * @param {number} [props.count=6] - Number of grid items
 * @param {number} [props.columns=3] - Grid columns
 * @param {string} [props.aspectRatio='1/1'] - Item aspect ratio
 */
export function SkeletonGridList({
  count = 6,
  columns = 3,
  aspectRatio = '1/1',
  className,
  ...props
}) {
  return (
    <div
      className={clsx('grid gap-2', className)}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBase
          key={i}
          width="100%"
          height="auto"
          borderRadius="lg"
          animationDelay={i % 10}
          style={{ aspectRatio }}
        />
      ))}
    </div>
  );
}

export default ListSkeleton;
