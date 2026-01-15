/**
 * MessagesIllustration - Chat bubbles
 *
 * Used for: no-messages, no-notifications states
 */

import React from 'react';
import { IllustrationWrapper, Float, Pulse } from './shared';

export const MessagesIllustration = () => (
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

    <Float duration={3}>
      {/* Main chat bubble */}
      <path
        d="M55 40 Q55 30 65 30 L135 30 Q145 30 145 40 L145 85 Q145 95 135 95 L85 95 L70 115 L70 95 L65 95 Q55 95 55 85 Z"
        fill="url(#emptyGlassGradient)"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="2"
        filter="url(#emptyBrandShadow)"
      />

      {/* Typing indicator dots */}
      <Pulse duration={1.5} delay={0}>
        <circle cx="80" cy="62" r="5" fill="rgba(255,255,255,0.2)" />
      </Pulse>
      <Pulse duration={1.5} delay={0.3}>
        <circle cx="100" cy="62" r="5" fill="rgba(255,255,255,0.3)" />
      </Pulse>
      <Pulse duration={1.5} delay={0.6}>
        <circle cx="120" cy="62" r="5" fill="rgba(255,255,255,0.2)" />
      </Pulse>
    </Float>

    {/* Secondary bubble (faded, behind) */}
    <path
      d="M150 105 Q150 100 155 100 L175 100 Q180 100 180 105 L180 125 Q180 130 175 130 L165 130 L160 140 L160 130 L155 130 Q150 130 150 125 Z"
      fill="rgba(255,255,255,0.05)"
      stroke="rgba(255,255,255,0.1)"
      strokeWidth="1"
      opacity="0.5"
    />
  </IllustrationWrapper>
);

export default MessagesIllustration;
