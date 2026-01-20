/**
 * TargetGame.tsx - Goals Garden illustration
 *
 * An archery/target game booth for setting and hitting goals
 */

import React from 'react';

interface IllustrationProps {
  size?: number;
  className?: string;
}

export const TargetGame: React.FC<IllustrationProps> = ({ size = 80, className }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* Shadow */}
      <ellipse cx="40" cy="75" rx="30" ry="5" fill="rgba(0,0,0,0.15)" />

      {/* Ground/Platform */}
      <rect x="8" y="68" width="64" height="8" fill="#8D6E63" rx="2" />
      <rect x="10" y="66" width="60" height="4" fill="#A1887F" rx="1" />

      {/* Booth back wall */}
      <rect x="12" y="30" width="56" height="38" fill="#4CAF50" rx="2" />

      {/* Stripes on wall */}
      <rect x="12" y="35" width="56" height="6" fill="#66BB6A" />
      <rect x="12" y="47" width="56" height="6" fill="#66BB6A" />
      <rect x="12" y="59" width="56" height="6" fill="#66BB6A" />

      {/* Awning */}
      <path
        d="M 8 32 Q 40 22 72 32 L 72 38 L 8 38 Z"
        fill="#F44336"
      />
      <path
        d="M 8 32 Q 24 26 40 32 Q 56 26 72 32"
        fill="none"
        stroke="#FFCDD2"
        strokeWidth="8"
        strokeDasharray="5 5"
        opacity="0.5"
      />
      {/* Scalloped edge */}
      <path
        d="M 8 38 Q 12 42 16 38 Q 20 42 24 38 Q 28 42 32 38 Q 36 42 40 38 Q 44 42 48 38 Q 52 42 56 38 Q 60 42 64 38 Q 68 42 72 38"
        fill="#C62828"
      />

      {/* Main target */}
      <g transform="translate(40, 52)">
        {/* Target stand */}
        <rect x="-3" y="10" width="6" height="15" fill="#5D4037" />
        {/* Target rings */}
        <circle cx="0" cy="0" r="16" fill="#FFFFFF" />
        <circle cx="0" cy="0" r="13" fill="#F44336" />
        <circle cx="0" cy="0" r="10" fill="#FFFFFF" />
        <circle cx="0" cy="0" r="7" fill="#F44336" />
        <circle cx="0" cy="0" r="4" fill="#FFFFFF" />
        <circle cx="0" cy="0" r="2" fill="#FFD700" />
        {/* Arrow in bullseye */}
        <line x1="-12" y1="-8" x2="0" y2="0" stroke="#8D6E63" strokeWidth="2" />
        <polygon points="0,0 -3,-2 -3,2" fill="#9E9E9E" />
        <polygon points="-12,-8 -14,-10 -14,-6 -10,-8" fill="#F44336" />
      </g>

      {/* Side targets (smaller) */}
      <g transform="translate(18, 50)">
        <circle cx="0" cy="0" r="8" fill="#FFFFFF" />
        <circle cx="0" cy="0" r="6" fill="#2196F3" />
        <circle cx="0" cy="0" r="4" fill="#FFFFFF" />
        <circle cx="0" cy="0" r="2" fill="#2196F3" />
      </g>

      <g transform="translate(62, 50)">
        <circle cx="0" cy="0" r="8" fill="#FFFFFF" />
        <circle cx="0" cy="0" r="6" fill="#4CAF50" />
        <circle cx="0" cy="0" r="4" fill="#FFFFFF" />
        <circle cx="0" cy="0" r="2" fill="#4CAF50" />
      </g>

      {/* Prize shelf */}
      <rect x="14" y="58" width="52" height="3" fill="#5D4037" />

      {/* Prizes on shelf */}
      {/* Stuffed bear */}
      <g transform="translate(20, 52)">
        <ellipse cx="0" cy="4" rx="3" ry="4" fill="#A1887F" />
        <circle cx="0" cy="0" r="2.5" fill="#A1887F" />
        <circle cx="-1" cy="-0.5" r="0.5" fill="#3E2723" />
        <circle cx="1" cy="-0.5" r="0.5" fill="#3E2723" />
        <ellipse cx="0" cy="1" rx="1" ry="0.5" fill="#3E2723" />
      </g>

      {/* Star prize */}
      <polygon points="55,52 56,55 59,55 57,57 58,60 55,58 52,60 53,57 51,55 54,55" fill="#FFD700" />

      {/* Balloon prizes */}
      <g transform="translate(30, 48)">
        <ellipse cx="0" cy="0" rx="3" ry="4" fill="#E91E63" />
        <line x1="0" y1="4" x2="0" y2="10" stroke="#9E9E9E" strokeWidth="0.5" />
      </g>
      <g transform="translate(48, 46)">
        <ellipse cx="0" cy="0" rx="3" ry="4" fill="#9C27B0" />
        <line x1="0" y1="4" x2="0" y2="12" stroke="#9E9E9E" strokeWidth="0.5" />
      </g>

      {/* "GOALS" sign */}
      <rect x="28" y="24" width="24" height="8" fill="#FFD700" rx="2" />
      <text x="40" y="30" textAnchor="middle" fill="#5D4037" fontSize="6" fontWeight="bold">GOALS</text>

      {/* Decorative lights */}
      <circle cx="15" cy="30" r="2" fill="#FFEB3B" />
      <circle cx="28" cy="27" r="2" fill="#FF9800" />
      <circle cx="52" cy="27" r="2" fill="#FFEB3B" />
      <circle cx="65" cy="30" r="2" fill="#FF9800" />

      {/* Counter */}
      <rect x="10" y="62" width="60" height="6" fill="#8D6E63" rx="1" />
      <rect x="12" y="63" width="56" height="4" fill="#A1887F" rx="1" />

      {/* Bow on counter */}
      <g transform="translate(65, 60)">
        <path d="M 0 8 Q -5 4 0 0 Q 5 4 0 8" fill="none" stroke="#5D4037" strokeWidth="2" />
        <line x1="0" y1="8" x2="0" y2="0" stroke="#8D6E63" strokeWidth="1" />
      </g>
    </svg>
  );
};

export default TargetGame;
