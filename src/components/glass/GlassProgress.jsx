/**
 * GlassProgress - Liquid fill progress indicators
 *
 * Features smooth liquid animations and optional glow effects.
 */

import React from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

/**
 * GlassProgressBar - Horizontal progress bar with liquid fill
 */
export const GlassProgressBar = ({
  value = 0,
  max = 100,
  variant = 'brand',
  size = 'md',
  showValue = false,
  animated = true,
  className,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeMap = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
    xl: 'h-4',
  };

  const variantGradients = {
    brand: 'from-[var(--brand-blue-500)] to-[var(--brand-blue-400)]',
    pulse: 'from-[var(--brand-pulse-500)] to-[var(--brand-pulse-400)]',
    success: 'from-emerald-500 to-emerald-400',
    warning: 'from-amber-500 to-amber-400',
  };

  const variantGlows = {
    brand: 'shadow-[0_0_10px_rgba(0,102,255,0.4)]',
    pulse: 'shadow-[0_0_10px_rgba(255,51,102,0.4)]',
    success: 'shadow-[0_0_10px_rgba(34,197,94,0.4)]',
    warning: 'shadow-[0_0_10px_rgba(245,158,11,0.4)]',
  };

  return (
    <div className={clsx('relative', className)}>
      <div
        className={clsx(
          'progress-glass w-full overflow-hidden',
          sizeMap[size]
        )}
      >
        <motion.div
          className={clsx(
            'h-full rounded-full bg-gradient-to-r',
            variantGradients[variant],
            variantGlows[variant],
            animated && 'progress-fill-liquid'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{
            type: 'spring',
            stiffness: 100,
            damping: 20,
            duration: 0.8,
          }}
        />
      </div>
      {showValue && (
        <span className="absolute right-0 -top-6 text-xs text-[var(--text-secondary)] font-medium">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
};

/**
 * GlassCircularProgress - Circular progress with glow
 */
export const GlassCircularProgress = ({
  value = 0,
  max = 100,
  size = 64,
  strokeWidth = 4,
  variant = 'brand',
  showValue = false,
  className,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const variantColors = {
    brand: 'var(--brand-blue-500)',
    pulse: 'var(--brand-pulse-500)',
    success: '#22c55e',
    warning: '#f59e0b',
  };

  return (
    <div
      className={clsx('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--glass-white-10)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={variantColors[variant]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{
            type: 'spring',
            stiffness: 100,
            damping: 20,
          }}
          style={{
            filter: `drop-shadow(0 0 6px ${variantColors[variant]})`,
          }}
        />
      </svg>
      {showValue && (
        <span className="absolute text-sm font-semibold text-[var(--text-primary)]">
          {Math.round(percentage)}
        </span>
      )}
    </div>
  );
};

/**
 * GlassLiquidMeter - Vertical liquid fill (like a test tube)
 */
export const GlassLiquidMeter = ({
  value = 0,
  max = 100,
  height = 120,
  width = 40,
  variant = 'brand',
  label,
  className,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const variantGradients = {
    brand: 'from-[var(--brand-blue-600)] via-[var(--brand-blue-500)] to-[var(--brand-blue-400)]',
    pulse: 'from-[var(--brand-pulse-600)] via-[var(--brand-pulse-500)] to-[var(--brand-pulse-400)]',
    success: 'from-emerald-600 via-emerald-500 to-emerald-400',
    warning: 'from-amber-600 via-amber-500 to-amber-400',
  };

  return (
    <div className={clsx('flex flex-col items-center gap-2', className)}>
      <div
        className="relative rounded-full overflow-hidden bg-[var(--glass-white-5)] border border-[var(--border-default)]"
        style={{ width, height }}
      >
        {/* Liquid fill */}
        <motion.div
          className={clsx(
            'absolute bottom-0 left-0 right-0 bg-gradient-to-t',
            variantGradients[variant]
          )}
          initial={{ height: 0 }}
          animate={{ height: `${percentage}%` }}
          transition={{
            type: 'spring',
            stiffness: 80,
            damping: 20,
          }}
        >
          {/* Liquid surface shimmer */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-white/30 blur-sm" />
          {/* Bubble effects */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="bubble-1" />
            <div className="bubble-2" />
          </div>
        </motion.div>
        {/* Glass reflection */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-transparent" />
      </div>
      {label && (
        <span className="text-xs font-medium text-[var(--text-tertiary)]">
          {label}
        </span>
      )}
      <style>{`
        .bubble-1, .bubble-2 {
          position: absolute;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          animation: bubble-rise 3s ease-in-out infinite;
        }
        .bubble-1 {
          width: 4px;
          height: 4px;
          left: 20%;
          animation-delay: 0s;
        }
        .bubble-2 {
          width: 3px;
          height: 3px;
          left: 60%;
          animation-delay: 1.5s;
        }
        @keyframes bubble-rise {
          0%, 100% {
            bottom: 10%;
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            bottom: 90%;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default GlassProgressBar;
