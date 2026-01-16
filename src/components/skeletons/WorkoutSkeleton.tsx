/**
 * WorkoutSkeleton - Workout page skeleton with shimmer animation
 *
 * Provides skeleton states for workout pages including exercise lists,
 * progress bars, timer displays, and set tracking. Matches exact layout
 * of loaded workout content.
 *
 * @example
 * // Full workout page
 * <WorkoutSkeleton />
 *
 * // Compact variant
 * <WorkoutSkeleton variant="compact" />
 *
 * // Just exercises
 * {exercises.map((_, i) => <SkeletonExerciseItem key={i} animationDelay={i} />)}
 */

import React from 'react';
import clsx from 'clsx';
import SkeletonBase, { SkeletonText, SkeletonBadge } from './SkeletonBase';

/**
 * WorkoutSkeleton - Full workout page skeleton
 *
 * @param {Object} props
 * @param {'default'|'compact'|'active'} [props.variant='default'] - Display variant
 * @param {number} [props.exerciseCount=4] - Number of exercise items
 */
function WorkoutSkeleton({
  variant = 'default',
  exerciseCount = 4,
  className,
  ...props
}) {
  if (variant === 'compact') {
    return (
      <div
        className={clsx('space-y-4', className)}
        aria-hidden="true"
        role="presentation"
        {...props}
      >
        {/* Quick stats */}
        <div className="flex gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex-1 glass p-3 rounded-xl space-y-1">
              <SkeletonText width="60%" size="xs" animationDelay={i} />
              <SkeletonBase
                width="80%"
                height={24}
                borderRadius="md"
                animationDelay={i + 1}
              />
            </div>
          ))}
        </div>

        {/* Exercise list */}
        <div className="space-y-2">
          {Array.from({ length: exerciseCount }).map((_, i) => (
            <SkeletonExerciseItem key={i} animationDelay={i + 3} />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'active') {
    return (
      <div
        className={clsx('space-y-4', className)}
        aria-hidden="true"
        role="presentation"
        {...props}
      >
        {/* Current exercise with larger display */}
        <div className="glass p-6 rounded-xl space-y-4">
          <div className="flex items-center gap-4">
            <SkeletonBase width={80} height={80} borderRadius="xl" animationDelay={0} />
            <div className="flex-1 space-y-2">
              <SkeletonText width="70%" size="xl" animationDelay={1} />
              <SkeletonText width="50%" size="sm" animationDelay={2} />
              <div className="flex gap-2">
                <SkeletonBadge width={64} animationDelay={3} />
                <SkeletonBadge width={80} animationDelay={4} />
              </div>
            </div>
          </div>

          {/* Set inputs */}
          <div className="grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonSetInput key={i} animationDelay={5 + i} />
            ))}
          </div>
        </div>

        {/* Rest timer */}
        <SkeletonRestTimer />

        {/* Up next */}
        <div className="space-y-2">
          <SkeletonText width={80} size="sm" animationDelay={9} />
          <SkeletonExerciseItem compact animationDelay={10} />
        </div>
      </div>
    );
  }

  // Default full workout skeleton
  return (
    <div
      className={clsx('space-y-6', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {/* Workout header */}
      <div className="glass p-6 rounded-xl space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <SkeletonText width={220} size="2xl" animationDelay={0} />
            <SkeletonText width={140} size="sm" animationDelay={1} />
          </div>
          <SkeletonBase width={96} height={40} borderRadius="lg" animationDelay={2} />
        </div>

        {/* Timer display */}
        <div className="flex items-center justify-center py-8">
          <SkeletonBase width={160} height={64} borderRadius="xl" animationDelay={3} />
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4">
          {['Sets', 'Reps', 'Volume'].map((_, i) => (
            <div key={i} className="text-center space-y-1">
              <SkeletonBase
                width={48}
                height={32}
                borderRadius="lg"
                className="mx-auto"
                animationDelay={4 + i}
              />
              <SkeletonText
                width={48}
                size="xs"
                className="mx-auto"
                animationDelay={5 + i}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Current exercise card */}
      <div className="glass p-6 rounded-xl space-y-4">
        <SkeletonText width={120} size="lg" animationDelay={7} />

        <div className="flex gap-4">
          {/* Exercise thumbnail */}
          <SkeletonBase width={80} height={80} borderRadius="lg" animationDelay={8} />

          {/* Exercise details */}
          <div className="flex-1 space-y-2">
            <SkeletonText width="75%" size="lg" animationDelay={9} />
            <SkeletonText width="50%" size="sm" animationDelay={10} />
            <div className="flex gap-2 mt-2">
              <SkeletonBadge width={64} animationDelay={11} />
              <SkeletonBadge width={80} animationDelay={12} />
            </div>
          </div>
        </div>

        {/* Set tracking */}
        <div className="space-y-3 mt-4">
          <SkeletonText width={80} size="sm" animationDelay={13} />
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="glass p-3 rounded-lg space-y-2">
                <SkeletonText width="60%" size="xs" animationDelay={14 + i} />
                <SkeletonBase
                  width="80%"
                  height={20}
                  borderRadius="md"
                  animationDelay={15 + i}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2 mt-4">
          <div className="flex justify-between">
            <SkeletonText width={80} size="xs" animationDelay={18} />
            <SkeletonText width={32} size="xs" animationDelay={19} />
          </div>
          <SkeletonBase width="100%" height={8} borderRadius="full" animationDelay={20} />
        </div>
      </div>

      {/* Exercise list */}
      <div className="space-y-3">
        <SkeletonText width={120} size="lg" animationDelay={21} />
        {Array.from({ length: exerciseCount }).map((_, i) => (
          <SkeletonExerciseItem key={i} animationDelay={22 + i} />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-4">
        <SkeletonBase width="100%" height={48} borderRadius="xl" animationDelay={26} />
        <SkeletonBase width="100%" height={48} borderRadius="xl" animationDelay={27} />
      </div>
    </div>
  );
}

/**
 * SkeletonExerciseItem - Single exercise in list
 *
 * @param {Object} props
 * @param {boolean} [props.compact=false] - Compact variant
 * @param {boolean} [props.showMuscles=false] - Show muscle indicator badges
 * @param {number} [props.animationDelay] - Animation delay index
 */
export function SkeletonExerciseItem({
  compact = false,
  showMuscles = false,
  animationDelay = 0,
  className,
  ...props
}) {
  if (compact) {
    return (
      <div
        className={clsx('glass p-3 rounded-xl flex items-center gap-3', className)}
        aria-hidden="true"
        role="presentation"
        {...props}
      >
        <SkeletonBase width={32} height={32} borderRadius="lg" animationDelay={animationDelay} />
        <div className="flex-1 space-y-1">
          <SkeletonText width="60%" size="sm" animationDelay={animationDelay + 1} />
          <SkeletonText width="40%" size="xs" animationDelay={animationDelay + 2} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx('glass p-4 rounded-xl flex items-center gap-4', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      <SkeletonBase width={40} height={40} borderRadius="lg" animationDelay={animationDelay} />
      <div className="flex-1 space-y-1">
        <SkeletonText width="65%" size="md" animationDelay={animationDelay + 1} />
        <div className="flex items-center gap-2">
          <SkeletonText width="30%" size="xs" animationDelay={animationDelay + 2} />
          {showMuscles && (
            <div className="flex gap-1">
              <SkeletonBadge width={48} animationDelay={animationDelay + 3} />
              <SkeletonBadge width={56} animationDelay={animationDelay + 4} />
            </div>
          )}
        </div>
      </div>
      <SkeletonBase width={32} height={32} circle animationDelay={animationDelay + 5} />
    </div>
  );
}

/**
 * SkeletonRestTimer - Rest timer display skeleton
 *
 * @param {Object} props
 * @param {number} [props.animationDelay] - Animation delay index
 */
export function SkeletonRestTimer({ animationDelay = 0, className, ...props }) {
  return (
    <div
      className={clsx('glass p-6 rounded-xl text-center space-y-4', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      <SkeletonText width={80} size="sm" className="mx-auto" animationDelay={animationDelay} />
      <SkeletonBase
        width={120}
        height={64}
        borderRadius="xl"
        className="mx-auto"
        animationDelay={animationDelay + 1}
      />
      <div className="flex justify-center gap-2">
        <SkeletonBase width={64} height={32} borderRadius="lg" animationDelay={animationDelay + 2} />
        <SkeletonBase width={64} height={32} borderRadius="lg" animationDelay={animationDelay + 3} />
      </div>
    </div>
  );
}

/**
 * SkeletonSetInput - Set input row skeleton
 *
 * @param {Object} props
 * @param {boolean} [props.showCheckbox=true] - Show checkbox placeholder
 * @param {number} [props.animationDelay] - Animation delay index
 */
export function SkeletonSetInput({
  showCheckbox = true,
  animationDelay = 0,
  className,
  ...props
}) {
  return (
    <div
      className={clsx('flex items-center gap-3', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {showCheckbox && (
        <SkeletonBase width={24} height={24} borderRadius="md" animationDelay={animationDelay} />
      )}
      <SkeletonBase
        width="100%"
        height={40}
        borderRadius="lg"
        animationDelay={animationDelay + 1}
      />
      <SkeletonBase
        width="100%"
        height={40}
        borderRadius="lg"
        animationDelay={animationDelay + 2}
      />
      <SkeletonBase width={32} height={32} borderRadius="md" animationDelay={animationDelay + 3} />
    </div>
  );
}

/**
 * SkeletonWorkoutHistory - Workout history list skeleton
 *
 * @param {Object} props
 * @param {number} [props.count=5] - Number of history items
 * @param {boolean} [props.showStats=true] - Show stat summary
 */
export function SkeletonWorkoutHistory({ count = 5, showStats = true, className, ...props }) {
  return (
    <div
      className={clsx('space-y-3', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass p-4 rounded-xl space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <SkeletonText width={140} size="md" animationDelay={i} />
              <SkeletonText width={100} size="xs" animationDelay={i + 1} />
            </div>
            <SkeletonBase width={48} height={24} borderRadius="md" animationDelay={i + 2} />
          </div>
          {showStats && (
            <div className="flex gap-4">
              {[0, 1, 2].map((j) => (
                <div key={j} className="space-y-1">
                  <SkeletonText width={40} size="xs" animationDelay={i + 3 + j} />
                  <SkeletonBase width={32} height={20} borderRadius="sm" animationDelay={i + 4 + j} />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonWorkoutPlan - Workout plan/template skeleton
 *
 * @param {Object} props
 * @param {boolean} [props.showExercises=true] - Show exercise tags
 * @param {number} [props.animationDelay] - Animation delay index
 */
export function SkeletonWorkoutPlan({ showExercises = true, animationDelay = 0, className, ...props }) {
  return (
    <div
      className={clsx('glass p-4 rounded-xl space-y-4', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      <div className="flex items-center gap-4">
        <SkeletonBase width={64} height={64} borderRadius="lg" animationDelay={animationDelay} />
        <div className="flex-1 space-y-2">
          <SkeletonText width="70%" size="lg" animationDelay={animationDelay + 1} />
          <SkeletonText width="50%" size="sm" animationDelay={animationDelay + 2} />
        </div>
      </div>

      {showExercises && (
        <div className="flex gap-2 flex-wrap">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonBadge key={i} width={72} animationDelay={animationDelay + 3 + i} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border-subtle)]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="text-center space-y-1">
            <SkeletonBase
              width="100%"
              height={20}
              borderRadius="md"
              animationDelay={animationDelay + 7 + i}
            />
            <SkeletonText
              width="60%"
              size="xs"
              className="mx-auto"
              animationDelay={animationDelay + 8 + i}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * SkeletonWorkoutSummary - Post-workout summary skeleton
 *
 * @param {Object} props
 * @param {boolean} [props.showAchievements=true] - Show achievements section
 */
export function SkeletonWorkoutSummary({ showAchievements = true, className, ...props }) {
  return (
    <div
      className={clsx('space-y-6', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <SkeletonBase width={64} height={64} circle className="mx-auto" animationDelay={0} />
        <SkeletonText width={180} size="2xl" className="mx-auto" animationDelay={1} />
        <SkeletonText width={120} size="sm" className="mx-auto" animationDelay={2} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="glass p-4 rounded-xl text-center space-y-2">
            <SkeletonBase
              width={48}
              height={36}
              borderRadius="lg"
              className="mx-auto"
              animationDelay={3 + i}
            />
            <SkeletonText width={64} size="xs" className="mx-auto" animationDelay={4 + i} />
          </div>
        ))}
      </div>

      {/* Achievements */}
      {showAchievements && (
        <div className="glass p-4 rounded-xl space-y-3">
          <SkeletonText width={100} size="lg" animationDelay={7} />
          <div className="flex gap-3">
            {[0, 1, 2].map((i) => (
              <SkeletonBase key={i} width={56} height={56} borderRadius="lg" animationDelay={8 + i} />
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <SkeletonBase width="100%" height={44} borderRadius="xl" animationDelay={11} />
        <SkeletonBase width="100%" height={44} borderRadius="xl" animationDelay={12} />
      </div>
    </div>
  );
}

/**
 * SkeletonMuscleIndicator - Muscle activation indicator skeleton
 *
 * @param {Object} props
 * @param {number} [props.count=3] - Number of muscle indicators
 * @param {number} [props.animationDelay] - Animation delay index
 */
export function SkeletonMuscleIndicator({ count = 3, animationDelay = 0, className, ...props }) {
  return (
    <div
      className={clsx('flex gap-1', className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBase
          key={i}
          width={8}
          height={16}
          borderRadius="sm"
          animationDelay={animationDelay + i}
        />
      ))}
    </div>
  );
}

export default WorkoutSkeleton;
