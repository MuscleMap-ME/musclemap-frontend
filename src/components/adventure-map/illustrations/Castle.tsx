/**
 * Castle.tsx - Main entrance/Dashboard illustration
 *
 * A charming theme park castle gate - the central hub of the adventure map
 */

import React from 'react';

interface IllustrationProps {
  size?: number;
  className?: string;
}

export const Castle: React.FC<IllustrationProps> = ({ size = 80, className }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* Shadow */}
      <ellipse cx="40" cy="75" rx="30" ry="6" fill="rgba(0,0,0,0.15)" />

      {/* Main castle body */}
      <rect x="18" y="35" width="44" height="40" fill="#8B7355" rx="2" />

      {/* Stone texture blocks */}
      <rect x="20" y="38" width="12" height="8" fill="#9D8468" rx="1" />
      <rect x="34" y="38" width="12" height="8" fill="#9D8468" rx="1" />
      <rect x="48" y="38" width="12" height="8" fill="#9D8468" rx="1" />
      <rect x="26" y="48" width="12" height="8" fill="#9D8468" rx="1" />
      <rect x="42" y="48" width="12" height="8" fill="#9D8468" rx="1" />
      <rect x="20" y="58" width="12" height="8" fill="#9D8468" rx="1" />
      <rect x="48" y="58" width="12" height="8" fill="#9D8468" rx="1" />

      {/* Left tower */}
      <rect x="10" y="20" width="18" height="55" fill="#A08060" />
      <polygon points="10,20 19,5 28,20" fill="#C62828" />
      {/* Tower battlements */}
      <rect x="10" y="15" width="5" height="8" fill="#A08060" />
      <rect x="23" y="15" width="5" height="8" fill="#A08060" />
      {/* Tower window */}
      <rect x="15" y="30" width="8" height="12" fill="#3E2723" rx="4" ry="4" />
      <rect x="18" y="32" width="2" height="8" fill="#5D4037" />

      {/* Right tower */}
      <rect x="52" y="20" width="18" height="55" fill="#A08060" />
      <polygon points="52,20 61,5 70,20" fill="#C62828" />
      {/* Tower battlements */}
      <rect x="52" y="15" width="5" height="8" fill="#A08060" />
      <rect x="65" y="15" width="5" height="8" fill="#A08060" />
      {/* Tower window */}
      <rect x="57" y="30" width="8" height="12" fill="#3E2723" rx="4" ry="4" />
      <rect x="60" y="32" width="2" height="8" fill="#5D4037" />

      {/* Center tower (taller) */}
      <rect x="30" y="10" width="20" height="30" fill="#B8956D" />
      <polygon points="30,10 40,-8 50,10" fill="#C62828" />
      {/* Flag */}
      <line x1="40" y1="-8" x2="40" y2="-18" stroke="#5D4037" strokeWidth="2" />
      <polygon points="40,-18 52,-14 40,-10" fill="#FFD700" />
      {/* Center window */}
      <rect x="35" y="18" width="10" height="14" fill="#3E2723" rx="5" ry="5" />
      <rect x="39" y="20" width="2" height="10" fill="#5D4037" />

      {/* Main gate */}
      <rect x="28" y="50" width="24" height="25" fill="#3E2723" rx="12" ry="12" />
      {/* Gate details */}
      <rect x="32" y="54" width="4" height="18" fill="#5D4037" rx="1" />
      <rect x="38" y="54" width="4" height="18" fill="#5D4037" rx="1" />
      <rect x="44" y="54" width="4" height="18" fill="#5D4037" rx="1" />
      {/* Gate handle */}
      <circle cx="45" cy="62" r="2" fill="#FFD700" />

      {/* Decorative banner above gate */}
      <rect x="30" y="44" width="20" height="6" fill="#1565C0" />
      <circle cx="35" cy="47" r="2" fill="#FFD700" />
      <circle cx="45" cy="47" r="2" fill="#FFD700" />

      {/* Torch lights */}
      <ellipse cx="24" cy="52" rx="3" ry="4" fill="#FF8F00" />
      <ellipse cx="24" cy="50" rx="2" ry="2" fill="#FFEB3B" />
      <ellipse cx="56" cy="52" rx="3" ry="4" fill="#FF8F00" />
      <ellipse cx="56" cy="50" rx="2" ry="2" fill="#FFEB3B" />
    </svg>
  );
};

export default Castle;
