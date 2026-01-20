/**
 * FoodStand.tsx - Marketplace illustration
 *
 * A colorful vendor cart/food stand for the market district
 */

import React from 'react';

interface IllustrationProps {
  size?: number;
  className?: string;
}

export const FoodStand: React.FC<IllustrationProps> = ({ size = 80, className }) => {
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

      {/* Cart base/counter */}
      <rect x="12" y="45" width="56" height="25" fill="#8D6E63" rx="3" />

      {/* Counter top */}
      <rect x="10" y="42" width="60" height="6" fill="#A1887F" rx="2" />

      {/* Front panels with decorative pattern */}
      <rect x="15" y="50" width="16" height="16" fill="#FFCC80" rx="2" />
      <rect x="33" y="50" width="16" height="16" fill="#FFE0B2" rx="2" />
      <rect x="51" y="50" width="14" height="16" fill="#FFCC80" rx="2" />

      {/* Wheels */}
      <circle cx="22" cy="72" r="5" fill="#5D4037" />
      <circle cx="22" cy="72" r="3" fill="#8D6E63" />
      <circle cx="22" cy="72" r="1" fill="#3E2723" />

      <circle cx="58" cy="72" r="5" fill="#5D4037" />
      <circle cx="58" cy="72" r="3" fill="#8D6E63" />
      <circle cx="58" cy="72" r="1" fill="#3E2723" />

      {/* Awning/Canopy */}
      <path
        d="M 8 42 L 8 20 L 72 20 L 72 42"
        fill="none"
        stroke="#5D4037"
        strokeWidth="3"
      />

      {/* Awning fabric - striped */}
      <path
        d="M 6 22 Q 20 30 40 22 Q 60 14 74 22 L 74 42 L 6 42 Z"
        fill="#F44336"
      />
      <path
        d="M 6 22 Q 20 30 40 22"
        fill="none"
        stroke="#FFCDD2"
        strokeWidth="20"
        strokeDasharray="6 6"
        opacity="0.5"
      />
      <path
        d="M 40 22 Q 60 14 74 22"
        fill="none"
        stroke="#FFCDD2"
        strokeWidth="20"
        strokeDasharray="6 6"
        opacity="0.5"
      />

      {/* Scalloped edge */}
      <path
        d="M 6 42 Q 10 45 14 42 Q 18 45 22 42 Q 26 45 30 42 Q 34 45 38 42 Q 42 45 46 42 Q 50 45 54 42 Q 58 45 62 42 Q 66 45 70 42 Q 74 45 74 42"
        fill="#C62828"
        stroke="#C62828"
        strokeWidth="1"
      />

      {/* Products on display */}
      {/* Popcorn box */}
      <g transform="translate(18, 32)">
        <rect x="0" y="0" width="8" height="10" fill="#F44336" rx="1" />
        <ellipse cx="4" cy="0" rx="5" ry="3" fill="#FFF9C4" />
        <circle cx="2" cy="-1" r="1.5" fill="#FFEB3B" />
        <circle cx="5" cy="-2" r="1.5" fill="#FFEB3B" />
        <circle cx="4" cy="0" r="1.5" fill="#FFEB3B" />
      </g>

      {/* Pretzel */}
      <g transform="translate(32, 30)">
        <path
          d="M 5 8 Q 0 5 2 0 Q 5 -2 8 0 Q 10 5 5 8"
          fill="none"
          stroke="#8D6E63"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="3" cy="2" r="0.8" fill="#FFF59D" />
        <circle cx="7" cy="2" r="0.8" fill="#FFF59D" />
      </g>

      {/* Cotton candy */}
      <g transform="translate(48, 26)">
        <line x1="5" y1="16" x2="5" y2="6" stroke="#8D6E63" strokeWidth="2" />
        <ellipse cx="5" cy="4" rx="6" ry="5" fill="#F48FB1" />
        <ellipse cx="4" cy="2" rx="3" ry="2.5" fill="#F8BBD9" />
      </g>

      {/* Ice cream cone */}
      <g transform="translate(58, 30)">
        <polygon points="4,12 0,2 8,2" fill="#D7CCC8" />
        <circle cx="4" cy="2" r="4" fill="#F48FB1" />
        <circle cx="4" cy="0" r="3" fill="#FFCCBC" />
        <circle cx="4" cy="-1" r="2" fill="#A5D6A7" />
      </g>

      {/* Menu sign */}
      <rect x="30" y="8" width="20" height="10" fill="#FFEB3B" rx="2" />
      <line x1="33" y1="11" x2="47" y2="11" stroke="#5D4037" strokeWidth="1" />
      <line x1="33" y1="14" x2="44" y2="14" stroke="#5D4037" strokeWidth="1" />

      {/* Decorative lights on awning */}
      <circle cx="15" cy="20" r="1.5" fill="#FFEB3B" />
      <circle cx="28" cy="18" r="1.5" fill="#FF9800" />
      <circle cx="40" cy="17" r="1.5" fill="#FFEB3B" />
      <circle cx="52" cy="18" r="1.5" fill="#FF9800" />
      <circle cx="65" cy="20" r="1.5" fill="#FFEB3B" />
    </svg>
  );
};

export default FoodStand;
