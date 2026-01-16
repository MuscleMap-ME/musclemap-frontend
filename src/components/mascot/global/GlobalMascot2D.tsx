/**
 * GlobalMascot2D
 *
 * 2D SVG fallback for the TЯIPTθMΞAN Spirit global mascot.
 * Used when WebGL is unavailable or reduced motion is preferred.
 */

import React from 'react';
import { motion } from 'framer-motion';

const variants = {
  idle: {
    rotate: [0, 5, -5, 0],
    scale: [1, 1.02, 1],
    transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
  },
  greeting: {
    rotate: [0, 15, -15, 0],
    scale: [1, 1.1, 1],
    transition: { duration: 1.5, repeat: 2 },
  },
  loading: {
    rotate: 360,
    transition: { duration: 2, repeat: Infinity, ease: 'linear' },
  },
  celebrating: {
    scale: [1, 1.2, 1],
    transition: { duration: 0.5, repeat: 3 },
  },
  contemplating: {
    opacity: [1, 0.7, 1],
    transition: { duration: 3, repeat: Infinity },
  },
};

const sizeClasses = {
  small: 'w-16 h-16',
  medium: 'w-32 h-32',
  large: 'w-48 h-48',
};

export default function GlobalMascot2D({
  animationState = 'idle',
  size = 'medium',
  className = '',
  reducedMotion = false,
}) {
  const sizeClass = sizeClasses[size] || sizeClasses.medium;
  const animate = reducedMotion ? {} : variants[animationState] || variants.idle;

  return (
    <motion.div
      className={`${sizeClass} ${className}`}
      animate={animate}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
        <defs>
          {/* Gradient for the theta symbol */}
          <linearGradient id="thetaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer glow ring */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#c4b5fd"
          strokeWidth="1"
          opacity="0.3"
        />

        {/* Main theta circle (torus representation) */}
        <circle
          cx="50"
          cy="50"
          r="30"
          fill="none"
          stroke="url(#thetaGradient)"
          strokeWidth="8"
          filter="url(#glow)"
        />

        {/* Horizontal bar through theta */}
        <rect
          x="25"
          y="46"
          width="50"
          height="8"
          rx="4"
          fill="url(#thetaGradient)"
          filter="url(#glow)"
        />

        {/* Orbiting particles */}
        {[...Array(8)].map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          return (
            <circle
              key={i}
              cx={50 + Math.cos(angle) * 40}
              cy={50 + Math.sin(angle) * 40}
              r="2"
              fill="#c4b5fd"
              opacity="0.5"
            />
          );
        })}
      </svg>
    </motion.div>
  );
}
