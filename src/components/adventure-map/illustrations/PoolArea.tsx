/**
 * PoolArea.tsx - Recovery Pool illustration
 *
 * A swimming/recovery pool area for health features
 */

import React from 'react';

interface IllustrationProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export const PoolArea: React.FC<IllustrationProps> = ({ size = 80, className, animate = false }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* Shadow */}
      <ellipse cx="40" cy="74" rx="35" ry="6" fill="rgba(0,0,0,0.15)" />

      {/* Pool deck */}
      <ellipse cx="40" cy="55" rx="38" ry="18" fill="#D7CCC8" />
      <ellipse cx="40" cy="53" rx="36" ry="16" fill="#EFEBE9" />

      {/* Pool edge/coping */}
      <ellipse cx="40" cy="50" rx="30" ry="14" fill="#90CAF9" />
      <ellipse cx="40" cy="48" rx="28" ry="12" fill="#64B5F6" />

      {/* Water */}
      <ellipse cx="40" cy="46" rx="26" ry="10" fill="#42A5F5" />
      <ellipse cx="35" cy="44" rx="15" ry="6" fill="#64B5F6" opacity="0.6" />

      {/* Water ripples */}
      {animate && (
        <>
          <ellipse cx="40" cy="46" rx="20" ry="8" fill="none" stroke="#BBDEFB" strokeWidth="1" opacity="0.5">
            <animate attributeName="rx" values="15;25;15" dur="3s" repeatCount="indefinite" />
            <animate attributeName="ry" values="6;10;6" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0;0.5" dur="3s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="40" cy="46" rx="12" ry="5" fill="none" stroke="#BBDEFB" strokeWidth="1" opacity="0.6">
            <animate attributeName="rx" values="8;18;8" dur="2.5s" repeatCount="indefinite" />
            <animate attributeName="ry" values="3;7;3" dur="2.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0;0.6" dur="2.5s" repeatCount="indefinite" />
          </ellipse>
        </>
      )}

      {/* Pool ladder */}
      <g transform="translate(62, 40)">
        <rect x="0" y="0" width="2" height="18" fill="#9E9E9E" />
        <rect x="8" y="0" width="2" height="18" fill="#9E9E9E" />
        <rect x="0" y="4" width="10" height="2" fill="#BDBDBD" rx="1" />
        <rect x="0" y="10" width="10" height="2" fill="#BDBDBD" rx="1" />
        <rect x="0" y="16" width="10" height="2" fill="#BDBDBD" rx="1" />
      </g>

      {/* Lounge chairs */}
      <g transform="translate(12, 58)">
        <rect x="0" y="5" width="16" height="2" fill="#FF9800" />
        <rect x="0" y="0" width="10" height="6" fill="#FFB74D" rx="1" />
        <rect x="1" y="1" width="8" height="4" fill="#FFCC80" rx="0.5" />
        {/* Legs */}
        <rect x="2" y="7" width="2" height="4" fill="#5D4037" />
        <rect x="12" y="7" width="2" height="4" fill="#5D4037" />
      </g>

      <g transform="translate(54, 62)">
        <rect x="0" y="3" width="14" height="2" fill="#4CAF50" />
        <rect x="0" y="0" width="8" height="4" fill="#66BB6A" rx="1" />
        <rect x="1" y="1" width="6" height="2" fill="#81C784" rx="0.5" />
        <rect x="2" y="5" width="2" height="3" fill="#5D4037" />
        <rect x="10" y="5" width="2" height="3" fill="#5D4037" />
      </g>

      {/* Umbrella */}
      <g transform="translate(20, 30)">
        <rect x="-1" y="0" width="2" height="30" fill="#8D6E63" />
        <ellipse cx="0" cy="0" rx="14" ry="6" fill="#F44336" />
        <path d="M -14 0 Q -7 -8 0 0" fill="#FFCDD2" />
        <path d="M 0 0 Q 7 -8 14 0" fill="#E57373" />
        <circle cx="0" cy="-2" r="2" fill="#B71C1C" />
      </g>

      {/* Towel on deck */}
      <rect x="45" y="56" width="8" height="12" fill="#E1BEE7" rx="1" />
      <rect x="46" y="57" width="6" height="2" fill="#CE93D8" />
      <rect x="46" y="61" width="6" height="2" fill="#CE93D8" />

      {/* Flip flops */}
      <g transform="translate(35, 65)">
        <ellipse cx="0" cy="0" rx="3" ry="4" fill="#FF5722" />
        <circle cx="0" cy="-2" r="1" fill="#BF360C" />
      </g>
      <g transform="translate(40, 66)">
        <ellipse cx="0" cy="0" rx="3" ry="4" fill="#FF5722" />
        <circle cx="0" cy="-2" r="1" fill="#BF360C" />
      </g>

      {/* Beach ball in water */}
      <g transform="translate(50, 42)">
        <circle cx="0" cy="0" r="5" fill="#FFEB3B" />
        <path d="M -5 0 A 5 5 0 0 1 0 -5" fill="#E91E63" />
        <path d="M 5 0 A 5 5 0 0 1 0 5" fill="#2196F3" />
        {animate && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 2,1; 0,0; -2,-1; 0,0"
            dur="4s"
            repeatCount="indefinite"
          />
        )}
      </g>

      {/* "RECOVERY" sign */}
      <rect x="28" y="18" width="24" height="8" fill="#00BCD4" rx="2" />
      <text x="40" y="24" textAnchor="middle" fill="white" fontSize="5" fontWeight="bold">RELAX</text>

      {/* Decorative plants */}
      <g transform="translate(5, 50)">
        <ellipse cx="0" cy="6" rx="4" ry="2" fill="#6D4C41" />
        <path d="M 0 6 Q -3 2 -2 -2" fill="none" stroke="#4CAF50" strokeWidth="2" />
        <path d="M 0 6 Q 0 1 2 -3" fill="none" stroke="#66BB6A" strokeWidth="2" />
        <path d="M 0 6 Q 3 3 4 0" fill="none" stroke="#4CAF50" strokeWidth="2" />
      </g>
    </svg>
  );
};

export default PoolArea;
