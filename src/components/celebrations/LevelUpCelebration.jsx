/**
 * LevelUpCelebration Component
 *
 * Full-screen level up celebration with dramatic animations.
 * Features "LEVEL UP!" text, number counter animation, expanding rings,
 * and glow effects. Auto-dismisses after 3 seconds or on click.
 *
 * @example
 * <LevelUpCelebration level={5} isVisible={leveledUp} onComplete={() => setLeveledUp(false)} />
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import { useReducedMotion } from '../glass/ButtonEffects';

// ============================================
// SOUND EFFECT (placeholder for future audio)
// ============================================

function playLevelUpSound() {
  // Sound effect placeholder - integrate with audio system when available
  console.log('[Audio] Level up sound effect triggered');
  // Future implementation:
  // const audio = new Audio('/sounds/level-up.mp3');
  // audio.volume = 0.5;
  // audio.play().catch(() => {});
}

// ============================================
// ANIMATED COUNTER HOOK
// ============================================

function useAnimatedCounter(target, duration = 1000, start = false) {
  const [count, setCount] = useState(target > 1 ? target - 1 : 0);

  useEffect(() => {
    if (!start) {
      setCount(target > 1 ? target - 1 : 0);
      return;
    }

    const startValue = target > 1 ? target - 1 : 0;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function - ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      const current = Math.round(startValue + (target - startValue) * eased);
      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [target, duration, start]);

  return count;
}

// ============================================
// FLOATING PARTICLE
// ============================================

function FloatingParticle({ delay, duration }) {
  const randomX = Math.random() * 100;
  const randomSize = Math.random() * 4 + 2;

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: randomSize,
        height: randomSize,
        left: `${randomX}%`,
        background: 'linear-gradient(135deg, var(--brand-blue-400), var(--brand-pulse-400))',
        boxShadow: '0 0 8px var(--brand-blue-400)',
      }}
      initial={{ y: '110vh', opacity: 0 }}
      animate={{
        y: '-10vh',
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: duration,
        delay: delay,
        ease: 'linear',
      }}
    />
  );
}

FloatingParticle.propTypes = {
  delay: PropTypes.number.isRequired,
  duration: PropTypes.number.isRequired,
};

// ============================================
// EXPANDING RING
// ============================================

function ExpandingRing({ delay, color, size = 256 }) {
  return (
    <motion.div
      className="absolute rounded-full border-2"
      style={{
        width: size,
        height: size,
        borderColor: color,
        boxShadow: `0 0 30px ${color}`,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: [0.5, 1.5, 2.5, 3.5],
        opacity: [0, 0.8, 0.4, 0],
      }}
      transition={{
        duration: 2,
        delay,
        ease: 'easeOut',
      }}
    />
  );
}

ExpandingRing.propTypes = {
  delay: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
  size: PropTypes.number,
};

// ============================================
// STAR BURST EFFECT
// ============================================

function StarBurst({ delay }) {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 0.6, delay }}
    >
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <motion.div
            key={i}
            className="absolute w-1 h-20 origin-bottom"
            style={{
              background: 'linear-gradient(to top, var(--brand-blue-500), transparent)',
              transform: `rotate(${angle}rad)`,
              boxShadow: '0 0 10px var(--brand-blue-400)',
            }}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{
              scaleY: [0, 1, 1.5],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 0.6,
              delay: delay + i * 0.05,
              ease: [0.34, 1.56, 0.64, 1],
            }}
          />
        );
      })}
    </motion.div>
  );
}

StarBurst.propTypes = {
  delay: PropTypes.number.isRequired,
};

// ============================================
// ANIMATION VARIANTS
// ============================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      when: 'beforeChildren',
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.5,
      when: 'afterChildren',
    },
  },
};

const textVariants = {
  hidden: {
    opacity: 0,
    y: 50,
    scale: 0.5,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 15,
      delay: 0.2,
    },
  },
  exit: {
    opacity: 0,
    y: -30,
    scale: 0.8,
    transition: { duration: 0.3 },
  },
};

const numberVariants = {
  hidden: {
    opacity: 0,
    scale: 0,
    rotate: -180,
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 150,
      damping: 12,
      delay: 0.5,
    },
  },
  exit: {
    opacity: 0,
    scale: 1.5,
    transition: { duration: 0.3 },
  },
};

// ============================================
// MAIN COMPONENT
// ============================================

export function LevelUpCelebration({
  level = 1,
  isVisible = false,
  onComplete,
  duration = 3000,
  className = '',
}) {
  const [showCounter, setShowCounter] = useState(false);
  const animatedLevel = useAnimatedCounter(level, 800, showCounter);
  const reducedMotion = useReducedMotion();

  // Start counter after initial animations
  useEffect(() => {
    if (isVisible) {
      // Play sound effect
      playLevelUpSound();

      const timer = setTimeout(() => {
        setShowCounter(true);
      }, 600);

      return () => clearTimeout(timer);
    } else {
      setShowCounter(false);
    }
  }, [isVisible]);

  // Auto-complete after duration
  useEffect(() => {
    if (isVisible && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete, duration]);

  // Generate floating particles
  const particles = useMemo(
    () =>
      Array.from({ length: reducedMotion ? 0 : 30 }).map(() => ({
        delay: Math.random() * 2,
        duration: Math.random() * 2 + 2,
      })),
    [reducedMotion]
  );

  // Handle keyboard dismiss
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        onComplete?.();
      }
    },
    [onComplete]
  );

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onComplete}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="dialog"
          aria-label={`Level up! You are now level ${level}`}
        >
          {/* Backdrop with blur */}
          <motion.div
            className="absolute inset-0 bg-[var(--void-deep)]/90 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Radial gradient background */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(circle at 50% 50%,
                  rgba(0, 102, 255, 0.2) 0%,
                  rgba(255, 51, 102, 0.1) 30%,
                  transparent 70%)
              `,
            }}
            initial={{ scale: 0 }}
            animate={{ scale: reducedMotion ? 1 : [0, 1.5, 1.2] }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />

          {/* Floating particles */}
          {!reducedMotion && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {particles.map((p, i) => (
                <FloatingParticle key={i} delay={p.delay} duration={p.duration} />
              ))}
            </div>
          )}

          {/* Star burst effect */}
          {!reducedMotion && <StarBurst delay={0.4} />}

          {/* Expanding rings */}
          {!reducedMotion && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <ExpandingRing delay={0.2} color="var(--brand-blue-400)" size={200} />
              <ExpandingRing delay={0.4} color="var(--brand-pulse-400)" size={200} />
              <ExpandingRing delay={0.6} color="var(--brand-blue-500)" size={200} />
              <ExpandingRing delay={0.8} color="var(--brand-pulse-500)" size={200} />
            </div>
          )}

          {/* Main content */}
          <div className="relative z-10 text-center">
            {/* LEVEL UP text with glow */}
            <motion.div
              variants={textVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="mb-4"
            >
              <h1
                className="text-4xl md:text-6xl font-black tracking-widest"
                style={{
                  background: 'linear-gradient(135deg, var(--brand-blue-400), var(--brand-pulse-400))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 40px var(--brand-blue-400)',
                  filter: 'drop-shadow(0 0 20px var(--brand-blue-500))',
                }}
              >
                LEVEL UP!
              </h1>
            </motion.div>

            {/* Level number with animation */}
            <motion.div
              variants={numberVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative"
            >
              {/* Glow behind number */}
              {!reducedMotion && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{
                    opacity: [0.5, 1, 0.5],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <div
                    className="w-40 h-40 rounded-full"
                    style={{
                      background: 'radial-gradient(circle, var(--brand-blue-500), transparent)',
                      filter: 'blur(20px)',
                    }}
                  />
                </motion.div>
              )}

              {/* Level number */}
              <div
                className="relative text-8xl md:text-9xl font-black"
                style={{
                  background: 'linear-gradient(180deg, #ffffff, var(--brand-blue-200))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 60px var(--brand-blue-400)',
                }}
              >
                {animatedLevel}
              </div>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              className="mt-6 text-lg md:text-xl text-[var(--text-secondary)] font-medium"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              Keep pushing your limits
            </motion.p>
          </div>

          {/* Click/tap to dismiss hint */}
          <motion.div
            className="absolute bottom-8 left-0 right-0 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
          >
            <button
              onClick={onComplete}
              className="text-sm text-[var(--text-quaternary)] hover:text-[var(--text-secondary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue-400)] focus:ring-offset-2 focus:ring-offset-transparent rounded px-2 py-1"
            >
              Tap to continue
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

LevelUpCelebration.propTypes = {
  level: PropTypes.number,
  isVisible: PropTypes.bool,
  onComplete: PropTypes.func,
  duration: PropTypes.number,
  className: PropTypes.string,
};

export default LevelUpCelebration;
