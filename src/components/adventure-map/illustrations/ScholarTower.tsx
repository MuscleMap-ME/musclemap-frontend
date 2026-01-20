/**
 * ScholarTower.tsx - Skills Academy illustration
 *
 * A magical learning tower for skills and knowledge
 */

import React from 'react';

interface IllustrationProps {
  size?: number;
  className?: string;
}

export const ScholarTower: React.FC<IllustrationProps> = ({ size = 80, className }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* Shadow */}
      <ellipse cx="40" cy="76" rx="22" ry="5" fill="rgba(0,0,0,0.15)" />

      {/* Base foundation */}
      <rect x="22" y="65" width="36" height="10" fill="#5D4037" rx="2" />
      <rect x="20" y="63" width="40" height="4" fill="#8D6E63" rx="1" />

      {/* Main tower body - lower section */}
      <rect x="24" y="40" width="32" height="25" fill="#9C27B0" rx="2" />

      {/* Stone texture */}
      <rect x="26" y="43" width="10" height="6" fill="#AB47BC" rx="1" />
      <rect x="38" y="43" width="10" height="6" fill="#AB47BC" rx="1" />
      <rect x="30" y="51" width="10" height="6" fill="#AB47BC" rx="1" />
      <rect x="42" y="51" width="10" height="6" fill="#AB47BC" rx="1" />
      <rect x="26" y="59" width="10" height="6" fill="#AB47BC" rx="1" />

      {/* Door */}
      <rect x="34" y="50" width="12" height="15" fill="#4A148C" rx="6" ry="6" />
      <rect x="36" y="52" width="8" height="11" fill="#7B1FA2" rx="4" ry="4" />
      <circle cx="42" cy="58" r="1.5" fill="#FFD700" />

      {/* Middle tower section */}
      <rect x="26" y="22" width="28" height="20" fill="#7B1FA2" rx="2" />

      {/* Windows - middle */}
      <rect x="30" y="26" width="8" height="10" fill="#E1BEE7" rx="4" ry="4" />
      <rect x="33" y="28" width="2" height="6" fill="#9C27B0" />
      <rect x="42" y="26" width="8" height="10" fill="#E1BEE7" rx="4" ry="4" />
      <rect x="45" y="28" width="2" height="6" fill="#9C27B0" />

      {/* Upper tower section */}
      <rect x="28" y="8" width="24" height="16" fill="#6A1B9A" rx="2" />

      {/* Circular window at top */}
      <circle cx="40" cy="15" r="6" fill="#E1BEE7" />
      <circle cx="40" cy="15" r="4" fill="#CE93D8" />
      <line x1="40" y1="11" x2="40" y2="19" stroke="#9C27B0" strokeWidth="1.5" />
      <line x1="36" y1="15" x2="44" y2="15" stroke="#9C27B0" strokeWidth="1.5" />

      {/* Roof/Spire */}
      <polygon points="28,8 40,-8 52,8" fill="#4A148C" />
      <polygon points="32,8 40,-4 48,8" fill="#6A1B9A" />

      {/* Flag */}
      <line x1="40" y1="-8" x2="40" y2="-18" stroke="#5D4037" strokeWidth="2" />
      <polygon points="40,-18 52,-14 40,-10" fill="#E91E63" />

      {/* Book decorations on shelves (visible through windows) */}
      <rect x="31" y="33" width="2" height="3" fill="#F44336" />
      <rect x="33.5" y="33" width="2" height="3" fill="#2196F3" />
      <rect x="36" y="33" width="1.5" height="3" fill="#4CAF50" />

      <rect x="43" y="33" width="2" height="3" fill="#FF9800" />
      <rect x="45.5" y="33" width="2" height="3" fill="#9C27B0" />
      <rect x="48" y="33" width="1.5" height="3" fill="#00BCD4" />

      {/* Magical sparkles */}
      <circle cx="20" cy="15" r="1.5" fill="#FFD700">
        <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="60" cy="20" r="1.5" fill="#FFD700">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="55" cy="5" r="1" fill="#E1BEE7">
        <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="25" cy="0" r="1" fill="#E1BEE7">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
      </circle>

      {/* Telescope on top window */}
      <g transform="translate(50, 12)">
        <ellipse cx="4" cy="0" rx="3" ry="2" fill="#5D4037" />
        <rect x="0" y="-1" width="5" height="2" fill="#8D6E63" />
        <circle cx="0" cy="0" r="1.5" fill="#4DD0E1" />
      </g>

      {/* Ivy/vines on tower */}
      <path d="M 24 65 Q 22 55 24 45" fill="none" stroke="#4CAF50" strokeWidth="2" />
      <circle cx="23" cy="55" r="2" fill="#66BB6A" />
      <circle cx="22" cy="48" r="1.5" fill="#81C784" />
    </svg>
  );
};

export default ScholarTower;
