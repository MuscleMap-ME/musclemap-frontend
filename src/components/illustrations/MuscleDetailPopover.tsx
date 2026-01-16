/**
 * MuscleDetailPopover - Interactive popover showing muscle details
 *
 * Shows when a muscle is clicked on the body map or exercise illustration.
 * Displays muscle info, exercises targeting it, and workout history.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { getActivationColor, MUSCLE_GROUP_COLORS } from '@musclemap/shared';

/**
 * MuscleDetailPopover - Main component
 */
const MuscleDetailPopover = ({
  isOpen,
  onClose,
  muscleId,
  muscleName,
  muscleGroup,
  activation = 0,
  exercises = [], // Array of { id, name, activation, illustrationUrl }
  recentWorkouts = [], // Array of { date, tuEarned }
  onExerciseClick,
  onViewAllExercises,
  position = { x: 0, y: 0 },
  className,
}) => {
  const groupColor = MUSCLE_GROUP_COLORS[muscleGroup] || { color: '#64748B', glow: 'rgba(100, 116, 139, 0.5)' };
  const activationColor = getActivationColor(activation);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        className={clsx(
          'fixed z-50 w-80 max-h-96 overflow-hidden',
          'bg-[var(--void-base)] rounded-xl shadow-2xl',
          'border border-[var(--border-subtle)]',
          className
        )}
        style={{
          left: Math.min(position.x, window.innerWidth - 340),
          top: Math.min(position.y + 10, window.innerHeight - 420),
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b border-[var(--border-subtle)]"
          style={{ background: `linear-gradient(135deg, ${groupColor.glow} 0%, transparent 100%)` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{
                  backgroundColor: groupColor.color,
                  boxShadow: `0 0 12px ${groupColor.glow}`,
                }}
              />
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  {muscleName || formatMuscleName(muscleId)}
                </h3>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {muscleGroup}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[var(--glass-white-10)] transition-colors"
            >
              <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Activation indicator */}
          {activation > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-[var(--glass-white-10)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: activationColor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${activation}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              <span className="text-xs font-medium" style={{ color: activationColor }}>
                {Math.round(activation)}%
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="max-h-64 overflow-y-auto">
          {/* Exercises section */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                Top Exercises
              </h4>
              {exercises.length > 3 && onViewAllExercises && (
                <button
                  onClick={() => onViewAllExercises(muscleId)}
                  className="text-xs text-[var(--brand-teal-400)] hover:text-[var(--brand-teal-300)]"
                >
                  View all
                </button>
              )}
            </div>

            {exercises.length > 0 ? (
              <div className="space-y-2">
                {exercises.slice(0, 4).map((exercise) => (
                  <motion.button
                    key={exercise.id}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--glass-white-5)] transition-colors text-left"
                    onClick={() => onExerciseClick?.(exercise)}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Mini illustration or placeholder */}
                    <div className="w-10 h-10 rounded-lg bg-[var(--glass-white-5)] flex items-center justify-center overflow-hidden">
                      {exercise.illustrationUrl ? (
                        <img
                          src={exercise.illustrationUrl}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <svg className="w-5 h-5 text-[var(--text-quaternary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {exercise.name}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {exercise.activation}% activation
                      </p>
                    </div>

                    {/* Activation indicator */}
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getActivationColor(exercise.activation) }}
                    />
                  </motion.button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
                No exercises found
              </p>
            )}
          </div>

          {/* Recent activity section */}
          {recentWorkouts.length > 0 && (
            <div className="px-4 pb-4">
              <h4 className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
                Recent Activity
              </h4>
              <div className="flex items-end gap-1 h-12">
                {recentWorkouts.slice(-7).map((workout, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-[var(--glass-white-10)] rounded-sm transition-all hover:bg-[var(--brand-teal-500)]"
                    style={{
                      height: `${Math.max(10, (workout.tuEarned / Math.max(...recentWorkouts.map(w => w.tuEarned))) * 100)}%`,
                      backgroundColor: workout.tuEarned > 0 ? groupColor.color : undefined,
                      opacity: workout.tuEarned > 0 ? 0.7 : 0.2,
                    }}
                    title={`${workout.date}: ${workout.tuEarned} TU`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-[var(--text-quaternary)] text-center mt-1">
                Last 7 days
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Format muscle ID to readable name
 */
function formatMuscleName(muscleId) {
  return muscleId
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * useMuscleDetail - Hook for managing muscle detail popover state
 */
export function useMuscleDetail() {
  const [isOpen, setIsOpen] = useState(false);
  const [muscleData, setMuscleData] = useState(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);

  const openDetail = async (data, event) => {
    const rect = event?.target?.getBoundingClientRect();
    setPosition({
      x: rect ? rect.left + rect.width / 2 : event?.clientX || 0,
      y: rect ? rect.bottom : event?.clientY || 0,
    });

    setLoading(true);
    setIsOpen(true);

    try {
      // Fetch muscle details from API
      const response = await fetch(`/api/muscles/${data.muscleId}`);
      if (response.ok) {
        const result = await response.json();
        setMuscleData({
          ...data,
          ...result.data,
        });
      } else {
        setMuscleData(data);
      }
    } catch (error) {
      console.error('Failed to fetch muscle details:', error);
      setMuscleData(data);
    } finally {
      setLoading(false);
    }
  };

  const closeDetail = () => {
    setIsOpen(false);
    setMuscleData(null);
  };

  return {
    isOpen,
    muscleData,
    position,
    loading,
    openDetail,
    closeDetail,
  };
}

/**
 * MuscleDetailSheet - Mobile-friendly bottom sheet variant
 */
export const MuscleDetailSheet = ({
  isOpen,
  onClose,
  muscleId,
  muscleName,
  muscleGroup,
  activation,
  exercises,
  onExerciseClick,
}) => {
  if (!isOpen) return null;

  const groupColor = MUSCLE_GROUP_COLORS[muscleGroup] || { color: '#64748B', glow: 'rgba(100, 116, 139, 0.5)' };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute bottom-0 left-0 right-0 bg-[var(--void-base)] rounded-t-2xl max-h-[70vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="flex justify-center py-2">
            <div className="w-10 h-1 rounded-full bg-[var(--glass-white-20)]" />
          </div>

          {/* Header */}
          <div className="px-4 pb-3 flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${groupColor.color}20` }}
            >
              <div
                className="w-6 h-6 rounded-full"
                style={{
                  backgroundColor: groupColor.color,
                  boxShadow: `0 0 16px ${groupColor.glow}`,
                }}
              />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                {muscleName || formatMuscleName(muscleId)}
              </h2>
              <p className="text-sm text-[var(--text-tertiary)]">
                {muscleGroup} • {activation}% activated
              </p>
            </div>
          </div>

          {/* Exercises */}
          <div className="px-4 pb-safe overflow-y-auto max-h-[50vh]">
            <h3 className="text-xs font-medium text-[var(--text-tertiary)] uppercase mb-2">
              Exercises
            </h3>
            <div className="space-y-2 pb-4">
              {exercises.map((exercise) => (
                <button
                  key={exercise.id}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-[var(--glass-white-5)] active:bg-[var(--glass-white-10)] transition-colors text-left"
                  onClick={() => onExerciseClick?.(exercise)}
                >
                  <div className="w-12 h-12 rounded-lg bg-[var(--glass-white-5)] overflow-hidden">
                    {exercise.illustrationUrl && (
                      <img
                        src={exercise.illustrationUrl}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[var(--text-primary)]">
                      {exercise.name}
                    </p>
                    <p className="text-sm text-[var(--text-tertiary)]">
                      {exercise.activation}% activation
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-[var(--text-quaternary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MuscleDetailPopover;
