/**
 * ExerciseIllustration - Animated SVG exercise illustration with muscle highlighting
 *
 * Loads exercise SVGs and dynamically highlights muscles based on activation data.
 * Supports interactive mode where clicking muscles shows details.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  getActivationColor,
  ACTIVATION_COLORS,
  getExerciseIllustration,
} from '@musclemap/shared';

/**
 * ExerciseIllustration - Main component
 */
const ExerciseIllustration = ({
  exerciseId,
  illustrationUrl: providedUrl,
  muscleActivations = [], // Array of { muscleId, activation }
  size = 'md', // 'sm' | 'md' | 'lg' | 'full'
  interactive = false,
  onMuscleClick,
  showLabels = false,
  animate = true,
  className,
}) => {
  // Auto-resolve illustration URL from exerciseId if not provided
  const illustrationUrl = useMemo(() => {
    if (providedUrl) return providedUrl;
    if (!exerciseId) return null;
    const illustration = getExerciseIllustration(exerciseId);
    return illustration?.file || null;
  }, [providedUrl, exerciseId]);
  const [svgContent, setSvgContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredMuscle, setHoveredMuscle] = useState(null);
  const containerRef = useRef(null);

  // Size mapping
  const sizeMap = {
    sm: { width: 120, height: 180 },
    md: { width: 200, height: 300 },
    lg: { width: 300, height: 450 },
    full: { width: '100%', height: '100%' },
  };

  const dimensions = sizeMap[size] || sizeMap.md;

  // Load SVG content
  useEffect(() => {
    if (!illustrationUrl) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(illustrationUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load illustration');
        return res.text();
      })
      .then((svg) => {
        setSvgContent(svg);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load exercise illustration:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [illustrationUrl]);

  // Apply muscle highlighting after SVG is loaded
  useEffect(() => {
    if (!svgContent || !containerRef.current) return;

    const container = containerRef.current;
    const svgElement = container.querySelector('svg');
    if (!svgElement) return;

    // Reset all muscle elements first
    const muscleElements = svgElement.querySelectorAll('[data-muscle]');
    muscleElements.forEach((el) => {
      el.style.transition = 'fill 0.3s ease, opacity 0.3s ease';
      el.style.cursor = interactive ? 'pointer' : 'default';
    });

    // Apply activation colors
    muscleActivations.forEach(({ muscleId, illustrationIds, activation }) => {
      const idsToHighlight = illustrationIds || [muscleId];
      const color = getActivationColor(activation);

      idsToHighlight.forEach((id) => {
        // Try multiple selector patterns
        const selectors = [
          `[data-muscle="${id}"]`,
          `[data-muscle*="${id}"]`,
          `#muscle-${id}`,
          `#${id}`,
        ];

        selectors.forEach((selector) => {
          const elements = svgElement.querySelectorAll(selector);
          elements.forEach((el) => {
            el.style.fill = color;
            el.style.opacity = Math.max(0.6, activation / 100);

            if (interactive) {
              el.dataset.activation = activation;
              el.dataset.muscleId = muscleId;
            }
          });
        });
      });
    });

    // Add interactive handlers if enabled
    if (interactive) {
      muscleElements.forEach((el) => {
        el.addEventListener('mouseenter', handleMuscleHover);
        el.addEventListener('mouseleave', handleMuscleLeave);
        el.addEventListener('click', handleMuscleClickInternal);
      });

      return () => {
        muscleElements.forEach((el) => {
          el.removeEventListener('mouseenter', handleMuscleHover);
          el.removeEventListener('mouseleave', handleMuscleLeave);
          el.removeEventListener('click', handleMuscleClickInternal);
        });
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svgContent, muscleActivations, interactive]);

  const handleMuscleHover = useCallback((e) => {
    const muscleId = e.target.dataset.muscleId || e.target.dataset.muscle;
    const activation = e.target.dataset.activation;
    if (muscleId) {
      setHoveredMuscle({ id: muscleId, activation: parseFloat(activation) || 0 });
      e.target.style.filter = 'brightness(1.3) drop-shadow(0 0 8px currentColor)';
    }
  }, []);

  const handleMuscleLeave = useCallback((e) => {
    setHoveredMuscle(null);
    e.target.style.filter = '';
  }, []);

  const handleMuscleClickInternal = useCallback(
    (e) => {
      const muscleId = e.target.dataset.muscleId || e.target.dataset.muscle;
      const activation = e.target.dataset.activation;
      if (muscleId && onMuscleClick) {
        onMuscleClick({
          muscleId,
          activation: parseFloat(activation) || 0,
          element: e.target,
          event: e,
        });
      }
    },
    [onMuscleClick]
  );

  // Loading state
  if (loading) {
    return (
      <div
        className={clsx(
          'flex items-center justify-center bg-[var(--glass-white-5)] rounded-xl',
          className
        )}
        style={dimensions}
      >
        <motion.div
          className="w-8 h-8 border-2 border-[var(--brand-teal-400)] border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  // Error state
  if (error || !svgContent) {
    return (
      <div
        className={clsx(
          'flex flex-col items-center justify-center bg-[var(--glass-white-5)] rounded-xl text-[var(--text-tertiary)]',
          className
        )}
        style={dimensions}
      >
        <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-xs">No illustration</span>
      </div>
    );
  }

  return (
    <div className={clsx('relative', className)} style={dimensions}>
      {/* SVG Container */}
      <motion.div
        ref={containerRef}
        className="w-full h-full"
        initial={animate ? { opacity: 0, scale: 0.95 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
        style={{
          '--activation-max': ACTIVATION_COLORS.max,
          '--activation-high': ACTIVATION_COLORS.high,
          '--activation-med': ACTIVATION_COLORS.med,
          '--activation-low': ACTIVATION_COLORS.low,
          '--activation-min': ACTIVATION_COLORS.min,
        }}
      />

      {/* Hover tooltip */}
      <AnimatePresence>
        {interactive && hoveredMuscle && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-[var(--void-deep)] border border-[var(--border-subtle)] shadow-lg z-10"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getActivationColor(hoveredMuscle.activation) }}
              />
              <span className="text-xs font-medium text-[var(--text-primary)]">
                {formatMuscleName(hoveredMuscle.id)}
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">
                {Math.round(hoveredMuscle.activation)}%
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activation legend (optional) */}
      {showLabels && muscleActivations.length > 0 && (
        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
          {muscleActivations.slice(0, 4).map(({ muscleId, activation }) => (
            <span
              key={muscleId}
              className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[var(--glass-white-10)]"
              style={{ color: getActivationColor(activation) }}
            >
              {formatMuscleName(muscleId)} {Math.round(activation)}%
            </span>
          ))}
        </div>
      )}
    </div>
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
 * ExerciseIllustrationCard - Card wrapper with exercise info
 */
export const ExerciseIllustrationCard = ({
  exercise,
  muscleActivations,
  onClick,
  interactive: _interactive = true,
  className,
}) => {
  const [_showDetail, _setShowDetail] = useState(false);

  return (
    <motion.div
      className={clsx(
        'glass-surface rounded-xl overflow-hidden cursor-pointer group',
        className
      )}
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Illustration */}
      <div className="relative aspect-[2/3] overflow-hidden">
        <ExerciseIllustration
          exerciseId={exercise.id}
          illustrationUrl={exercise.illustration?.url}
          muscleActivations={muscleActivations}
          size="full"
          interactive={false}
          animate={false}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--void-base)] via-transparent to-transparent opacity-60" />

        {/* Exercise name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {exercise.name}
          </h4>
          {exercise.illustration?.primaryMuscles && (
            <p className="text-xs text-[var(--text-tertiary)] truncate">
              {exercise.illustration.primaryMuscles.slice(0, 2).map(formatMuscleName).join(', ')}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * ExerciseIllustrationModal - Full-screen illustration view
 */
export const ExerciseIllustrationModal = ({
  isOpen,
  onClose,
  exercise,
  muscleActivations,
  onMuscleClick,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--void-deep)]/90 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative max-w-lg w-full mx-4 bg-[var(--void-base)] rounded-2xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                {exercise?.name}
              </h3>
              <p className="text-sm text-[var(--text-tertiary)]">
                Click muscles for details
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--glass-white-5)] transition-colors"
            >
              <svg className="w-5 h-5 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Illustration */}
          <div className="p-4">
            <ExerciseIllustration
              exerciseId={exercise?.id}
              illustrationUrl={exercise?.illustration?.url}
              muscleActivations={muscleActivations}
              size="lg"
              interactive={true}
              onMuscleClick={onMuscleClick}
              showLabels={true}
              className="mx-auto"
            />
          </div>

          {/* Muscle activation list */}
          {muscleActivations?.length > 0 && (
            <div className="px-4 pb-4">
              <h4 className="text-xs font-medium text-[var(--text-tertiary)] uppercase mb-2">
                Muscle Activation
              </h4>
              <div className="space-y-1.5">
                {muscleActivations.map(({ muscleId, activation }) => (
                  <div key={muscleId} className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getActivationColor(activation) }}
                    />
                    <span className="text-sm text-[var(--text-secondary)] flex-1">
                      {formatMuscleName(muscleId)}
                    </span>
                    <span className="text-sm font-medium" style={{ color: getActivationColor(activation) }}>
                      {Math.round(activation)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ExerciseIllustration;
