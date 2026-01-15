/**
 * Shared utilities and components for EmptyState illustrations
 *
 * Provides consistent styling, animations, and SVG definitions
 * across all empty state illustrations.
 */

import React from 'react';
import { motion } from 'framer-motion';

/**
 * Base SVG wrapper with shared definitions
 */
export const IllustrationWrapper = ({ children, className = '', viewBox = '0 0 200 150' }) => (
  <svg
    viewBox={viewBox}
    className={`w-full h-full ${className}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      {/* Brand blue gradient */}
      <linearGradient id="emptyBrandGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--brand-blue-400, #0066FF)" stopOpacity="0.8" />
        <stop offset="100%" stopColor="var(--brand-blue-600, #0044CC)" stopOpacity="0.4" />
      </linearGradient>

      {/* Pulse/warning gradient */}
      <linearGradient id="emptyPulseGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--brand-pulse-400, #FF3366)" stopOpacity="0.6" />
        <stop offset="100%" stopColor="var(--brand-pulse-600, #CC2952)" stopOpacity="0.3" />
      </linearGradient>

      {/* Success gradient */}
      <linearGradient id="emptySuccessGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--success-400, #22C55E)" stopOpacity="0.7" />
        <stop offset="100%" stopColor="var(--success-600, #16A34A)" stopOpacity="0.4" />
      </linearGradient>

      {/* Glass gradient */}
      <linearGradient id="emptyGlassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
      </linearGradient>

      {/* Glow filter */}
      <filter id="emptyGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Brand shadow */}
      <filter id="emptyBrandShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#0066FF" floodOpacity="0.4" />
      </filter>

      {/* Pulse shadow */}
      <filter id="emptyPulseShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#FF3366" floodOpacity="0.3" />
      </filter>

      {/* Success shadow */}
      <filter id="emptySuccessShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#22C55E" floodOpacity="0.4" />
      </filter>
    </defs>
    {children}
  </svg>
);

/**
 * Floating animation wrapper - gentle up/down bob
 */
export const Float = ({ children, duration = 3, delay = 0 }) => (
  <motion.g
    animate={{
      y: [0, -5, 0],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  >
    {children}
  </motion.g>
);

/**
 * Pulse animation wrapper - opacity/scale oscillation
 */
export const Pulse = ({ children, duration = 2, delay = 0 }) => (
  <motion.g
    animate={{
      opacity: [0.5, 1, 0.5],
      scale: [0.98, 1.02, 0.98],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  >
    {children}
  </motion.g>
);

/**
 * Sparkle effect - twinkling star/diamond shape
 */
export const Sparkle = ({ cx, cy, size = 8, delay = 0, color = 'var(--brand-blue-400, #0066FF)' }) => (
  <motion.g
    animate={{
      opacity: [0, 1, 0],
      scale: [0.5, 1, 0.5],
    }}
    transition={{
      duration: 2,
      delay,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  >
    {/* Vertical diamond */}
    <path
      d={`M${cx} ${cy - size / 2} L${cx + size / 6} ${cy} L${cx} ${cy + size / 2} L${cx - size / 6} ${cy} Z`}
      fill={color}
      filter="url(#emptyGlow)"
    />
    {/* Horizontal diamond */}
    <path
      d={`M${cx - size / 2} ${cy} L${cx} ${cy - size / 6} L${cx + size / 2} ${cy} L${cx} ${cy + size / 6} Z`}
      fill={color}
      filter="url(#emptyGlow)"
    />
  </motion.g>
);

/**
 * Rotating animation wrapper
 */
export const Rotate = ({ children, duration = 8, delay = 0 }) => (
  <motion.g
    animate={{
      rotate: [0, 360],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: 'linear',
    }}
    style={{ transformOrigin: 'center center' }}
  >
    {children}
  </motion.g>
);

/**
 * Fade in/out animation wrapper
 */
export const Fade = ({ children, duration = 2, delay = 0, minOpacity = 0.3, maxOpacity = 0.8 }) => (
  <motion.g
    animate={{
      opacity: [minOpacity, maxOpacity, minOpacity],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  >
    {children}
  </motion.g>
);

/**
 * Bounce animation wrapper
 */
export const Bounce = ({ children, duration = 1.5, delay = 0, height = 5 }) => (
  <motion.g
    animate={{
      y: [0, -height, 0],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: [0.36, 0, 0.66, -0.56],
    }}
  >
    {children}
  </motion.g>
);
