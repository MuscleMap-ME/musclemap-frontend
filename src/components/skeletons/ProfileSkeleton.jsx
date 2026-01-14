/**
 * ProfileSkeleton - Profile page skeleton with shimmer animation
 *
 * Provides skeleton states for user profile pages including avatar,
 * name, stats, bio, and activity sections. Matches exact layout
 * of loaded profile content.
 *
 * @example
 * // Full profile page
 * <ProfileSkeleton />
 *
 * // Compact variant
 * <ProfileSkeleton compact />
 *
 * // Without activity section
 * <ProfileSkeleton showActivity={false} />
 */

import React from 'react';
import clsx from 'clsx';
import SkeletonBase, { SkeletonText, SkeletonAvatar, SkeletonBadge } from './SkeletonBase';

/**
 * ProfileSkeleton - Full profile page skeleton
 *
 * @param {Object} props
 * @param {boolean} [props.compact=false] - Compact card variant
 * @param {boolean} [props.showActivity=true] - Show activity section
 * @param {boolean} [props.showBio=true] - Show bio section
 * @param {boolean} [props.showStats=true] - Show stats cards
 * @param {boolean} [props.showAchievements=true] - Show achievements section
 */
function ProfileSkeleton({
  compact = false,
  showActivity = true,
  showBio = true,
  showStats = true,
  showAchievements = true,
  className,
  ...props
}) {
  if (compact) {
    return (
      <div
        className={clsx('glass p-4 rounded-xl', className)}
        aria-hidden="true"
        role="presentation"
        {...props}
      >
        <div className="flex items-center gap-4">
          <SkeletonAvatar size={56} animationDelay={0} />
          <div className="flex-1 space-y-2">
            <SkeletonText width={140} size="lg" animationDelay={1} />
            <SkeletonText width={80} size="xs" animationDelay={2} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx('space-y-6', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start gap-6">
        {/* Avatar with wealth tier ring */}
        <div className="relative">
          <SkeletonAvatar size={96} animationDelay={0} />
          <SkeletonBase
            width={24}
            height={24}
            borderRadius="full"
            className="absolute -bottom-1 -right-1"
            animationDelay={1}
          />
        </div>

        {/* Name and stats */}
        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <SkeletonText width={180} size="2xl" animationDelay={2} />
            <div className="flex items-center gap-2">
              <SkeletonText width={120} size="sm" animationDelay={3} />
              <SkeletonBadge width={60} animationDelay={4} />
            </div>
          </div>

          {/* Profile stats row */}
          <div className="flex gap-6 mt-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="text-center space-y-1">
                <SkeletonBase
                  width={48}
                  height={24}
                  borderRadius="md"
                  animationDelay={5 + i}
                />
                <SkeletonText width={56} size="xs" animationDelay={6 + i} />
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-4">
            <SkeletonBase width={100} height={36} borderRadius="lg" animationDelay={8} />
            <SkeletonBase width={80} height={36} borderRadius="lg" animationDelay={9} />
            <SkeletonBase width={36} height={36} borderRadius="lg" animationDelay={10} />
          </div>
        </div>
      </div>

      {/* Bio section */}
      {showBio && (
        <div className="glass p-4 rounded-xl space-y-3">
          <SkeletonText width={60} size="sm" animationDelay={11} />
          <div className="space-y-2">
            <SkeletonText width="100%" size="sm" animationDelay={12} />
            <SkeletonText width="85%" size="sm" animationDelay={13} />
            <SkeletonText width="60%" size="sm" animationDelay={14} />
          </div>
        </div>
      )}

      {/* Stats cards */}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="glass p-4 rounded-xl space-y-2">
              <SkeletonText width={64} size="xs" animationDelay={15 + i} />
              <SkeletonBase width={56} height={28} borderRadius="md" animationDelay={16 + i} />
              <SkeletonText width={48} size="xs" animationDelay={17 + i} />
            </div>
          ))}
        </div>
      )}

      {/* Achievements section */}
      {showAchievements && (
        <div className="glass p-4 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <SkeletonText width={120} size="lg" animationDelay={19} />
            <SkeletonText width={60} size="xs" animationDelay={20} />
          </div>
          <div className="flex gap-3 flex-wrap">
            {[0, 1, 2, 3, 4].map((i) => (
              <SkeletonBase key={i} width={48} height={48} borderRadius="lg" animationDelay={21 + i} />
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {showActivity && (
        <div className="space-y-4">
          <SkeletonText width={140} size="lg" animationDelay={26} />
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="glass p-4 rounded-xl flex items-center gap-4"
              >
                <SkeletonBase width={40} height={40} borderRadius="lg" animationDelay={27 + i * 3} />
                <div className="flex-1 space-y-2">
                  <SkeletonText width="70%" size="sm" animationDelay={28 + i * 3} />
                  <SkeletonText width="45%" size="xs" animationDelay={29 + i * 3} />
                </div>
                <SkeletonText width={48} size="xs" animationDelay={30 + i * 3} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * SkeletonProfileHeader - Just the header portion
 *
 * @param {Object} props
 * @param {number} [props.avatarSize=72] - Avatar size
 * @param {boolean} [props.showStats=true] - Show stat numbers
 * @param {number} [props.animationDelay] - Animation delay index
 */
export function SkeletonProfileHeader({
  avatarSize = 72,
  showStats = true,
  animationDelay = 0,
  className,
  ...props
}) {
  return (
    <div
      className={clsx('flex items-center gap-4', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      <SkeletonAvatar size={avatarSize} animationDelay={animationDelay} />
      <div className="flex-1 space-y-2">
        <SkeletonText width={160} size="xl" animationDelay={animationDelay + 1} />
        <SkeletonText width={100} size="sm" animationDelay={animationDelay + 2} />
        {showStats && (
          <div className="flex gap-4 mt-2">
            {[0, 1, 2].map((i) => (
              <SkeletonText key={i} width={40} size="xs" animationDelay={animationDelay + 3 + i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * SkeletonProfileCard - Compact profile card
 *
 * @param {Object} props
 * @param {boolean} [props.showStats=true] - Show stat grid
 * @param {number} [props.animationDelay] - Animation delay index
 */
export function SkeletonProfileCard({ showStats = true, animationDelay = 0, className, ...props }) {
  return (
    <div
      className={clsx('glass p-4 rounded-xl', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      <div className="flex items-center gap-3 mb-4">
        <SkeletonAvatar size={48} animationDelay={animationDelay} />
        <div className="flex-1 space-y-1">
          <SkeletonText width={120} size="md" animationDelay={animationDelay + 1} />
          <SkeletonText width={80} size="xs" animationDelay={animationDelay + 2} />
        </div>
      </div>
      {showStats && (
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="text-center space-y-1">
              <SkeletonBase
                width="100%"
                height={24}
                borderRadius="md"
                animationDelay={animationDelay + 3 + i}
              />
              <SkeletonText
                width="80%"
                size="xs"
                className="mx-auto"
                animationDelay={animationDelay + 4 + i}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * SkeletonUserList - List of user profiles
 *
 * @param {Object} props
 * @param {number} [props.count=5] - Number of users
 * @param {boolean} [props.hasAction=false] - Show action button
 * @param {boolean} [props.showBio=false] - Show bio snippet
 */
export function SkeletonUserList({
  count = 5,
  hasAction = false,
  showBio = false,
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
          <SkeletonAvatar size={40} animationDelay={i} />
          <div className="flex-1 space-y-1">
            <SkeletonText width={100} size="sm" animationDelay={i + 1} />
            {showBio ? (
              <SkeletonText width="80%" size="xs" animationDelay={i + 2} />
            ) : (
              <SkeletonText width={60} size="xs" animationDelay={i + 2} />
            )}
          </div>
          {hasAction && (
            <SkeletonBase width={72} height={28} borderRadius="lg" animationDelay={i + 3} />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonFollowerCard - Follower/following card skeleton
 *
 * @param {Object} props
 * @param {number} [props.animationDelay] - Animation delay index
 */
export function SkeletonFollowerCard({ animationDelay = 0, className, ...props }) {
  return (
    <div
      className={clsx('glass p-4 rounded-xl', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      <div className="flex items-center gap-3">
        <SkeletonAvatar size={44} animationDelay={animationDelay} />
        <div className="flex-1 space-y-1">
          <SkeletonText width={100} size="sm" animationDelay={animationDelay + 1} />
          <SkeletonText width={60} size="xs" animationDelay={animationDelay + 2} />
        </div>
        <SkeletonBase width={80} height={32} borderRadius="lg" animationDelay={animationDelay + 3} />
      </div>
    </div>
  );
}

/**
 * SkeletonProfileBanner - Profile banner/cover image skeleton
 *
 * @param {Object} props
 * @param {string} [props.aspectRatio='3/1'] - Banner aspect ratio
 * @param {number} [props.animationDelay] - Animation delay index
 */
export function SkeletonProfileBanner({ aspectRatio = '3/1', animationDelay = 0, className, ...props }) {
  return (
    <div className={clsx('relative', className)} aria-hidden="true" role="presentation" {...props}>
      <SkeletonBase
        width="100%"
        height="auto"
        borderRadius="xl"
        animationDelay={animationDelay}
        style={{ aspectRatio }}
      />
      {/* Avatar overlay */}
      <div className="absolute -bottom-8 left-4">
        <SkeletonAvatar size={80} animationDelay={animationDelay + 1} />
      </div>
    </div>
  );
}

/**
 * SkeletonCrewCard - Crew/team card skeleton
 *
 * @param {Object} props
 * @param {number} [props.memberCount=5] - Number of member avatars to show
 * @param {number} [props.animationDelay] - Animation delay index
 */
export function SkeletonCrewCard({ memberCount = 5, animationDelay = 0, className, ...props }) {
  return (
    <div
      className={clsx('glass p-4 rounded-xl space-y-4', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      <div className="flex items-center gap-3">
        <SkeletonBase width={48} height={48} borderRadius="lg" animationDelay={animationDelay} />
        <div className="flex-1 space-y-1">
          <SkeletonText width={120} size="lg" animationDelay={animationDelay + 1} />
          <SkeletonText width={80} size="xs" animationDelay={animationDelay + 2} />
        </div>
      </div>

      {/* Member avatars */}
      <div className="flex -space-x-2">
        {Array.from({ length: memberCount }).map((_, i) => (
          <SkeletonAvatar
            key={i}
            size={32}
            animationDelay={animationDelay + 3 + i}
            style={{
              border: '2px solid var(--bg-primary)',
              zIndex: memberCount - i,
            }}
          />
        ))}
        <SkeletonBase
          width={32}
          height={32}
          borderRadius="full"
          animationDelay={animationDelay + 3 + memberCount}
          style={{ marginLeft: '-8px', zIndex: 0 }}
        />
      </div>

      {/* Stats */}
      <div className="flex justify-between pt-3 border-t border-[var(--border-subtle)]">
        <SkeletonText width={60} size="xs" animationDelay={animationDelay + 4 + memberCount} />
        <SkeletonText width={80} size="xs" animationDelay={animationDelay + 5 + memberCount} />
      </div>
    </div>
  );
}

/**
 * SkeletonWealthIndicator - Wealth tier indicator skeleton
 *
 * @param {Object} props
 * @param {number} [props.animationDelay] - Animation delay index
 */
export function SkeletonWealthIndicator({ animationDelay = 0, className, ...props }) {
  return (
    <div
      className={clsx('flex items-center gap-2', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      <SkeletonBase width={24} height={24} borderRadius="full" animationDelay={animationDelay} />
      <SkeletonText width={56} size="xs" animationDelay={animationDelay + 1} />
    </div>
  );
}

export default ProfileSkeleton;
