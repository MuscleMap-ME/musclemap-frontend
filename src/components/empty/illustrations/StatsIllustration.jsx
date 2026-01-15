/**
 * StatsIllustration - Chart going up
 *
 * Used for: no-stats, no-data states
 */

import React from 'react';
import { motion } from 'framer-motion';
import { IllustrationWrapper, Float } from './shared';

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
        <line
          x1="45"
          y1="60"
          x2="155"
          y2="60"
          stroke="rgba(255,255,255,1)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        <line
          x1="45"
          y1="90"
          x2="155"
          y2="90"
          stroke="rgba(255,255,255,1)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        <line
          x1="85"
          y1="30"
          x2="85"
          y2="120"
          stroke="rgba(255,255,255,1)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        <line
          x1="125"
          y1="30"
          x2="125"
          y2="120"
          stroke="rgba(255,255,255,1)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      </g>

      {/* Bar placeholders with gradient fill */}
      <motion.rect
        x="55"
        y="90"
        width="18"
        height="30"
        rx="2"
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1"
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0 }}
      />
      <motion.rect
        x="85"
        y="70"
        width="18"
        height="50"
        rx="2"
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1"
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
      />
      <motion.rect
        x="115"
        y="50"
        width="18"
        height="70"
        rx="2"
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1"
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
      />
    </Float>

    {/* Upward trend arrow */}
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

export default StatsIllustration;
