/**
 * ExercisesIllustration - Figure in motion
 *
 * Used for: no-exercises states
 */

import React from 'react';
import { IllustrationWrapper, Float, Sparkle } from './shared';

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
        <line
          x1="55"
          y1="50"
          x2="45"
          y2="50"
          stroke="var(--brand-blue-400, #0066FF)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="58"
          y1="65"
          x2="48"
          y2="65"
          stroke="var(--brand-blue-400, #0066FF)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="60"
          y1="80"
          x2="50"
          y2="80"
          stroke="var(--brand-blue-400, #0066FF)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </Float>

    {/* Sparkles for energy */}
    <Sparkle cx="140" cy="40" size={8} delay={0.2} />
    <Sparkle cx="155" cy="70" size={6} delay={1} />
  </IllustrationWrapper>
);

export default ExercisesIllustration;
