/**
 * EarningSummary - Shows breakdown of credit earnings by category
 *
 * Displays earnings from different sources (workouts, goals, social, bonuses)
 * with animated progress bars and daily/weekly/monthly views.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell,
  Target,
  Users,
  Gift,
  Flame,
  Trophy,
  Calendar,
  ChevronRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

// Category configuration
const EARNING_CATEGORIES = {
  workout: {
    icon: Dumbbell,
    label: 'Workouts',
    color: '#3B82F6',
    description: 'Reps, sets, and workout completions',
  },
  goals: {
    icon: Target,
    label: 'Goals',
    color: '#22C55E',
    description: 'Goal achievements and milestones',
  },
  social: {
    icon: Users,
    label: 'Social',
    color: '#A855F7',
    description: 'Tips received, high fives, engagement',
  },
  bonus: {
    icon: Gift,
    label: 'Bonuses',
    color: '#F59E0B',
    description: 'Random events and special rewards',
  },
  streak: {
    icon: Flame,
    label: 'Streaks',
    color: '#EF4444',
    description: 'Consistency rewards',
  },
  competition: {
    icon: Trophy,
    label: 'Competitions',
    color: '#EC4899',
    description: 'Leaderboard and challenge prizes',
  },
};

const TIME_PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

function formatCredits(credits) {
  if (credits >= 1000) {
    return `${(credits / 1000).toFixed(1)}K`;
  }
  return credits.toLocaleString();
}

export function EarningSummary({
  earnings = {}, // { category: { today: N, week: N, month: N } }
  totalEarned = {},
  onCategoryClick,
  className = '',
}) {
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  // Calculate totals for selected period
  const periodTotals = useMemo(() => {
    const totals = {};
    let grandTotal = 0;

    Object.entries(earnings).forEach(([category, amounts]) => {
      const amount = amounts[selectedPeriod] || 0;
      totals[category] = amount;
      grandTotal += amount;
    });

    return { totals, grandTotal };
  }, [earnings, selectedPeriod]);

  // Calculate max for progress bars
  const maxAmount = useMemo(() => {
    return Math.max(...Object.values(periodTotals.totals), 1);
  }, [periodTotals]);

  // Sort categories by amount (descending)
  const sortedCategories = useMemo(() => {
    return Object.entries(periodTotals.totals)
      .filter(([_, amount]) => amount > 0 || earnings[_])
      .sort((a, b) => b[1] - a[1]);
  }, [periodTotals, earnings]);

  return (
    <div className={`bg-gray-900/50 backdrop-blur-md rounded-xl border border-gray-800 overflow-hidden ${className}`}>
      {/* Header with period selector */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-white">Earnings Breakdown</h3>
          </div>
          <div className="flex items-center gap-1 text-xl font-bold text-amber-300">
            <Sparkles className="w-4 h-4" />
            +{formatCredits(periodTotals.grandTotal)}
          </div>
        </div>

        {/* Period tabs */}
        <div className="flex gap-2">
          {TIME_PERIODS.map(period => (
            <button
              key={period.key}
              onClick={() => setSelectedPeriod(period.key)}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${selectedPeriod === period.key
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                  : 'bg-gray-800/50 text-white/60 hover:text-white hover:bg-gray-700/50'
                }
              `}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category breakdown */}
      <div className="p-4 space-y-4">
        <AnimatePresence mode="popLayout">
          {sortedCategories.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-white/50"
            >
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No earnings {selectedPeriod === 'today' ? 'today yet' : `this ${selectedPeriod}`}</p>
              <p className="text-sm mt-1">Start a workout to earn credits!</p>
            </motion.div>
          ) : (
            sortedCategories.map(([category, amount], index) => {
              const config = EARNING_CATEGORIES[category] || {
                icon: Gift,
                label: category.charAt(0).toUpperCase() + category.slice(1),
                color: '#6B7280',
                description: '',
              };
              const Icon = config.icon;
              const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;

              return (
                <motion.button
                  key={category}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="w-full text-left group"
                  onClick={() => onCategoryClick?.(category)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${config.color}20` }}
                      >
                        <Icon
                          className="w-4 h-4"
                          style={{ color: config.color }}
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white group-hover:text-amber-300 transition-colors">
                          {config.label}
                        </div>
                        <div className="text-xs text-white/40">
                          {config.description}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm font-bold"
                        style={{ color: config.color }}
                      >
                        +{formatCredits(amount)}
                      </span>
                      {onCategoryClick && (
                        <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-amber-400 transition-colors" />
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: config.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    />
                  </div>
                </motion.button>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Footer with totals */}
      {Object.keys(totalEarned).length > 0 && (
        <div className="p-4 border-t border-gray-800 bg-gray-800/30">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50">Lifetime Earnings</span>
            <span className="font-bold text-amber-300">
              {formatCredits(totalEarned.total || 0)} credits
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default EarningSummary;
