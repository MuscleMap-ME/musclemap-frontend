/**
 * WalletVault.tsx - Wallet/Economy illustration
 *
 * A treasure vault booth for the economy/credits system
 */

import React from 'react';

interface IllustrationProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export const WalletVault: React.FC<IllustrationProps> = ({ size = 80, className, animate = false }) => {
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

      {/* Main vault structure */}
      <rect x="14" y="28" width="52" height="42" fill="#37474F" rx="3" />

      {/* Vault body shine */}
      <rect x="16" y="30" width="48" height="38" fill="#455A64" rx="2" />
      <rect x="18" y="32" width="20" height="34" fill="#546E7A" rx="1" />

      {/* Vault door (circular) */}
      <circle cx="40" cy="50" r="18" fill="#607D8B" />
      <circle cx="40" cy="50" r="16" fill="#78909C" />
      <circle cx="40" cy="50" r="14" fill="#546E7A" stroke="#FFD700" strokeWidth="2" />

      {/* Door handle/wheel */}
      <circle cx="40" cy="50" r="8" fill="#455A64" />
      <circle cx="40" cy="50" r="6" fill="#37474F" />
      {/* Wheel spokes */}
      <line x1="40" y1="42" x2="40" y2="58" stroke="#607D8B" strokeWidth="2" />
      <line x1="32" y1="50" x2="48" y2="50" stroke="#607D8B" strokeWidth="2" />
      <line x1="34" y1="44" x2="46" y2="56" stroke="#607D8B" strokeWidth="2" />
      <line x1="46" y1="44" x2="34" y2="56" stroke="#607D8B" strokeWidth="2" />
      {/* Center knob */}
      <circle cx="40" cy="50" r="3" fill="#FFD700" />
      <circle cx="40" cy="50" r="2" fill="#FFF59D" />

      {/* Bolts around door */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x = 40 + Math.cos(rad) * 15;
        const y = 50 + Math.sin(rad) * 15;
        return (
          <circle key={angle} cx={x} cy={y} r="1.5" fill="#37474F" />
        );
      })}

      {/* Hinges on left */}
      <rect x="14" y="35" width="4" height="8" fill="#455A64" rx="1" />
      <rect x="14" y="55" width="4" height="8" fill="#455A64" rx="1" />

      {/* Top decoration - coins/gold peeking out */}
      <g transform="translate(40, 24)">
        <ellipse cx="0" cy="0" rx="15" ry="4" fill="#5D4037" />
        <ellipse cx="-8" cy="-2" rx="4" ry="1.5" fill="#FFD700" />
        <ellipse cx="-4" cy="-3" rx="4" ry="1.5" fill="#FFC107" />
        <ellipse cx="2" cy="-2" rx="4" ry="1.5" fill="#FFD700" />
        <ellipse cx="8" cy="-3" rx="4" ry="1.5" fill="#FFC107" />
        {animate && (
          <>
            <ellipse cx="-6" cy="-4" rx="3" ry="1" fill="#FFF59D">
              <animate attributeName="cy" values="-4;-6;-4" dur="2s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="4" cy="-5" rx="3" ry="1" fill="#FFF59D">
              <animate attributeName="cy" values="-5;-7;-5" dur="2.5s" repeatCount="indefinite" />
            </ellipse>
          </>
        )}
      </g>

      {/* Sign above vault */}
      <rect x="22" y="12" width="36" height="10" fill="#FFD700" rx="2" />
      <rect x="24" y="13" width="32" height="8" fill="#FFF59D" rx="1" />
      {/* Dollar signs */}
      <text x="32" y="19" fill="#388E3C" fontSize="6" fontWeight="bold">$</text>
      <text x="40" y="19" fill="#388E3C" fontSize="6" fontWeight="bold">$</text>
      <text x="48" y="19" fill="#388E3C" fontSize="6" fontWeight="bold">$</text>

      {/* Floating coins (decorative) */}
      <g opacity="0.9">
        {animate && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 0,-2; 0,0"
            dur="1.5s"
            repeatCount="indefinite"
          />
        )}
        <ellipse cx="8" cy="35" rx="4" ry="1.5" fill="#FFD700" />
        <ellipse cx="8" cy="34" rx="3" ry="1" fill="#FFF59D" />
        <text x="8" y="35" textAnchor="middle" fill="#F57F17" fontSize="3">$</text>
      </g>

      <g opacity="0.9">
        {animate && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 0,-3; 0,0"
            dur="2s"
            repeatCount="indefinite"
          />
        )}
        <ellipse cx="72" cy="40" rx="4" ry="1.5" fill="#FFD700" />
        <ellipse cx="72" cy="39" rx="3" ry="1" fill="#FFF59D" />
        <text x="72" y="40" textAnchor="middle" fill="#F57F17" fontSize="3">$</text>
      </g>

      {/* Sparkle effects */}
      {animate && (
        <>
          <circle cx="25" cy="28" r="1" fill="#FFF59D">
            <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
          </circle>
          <circle cx="55" cy="32" r="1" fill="#FFF59D">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" />
          </circle>
        </>
      )}
    </svg>
  );
};

export default WalletVault;
