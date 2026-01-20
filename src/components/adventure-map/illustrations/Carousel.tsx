/**
 * Carousel.tsx - Exercises Library illustration
 *
 * A colorful merry-go-round representing the exercise collection
 */

import React from 'react';

interface IllustrationProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export const Carousel: React.FC<IllustrationProps> = ({ size = 80, className, animate = false }) => {
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

      {/* Base platform */}
      <ellipse cx="40" cy="68" rx="28" ry="8" fill="#5D4037" />
      <ellipse cx="40" cy="66" rx="28" ry="8" fill="#8D6E63" />

      {/* Decorative base trim */}
      <ellipse cx="40" cy="66" rx="26" ry="7" fill="none" stroke="#FFD700" strokeWidth="2" />

      {/* Center pole */}
      <rect x="37" y="18" width="6" height="50" fill="#FFD700" />
      <rect x="38" y="20" width="2" height="46" fill="#FFF59D" />

      {/* Top canopy */}
      <ellipse cx="40" cy="20" rx="30" ry="10" fill="#E91E63" />
      <ellipse cx="40" cy="18" rx="28" ry="9" fill="#F48FB1" />

      {/* Canopy stripes */}
      <path d="M 12 20 Q 40 8 68 20" fill="none" stroke="#C2185B" strokeWidth="3" />
      <path d="M 15 22 Q 40 12 65 22" fill="none" stroke="#AD1457" strokeWidth="2" />

      {/* Top ornament */}
      <circle cx="40" cy="10" r="5" fill="#FFD700" />
      <circle cx="40" cy="10" r="3" fill="#FFF59D" />
      {/* Flag */}
      <line x1="40" y1="5" x2="40" y2="-2" stroke="#5D4037" strokeWidth="1.5" />
      <polygon points="40,-2 48,1 40,4" fill="#E91E63" />

      {/* Carousel horses/animals - rotating group */}
      <g>
        {animate && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 40 50"
            to="360 40 50"
            dur="8s"
            repeatCount="indefinite"
          />
        )}

        {/* Horse 1 - front */}
        <g transform="translate(40, 50)">
          {/* Pole */}
          <line x1="0" y1="-20" x2="0" y2="12" stroke="#FFD700" strokeWidth="2" />
          {/* Horse body */}
          <ellipse cx="0" cy="-2" rx="8" ry="6" fill="#FFFFFF" />
          {/* Horse head */}
          <ellipse cx="6" cy="-6" rx="4" ry="3" fill="#FFFFFF" />
          {/* Saddle */}
          <ellipse cx="0" cy="-4" rx="5" ry="3" fill="#E91E63" />
          {/* Legs */}
          <line x1="-4" y1="4" x2="-5" y2="10" stroke="#FFFFFF" strokeWidth="2" />
          <line x1="4" y1="4" x2="5" y2="10" stroke="#FFFFFF" strokeWidth="2" />
        </g>

        {/* Horse 2 - right */}
        <g transform="translate(58, 50) rotate(90)">
          <line x1="0" y1="-20" x2="0" y2="12" stroke="#FFD700" strokeWidth="2" />
          <ellipse cx="0" cy="-2" rx="7" ry="5" fill="#64B5F6" />
          <ellipse cx="5" cy="-5" rx="3.5" ry="2.5" fill="#64B5F6" />
          <ellipse cx="0" cy="-4" rx="4.5" ry="2.5" fill="#1565C0" />
        </g>

        {/* Horse 3 - back */}
        <g transform="translate(40, 50) rotate(180)">
          <line x1="0" y1="-20" x2="0" y2="12" stroke="#FFD700" strokeWidth="2" />
          <ellipse cx="0" cy="-2" rx="7" ry="5" fill="#FFB74D" />
          <ellipse cx="5" cy="-5" rx="3.5" ry="2.5" fill="#FFB74D" />
          <ellipse cx="0" cy="-4" rx="4.5" ry="2.5" fill="#F57C00" />
        </g>

        {/* Horse 4 - left */}
        <g transform="translate(22, 50) rotate(270)">
          <line x1="0" y1="-20" x2="0" y2="12" stroke="#FFD700" strokeWidth="2" />
          <ellipse cx="0" cy="-2" rx="7" ry="5" fill="#81C784" />
          <ellipse cx="5" cy="-5" rx="3.5" ry="2.5" fill="#81C784" />
          <ellipse cx="0" cy="-4" rx="4.5" ry="2.5" fill="#388E3C" />
        </g>
      </g>

      {/* Decorative lights around edge */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x = 40 + Math.cos(rad) * 25;
        const y = 28 + Math.sin(rad) * 8;
        const colors = ['#FFEB3B', '#E91E63', '#4CAF50', '#2196F3'];
        return (
          <circle
            key={angle}
            cx={x}
            cy={y}
            r={2}
            fill={colors[i % colors.length]}
          />
        );
      })}
    </svg>
  );
};

export default Carousel;
