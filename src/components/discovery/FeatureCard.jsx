/**
 * FeatureCard - Individual feature discovery card
 *
 * Displays a feature with glassmorphism styling, animated effects,
 * and touch-friendly interactions. Part of the FeatureDiscovery system.
 *
 * Features:
 * - Three variants: default, compact, highlighted
 * - Emoji or Lucide icon support
 * - Gradient border that pulses subtly to attract attention
 * - "Try it" button with navigation
 * - "Dismiss" (X) button to hide forever
 * - Badges for "New!" or "Popular!" features
 * - Animated entrance when appearing
 */

import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import {
  HelpCircle,
  Sparkles,
  TrendingUp,
  X,
  ArrowRight,
  // Common feature icons
  Dumbbell,
  Target,
  Users,
  Trophy,
  Zap,
  Heart,
  Brain,
  Flame,
  Star,
  Crown,
  Settings,
  Calendar,
  BarChart3,
  Activity,
  Compass,
  Map,
  MessageCircle,
} from 'lucide-react';

// Icon lookup map - only includes icons commonly used in feature cards
// This prevents importing the entire lucide-react library (~1MB)
const FEATURE_ICONS = {
  HelpCircle,
  Sparkles,
  TrendingUp,
  X,
  ArrowRight,
  Dumbbell,
  Target,
  Users,
  Trophy,
  Zap,
  Heart,
  Brain,
  Flame,
  Star,
  Crown,
  Settings,
  Calendar,
  BarChart3,
  Activity,
  Compass,
  Map,
  MessageCircle,
};

/**
 * Check if string is an emoji
 */
function isEmoji(str) {
  if (!str || typeof str !== 'string') return false;
  // Check if it's a single character or starts with an emoji
  const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u;
  return emojiRegex.test(str);
}

/**
 * Get icon component from Lucide by name, or return emoji span
 */
