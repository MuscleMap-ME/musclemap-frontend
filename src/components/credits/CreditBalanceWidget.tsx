/**
 * CreditBalanceWidget - Displays user's credit balance with wealth tier
 *
 * Shows current balance, wealth tier indicator, and recent earnings.
 * Can be used in header, sidebar, or profile pages.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, TrendingUp, Sparkles, Crown, Gem, Award } from 'lucide-react';

// Wealth tier configuration
const WEALTH_TIERS = [
  { tier: 0, name: 'Broke', minCredits: 0, color: '#6B7280', icon: null },
  { tier: 1, name: 'Bronze', minCredits: 10, color: '#CD7F32', icon: Award },
  { tier: 2, name: 'Silver', minCredits: 100, color: '#C0C0C0', icon: Award },
  { tier: 3, name: 'Gold', minCredits: 1000, color: '#FFD700', icon: Crown },
  { tier: 4, name: 'Platinum', minCredits: 10000, color: '#E5E4E2', icon: Crown },
  { tier: 5, name: 'Diamond', minCredits: 100000, color: '#B9F2FF', icon: Gem },
  { tier: 6, name: 'Obsidian', minCredits: 1000000, color: '#0D0D0D', icon: Sparkles },
];

function getWealthTier(credits) {
  for (let i = WEALTH_TIERS.length - 1; i >= 0; i--) {
    if (credits >= WEALTH_TIERS[i].minCredits) {
      return WEALTH_TIERS[i];
    }
  }
  return WEALTH_TIERS[0];
}

function formatCredits(credits) {
  if (credits >= 1000000) {
    return `${(credits / 1000000).toFixed(1)}M`;
  }
  if (credits >= 1000) {
    return `${(credits / 1000).toFixed(1)}K`;
  }
  return credits.toLocaleString();
}

export function CreditBalanceWidget({
  balance = 0,
  todayEarned = 0,
  weekEarned = 0,
  showDetails = true,
  size = 'medium', // 'small' | 'medium' | 'large'
  onClick,
  className = '',
}) {
  const [previousBalance, setPreviousBalance] = useState(balance);
  const [isAnimating, setIsAnimating] = useState(false);
  const tier = getWealthTier(balance);
  const TierIcon = tier.icon;

  // Animate on balance change
  useEffect(() => {
    if (balance !== previousBalance) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setPreviousBalance(balance);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [balance, previousBalance]);

  const sizeClasses = {
    small: 'p-2 text-sm',
    medium: 'p-3 text-base',
    large: 'p-4 text-lg',
  };

  const iconSizes = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6',
  };

  return (
    <motion.div
      className={`
        bg-gradient-to-br from-gray-900/80 to-gray-800/80
        backdrop-blur-md border border-gray-700/50 rounded-xl
        ${sizeClasses[size]} ${className}
        ${onClick ? 'cursor-pointer hover:border-amber-400/30 transition-colors' : ''}
      `}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      {/* Main balance row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Animated coin icon */}
          <motion.div
            className={`
              p-2 rounded-lg
              ${isAnimating
                ? 'bg-gradient-to-br from-amber-400 to-yellow-500'
                : 'bg-amber-500/20'
              }
            `}
            animate={isAnimating ? {
              scale: [1, 1.3, 1],
              rotate: [0, 10, -10, 0],
            } : {}}
            transition={{ duration: 0.5 }}
          >
            <Coins className={`${iconSizes[size]} text-amber-400`} />
          </motion.div>

          <div>
            {/* Balance display */}
            <motion.div
              className="font-bold text-amber-300"
              animate={isAnimating ? { scale: [1, 1.1, 1] } : {}}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={balance}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={size === 'large' ? 'text-2xl' : size === 'medium' ? 'text-xl' : 'text-lg'}
                >
                  {formatCredits(balance)}
                </motion.span>
              </AnimatePresence>
            </motion.div>

            {/* Wealth tier label */}
            <div className="flex items-center gap-1.5">
              {TierIcon && (
                <TierIcon
                  className="w-3 h-3"
                  style={{ color: tier.color }}
                />
              )}
              <span
                className="text-xs font-medium"
                style={{ color: tier.color }}
              >
                {tier.name}
              </span>
            </div>
          </div>
        </div>

        {/* Tier badge (for larger sizes) */}
        {size !== 'small' && tier.tier > 0 && (
          <motion.div
            className="relative"
            animate={tier.tier >= 5 ? {
              rotate: [0, 5, -5, 0],
            } : {}}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${tier.color}40, ${tier.color}20)`,
                border: `2px solid ${tier.color}60`,
              }}
            >
              <span className="text-lg font-bold" style={{ color: tier.color }}>
                {tier.tier}
              </span>
            </div>
            {/* Sparkle effect for high tiers */}
            {tier.tier >= 5 && (
              <motion.div
                className="absolute -top-1 -right-1"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                }}
              >
                <Sparkles className="w-4 h-4" style={{ color: tier.color }} />
              </motion.div>
            )}
          </motion.div>
        )}
      </div>

      {/* Details section */}
      {showDetails && size !== 'small' && (
        <motion.div
          className="mt-3 pt-3 border-t border-gray-700/50 grid grid-cols-2 gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* Today's earnings */}
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <div>
              <div className="text-xs text-white/50">Today</div>
              <div className="text-sm font-medium text-green-400">
                +{formatCredits(todayEarned)}
              </div>
            </div>
          </div>

          {/* This week's earnings */}
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <div>
              <div className="text-xs text-white/50">This Week</div>
              <div className="text-sm font-medium text-blue-400">
                +{formatCredits(weekEarned)}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Floating +credits animation */}
      <AnimatePresence>
        {isAnimating && balance > previousBalance && (
          <motion.div
            className="absolute -top-2 right-4 text-green-400 font-bold pointer-events-none"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -30 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            +{formatCredits(balance - previousBalance)}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default CreditBalanceWidget;
