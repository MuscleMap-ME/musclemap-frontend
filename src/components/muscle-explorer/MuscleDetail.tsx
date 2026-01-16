/**
 * MuscleDetail - Slide-in detail panel for selected muscle
 *
 * Shows comprehensive information about a selected muscle:
 * - Muscle name and anatomy image
 * - Recent activation history (mini chart)
 * - Top exercises for this muscle
 * - Last trained date
 * - Personal records for this muscle
 * - Related muscles (synergists)
 *
 * Action buttons:
 * - "Find exercises" - links to exercise library filtered
 * - "View history" - links to stats for this muscle
 * - Close button
 *
 * @module MuscleDetail
 */

import React, { useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  X,
  Dumbbell,
  Search,
  TrendingUp,
  Trophy,
  ChevronRight,
  ExternalLink,
  Zap,
  Target,
  Info,
  History,
  Star,
} from 'lucide-react';
import { MUSCLE_DATA, getAntagonist, getSynergists, getActivationColor } from './muscleData';
import MuscleHistory from './MuscleHistory';
import { useMotionAllowed } from '../../hooks/useReducedMotion';

// ============================================
// CONSTANTS
// ============================================

const PANEL_WIDTH = 400;

const ANIMATION_VARIANTS = {
  overlay: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  },
  panel: {
    hidden: { x: PANEL_WIDTH, opacity: 0 },
    visible: { x: 0, opacity: 1 },
    exit: { x: PANEL_WIDTH, opacity: 0 },
  },
  item: {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  },
};

// ============================================
// SECTION HEADER COMPONENT
// ============================================

