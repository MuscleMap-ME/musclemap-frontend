/**
 * RoyalCastle.tsx - Empire Control/Admin area illustration
 *
 * A grand royal castle for the admin summit area
 */

import React from 'react';

interface IllustrationProps {
  size?: number;
  className?: string;
}

export const RoyalCastle: React.FC<IllustrationProps> = ({ size = 80, className }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* Shadow */}
      <ellipse cx="40" cy="76" rx="35" ry="6" fill="rgba(0,0,0,0.15)" />

      {/* Castle hill/base */}
      <ellipse cx="40" cy="72" rx="38" ry="8" fill="#6D4C41" />
      <ellipse cx="40" cy="70" rx="36" ry="7" fill="#8D6E63" />

      {/* Main castle body */}
      <rect x="15" y="40" width="50" height="32" fill="#FFD700" rx="2" />

      {/* Gold brick texture */}
      <rect x="18" y="44" width="14" height="8" fill="#FFE082" rx="1" />
      <rect x="34" y="44" width="14" height="8" fill="#FFE082" rx="1" />
      <rect x="50" y="44" width="14" height="8" fill="#FFE082" rx="1" />
      <rect x="24" y="54" width="14" height="8" fill="#FFE082" rx="1" />
      <rect x="42" y="54" width="14" height="8" fill="#FFE082" rx="1" />

      {/* Royal entrance */}
      <rect x="30" y="52" width="20" height="20" fill="#5D4037" rx="10" ry="10" />
      <rect x="33" y="55" width="14" height="15" fill="#8D6E63" rx="7" ry="7" />
      {/* Crown above door */}
      <g transform="translate(40, 48)">
        <path d="M -8 0 L -6 -5 L -3 -2 L 0 -7 L 3 -2 L 6 -5 L 8 0 Z" fill="#FFD700" />
        <circle cx="-5" cy="-5" r="1.5" fill="#E91E63" />
        <circle cx="0" cy="-7" r="1.5" fill="#2196F3" />
        <circle cx="5" cy="-5" r="1.5" fill="#4CAF50" />
      </g>

      {/* Left tower */}
      <rect x="5" y="25" width="18" height="47" fill="#FFC107" rx="1" />
      <polygon points="5,25 14,5 23,25" fill="#FF8F00" />
      {/* Tower windows */}
      <rect x="9" y="32" width="10" height="12" fill="#5D4037" rx="5" ry="5" />
      <rect x="12" y="34" width="4" height="8" fill="#8D6E63" rx="2" ry="2" />
      {/* Tower battlements */}
      <rect x="5" y="22" width="4" height="5" fill="#FFC107" />
      <rect x="11" y="22" width="4" height="5" fill="#FFC107" />
      <rect x="17" y="22" width="4" height="5" fill="#FFC107" />
      {/* Flag */}
      <line x1="14" y1="5" x2="14" y2="-5" stroke="#5D4037" strokeWidth="2" />
      <polygon points="14,-5 24,0 14,5" fill="#9C27B0" />

      {/* Right tower */}
      <rect x="57" y="25" width="18" height="47" fill="#FFC107" rx="1" />
      <polygon points="57,25 66,5 75,25" fill="#FF8F00" />
      {/* Tower windows */}
      <rect x="61" y="32" width="10" height="12" fill="#5D4037" rx="5" ry="5" />
      <rect x="64" y="34" width="4" height="8" fill="#8D6E63" rx="2" ry="2" />
      {/* Tower battlements */}
      <rect x="57" y="22" width="4" height="5" fill="#FFC107" />
      <rect x="63" y="22" width="4" height="5" fill="#FFC107" />
      <rect x="69" y="22" width="4" height="5" fill="#FFC107" />
      {/* Flag */}
      <line x1="66" y1="5" x2="66" y2="-5" stroke="#5D4037" strokeWidth="2" />
      <polygon points="66,-5 76,0 66,5" fill="#E91E63" />

      {/* Center tower (tallest) */}
      <rect x="30" y="15" width="20" height="27" fill="#FFCA28" rx="1" />
      <polygon points="30,15 40,-8 50,15" fill="#FF8F00" />
      {/* Grand window */}
      <rect x="35" y="20" width="10" height="14" fill="#5D4037" rx="5" ry="5" />
      <rect x="38" y="22" width="4" height="10" fill="#8D6E63" rx="2" ry="2" />
      {/* Crown spire */}
      <line x1="40" y1="-8" x2="40" y2="-18" stroke="#FFD700" strokeWidth="3" />
      <polygon points="40,-22 36,-15 44,-15" fill="#FFD700" />
      <circle cx="40" cy="-22" r="3" fill="#FFD700" />
      <circle cx="40" cy="-22" r="2" fill="#FFF59D" />

      {/* Royal banner on main wall */}
      <rect x="20" y="36" width="8" height="10" fill="#9C27B0" rx="1" />
      <circle cx="24" cy="41" r="2" fill="#FFD700" />
      <rect x="52" y="36" width="8" height="10" fill="#9C27B0" rx="1" />
      <circle cx="56" cy="41" r="2" fill="#FFD700" />

      {/* Decorative gems */}
      <circle cx="40" cy="38" r="3" fill="#E91E63" />
      <circle cx="40" cy="38" r="2" fill="#F48FB1" />

      {/* Torch lights */}
      <g transform="translate(26, 58)">
        <rect x="-1" y="0" width="2" height="5" fill="#5D4037" />
        <ellipse cx="0" cy="-2" rx="3" ry="4" fill="#FF9800" />
        <ellipse cx="0" cy="-3" rx="2" ry="2" fill="#FFEB3B" />
      </g>
      <g transform="translate(54, 58)">
        <rect x="-1" y="0" width="2" height="5" fill="#5D4037" />
        <ellipse cx="0" cy="-2" rx="3" ry="4" fill="#FF9800" />
        <ellipse cx="0" cy="-3" rx="2" ry="2" fill="#FFEB3B" />
      </g>

      {/* Sparkle effects for royal grandeur */}
      <circle cx="10" cy="10" r="1.5" fill="#FFF59D">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="70" cy="8" r="1.5" fill="#FFF59D">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="40" cy="-12" r="2" fill="#FFF59D">
        <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
};

export default RoyalCastle;