function getIcon(iconName, props = {}) {
  if (!iconName) return null;

  // If it's an emoji, render as span
  if (isEmoji(iconName)) {
    const { className, style } = props;
    return (
      <span className={clsx('flex items-center justify-center', className)} style={style}>
        {iconName}
      </span>
    );
  }

  // Otherwise get Lucide icon from our limited set
  const IconComponent = FEATURE_ICONS[iconName] || HelpCircle;
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
 * - "New!" or "Popular!" badges
 *
 * @param {Object} props
 * @param {Object} props.feature - Feature object from featureDefinitions
 * @param {string} props.variant - 'default' | 'compact' | 'highlighted'
 * @param {Function} props.onTry - Called when user clicks to try feature
 * @param {Function} props.onDismiss - Called when user dismisses feature
 */
const FeatureCard = forwardRef(function FeatureCard(
  {
    feature,
    variant = 'default',
    onTry,
    onDismiss,
    // Legacy props for backward compatibility
    onClick,
    isActive = false,
    showPulse = true,
    index = 0,
    className,
  },
  ref
) {
  const {
    name,
    description,
    icon,
    color = '#0066FF',
    isNew = false,
    isPopular = false,
  } = feature;

  // Use onTry or fall back to onClick for backward compatibility
  const handleTry = onTry || onClick;

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
    if (handleTry) {
      handleTry(feature);
    }
  };

  // Handle dismiss click
  const handleDismissClick = (e) => {
    e.stopPropagation();
    if (onDismiss) {
      onDismiss(feature.id);
    }
  };

  // Determine if we should show the pulsing effect
  const shouldPulse = showPulse && variant !== 'compact';

  // Compact variant
  if (variant === 'compact') {
    return (
      <motion.button
        ref={ref}
        layout
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={clsx(
          'flex-shrink-0 px-4 py-3 rounded-xl',
          'bg-white/5 backdrop-blur-md border border-white/10',
          'flex items-center gap-3',
          'cursor-pointer relative',
          'hover:bg-white/10 hover:border-white/20',
          'transition-colors duration-200',
          className
        )}
        onClick={handleClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* New/Popular badge for compact */}
        {(isNew || isPopular) && (
          <div
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${color}, ${color}CC)`,
            }}
          >
            {isNew ? (
              <Sparkles className="w-3 h-3 text-white" />
            ) : (
              <TrendingUp className="w-3 h-3 text-white" />
            )}
          </div>
        )}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}20` }}
        >
          {getIcon(icon, {
            className: isEmoji(icon) ? 'text-xl' : 'w-5 h-5',
            style: isEmoji(icon) ? {} : { color },
            strokeWidth: 1.5,
          })}
        </div>
        <span className="text-sm font-medium text-white whitespace-nowrap">{name}</span>
      </motion.button>
    );
  }

  // Highlighted variant - larger with more emphasis
  const isHighlighted = variant === 'highlighted';

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
        // Highlighted variant has extra padding
        isHighlighted && 'p-1',
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
      {shouldPulse && (
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
      {!shouldPulse && (
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
          shouldPulse
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

      {/* Badges: "New!" or "Popular!" */}
      {(isNew || isPopular) && (
        <motion.div
          className="absolute top-3 right-3 z-10"
          initial={{ scale: 0, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20, delay: index * 0.1 + 0.2 }}
        >
          <div
            className="px-2 py-0.5 rounded-full text-xs font-bold text-white flex items-center gap-1"
            style={{
              background: `linear-gradient(135deg, ${color}, ${color}CC)`,
              boxShadow: `0 2px 8px ${color}50`,
            }}
          >
            {isNew ? (
              <>
                <Sparkles className="w-3 h-3" />
                New!
              </>
            ) : (
              <>
                <TrendingUp className="w-3 h-3" />
                Popular!
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={handleDismissClick}
          className={clsx(
            'absolute top-3 z-10',
            isNew || isPopular ? 'right-20' : 'right-3',
            'w-6 h-6 rounded-full',
            'flex items-center justify-center',
            'bg-white/5 hover:bg-white/15',
            'text-gray-500 hover:text-gray-300',
            'transition-all duration-150',
            'opacity-60 hover:opacity-100'
          )}
          aria-label={`Dismiss ${name} suggestion`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Card content */}
      <div className={clsx('relative p-4 flex gap-4', isHighlighted && 'p-5')}>
        {/* Icon container with glow */}
        <div className="flex-shrink-0">
          <motion.div
            className={clsx(
              'rounded-xl flex items-center justify-center relative',
              isHighlighted ? 'w-14 h-14' : 'w-12 h-12'
            )}
            style={{
              background: `linear-gradient(135deg, ${color}30, ${color}10)`,
              boxShadow: shouldPulse ? `0 0 20px ${color}40` : 'none',
            }}
            animate={
              shouldPulse
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
              className: isEmoji(icon)
                ? isHighlighted
                  ? 'text-3xl'
                  : 'text-2xl'
                : isHighlighted
                ? 'w-7 h-7'
                : 'w-6 h-6',
              style: isEmoji(icon) ? {} : { color },
              strokeWidth: 1.5,
            })}
          </motion.div>
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0 pr-6">
          <h3
            className={clsx(
              'font-bold text-white mb-1 truncate',
              isHighlighted ? 'text-lg' : 'text-base'
            )}
          >
            {name}
          </h3>
          <p
            className={clsx(
              'text-gray-400 line-clamp-2 leading-relaxed',
              isHighlighted ? 'text-base' : 'text-sm'
            )}
          >
            {description}
          </p>
        </div>
      </div>

      {/* "Try it" action button */}
      <div className={clsx('relative px-4 pb-4 pt-0', isHighlighted && 'px-5 pb-5')}>
        <motion.button
          className={clsx(
            'w-full rounded-xl',
            'flex items-center justify-center gap-2',
            'font-medium text-white',
            'transition-colors duration-150',
            isHighlighted ? 'py-3 text-base' : 'py-2.5 text-sm'
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
          <ArrowRight className={isHighlighted ? 'w-5 h-5' : 'w-4 h-4'} />
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
export function FeatureCardSkeleton({ variant = 'default', className }) {
  if (variant === 'compact') {
    return (
      <div
        className={clsx(
          'flex-shrink-0 px-4 py-3 rounded-xl',
          'bg-white/5 border border-white/10',
          'flex items-center gap-3',
          'animate-pulse',
          className
        )}
      >
        <div className="w-9 h-9 rounded-lg bg-white/10" />
        <div className="h-4 w-20 bg-white/10 rounded" />
      </div>
    );
  }

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
 * FeatureCardCompact - Compact version (alias for variant='compact')
 * @deprecated Use <FeatureCard variant="compact" /> instead
 */
export function FeatureCardCompact({ feature, onClick, className }) {
  return (
    <FeatureCard feature={feature} variant="compact" onTry={onClick} className={className} />
  );
}

export default FeatureCard;
