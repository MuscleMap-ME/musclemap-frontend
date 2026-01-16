/**
 * CardSkeleton - Card loading placeholder with shimmer animation
 *
 * Provides skeleton states for card components with various layouts.
 * Uses the design system's shimmer animation for a polished loading experience.
 *
 * @example
 * // Default card
 * <CardSkeleton />
 *
 * // Card with image
 * <CardSkeleton hasImage />
 *
 * // Stat card
 * <CardSkeleton variant="stat" />
 *
 * // User card with avatar
 * <CardSkeleton variant="user" />
 *
 * // Exercise card with thumbnail
 * <CardSkeleton variant="exercise" />
 */

import React from 'react';
import clsx from 'clsx';
import SkeletonBase, {
  SkeletonText,
  SkeletonAvatar,
  SkeletonBadge,
} from './SkeletonBase';

/**
 * CardSkeleton - Flexible card skeleton component
 *
 * @param {Object} props
 * @param {'default'|'stat'|'user'|'exercise'|'compact'|'feature'} [props.variant='default'] - Card layout variant
 * @param {boolean} [props.hasImage=false] - Show image placeholder at top
 * @param {boolean} [props.hasActions=false] - Show action buttons at bottom
 * @param {'shimmer'|'pulse'|'wave'|'none'} [props.animation='shimmer'] - Animation type
 * @param {number} [props.animationDelay=0] - Animation delay index for staggered effects
 * @param {string} [props.imageAspect='16/9'] - Aspect ratio for image placeholder
 */
