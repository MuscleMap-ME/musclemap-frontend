/**
 * WealthTierBadge - Displays user's wealth tier with visual effects
 *
 * Shows a badge with tier name, color, and optional animations
 * based on the user's credit balance tier level.
 *
 * Tier levels:
 * - 0: Broke (0-9 credits)
 * - 1: Bronze (10-99 credits)
 * - 2: Silver (100-999 credits)
 * - 3: Gold (1,000-9,999 credits)
 * - 4: Platinum (10,000-99,999 credits)
 * - 5: Diamond (100,000-999,999 credits)
 * - 6: Obsidian (1,000,000+ credits)
 */

import { motion } from 'framer-motion';
import { Crown, Gem, Sparkles, Award, CircleDollarSign } from 'lucide-react';

// Wealth tier configuration
export const WEALTH_TIERS = [
  {
    tier: 0,
    name: 'Broke',
    minCredits: 0,
    color: '#6B7280',
    ringColor: 'transparent',
    Icon: CircleDollarSign,
    animation: null,
    gradient: 'from-gray-600 to-gray-700',
  },
  {
    tier: 1,
    name: 'Bronze',
    minCredits: 10,
    color: '#CD7F32',
    ringColor: '#CD7F32',
    Icon: Award,
    animation: null,
    gradient: 'from-amber-700 to-amber-900',
  },
  {
    tier: 2,
    name: 'Silver',
    minCredits: 100,
    color: '#C0C0C0',
    ringColor: '#C0C0C0',
    Icon: Award,
    animation: 'glow',
    gradient: 'from-gray-300 to-gray-500',
  },
  {
    tier: 3,
    name: 'Gold',
    minCredits: 1000,
    color: '#FFD700',
    ringColor: '#FFD700',
    Icon: Crown,
    animation: 'pulse',
    gradient: 'from-yellow-400 to-amber-600',
  },
  {
    tier: 4,
    name: 'Platinum',
    minCredits: 10000,
    color: '#E5E4E2',
    ringColor: '#E5E4E2',
    Icon: Crown,
    animation: 'shimmer',
    gradient: 'from-gray-200 to-gray-400',
  },
  {
    tier: 5,
    name: 'Diamond',
    minCredits: 100000,
    color: '#B9F2FF',
    ringColor: '#B9F2FF',
    Icon: Gem,
    animation: 'sparkle',
    gradient: 'from-cyan-300 to-blue-500',
  },
  {
    tier: 6,
    name: 'Obsidian',
    minCredits: 1000000,
    color: '#9333EA',
    ringColor: '#0D0D0D',
    Icon: Sparkles,
    animation: 'flames',
    gradient: 'from-purple-900 to-black',
  },
];

/**
 * Get wealth tier for a given credit amount
 */
export function getWealthTier(credits) {
  for (let i = WEALTH_TIERS.length - 1; i >= 0; i--) {
    if (credits >= WEALTH_TIERS[i].minCredits) {
      return WEALTH_TIERS[i];
    }
  }
  return WEALTH_TIERS[0];
}

/**
 * Get wealth tier by tier number
 */
export function getWealthTierByLevel(tierLevel) {
  return WEALTH_TIERS[tierLevel] || WEALTH_TIERS[0];
}

/**
 * Calculate progress to next tier
 */
export function getTierProgress(credits) {
  const currentTier = getWealthTier(credits);
  const nextTierIndex = currentTier.tier + 1;

  if (nextTierIndex >= WEALTH_TIERS.length) {
    return { current: currentTier, next: null, progress: 100, creditsToNext: 0 };
  }

  const nextTier = WEALTH_TIERS[nextTierIndex];
  const currentMin = currentTier.minCredits;
  const nextMin = nextTier.minCredits;
  const rangeSize = nextMin - currentMin;
  const progress = Math.min(100, ((credits - currentMin) / rangeSize) * 100);

  return {
    current: currentTier,
    next: nextTier,
    progress,
    creditsToNext: nextMin - credits,
  };
}

/**
 * WealthTierBadge Component
 */
