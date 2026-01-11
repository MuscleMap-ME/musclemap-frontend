/**
 * BodyMuscleMap - Interactive body silhouette with muscle activation visualization
 *
 * Displays a 2D body illustration with clickable muscle regions showing
 * activation levels, workout history, and exercise recommendations.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  getActivationColor,
  getBodyIllustrationPath,
  ACTIVATION_COLORS,
  getMuscleIllustrationIds,
} from '@musclemap/shared';

/**
 * BodyMuscleMap - Main component
 */
const BodyMuscleMap = ({
  bodyType = 'male', // 'male' | 'female' | 'youth'
  muscleActivations = [], // Array of { muscleId, activation, tuEarned }
  onMuscleClick,
  interactive = true,
  showLegend = true,
  size = 'md', // 'sm' | 'md' | 'lg' | 'full'
  className,
}) => {
  const [currentView, setCurrentView] = useState('front'); // 'front' | 'back' | 'side'
  const [svgContent, setSvgContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredMuscle, setHoveredMuscle] = useState(null);
  const containerRef = useRef(null);

  // Size mapping
  const sizeMap = {
    sm: { width: 150, height: 280 },
    md: { width: 220, height: 400 },
    lg: { width: 320, height: 580 },
    full: { width: '100%', height: '100%' },
  };

  const dimensions = sizeMap[size] || sizeMap.md;

  // Load SVG based on current view
  useEffect(() => {
    const url = getBodyIllustrationPath(bodyType, currentView);
    setLoading(true);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load body illustration');
        return res.text();
      })
      .then((svg) => {
        setSvgContent(svg);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load body illustration:', err);
        setLoading(false);
      });
  }, [bodyType, currentView]);

  // Apply muscle highlighting
  useEffect(() => {
    if (!svgContent || !containerRef.current) return;

    const container = containerRef.current;
    const svgElement = container.querySelector('svg');
    if (!svgElement) return;

    // Get all muscle elements
    const muscleElements = svgElement.querySelectorAll('[data-muscle]');

    // Reset and prepare all muscle elements
    muscleElements.forEach((el) => {
      el.style.transition = 'fill 0.3s ease, opacity 0.3s ease, filter 0.2s ease';
      el.style.cursor = interactive ? 'pointer' : 'default';
      // Reset to base color
      el.style.fill = 'var(--muscle-inactive, #475569)';
      el.style.opacity = '0.3';
    });

    // Apply activation colors from data
    muscleActivations.forEach(({ muscleId, activation }) => {
      const illustrationIds = getMuscleIllustrationIds(muscleId);
      const color = getActivationColor(activation);

      illustrationIds.forEach((id) => {
        const selectors = [
          `[data-muscle="${id}"]`,
          `[data-muscle*="${id}"]`,
          `#muscle-${id}`,
        ];

        selectors.forEach((selector) => {
          const elements = svgElement.querySelectorAll(selector);
          elements.forEach((el) => {
            el.style.fill = color;
            el.style.opacity = Math.max(0.5, activation / 100).toString();
            el.dataset.activationLevel = activation.toString();
            el.dataset.dbMuscleId = muscleId;
          });
        });
      });
    });

    // Add interactive handlers
    if (interactive) {
      const handleMouseEnter = (e) => {
        const muscleId = e.target.dataset.dbMuscleId || e.target.dataset.muscle;
        const activation = parseFloat(e.target.dataset.activationLevel) || 0;
        if (muscleId) {
          setHoveredMuscle({ id: muscleId, activation });
          e.target.style.filter = 'brightness(1.3) drop-shadow(0 0 10px currentColor)';
        }
      };

      const handleMouseLeave = (e) => {
        setHoveredMuscle(null);
        e.target.style.filter = '';
      };

      const handleClick = (e) => {
        const muscleId = e.target.dataset.dbMuscleId || e.target.dataset.muscle;
        const activation = parseFloat(e.target.dataset.activationLevel) || 0;
        if (muscleId && onMuscleClick) {
          onMuscleClick({ muscleId, activation, element: e.target, event: e });
        }
      };

      muscleElements.forEach((el) => {
        el.addEventListener('mouseenter', handleMouseEnter);
        el.addEventListener('mouseleave', handleMouseLeave);
        el.addEventListener('click', handleClick);
      });

      return () => {
        muscleElements.forEach((el) => {
          el.removeEventListener('mouseenter', handleMouseEnter);
          el.removeEventListener('mouseleave', handleMouseLeave);
          el.removeEventListener('click', handleClick);
        });
      };
    }
  }, [svgContent, muscleActivations, interactive, onMuscleClick]);

  // View toggle buttons
  const ViewToggle = () => (
    <div className="flex gap-1 p-1 rounded-lg bg-[var(--glass-white-5)]">
      {['front', 'back', 'side'].map((view) => (
        <button
          key={view}
          onClick={() => setCurrentView(view)}
          className={clsx(
            'px-3 py-1 text-xs font-medium rounded-md transition-all',
            currentView === view
              ? 'bg-[var(--brand-teal-500)] text-white'
              : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-white-5)]'
          )}
        >
          {view.charAt(0).toUpperCase() + view.slice(1)}
        </button>
      ))}
    </div>
  );

  // Activation legend
  const ActivationLegend = () => (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-[var(--text-tertiary)]">Activation:</span>
      <div className="flex items-center gap-1">
        {Object.entries(ACTIVATION_COLORS).slice(0, 5).map(([level, color]) => (
          <div
            key={level}
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: color }}
            title={level}
          />
        ))}
      </div>
      <span className="text-[var(--text-quaternary)]">Low → High</span>
    </div>
  );

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

  return (
    <div className={clsx('flex flex-col', className)}>
      {/* Header with view toggle */}
      <div className="flex items-center justify-between mb-3">
        <ViewToggle />
        {showLegend && <ActivationLegend />}
      </div>

      {/* Body illustration */}
      <div className="relative" style={dimensions}>
        <motion.div
          ref={containerRef}
          className="w-full h-full"
          key={currentView}
          initial={{ opacity: 0, x: currentView === 'front' ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          dangerouslySetInnerHTML={{ __html: svgContent }}
          style={{
            '--muscle-inactive': '#475569',
            '--activation-max': ACTIVATION_COLORS.max,
            '--activation-high': ACTIVATION_COLORS.high,
            '--activation-med': ACTIVATION_COLORS.med,
            '--activation-low': ACTIVATION_COLORS.low,
            '--activation-min': ACTIVATION_COLORS.min,
          }}
        />

        {/* Hover tooltip */}
        <AnimatePresence>
          {hoveredMuscle && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg bg-[var(--void-deep)] border border-[var(--border-subtle)] shadow-lg z-10"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getActivationColor(hoveredMuscle.activation) }}
                />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {formatMuscleName(hoveredMuscle.id)}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {hoveredMuscle.activation > 0
                      ? `${Math.round(hoveredMuscle.activation)}% activation`
                      : 'Not worked recently'}
                  </p>
                </div>
              </div>
              {interactive && (
                <p className="text-[10px] text-[var(--text-quaternary)] mt-1">
                  Click for details
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Summary stats */}
      {muscleActivations.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-tertiary)]">
              {muscleActivations.length} muscle{muscleActivations.length !== 1 ? 's' : ''} activated
            </span>
            <span className="text-[var(--text-tertiary)]">
              Avg: {Math.round(muscleActivations.reduce((a, b) => a + b.activation, 0) / muscleActivations.length)}%
            </span>
          </div>
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
 * BodyMuscleMapCard - Card wrapper for dashboard integration
 */
export const BodyMuscleMapCard = ({
  title = "Today's Muscle Activation",
  muscleActivations,
  bodyType,
  onMuscleClick,
  className,
}) => {
  return (
    <div
      className={clsx(
        'glass-surface rounded-xl p-4',
        className
      )}
    >
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
        {title}
      </h3>
      <BodyMuscleMap
        bodyType={bodyType}
        muscleActivations={muscleActivations}
        onMuscleClick={onMuscleClick}
        interactive={true}
        showLegend={true}
        size="md"
      />
    </div>
  );
};

/**
 * MiniBodyMap - Compact version for exercise cards
 */
export const MiniBodyMap = ({
  muscleActivations,
  bodyType = 'male',
  view = 'front',
  size = 80,
  className,
}) => {
  const [svgContent, setSvgContent] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const url = getBodyIllustrationPath(bodyType, view);
    fetch(url)
      .then((res) => res.text())
      .then(setSvgContent)
      .catch(console.error);
  }, [bodyType, view]);

  useEffect(() => {
    if (!svgContent || !containerRef.current) return;

    const container = containerRef.current;
    const svgElement = container.querySelector('svg');
    if (!svgElement) return;

    // Apply highlighting
    muscleActivations.forEach(({ muscleId, activation }) => {
      const ids = getMuscleIllustrationIds(muscleId);
      const color = getActivationColor(activation);

      ids.forEach((id) => {
        const elements = svgElement.querySelectorAll(`[data-muscle*="${id}"]`);
        elements.forEach((el) => {
          el.style.fill = color;
          el.style.opacity = Math.max(0.5, activation / 100).toString();
        });
      });
    });
  }, [svgContent, muscleActivations]);

  if (!svgContent) {
    return (
      <div
        className={clsx('bg-[var(--glass-white-5)] rounded animate-pulse', className)}
        style={{ width: size, height: size * 1.5 }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={clsx('pointer-events-none', className)}
      style={{ width: size, height: size * 1.5 }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};

export default BodyMuscleMap;
