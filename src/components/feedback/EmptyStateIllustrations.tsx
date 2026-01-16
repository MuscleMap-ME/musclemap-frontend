/**
 * EmptyStateIllustrations - Bioluminescent SVG illustrations
 *
 * These illustrations match MuscleMap's liquid glass / visionOS aesthetic
 * with subtle glow effects and brand colors.
 */

import React from 'react';

/**
 * Base wrapper for all illustrations with consistent sizing and glow
 */
const IllustrationWrapper = ({ children, className = '' }) => (
  <svg
    viewBox="0 0 200 200"
    className={`w-full h-full ${className}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      {/* Gradient definitions for bioluminescent effects */}
      <linearGradient id="brandGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--brand-blue-400)" stopOpacity="0.8" />
        <stop offset="100%" stopColor="var(--brand-blue-600)" stopOpacity="0.4" />
      </linearGradient>
      <linearGradient id="pulseGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--brand-pulse-400)" stopOpacity="0.6" />
        <stop offset="100%" stopColor="var(--brand-pulse-600)" stopOpacity="0.3" />
      </linearGradient>
      <linearGradient id="glassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
      </linearGradient>

      {/* Glow filter */}
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Soft glow for brand elements */}
      <filter id="brandShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#0066FF" floodOpacity="0.4" />
      </filter>

      {/* Pulse glow */}
      <filter id="pulseShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#FF3366" floodOpacity="0.3" />
      </filter>
    </defs>
    {children}
  </svg>
);

/**
 * No Workouts - Empty barbell with fading effect
 */
export const NoWorkoutsIllustration = () => (
  <IllustrationWrapper>
    {/* Background glow orb */}
    <circle
      cx="100"
      cy="100"
      r="70"
      fill="url(#brandGlow)"
      opacity="0.15"
      filter="url(#glow)"
    />

    {/* Barbell bar */}
    <rect
      x="40"
      y="96"
      width="120"
      height="8"
      rx="4"
      fill="url(#glassGradient)"
      stroke="rgba(255,255,255,0.2)"
      strokeWidth="1"
      filter="url(#brandShadow)"
    />

    {/* Left weight (faded) */}
    <rect
      x="30"
      y="70"
      width="20"
      height="60"
      rx="4"
      fill="rgba(255,255,255,0.08)"
      stroke="rgba(255,255,255,0.15)"
      strokeWidth="1"
      opacity="0.5"
    />

    {/* Right weight (faded) */}
    <rect
      x="150"
      y="70"
      width="20"
      height="60"
      rx="4"
      fill="rgba(255,255,255,0.08)"
      stroke="rgba(255,255,255,0.15)"
      strokeWidth="1"
      opacity="0.5"
    />

    {/* Plus icon in center */}
    <g filter="url(#glow)" opacity="0.8">
      <line
        x1="100"
        y1="145"
        x2="100"
        y2="175"
        stroke="var(--brand-blue-400)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1="85"
        y1="160"
        x2="115"
        y2="160"
        stroke="var(--brand-blue-400)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </g>
  </IllustrationWrapper>
);

/**
 * No Achievements - Empty trophy outline
 */
export const NoAchievementsIllustration = () => (
  <IllustrationWrapper>
    {/* Background pulse glow */}
    <circle
      cx="100"
      cy="90"
      r="60"
      fill="url(#pulseGlow)"
      opacity="0.15"
      filter="url(#glow)"
    />

    {/* Trophy cup */}
    <path
      d="M70 60 L70 100 Q70 130 100 140 Q130 130 130 100 L130 60"
      fill="url(#glassGradient)"
      stroke="rgba(255,255,255,0.2)"
      strokeWidth="2"
      filter="url(#pulseShadow)"
    />

    {/* Left handle */}
    <path
      d="M70 70 Q45 70 45 90 Q45 110 70 100"
      fill="none"
      stroke="rgba(255,255,255,0.15)"
      strokeWidth="2"
    />

    {/* Right handle */}
    <path
      d="M130 70 Q155 70 155 90 Q155 110 130 100"
      fill="none"
      stroke="rgba(255,255,255,0.15)"
      strokeWidth="2"
    />

    {/* Trophy base */}
    <rect
      x="85"
      y="145"
      width="30"
      height="8"
      rx="2"
      fill="url(#glassGradient)"
      stroke="rgba(255,255,255,0.15)"
      strokeWidth="1"
    />
    <rect
      x="80"
      y="155"
      width="40"
      height="6"
      rx="2"
      fill="url(#glassGradient)"
      stroke="rgba(255,255,255,0.15)"
      strokeWidth="1"
    />

    {/* Star outline (empty) */}
    <path
      d="M100 75 L105 90 L120 90 L108 100 L112 115 L100 107 L88 115 L92 100 L80 90 L95 90 Z"
      fill="none"
      stroke="rgba(255,255,255,0.3)"
      strokeWidth="1.5"
      strokeLinejoin="round"
      opacity="0.6"
    />
  </IllustrationWrapper>
);

/**
 * No Messages - Empty chat bubble
 */
export const NoMessagesIllustration = () => (
  <IllustrationWrapper>
    {/* Background glow */}
    <circle
      cx="100"
      cy="95"
      r="55"
      fill="url(#brandGlow)"
      opacity="0.12"
      filter="url(#glow)"
    />

    {/* Chat bubble */}
    <path
      d="M55 65 Q55 50 70 50 L130 50 Q145 50 145 65 L145 115 Q145 130 130 130 L90 130 L75 150 L75 130 L70 130 Q55 130 55 115 Z"
      fill="url(#glassGradient)"
      stroke="rgba(255,255,255,0.2)"
      strokeWidth="2"
      filter="url(#brandShadow)"
    />

    {/* Typing dots (faded) */}
    <circle cx="80" cy="90" r="5" fill="rgba(255,255,255,0.15)" />
    <circle cx="100" cy="90" r="5" fill="rgba(255,255,255,0.2)" />
    <circle cx="120" cy="90" r="5" fill="rgba(255,255,255,0.15)" />
  </IllustrationWrapper>
);

/**
 * No Friends - Empty user circle with plus
 */
export const NoFriendsIllustration = () => (
  <IllustrationWrapper>
    {/* Background glow */}
    <circle
      cx="100"
      cy="90"
      r="60"
      fill="url(#brandGlow)"
      opacity="0.12"
      filter="url(#glow)"
    />

    {/* Main user outline (center) */}
    <circle
      cx="100"
      cy="75"
      r="22"
      fill="url(#glassGradient)"
      stroke="rgba(255,255,255,0.25)"
      strokeWidth="2"
      filter="url(#brandShadow)"
    />
    <path
      d="M65 145 Q65 115 100 115 Q135 115 135 145"
      fill="url(#glassGradient)"
      stroke="rgba(255,255,255,0.25)"
      strokeWidth="2"
    />

    {/* Ghost users on sides (very faded) */}
    <g opacity="0.3">
      <circle cx="45" cy="90" r="12" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <path d="M30 130 Q30 110 45 110 Q60 110 60 130" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
    </g>
    <g opacity="0.3">
      <circle cx="155" cy="90" r="12" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <path d="M140 130 Q140 110 155 110 Q170 110 170 130" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
    </g>

    {/* Plus icon */}
    <g filter="url(#glow)" opacity="0.9">
      <circle cx="130" cy="130" r="16" fill="var(--brand-blue-500)" opacity="0.3" />
      <line x1="130" y1="122" x2="130" y2="138" stroke="var(--brand-blue-400)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="122" y1="130" x2="138" y2="130" stroke="var(--brand-blue-400)" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  </IllustrationWrapper>
);

/**
 * No Data - Empty chart/graph
 */
export const NoDataIllustration = () => (
  <IllustrationWrapper>
    {/* Background glow */}
    <circle
      cx="100"
      cy="100"
      r="60"
      fill="url(#brandGlow)"
      opacity="0.1"
      filter="url(#glow)"
    />

    {/* Chart axes */}
    <path
      d="M50 50 L50 150 L150 150"
      fill="none"
      stroke="rgba(255,255,255,0.2)"
      strokeWidth="2"
      strokeLinecap="round"
    />

    {/* Grid lines (very subtle) */}
    <line x1="50" y1="100" x2="150" y2="100" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 4" />
    <line x1="100" y1="50" x2="100" y2="150" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 4" />

    {/* Empty bar placeholders */}
    <rect x="65" y="120" width="15" height="30" rx="2" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
    <rect x="90" y="105" width="15" height="45" rx="2" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
    <rect x="115" y="90" width="15" height="60" rx="2" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

    {/* Question mark overlay */}
    <g filter="url(#brandShadow)" opacity="0.6">
      <text
        x="100"
        y="90"
        textAnchor="middle"
        fontSize="40"
        fontWeight="600"
        fill="var(--brand-blue-400)"
        opacity="0.5"
      >
        ?
      </text>
    </g>
  </IllustrationWrapper>
);

/**
 * Error - Broken circle / warning
 */
export const ErrorIllustration = () => (
  <IllustrationWrapper>
    {/* Red warning glow */}
    <circle
      cx="100"
      cy="100"
      r="55"
      fill="url(#pulseGlow)"
      opacity="0.2"
      filter="url(#glow)"
    />

    {/* Broken circle */}
    <path
      d="M100 45 A55 55 0 1 1 55 75"
      fill="none"
      stroke="rgba(255,255,255,0.15)"
      strokeWidth="4"
      strokeLinecap="round"
      strokeDasharray="10 5"
    />

    {/* Warning triangle */}
    <path
      d="M100 65 L135 125 L65 125 Z"
      fill="url(#glassGradient)"
      stroke="rgba(255,51,102,0.4)"
      strokeWidth="2"
      strokeLinejoin="round"
      filter="url(#pulseShadow)"
    />

    {/* Exclamation mark */}
    <line
      x1="100"
      y1="82"
      x2="100"
      y2="105"
      stroke="var(--brand-pulse-400)"
      strokeWidth="4"
      strokeLinecap="round"
    />
    <circle
      cx="100"
      cy="115"
      r="3"
      fill="var(--brand-pulse-400)"
    />
  </IllustrationWrapper>
);

/**
 * Coming Soon - Clock/hourglass with sparkle
 */
export const ComingSoonIllustration = () => (
  <IllustrationWrapper>
    {/* Sparkle glow background */}
    <circle
      cx="100"
      cy="100"
      r="60"
      fill="url(#brandGlow)"
      opacity="0.12"
      filter="url(#glow)"
    />

    {/* Clock face */}
    <circle
      cx="100"
      cy="100"
      r="50"
      fill="url(#glassGradient)"
      stroke="rgba(255,255,255,0.2)"
      strokeWidth="2"
      filter="url(#brandShadow)"
    />

    {/* Clock center */}
    <circle cx="100" cy="100" r="4" fill="var(--brand-blue-400)" />

    {/* Clock hands */}
    <line
      x1="100"
      y1="100"
      x2="100"
      y2="70"
      stroke="rgba(255,255,255,0.5)"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <line
      x1="100"
      y1="100"
      x2="125"
      y2="100"
      stroke="rgba(255,255,255,0.3)"
      strokeWidth="2"
      strokeLinecap="round"
    />

    {/* Hour markers */}
    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => {
      const rad = (deg * Math.PI) / 180;
      const x1 = 100 + 42 * Math.sin(rad);
      const y1 = 100 - 42 * Math.cos(rad);
      const x2 = 100 + 47 * Math.sin(rad);
      const y2 = 100 - 47 * Math.cos(rad);
      return (
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={deg % 90 === 0 ? 2 : 1}
          strokeLinecap="round"
        />
      );
    })}

    {/* Sparkles */}
    <g filter="url(#glow)" opacity="0.8">
      {/* Top right sparkle */}
      <path
        d="M155 55 L158 60 L163 57 L158 62 L163 65 L158 64 L155 69 L152 64 L147 65 L152 62 L147 57 L152 60 Z"
        fill="var(--brand-blue-400)"
      />
      {/* Bottom left sparkle */}
      <path
        d="M45 140 L47 143 L51 141 L48 145 L51 148 L47 147 L45 151 L43 147 L39 148 L42 145 L39 141 L43 143 Z"
        fill="var(--brand-pulse-400)"
        opacity="0.7"
      />
    </g>
  </IllustrationWrapper>
);

/**
 * Map of illustration keys to components
 */
export const ILLUSTRATION_MAP = {
  'no-workouts': NoWorkoutsIllustration,
  'no-achievements': NoAchievementsIllustration,
  'no-messages': NoMessagesIllustration,
  'no-friends': NoFriendsIllustration,
  'no-data': NoDataIllustration,
  'error': ErrorIllustration,
  'coming-soon': ComingSoonIllustration,
};

/**
 * Get illustration component by key or return custom node
 */
export function getIllustration(illustration) {
  if (typeof illustration === 'string') {
    const IllustrationComponent = ILLUSTRATION_MAP[illustration];
    return IllustrationComponent ? <IllustrationComponent /> : null;
  }
  // If it's a React node, return as-is
  return illustration;
}

export default ILLUSTRATION_MAP;
