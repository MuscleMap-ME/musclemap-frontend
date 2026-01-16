/**
 * MuscleInfo - Slide-in panel displaying muscle details
 *
 * Shows selected muscle information including:
 * - Muscle name and description
 * - Recent activation history
 * - Recommended exercises
 * - Related achievements
 * - Quick actions (add to workout)
 *
 * @module MuscleInfo
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  X,
  Dumbbell,
  TrendingUp,
  Target,
  Zap,
  ChevronRight,
  Info,
  Trophy,
  Lightbulb,
  Plus,
} from 'lucide-react';
import { MUSCLE_DATA, getAntagonist, getSynergists, getActivationColor } from './muscleData';
import { useMotionAllowed } from '../../hooks/useReducedMotion';
import MuscleHistory from './MuscleHistory';

// ============================================
// CONSTANTS
// ============================================

const PANEL_WIDTH = 380;

const ANIMATION_VARIANTS = {
  panel: {
    hidden: { x: PANEL_WIDTH, opacity: 0 },
    visible: { x: 0, opacity: 1 },
    exit: { x: PANEL_WIDTH, opacity: 0 },
  },
  content: {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  },
};

// ============================================
// EXERCISE CARD COMPONENT
// ============================================

/**
 * ExerciseCard - Clickable exercise recommendation card
 */
