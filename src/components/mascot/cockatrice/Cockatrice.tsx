/**
 * Cockatrice Mascot Component
 *
 * The legendary Cockatrice from TRIPTOMEAN.com - a mythical creature
 * that's part rooster, part serpent. Used as the friendly error messenger
 * to deliver bad news with charm and humor.
 *
 * CRITICAL: Uses SafeMotion for iOS Lockdown Mode / Brave Shields compatibility.
 *
 * States:
 * - idle: Gentle breathing animation
 * - concerned: Tilted head, worried expression
 * - apologetic: Drooping wings, sad eyes
 * - helpful: Perked up, offering solutions
 * - victorious: Fixed the issue!
 */

import React from 'react';
import { motion } from 'framer-motion';
import { SafeMotion, getIsRestrictive } from '../../../utils/safeMotion';

export type CockatriceState =
  | 'idle'
  | 'concerned'
  | 'apologetic'
  | 'helpful'
  | 'victorious'
  | 'thinking';

interface CockatriceProps {
  state?: CockatriceState;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  reducedMotion?: boolean;
}

const SIZE_MAP = {
  sm: 64,
  md: 96,
  lg: 128,
  xl: 180,
};

// Animation variants for different states
const cockatriceVariants = {
  idle: {
    scale: [1, 1.02, 1],
    rotate: [0, 0, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  concerned: {
    rotate: [-5, 5, -5],
    scale: 1,
    transition: {
      duration: 0.5,
      repeat: 2,
      ease: 'easeInOut',
    },
  },
  apologetic: {
    y: [0, 5, 0],
    scale: [1, 0.95, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  helpful: {
    y: [0, -8, 0],
    scale: [1, 1.05, 1],
    transition: {
      duration: 0.8,
      repeat: Infinity,
      ease: 'easeOut',
    },
  },
  victorious: {
    rotate: [0, -10, 10, -10, 10, 0],
    scale: [1, 1.1, 1.2, 1.1, 1],
    transition: {
      duration: 1,
      ease: 'easeOut',
    },
  },
  thinking: {
    rotate: [0, -3, 3, -3, 0],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Eye animations based on state
const eyeVariants = {
  idle: { scaleY: 1 },
  concerned: { scaleY: 0.7 },
  apologetic: { scaleY: 0.5 },
  helpful: { scaleY: 1.1 },
  victorious: { scaleY: 1.2 },
  thinking: { scaleY: 0.8 },
};

// Wing animations
const wingVariants = {
  idle: { rotate: 0, y: 0 },
  concerned: { rotate: -5, y: 2 },
  apologetic: { rotate: -10, y: 5 },
  helpful: { rotate: 5, y: -3 },
  victorious: { rotate: 15, y: -8 },
  thinking: { rotate: 0, y: 0 },
};

export default function Cockatrice({
  state = 'idle',
  size = 'lg',
  className = '',
  reducedMotion = false,
}: CockatriceProps) {
  const dimension = SIZE_MAP[size];
  const isRestrictive = getIsRestrictive();
  const disableAnimations = reducedMotion || isRestrictive;

  // Use static div for restrictive environments
  const MotionWrapper = isRestrictive ? 'div' : SafeMotion.div;

  return (
    <MotionWrapper
      className={`relative ${className}`}
      style={{ width: dimension, height: dimension, opacity: 1 }}
      {...(!isRestrictive && { animate: disableAnimations ? undefined : state, variants: cockatriceVariants })}
    >
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Definitions */}
        <defs>
          {/* Body gradient */}
          <linearGradient id="cockatriceBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="50%" stopColor="#6d28d9" />
            <stop offset="100%" stopColor="#5b21b6" />
          </linearGradient>

          {/* Comb/crest gradient (fiery red) */}
          <linearGradient id="cockatriceCrest" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>

          {/* Serpent tail gradient */}
          <linearGradient id="cockatriceTail" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5b21b6" />
            <stop offset="100%" stopColor="#4c1d95" />
          </linearGradient>

          {/* Eye glow */}
          <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="70%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </radialGradient>

          {/* Aura glow */}
          <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer glow aura */}
        <circle
          cx="60"
          cy="60"
          r="55"
          fill="none"
          stroke="url(#cockatriceBody)"
          strokeWidth="2"
          opacity="0.3"
          filter="url(#glowFilter)"
        />

        {/* Serpent tail (curved behind) */}
        <motion.path
          d="M35 75 Q20 85, 15 95 Q10 105, 20 108 Q30 110, 35 100 Q40 90, 45 85"
          fill="url(#cockatriceTail)"
          stroke="#4c1d95"
          strokeWidth="1"
          variants={{
            idle: { d: 'M35 75 Q20 85, 15 95 Q10 105, 20 108 Q30 110, 35 100 Q40 90, 45 85' },
            concerned: { d: 'M35 75 Q25 80, 20 90 Q15 100, 25 105 Q35 108, 40 98 Q43 90, 45 85' },
            apologetic: { d: 'M35 75 Q30 82, 28 92 Q25 102, 32 106 Q40 108, 42 98 Q44 90, 45 85' },
            helpful: { d: 'M35 75 Q18 80, 10 92 Q5 102, 15 108 Q25 112, 32 100 Q38 90, 45 85' },
            victorious: { d: 'M35 75 Q15 78, 8 88 Q2 98, 12 106 Q22 112, 30 100 Q38 88, 45 85' },
            thinking: { d: 'M35 75 Q22 83, 18 93 Q14 103, 22 107 Q32 109, 38 99 Q42 90, 45 85' },
          }}
          animate={reducedMotion ? undefined : state}
        />

        {/* Body (egg-shaped) */}
        <ellipse
          cx="60"
          cy="65"
          rx="28"
          ry="32"
          fill="url(#cockatriceBody)"
          stroke="#5b21b6"
          strokeWidth="1.5"
        />

        {/* Breast feathers */}
        <ellipse cx="60" cy="75" rx="18" ry="15" fill="#8b5cf6" opacity="0.5" />

        {/* Left wing */}
        <motion.path
          d="M32 55 Q20 50, 22 65 Q24 75, 35 70 Q40 68, 38 60 Q36 52, 32 55"
          fill="#6d28d9"
          stroke="#5b21b6"
          strokeWidth="1"
          variants={wingVariants}
          animate={reducedMotion ? undefined : state}
          style={{ originX: '35px', originY: '62px' }}
        />

        {/* Right wing */}
        <motion.path
          d="M88 55 Q100 50, 98 65 Q96 75, 85 70 Q80 68, 82 60 Q84 52, 88 55"
          fill="#6d28d9"
          stroke="#5b21b6"
          strokeWidth="1"
          variants={{
            idle: { rotate: 0, y: 0 },
            concerned: { rotate: 5, y: 2 },
            apologetic: { rotate: 10, y: 5 },
            helpful: { rotate: -5, y: -3 },
            victorious: { rotate: -15, y: -8 },
            thinking: { rotate: 0, y: 0 },
          }}
          animate={reducedMotion ? undefined : state}
          style={{ originX: '85px', originY: '62px' }}
        />

        {/* Head */}
        <circle cx="60" cy="38" r="18" fill="url(#cockatriceBody)" stroke="#5b21b6" strokeWidth="1" />

        {/* Crest/Comb (rooster-like) */}
        <path
          d="M52 22 Q50 15, 55 12 Q58 10, 60 15 Q62 10, 65 12 Q70 15, 68 22 Q65 20, 60 20 Q55 20, 52 22"
          fill="url(#cockatriceCrest)"
          stroke="#dc2626"
          strokeWidth="0.5"
        />

        {/* Wattles (under beak) */}
        <path
          d="M55 50 Q53 55, 56 57 Q58 55, 60 57 Q62 55, 64 57 Q67 55, 65 50"
          fill="#ef4444"
          opacity="0.8"
        />

        {/* Beak */}
        <path d="M54 42 L60 50 L66 42 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="0.5" />

        {/* Eyes */}
        <g>
          {/* Left eye */}
          <motion.ellipse
            cx="52"
            cy="35"
            rx="5"
            ry="6"
            fill="url(#eyeGlow)"
            variants={eyeVariants}
            animate={reducedMotion ? undefined : state}
          />
          <circle cx="53" cy="34" r="2" fill="#1f2937" />
          <circle cx="54" cy="33" r="1" fill="white" opacity="0.8" />

          {/* Right eye */}
          <motion.ellipse
            cx="68"
            cy="35"
            rx="5"
            ry="6"
            fill="url(#eyeGlow)"
            variants={eyeVariants}
            animate={reducedMotion ? undefined : state}
          />
          <circle cx="67" cy="34" r="2" fill="#1f2937" />
          <circle cx="66" cy="33" r="1" fill="white" opacity="0.8" />
        </g>

        {/* Feet (talons) */}
        <g fill="#d97706" stroke="#b45309" strokeWidth="0.5">
          {/* Left foot */}
          <path d="M50 95 L48 102 M50 95 L50 103 M50 95 L52 102" />
          {/* Right foot */}
          <path d="M70 95 L68 102 M70 95 L70 103 M70 95 L72 102" />
        </g>

        {/* Sparkle effects for victorious state */}
        {state === 'victorious' && !reducedMotion && (
          <>
            <motion.circle
              cx="30"
              cy="25"
              r="2"
              fill="#fbbf24"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
            <motion.circle
              cx="90"
              cy="30"
              r="2"
              fill="#fbbf24"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
              transition={{ duration: 0.8, delay: 0.4 }}
            />
            <motion.circle
              cx="85"
              cy="80"
              r="2"
              fill="#fbbf24"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
              transition={{ duration: 0.8, delay: 0.6 }}
            />
          </>
        )}

        {/* Thinking bubbles */}
        {state === 'thinking' && !reducedMotion && (
          <>
            <motion.circle
              cx="85"
              cy="25"
              r="4"
              fill="white"
              opacity="0.6"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.circle
              cx="92"
              cy="18"
              r="3"
              fill="white"
              opacity="0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            />
            <motion.circle
              cx="97"
              cy="12"
              r="2"
              fill="white"
              opacity="0.4"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.1, 0.4, 0.1] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
            />
          </>
        )}
      </svg>
    </MotionWrapper>
  );
}

export { Cockatrice };
