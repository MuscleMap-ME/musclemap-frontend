/**
 * LootChest Component
 *
 * Animated treasure chest SVG with multiple states and particle effects.
 * Supports glow intensity based on rarity and click/tap interaction.
 *
 * @example
 * <LootChest
 *   state="closed"
 *   rarity="epic"
 *   onOpen={() => handleChestOpen()}
 * />
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import { useReducedMotion } from '../glass/ButtonEffects';
import { RARITY_COLORS, CHEST_TYPES, LOOT_SOUNDS } from './lootDefinitions';

// ============================================
// SOUND UTILITIES
// ============================================

let audioContext = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioContext = new AudioContext();
      }
    } catch {
      return null;
    }
  }

  return audioContext;
}

function playChestSound(soundConfig) {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = soundConfig.type || 'sine';
    oscillator.frequency.setValueAtTime(soundConfig.frequency, ctx.currentTime);

    if (soundConfig.ramp) {
      oscillator.frequency.exponentialRampToValueAtTime(
        soundConfig.frequency * 2,
        ctx.currentTime + soundConfig.duration
      );
    }

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + soundConfig.duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + soundConfig.duration);
  } catch {
    // Silently fail
  }
}

// ============================================
// FLOATING PARTICLE COMPONENT
// ============================================

function GlowParticle({ color, delay, duration, size, angle }) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) return null;

  const radius = 80 + Math.random() * 40;
  const startX = Math.cos(angle) * radius * 0.3;
  const startY = Math.sin(angle) * radius * 0.3;
  const endX = Math.cos(angle) * radius;
  const endY = Math.sin(angle) * radius;

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        boxShadow: `0 0 ${size * 2}px ${color}`,
        left: '50%',
        top: '50%',
      }}
      initial={{
        x: startX - size / 2,
        y: startY - size / 2,
        opacity: 0,
        scale: 0.5,
      }}
      animate={{
        x: [startX - size / 2, endX - size / 2],
        y: [startY - size / 2, endY - size / 2],
        opacity: [0, 1, 0],
        scale: [0.5, 1, 0.3],
      }}
      transition={{
        duration,
        delay,
        ease: 'easeOut',
        repeat: Infinity,
        repeatDelay: Math.random() * 2,
      }}
    />
  );
}

GlowParticle.propTypes = {
  color: PropTypes.string.isRequired,
  delay: PropTypes.number.isRequired,
  duration: PropTypes.number.isRequired,
  size: PropTypes.number.isRequired,
  angle: PropTypes.number.isRequired,
};

// ============================================
// CHEST STATES
// ============================================

export const CHEST_STATES = {
  CLOSED: 'closed',
  SHAKING: 'shaking',
  OPENING: 'opening',
  OPEN: 'open',
};

// ============================================
// ANIMATION VARIANTS
// ============================================

const chestVariants = {
  hidden: {
    scale: 0,
    opacity: 0,
    rotateY: -180,
  },
  visible: {
    scale: 1,
    opacity: 1,
    rotateY: 0,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 15,
      duration: 0.6,
    },
  },
  exit: {
    scale: 0.5,
    opacity: 0,
    y: -50,
    transition: {
      duration: 0.3,
    },
  },
};

const shakeVariants = {
  shake: {
    rotate: [0, -3, 3, -3, 3, -2, 2, -1, 1, 0],
    scale: [1, 1.02, 1, 1.02, 1, 1.01, 1, 1.01, 1, 1],
    transition: {
      duration: 0.8,
      ease: 'easeInOut',
    },
  },
};

const lidVariants = {
  closed: {
    rotateX: 0,
    y: 0,
  },
  opening: {
    rotateX: -120,
    y: -15,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 10,
      duration: 0.8,
    },
  },
  open: {
    rotateX: -120,
    y: -15,
  },
};

const glowVariants = {
  idle: {
    opacity: 0.5,
    scale: 1,
  },
  pulse: {
    opacity: [0.5, 1, 0.5],
    scale: [1, 1.1, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  burst: {
    opacity: [0.5, 1, 0],
    scale: [1, 3, 5],
    transition: {
      duration: 0.8,
      ease: 'easeOut',
    },
  },
};

// ============================================
// MAIN COMPONENT
// ============================================

export function LootChest({
  state = CHEST_STATES.CLOSED,
  rarity = 'common',
  chestType = 'BRONZE',
  onOpen,
  onShakeComplete,
  onOpenComplete,
  enableSound = true,
  className = '',
}) {
  const reducedMotion = useReducedMotion();
  const [internalState, setInternalState] = useState(state);
  const [isHovered, setIsHovered] = useState(false);
  const shakeTimeoutRef = useRef(null);

  // Get colors based on rarity and chest type
  const colors = useMemo(() => {
    const chest = CHEST_TYPES[chestType] || CHEST_TYPES.BRONZE;
    const rarityColors = RARITY_COLORS[rarity] || RARITY_COLORS.common;

    return {
      chestMain: chest.color,
      chestGlow: chest.glowColor,
      rarityGlow: rarityColors.glow,
      rarityPrimary: rarityColors.primary,
    };
  }, [rarity, chestType]);

  // Generate particles
  const particles = useMemo(() => {
    if (reducedMotion) return [];

    return Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      angle: (i / 12) * Math.PI * 2,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      size: 3 + Math.random() * 4,
    }));
  }, [reducedMotion]);

  // Sync state with prop
  useEffect(() => {
    setInternalState(state);
  }, [state]);

  // Handle state transitions
  useEffect(() => {
    if (internalState === CHEST_STATES.SHAKING) {
      if (enableSound) {
        playChestSound(LOOT_SOUNDS.chestShake);
      }

      shakeTimeoutRef.current = setTimeout(() => {
        onShakeComplete?.();
      }, 800);
    }

    if (internalState === CHEST_STATES.OPENING) {
      if (enableSound) {
        playChestSound(LOOT_SOUNDS.chestOpen);
      }
    }

    return () => {
      if (shakeTimeoutRef.current) {
        clearTimeout(shakeTimeoutRef.current);
      }
    };
  }, [internalState, enableSound, onShakeComplete]);

  // Handle click
  const handleClick = useCallback(() => {
    if (internalState === CHEST_STATES.CLOSED) {
      setInternalState(CHEST_STATES.SHAKING);

      // Automatically transition to opening after shake
      setTimeout(() => {
        setInternalState(CHEST_STATES.OPENING);
        onOpen?.();

        // Transition to fully open
        setTimeout(() => {
          setInternalState(CHEST_STATES.OPEN);
          onOpenComplete?.();
        }, 800);
      }, 800);
    }
  }, [internalState, onOpen, onOpenComplete]);

  // Determine animation state
  const isShaking = internalState === CHEST_STATES.SHAKING;
  const isOpening = internalState === CHEST_STATES.OPENING;
  const isOpen = internalState === CHEST_STATES.OPEN;

  return (
    <motion.div
      className={`relative select-none ${className}`}
      variants={chestVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Glow effect behind chest */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${colors.rarityGlow} 0%, transparent 70%)`,
          filter: 'blur(20px)',
          transform: 'translateY(20%)',
        }}
        variants={glowVariants}
        animate={isOpening ? 'burst' : 'pulse'}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p) => (
          <GlowParticle
            key={p.id}
            color={colors.rarityPrimary}
            delay={p.delay}
            duration={p.duration}
            size={p.size}
            angle={p.angle}
          />
        ))}
      </div>

      {/* Main chest container */}
      <motion.div
        className="relative cursor-pointer"
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        animate={isShaking ? 'shake' : undefined}
        variants={shakeVariants}
        whileHover={internalState === CHEST_STATES.CLOSED && !reducedMotion ? { scale: 1.05 } : undefined}
        whileTap={internalState === CHEST_STATES.CLOSED ? { scale: 0.98 } : undefined}
        style={{ perspective: 500 }}
      >
        {/* Chest SVG */}
        <svg
          viewBox="0 0 200 160"
          className="w-48 h-40 md:w-64 md:h-52"
          style={{
            filter: `drop-shadow(0 10px 30px ${colors.chestGlow})`,
          }}
        >
          {/* Definitions */}
          <defs>
            {/* Chest gradient */}
            <linearGradient id={`chest-gradient-${rarity}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.chestMain} stopOpacity="1" />
              <stop offset="50%" stopColor={colors.chestMain} stopOpacity="0.8" />
              <stop offset="100%" stopColor={colors.chestMain} stopOpacity="0.6" />
            </linearGradient>

            {/* Highlight gradient */}
            <linearGradient id={`highlight-${rarity}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>

            {/* Metal gradient */}
            <linearGradient id={`metal-${rarity}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.rarityPrimary} />
              <stop offset="50%" stopColor={colors.rarityPrimary} stopOpacity="0.8" />
              <stop offset="100%" stopColor={colors.rarityPrimary} stopOpacity="0.6" />
            </linearGradient>

            {/* Inner glow filter */}
            <filter id={`inner-glow-${rarity}`}>
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
              <feOffset in="blur" dx="0" dy="0" result="offsetBlur" />
              <feFlood floodColor={colors.rarityPrimary} floodOpacity="0.5" />
              <feComposite in2="offsetBlur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Chest body (bottom part) */}
          <g className="chest-body">
            {/* Main body */}
            <rect
              x="20"
              y="80"
              width="160"
              height="70"
              rx="8"
              fill={`url(#chest-gradient-${rarity})`}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="2"
            />

            {/* Body highlight */}
            <rect
              x="25"
              y="85"
              width="150"
              height="30"
              rx="4"
              fill={`url(#highlight-${rarity})`}
              opacity="0.3"
            />

            {/* Metal bands */}
            <rect
              x="15"
              y="90"
              width="170"
              height="8"
              rx="2"
              fill={`url(#metal-${rarity})`}
            />
            <rect
              x="15"
              y="130"
              width="170"
              height="8"
              rx="2"
              fill={`url(#metal-${rarity})`}
            />

            {/* Corner rivets */}
            {[30, 170].map((x) =>
              [95, 135].map((y) => (
                <circle
                  key={`${x}-${y}`}
                  cx={x}
                  cy={y}
                  r="4"
                  fill={colors.rarityPrimary}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1"
                />
              ))
            )}

            {/* Lock mechanism */}
            <rect
              x="90"
              y="75"
              width="20"
              height="30"
              rx="3"
              fill={`url(#metal-${rarity})`}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1"
            />
            <circle
              cx="100"
              cy="90"
              r="5"
              fill="rgba(0,0,0,0.5)"
              stroke={colors.rarityPrimary}
              strokeWidth="1"
            />
          </g>

          {/* Chest lid (animated) */}
          <motion.g
            className="chest-lid"
            style={{ originX: '50%', originY: '100%', transformOrigin: '100px 80px' }}
            variants={lidVariants}
            animate={isOpening || isOpen ? 'opening' : 'closed'}
          >
            {/* Lid main */}
            <path
              d="M 20 80 L 20 50 Q 20 30 40 25 L 160 25 Q 180 30 180 50 L 180 80 Z"
              fill={`url(#chest-gradient-${rarity})`}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="2"
            />

            {/* Lid highlight */}
            <path
              d="M 30 75 L 30 52 Q 30 38 45 34 L 155 34 Q 170 38 170 52 L 170 75 Z"
              fill={`url(#highlight-${rarity})`}
              opacity="0.2"
            />

            {/* Metal band on lid */}
            <rect
              x="15"
              y="55"
              width="170"
              height="8"
              rx="2"
              fill={`url(#metal-${rarity})`}
            />

            {/* Lid rivets */}
            {[30, 170].map((x) => (
              <circle
                key={`lid-${x}`}
                cx={x}
                cy="59"
                r="4"
                fill={colors.rarityPrimary}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1"
              />
            ))}
          </motion.g>

          {/* Inner glow when opening */}
          <AnimatePresence>
            {(isOpening || isOpen) && (
              <motion.rect
                x="25"
                y="85"
                width="150"
                height="60"
                rx="4"
                fill={colors.rarityGlow}
                filter={`url(#inner-glow-${rarity})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.7] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              />
            )}
          </AnimatePresence>
        </svg>

        {/* Tap to open hint */}
        <AnimatePresence>
          {internalState === CHEST_STATES.CLOSED && (
            <motion.div
              className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: isHovered ? 1 : 0.7, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <span className="text-sm text-[var(--text-secondary)] font-medium">
                Tap to open
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Light rays when open */}
        <AnimatePresence>
          {(isOpening || isOpen) && !reducedMotion && (
            <motion.div
              className="absolute inset-0 pointer-events-none overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
                return (
                  <motion.div
                    key={i}
                    className="absolute left-1/2 top-1/2 w-1 h-24 origin-bottom"
                    style={{
                      background: `linear-gradient(to top, ${colors.rarityPrimary}, transparent)`,
                      transform: `rotate(${angle}rad) translateY(-60px)`,
                      opacity: 0.6,
                    }}
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{
                      scaleY: [0, 1, 0.8],
                      opacity: [0, 0.8, 0.4],
                    }}
                    transition={{
                      duration: 1,
                      delay: i * 0.05,
                      ease: 'easeOut',
                    }}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

LootChest.propTypes = {
  /** Current state of the chest */
  state: PropTypes.oneOf(Object.values(CHEST_STATES)),
  /** Rarity level affecting glow color */
  rarity: PropTypes.oneOf(['common', 'rare', 'epic', 'legendary']),
  /** Type of chest */
  chestType: PropTypes.oneOf(['BRONZE', 'SILVER', 'GOLD', 'DIAMOND']),
  /** Callback when chest starts opening */
  onOpen: PropTypes.func,
  /** Callback when shake animation completes */
  onShakeComplete: PropTypes.func,
  /** Callback when open animation completes */
  onOpenComplete: PropTypes.func,
  /** Enable sound effects */
  enableSound: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default LootChest;
