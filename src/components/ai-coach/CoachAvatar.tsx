/**
 * CoachAvatar Component
 *
 * Animated avatar for the AI Training Partner.
 * Supports idle, thinking, and speaking states with CSS animations.
 * Also supports different personality styles: flex, spark, zen.
 */

import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

// Avatar states
export const AVATAR_STATES = {
  IDLE: 'idle',
  THINKING: 'thinking',
  SPEAKING: 'speaking',
  CELEBRATING: 'celebrating',
};

// Avatar personalities with their icons and colors
export const AVATAR_PERSONALITIES = {
  flex: {
    icon: '\uD83D\uDCAA', // Muscle emoji
    name: 'Max',
    title: 'Your Strength Coach',
    gradient: 'from-blue-500 to-purple-600',
    glow: 'bg-blue-400',
    shadow: 'shadow-blue-500/30',
  },
  spark: {
    icon: '\u26A1', // Lightning bolt
    name: 'Spark',
    title: 'Your Energy Coach',
    gradient: 'from-yellow-400 to-orange-500',
    glow: 'bg-yellow-400',
    shadow: 'shadow-yellow-500/30',
  },
  zen: {
    icon: '\uD83E\uDDD8', // Person in lotus position
    name: 'Zen',
    title: 'Your Mindful Coach',
    gradient: 'from-teal-400 to-green-500',
    glow: 'bg-teal-400',
    shadow: 'shadow-teal-500/30',
  },
};

/**
 * CoachAvatar - Animated coach avatar with state-based animations
 *
 * @param {Object} props
 * @param {string} props.state - Current avatar state
 * @param {string} props.size - Size variant (sm, md, lg, xl)
 * @param {string} props.personality - Avatar personality (flex, spark, zen)
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.reducedMotion - Respect reduced motion preference
 */
export default function CoachAvatar({
  state = AVATAR_STATES.IDLE,
  size = 'md',
  personality = 'flex',
  className,
  reducedMotion = false,
}) {
  // Get personality settings
  const personalityConfig = AVATAR_PERSONALITIES[personality] || AVATAR_PERSONALITIES.flex;
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
  };

  const iconSizes = {
    sm: 'text-sm',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  // Personality-specific idle animations
  const idleAnimations = {
    flex: reducedMotion
      ? {}
      : {
          // Pulse animation for flex (muscle)
          scale: [1, 1.05, 1],
          transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        },
    spark: reducedMotion
      ? {}
      : {
          // Glow/flash animation for spark (energy)
          scale: [1, 1.02, 1],
          opacity: [1, 0.8, 1],
          transition: {
            duration: 0.8,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        },
    zen: reducedMotion
      ? {}
      : {
          // Breathing animation for zen (calm)
          scale: [1, 1.03, 1],
          transition: {
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        },
  };

  // Animation variants based on state
  const containerVariants = {
    idle: idleAnimations[personality] || idleAnimations.flex,
    thinking: reducedMotion
      ? {}
      : {
          rotate: [0, -5, 5, 0],
          transition: {
            duration: 1,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        },
    speaking: reducedMotion
      ? {}
      : {
          scale: [1, 1.05, 1, 1.03, 1],
          transition: {
            duration: 0.8,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        },
    celebrating: reducedMotion
      ? {}
      : {
          rotate: [0, -10, 10, -10, 10, 0],
          scale: [1, 1.1, 1.1, 1.1, 1.1, 1],
          transition: {
            duration: 0.6,
            repeat: Infinity,
            repeatDelay: 0.5,
          },
        },
  };

  // Glow animation for thinking state
  const glowVariants = {
    idle: {
      opacity: 0.3,
      scale: 1,
    },
    thinking: reducedMotion
      ? { opacity: 0.5 }
      : {
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.2, 1],
          transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        },
    speaking: reducedMotion
      ? { opacity: 0.4 }
      : {
          opacity: [0.4, 0.7, 0.4],
          scale: [1, 1.1, 1],
          transition: {
            duration: 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        },
    celebrating: reducedMotion
      ? { opacity: 0.6 }
      : {
          opacity: [0.5, 1, 0.5],
          scale: [1, 1.3, 1],
          transition: {
            duration: 0.4,
            repeat: Infinity,
          },
        },
  };

  // Icon based on state and personality
  const getIcon = () => {
    switch (state) {
      case AVATAR_STATES.THINKING:
        return '\uD83E\uDD14'; // Thinking face
      case AVATAR_STATES.SPEAKING:
        return '\uD83D\uDCAC'; // Speech bubble
      case AVATAR_STATES.CELEBRATING:
        return '\uD83C\uDF89'; // Party popper
      default:
        return personalityConfig.icon;
    }
  };

  return (
    <motion.div
      className={clsx(
        'relative flex items-center justify-center rounded-full',
        `bg-gradient-to-br ${personalityConfig.gradient}`,
        sizeClasses[size],
        className
      )}
      variants={containerVariants}
      animate={state}
      initial="idle"
    >
      {/* Glow effect - uses personality color */}
      <motion.div
        className={clsx('absolute inset-0 rounded-full blur-md -z-10', personalityConfig.glow)}
        variants={glowVariants}
        animate={state}
        initial="idle"
      />

      {/* Inner ring */}
      <div
        className={clsx(
          'absolute inset-1 rounded-full',
          'bg-gradient-to-br from-blue-400/30 to-purple-500/30',
          'border border-white/20'
        )}
      />

      {/* Icon */}
      <span className={clsx(iconSizes[size], 'relative z-10')} role="img" aria-hidden="true">
        {getIcon()}
      </span>

      {/* Thinking dots animation */}
      {state === AVATAR_STATES.THINKING && !reducedMotion && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1 h-1 bg-blue-400 rounded-full"
              animate={{
                y: [0, -4, 0],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      )}

      {/* Speaking pulse rings */}
      {state === AVATAR_STATES.SPEAKING && !reducedMotion && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border-2 border-blue-400"
              initial={{ opacity: 0, scale: 1 }}
              animate={{
                opacity: [0.6, 0],
                scale: [1, 1.5],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.4,
                ease: 'easeOut',
              }}
            />
          ))}
        </>
      )}

      {/* Celebration particles */}
      {state === AVATAR_STATES.CELEBRATING && !reducedMotion && (
        <>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#A78BFA', '#34D399', '#F59E0B'][i],
              }}
              initial={{
                x: 0,
                y: 0,
                opacity: 0,
              }}
              animate={{
                x: [0, Math.cos((i * Math.PI) / 3) * 30],
                y: [0, Math.sin((i * Math.PI) / 3) * 30 - 10],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.1,
              }}
            />
          ))}
        </>
      )}
    </motion.div>
  );
}
