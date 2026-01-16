/**
 * GenericIllustration - Empty box with question mark
 *
 * Used for: generic empty states, coming-soon, no-favorites
 */

import React from 'react';
import { IllustrationWrapper, Float, Pulse } from './shared';

export const GenericIllustration = () => (
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
      {/* Open box */}
      <g filter="url(#emptyBrandShadow)">
        {/* Box body */}
        <path
          d="M55 65 L55 115 L145 115 L145 65 L100 45 L55 65"
          fill="url(#emptyGlassGradient)"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Box flaps (open) */}
        <path
          d="M55 65 L40 55 L100 35 L100 45"
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.5"
        />
        <path
          d="M145 65 L160 55 L100 35 L100 45"
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.5"
        />

        {/* Dashed open line */}
        <path
          d="M100 45 L100 35"
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
          strokeDasharray="3 2"
        />
      </g>

      {/* Question mark */}
      <Pulse>
        <text
          x="100"
          y="95"
          textAnchor="middle"
          fontSize="32"
          fontWeight="600"
          fill="var(--brand-blue-400, #0066FF)"
          opacity="0.6"
        >
          ?
        </text>
      </Pulse>
    </Float>
  </IllustrationWrapper>
);

export default GenericIllustration;
