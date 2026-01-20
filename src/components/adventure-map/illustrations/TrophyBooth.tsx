/**
 * TrophyBooth.tsx - Trophy Hall/Achievements illustration
 *
 * A grand trophy display booth showcasing achievements
 */

import React from 'react';

interface IllustrationProps {
  size?: number;
  className?: string;
}

export const TrophyBooth: React.FC<IllustrationProps> = ({ size = 80, className }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* Shadow */}
      <ellipse cx="40" cy="76" rx="28" ry="5" fill="rgba(0,0,0,0.15)" />

      {/* Base platform */}
      <rect x="10" y="68" width="60" height="8" fill="#5D4037" rx="2" />
      <rect x="12" y="66" width="56" height="4" fill="#8D6E63" rx="1" />

      {/* Main booth structure */}
      <rect x="15" y="30" width="50" height="38" fill="#1565C0" rx="3" />

      {/* Display window */}
      <rect x="18" y="35" width="44" height="28" fill="#E3F2FD" rx="2" />
      <rect x="20" y="37" width="40" height="24" fill="#BBDEFB" rx="1" />

      {/* Shelves in window */}
      <line x1="20" y1="48" x2="60" y2="48" stroke="#1565C0" strokeWidth="2" />

      {/* Trophies on display */}
      {/* Large center trophy */}
      <g transform="translate(40, 38)">
        <rect x="-4" y="6" width="8" height="4" fill="#FFD700" />
        <rect x="-3" y="4" width="6" height="3" fill="#FFD700" />
        <ellipse cx="0" cy="0" rx="5" ry="4" fill="#FFD700" />
        <ellipse cx="0" cy="-1" rx="3" ry="2" fill="#FFF59D" />
        {/* Handles */}
        <ellipse cx="-6" cy="0" rx="2" ry="3" fill="#FFD700" />
        <ellipse cx="6" cy="0" rx="2" ry="3" fill="#FFD700" />
        {/* Star */}
        <polygon points="0,-2 1,0 3,0 1.5,1 2,3 0,2 -2,3 -1.5,1 -3,0 -1,0" fill="#FF6F00" transform="scale(0.5)" />
      </g>

      {/* Left trophy (smaller) */}
      <g transform="translate(27, 41)">
        <rect x="-2.5" y="4" width="5" height="3" fill="#C0C0C0" />
        <ellipse cx="0" cy="0" rx="3.5" ry="3" fill="#C0C0C0" />
        <ellipse cx="0" cy="-0.5" rx="2" ry="1.5" fill="#E0E0E0" />
      </g>

      {/* Right trophy (smaller) */}
      <g transform="translate(53, 41)">
        <rect x="-2.5" y="4" width="5" height="3" fill="#CD7F32" />
        <ellipse cx="0" cy="0" rx="3.5" ry="3" fill="#CD7F32" />
        <ellipse cx="0" cy="-0.5" rx="2" ry="1.5" fill="#DFA878" />
      </g>

      {/* Medals on lower shelf */}
      <circle cx="28" cy="55" r="4" fill="#FFD700" />
      <circle cx="28" cy="55" r="2.5" fill="#FFF59D" />
      <rect x="26" y="50" width="4" height="3" fill="#1565C0" />

      <circle cx="40" cy="55" r="4" fill="#C0C0C0" />
      <circle cx="40" cy="55" r="2.5" fill="#E0E0E0" />
      <rect x="38" y="50" width="4" height="3" fill="#E91E63" />

      <circle cx="52" cy="55" r="4" fill="#CD7F32" />
      <circle cx="52" cy="55" r="2.5" fill="#DFA878" />
      <rect x="50" y="50" width="4" height="3" fill="#4CAF50" />

      {/* Roof/Canopy */}
      <polygon points="10,30 40,12 70,30" fill="#0D47A1" />
      <polygon points="15,30 40,15 65,30" fill="#1976D2" />

      {/* "HALL OF FAME" sign */}
      <rect x="22" y="18" width="36" height="8" fill="#FFD700" rx="2" />
      <rect x="24" y="19" width="32" height="6" fill="#FFF59D" rx="1" />

      {/* Decorative stars on roof */}
      <polygon points="20,25 21,27 23,27 21.5,28.5 22,30 20,29 18,30 18.5,28.5 17,27 19,27" fill="#FFD700" />
      <polygon points="60,25 61,27 63,27 61.5,28.5 62,30 60,29 58,30 58.5,28.5 57,27 59,27" fill="#FFD700" />

      {/* Spotlights */}
      <ellipse cx="25" cy="32" rx="3" ry="1.5" fill="#FFEB3B" opacity="0.6" />
      <ellipse cx="55" cy="32" rx="3" ry="1.5" fill="#FFEB3B" opacity="0.6" />
    </svg>
  );
};

export default TrophyBooth;
