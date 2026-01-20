/**
 * FortuneTeller.tsx - Stats Shrine illustration
 *
 * A mystical fortune teller booth for viewing stats and analytics
 */

import React from 'react';

interface IllustrationProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export const FortuneTeller: React.FC<IllustrationProps> = ({ size = 80, className, animate = false }) => {
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

      {/* Base platform */}
      <ellipse cx="40" cy="70" rx="30" ry="6" fill="#4A148C" />
      <ellipse cx="40" cy="68" rx="28" ry="5" fill="#6A1B9A" />

      {/* Main tent structure */}
      <path
        d="M 10 68 L 10 35 Q 40 20 70 35 L 70 68 Z"
        fill="#7B1FA2"
      />

      {/* Tent stripes */}
      <path d="M 15 68 L 25 32 Q 40 24 55 32 L 45 68" fill="#9C27B0" />
      <path d="M 35 68 L 40 28 L 45 68" fill="#6A1B9A" />

      {/* Tent top peak */}
      <polygon points="40,20 35,35 45,35" fill="#4A148C" />
      <circle cx="40" cy="18" r="4" fill="#FFD700" />
      <circle cx="40" cy="18" r="2.5" fill="#FFF59D" />

      {/* Entrance curtains */}
      <path
        d="M 25 68 Q 30 50 32 35 L 32 68"
        fill="#E91E63"
      />
      <path
        d="M 55 68 Q 50 50 48 35 L 48 68"
        fill="#E91E63"
      />

      {/* Curtain ties */}
      <ellipse cx="30" cy="50" rx="3" ry="2" fill="#FFD700" />
      <ellipse cx="50" cy="50" rx="3" ry="2" fill="#FFD700" />

      {/* Table inside */}
      <ellipse cx="40" cy="60" rx="12" ry="4" fill="#4A148C" />
      <ellipse cx="40" cy="58" rx="11" ry="3.5" fill="#6A1B9A" />

      {/* Crystal ball */}
      <g>
        <ellipse cx="40" cy="52" rx="2" ry="1" fill="#4A148C" />
        <circle cx="40" cy="48" r="8" fill="#4DD0E1" opacity="0.9" />
        <circle cx="40" cy="48" r="7" fill="#80DEEA" opacity="0.7" />
        <ellipse cx="37" cy="45" rx="3" ry="2" fill="white" opacity="0.5" />
        {animate && (
          <circle cx="40" cy="48" r="6" fill="none" stroke="#E1BEE7" strokeWidth="1" opacity="0.6">
            <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
          </circle>
        )}
      </g>

      {/* Stars and mystical symbols */}
      <polygon points="20,40 21,42 23,42 21.5,43.5 22,45 20,44 18,45 18.5,43.5 17,42 19,42" fill="#FFD700" />
      <polygon points="60,42 61,44 63,44 61.5,45.5 62,47 60,46 58,47 58.5,45.5 57,44 59,44" fill="#FFD700" />

      {/* Moon symbol */}
      <g transform="translate(15, 28)">
        <circle cx="5" cy="5" r="4" fill="#FFF59D" />
        <circle cx="7" cy="4" r="3.5" fill="#7B1FA2" />
      </g>

      {/* Eye of providence symbol on tent */}
      <g transform="translate(40, 28)">
        <polygon points="0,-5 -6,3 6,3" fill="none" stroke="#FFD700" strokeWidth="1.5" />
        <circle cx="0" cy="0" r="2" fill="#FFD700" />
        <circle cx="0" cy="0" r="1" fill="#4A148C" />
      </g>

      {/* Decorative beads at entrance */}
      <g>
        <circle cx="32" cy="40" r="1" fill="#E91E63" />
        <circle cx="32" cy="44" r="1" fill="#9C27B0" />
        <circle cx="32" cy="48" r="1" fill="#2196F3" />
        <circle cx="48" cy="40" r="1" fill="#E91E63" />
        <circle cx="48" cy="44" r="1" fill="#9C27B0" />
        <circle cx="48" cy="48" r="1" fill="#2196F3" />
      </g>

      {/* Sign */}
      <rect x="58" y="55" width="16" height="10" fill="#4A148C" rx="2" />
      <text x="66" y="62" textAnchor="middle" fill="#FFD700" fontSize="5" fontWeight="bold">STATS</text>

      {/* Sparkle effects */}
      {animate && (
        <>
          <circle cx="40" cy="48" r="1" fill="#FFF59D">
            <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
          </circle>
          <circle cx="36" cy="50" r="0.8" fill="#E1BEE7">
            <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="44" cy="46" r="0.8" fill="#E1BEE7">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.2s" repeatCount="indefinite" />
          </circle>
        </>
      )}
    </svg>
  );
};

export default FortuneTeller;
