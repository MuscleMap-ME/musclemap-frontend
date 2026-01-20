/**
 * JoustingArena.tsx - Crews/Rivals illustration
 *
 * A medieval jousting arena for competitions and team battles
 */

import React from 'react';

interface IllustrationProps {
  size?: number;
  className?: string;
}

export const JoustingArena: React.FC<IllustrationProps> = ({ size = 80, className }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* Shadow */}
      <ellipse cx="40" cy="76" rx="35" ry="5" fill="rgba(0,0,0,0.15)" />

      {/* Arena ground */}
      <ellipse cx="40" cy="65" rx="36" ry="10" fill="#8D6E63" />
      <ellipse cx="40" cy="63" rx="34" ry="9" fill="#D7CCC8" />

      {/* Central divider/fence */}
      <rect x="5" y="55" width="70" height="3" fill="#5D4037" />
      <rect x="8" y="50" width="3" height="15" fill="#5D4037" />
      <rect x="25" y="50" width="3" height="15" fill="#5D4037" />
      <rect x="52" y="50" width="3" height="15" fill="#5D4037" />
      <rect x="69" y="50" width="3" height="15" fill="#5D4037" />

      {/* Arena fence/wall */}
      <ellipse cx="40" cy="60" rx="36" ry="12" fill="none" stroke="#5D4037" strokeWidth="4" />

      {/* Left tower with flag */}
      <rect x="2" y="30" width="14" height="35" fill="#C62828" rx="1" />
      <polygon points="2,30 9,18 16,30" fill="#B71C1C" />
      <rect x="4" y="35" width="10" height="8" fill="#FFCDD2" rx="1" />
      <rect x="7" y="37" width="4" height="4" fill="#C62828" />
      {/* Flag */}
      <line x1="9" y1="18" x2="9" y2="8" stroke="#5D4037" strokeWidth="2" />
      <polygon points="9,8 20,12 9,16" fill="#C62828" />

      {/* Right tower with flag */}
      <rect x="64" y="30" width="14" height="35" fill="#1565C0" rx="1" />
      <polygon points="64,30 71,18 78,30" fill="#0D47A1" />
      <rect x="66" y="35" width="10" height="8" fill="#BBDEFB" rx="1" />
      <rect x="69" y="37" width="4" height="4" fill="#1565C0" />
      {/* Flag */}
      <line x1="71" y1="18" x2="71" y2="8" stroke="#5D4037" strokeWidth="2" />
      <polygon points="71,8 60,12 71,16" fill="#1565C0" />

      {/* Left jousting knight */}
      <g transform="translate(20, 48)">
        {/* Horse body */}
        <ellipse cx="0" cy="8" rx="8" ry="5" fill="#8D6E63" />
        {/* Horse head */}
        <ellipse cx="8" cy="4" rx="4" ry="3" fill="#8D6E63" />
        {/* Horse legs */}
        <line x1="-4" y1="12" x2="-5" y2="18" stroke="#6D4C41" strokeWidth="2" />
        <line x1="2" y1="12" x2="3" y2="18" stroke="#6D4C41" strokeWidth="2" />
        {/* Knight body */}
        <ellipse cx="-2" cy="2" rx="4" ry="5" fill="#C62828" />
        {/* Knight helmet */}
        <circle cx="-2" cy="-3" r="3" fill="#9E9E9E" />
        <rect x="-4" y="-3" width="4" height="2" fill="#757575" />
        {/* Lance */}
        <line x1="2" y1="0" x2="18" y2="-5" stroke="#8D6E63" strokeWidth="2" />
        <polygon points="18,-5 22,-6 18,-3" fill="#9E9E9E" />
        {/* Shield */}
        <ellipse cx="-6" cy="0" rx="3" ry="4" fill="#C62828" />
        <circle cx="-6" cy="0" r="1.5" fill="#FFD700" />
      </g>

      {/* Right jousting knight */}
      <g transform="translate(60, 48) scale(-1, 1)">
        {/* Horse body */}
        <ellipse cx="0" cy="8" rx="8" ry="5" fill="#A1887F" />
        {/* Horse head */}
        <ellipse cx="8" cy="4" rx="4" ry="3" fill="#A1887F" />
        {/* Horse legs */}
        <line x1="-4" y1="12" x2="-5" y2="18" stroke="#8D6E63" strokeWidth="2" />
        <line x1="2" y1="12" x2="3" y2="18" stroke="#8D6E63" strokeWidth="2" />
        {/* Knight body */}
        <ellipse cx="-2" cy="2" rx="4" ry="5" fill="#1565C0" />
        {/* Knight helmet */}
        <circle cx="-2" cy="-3" r="3" fill="#9E9E9E" />
        <rect x="-4" y="-3" width="4" height="2" fill="#757575" />
        {/* Lance */}
        <line x1="2" y1="0" x2="18" y2="-5" stroke="#8D6E63" strokeWidth="2" />
        <polygon points="18,-5 22,-6 18,-3" fill="#9E9E9E" />
        {/* Shield */}
        <ellipse cx="-6" cy="0" rx="3" ry="4" fill="#1565C0" />
        <circle cx="-6" cy="0" r="1.5" fill="#FFD700" />
      </g>

      {/* Royal viewing box (center top) */}
      <rect x="28" y="25" width="24" height="18" fill="#FFD700" rx="2" />
      <rect x="30" y="27" width="20" height="12" fill="#FFF59D" rx="1" />
      {/* Crown decoration */}
      <g transform="translate(40, 22)">
        <path d="M -8 0 L -6 -4 L -3 -1 L 0 -5 L 3 -1 L 6 -4 L 8 0 Z" fill="#FFD700" />
        <circle cx="0" cy="-5" r="1.5" fill="#E91E63" />
      </g>

      {/* Banner decorations */}
      <rect x="22" y="28" width="4" height="12" fill="#C62828" rx="1" />
      <polygon points="22,40 24,44 26,40" fill="#C62828" />
      <rect x="54" y="28" width="4" height="12" fill="#1565C0" rx="1" />
      <polygon points="54,40 56,44 58,40" fill="#1565C0" />

      {/* Crowd silhouettes */}
      <g opacity="0.3">
        <circle cx="32" cy="32" r="2" fill="#5D4037" />
        <circle cx="36" cy="31" r="2" fill="#5D4037" />
        <circle cx="40" cy="32" r="2" fill="#5D4037" />
        <circle cx="44" cy="31" r="2" fill="#5D4037" />
        <circle cx="48" cy="32" r="2" fill="#5D4037" />
      </g>
    </svg>
  );
};

export default JoustingArena;
