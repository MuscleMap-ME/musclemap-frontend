/**
 * GiftShop.tsx - Skins/Collection illustration
 *
 * A colorful gift shop for customization items
 */

import React from 'react';

interface IllustrationProps {
  size?: number;
  className?: string;
}

export const GiftShop: React.FC<IllustrationProps> = ({ size = 80, className }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* Shadow */}
      <ellipse cx="40" cy="75" rx="28" ry="5" fill="rgba(0,0,0,0.15)" />

      {/* Base */}
      <rect x="10" y="68" width="60" height="7" fill="#5D4037" rx="2" />

      {/* Shop building */}
      <rect x="12" y="32" width="56" height="38" fill="#E91E63" rx="3" />

      {/* Window display area */}
      <rect x="16" y="38" width="48" height="26" fill="#FCE4EC" rx="2" />
      <rect x="18" y="40" width="44" height="22" fill="#F8BBD9" rx="1" />

      {/* Display dividers */}
      <line x1="40" y1="40" x2="40" y2="62" stroke="#E91E63" strokeWidth="2" />

      {/* Left display - T-shirts */}
      <g transform="translate(26, 48)">
        <path d="M -6 0 L -8 -4 L -4 -4 L -4 -8 L 4 -8 L 4 -4 L 8 -4 L 6 0 L 6 8 L -6 8 Z" fill="#2196F3" />
        <circle cx="0" cy="-2" r="2" fill="#64B5F6" />
      </g>
      <g transform="translate(32, 55)">
        <path d="M -4 0 L -6 -3 L -3 -3 L -3 -6 L 3 -6 L 3 -3 L 6 -3 L 4 0 L 4 6 L -4 6 Z" fill="#4CAF50" />
      </g>

      {/* Right display - gift boxes */}
      <g transform="translate(50, 48)">
        <rect x="-6" y="-4" width="12" height="10" fill="#9C27B0" rx="1" />
        <rect x="-7" y="-5" width="14" height="2" fill="#E1BEE7" rx="0.5" />
        <line x1="0" y1="-5" x2="0" y2="6" stroke="#E1BEE7" strokeWidth="2" />
        {/* Bow */}
        <ellipse cx="-3" cy="-6" rx="2" ry="1.5" fill="#FFD700" />
        <ellipse cx="3" cy="-6" rx="2" ry="1.5" fill="#FFD700" />
        <circle cx="0" cy="-6" r="1.5" fill="#FFC107" />
      </g>
      <g transform="translate(55, 56)">
        <rect x="-4" y="-2" width="8" height="6" fill="#FF9800" rx="1" />
        <line x1="0" y1="-2" x2="0" y2="4" stroke="#FFCC80" strokeWidth="1.5" />
      </g>

      {/* Awning */}
      <path
        d="M 8 34 Q 40 24 72 34 L 72 40 L 8 40 Z"
        fill="#C2185B"
      />
      {/* Stripes */}
      <path d="M 10 35 L 20 28 L 20 38" fill="#AD1457" />
      <path d="M 30 38 L 30 26 L 40 30" fill="#AD1457" />
      <path d="M 50 38 L 50 26 L 60 30" fill="#AD1457" />
      {/* Scalloped edge */}
      <path
        d="M 8 40 Q 14 44 20 40 Q 26 44 32 40 Q 38 44 44 40 Q 50 44 56 40 Q 62 44 68 40 Q 74 44 72 40"
        fill="#880E4F"
      />

      {/* "GIFTS" sign */}
      <rect x="26" y="18" width="28" height="10" fill="#FFD700" rx="2" />
      <rect x="28" y="19" width="24" height="8" fill="#FFF59D" rx="1" />
      <text x="40" y="25" textAnchor="middle" fill="#E91E63" fontSize="6" fontWeight="bold">GIFTS</text>

      {/* Decorative bow on sign */}
      <g transform="translate(40, 14)">
        <ellipse cx="-4" cy="0" rx="3" ry="2" fill="#E91E63" />
        <ellipse cx="4" cy="0" rx="3" ry="2" fill="#E91E63" />
        <circle cx="0" cy="0" r="2" fill="#C2185B" />
      </g>

      {/* Door */}
      <rect x="35" y="52" width="10" height="16" fill="#880E4F" rx="1" />
      <circle cx="43" cy="60" r="1" fill="#FFD700" />
      {/* "OPEN" sign on door */}
      <rect x="36" y="54" width="8" height="4" fill="#4CAF50" rx="0.5" />

      {/* Balloons */}
      <g transform="translate(18, 28)">
        <ellipse cx="0" cy="0" rx="4" ry="5" fill="#FFEB3B" />
        <line x1="0" y1="5" x2="0" y2="12" stroke="#9E9E9E" strokeWidth="0.5" />
      </g>
      <g transform="translate(24, 24)">
        <ellipse cx="0" cy="0" rx="4" ry="5" fill="#4CAF50" />
        <line x1="0" y1="5" x2="0" y2="16" stroke="#9E9E9E" strokeWidth="0.5" />
      </g>
      <g transform="translate(56, 26)">
        <ellipse cx="0" cy="0" rx="4" ry="5" fill="#2196F3" />
        <line x1="0" y1="5" x2="0" y2="14" stroke="#9E9E9E" strokeWidth="0.5" />
      </g>
      <g transform="translate(62, 28)">
        <ellipse cx="0" cy="0" rx="4" ry="5" fill="#FF9800" />
        <line x1="0" y1="5" x2="0" y2="12" stroke="#9E9E9E" strokeWidth="0.5" />
      </g>

      {/* Stars decoration */}
      <polygon points="14,66 15,68 17,68 15.5,69.5 16,71 14,70 12,71 12.5,69.5 11,68 13,68" fill="#FFD700" />
      <polygon points="66,66 67,68 69,68 67.5,69.5 68,71 66,70 64,71 64.5,69.5 63,68 65,68" fill="#FFD700" />
    </svg>
  );
};

export default GiftShop;
