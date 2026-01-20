/**
 * HallOfFame.tsx - Leaderboard illustration
 *
 * A grand hall displaying champions and rankings
 */

import React from 'react';

interface IllustrationProps {
  size?: number;
  className?: string;
}

export const HallOfFame: React.FC<IllustrationProps> = ({ size = 80, className }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* Shadow */}
      <ellipse cx="40" cy="76" rx="32" ry="5" fill="rgba(0,0,0,0.15)" />

      {/* Base steps */}
      <rect x="5" y="70" width="70" height="6" fill="#5D4037" rx="1" />
      <rect x="8" y="65" width="64" height="6" fill="#6D4C41" rx="1" />
      <rect x="11" y="60" width="58" height="6" fill="#795548" rx="1" />

      {/* Main building */}
      <rect x="14" y="30" width="52" height="32" fill="#ECEFF1" rx="2" />

      {/* Columns */}
      <rect x="16" y="32" width="6" height="28" fill="#CFD8DC" rx="1" />
      <rect x="16" y="30" width="6" height="4" fill="#B0BEC5" rx="1" />
      <rect x="16" y="58" width="6" height="4" fill="#B0BEC5" rx="1" />

      <rect x="28" y="32" width="6" height="28" fill="#CFD8DC" rx="1" />
      <rect x="28" y="30" width="6" height="4" fill="#B0BEC5" rx="1" />
      <rect x="28" y="58" width="6" height="4" fill="#B0BEC5" rx="1" />

      <rect x="46" y="32" width="6" height="28" fill="#CFD8DC" rx="1" />
      <rect x="46" y="30" width="6" height="4" fill="#B0BEC5" rx="1" />
      <rect x="46" y="58" width="6" height="4" fill="#B0BEC5" rx="1" />

      <rect x="58" y="32" width="6" height="28" fill="#CFD8DC" rx="1" />
      <rect x="58" y="30" width="6" height="4" fill="#B0BEC5" rx="1" />
      <rect x="58" y="58" width="6" height="4" fill="#B0BEC5" rx="1" />

      {/* Roof/Pediment */}
      <polygon points="10,30 40,10 70,30" fill="#B0BEC5" />
      <polygon points="14,30 40,14 66,30" fill="#CFD8DC" />

      {/* Roof decoration - laurel wreath */}
      <g transform="translate(40, 20)">
        <ellipse cx="0" cy="0" rx="6" ry="5" fill="none" stroke="#4CAF50" strokeWidth="2" />
        <ellipse cx="0" cy="0" rx="4" ry="3" fill="#FFD700" />
        <text x="0" y="2" textAnchor="middle" fill="#F57F17" fontSize="4" fontWeight="bold">1</text>
      </g>

      {/* Winner podiums inside */}
      {/* 2nd place (left) */}
      <g transform="translate(24, 45)">
        <rect x="-5" y="8" width="10" height="12" fill="#C0C0C0" />
        <circle cx="0" cy="4" r="4" fill="#E0E0E0" />
        <circle cx="0" cy="4" r="2.5" fill="#BDBDBD" />
        <text x="0" y="5" textAnchor="middle" fill="#757575" fontSize="4" fontWeight="bold">2</text>
      </g>

      {/* 1st place (center) */}
      <g transform="translate(40, 40)">
        <rect x="-6" y="8" width="12" height="17" fill="#FFD700" />
        <circle cx="0" cy="2" r="5" fill="#FFF59D" />
        <circle cx="0" cy="2" r="3" fill="#FFD700" />
        <text x="0" y="4" textAnchor="middle" fill="#F57F17" fontSize="5" fontWeight="bold">1</text>
        {/* Crown */}
        <path d="M -4 -4 L -3 -7 L -1 -5 L 0 -8 L 1 -5 L 3 -7 L 4 -4 Z" fill="#FFD700" />
      </g>

      {/* 3rd place (right) */}
      <g transform="translate(56, 48)">
        <rect x="-5" y="6" width="10" height="9" fill="#CD7F32" />
        <circle cx="0" cy="2" r="4" fill="#DFA878" />
        <circle cx="0" cy="2" r="2.5" fill="#CD7F32" />
        <text x="0" y="3" textAnchor="middle" fill="#8D6E63" fontSize="4" fontWeight="bold">3</text>
      </g>

      {/* Banner */}
      <rect x="22" y="6" width="36" height="6" fill="#9C27B0" rx="1" />
      <text x="40" y="10.5" textAnchor="middle" fill="white" fontSize="4" fontWeight="bold">CHAMPIONS</text>

      {/* Decorative stars */}
      <polygon points="12,18 13,21 16,21 13.5,23 14.5,26 12,24 9.5,26 10.5,23 8,21 11,21" fill="#FFD700" />
      <polygon points="68,18 69,21 72,21 69.5,23 70.5,26 68,24 65.5,26 66.5,23 64,21 67,21" fill="#FFD700" />

      {/* Torch flames */}
      <g transform="translate(8, 45)">
        <rect x="-1" y="0" width="2" height="10" fill="#5D4037" />
        <ellipse cx="0" cy="-2" rx="3" ry="4" fill="#FF9800" />
        <ellipse cx="0" cy="-3" rx="2" ry="2" fill="#FFEB3B" />
      </g>
      <g transform="translate(72, 45)">
        <rect x="-1" y="0" width="2" height="10" fill="#5D4037" />
        <ellipse cx="0" cy="-2" rx="3" ry="4" fill="#FF9800" />
        <ellipse cx="0" cy="-3" rx="2" ry="2" fill="#FFEB3B" />
      </g>
    </svg>
  );
};

export default HallOfFame;