const SectionHeader = React.memo(({ icon: Icon, title, count }) => (
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-[var(--text-quaternary,#64748b)]" />
      <h4 className="text-sm font-medium text-[var(--text-secondary,#cbd5e1)]">
        {title}
      </h4>
    </div>
    {count !== undefined && (
      <span className="text-xs text-[var(--text-quaternary,#64748b)]">
        {count} total
      </span>
    )}
  </div>
));

SectionHeader.displayName = 'SectionHeader';

// ============================================
// EXERCISE CARD COMPONENT
// ============================================

const ExerciseCard = React.memo(({ exercise, muscleColor, onClick, index }) => {
  const motionAllowed = useMotionAllowed();

  return (
    <motion.button
      onClick={() => onClick?.(exercise)}
      variants={ANIMATION_VARIANTS.item}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.05 }}
      className={clsx(
        'w-full flex items-center gap-3 p-3 rounded-lg',
        'bg-[var(--glass-white-5,rgba(255,255,255,0.05))]',
        'border border-[var(--border-subtle,#1e293b)]',
        'hover:bg-[var(--glass-white-10,rgba(255,255,255,0.1))]',
        'hover:border-[var(--border-default,#334155)]',
        'transition-all duration-200 text-left group'
      )}
      whileHover={motionAllowed ? { scale: 1.02, x: 4 } : undefined}
      whileTap={{ scale: 0.98 }}
    >
      <div
        className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${muscleColor}20` }}
      >
        <Dumbbell className="w-5 h-5" style={{ color: muscleColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary,#f1f5f9)] truncate">
          {exercise}
        </p>
        <p className="text-xs text-[var(--text-quaternary,#64748b)]">
          Click to view details
        </p>
      </div>
      <ChevronRight
        className={clsx(
          'w-4 h-4 text-[var(--text-quaternary,#64748b)]',
          'group-hover:text-[var(--text-tertiary,#94a3b8)]',
          'group-hover:translate-x-1 transition-all'
        )}
      />
    </motion.button>
  );
});

ExerciseCard.displayName = 'ExerciseCard';

// ============================================
// PERSONAL RECORD CARD COMPONENT
// ============================================

const PersonalRecordCard = React.memo(({ record, muscleColor }) => (
  <div
    className={clsx(
      'flex items-center gap-3 p-3 rounded-lg',
      'bg-[var(--glass-white-5,rgba(255,255,255,0.05))]',
      'border border-[var(--border-subtle,#1e293b)]'
    )}
  >
    <div
      className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
      style={{ backgroundColor: `${muscleColor}20` }}
    >
      <Trophy className="w-5 h-5" style={{ color: muscleColor }} />
    </div>
    <div className="flex-1">
      <p className="text-xs text-[var(--text-quaternary,#64748b)]">
        {record.exercise}
      </p>
      <p className="text-sm font-bold text-[var(--text-primary,#f1f5f9)]">
        {record.weight} lbs x {record.reps}
      </p>
    </div>
    <div className="text-right">
      <p className="text-xs text-[var(--text-quaternary,#64748b)]">
        {new Date(record.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })}
      </p>
    </div>
  </div>
));

PersonalRecordCard.displayName = 'PersonalRecordCard';

// ============================================
// RELATED MUSCLE BADGE COMPONENT
// ============================================

const RelatedMuscleBadge = React.memo(({ muscle, type, onClick }) => (
  <button
    onClick={() => onClick?.(muscle.id)}
    className={clsx(
      'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
      'transition-all duration-200',
      type === 'antagonist'
        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
        : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20'
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
// MAIN MUSCLE DETAIL COMPONENT
// ============================================

/**
 * MuscleDetail - Comprehensive detail panel for selected muscle
 *
 * @param {Object} props
 * @param {string|null} props.muscleId - Selected muscle ID
 * @param {Object} props.activationHistory - Map of dates to activation levels
 * @param {Object} props.stats - Muscle stats (timesTrained, totalVolume, lastTrained)
 * @param {Array} props.personalRecords - Array of PR objects
 * @param {Function} props.onClose - Callback to close panel
 * @param {Function} props.onFindExercises - Callback when "Find exercises" is clicked
 * @param {Function} props.onViewHistory - Callback when "View history" is clicked
 * @param {Function} props.onExerciseClick - Callback when exercise card is clicked
 * @param {Function} props.onMuscleClick - Callback when related muscle is clicked
 * @param {string} props.className - Additional CSS classes
 */
const MuscleDetail = ({
  muscleId,
  activationHistory = {},
  stats = {},
  personalRecords = [],
  onClose,
  onFindExercises,
  onViewHistory,
  onExerciseClick,
  onMuscleClick,
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

  // Current activation
  const currentActivation = useMemo(() => {
    if (!muscleId || !activationHistory[muscleId]) return 0;
    const today = new Date().toISOString().split('T')[0];
    return activationHistory[muscleId][today] || 0;
  }, [muscleId, activationHistory]);

  // History for this muscle
  const muscleHistory = useMemo(() => {
    return activationHistory[muscleId] || {};
  }, [muscleId, activationHistory]);

  // Animation transitions
  const transition = motionAllowed
    ? { type: 'spring', damping: 30, stiffness: 350 }
    : { duration: 0 };

  // Handle find exercises click
  const handleFindExercises = useCallback(() => {
    onFindExercises?.(muscleId);
  }, [muscleId, onFindExercises]);

  // Handle view history click
  const handleViewHistory = useCallback(() => {
    onViewHistory?.(muscleId);
  }, [muscleId, onViewHistory]);

  return (
    <AnimatePresence mode="wait">
      {muscle && (
        <>
          {/* Backdrop overlay (mobile only) */}
          <motion.div
            variants={ANIMATION_VARIANTS.overlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: motionAllowed ? 0.2 : 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
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
              'w-full max-w-[400px]',
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
                  {/* Muscle icon */}
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center relative"
                    style={{ backgroundColor: `${muscle.color}20` }}
                  >
                    <Target className="w-7 h-7" style={{ color: muscle.color }} />
                    {/* Pulsing glow */}
                    {motionAllowed && (
                      <motion.div
                        className="absolute inset-0 rounded-xl"
                        style={{ backgroundColor: muscle.color }}
                        animate={{
                          opacity: [0.1, 0.3, 0.1],
                          scale: [1, 1.1, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[var(--text-primary,#f1f5f9)]">
                      {muscle.commonName}
                    </h2>
                    <p className="text-xs text-[var(--text-tertiary,#94a3b8)] italic">
                      {muscle.name}
                    </p>
                    {stats.lastTrained && (
                      <p className="text-xs text-[var(--text-quaternary,#64748b)] mt-1">
                        Last trained: {new Date(stats.lastTrained).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Close button */}
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

              {/* Current activation bar */}
              {currentActivation > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1">
                      <Zap
                        className="w-3 h-3"
                        style={{ color: getActivationColor(currentActivation) }}
                      />
                      <span className="text-[var(--text-tertiary,#94a3b8)]">
                        Today&apos;s Activation
                      </span>
                    </div>
                    <span
                      className="font-medium"
                      style={{ color: getActivationColor(currentActivation) }}
                    >
                      {Math.round(currentActivation)}%
                    </span>
                  </div>
                  <div className="h-2 bg-[var(--glass-white-5,rgba(255,255,255,0.05))] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: getActivationColor(currentActivation) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${currentActivation}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* Anatomy description */}
              <motion.section
                variants={ANIMATION_VARIANTS.item}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.1 }}
                className="p-4 border-b border-[var(--border-subtle,#1e293b)]"
              >
                <SectionHeader icon={Info} title="Anatomy" />
                <p className="text-sm text-[var(--text-tertiary,#94a3b8)] leading-relaxed">
                  {muscle.description}
                </p>
              </motion.section>

              {/* 7-Day activation history */}
              <motion.section
                variants={ANIMATION_VARIANTS.item}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.15 }}
                className="p-4 border-b border-[var(--border-subtle,#1e293b)]"
              >
                <SectionHeader icon={TrendingUp} title="7-Day Activity" />
                <MuscleHistory
                  muscleId={muscleId}
                  history={muscleHistory}
                  muscleColor={muscle.color}
                />
              </motion.section>

              {/* Top exercises */}
              <motion.section
                variants={ANIMATION_VARIANTS.item}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.2 }}
                className="p-4 border-b border-[var(--border-subtle,#1e293b)]"
              >
                <SectionHeader
                  icon={Dumbbell}
                  title="Top Exercises"
                  count={muscle.exercises.length}
                />
                <div className="space-y-2">
                  {muscle.exercises.slice(0, 4).map((exercise, index) => (
                    <ExerciseCard
                      key={exercise}
                      exercise={exercise}
                      muscleColor={muscle.color}
                      onClick={onExerciseClick}
                      index={index}
                    />
                  ))}
                </div>
                {muscle.exercises.length > 4 && (
                  <button
                    onClick={handleFindExercises}
                    className={clsx(
                      'w-full mt-3 py-2 text-xs font-medium',
                      'text-[var(--brand-blue-400,#60a5fa)]',
                      'hover:text-[var(--brand-blue-300,#93c5fd)]',
                      'transition-colors flex items-center justify-center gap-1'
                    )}
                  >
                    View all {muscle.exercises.length} exercises
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </motion.section>

              {/* Personal records */}
              {personalRecords.length > 0 && (
                <motion.section
                  variants={ANIMATION_VARIANTS.item}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.25 }}
                  className="p-4 border-b border-[var(--border-subtle,#1e293b)]"
                >
                  <SectionHeader
                    icon={Star}
                    title="Personal Records"
                    count={personalRecords.length}
                  />
                  <div className="space-y-2">
                    {personalRecords.slice(0, 3).map((record, index) => (
                      <PersonalRecordCard
                        key={`${record.exercise}-${index}`}
                        record={record}
                        muscleColor={muscle.color}
                      />
                    ))}
                  </div>
                </motion.section>
              )}

              {/* Related muscles */}
              {(antagonist || synergists.length > 0) && (
                <motion.section
                  variants={ANIMATION_VARIANTS.item}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.3 }}
                  className="p-4"
                >
                  <SectionHeader icon={Target} title="Related Muscles" />
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
                  <p className="mt-3 text-xs text-[var(--text-quaternary,#64748b)]">
                    <span className="text-red-400">Red</span> = antagonist (opposite),{' '}
                    <span className="text-blue-400">Blue</span> = synergist (works together)
                  </p>
                </motion.section>
              )}
            </div>

            {/* Action buttons footer */}
            <div className="flex-shrink-0 p-4 border-t border-[var(--border-subtle,#1e293b)] bg-[var(--void-deep,#0f172a)]">
              <div className="flex gap-3">
                <button
                  onClick={handleFindExercises}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl',
                    'font-medium text-sm',
                    'bg-[var(--glass-white-10,rgba(255,255,255,0.1))]',
                    'border border-[var(--border-medium,#334155)]',
                    'text-[var(--text-primary,#f1f5f9)]',
                    'hover:bg-[var(--glass-white-15,rgba(255,255,255,0.15))]',
                    'transition-all duration-200'
                  )}
                >
                  <Search className="w-4 h-4" />
                  Find Exercises
                </button>
                <button
                  onClick={handleViewHistory}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl',
                    'font-medium text-sm',
                    'text-[var(--void-deep,#0f172a)]',
                    'hover:brightness-110',
                    'transition-all duration-200'
                  )}
                  style={{
                    background: `linear-gradient(135deg, ${muscle.color} 0%, ${muscle.glowColor} 100%)`,
                  }}
                >
                  <History className="w-4 h-4" />
                  View History
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

MuscleDetail.displayName = 'MuscleDetail';

export default MuscleDetail;
