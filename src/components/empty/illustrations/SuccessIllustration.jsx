/**
 * SuccessIllustration - Checkmark with celebration
 *
 * Used for: success, completed states
 */

import React from 'react';
import { motion } from 'framer-motion';
import { IllustrationWrapper, Float, Sparkle } from './shared';

export const SuccessIllustration = () => (
  <IllustrationWrapper>
    {/* Background success glow */}
    <circle
      cx="100"
      cy="75"
      r="50"
      fill="url(#emptySuccessGlow)"
      opacity="0.15"
      filter="url(#emptyGlow)"
    />

    {/* Celebration particles */}
    <motion.g
      animate={{
        opacity: [0.3, 0.7, 0.3],
        scale: [0.95, 1.05, 0.95],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {/* Confetti-like dots */}
      <circle cx="45" cy="45" r="3" fill="var(--brand-blue-400, #0066FF)" opacity="0.6" />
      <circle cx="155" cy="50" r="2.5" fill="var(--success-400, #22C55E)" opacity="0.7" />
      <circle cx="40" cy="100" r="2" fill="var(--brand-pulse-400, #FF3366)" opacity="0.5" />
      <circle cx="160" cy="95" r="2.5" fill="var(--brand-blue-400, #0066FF)" opacity="0.6" />
      <circle cx="60" cy="130" r="2" fill="var(--success-400, #22C55E)" opacity="0.5" />
      <circle cx="145" cy="125" r="3" fill="var(--brand-pulse-400, #FF3366)" opacity="0.4" />
    </motion.g>

    <Float duration={3}>
      {/* Main circle */}
      <g filter="url(#emptySuccessShadow)">
        <circle
          cx="100"
          cy="75"
          r="40"
          fill="url(#emptyGlassGradient)"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="3"
        />

        {/* Inner glow ring */}
        <circle
          cx="100"
          cy="75"
          r="35"
          fill="none"
          stroke="var(--success-400, #22C55E)"
          strokeWidth="2"
          opacity="0.3"
        />
      </g>

      {/* Animated checkmark */}
      <motion.path
        d="M75 75 L92 92 L125 55"
        fill="none"
        stroke="var(--success-400, #22C55E)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          pathLength: { duration: 0.8, ease: 'easeOut' },
          opacity: { duration: 0.3 },
        }}
      />
    </Float>

    {/* Sparkles around */}
    <Sparkle cx="55" cy="35" size={8} delay={0} color="var(--success-400, #22C55E)" />
    <Sparkle cx="150" cy="45" size={10} delay={0.5} color="var(--success-400, #22C55E)" />
    <Sparkle cx="145" cy="110" size={7} delay={1} color="var(--brand-blue-400, #0066FF)" />
    <Sparkle cx="50" cy="105" size={6} delay={1.5} color="var(--success-400, #22C55E)" />
  </IllustrationWrapper>
);

export default SuccessIllustration;
