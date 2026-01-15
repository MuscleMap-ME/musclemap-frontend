/**
 * WorkoutIllustration - Dumbbell with sparkles
 *
 * Used for: no-workouts, no-history states
 */

import React from 'react';
import { IllustrationWrapper, Float, Sparkle } from './shared';

export const WorkoutIllustration = () => (
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

export default WorkoutIllustration;