const ExerciseCard = React.memo(({ exercise, muscleColor, onExerciseClick }) => (
  <motion.button
    onClick={() => onExerciseClick?.(exercise)}
    className={clsx(
      'w-full flex items-center gap-3 p-3 rounded-lg',
      'bg-[var(--glass-white-5,rgba(255,255,255,0.05))]',
      'border border-[var(--border-subtle,#1e293b)]',
      'hover:bg-[var(--glass-white-10,rgba(255,255,255,0.1))]',
      'hover:border-[var(--border-default,#334155)]',
      'transition-all duration-200 text-left group'
    )}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <div
      className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
      style={{ backgroundColor: `${muscleColor}20` }}
    >
      <Dumbbell
        className="w-5 h-5"
        style={{ color: muscleColor }}
      />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-[var(--text-primary,#f1f5f9)] truncate">
        {exercise}
      </p>
      <p className="text-xs text-[var(--text-tertiary,#94a3b8)]">
        Tap to learn more
      </p>
    </div>
    <ChevronRight
      className="w-4 h-4 text-[var(--text-quaternary,#64748b)]
                 group-hover:text-[var(--text-tertiary,#94a3b8)]
                 group-hover:translate-x-1 transition-all"
    />
  </motion.button>
));

ExerciseCard.displayName = 'ExerciseCard';

// ============================================
// TIP CARD COMPONENT
// ============================================

/**
 * TipCard - Training tip display card
 */
const TipCard = React.memo(({ tip, index }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.1 * index }}
    className="flex items-start gap-2 p-2"
  >
    <Lightbulb className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
    <p className="text-xs text-[var(--text-secondary,#cbd5e1)]">{tip}</p>
  </motion.div>
));

TipCard.displayName = 'TipCard';

// ============================================
// RELATED MUSCLE BADGE COMPONENT
// ============================================

/**
 * RelatedMuscleBadge - Shows related muscle (antagonist/synergist)
 */
const RelatedMuscleBadge = React.memo(({ muscle, type, onClick }) => (
  <button
    onClick={() => onClick?.(muscle.id)}
    className={clsx(
      'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
      'transition-all duration-200',
      type === 'antagonist'
        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
        : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
    )}
  >
    <span
      className="w-2 h-2 rounded-full"
      style={{ backgroundColor: muscle.color }}
    />
    {muscle.commonName}
  </button>
));

RelatedMuscleBadge.displayName = 'RelatedMuscleBadge';

// ============================================
// MAIN MUSCLE INFO COMPONENT
// ============================================

/**
 * MuscleInfo - Slide-in panel for muscle details
 *
 * @param {Object} props
 * @param {string|null} props.muscleId - Selected muscle ID
 * @param {Object} props.activationHistory - Map of dates to activation levels
 * @param {Function} props.onClose - Callback to close panel
 * @param {Function} props.onExerciseClick - Callback when exercise is clicked
 * @param {Function} props.onMuscleClick - Callback when related muscle is clicked
 * @param {Function} props.onAddToWorkout - Callback to add exercise to workout
 * @param {string} props.className - Additional CSS classes
 */
const MuscleInfo = ({
  muscleId,
  activationHistory = {},
  onClose,
  onExerciseClick,
  onMuscleClick,
  onAddToWorkout,
  className,
}) => {
  const motionAllowed = useMotionAllowed();
  const muscle = muscleId ? MUSCLE_DATA[muscleId] : null;

  // Get related muscles
  const antagonist = useMemo(() => {
    if (!muscleId) return null;
    return getAntagonist(muscleId);
  }, [muscleId]);

  const synergists = useMemo(() => {
    if (!muscleId) return [];
    return getSynergists(muscleId);
  }, [muscleId]);

  // Calculate current activation
  const currentActivation = useMemo(() => {
    if (!muscleId || !activationHistory[muscleId]) return 0;
    const today = new Date().toISOString().split('T')[0];
    return activationHistory[muscleId][today] || 0;
  }, [muscleId, activationHistory]);

  // Animation settings based on motion preference
  const transition = motionAllowed
    ? { type: 'spring', damping: 25, stiffness: 300 }
    : { duration: 0 };

  return (
    <AnimatePresence mode="wait">
      {muscle && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionAllowed ? 0.2 : 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />

          {/* Slide-in panel */}
          <motion.div
            variants={ANIMATION_VARIANTS.panel}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={transition}
            className={clsx(
              'absolute right-0 top-0 bottom-0 z-50',
              'w-full max-w-[380px]',
              'bg-[var(--void-deep,#0f172a)]',
              'border-l border-[var(--border-subtle,#1e293b)]',
              'shadow-2xl shadow-black/50',
              'flex flex-col',
              className
            )}
          >
            {/* Header */}
            <div
              className="flex-shrink-0 p-4 border-b border-[var(--border-subtle,#1e293b)]"
              style={{
                background: `linear-gradient(135deg, ${muscle.color}15 0%, transparent 50%)`,
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${muscle.color}20` }}
                  >
                    <Target
                      className="w-6 h-6"
                      style={{ color: muscle.color }}
                    />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary,#f1f5f9)]">
                      {muscle.commonName}
                    </h2>
                    <p className="text-xs text-[var(--text-tertiary,#94a3b8)]">
                      {muscle.name}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className={clsx(
                    'p-2 rounded-lg',
                    'hover:bg-[var(--glass-white-10,rgba(255,255,255,0.1))]',
                    'text-[var(--text-tertiary,#94a3b8)]',
                    'hover:text-[var(--text-primary,#f1f5f9)]',
                    'transition-colors'
                  )}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Current activation indicator */}
              {currentActivation > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <Zap
                    className="w-4 h-4"
                    style={{ color: getActivationColor(currentActivation) }}
                  />
                  <div className="flex-1">
                    <div className="h-1.5 bg-[var(--glass-white-5,rgba(255,255,255,0.05))] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: getActivationColor(currentActivation) }}
                        initial={{ width: 0 }}
                        animate={{ width: `${currentActivation}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-medium text-[var(--text-secondary,#cbd5e1)]">
                    {Math.round(currentActivation)}%
                  </span>
                </div>
              )}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* Description */}
              <motion.div
                variants={ANIMATION_VARIANTS.content}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.1 }}
                className="p-4 border-b border-[var(--border-subtle,#1e293b)]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-[var(--text-tertiary,#94a3b8)]" />
                  <h3 className="text-sm font-medium text-[var(--text-secondary,#cbd5e1)]">
                    About
                  </h3>
                </div>
                <p className="text-sm text-[var(--text-tertiary,#94a3b8)] leading-relaxed">
                  {muscle.description}
                </p>
              </motion.div>

              {/* Activation history chart */}
              <motion.div
                variants={ANIMATION_VARIANTS.content}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.15 }}
                className="p-4 border-b border-[var(--border-subtle,#1e293b)]"
              >
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-[var(--text-tertiary,#94a3b8)]" />
                  <h3 className="text-sm font-medium text-[var(--text-secondary,#cbd5e1)]">
                    7-Day Activity
                  </h3>
                </div>
                <MuscleHistory
                  muscleId={muscleId}
                  history={activationHistory[muscleId] || {}}
                  muscleColor={muscle.color}
                />
              </motion.div>

              {/* Recommended exercises */}
              <motion.div
                variants={ANIMATION_VARIANTS.content}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.2 }}
                className="p-4 border-b border-[var(--border-subtle,#1e293b)]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-[var(--text-tertiary,#94a3b8)]" />
                    <h3 className="text-sm font-medium text-[var(--text-secondary,#cbd5e1)]">
                      Top Exercises
                    </h3>
                  </div>
                  <span className="text-xs text-[var(--text-quaternary,#64748b)]">
                    {muscle.exercises.length} exercises
                  </span>
                </div>
                <div className="space-y-2">
                  {muscle.exercises.slice(0, 4).map((exercise, _index) => (
                    <ExerciseCard
                      key={exercise}
                      exercise={exercise}
                      muscleColor={muscle.color}
                      onExerciseClick={onExerciseClick}
                    />
                  ))}
                </div>
                {muscle.exercises.length > 4 && (
                  <button
                    className={clsx(
                      'w-full mt-2 py-2 text-xs font-medium',
                      'text-[var(--brand-teal-400,#2dd4bf)]',
                      'hover:text-[var(--brand-teal-300,#5eead4)]',
                      'transition-colors'
                    )}
                    onClick={() => onExerciseClick?.('all')}
                  >
                    View all {muscle.exercises.length} exercises
                  </button>
                )}
              </motion.div>

              {/* Training tips */}
              <motion.div
                variants={ANIMATION_VARIANTS.content}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.25 }}
                className="p-4 border-b border-[var(--border-subtle,#1e293b)]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                  <h3 className="text-sm font-medium text-[var(--text-secondary,#cbd5e1)]">
                    Training Tips
                  </h3>
                </div>
                <div className="space-y-1">
                  {muscle.tips.map((tip, index) => (
                    <TipCard key={index} tip={tip} index={index} />
                  ))}
                </div>
              </motion.div>

              {/* Related muscles */}
              {(antagonist || synergists.length > 0) && (
                <motion.div
                  variants={ANIMATION_VARIANTS.content}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.3 }}
                  className="p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-4 h-4 text-[var(--text-tertiary,#94a3b8)]" />
                    <h3 className="text-sm font-medium text-[var(--text-secondary,#cbd5e1)]">
                      Related Muscles
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {antagonist && (
                      <RelatedMuscleBadge
                        muscle={antagonist}
                        type="antagonist"
                        onClick={onMuscleClick}
                      />
                    )}
                    {synergists.map((synergist) => (
                      <RelatedMuscleBadge
                        key={synergist.id}
                        muscle={synergist}
                        type="synergist"
                        onClick={onMuscleClick}
                      />
                    ))}
                  </div>
                  {antagonist && (
                    <p className="mt-2 text-xs text-[var(--text-quaternary,#64748b)]">
                      <span className="text-red-400">Red</span> = antagonist,{' '}
                      <span className="text-blue-400">Blue</span> = synergist
                    </p>
                  )}
                </motion.div>
              )}
            </div>

            {/* Footer with quick action */}
            <div className="flex-shrink-0 p-4 border-t border-[var(--border-subtle,#1e293b)]">
              <button
                onClick={() => onAddToWorkout?.(muscle)}
                className={clsx(
                  'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl',
                  'font-medium text-sm',
                  'text-[var(--void-deep,#0f172a)]',
                  'transition-all duration-200',
                  'hover:brightness-110 active:scale-[0.98]'
                )}
                style={{
                  background: `linear-gradient(135deg, ${muscle.color} 0%, ${muscle.glowColor} 100%)`,
                }}
              >
                <Plus className="w-4 h-4" />
                Add {muscle.commonName} Workout
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

MuscleInfo.displayName = 'MuscleInfo';

export default MuscleInfo;
