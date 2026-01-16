/**
 * SkeletonStats - Stats grid skeleton
 *
 * Provides skeleton states for stats grids and dashboards.
 * Matches the exact dimensions of stat card components.
 *
 * @example
 * // Basic stats grid
 * <SkeletonStats count={4} />
 *
 * // Stats with trend indicators
 * <SkeletonStats count={6} columns={3} variant="detailed" />
 *
 * // Full dashboard skeleton
 * <SkeletonDashboard />
 */

import React from 'react';
import clsx from 'clsx';
import SkeletonBase, { SkeletonText, SkeletonAvatar } from './SkeletonBase';

/**
 * SkeletonStatItem - Single stat skeleton
 *
 * @param {Object} props
 * @param {'default'|'detailed'|'compact'|'progress'|'large'} [props.variant='default'] - Display variant
 * @param {boolean} [props.hasTrend=false] - Show trend indicator
 * @param {number} [props.animationDelay] - Animation delay index
 */
export function SkeletonStatItem({
  variant = 'default',
  hasTrend = false,
  animationDelay = 0,
  className,
  ...props
}) {
  return (
    <div
      className={clsx('glass p-4 rounded-xl', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {variant === 'default' && (
        <div className="space-y-2">
          <SkeletonText width={64} size="xs" animationDelay={animationDelay} />
          <SkeletonBase
            width={48}
            height={28}
            borderRadius="md"
            animationDelay={animationDelay + 1}
          />
          {hasTrend && (
            <div className="flex items-center gap-1 pt-1">
              <SkeletonBase
                width={32}
                height={14}
                borderRadius="full"
                animationDelay={animationDelay + 2}
              />
              <SkeletonText width={40} size="xs" animationDelay={animationDelay + 3} />
            </div>
          )}
        </div>
      )}

      {variant === 'detailed' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <SkeletonText width={80} size="xs" animationDelay={animationDelay} />
            <SkeletonBase
              width={20}
              height={20}
              borderRadius="sm"
              animationDelay={animationDelay + 1}
            />
          </div>
          <SkeletonBase
            width={72}
            height={36}
            borderRadius="md"
            animationDelay={animationDelay + 2}
          />
          <div className="flex items-center gap-2">
            <SkeletonBase
              width={40}
              height={16}
              borderRadius="full"
              animationDelay={animationDelay + 3}
            />
            <SkeletonText width={48} size="xs" animationDelay={animationDelay + 4} />
          </div>
        </div>
      )}

      {variant === 'compact' && (
        <div className="flex items-center justify-between">
          <SkeletonText width={56} size="xs" animationDelay={animationDelay} />
          <SkeletonBase
            width={40}
            height={24}
            borderRadius="md"
            animationDelay={animationDelay + 1}
          />
        </div>
      )}

      {variant === 'progress' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <SkeletonText width={72} size="sm" animationDelay={animationDelay} />
            <SkeletonText width={32} size="xs" animationDelay={animationDelay + 1} />
          </div>
          <SkeletonBase
            width="100%"
            height={8}
            borderRadius="full"
            animationDelay={animationDelay + 2}
          />
        </div>
      )}

      {variant === 'large' && (
        <div className="text-center space-y-3">
          <SkeletonBase
            width={64}
            height={48}
            borderRadius="lg"
            className="mx-auto"
            animationDelay={animationDelay}
          />
          <SkeletonText
            width={80}
            size="sm"
            className="mx-auto"
            animationDelay={animationDelay + 1}
          />
        </div>
      )}
    </div>
  );
}

/**
 * SkeletonStats - Grid of stat skeletons with staggered animation
 *
 * @param {Object} props
 * @param {number} [props.count=4] - Number of stat items
 * @param {number} [props.columns=2] - Grid columns
 * @param {'default'|'detailed'|'compact'|'progress'|'large'} [props.variant='default'] - Item variant
 * @param {boolean} [props.hasTrend=false] - Show trend indicators
 */
function SkeletonStats({
  count = 4,
  columns = 2,
  variant = 'default',
  hasTrend = false,
  className,
  ...props
}) {
  // Responsive columns
  const gridClass =
    columns === 2
      ? 'grid-cols-2'
      : columns === 3
        ? 'grid-cols-2 md:grid-cols-3'
        : columns === 4
          ? 'grid-cols-2 md:grid-cols-4'
          : `grid-cols-${columns}`;

  return (
    <div
      className={clsx('grid gap-4', gridClass, className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatItem
          key={i}
          variant={variant}
          hasTrend={hasTrend}
          animationDelay={i % 10}
        />
      ))}
    </div>
  );
}

/**
 * SkeletonProgressStats - Progress bars grid
 *
 * @param {Object} props
 * @param {number} [props.count=4] - Number of progress bars
 * @param {boolean} [props.showLabels=true] - Show labels above bars
 */