function CardSkeleton({
  variant = 'default',
  hasImage = false,
  hasActions = false,
  animation = 'shimmer',
  animationDelay = 0,
  imageAspect = '16/9',
  className = '',
  ...props
}) {
  return (
    <div
      className={clsx(
        'glass rounded-xl overflow-hidden',
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
          variant="rectangular"
          borderRadius="none"
          animation={animation}
          animationDelay={animationDelay}
          style={{ aspectRatio: imageAspect }}
        />
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        {variant === 'default' && (
          <>
            <SkeletonText
              width="75%"
              size="md"
              animation={animation}
              animationDelay={animationDelay + 1}
            />
            <SkeletonText
              width="100%"
              size="sm"
              animation={animation}
              animationDelay={animationDelay + 2}
            />
            <SkeletonText
              width="66%"
              size="sm"
              animation={animation}
              animationDelay={animationDelay + 3}
            />
          </>
        )}

        {variant === 'stat' && (
          <>
            <SkeletonText
              width={96}
              size="xs"
              animation={animation}
              animationDelay={animationDelay + 1}
            />
            <SkeletonBase
              width={80}
              height={40}
              variant="rounded"
              animation={animation}
              animationDelay={animationDelay + 2}
            />
          </>
        )}

        {variant === 'user' && (
          <div className="flex items-center gap-3">
            <SkeletonAvatar
              size={48}
              animation={animation}
              animationDelay={animationDelay}
            />
            <div className="flex-1 space-y-2">
              <SkeletonText
                width={128}
                size="md"
                animation={animation}
                animationDelay={animationDelay + 1}
              />
              <SkeletonText
                width={96}
                size="xs"
                animation={animation}
                animationDelay={animationDelay + 2}
              />
            </div>
          </div>
        )}

        {variant === 'exercise' && (
          <div className="flex items-center gap-4">
            <SkeletonBase
              width={64}
              height={64}
              variant="rounded"
              animation={animation}
              animationDelay={animationDelay}
            />
            <div className="flex-1 space-y-2">
              <SkeletonText
                width={160}
                size="md"
                animation={animation}
                animationDelay={animationDelay + 1}
              />
              <SkeletonText
                width={112}
                size="sm"
                animation={animation}
                animationDelay={animationDelay + 2}
              />
              <div className="flex gap-2">
                <SkeletonBadge
                  width={56}
                  animation={animation}
                  animationDelay={animationDelay + 3}
                />
                <SkeletonBadge
                  width={72}
                  animation={animation}
                  animationDelay={animationDelay + 4}
                />
              </div>
            </div>
          </div>
        )}

        {variant === 'compact' && (
          <div className="flex items-center gap-3">
            <SkeletonBase
              width={40}
              height={40}
              variant="rounded"
              animation={animation}
              animationDelay={animationDelay}
            />
            <div className="flex-1 space-y-1">
              <SkeletonText
                width="60%"
                size="sm"
                animation={animation}
                animationDelay={animationDelay + 1}
              />
              <SkeletonText
                width="40%"
                size="xs"
                animation={animation}
                animationDelay={animationDelay + 2}
              />
            </div>
          </div>
        )}

        {variant === 'feature' && (
          <div className="flex flex-col items-center text-center space-y-4">
            <SkeletonBase
              width={64}
              height={64}
              variant="rounded"
              animation={animation}
              animationDelay={animationDelay}
            />
            <div className="space-y-2 w-full">
              <SkeletonText
                width="60%"
                size="lg"
                className="mx-auto"
                animation={animation}
                animationDelay={animationDelay + 1}
              />
              <SkeletonText
                width="80%"
                size="sm"
                className="mx-auto"
                animation={animation}
                animationDelay={animationDelay + 2}
              />
            </div>
            <SkeletonBase
              width={120}
              height={40}
              variant="rounded"
              animation={animation}
              animationDelay={animationDelay + 3}
            />
          </div>
        )}

        {/* Actions */}
        {hasActions && (
          <div className="flex gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <SkeletonBase
              width="100%"
              height={32}
              variant="rounded"
              animation={animation}
              animationDelay={animationDelay + 5}
            />
            <SkeletonBase
              width={32}
              height={32}
              variant="rounded"
              animation={animation}
              animationDelay={animationDelay + 6}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * CardSkeletonGrid - Grid of card skeletons with staggered animation
 *
 * @param {Object} props
 * @param {number} [props.count=6] - Number of cards to display
 * @param {number} [props.columns=3] - Number of grid columns
 * @param {'default'|'stat'|'user'|'exercise'|'compact'|'feature'} [props.variant='default'] - Card variant
 * @param {boolean} [props.hasImage=false] - Cards have images
 * @param {'shimmer'|'pulse'|'wave'|'none'} [props.animation='shimmer'] - Animation type
 */
export function CardSkeletonGrid({
  count = 6,
  columns = 3,
  variant = 'default',
  hasImage = false,
  animation = 'shimmer',
  className = '',
  ...props
}) {
  // Create responsive column classes
  const gridColsClass =
    columns === 1
      ? 'grid-cols-1'
      : columns === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : columns === 3
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          : columns === 4
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            : `grid-cols-${columns}`;

  return (
    <div
      className={clsx('grid gap-4', gridColsClass, className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton
          key={i}
          variant={variant}
          hasImage={hasImage}
          animation={animation}
          animationDelay={i % 10}
        />
      ))}
    </div>
  );
}

/**
 * StatSkeleton - Compact stat number skeleton
 *
 * @param {Object} props
 * @param {number} [props.count=4] - Number of stats
 * @param {'horizontal'|'vertical'|'grid'} [props.layout='grid'] - Layout style
 * @param {boolean} [props.showTrend=false] - Show trend indicator
 * @param {'shimmer'|'pulse'|'wave'|'none'} [props.animation='shimmer'] - Animation type
 */
export function StatSkeleton({
  count = 4,
  layout = 'grid',
  showTrend = false,
  animation = 'shimmer',
  className,
  ...props
}) {
  const containerClass =
    layout === 'horizontal'
      ? 'flex gap-4 overflow-x-auto'
      : layout === 'vertical'
        ? 'flex flex-col gap-3'
        : 'grid grid-cols-2 md:grid-cols-4 gap-4';

  return (
    <div
      className={clsx(containerClass, className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass p-4 rounded-xl space-y-2 flex-shrink-0">
          <SkeletonText
            width={64}
            size="xs"
            animation={animation}
            animationDelay={i}
          />
          <SkeletonBase
            width={56}
            height={28}
            variant="rounded"
            animation={animation}
            animationDelay={i + 1}
          />
          {showTrend && (
            <div className="flex items-center gap-1">
              <SkeletonBase
                width={32}
                height={14}
                variant="rounded"
                borderRadius="full"
                animation={animation}
                animationDelay={i + 2}
              />
              <SkeletonText
                width={40}
                size="xs"
                animation={animation}
                animationDelay={i + 3}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default CardSkeleton;