export function WealthTierBadge({
  tier = 0,
  credits = null,
  size = 'medium',
  showName = true,
  showProgress = false,
  className = '',
}) {
  // Get tier info either from tier level or credits
  const tierInfo = credits !== null ? getWealthTier(credits) : getWealthTierByLevel(tier);
  const { Icon, name, color, gradient, animation } = tierInfo;
  const progress = credits !== null ? getTierProgress(credits) : null;

  const sizeClasses = {
    small: 'h-5 px-2 text-xs gap-1',
    medium: 'h-7 px-3 text-sm gap-1.5',
    large: 'h-9 px-4 text-base gap-2',
  };

  const iconSizes = {
    small: 'w-3 h-3',
    medium: 'w-4 h-4',
    large: 'w-5 h-5',
  };

  // Animation variants based on tier
  const animationProps = {
    glow: {
      animate: {
        boxShadow: [
          `0 0 5px ${color}40`,
          `0 0 15px ${color}60`,
          `0 0 5px ${color}40`,
        ],
      },
      transition: { duration: 2, repeat: Infinity },
    },
    pulse: {
      animate: { scale: [1, 1.05, 1] },
      transition: { duration: 1.5, repeat: Infinity },
    },
    shimmer: {
      animate: {
        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      },
      transition: { duration: 3, repeat: Infinity },
    },
    sparkle: {
      animate: {
        filter: [
          'brightness(1)',
          'brightness(1.3)',
          'brightness(1)',
        ],
      },
      transition: { duration: 2, repeat: Infinity },
    },
    flames: {
      animate: {
        boxShadow: [
          `0 0 10px #9333EA40, 0 0 20px #9333EA20`,
          `0 0 20px #9333EA60, 0 0 40px #9333EA40`,
          `0 0 10px #9333EA40, 0 0 20px #9333EA20`,
        ],
      },
      transition: { duration: 1, repeat: Infinity },
    },
  };

  const currentAnimation = animation ? animationProps[animation] : {};

  return (
    <div className={className}>
      <motion.div
        className={`
          inline-flex items-center rounded-full font-semibold
          bg-gradient-to-r ${gradient}
          ${sizeClasses[size]}
        `}
        style={{
          border: tierInfo.tier > 0 ? `2px solid ${color}` : '2px solid transparent',
        }}
        {...currentAnimation}
      >
        <Icon className={iconSizes[size]} style={{ color: 'white' }} />
        {showName && (
          <span className="text-white drop-shadow-md">{name}</span>
        )}
      </motion.div>

      {/* Progress bar to next tier */}
      {showProgress && progress && progress.next && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{name}</span>
            <span>{progress.next.name}</span>
          </div>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(to right, ${color}, ${progress.next.color})`,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progress.progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1 text-center">
            {progress.creditsToNext.toLocaleString()} credits to {progress.next.name}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * WealthTierRing - Avatar ring with wealth tier styling
 */
export function WealthTierRing({
  tier = 0,
  credits = null,
  children,
  size = 'medium',
  className = '',
}) {
  const tierInfo = credits !== null ? getWealthTier(credits) : getWealthTierByLevel(tier);
  const { ringColor, animation } = tierInfo;

  const ringWidths = {
    small: '2px',
    medium: '3px',
    large: '4px',
  };

  // Special styling for high tiers
  const isHighTier = tierInfo.tier >= 5;

  return (
    <motion.div
      className={`relative rounded-full ${className}`}
      style={{
        padding: ringWidths[size],
        background: tierInfo.tier > 0
          ? `linear-gradient(135deg, ${ringColor}, ${ringColor}80)`
          : 'transparent',
        boxShadow: isHighTier ? `0 0 15px ${ringColor}60` : 'none',
      }}
      animate={
        animation === 'flames'
          ? {
              boxShadow: [
                `0 0 10px ${ringColor}40`,
                `0 0 25px ${ringColor}60`,
                `0 0 10px ${ringColor}40`,
              ],
            }
          : animation === 'sparkle'
            ? {
                boxShadow: [
                  `0 0 8px ${ringColor}40`,
                  `0 0 20px ${ringColor}80`,
                  `0 0 8px ${ringColor}40`,
                ],
              }
            : {}
      }
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <div className="rounded-full overflow-hidden bg-gray-900">
        {children}
      </div>

      {/* Crown decoration for high tiers */}
      {tierInfo.tier >= 3 && (
        <motion.div
          className="absolute -top-1 -right-1"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <tierInfo.Icon
            className="w-4 h-4"
            style={{ color: ringColor }}
          />
        </motion.div>
      )}
    </motion.div>
  );
}

export default WealthTierBadge;
