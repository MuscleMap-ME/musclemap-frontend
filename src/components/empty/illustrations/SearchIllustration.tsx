/**
 * SearchIllustration - Magnifying glass
 *
 * Used for: no-results, no-exercises states
 */

import React from 'react';
import { motion } from 'framer-motion';
import { IllustrationWrapper, Float, Pulse } from './shared';

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
      <line
        x1="130"
        y1="45"
        x2="145"
        y2="35"
        stroke="var(--brand-blue-400, #0066FF)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="140"
        y1="60"
        x2="158"
        y2="55"
        stroke="var(--brand-blue-400, #0066FF)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="55"
        y1="40"
        x2="40"
        y2="35"
        stroke="var(--brand-blue-400, #0066FF)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </motion.g>
  </IllustrationWrapper>
);

export default SearchIllustration;
