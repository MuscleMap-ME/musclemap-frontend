/**
 * MessageBoard.tsx - Messages/Communication illustration
 *
 * A message board kiosk for communication features
 */

import React from 'react';

interface IllustrationProps {
  size?: number;
  className?: string;
}

export const MessageBoard: React.FC<IllustrationProps> = ({ size = 80, className }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* Shadow */}
      <ellipse cx="40" cy="75" rx="20" ry="4" fill="rgba(0,0,0,0.15)" />

      {/* Post */}
      <rect x="36" y="45" width="8" height="28" fill="#5D4037" />
      <rect x="38" y="47" width="4" height="24" fill="#6D4C41" />

      {/* Base */}
      <ellipse cx="40" cy="72" rx="12" ry="4" fill="#795548" />

      {/* Board frame */}
      <rect x="12" y="12" width="56" height="38" fill="#8D6E63" rx="3" />
      <rect x="14" y="14" width="52" height="34" fill="#A1887F" rx="2" />

      {/* Cork board background */}
      <rect x="16" y="16" width="48" height="30" fill="#D7CCC8" rx="1" />

      {/* Pinned notes/messages */}
      {/* Note 1 - yellow */}
      <g transform="translate(22, 22)">
        <rect x="0" y="0" width="14" height="12" fill="#FFF59D" transform="rotate(-5)" />
        <circle cx="7" cy="-1" r="2" fill="#F44336" />
        <line x1="2" y1="4" x2="12" y2="4" stroke="#BDBDBD" strokeWidth="1" />
        <line x1="2" y1="7" x2="10" y2="7" stroke="#BDBDBD" strokeWidth="1" />
      </g>

      {/* Note 2 - blue */}
      <g transform="translate(40, 20)">
        <rect x="0" y="0" width="12" height="10" fill="#BBDEFB" transform="rotate(3)" />
        <circle cx="6" cy="-1" r="2" fill="#4CAF50" />
        <line x1="2" y1="3" x2="10" y2="3" stroke="#90CAF9" strokeWidth="1" />
        <line x1="2" y1="6" x2="8" y2="6" stroke="#90CAF9" strokeWidth="1" />
      </g>

      {/* Note 3 - pink */}
      <g transform="translate(24, 32)">
        <rect x="0" y="0" width="10" height="10" fill="#F8BBD9" transform="rotate(-2)" />
        <circle cx="5" cy="-1" r="2" fill="#2196F3" />
        <line x1="1" y1="3" x2="9" y2="3" stroke="#F48FB1" strokeWidth="1" />
        <line x1="1" y1="6" x2="7" y2="6" stroke="#F48FB1" strokeWidth="1" />
      </g>

      {/* Note 4 - green */}
      <g transform="translate(44, 30)">
        <rect x="0" y="0" width="14" height="11" fill="#C8E6C9" transform="rotate(4)" />
        <circle cx="7" cy="-1" r="2" fill="#FF9800" />
        <line x1="2" y1="4" x2="12" y2="4" stroke="#A5D6A7" strokeWidth="1" />
        <line x1="2" y1="7" x2="10" y2="7" stroke="#A5D6A7" strokeWidth="1" />
      </g>

      {/* Photo/picture pinned */}
      <g transform="translate(36, 22)">
        <rect x="0" y="0" width="8" height="8" fill="white" />
        <rect x="1" y="1" width="6" height="6" fill="#E0E0E0" />
        <circle cx="4" cy="4" r="2" fill="#9E9E9E" />
        <circle cx="1.5" cy="-1" r="1.5" fill="#E91E63" />
      </g>

      {/* Header sign */}
      <rect x="20" y="4" width="40" height="10" fill="#FF9800" rx="2" />
      <rect x="22" y="5" width="36" height="8" fill="#FFB74D" rx="1" />
      <text x="40" y="11" textAnchor="middle" fill="#E65100" fontSize="5" fontWeight="bold">MESSAGES</text>

      {/* Decorative elements */}
      <circle cx="16" cy="8" r="3" fill="#4CAF50" />
      <circle cx="64" cy="8" r="3" fill="#2196F3" />

      {/* Speech bubble decoration */}
      <g transform="translate(8, 35)">
        <ellipse cx="0" cy="0" rx="5" ry="4" fill="#FFEB3B" />
        <polygon points="-2,4 0,8 2,4" fill="#FFEB3B" />
        <text x="0" y="1" textAnchor="middle" fill="#F57F17" fontSize="4">!</text>
      </g>

      <g transform="translate(72, 30)">
        <ellipse cx="0" cy="0" rx="5" ry="4" fill="#4CAF50" />
        <polygon points="-2,4 0,8 2,4" fill="#4CAF50" />
        <text x="0" y="1" textAnchor="middle" fill="white" fontSize="4">✓</text>
      </g>
    </svg>
  );
};

export default MessageBoard;
