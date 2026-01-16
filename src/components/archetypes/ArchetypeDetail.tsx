/**
 * ArchetypeDetail - Full-screen detail view for archetype selection confirmation
 *
 * Tier 3 component that displays complete archetype information with premium
 * visual effects including parallax scrolling, glassmorphism, and animated gradients.
 */

import React, { useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import clsx from 'clsx';

/**
 * Default level names for archetypes without explicit levels
 */
const DEFAULT_LEVELS = [
  { level: 1, name: 'Novice' },
  { level: 2, name: 'Apprentice' },
  { level: 3, name: 'Practitioner' },
  { level: 4, name: 'Expert' },
  { level: 5, name: 'Master' },
];

/**
 * Animated gradient border component for CTA button
 */
function AnimatedGradientBorder({ color, children }) {
  return (
    <div className="relative group">
      {/* Animated gradient border */}
      <motion.div
        className="absolute -inset-0.5 rounded-2xl opacity-75 group-hover:opacity-100 transition-opacity"
        style={{
          background: color
            ? `linear-gradient(90deg, ${color}, ${color}88, ${color})`
            : 'linear-gradient(90deg, #0066FF, #00CCFF, #0066FF)',
          backgroundSize: '200% 100%',
        }}
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      {/* Inner content */}
      <div className="relative">{children}</div>
    </div>
  );
}

/**
 * Pulsing icon component with glow effect
 */
function AnimatedIcon({ icon, color }) {
  return (
    <motion.div
      className="relative flex items-center justify-center w-24 h-24 rounded-2xl bg-black/40 backdrop-blur-sm border border-white/20"
      animate={{
        scale: [1, 1.05, 1],
        boxShadow: [
          `0 0 20px ${color || '#0066FF'}40`,
          `0 0 40px ${color || '#0066FF'}60`,
          `0 0 20px ${color || '#0066FF'}40`,
        ],
      }}
      transition={{
        duration: 2.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <span className="text-5xl">{icon || '?'}</span>
      {/* Glow layer */}
      <div
        className="absolute inset-0 rounded-2xl opacity-50 blur-xl"
        style={{
          background: `radial-gradient(circle, ${color || '#0066FF'}40, transparent)`,
        }}
      />
    </motion.div>
  );
}

/**
 * Focus area pill badge component
 */
function FocusPill({ focus, color }) {
  return (
    <motion.span
      className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap"
      style={{
        backgroundColor: `${color || '#0066FF'}20`,
        border: `1px solid ${color || '#0066FF'}40`,
        color: color || '#0066FF',
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.05 }}
    >
      {focus}
    </motion.span>
  );
}

/**
 * Level preview item component
 */
function LevelPreviewItem({ level, name, isFirst, isLast, color }) {
  return (
    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: level * 0.1 }}
    >
      {/* Level indicator dot with connecting line */}
      <div className="relative flex flex-col items-center">
        <motion.div
          className="w-4 h-4 rounded-full border-2"
          style={{
            borderColor: color || '#0066FF',
            backgroundColor: isFirst ? (color || '#0066FF') : 'transparent',
          }}
          whileHover={{
            scale: 1.3,
            backgroundColor: color || '#0066FF',
          }}
        />
        {!isLast && (
          <div
            className="w-0.5 h-6 mt-1"
            style={{ backgroundColor: `${color || '#0066FF'}40` }}
          />
        )}
      </div>
      {/* Level info */}
      <div className="flex items-baseline gap-2 pb-4">
        <span className="text-xs text-gray-500">Lv.{level}</span>
        <span className="text-sm text-gray-300 font-medium">{name}</span>
      </div>
    </motion.div>
  );
}

/**
 * Loading spinner for confirm button
 */
function LoadingSpinner() {
  return (
    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * ArchetypeDetail Component
 *
 * Full-screen detail view for confirming archetype selection.
 */
const ArchetypeDetail = memo(function ArchetypeDetail({
  archetype,
  onConfirm,
  onBack,
  loading = false,
}) {
  const scrollContainerRef = useRef(null);
  const { scrollY } = useScroll({ container: scrollContainerRef });

  // Parallax effect for hero image
  const imageY = useTransform(scrollY, [0, 300], [0, 100]);
  const imageScale = useTransform(scrollY, [0, 300], [1, 1.1]);
  const overlayOpacity = useTransform(scrollY, [0, 200], [0.4, 0.8]);

  // Handle keyboard escape
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape' && !loading) {
        onBack?.();
      }
    },
    [loading, onBack]
  );

  // Set up keyboard listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Get archetype levels or use defaults
  const levels = archetype.levels || DEFAULT_LEVELS;
  const color = archetype.color || '#0066FF';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="fixed inset-0 z-50 flex flex-col bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="archetype-detail-title"
      >
        {/* Scrollable content container */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden"
        >
          {/* Hero image section with parallax */}
          <div className="relative h-[60vh] min-h-[300px] overflow-hidden">
            {archetype.imageUrl ? (
              <motion.img
                src={archetype.imageUrl}
                alt={archetype.name}
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  y: imageY,
                  scale: imageScale,
                }}
              />
            ) : (
              /* Fallback gradient background */
              <motion.div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${color}40, ${color}20, #000)`,
                  scale: imageScale,
                }}
              />
            )}

            {/* Gradient overlay for text readability */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"
              style={{ opacity: overlayOpacity }}
            />

            {/* Additional bottom gradient */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent" />

            {/* Back button */}
            <motion.button
              className={clsx(
                'absolute top-4 left-4 z-10',
                'flex items-center justify-center w-12 h-12',
                'rounded-full bg-black/40 backdrop-blur-md',
                'border border-white/20 text-white',
                'transition-colors hover:bg-white/10',
                'focus:outline-none focus:ring-2 focus:ring-white/50'
              )}
              onClick={onBack}
              disabled={loading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              aria-label="Go back"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </motion.button>
          </div>

          {/* Glassmorphism content card */}
          <motion.div
            className={clsx(
              'relative -mt-20 mx-4 mb-32',
              'rounded-3xl overflow-hidden',
              'bg-white/5 backdrop-blur-xl',
              'border border-white/10'
            )}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: 'spring', damping: 25 }}
          >
            {/* Subtle gradient shine */}
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                background: `linear-gradient(135deg, ${color}10, transparent 50%, ${color}05)`,
              }}
            />

            {/* Content */}
            <div className="relative p-6 sm:p-8">
              {/* Icon and name section */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
                <AnimatedIcon icon={archetype.icon} color={color} />

                <div className="flex-1 text-center sm:text-left">
                  <motion.h1
                    id="archetype-detail-title"
                    className="text-3xl sm:text-4xl font-bold text-white mb-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {archetype.name}
                  </motion.h1>

                  {/* Philosophy quote */}
                  {archetype.philosophy && (
                    <motion.p
                      className="text-gray-400 italic text-lg"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      &ldquo;{archetype.philosophy}&rdquo;
                    </motion.p>
                  )}
                </div>
              </div>

              {/* Description */}
              {archetype.description && (
                <motion.p
                  className="text-gray-300 text-base leading-relaxed mb-8"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  {archetype.description}
                </motion.p>
              )}

              {/* Focus areas */}
              {archetype.focusAreas && archetype.focusAreas.length > 0 && (
                <motion.div
                  className="mb-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Focus Areas
                  </h2>
                  <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                    {archetype.focusAreas.map((focus, index) => (
                      <FocusPill key={index} focus={focus} color={color} />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Level preview */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
              >
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Your Journey
                </h2>
                <div className="flex flex-col">
                  {levels.slice(0, 5).map((levelData, index) => (
                    <LevelPreviewItem
                      key={levelData.level || index + 1}
                      level={levelData.level || index + 1}
                      name={levelData.name}
                      isFirst={index === 0}
                      isLast={index === levels.slice(0, 5).length - 1}
                      color={color}
                    />
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Sticky footer with CTA */}
        <motion.div
          className={clsx(
            'fixed bottom-0 left-0 right-0',
            'p-4 sm:p-6',
            'bg-gradient-to-t from-black via-black/95 to-transparent'
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="max-w-lg mx-auto">
            <AnimatedGradientBorder color={color}>
              <motion.button
                className={clsx(
                  'w-full py-4 px-8',
                  'rounded-xl',
                  'text-white font-bold text-lg',
                  'transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'flex items-center justify-center gap-3'
                )}
                style={{
                  background: loading
                    ? `${color}80`
                    : `linear-gradient(135deg, ${color}, ${color}CC)`,
                  focusRingColor: color,
                }}
                onClick={onConfirm}
                disabled={loading}
                whileHover={loading ? {} : { scale: 1.02 }}
                whileTap={loading ? {} : { scale: 0.98 }}
              >
                {loading ? (
                  <>
                    <LoadingSpinner />
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <span>Start This Journey</span>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </>
                )}
              </motion.button>
            </AnimatedGradientBorder>

            {/* Keyboard hint */}
            <p className="text-center text-gray-600 text-xs mt-3">
              Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-400">Esc</kbd> to go back
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

export default ArchetypeDetail;
