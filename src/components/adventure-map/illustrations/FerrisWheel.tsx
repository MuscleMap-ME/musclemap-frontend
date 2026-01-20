/**
 * FerrisWheel.tsx - Community/Social area illustration
 *
 * A grand ferris wheel representing community and connections
 */

import React from 'react';

interface IllustrationProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export const FerrisWheel: React.FC<IllustrationProps> = ({ size = 80, className, animate = false }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* Shadow */}
      <ellipse cx="40" cy="78" rx="25" ry="4" fill="rgba(0,0,0,0.15)" />

      {/* Support structure - A-frame legs */}
      <line x1="20" y1="75" x2="40" y2="40" stroke="#5D4037" strokeWidth="4" />
      <line x1="60" y1="75" x2="40" y2="40" stroke="#5D4037" strokeWidth="4" />
      {/* Cross brace */}
      <line x1="26" y1="62" x2="54" y2="62" stroke="#8D6E63" strokeWidth="2" />
      <line x1="30" y1="55" x2="50" y2="55" stroke="#8D6E63" strokeWidth="2" />

      {/* Base platform */}
      <rect x="15" y="72" width="50" height="5" fill="#8D6E63" rx="1" />

      {/* Main wheel structure */}
      <g>
        {animate && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 40 35"
            to="360 40 35"
            dur="20s"
            repeatCount="indefinite"
          />
        )}

        {/* Outer wheel ring */}
        <circle cx="40" cy="35" r="28" fill="none" stroke="#E91E63" strokeWidth="4" />
        <circle cx="40" cy="35" r="26" fill="none" stroke="#F48FB1" strokeWidth="1" />

        {/* Inner wheel ring */}
        <circle cx="40" cy="35" r="20" fill="none" stroke="#9C27B0" strokeWidth="2" />

        {/* Spokes */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x2 = 40 + Math.cos(rad) * 26;
          const y2 = 35 + Math.sin(rad) * 26;
          return (
            <line
              key={angle}
              x1="40"
              y1="35"
              x2={x2}
              y2={y2}
              stroke="#7B1FA2"
              strokeWidth="2"
            />
          );
        })}

        {/* Gondolas/Cabins */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const x = 40 + Math.cos(rad) * 26;
          const y = 35 + Math.sin(rad) * 26;
          const colors = ['#2196F3', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#FFEB3B', '#F44336'];

          return (
            <g key={angle}>
              {/* Cabin hanger */}
              <line
                x1={x}
                y1={y}
                x2={x}
                y2={y + 6}
                stroke="#5D4037"
                strokeWidth="1.5"
              />
              {/* Cabin body - always upright */}
              <g transform={animate ? `rotate(${-angle} ${x} ${y + 10})` : ''}>
                {animate && (
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from={`${-angle} ${x} ${y + 10}`}
                    to={`${-angle - 360} ${x} ${y + 10}`}
                    dur="20s"
                    repeatCount="indefinite"
                  />
                )}
                <ellipse cx={x} cy={y + 10} rx="5" ry="4" fill={colors[i]} />
                <ellipse cx={x} cy={y + 9} rx="4" ry="2.5" fill="rgba(255,255,255,0.3)" />
              </g>
            </g>
          );
        })}
      </g>

      {/* Center hub */}
      <circle cx="40" cy="35" r="5" fill="#FFD700" />
      <circle cx="40" cy="35" r="3" fill="#FFF59D" />
      <circle cx="40" cy="35" r="1.5" fill="#F57F17" />

      {/* Decorative lights on frame */}
      <circle cx="25" y="68" r="1.5" fill="#FFEB3B" />
      <circle cx="55" cy="68" r="1.5" fill="#FFEB3B" />
      <circle cx="33" cy="58" r="1.5" fill="#E91E63" />
      <circle cx="47" cy="58" r="1.5" fill="#E91E63" />

      {/* Ticket booth */}
      <rect x="5" y="65" width="10" height="10" fill="#4CAF50" rx="1" />
      <rect x="6" y="66" width="8" height="5" fill="#C8E6C9" rx="1" />
      <polygon points="5,65 10,60 15,65" fill="#388E3C" />
    </svg>
  );
};

export default FerrisWheel;