export function SkeletonProgressStats({
  count = 4,
  showLabels = true,
  className,
  ...props
}) {
  return (
    <div
      className={clsx('space-y-4', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          {showLabels && (
            <div className="flex items-center justify-between">
              <SkeletonText width={96} size="sm" animationDelay={i} />
              <SkeletonText width={40} size="xs" animationDelay={i + 1} />
            </div>
          )}
          <SkeletonBase
            width="100%"
            height={8}
            borderRadius="full"
            animationDelay={i + 2}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonDashboard - Full dashboard skeleton
 *
 * @param {Object} props
 * @param {boolean} [props.showChart=true] - Show chart area
 * @param {boolean} [props.showSidebar=true] - Show sidebar panel
 */
export function SkeletonDashboard({ showChart = true, showSidebar = true, className, ...props }) {
  return (
    <div
      className={clsx('space-y-6', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {/* Header stats */}
      <SkeletonStats count={4} columns={4} variant="detailed" />

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Large chart area */}
        {showChart && (
          <div className="lg:col-span-2 glass p-4 rounded-xl">
            <SkeletonText width={120} size="lg" className="mb-4" animationDelay={0} />
            <SkeletonBase
              width="100%"
              height={240}
              borderRadius="lg"
              animationDelay={1}
            />
          </div>
        )}

        {/* Side panel */}
        {showSidebar && (
          <div className="glass p-4 rounded-xl space-y-4">
            <SkeletonText width={100} size="lg" animationDelay={2} />
            <SkeletonProgressStats count={4} />
          </div>
        )}
      </div>

      {/* Bottom section */}
      <div className="glass p-4 rounded-xl">
        <SkeletonText width={140} size="lg" className="mb-4" animationDelay={6} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStatItem key={i} variant="compact" animationDelay={7 + i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * SkeletonLeaderboard - Leaderboard skeleton
 *
 * @param {Object} props
 * @param {number} [props.count=5] - Number of leaderboard entries
 * @param {boolean} [props.showRank=true] - Show rank numbers
 * @param {boolean} [props.showScore=true] - Show score values
 */
export function SkeletonLeaderboard({
  count = 5,
  showRank = true,
  showScore = true,
  className,
  ...props
}) {
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
          className="glass p-3 rounded-xl flex items-center gap-3"
        >
          {showRank && (
            <SkeletonBase
              width={24}
              height={24}
              borderRadius="md"
              animationDelay={i}
            />
          )}
          <SkeletonAvatar size={40} animationDelay={i + 1} />
          <div className="flex-1 space-y-1">
            <SkeletonText width={100} size="sm" animationDelay={i + 2} />
            <SkeletonText width={60} size="xs" animationDelay={i + 3} />
          </div>
          {showScore && (
            <SkeletonBase
              width={48}
              height={24}
              borderRadius="md"
              animationDelay={i + 4}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonCharacterStats - RPG-style character stats skeleton
 *
 * @param {Object} props
 * @param {number} [props.statCount=6] - Number of stat bars
 */
export function SkeletonCharacterStats({ statCount = 6, className, ...props }) {
  return (
    <div
      className={clsx('glass p-6 rounded-xl space-y-6', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {/* Header with level */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SkeletonAvatar size={64} animationDelay={0} />
          <div className="space-y-2">
            <SkeletonText width={120} size="xl" animationDelay={1} />
            <SkeletonText width={80} size="sm" animationDelay={2} />
          </div>
        </div>
        <div className="text-center space-y-1">
          <SkeletonBase width={48} height={32} borderRadius="lg" animationDelay={3} />
          <SkeletonText width={40} size="xs" animationDelay={4} />
        </div>
      </div>

      {/* XP Bar */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <SkeletonText width={80} size="sm" animationDelay={5} />
          <SkeletonText width={60} size="sm" animationDelay={6} />
        </div>
        <SkeletonBase width="100%" height={12} borderRadius="full" animationDelay={7} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: statCount }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <SkeletonText width={64} size="xs" animationDelay={8 + i} />
              <SkeletonText width={24} size="xs" animationDelay={9 + i} />
            </div>
            <SkeletonBase width="100%" height={6} borderRadius="full" animationDelay={10 + i} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * SkeletonMetricRow - Horizontal metric display skeleton
 *
 * @param {Object} props
 * @param {number} [props.count=3] - Number of metrics
 */
export function SkeletonMetricRow({ count = 3, className, ...props }) {
  return (
    <div
      className={clsx('flex justify-around', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="text-center space-y-2">
          <SkeletonBase
            width={48}
            height={32}
            borderRadius="lg"
            className="mx-auto"
            animationDelay={i}
          />
          <SkeletonText
            width={56}
            size="xs"
            className="mx-auto"
            animationDelay={i + 1}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonComparisonCard - Before/after comparison skeleton
 *
 * @param {Object} props
 */
export function SkeletonComparisonCard({ className, ...props }) {
  return (
    <div
      className={clsx('glass p-4 rounded-xl', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      <SkeletonText width={100} size="lg" className="mb-4" animationDelay={0} />
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <SkeletonText width={60} size="xs" animationDelay={1} />
          <SkeletonBase width={64} height={36} borderRadius="lg" animationDelay={2} />
        </div>
        <div className="space-y-2">
          <SkeletonText width={60} size="xs" animationDelay={3} />
          <SkeletonBase width={64} height={36} borderRadius="lg" animationDelay={4} />
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <SkeletonText width={80} size="sm" animationDelay={5} />
          <SkeletonBase width={48} height={24} borderRadius="full" animationDelay={6} />
        </div>
      </div>
    </div>
  );
}

export default SkeletonStats;
