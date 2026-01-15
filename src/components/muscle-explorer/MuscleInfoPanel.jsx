/**
 * MuscleInfoPanel - Side panel showing detailed muscle information
 *
 * Displays when a muscle is selected in the 3D explorer, showing
 * anatomy info, exercises, tips, and activation history.
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { getMuscleData, getAntagonist, getSynergists } from './muscleData';

/**
 * MuscleInfoPanel - Slide-in panel with muscle details
 *
 * @param {Object} props
 * @param {string} props.muscleId - The selected muscle ID
 * @param {Object} props.activationHistory - Recent activation data for mini chart
 * @param {Function} props.onClose - Called when panel should close
 * @param {Function} props.onViewExercises - Called when "View exercises" is clicked
 * @param {string} props.className - Additional CSS classes
 */
const MuscleInfoPanel = ({
  muscleId,
  activationHistory = [],
  onClose,
  onViewExercises,
  className,
}) => {
  const muscleData = useMemo(() => getMuscleData(muscleId), [muscleId]);
  const antagonist = useMemo(() => getAntagonist(muscleId), [muscleId]);
  const synergists = useMemo(() => getSynergists(muscleId), [muscleId]);

  if (!muscleData) return null;

  return (
    <AnimatePresence mode="wait">
      {muscleId && (
        <motion.div
          key={muscleId}
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
          }}
          className={clsx(
            'absolute right-0 top-0 bottom-0 w-80 max-w-full',
            'flex flex-col',
            'bg-[var(--glass-white-8)]',
            'backdrop-blur-xl',
            'border-l border-[var(--border-medium)]',
            'shadow-xl',
            'z-20',
            className
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-[var(--border-subtle)]">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <MuscleColorDot color={muscleData.color} />
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {muscleData.commonName}
                </h3>
              </div>
              <p className="text-xs text-[var(--text-tertiary)] italic">
                {muscleData.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className={clsx(
                'p-1.5 rounded-lg',
                'text-[var(--text-tertiary)]',
                'hover:text-[var(--text-primary)]',
                'hover:bg-[var(--glass-white-10)]',
                'transition-colors'
              )}
              aria-label="Close panel"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Description */}
            <section className="p-4 border-b border-[var(--border-subtle)]">
              <SectionHeader icon={<AnatomyIcon />} title="Anatomy" />
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {muscleData.description}
              </p>
            </section>

            {/* Activation History Chart */}
            {activationHistory.length > 0 && (
              <section className="p-4 border-b border-[var(--border-subtle)]">
                <SectionHeader icon={<ChartIcon />} title="Recent Activity" />
                <ActivationMiniChart
                  data={activationHistory}
                  color={muscleData.color}
                />
              </section>
            )}

            {/* Recommended Exercises */}
            <section className="p-4 border-b border-[var(--border-subtle)]">
              <SectionHeader icon={<ExerciseIcon />} title="Exercises" />
              <div className="grid grid-cols-2 gap-2">
                {muscleData.exercises.slice(0, 6).map((exercise) => (
                  <ExerciseTag key={exercise} name={exercise} />
                ))}
              </div>
              {onViewExercises && (
                <button
                  onClick={() => onViewExercises(muscleId)}
                  className={clsx(
                    'mt-3 w-full py-2 px-3 rounded-lg',
                    'text-sm font-medium',
                    'bg-[var(--glass-brand-light)]',
                    'text-[var(--brand-blue-400)]',
                    'border border-[var(--border-brand-glow)]',
                    'hover:bg-[var(--glass-brand-medium)]',
                    'transition-colors'
                  )}
                >
                  View all exercises
                </button>
              )}
            </section>

            {/* Tips */}
            <section className="p-4 border-b border-[var(--border-subtle)]">
              <SectionHeader icon={<TipIcon />} title="Training Tips" />
              <ul className="space-y-2">
                {muscleData.tips.map((tip, index) => (
                  <TipItem key={index} tip={tip} index={index} />
                ))}
              </ul>
            </section>

            {/* Related Muscles */}
            <section className="p-4">
              <SectionHeader icon={<ConnectionIcon />} title="Related Muscles" />

              {antagonist && (
                <div className="mb-3">
                  <p className="text-xs text-[var(--text-quaternary)] mb-1">
                    Antagonist (opposite)
                  </p>
                  <RelatedMuscleTag
                    muscle={antagonist}
                    type="antagonist"
                  />
                </div>
              )}

              {synergists.length > 0 && (
                <div>
                  <p className="text-xs text-[var(--text-quaternary)] mb-1">
                    Synergists (work together)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {synergists.map((m) => (
                      <RelatedMuscleTag
                        key={m.id}
                        muscle={m}
                        type="synergist"
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Section header with icon
 */
const SectionHeader = ({ icon, title }) => (
  <div className="flex items-center gap-2 mb-3">
    <span className="text-[var(--text-quaternary)]">{icon}</span>
    <h4 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
      {title}
    </h4>
  </div>
);

/**
 * Colored dot indicating muscle group
 */
const MuscleColorDot = ({ color }) => (
  <motion.div
    className="w-3 h-3 rounded-full"
    style={{
      backgroundColor: color,
      boxShadow: `0 0 8px ${color}`,
    }}
    animate={{
      scale: [1, 1.2, 1],
      opacity: [0.8, 1, 0.8],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  />
);

/**
 * Exercise tag button
 */
const ExerciseTag = ({ name }) => (
  <motion.button
    className={clsx(
      'px-2 py-1.5 rounded-md',
      'text-xs font-medium text-left',
      'bg-[var(--glass-white-5)]',
      'text-[var(--text-secondary)]',
      'border border-[var(--border-subtle)]',
      'hover:bg-[var(--glass-white-10)]',
      'hover:border-[var(--border-medium)]',
      'transition-colors'
    )}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    {name}
  </motion.button>
);

/**
 * Training tip item
 */
const TipItem = ({ tip, index }) => (
  <motion.li
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.05 }}
    className="flex items-start gap-2"
  >
    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--brand-blue-400)] flex-shrink-0" />
    <span className="text-sm text-[var(--text-secondary)]">{tip}</span>
  </motion.li>
);

/**
 * Related muscle tag
 */
const RelatedMuscleTag = ({ muscle, type }) => (
  <div
    className={clsx(
      'inline-flex items-center gap-1.5 px-2 py-1 rounded-full',
      'text-xs font-medium',
      type === 'antagonist'
        ? 'bg-[var(--glass-pulse-light)] border border-[var(--border-pulse-glow)]'
        : 'bg-[var(--glass-white-5)] border border-[var(--border-subtle)]'
    )}
    style={{
      color: muscle.color,
    }}
  >
    <span
      className="w-2 h-2 rounded-full"
      style={{ backgroundColor: muscle.color }}
    />
    {muscle.commonName}
  </div>
);

/**
 * Mini chart showing activation history
 */
const ActivationMiniChart = ({ data, color }) => {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const _width = 100 / data.length;

  return (
    <div className="h-16 flex items-end gap-0.5 bg-[var(--glass-white-3)] rounded-lg p-2">
      {data.map((point, index) => {
        const height = (point.value / maxValue) * 100;
        return (
          <motion.div
            key={index}
            className="flex-1 rounded-t-sm"
            style={{
              backgroundColor: color,
              opacity: 0.4 + (point.value / maxValue) * 0.6,
            }}
            initial={{ height: 0 }}
            animate={{ height: `${height}%` }}
            transition={{
              delay: index * 0.03,
              type: 'spring',
              stiffness: 200,
              damping: 20,
            }}
            title={`${point.label}: ${point.value}%`}
          />
        );
      })}
    </div>
  );
};

// ============================================
// ICONS
// ============================================

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const AnatomyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const ExerciseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7" />
  </svg>
);

const TipIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const ConnectionIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

export default MuscleInfoPanel;
