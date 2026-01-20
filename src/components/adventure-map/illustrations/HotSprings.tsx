/**
 * HotSprings.tsx - Wellness Sanctuary illustration
 *
 * A relaxing hot springs/spa area for health and recovery
 */

import React from 'react';

interface IllustrationProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export const HotSprings: React.FC<IllustrationProps> = ({ size = 80, className, animate = false }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* Shadow */}
      <ellipse cx="40" cy="74" rx="32" ry="6" fill="rgba(0,0,0,0.15)" />

      {/* Rock border - outer */}
      <ellipse cx="40" cy="55" rx="34" ry="18" fill="#6D4C41" />
      <ellipse cx="40" cy="53" rx="34" ry="18" fill="#8D6E63" />

      {/* Individual rocks around edge */}
      <ellipse cx="12" cy="50" rx="8" ry="6" fill="#795548" />
      <ellipse cx="25" cy="42" rx="7" ry="5" fill="#6D4C41" />
      <ellipse cx="55" cy="42" rx="7" ry="5" fill="#6D4C41" />
      <ellipse cx="68" cy="50" rx="8" ry="6" fill="#795548" />
      <ellipse cx="20" cy="62" rx="6" ry="5" fill="#8D6E63" />
      <ellipse cx="60" cy="62" rx="6" ry="5" fill="#8D6E63" />

      {/* Water pool */}
      <ellipse cx="40" cy="52" rx="26" ry="13" fill="#4DD0E1" />
      <ellipse cx="40" cy="50" rx="24" ry="11" fill="#80DEEA" />
      <ellipse cx="35" cy="48" rx="15" ry="7" fill="#B2EBF2" opacity="0.6" />

      {/* Steam/mist effects */}
      <g opacity="0.7">
        {animate && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 0,-3; 0,0"
            dur="3s"
            repeatCount="indefinite"
          />
        )}
        <ellipse cx="30" cy="40" rx="4" ry="6" fill="white" opacity="0.5" />
        <ellipse cx="45" cy="38" rx="5" ry="7" fill="white" opacity="0.4" />
        <ellipse cx="38" cy="35" rx="3" ry="5" fill="white" opacity="0.3" />
      </g>

      <g opacity="0.6">
        {animate && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 0,-4; 0,0"
            dur="4s"
            repeatCount="indefinite"
          />
        )}
        <ellipse cx="50" cy="42" rx="3" ry="5" fill="white" opacity="0.4" />
        <ellipse cx="55" cy="38" rx="4" ry="6" fill="white" opacity="0.3" />
      </g>

      <g opacity="0.5">
        {animate && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 0,-5; 0,0"
            dur="3.5s"
            repeatCount="indefinite"
          />
        )}
        <ellipse cx="25" cy="38" rx="3" ry="4" fill="white" opacity="0.4" />
        <ellipse cx="32" cy="32" rx="4" ry="5" fill="white" opacity="0.3" />
      </g>

      {/* Bamboo fence on one side */}
      <g transform="translate(5, 20)">
        <rect x="0" y="0" width="3" height="35" fill="#8BC34A" rx="1" />
        <rect x="5" y="3" width="3" height="32" fill="#7CB342" rx="1" />
        <rect x="10" y="0" width="3" height="35" fill="#8BC34A" rx="1" />
        {/* Horizontal bamboo ties */}
        <rect x="0" y="8" width="13" height="2" fill="#689F38" rx="1" />
        <rect x="0" y="22" width="13" height="2" fill="#689F38" rx="1" />
      </g>

      {/* Small plant decorations */}
      <g transform="translate(68, 35)">
        <ellipse cx="0" cy="10" rx="4" ry="2" fill="rgba(0,0,0,0.1)" />
        <path d="M 0 10 Q -3 5 -1 0" fill="none" stroke="#4CAF50" strokeWidth="2" />
        <path d="M 0 10 Q 0 4 2 -1" fill="none" stroke="#66BB6A" strokeWidth="2" />
        <path d="M 0 10 Q 3 6 4 2" fill="none" stroke="#4CAF50" strokeWidth="2" />
      </g>

      {/* Towel rack */}
      <g transform="translate(62, 55)">
        <rect x="0" y="0" width="2" height="12" fill="#8D6E63" />
        <rect x="8" y="0" width="2" height="12" fill="#8D6E63" />
        <rect x="0" y="0" width="10" height="2" fill="#A1887F" />
        {/* Towel */}
        <rect x="1" y="2" width="8" height="5" fill="#E1BEE7" rx="1" />
      </g>

      {/* Stone path leading to pool */}
      <ellipse cx="40" cy="72" rx="6" ry="3" fill="#9E9E9E" />
      <ellipse cx="32" cy="68" rx="5" ry="2.5" fill="#BDBDBD" />
      <ellipse cx="48" cy="68" rx="5" ry="2.5" fill="#BDBDBD" />

      {/* Lantern decoration */}
      <g transform="translate(70, 25)">
        <rect x="-2" y="0" width="4" height="8" fill="#FF5722" rx="1" />
        <rect x="-1" y="1" width="2" height="6" fill="#FFAB91" rx="0.5" />
        <rect x="-3" y="-1" width="6" height="2" fill="#5D4037" />
        <rect x="-3" y="7" width="6" height="2" fill="#5D4037" />
      </g>
    </svg>
  );
};

export default HotSprings;
