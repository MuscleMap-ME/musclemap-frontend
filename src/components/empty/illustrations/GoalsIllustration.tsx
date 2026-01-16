/**
 * GoalsIllustration - Target with arrow
 *
 * Used for: no-goals states
 */

import React from 'react';
import { motion } from 'framer-motion';
import { IllustrationWrapper, Float, Pulse } from './shared';

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
      {/* Arrow shaft */}
      <path
        d="M30 75 L55 75"
        fill="none"
        stroke="var(--brand-blue-400, #0066FF)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Arrow head */}
      <path
        d="M50 70 L60 75 L50 80"
        fill="none"
        stroke="var(--brand-blue-400, #0066FF)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Arrow fletching */}
      <path
        d="M25 70 L30 75 L25 80"
        fill="none"
        stroke="var(--brand-blue-400, #0066FF)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
    </motion.g>
  </IllustrationWrapper>
);

export default GoalsIllustration;
