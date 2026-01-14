/**
 * FeatureCard - Individual feature discovery card
 *
 * Displays a feature with glassmorphism styling, animated effects,
 * and touch-friendly interactions. Part of the FeatureDiscovery system.
 *
 * Features:
 * - Compact card with icon, title, short description
 * - Gradient border that pulses subtly to attract attention
 * - "Try it" button or click entire card
 * - "Dismiss" (X) button to hide forever
 * - Badge for "New!" features
 * - Animated entrance when appearing
 */

import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import * as Icons from 'lucide-react';

/**
 * Get icon component from Lucide by name
 */
function getIcon(iconName, props = {}) {
  const IconComponent = Icons[iconName] || Icons.HelpCircle;
  return <IconComponent {...props} />;
}

/**
 * FeatureCard Component
 *
 * A glass-styled card showing a discoverable feature with:
 * - Animated entrance/exit
 * - Pulsing gradient border to draw attention
 * - Icon with custom color
 * - "Try it" action button
 * - Dismiss option
 * - "New!" badge for new features
 */
const FeatureCard = forwardRef(function FeatureCard(
  {
    feature,
    onClick,
    onDismiss,
    isActive = false,
    showPulse = true,
    index = 0,
    className,
  },
  ref
) {
  const { title, description, icon, color = '#0066FF', isNew = false } = feature;

  // Animation variants for card entrance/exit
  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25,
        delay: index * 0.1,
      },
    },
    exit: {
      opacity: 0,
      x: -100,
      scale: 0.9,
      transition: {
        duration: 0.2,
        ease: 'easeOut',
      },
    },
  };

  // Handle card click
  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick(feature);
    }
  };

  // Handle dismiss click
  const handleDismiss = (e) => {
    e.stopPropagation();
    if (onDismiss) {
      onDismiss(feature.id);
    }
  };

  return (
    <motion.div
      ref={ref}
      layout
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={clsx(
        // Base glass styling
        'relative overflow-hidden rounded-2xl',
        'bg-white/5 backdrop-blur-md',
        // Touch interaction
        'cursor-pointer touch-action-manipulation select-none',
        // Transitions
        'transition-all duration-200',
        // Active state
        isActive && 'ring-2 ring-white/20',
        className
      )}
      onClick={handleClick}
      whileHover={{
        scale: 1.02,
        y: -2,
      }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Pulsing gradient border - draws attention */}
      {showPulse && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            border: `2px solid transparent`,
            background: `linear-gradient(#0a0a0a, #0a0a0a) padding-box,
                         linear-gradient(135deg, ${color}60, ${color}20, ${color}60) border-box`,
          }}
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Static border when not pulsing */}
      {!showPulse && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        />
      )}

      {/* Gradient glow effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${color}15, transparent 60%)`,
        }}
        animate={
          showPulse
            ? {
                opacity: [0.5, 0.8, 0.5],
              }
            : {}
        }
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* "New!" badge */}
      {isNew && (
        <motion.div
          className="absolute top-3 right-3 z-10"
          initial={{ scale: 0, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20, delay: index * 0.1 + 0.2 }}
        >
          <div
            className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
            style={{
              background: `linear-gradient(135deg, ${color}, ${color}CC)`,
              boxShadow: `0 2px 8px ${color}50`,
            }}
          >
            New!
          </div>
        </motion.div>
      )}

      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className={clsx(
            'absolute top-3 z-10',
            isNew ? 'right-16' : 'right-3',
            'w-6 h-6 rounded-full',
            'flex items-center justify-center',
            'bg-white/5 hover:bg-white/15',
            'text-gray-500 hover:text-gray-300',
            'transition-all duration-150',
            'opacity-60 hover:opacity-100'
          )}
          aria-label={`Dismiss ${title} suggestion`}
        >
          <Icons.X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Card content */}
      <div className="relative p-4 flex gap-4">
        {/* Icon container with glow */}
        <div className="flex-shrink-0">
          <motion.div
            className="w-12 h-12 rounded-xl flex items-center justify-center relative"
            style={{
              background: `linear-gradient(135deg, ${color}30, ${color}10)`,
              boxShadow: showPulse ? `0 0 20px ${color}40` : 'none',
            }}
            animate={
              showPulse
                ? {
                    boxShadow: [
                      `0 0 15px ${color}30`,
                      `0 0 25px ${color}50`,
                      `0 0 15px ${color}30`,
                    ],
                  }
                : {}
            }
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {getIcon(icon, {
              className: 'w-6 h-6',
              style: { color },
              strokeWidth: 1.5,
            })}
          </motion.div>
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0 pr-6">
          <h3 className="font-bold text-white text-base mb-1 truncate">{title}</h3>
          <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">{description}</p>
        </div>
      </div>

      {/* "Try it" action button */}
      <div className="relative px-4 pb-4 pt-0">
        <motion.button
          className={clsx(
            'w-full py-2.5 rounded-xl',
            'flex items-center justify-center gap-2',
            'font-medium text-sm text-white',
            'transition-colors duration-150'
          )}
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}CC)`,
          }}
          whileHover={{
            filter: 'brightness(1.1)',
          }}
          whileTap={{ scale: 0.98 }}
          onClick={handleClick}
        >
          Try it
          <Icons.ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Inner highlight for glass effect */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)',
        }}
      />
    </motion.div>
  );
});

/**
 * FeatureCardSkeleton - Loading placeholder
 */
export function FeatureCardSkeleton({ className }) {
  return (
    <div
      className={clsx(
        'rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-4',
        'animate-pulse',
        className
      )}
    >
      <div className="flex gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/10" />
        <div className="flex-1">
          <div className="h-5 bg-white/10 rounded w-3/4 mb-2" />
          <div className="h-4 bg-white/10 rounded w-full mb-1" />
          <div className="h-4 bg-white/10 rounded w-2/3" />
        </div>
      </div>
      <div className="h-10 bg-white/10 rounded-xl mt-4" />
    </div>
  );
}

/**
 * FeatureCardCompact - Smaller version for horizontal scrolling
 */
export function FeatureCardCompact({ feature, onClick, className }) {
  const { title, icon, color = '#0066FF', isNew = false } = feature;

  return (
    <motion.button
      className={clsx(
        'flex-shrink-0 px-4 py-3 rounded-xl',
        'bg-white/5 backdrop-blur-md border border-white/10',
        'flex items-center gap-2',
        'cursor-pointer relative',
        className
      )}
      onClick={() => onClick?.(feature)}
      whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.2)' }}
      whileTap={{ scale: 0.98 }}
    >
      {/* New badge for compact */}
      {isNew && (
        <div
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}CC)`,
          }}
        >
          <Icons.Sparkles className="w-2.5 h-2.5 text-white" />
        </div>
      )}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: `${color}20` }}
      >
        {getIcon(icon, {
          className: 'w-4 h-4',
          style: { color },
          strokeWidth: 1.5,
        })}
      </div>
      <span className="text-sm font-medium text-white whitespace-nowrap">{title}</span>
    </motion.button>
  );
}

export default FeatureCard;
