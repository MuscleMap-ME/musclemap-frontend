/**
 * AchievementIllustration - Trophy with rays
 *
 * Used for: no-achievements, no-competitions states
 */

import React from 'react';
import { motion } from 'framer-motion';
import { IllustrationWrapper, Float } from './shared';

export const AchievementIllustration = () => (
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

    {/* Radiating rays */}
    <motion.g
      animate={{
        opacity: [0.2, 0.5, 0.2],
        scale: [0.95, 1.05, 0.95],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 100 + 50 * Math.sin(rad);
        const y1 = 70 - 50 * Math.cos(rad);
        const x2 = 100 + 65 * Math.sin(rad);
        const y2 = 70 - 65 * Math.cos(rad);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--brand-pulse-400, #FF3366)"
            strokeWidth={deg % 90 === 0 ? 2 : 1}
            strokeLinecap="round"
            opacity={0.4}
          />
        );
      })}
    </motion.g>

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

export default AchievementIllustration;
