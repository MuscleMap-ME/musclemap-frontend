/**
 * MapMenuSkeleton - Loading State
 *
 * Animated skeleton placeholder shown while the renderer initializes.
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { MapMenuSkeletonProps } from '../types';

export function MapMenuSkeleton({ mode }: MapMenuSkeletonProps) {
  const nodeCount = mode === 'compact' ? 6 : 12;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-void-base">
      {/* Animated dots representing nodes */}
      <div className="relative w-full h-full max-w-md max-h-80">
        {Array.from({ length: nodeCount }).map((_, i) => {
          // Position dots in a circular/grid pattern
          const angle = (i / nodeCount) * Math.PI * 2;
          const radius = mode === 'compact' ? 30 : 40;
          const x = 50 + Math.cos(angle) * radius;
          const y = 50 + Math.sin(angle) * radius;

          return (
            <motion.div
              key={i}
              className="absolute w-4 h-4 rounded-full bg-glass-white-10"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 1.5,
                delay: i * 0.1,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          );
        })}

        {/* Center loading indicator */}
        <motion.div
          className="
            absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            w-12 h-12 rounded-full border-2 border-brand-blue-500/30
            border-t-brand-blue-500
          "
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Loading text */}
        <motion.p
          className="
            absolute bottom-8 left-1/2 -translate-x-1/2
            text-white/40 text-sm
          "
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          Loading map...
        </motion.p>

        {/* Connection lines (skeleton) */}
        {mode === 'full' && (
          <svg
            className="absolute inset-0 w-full h-full opacity-10"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {Array.from({ length: nodeCount }).map((_, i) => {
              const angle1 = (i / nodeCount) * Math.PI * 2;
              const angle2 = ((i + 1) / nodeCount) * Math.PI * 2;
              const x1 = 50 + Math.cos(angle1) * 40;
              const y1 = 50 + Math.sin(angle1) * 40;
              const x2 = 50 + Math.cos(angle2) * 40;
              const y2 = 50 + Math.sin(angle2) * 40;

              return (
                <motion.line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="white"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                  animate={{
                    strokeDashoffset: [0, 4],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}

export default MapMenuSkeleton;
