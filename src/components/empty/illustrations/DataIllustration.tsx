/**
 * DataIllustration - Chart with no data points
 *
 * Used for: no-data states
 */

import React from 'react';
import { motion } from 'framer-motion';
import { IllustrationWrapper, Float } from './shared';

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
      {/* Chart background card */}
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
        <line
          x1="55"
          y1="55"
          x2="145"
          y2="55"
          stroke="rgba(255,255,255,1)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        <line
          x1="55"
          y1="75"
          x2="145"
          y2="75"
          stroke="rgba(255,255,255,1)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        <line
          x1="55"
          y1="95"
          x2="145"
          y2="95"
          stroke="rgba(255,255,255,1)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      </g>

      {/* Empty data points (hollow circles) */}
      <g opacity="0.3">
        <circle
          cx="70"
          cy="85"
          r="4"
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1.5"
        />
        <circle
          cx="90"
          cy="70"
          r="4"
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1.5"
        />
        <circle
          cx="110"
          cy="80"
          r="4"
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1.5"
        />
        <circle
          cx="130"
          cy="60"
          r="4"
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1.5"
        />
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

export default DataIllustration;
