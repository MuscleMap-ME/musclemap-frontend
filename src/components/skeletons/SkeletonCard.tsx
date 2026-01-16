/**
 * SkeletonCard - Card-shaped skeleton matching GlassSurface
 *
 * Provides skeleton states for card components with optional header,
 * image, and configurable text lines. Matches the exact layout of
 * loaded card content.
 *
 * @example
 * // Basic card with header and content
 * <SkeletonCard hasHeader lines={3} />
 *
 * // Card with image
 * <SkeletonCard hasImage hasHeader lines={2} />
 *
 * // Card with avatar and actions
 * <SkeletonCard hasHeader hasAvatar hasActions lines={2} />
 */

import React from 'react';
import clsx from 'clsx';
import SkeletonBase, {
  SkeletonText,
  SkeletonAvatar,
  SkeletonBadge,
  SkeletonIcon,
} from './SkeletonBase';

/**
 * SkeletonCard - Main card skeleton component
 *
 * @param {Object} props
 * @param {boolean} [props.hasHeader=false] - Show header with title
 * @param {boolean} [props.hasImage=false] - Show image placeholder at top
 * @param {boolean} [props.hasAvatar=false] - Show avatar in header
 * @param {boolean} [props.hasIcon=false] - Show icon in header
 * @param {number} [props.lines=3] - Number of content lines
 * @param {boolean} [props.hasActions=false] - Show action buttons footer
 * @param {boolean} [props.hasBadges=false] - Show badge row
 * @param {string} [props.imageAspect='16/9'] - Image aspect ratio
 * @param {number} [props.animationDelay] - Starting delay for staggered animation
 */
