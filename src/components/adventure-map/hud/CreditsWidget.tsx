/**
 * CreditsWidget
 *
 * Displays credit balance and wealth tier in the HUD.
 */

import React from 'react';
import { motion } from 'framer-motion';

// Wealth tier configuration
const WEALTH_TIERS: Record<
  number,
  { name: string; color: string; bgColor: string; icon: string }
> = {
  0: { name: 'Broke', color: 'text-gray-400', bgColor: 'bg-gray-500/20', icon: '' },
  1: { name: 'Bronze', color: 'text-amber-600', bgColor: 'bg-amber-500/20', icon: '🥉' },
  2: { name: 'Silver', color: 'text-gray-300', bgColor: 'bg-gray-400/20', icon: '🥈' },
  3: { name: 'Gold', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', icon: '🥇' },
  4: { name: 'Platinum', color: 'text-cyan-300', bgColor: 'bg-cyan-500/20', icon: '💎' },
  5: { name: 'Diamond', color: 'text-blue-300', bgColor: 'bg-blue-500/20', icon: '💠' },
  6: { name: 'Obsidian', color: 'text-purple-300', bgColor: 'bg-purple-500/20', icon: '👑' },
};

interface CreditsWidgetProps {
  credits: number;
  wealthTier: number;
}

export default function CreditsWidget({ credits, wealthTier }: CreditsWidgetProps) {
  const tier = WEALTH_TIERS[wealthTier] || WEALTH_TIERS[0];

  // Format credits with abbreviation for large numbers
  const formatCredits = (amount: number): string => {
    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(1)}M`;
    }
    if (amount >= 1_000) {
      return `${(amount / 1_000).toFixed(1)}K`;
    }
    return amount.toLocaleString();
  };

  return (
    <div className="flex items-center gap-3">
      {/* Credit balance */}
      <motion.div
        className={`flex items-center gap-2 px-4 py-2 rounded-xl ${tier.bgColor} border border-white/10`}
        whileHover={{ scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        {/* Coin icon with glow based on tier */}
        <motion.span
          className="text-xl"
          animate={
            wealthTier >= 3
              ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }
              : undefined
          }
          transition={{ repeat: Infinity, duration: 2 }}
        >
          💰
        </motion.span>

        {/* Amount */}
        <div className="flex flex-col items-end">
          <motion.span
            className={`font-bold text-lg ${tier.color}`}
            key={credits}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {formatCredits(credits)}
          </motion.span>
          <span className="text-white/40 text-xs">credits</span>
        </div>
      </motion.div>

      {/* Wealth tier badge */}
      {wealthTier > 0 && (
        <motion.div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${tier.bgColor} border border-white/10`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
        >
          {tier.icon && (
            <motion.span
              animate={
                wealthTier >= 4
                  ? { y: [0, -2, 0], rotate: [0, 10, -10, 0] }
                  : undefined
              }
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              {tier.icon}
            </motion.span>
          )}
          <span className={`text-sm font-medium ${tier.color}`}>{tier.name}</span>
        </motion.div>
      )}

      {/* Tier glow effect for high tiers */}
      {wealthTier >= 5 && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${
              wealthTier === 6 ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)'
            } 0%, transparent 70%)`,
          }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      )}
    </div>
  );
}
