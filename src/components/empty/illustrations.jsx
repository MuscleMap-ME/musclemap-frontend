/**
 * EmptyState Illustrations - Minimal SVG illustrations for empty states
 *
 * Each illustration:
 * - Uses ~200x150px viewBox
 * - Uses currentColor or CSS variables for theming
 * - Has subtle float/pulse/sparkle animations
 * - Is optimized with minimal paths
 *
 * Matches MuscleMap's liquid glass / bioluminescent aesthetic.
 */

import React from 'react';
import { motion } from 'framer-motion';

/**
 * Base wrapper with shared SVG definitions
 */
const IllustrationWrapper = ({ children, className = '' }) => (
  <svg
    viewBox="0 0 200 150"
    className={`w-full h-full ${className}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      {/* Gradient definitions for bioluminescent effects */}
      <linearGradient id="emptyBrandGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--brand-blue-400, #0066FF)" stopOpacity="0.8" />
        <stop offset="100%" stopColor="var(--brand-blue-600, #0044CC)" stopOpacity="0.4" />
      </linearGradient>
      <linearGradient id="emptyPulseGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--brand-pulse-400, #FF3366)" stopOpacity="0.6" />
        <stop offset="100%" stopColor="var(--brand-pulse-600, #CC2952)" stopOpacity="0.3" />
      </linearGradient>
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

      {/* Soft brand shadow */}
      <filter id="emptyBrandShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#0066FF" floodOpacity="0.4" />
      </filter>

      {/* Pulse shadow */}
      <filter id="emptyPulseShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#FF3366" floodOpacity="0.3" />
      </filter>
    </defs>
    {children}
  </svg>
);

/**
 * Floating animation wrapper
 */
const Float = ({ children, duration = 3, delay = 0 }) => (
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
 * Pulse animation wrapper
 */
const Pulse = ({ children, duration = 2, delay = 0 }) => (
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
 * Sparkle animation
 */
const Sparkle = ({ cx, cy, size = 8, delay = 0 }) => (
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
    <path
      d={`M${cx} ${cy - size / 2} L${cx + size / 6} ${cy} L${cx} ${cy + size / 2} L${cx - size / 6} ${cy} Z`}
      fill="var(--brand-blue-400, #0066FF)"
      filter="url(#emptyGlow)"
    />
    <path
      d={`M${cx - size / 2} ${cy} L${cx} ${cy - size / 6} L${cx + size / 2} ${cy} L${cx} ${cy + size / 6} Z`}
      fill="var(--brand-blue-400, #0066FF)"
      filter="url(#emptyGlow)"
    />
  </motion.g>
);

/**
 * Workouts - Dumbbell with sparkles
 */
export const WorkoutsIllustration = () => (
  <IllustrationWrapper>
    {/* Background glow */}
    <circle
      cx="100"
      cy="75"
      r="50"
      fill="url(#emptyBrandGlow)"
      opacity="0.12"
      filter="url(#emptyGlow)"
    />

    <Float duration={3.5}>
      {/* Dumbbell bar */}
      <rect
        x="50"
        y="70"
        width="100"
        height="10"
        rx="5"
        fill="url(#emptyGlassGradient)"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.5"
        filter="url(#emptyBrandShadow)"
      />

      {/* Left weight plates */}
      <rect
        x="35"
        y="55"
        width="20"
        height="40"
        rx="3"
        fill="url(#emptyGlassGradient)"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1"
      />
      <rect
        x="25"
        y="60"
        width="15"
        height="30"
        rx="2"
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1"
      />

      {/* Right weight plates */}
      <rect
        x="145"
        y="55"
        width="20"
        height="40"
        rx="3"
        fill="url(#emptyGlassGradient)"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1"
      />
      <rect
        x="160"
        y="60"
        width="15"
        height="30"
        rx="2"
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1"
      />
    </Float>

    {/* Sparkles */}
    <Sparkle cx="75" cy="45" size={10} delay={0} />
    <Sparkle cx="130" cy="50" size={8} delay={0.7} />
    <Sparkle cx="170" cy="95" size={6} delay={1.4} />
  </IllustrationWrapper>
);

/**
 * Achievements - Trophy outline
 */
export const AchievementsIllustration = () => (
  <IllustrationWrapper>
    {/* Background pulse glow */}
    <circle
      cx="100"
      cy="70"
      r="45"
      fill="url(#emptyPulseGlow)"
      opacity="0.15"
      filter="url(#emptyGlow)"
    />

    <Float duration={4}>
      {/* Trophy cup */}
      <path
        d="M70 35 L70 70 Q70 95 100 105 Q130 95 130 70 L130 35"
        fill="url(#emptyGlassGradient)"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="2"
        filter="url(#emptyPulseShadow)"
      />

      {/* Left handle */}
      <path
        d="M70 45 Q50 45 50 60 Q50 75 70 70"
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Right handle */}
      <path
        d="M130 45 Q150 45 150 60 Q150 75 130 70"
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Trophy stem */}
      <rect
        x="92"
        y="108"
        width="16"
        height="12"
        rx="2"
        fill="url(#emptyGlassGradient)"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1"
      />

      {/* Trophy base */}
      <rect
        x="80"
        y="122"
        width="40"
        height="8"
        rx="2"
        fill="url(#emptyGlassGradient)"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1"
      />

      {/* Star outline (empty achievement) */}
      <path
        d="M100 50 L104 62 L117 62 L107 70 L111 82 L100 75 L89 82 L93 70 L83 62 L96 62 Z"
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </Float>
  </IllustrationWrapper>
);

/**
 * Goals - Target/bullseye
 */
export const GoalsIllustration = () => (
  <IllustrationWrapper>
    {/* Background glow */}
    <circle
      cx="100"
      cy="75"
      r="50"
      fill="url(#emptyBrandGlow)"
      opacity="0.12"
      filter="url(#emptyGlow)"
    />

    <Float duration={3}>
      {/* Outer ring */}
      <circle
        cx="100"
        cy="75"
        r="45"
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="3"
      />

      {/* Middle ring */}
      <circle
        cx="100"
        cy="75"
        r="30"
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="3"
      />

      {/* Inner ring */}
      <circle
        cx="100"
        cy="75"
        r="15"
        fill="url(#emptyGlassGradient)"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="2"
        filter="url(#emptyBrandShadow)"
      />

      {/* Center dot */}
      <Pulse>
        <circle
          cx="100"
          cy="75"
          r="5"
          fill="var(--brand-blue-400, #0066FF)"
          opacity="0.8"
        />
      </Pulse>
    </Float>

    {/* Arrow approaching (shows goal not yet hit) */}
    <motion.g
      animate={{
        x: [-20, 0, -20],
        opacity: [0.3, 0.8, 0.3],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <path
        d="M35 75 L55 75 M55 70 L65 75 L55 80"
        fill="none"
        stroke="var(--brand-blue-400, #0066FF)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
    </motion.g>
  </IllustrationWrapper>
);

/**
 * Community - Group of people silhouettes
 */
export const CommunityIllustration = () => (
  <IllustrationWrapper>
    {/* Background glow */}
    <circle
      cx="100"
      cy="75"
      r="50"
      fill="url(#emptyBrandGlow)"
      opacity="0.12"
      filter="url(#emptyGlow)"
    />

    <Float duration={3.5}>
      {/* Center person (primary) */}
      <g filter="url(#emptyBrandShadow)">
        <circle
          cx="100"
          cy="55"
          r="18"
          fill="url(#emptyGlassGradient)"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="2"
        />
        <path
          d="M70 115 Q70 85 100 85 Q130 85 130 115"
          fill="url(#emptyGlassGradient)"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="2"
        />
      </g>

      {/* Left person (faded) */}
      <g opacity="0.4">
        <circle
          cx="50"
          cy="70"
          r="12"
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.5"
        />
        <path
          d="M32 110 Q32 90 50 90 Q68 90 68 110"
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.5"
        />
      </g>

      {/* Right person (faded) */}
      <g opacity="0.4">
        <circle
          cx="150"
          cy="70"
          r="12"
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.5"
        />
        <path
          d="M132 110 Q132 90 150 90 Q168 90 168 110"
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.5"
        />
      </g>
    </Float>

    {/* Connection lines (subtle) */}
    <motion.g
      animate={{
        opacity: [0.1, 0.3, 0.1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <line x1="65" y1="85" x2="80" y2="80" stroke="var(--brand-blue-400, #0066FF)" strokeWidth="1" strokeDasharray="3 3" />
      <line x1="135" y1="85" x2="120" y2="80" stroke="var(--brand-blue-400, #0066FF)" strokeWidth="1" strokeDasharray="3 3" />
    </motion.g>
  </IllustrationWrapper>
);

/**
 * Messages - Chat bubbles
 */
export const MessagesIllustration = () => (
  <IllustrationWrapper>
    {/* Background glow */}
    <circle
      cx="100"
      cy="75"
      r="45"
      fill="url(#emptyBrandGlow)"
      opacity="0.12"
      filter="url(#emptyGlow)"
    />

    <Float duration={3}>
      {/* Main chat bubble */}
      <path
        d="M55 40 Q55 30 65 30 L135 30 Q145 30 145 40 L145 85 Q145 95 135 95 L85 95 L70 115 L70 95 L65 95 Q55 95 55 85 Z"
        fill="url(#emptyGlassGradient)"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="2"
        filter="url(#emptyBrandShadow)"
      />

      {/* Typing indicator dots */}
      <Pulse duration={1.5} delay={0}>
        <circle cx="80" cy="62" r="5" fill="rgba(255,255,255,0.2)" />
      </Pulse>
      <Pulse duration={1.5} delay={0.3}>
        <circle cx="100" cy="62" r="5" fill="rgba(255,255,255,0.3)" />
      </Pulse>
      <Pulse duration={1.5} delay={0.6}>
        <circle cx="120" cy="62" r="5" fill="rgba(255,255,255,0.2)" />
      </Pulse>
    </Float>
  </IllustrationWrapper>
);

/**
 * Exercises - Figure in motion
 */
export const ExercisesIllustration = () => (
  <IllustrationWrapper>
    {/* Background glow */}
    <circle
      cx="100"
      cy="75"
      r="50"
      fill="url(#emptyBrandGlow)"
      opacity="0.12"
      filter="url(#emptyGlow)"
    />

    <Float duration={3.5}>
      {/* Running figure */}
      <g filter="url(#emptyBrandShadow)">
        {/* Head */}
        <circle
          cx="100"
          cy="35"
          r="12"
          fill="url(#emptyGlassGradient)"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="2"
        />

        {/* Body */}
        <path
          d="M100 47 L100 75"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Arms */}
        <path
          d="M75 60 L100 55 L125 65"
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Legs */}
        <path
          d="M100 75 L80 110 M100 75 L120 105"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>

      {/* Motion lines */}
      <g opacity="0.4">
        <line x1="55" y1="50" x2="45" y2="50" stroke="var(--brand-blue-400, #0066FF)" strokeWidth="2" strokeLinecap="round" />
        <line x1="58" y1="65" x2="48" y2="65" stroke="var(--brand-blue-400, #0066FF)" strokeWidth="2" strokeLinecap="round" />
        <line x1="60" y1="80" x2="50" y2="80" stroke="var(--brand-blue-400, #0066FF)" strokeWidth="2" strokeLinecap="round" />
      </g>
    </Float>

    {/* Sparkles for energy */}
    <Sparkle cx="140" cy="40" size={8} delay={0.2} />
    <Sparkle cx="155" cy="70" size={6} delay={1} />
  </IllustrationWrapper>
);

/**
 * Stats - Chart/graph
 */
export const StatsIllustration = () => (
  <IllustrationWrapper>
    {/* Background glow */}
    <circle
      cx="100"
      cy="75"
      r="50"
      fill="url(#emptyBrandGlow)"
      opacity="0.1"
      filter="url(#emptyGlow)"
    />

    <Float duration={3}>
      {/* Chart axes */}
      <path
        d="M45 30 L45 120 L155 120"
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Grid lines */}
      <g opacity="0.1">
        <line x1="45" y1="60" x2="155" y2="60" stroke="rgba(255,255,255,1)" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="45" y1="90" x2="155" y2="90" stroke="rgba(255,255,255,1)" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="85" y1="30" x2="85" y2="120" stroke="rgba(255,255,255,1)" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="125" y1="30" x2="125" y2="120" stroke="rgba(255,255,255,1)" strokeWidth="1" strokeDasharray="4 4" />
      </g>

      {/* Empty bar placeholders */}
      <rect
        x="55"
        y="90"
        width="18"
        height="30"
        rx="2"
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1"
      />
      <rect
        x="85"
        y="70"
        width="18"
        height="50"
        rx="2"
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1"
      />
      <rect
        x="115"
        y="50"
        width="18"
        height="70"
        rx="2"
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1"
      />
    </Float>

    {/* Upward trend arrow (aspiration) */}
    <motion.g
      animate={{
        opacity: [0.3, 0.7, 0.3],
        y: [5, 0, 5],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <path
        d="M145 40 L145 55 M140 45 L145 40 L150 45"
        fill="none"
        stroke="var(--brand-blue-400, #0066FF)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.g>
  </IllustrationWrapper>
);

/**
 * Search - Magnifying glass with question mark
 */
export const SearchIllustration = () => (
  <IllustrationWrapper>
    {/* Background glow */}
    <circle
      cx="100"
      cy="75"
      r="45"
      fill="url(#emptyBrandGlow)"
      opacity="0.12"
      filter="url(#emptyGlow)"
    />

    <Float duration={3.5}>
      {/* Magnifying glass */}
      <g filter="url(#emptyBrandShadow)">
        {/* Glass circle */}
        <circle
          cx="90"
          cy="65"
          r="35"
          fill="url(#emptyGlassGradient)"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="3"
        />

        {/* Inner glass highlight */}
        <circle
          cx="82"
          cy="55"
          r="10"
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Handle */}
        <path
          d="M115 90 L145 120"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M115 90 L145 120"
          stroke="url(#emptyGlassGradient)"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>

      {/* Question mark inside glass */}
      <Pulse>
        <text
          x="90"
          y="75"
          textAnchor="middle"
          fontSize="28"
          fontWeight="600"
          fill="var(--brand-blue-400, #0066FF)"
          opacity="0.5"
        >
          ?
        </text>
      </Pulse>
    </Float>

    {/* Search lines radiating out */}
    <motion.g
      animate={{
        opacity: [0.2, 0.5, 0.2],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <line x1="130" y1="45" x2="145" y2="35" stroke="var(--brand-blue-400, #0066FF)" strokeWidth="2" strokeLinecap="round" />
      <line x1="140" y1="60" x2="158" y2="55" stroke="var(--brand-blue-400, #0066FF)" strokeWidth="2" strokeLinecap="round" />
    </motion.g>
  </IllustrationWrapper>
);

/**
 * Error - Warning/error symbol
 */
export const ErrorIllustration = () => (
  <IllustrationWrapper>
    {/* Background pulse glow (warning color) */}
    <circle
      cx="100"
      cy="75"
      r="50"
      fill="url(#emptyPulseGlow)"
      opacity="0.15"
      filter="url(#emptyGlow)"
    />

    <Float duration={3}>
      {/* Warning triangle */}
      <g filter="url(#emptyPulseShadow)">
        <path
          d="M100 25 L155 115 L45 115 Z"
          fill="url(#emptyGlassGradient)"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Inner triangle highlight */}
        <path
          d="M100 45 L130 100 L70 100 Z"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
      </g>

      {/* Exclamation mark */}
      <Pulse duration={1.5}>
        <rect
          x="95"
          y="50"
          width="10"
          height="30"
          rx="3"
          fill="var(--brand-pulse-400, #FF3366)"
          opacity="0.8"
        />
        <circle
          cx="100"
          cy="95"
          r="6"
          fill="var(--brand-pulse-400, #FF3366)"
          opacity="0.8"
        />
      </Pulse>
    </Float>

    {/* Small warning sparks */}
    <Sparkle cx="60" cy="40" size={6} delay={0.5} />
    <Sparkle cx="145" cy="55" size={8} delay={1.2} />
  </IllustrationWrapper>
);

/**
 * Data - Chart with no data points
 */
export const DataIllustration = () => (
  <IllustrationWrapper>
    {/* Background glow */}
    <circle
      cx="100"
      cy="75"
      r="50"
      fill="url(#emptyBrandGlow)"
      opacity="0.1"
      filter="url(#emptyGlow)"
    />

    <Float duration={3.5}>
      {/* Chart background */}
      <rect
        x="40"
        y="25"
        width="120"
        height="100"
        rx="8"
        fill="url(#emptyGlassGradient)"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1.5"
        filter="url(#emptyBrandShadow)"
      />

      {/* Chart axes */}
      <path
        d="M55 35 L55 110 L145 110"
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Grid lines */}
      <g opacity="0.1">
        <line x1="55" y1="55" x2="145" y2="55" stroke="rgba(255,255,255,1)" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="55" y1="75" x2="145" y2="75" stroke="rgba(255,255,255,1)" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="55" y1="95" x2="145" y2="95" stroke="rgba(255,255,255,1)" strokeWidth="1" strokeDasharray="4 4" />
      </g>

      {/* Empty data points (hollow circles) */}
      <g opacity="0.3">
        <circle cx="70" cy="85" r="4" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        <circle cx="90" cy="70" r="4" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        <circle cx="110" cy="80" r="4" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        <circle cx="130" cy="60" r="4" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      </g>

      {/* Dashed line connecting points (no data yet) */}
      <path
        d="M70 85 L90 70 L110 80 L130 60"
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1.5"
        strokeDasharray="5 5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Float>

    {/* Pulsing "no data" indicator */}
    <motion.g
      animate={{
        opacity: [0.4, 0.8, 0.4],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <text
        x="100"
        y="145"
        textAnchor="middle"
        fontSize="10"
        fill="rgba(255,255,255,0.4)"
        letterSpacing="1"
      >
        NO DATA
      </text>
    </motion.g>
  </IllustrationWrapper>
);

/**
 * Generic - Empty box with question mark
 */
export const GenericIllustration = () => (
  <IllustrationWrapper>
    {/* Background glow */}
    <circle
      cx="100"
      cy="75"
      r="45"
      fill="url(#emptyBrandGlow)"
      opacity="0.12"
      filter="url(#emptyGlow)"
    />

    <Float duration={3.5}>
      {/* Open box */}
      <g filter="url(#emptyBrandShadow)">
        {/* Box body */}
        <path
          d="M55 65 L55 115 L145 115 L145 65 L100 45 L55 65"
          fill="url(#emptyGlassGradient)"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Box flaps (open) */}
        <path
          d="M55 65 L40 55 L100 35 L100 45"
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.5"
        />
        <path
          d="M145 65 L160 55 L100 35 L100 45"
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.5"
        />
      </g>

      {/* Question mark */}
      <Pulse>
        <text
          x="100"
          y="95"
          textAnchor="middle"
          fontSize="32"
          fontWeight="600"
          fill="var(--brand-blue-400, #0066FF)"
          opacity="0.6"
        >
          ?
        </text>
      </Pulse>
    </Float>
  </IllustrationWrapper>
);

/**
 * Type-to-illustration mapping
 */
export const EMPTY_STATE_ILLUSTRATIONS = {
  workouts: WorkoutsIllustration,
  achievements: AchievementsIllustration,
  goals: GoalsIllustration,
  community: CommunityIllustration,
  messages: MessagesIllustration,
  exercises: ExercisesIllustration,
  stats: StatsIllustration,
  generic: GenericIllustration,
};

/**
 * Get illustration component by type
 */
export function getIllustrationByType(type) {
  const IllustrationComponent = EMPTY_STATE_ILLUSTRATIONS[type];
  return IllustrationComponent ? <IllustrationComponent /> : <GenericIllustration />;
}

export default EMPTY_STATE_ILLUSTRATIONS;