function SkeletonCard({
  hasHeader = false,
  hasImage = false,
  hasAvatar = false,
  hasIcon = false,
  lines = 3,
  hasActions = false,
  hasBadges = false,
  imageAspect = '16/9',
  animationDelay = 0,
  className,
  ...props
}) {
  let delayIndex = animationDelay;

  return (
    <div
      className={clsx(
        'card-glass overflow-hidden',
        className
      )}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {/* Image placeholder */}
      {hasImage && (
        <SkeletonBase
          width="100%"
          height="auto"
          borderRadius="none"
          animationDelay={delayIndex++}
          style={{ aspectRatio: imageAspect }}
        />
      )}

      {/* Content area */}
      <div className="p-4 space-y-3">
        {/* Header with optional avatar/icon */}
        {hasHeader && (
          <div className="flex items-center gap-3">
            {hasAvatar && <SkeletonAvatar size={40} animationDelay={delayIndex++} />}
            {hasIcon && !hasAvatar && <SkeletonIcon size={24} animationDelay={delayIndex++} />}
            <div className="flex-1 space-y-2">
              <SkeletonText width="60%" size="lg" animationDelay={delayIndex++} />
              {hasAvatar && <SkeletonText width="40%" size="xs" animationDelay={delayIndex++} />}
            </div>
          </div>
        )}

        {/* Text lines */}
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <SkeletonText
              key={i}
              width={i === lines - 1 ? '75%' : '100%'}
              size="sm"
              animationDelay={delayIndex++}
            />
          ))}
        </div>

        {/* Badge row */}
        {hasBadges && (
          <div className="flex gap-2 flex-wrap">
            <SkeletonBadge width={56} animationDelay={delayIndex++} />
            <SkeletonBadge width={72} animationDelay={delayIndex++} />
            <SkeletonBadge width={48} animationDelay={delayIndex++} />
          </div>
        )}

        {/* Action buttons */}
        {hasActions && (
          <div className="flex gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <SkeletonBase
              width="100%"
              height={36}
              borderRadius="lg"
              animationDelay={delayIndex++}
            />
            <SkeletonBase
              width={36}
              height={36}
              borderRadius="lg"
              animationDelay={delayIndex++}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * SkeletonCardGrid - Grid of card skeletons with staggered animation
 *
 * @param {Object} props
 * @param {number} [props.count=6] - Number of cards
 * @param {number} [props.columns=3] - Grid columns
 * @param {boolean} [props.hasHeader=false] - Cards have headers
 * @param {boolean} [props.hasImage=false] - Cards have images
 * @param {number} [props.lines=3] - Content lines per card
 */
export function SkeletonCardGrid({
  count = 6,
  columns = 3,
  hasHeader = false,
  hasImage = false,
  hasAvatar = false,
  lines = 3,
  gap = 4,
  className,
  ...props
}) {
  return (
    <div
      className={clsx(`grid gap-${gap}`, className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard
          key={i}
          hasHeader={hasHeader}
          hasImage={hasImage}
          hasAvatar={hasAvatar}
          lines={lines}
          animationDelay={i % 10}
        />
      ))}
    </div>
  );
}

/**
 * SkeletonStatCard - Stat card skeleton with number and label
 *
 * @param {Object} props
 * @param {boolean} [props.hasTrend=false] - Show trend indicator
 * @param {number} [props.animationDelay] - Animation delay index
 */
export function SkeletonStatCard({ hasTrend = false, animationDelay = 0, className, ...props }) {
  return (
    <div
      className={clsx('glass p-4 rounded-xl space-y-2', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      <div className="flex items-center justify-between">
        <SkeletonText width={60} size="xs" animationDelay={animationDelay} />
        {hasTrend && (
          <SkeletonBase
            width={40}
            height={16}
            borderRadius="full"
            animationDelay={animationDelay + 1}
          />
        )}
      </div>
      <SkeletonBase
        width={80}
        height={32}
        borderRadius="md"
        animationDelay={animationDelay + 2}
      />
    </div>
  );
}

/**
 * SkeletonExerciseCard - Exercise card skeleton with thumbnail
 *
 * @param {Object} props
 * @param {boolean} [props.compact=false] - Compact variant
 * @param {number} [props.animationDelay] - Animation delay index
 */
export function SkeletonExerciseCard({ compact = false, animationDelay = 0, className, ...props }) {
  if (compact) {
    return (
      <div
        className={clsx('glass p-3 rounded-xl', className)}
        aria-hidden="true"
        role="presentation"
        {...props}
      >
        <div className="flex items-center gap-3">
          <SkeletonBase
            width={48}
            height={48}
            borderRadius="lg"
            animationDelay={animationDelay}
          />
          <div className="flex-1 space-y-1">
            <SkeletonText width="65%" size="md" animationDelay={animationDelay + 1} />
            <SkeletonText width="45%" size="xs" animationDelay={animationDelay + 2} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx('glass p-4 rounded-xl', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      <div className="flex items-center gap-4">
        <SkeletonBase
          width={64}
          height={64}
          borderRadius="lg"
          animationDelay={animationDelay}
        />
        <div className="flex-1 space-y-2">
          <SkeletonText width="70%" size="lg" animationDelay={animationDelay + 1} />
          <SkeletonText width="50%" size="sm" animationDelay={animationDelay + 2} />
          <div className="flex gap-2 pt-1">
            <SkeletonBadge width={56} animationDelay={animationDelay + 3} />
            <SkeletonBadge width={72} animationDelay={animationDelay + 4} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * SkeletonUserCard - User/profile card skeleton
 *
 * @param {Object} props
 * @param {boolean} [props.hasAction=false] - Show action button
 * @param {number} [props.animationDelay] - Animation delay index
 */
export function SkeletonUserCard({ hasAction = false, animationDelay = 0, className, ...props }) {
  return (
    <div
      className={clsx('glass p-4 rounded-xl', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      <div className="flex items-center gap-3">
        <SkeletonAvatar size={48} animationDelay={animationDelay} />
        <div className="flex-1 space-y-2">
          <SkeletonText width={120} size="md" animationDelay={animationDelay + 1} />
          <SkeletonText width={80} size="xs" animationDelay={animationDelay + 2} />
        </div>
        {hasAction && (
          <SkeletonBase
            width={72}
            height={32}
            borderRadius="lg"
            animationDelay={animationDelay + 3}
          />
        )}
      </div>
    </div>
  );
}

/**
 * SkeletonFeatureCard - Feature/promo card skeleton
 *
 * @param {Object} props
 * @param {number} [props.animationDelay] - Animation delay index
 */
export function SkeletonFeatureCard({ animationDelay = 0, className, ...props }) {
  return (
    <div
      className={clsx('glass p-6 rounded-xl', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <SkeletonBase
          width={64}
          height={64}
          borderRadius="xl"
          animationDelay={animationDelay}
        />
        <div className="space-y-2 w-full">
          <SkeletonText width="60%" size="lg" className="mx-auto" animationDelay={animationDelay + 1} />
          <SkeletonText width="80%" size="sm" className="mx-auto" animationDelay={animationDelay + 2} />
          <SkeletonText width="70%" size="sm" className="mx-auto" animationDelay={animationDelay + 3} />
        </div>
        <SkeletonBase
          width={120}
          height={40}
          borderRadius="lg"
          animationDelay={animationDelay + 4}
        />
      </div>
    </div>
  );
}

/**
 * SkeletonMiniCard - Small inline card skeleton
 *
 * @param {Object} props
 * @param {number} [props.animationDelay] - Animation delay index
 */
export function SkeletonMiniCard({ animationDelay = 0, className, ...props }) {
  return (
    <div
      className={clsx('glass px-3 py-2 rounded-lg inline-flex items-center gap-2', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      <SkeletonIcon size={20} animationDelay={animationDelay} />
      <SkeletonText width={64} size="sm" animationDelay={animationDelay + 1} />
    </div>
  );
}

export default SkeletonCard;
