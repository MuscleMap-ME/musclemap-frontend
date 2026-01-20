/**
 * HighStriker.tsx - PT Test Arena illustration
 *
 * A carnival high striker game representing fitness testing/challenges
 */

import React from 'react';

interface IllustrationProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export const HighStriker: React.FC<IllustrationProps> = ({ size = 80, className, animate = false }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* Shadow */}
      <ellipse cx="40" cy="76" rx="20" ry="4" fill="rgba(0,0,0,0.15)" />

      {/* Base platform */}
      <rect x="25" y="70" width="30" height="6" fill="#5D4037" rx="2" />

      {/* Main tower frame */}
      <rect x="35" y="8" width="10" height="65" fill="#E91E63" rx="1" />

      {/* Measurement track */}
      <rect x="37" y="10" width="6" height="58" fill="#C2185B" />

      {/* Level markers */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
        <g key={level}>
          <rect
            x="36"
            y={62 - level * 5.5}
            width="8"
            height="3"
            fill={level < 3 ? '#4CAF50' : level < 6 ? '#FFEB3B' : level < 9 ? '#FF9800' : '#F44336'}
            rx="1"
          />
        </g>
      ))}

      {/* Bell at top */}
      <g transform="translate(40, 5)">
        <ellipse cx="0" cy="5" rx="8" ry="3" fill="#FFD700" />
        <ellipse cx="0" cy="2" rx="6" ry="5" fill="#FFD700" />
        <ellipse cx="0" cy="1" rx="4" ry="3" fill="#FFF59D" />
        <circle cx="0" cy="6" r="1.5" fill="#F57F17" />
        {animate && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="-5 0 5; 5 0 5; -5 0 5"
            dur="0.3s"
            repeatCount="3"
          />
        )}
      </g>

      {/* "RING THE BELL" banner */}
      <rect x="22" y="12" width="36" height="8" fill="#1565C0" rx="2" />
      <text x="40" y="18" textAnchor="middle" fill="white" fontSize="5" fontWeight="bold">TEST</text>

      {/* Side decorative panels */}
      <rect x="28" y="25" width="6" height="40" fill="#9C27B0" rx="1" />
      <rect x="46" y="25" width="6" height="40" fill="#9C27B0" rx="1" />

      {/* Stars decoration on panels */}
      <polygon points="31,30 32,33 35,33 32.5,35 33.5,38 31,36 28.5,38 29.5,35 27,33 30,33" fill="#FFD700" transform="scale(0.6) translate(20,15)" />
      <polygon points="31,30 32,33 35,33 32.5,35 33.5,38 31,36 28.5,38 29.5,35 27,33 30,33" fill="#FFD700" transform="scale(0.6) translate(20,45)" />
      <polygon points="31,30 32,33 35,33 32.5,35 33.5,38 31,36 28.5,38 29.5,35 27,33 30,33" fill="#FFD700" transform="scale(0.6) translate(52,15)" />
      <polygon points="31,30 32,33 35,33 32.5,35 33.5,38 31,36 28.5,38 29.5,35 27,33 30,33" fill="#FFD700" transform="scale(0.6) translate(52,45)" />

      {/* Striker puck (the thing you hit) */}
      <g>
        {animate && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 0,-40; 0,0"
            dur="1.5s"
            repeatCount="indefinite"
          />
        )}
        <rect x="36" y="60" width="8" height="6" fill="#F44336" rx="1" />
        <rect x="37" y="61" width="6" height="4" fill="#FFCDD2" rx="1" />
      </g>

      {/* Hammer on the side */}
      <g transform="translate(58, 55) rotate(-30)">
        <rect x="0" y="0" width="4" height="18" fill="#8D6E63" rx="1" />
        <rect x="-2" y="-5" width="8" height="8" fill="#424242" rx="1" />
        <rect x="-1" y="-4" width="6" height="2" fill="#616161" />
      </g>

      {/* Prize indicator lights */}
      <circle cx="25" cy="68" r="2" fill="#FFEB3B" />
      <circle cx="55" cy="68" r="2" fill="#FFEB3B" />
    </svg>
  );
};

export default HighStriker;
