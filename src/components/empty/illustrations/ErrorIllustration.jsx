/**
 * ErrorIllustration - Warning sign
 *
 * Used for: error, offline, maintenance states
 */

import React from 'react';
import { IllustrationWrapper, Float, Pulse, Sparkle } from './shared';

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
    <Sparkle cx="60" cy="40" size={6} delay={0.5} color="var(--brand-pulse-400, #FF3366)" />
    <Sparkle cx="145" cy="55" size={8} delay={1.2} color="var(--brand-pulse-400, #FF3366)" />
  </IllustrationWrapper>
);

export default ErrorIllustration;
