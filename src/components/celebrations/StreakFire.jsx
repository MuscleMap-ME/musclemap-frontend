/**
 * StreakFire Component
 *
 * CSS-based fire/flame animation for streak celebrations.
 * Uses gradients and CSS animations for performant flame effects.
 *
 * @example
 * // Basic usage
 * <StreakFire streakCount={7} active />
 *
 * // With intensity control
 * <StreakFire streakCount={30} active intensity="high" />
 */

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import { useReducedMotion } from '../glass/ButtonEffects';

// ============================================
// INTENSITY CONFIGURATIONS
// ============================================

const INTENSITY_CONFIG = {
  low: {
    flameScale: 0.8,
    innerOpacity: 0.6,
    outerOpacity: 0.4,
    emberCount: 3,
    animationSpeed: 1.5,
    glowIntensity: 0.3,
    colors: {
      outer: ['#f97316', '#ea580c', '#dc2626'],
      inner: ['#fbbf24', '#f59e0b', '#f97316'],
      glow: 'rgba(251, 146, 60, 0.3)',
    },
  },
  medium: {
    flameScale: 1.0,
    innerOpacity: 0.8,
    outerOpacity: 0.6,
    emberCount: 5,
    animationSpeed: 1.2,
    glowIntensity: 0.5,
    colors: {
      outer: ['#ef4444', '#dc2626', '#b91c1c'],
      inner: ['#fdba74', '#fb923c', '#f97316'],
      glow: 'rgba(239, 68, 68, 0.4)',
    },
  },
  high: {
    flameScale: 1.2,
    innerOpacity: 1.0,
    outerOpacity: 0.8,
    emberCount: 8,
    animationSpeed: 0.8,
    glowIntensity: 0.7,
    colors: {
      outer: ['#dc2626', '#ef4444', '#f97316'],
      inner: ['#fef08a', '#fde68a', '#fbbf24'],
      glow: 'rgba(250, 204, 21, 0.5)',
    },
  },
};

// ============================================
// EMBER PARTICLE
// ============================================

function Ember({ delay, x, config }) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) return null;

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: 4,
        height: 4,
        left: `${x}%`,
        bottom: '50%',
        background: config.colors.inner[0],
        boxShadow: `0 0 6px ${config.colors.glow}`,
      }}
      initial={{ opacity: 0, y: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        y: [-10, -30, -60, -90],
        x: [(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 40],
      }}
      transition={{
        duration: 1.5 * config.animationSpeed,
        delay,
        repeat: Infinity,
        ease: 'easeOut',
      }}
    />
  );
}

Ember.propTypes = {
  delay: PropTypes.number.isRequired,
  x: PropTypes.number.isRequired,
  config: PropTypes.object.isRequired,
};

// ============================================
// MAIN COMPONENT
// ============================================

export function StreakFire({
  streakCount = 0,
  active = false,
  intensity = 'medium',
  className = '',
}) {
  const reducedMotion = useReducedMotion();
  const config = INTENSITY_CONFIG[intensity] || INTENSITY_CONFIG.medium;

  // Generate embers
  const embers = useMemo(() => {
    return Array.from({ length: config.emberCount }).map((_, i) => ({
      delay: i * 0.3,
      x: 30 + Math.random() * 40,
    }));
  }, [config.emberCount]);

  // Calculate display based on streak
  const displayCount = streakCount > 0 ? streakCount : '';

  // Container variants
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 15,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.5,
      transition: { duration: 0.3 },
    },
  };

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className={`relative inline-flex flex-col items-center ${className}`}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="img"
          aria-label={`${streakCount} day streak`}
        >
          {/* Fire container */}
          <div
            className="relative"
            style={{
              width: 60 * config.flameScale,
              height: 80 * config.flameScale,
            }}
          >
            {/* Glow background */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(ellipse at 50% 100%, ${config.colors.glow} 0%, transparent 70%)`,
                filter: `blur(${8 * config.glowIntensity}px)`,
              }}
              animate={
                reducedMotion
                  ? {}
                  : {
                      opacity: [config.glowIntensity, config.glowIntensity * 1.5, config.glowIntensity],
                      scale: [1, 1.1, 1],
                    }
              }
              transition={{
                duration: 1.5 * config.animationSpeed,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Outer flame layer */}
            <motion.div
              className="absolute bottom-0 left-1/2 origin-bottom"
              style={{
                width: 40 * config.flameScale,
                height: 70 * config.flameScale,
                marginLeft: -20 * config.flameScale,
                background: `linear-gradient(to top, ${config.colors.outer.join(', ')})`,
                borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                opacity: config.outerOpacity,
                filter: 'blur(2px)',
              }}
              animate={
                reducedMotion
                  ? {}
                  : {
                      scaleY: [1, 1.1, 0.95, 1.05, 1],
                      scaleX: [1, 0.95, 1.05, 0.98, 1],
                      rotate: [-2, 2, -1, 1, 0],
                    }
              }
              transition={{
                duration: 0.6 * config.animationSpeed,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Middle flame layer */}
            <motion.div
              className="absolute bottom-0 left-1/2 origin-bottom"
              style={{
                width: 30 * config.flameScale,
                height: 55 * config.flameScale,
                marginLeft: -15 * config.flameScale,
                background: `linear-gradient(to top, ${config.colors.inner.slice(1).join(', ')})`,
                borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                opacity: config.innerOpacity * 0.8,
              }}
              animate={
                reducedMotion
                  ? {}
                  : {
                      scaleY: [1, 1.15, 0.9, 1.08, 1],
                      scaleX: [1, 0.92, 1.08, 0.95, 1],
                      y: [0, -2, 1, -1, 0],
                    }
              }
              transition={{
                duration: 0.5 * config.animationSpeed,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Inner flame (brightest) */}
            <motion.div
              className="absolute bottom-0 left-1/2 origin-bottom"
              style={{
                width: 18 * config.flameScale,
                height: 40 * config.flameScale,
                marginLeft: -9 * config.flameScale,
                background: `linear-gradient(to top, ${config.colors.inner.join(', ')})`,
                borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                opacity: config.innerOpacity,
                boxShadow: `0 0 20px ${config.colors.glow}, 0 0 40px ${config.colors.glow}`,
              }}
              animate={
                reducedMotion
                  ? {}
                  : {
                      scaleY: [1, 1.2, 0.85, 1.1, 1],
                      scaleX: [1, 0.88, 1.12, 0.92, 1],
                      y: [0, -3, 2, -1, 0],
                    }
              }
              transition={{
                duration: 0.4 * config.animationSpeed,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Floating embers */}
            {!reducedMotion && embers.map((ember, i) => (
              <Ember key={i} delay={ember.delay} x={ember.x} config={config} />
            ))}
          </div>

          {/* Streak count display inside flame base */}
          {displayCount && (
            <motion.div
              className="absolute bottom-0 left-1/2 flex items-center justify-center"
              style={{
                width: 36 * config.flameScale,
                height: 36 * config.flameScale,
                marginLeft: -18 * config.flameScale,
                marginBottom: 4,
              }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              <span
                className="font-black text-lg tabular-nums"
                style={{
                  color: '#fff',
                  textShadow: `0 0 8px ${config.colors.glow}, 0 2px 4px rgba(0,0,0,0.5)`,
                }}
              >
                {displayCount}
              </span>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

StreakFire.propTypes = {
  /** The current streak count */
  streakCount: PropTypes.number,
  /** Whether the fire animation is active */
  active: PropTypes.bool,
  /** Intensity level of the fire */
  intensity: PropTypes.oneOf(['low', 'medium', 'high']),
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default StreakFire;
