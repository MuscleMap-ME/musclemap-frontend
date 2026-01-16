/**
 * CommunityIllustration - Group of people silhouettes
 *
 * Used for: no-community, no-crews, empty-feed states
 */

import React from 'react';
import { motion } from 'framer-motion';
import { IllustrationWrapper, Float } from './shared';

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
      <line
        x1="65"
        y1="85"
        x2="80"
        y2="80"
        stroke="var(--brand-blue-400, #0066FF)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <line
        x1="135"
        y1="85"
        x2="120"
        y2="80"
        stroke="var(--brand-blue-400, #0066FF)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
    </motion.g>
  </IllustrationWrapper>
);

export default CommunityIllustration;
