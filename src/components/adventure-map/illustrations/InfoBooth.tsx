/**
 * InfoBooth.tsx - General information/Profile illustration
 *
 * An information kiosk booth for profile and settings
 */

import React from 'react';

interface IllustrationProps {
  size?: number;
  className?: string;
}

export const InfoBooth: React.FC<IllustrationProps> = ({ size = 80, className }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* Shadow */}
      <ellipse cx="40" cy="75" rx="22" ry="4" fill="rgba(0,0,0,0.15)" />

      {/* Base */}
      <rect x="20" y="68" width="40" height="6" fill="#5D4037" rx="2" />

      {/* Kiosk body */}
      <rect x="24" y="35" width="32" height="35" fill="#2196F3" rx="3" />
      <rect x="26" y="37" width="28" height="31" fill="#64B5F6" rx="2" />

      {/* Screen area */}
      <rect x="28" y="40" width="24" height="18" fill="#1565C0" rx="2" />
      <rect x="30" y="42" width="20" height="14" fill="#E3F2FD" rx="1" />

      {/* Screen content - profile icon */}
      <circle cx="40" cy="48" r="4" fill="#1565C0" />
      <ellipse cx="40" cy="54" rx="6" ry="3" fill="#1565C0" />

      {/* Control buttons below screen */}
      <circle cx="34" cy="62" r="2" fill="#4CAF50" />
      <circle cx="40" cy="62" r="2" fill="#FFEB3B" />
      <circle cx="46" cy="62" r="2" fill="#F44336" />

      {/* Roof/Canopy */}
      <rect x="18" y="28" width="44" height="8" fill="#1565C0" rx="2" />
      <rect x="20" y="26" width="40" height="4" fill="#0D47A1" rx="1" />

      {/* Info sign on top */}
      <g transform="translate(40, 18)">
        <circle cx="0" cy="0" r="10" fill="#2196F3" />
        <circle cx="0" cy="0" r="8" fill="#BBDEFB" />
        <text x="0" y="4" textAnchor="middle" fill="#1565C0" fontSize="12" fontWeight="bold">i</text>
      </g>

      {/* Pole for sign */}
      <rect x="38" y="18" width="4" height="10" fill="#5D4037" />

      {/* Decorative pennant flags */}
      <g transform="translate(14, 30)">
        <polygon points="0,0 6,4 0,8" fill="#FF9800" />
      </g>
      <g transform="translate(60, 30)">
        <polygon points="6,0 0,4 6,8" fill="#FF9800" />
      </g>

      {/* Brochure holder on side */}
      <rect x="56" y="50" width="6" height="12" fill="#8D6E63" rx="1" />
      <rect x="57" y="51" width="4" height="2" fill="#FFEB3B" />
      <rect x="57" y="54" width="4" height="2" fill="#4CAF50" />
      <rect x="57" y="57" width="4" height="2" fill="#E91E63" />

      {/* Map display on other side */}
      <rect x="18" y="50" width="6" height="10" fill="#FFF59D" rx="1" />
      <line x1="19" y1="53" x2="23" y2="53" stroke="#8D6E63" strokeWidth="0.5" />
      <line x1="19" y1="55" x2="23" y2="55" stroke="#8D6E63" strokeWidth="0.5" />
      <line x1="19" y1="57" x2="23" y2="57" stroke="#8D6E63" strokeWidth="0.5" />
      <circle cx="21" cy="54" r="1" fill="#F44336" />
    </svg>
  );
};

export default InfoBooth;
