/**
 * FeatureCard - Individual feature discovery card
 *
 * Displays a feature with glassmorphism styling, animated effects,
 * and touch-friendly interactions. Part of the FeatureDiscovery system.
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
 * - Pulsing glow effect to draw attention
 * - Icon with custom color
 * - Action button
 * - Dismiss option
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
  const { id, title, description, icon, color = '#0066FF' } = feature;

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
        'border border-white/10',
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
        borderColor: 'rgba(255, 255, 255, 0.2)',
      }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Pulsing glow effect - draws attention */}
      {showPulse && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${color}20, transparent 60%)`,
          }}
          animate={{
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Gradient border highlight */}
      <div
        className="absolute inset-0 rounded-2xl opacity-20 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${color}40, transparent 50%)`,
        }}
      />

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
            animate={showPulse ? {
              boxShadow: [
                `0 0 15px ${color}30`,
                `0 0 25px ${color}50`,
                `0 0 15px ${color}30`,
              ],
            } : {}}
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
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-base mb-1 truncate">
            {title}
          </h3>
          <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <button
            onClick={handleDismiss}
            className={clsx(
              'absolute top-2 right-2',
              'w-6 h-6 rounded-full',
              'flex items-center justify-center',
              'bg-white/5 hover:bg-white/10',
              'text-gray-500 hover:text-gray-300',
              'transition-colors duration-150',
              'opacity-0 group-hover:opacity-100'
            )}
            style={{ opacity: 1 }} // Always visible on mobile
            aria-label={`Dismiss ${title} suggestion`}
          >
            <Icons.X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Action footer */}
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
          Explore
          <Icons.ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Inner highlight for glass effect */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
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
  const { title, icon, color = '#0066FF' } = feature;

  return (
    <motion.button
      className={clsx(
        'flex-shrink-0 px-4 py-3 rounded-xl',
        'bg-white/5 backdrop-blur-md border border-white/10',
        'flex items-center gap-2',
        'cursor-pointer',
        className
      )}
      onClick={() => onClick?.(feature)}
      whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.2)' }}
      whileTap={{ scale: 0.98 }}
    >
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
      <span className="text-sm font-medium text-white whitespace-nowrap">
        {title}
      </span>
    </motion.button>
  );
}

export default FeatureCard;
