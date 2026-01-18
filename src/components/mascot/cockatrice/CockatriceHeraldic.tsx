/**
 * Heraldic Cockatrice Component
 *
 * Matches the TripToMean.com cockatrice logo - a medieval bestiary style
 * creature with rooster head, dragon wings, and serpent tail.
 *
 * This is the AUTHENTIC TripToMean cockatrice design, used as both
 * the error messenger and bug hunter mascot.
 *
 * Style: Black line art / woodcut / heraldic engraving aesthetic
 */

import React from 'react';
import { motion } from 'framer-motion';

export type CockatriceState =
  | 'idle'
  | 'alert'
  | 'hunting'
  | 'found'
  | 'victorious'
  | 'concerned'
  | 'apologetic';

interface CockatriceHeraldicProps {
  state?: CockatriceState;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  className?: string;
  reducedMotion?: boolean;
  /** Primary color for the line art (default: currentColor for theme compatibility) */
  color?: string;
  /** Show glow effect on hover/active states */
  glowEnabled?: boolean;
}

const SIZE_MAP = {
  sm: 48,
  md: 75,
  lg: 120,
  xl: 180,
  xxl: 240,
};

// Subtle animations that preserve the heraldic dignity
const cockatriceVariants = {
  idle: {
    scale: 1,
    rotate: 0,
    transition: { duration: 0.3 },
  },
  alert: {
    scale: 1.02,
    rotate: [-1, 1, -1, 0],
    transition: {
      rotate: { duration: 0.4, ease: 'easeInOut' },
      scale: { duration: 0.2 },
    },
  },
  hunting: {
    scale: [1, 1.03, 1],
    x: [0, -2, 2, -1, 1, 0],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  found: {
    scale: [1, 1.1, 1.05],
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
  victorious: {
    scale: [1, 1.08, 1],
    rotate: [0, -3, 3, 0],
    transition: {
      duration: 0.8,
      ease: 'easeOut',
    },
  },
  concerned: {
    scale: 0.98,
    rotate: -2,
    transition: { duration: 0.3 },
  },
  apologetic: {
    scale: 0.95,
    y: 3,
    transition: { duration: 0.4 },
  },
};

// Wing animation for hunting state
const wingVariants = {
  idle: { rotate: 0 },
  alert: { rotate: 5 },
  hunting: {
    rotate: [0, -8, 8, -5, 5, 0],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  found: { rotate: 10 },
  victorious: { rotate: 15 },
  concerned: { rotate: -5 },
  apologetic: { rotate: -10 },
};

// Tail animation
const tailVariants = {
  idle: { rotate: 0 },
  alert: { rotate: 3 },
  hunting: {
    rotate: [0, 5, -5, 3, -3, 0],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  found: { rotate: 8 },
  victorious: { rotate: 12 },
  concerned: { rotate: -3 },
  apologetic: { rotate: -8 },
};

export default function CockatriceHeraldic({
  state = 'idle',
  size = 'lg',
  className = '',
  reducedMotion = false,
  color = 'currentColor',
  glowEnabled = true,
}: CockatriceHeraldicProps) {
  const dimension = SIZE_MAP[size];
  const isActive = state === 'hunting' || state === 'found' || state === 'victorious';

  return (
    <motion.div
      className={`relative inline-block ${className}`}
      style={{ width: dimension, height: dimension }}
      animate={reducedMotion ? undefined : state}
      variants={cockatriceVariants}
    >
      {/* Glow effect for active states */}
      {glowEnabled && isActive && !reducedMotion && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
            filter: 'blur(8px)',
          }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      <svg
        viewBox="0 0 75 83"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        style={{ color }}
      >
        <defs>
          {/* Line art style - no fills, just strokes */}
          <style>
            {`
              .cockatrice-line {
                fill: none;
                stroke: currentColor;
                stroke-width: 1.2;
                stroke-linecap: round;
                stroke-linejoin: round;
              }
              .cockatrice-fill {
                fill: currentColor;
                stroke: none;
              }
              .cockatrice-detail {
                fill: none;
                stroke: currentColor;
                stroke-width: 0.8;
                stroke-linecap: round;
              }
            `}
          </style>
        </defs>

        {/* Main body group */}
        <g transform="translate(2, 2)">
          {/* Rooster head with comb */}
          <g className="cockatrice-head">
            {/* Comb/crest - jagged crown */}
            <path
              className="cockatrice-line"
              d="M28 8 L26 2 L30 6 L28 1 L33 5 L32 0 L36 4 L38 2 L37 7"
            />
            <path className="cockatrice-fill" d="M28 8 L26 3 L30 6 L28 2 L33 5 L32 1 L36 4 L38 3 L37 7 Z" />

            {/* Head outline */}
            <path
              className="cockatrice-line"
              d="M25 12 C20 12, 18 16, 18 20 C18 24, 22 28, 28 28 L32 28"
            />

            {/* Eye */}
            <circle className="cockatrice-fill" cx="24" cy="18" r="2" />

            {/* Beak */}
            <path className="cockatrice-line" d="M18 20 L10 22 L18 24" />
            <path className="cockatrice-fill" d="M18 20 L12 22 L18 23 Z" />

            {/* Wattle */}
            <path
              className="cockatrice-line"
              d="M16 24 C14 26, 14 30, 16 32 C18 34, 20 32, 20 30"
            />
          </g>

          {/* Neck - scaled/feathered */}
          <g className="cockatrice-neck">
            <path
              className="cockatrice-line"
              d="M28 28 C32 32, 34 36, 36 42"
            />
            {/* Scale details on neck */}
            <path className="cockatrice-detail" d="M29 30 C31 31, 32 33, 31 35" />
            <path className="cockatrice-detail" d="M31 33 C33 34, 34 36, 33 38" />
            <path className="cockatrice-detail" d="M33 36 C35 37, 36 39, 35 41" />
          </g>

          {/* Wing - dragon style with membrane */}
          <motion.g
            className="cockatrice-wing"
            style={{ transformOrigin: '45px 35px' }}
            variants={wingVariants}
            animate={reducedMotion ? undefined : state}
          >
            {/* Wing frame */}
            <path
              className="cockatrice-line"
              d="M36 35 L55 15 L60 22 L58 18 L65 28 L62 25 L68 35 L50 40 Z"
            />
            {/* Wing membrane lines */}
            <path className="cockatrice-detail" d="M36 35 L55 17" />
            <path className="cockatrice-detail" d="M38 37 L58 20" />
            <path className="cockatrice-detail" d="M40 39 L62 26" />
            <path className="cockatrice-detail" d="M43 40 L65 32" />
            {/* Feather details at wing edge */}
            <path className="cockatrice-detail" d="M50 40 L52 44 L48 42" />
            <path className="cockatrice-detail" d="M54 38 L56 42 L52 41" />
          </motion.g>

          {/* Body - feathered/scaled torso */}
          <g className="cockatrice-body">
            <path
              className="cockatrice-line"
              d="M36 42 C40 45, 42 50, 40 56 C38 62, 34 65, 30 68"
            />
            {/* Body feather/scale details */}
            <path className="cockatrice-detail" d="M38 44 C40 46, 41 49, 40 52" />
            <path className="cockatrice-detail" d="M36 48 C38 50, 39 53, 38 56" />
            <path className="cockatrice-detail" d="M34 52 C36 54, 37 57, 36 60" />
            <path className="cockatrice-detail" d="M32 56 C34 58, 35 61, 34 64" />
          </g>

          {/* Legs - bird talons */}
          <g className="cockatrice-legs">
            {/* Front leg */}
            <path className="cockatrice-line" d="M35 55 L38 65 L42 70" />
            <path className="cockatrice-line" d="M38 65 L36 72" />
            <path className="cockatrice-line" d="M38 65 L40 73" />
            {/* Rear leg */}
            <path className="cockatrice-line" d="M32 60 L30 68 L26 74" />
            <path className="cockatrice-line" d="M30 68 L32 75" />
            <path className="cockatrice-line" d="M30 68 L28 76" />
          </g>

          {/* Serpent tail - long curved with scales */}
          <motion.g
            className="cockatrice-tail"
            style={{ transformOrigin: '30px 68px' }}
            variants={tailVariants}
            animate={reducedMotion ? undefined : state}
          >
            <path
              className="cockatrice-line"
              d="M30 68 C25 72, 15 75, 8 72 C2 69, 0 62, 5 58 C10 54, 18 56, 22 60"
            />
            {/* Tail scales */}
            <path className="cockatrice-detail" d="M28 70 C26 71, 24 72, 22 71" />
            <path className="cockatrice-detail" d="M22 71 C20 72, 18 73, 16 72" />
            <path className="cockatrice-detail" d="M16 72 C14 73, 12 73, 10 72" />
            <path className="cockatrice-detail" d="M10 72 C8 71, 6 70, 5 68" />
            <path className="cockatrice-detail" d="M5 68 C4 66, 4 64, 5 62" />
            {/* Tail tip/barb */}
            <path className="cockatrice-line" d="M5 58 L2 55 L8 57 L5 58" />
          </motion.g>
        </g>

        {/* Bug hunting indicator - appears when hunting */}
        {(state === 'hunting' || state === 'found') && !reducedMotion && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Target reticle near the beak */}
            <motion.circle
              cx="8"
              cy="22"
              r="4"
              className="cockatrice-detail"
              animate={{
                r: [4, 5, 4],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
              }}
            />
            {state === 'found' && (
              <>
                {/* Bug icon when found */}
                <motion.path
                  d="M6 20 L10 20 M8 18 L8 22 M6 18 L10 22 M10 18 L6 22"
                  className="cockatrice-detail"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: 45 }}
                  style={{ transformOrigin: '8px 20px' }}
                />
              </>
            )}
          </motion.g>
        )}

        {/* Victory sparkles */}
        {state === 'victorious' && !reducedMotion && (
          <>
            <motion.circle
              cx="15"
              cy="10"
              r="1.5"
              className="cockatrice-fill"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
              transition={{ duration: 0.6, delay: 0 }}
            />
            <motion.circle
              cx="60"
              cy="12"
              r="1.5"
              className="cockatrice-fill"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
              transition={{ duration: 0.6, delay: 0.2 }}
            />
            <motion.circle
              cx="65"
              cy="45"
              r="1.5"
              className="cockatrice-fill"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
              transition={{ duration: 0.6, delay: 0.4 }}
            />
          </>
        )}
      </svg>
    </motion.div>
  );
}

export { CockatriceHeraldic };
