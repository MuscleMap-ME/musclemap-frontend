/**
 * RollerCoaster.tsx - Workout/Training area illustration
 *
 * A thrilling roller coaster representing the workout experience
 */

import React from 'react';

interface IllustrationProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export const RollerCoaster: React.FC<IllustrationProps> = ({ size = 80, className, animate = false }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* Shadow */}
      <ellipse cx="40" cy="76" rx="35" ry="5" fill="rgba(0,0,0,0.15)" />

      {/* Track support beams */}
      <line x1="15" y1="70" x2="20" y2="45" stroke="#5D4037" strokeWidth="3" />
      <line x1="30" y1="70" x2="35" y2="25" stroke="#5D4037" strokeWidth="3" />
      <line x1="45" y1="70" x2="45" y2="15" stroke="#5D4037" strokeWidth="3" />
      <line x1="60" y1="70" x2="55" y2="30" stroke="#5D4037" strokeWidth="3" />
      <line x1="72" y1="70" x2="68" y2="50" stroke="#5D4037" strokeWidth="3" />

      {/* Cross-bracing */}
      <line x1="18" y1="55" x2="32" y2="35" stroke="#8D6E63" strokeWidth="1.5" />
      <line x1="33" y1="45" x2="45" y2="25" stroke="#8D6E63" strokeWidth="1.5" />
      <line x1="45" y1="35" x2="57" y2="45" stroke="#8D6E63" strokeWidth="1.5" />
      <line x1="56" y1="50" x2="68" y2="58" stroke="#8D6E63" strokeWidth="1.5" />

      {/* Main track - curved path */}
      <path
        d="M 8 60 Q 20 45 35 25 Q 45 10 50 15 Q 58 22 55 35 Q 52 48 65 55 Q 75 60 78 58"
        fill="none"
        stroke="#E53935"
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* Track rails detail */}
      <path
        d="M 8 60 Q 20 45 35 25 Q 45 10 50 15 Q 58 22 55 35 Q 52 48 65 55 Q 75 60 78 58"
        fill="none"
        stroke="#FFCDD2"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="8 4"
      />

      {/* Roller coaster cart */}
      <g transform={animate ? "translate(0,0)" : "translate(0,0)"}>
        {animate && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 3,-3; 0,0; -3,3; 0,0"
            dur="1.5s"
            repeatCount="indefinite"
          />
        )}
        {/* Cart body */}
        <rect x="32" y="16" width="16" height="12" fill="#1565C0" rx="3" />
        <rect x="34" y="18" width="12" height="4" fill="#64B5F6" rx="1" />

        {/* Wheels */}
        <circle cx="35" cy="29" r="2.5" fill="#424242" />
        <circle cx="45" cy="29" r="2.5" fill="#424242" />

        {/* Passenger silhouettes */}
        <ellipse cx="37" cy="21" rx="2" ry="2.5" fill="#FFE082" />
        <ellipse cx="43" cy="21" rx="2" ry="2.5" fill="#FFE082" />

        {/* Safety bar */}
        <path
          d="M 34 22 Q 40 26 46 22"
          fill="none"
          stroke="#FFC107"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* Entrance booth */}
      <rect x="4" y="58" width="14" height="14" fill="#7B1FA2" rx="2" />
      <rect x="6" y="60" width="10" height="6" fill="#E1BEE7" rx="1" />
      <polygon points="4,58 11,52 18,58" fill="#9C27B0" />

      {/* Loop decoration on right */}
      <circle cx="65" cy="42" r="8" fill="none" stroke="#E53935" strokeWidth="4" />
      <circle cx="65" cy="42" r="8" fill="none" stroke="#FFCDD2" strokeWidth="1.5" strokeDasharray="4 3" />

      {/* Stars/sparkles for excitement */}
      <polygon points="72,20 73,23 76,23 74,25 75,28 72,26 69,28 70,25 68,23 71,23" fill="#FFD700" />
      <polygon points="18,30 19,32 21,32 20,33 20.5,35 18,34 15.5,35 16,33 15,32 17,32" fill="#FFD700" />
    </svg>
  );
};

export default RollerCoaster;
