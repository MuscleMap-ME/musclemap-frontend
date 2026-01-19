/**
 * DailyLoginReward Component
 *
 * Shows the daily login reward interface including:
 * - Current streak display
 * - Today's reward preview
 * - Claim button
 * - Streak freeze warning when at risk
 * - Login calendar showing past rewards
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift,
  Flame,
  Snowflake,
  Calendar,
  TrendingUp,
  Sparkles,
  Crown,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { useDailyLogin, useEngagementModals } from '../../store/engagementStore';
import { cn } from '../../lib/utils';

interface DailyLoginRewardProps {
  onClose?: () => void;
  className?: string;
}

export function DailyLoginReward({ onClose, className }: DailyLoginRewardProps) {
  const {
    status,
    calendar,
    loading,
    canClaim,
    streakAtRisk,
    currentStreak,
    fetchStatus,
    claim,
    purchaseFreeze,
    fetchCalendar,
  } = useDailyLogin();

  const { lastReward, setShowDailyReward, clearLastReward } = useEngagementModals();

  useEffect(() => {
    fetchStatus();
    fetchCalendar(7);
  }, [fetchStatus, fetchCalendar]);

  const handleClaim = async () => {
    await claim(false);
  };

  const handleClaimWithFreeze = async () => {
    await claim(true);
  };

  const handleClose = () => {
    clearLastReward();
    setShowDailyReward(false);
    onClose?.();
  };

  if (loading && !status) {
    return (
      <div className={cn('p-6 bg-glass-light rounded-2xl', className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/10 rounded-lg w-1/2" />
          <div className="h-24 bg-white/10 rounded-xl" />
          <div className="h-12 bg-white/10 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className={cn('p-6 bg-glass-light rounded-2xl space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Daily Reward</h3>
            <p className="text-sm text-white/60">Day {currentStreak + (canClaim ? 1 : 0)}</p>
          </div>
        </div>
        {status.streakFreezesOwned > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-cyan-500/20 rounded-lg">
            <Snowflake className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">{status.streakFreezesOwned}</span>
          </div>
        )}
      </div>

      {/* Streak Display */}
      <div className="flex items-center justify-center gap-6 py-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-4xl font-bold text-white">
            <Flame className="w-8 h-8 text-orange-500" />
            {currentStreak}
          </div>
          <p className="text-sm text-white/60 mt-1">Current Streak</p>
        </div>
        <div className="w-px h-12 bg-white/20" />
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-4xl font-bold text-white/60">
            <TrendingUp className="w-8 h-8 text-blue-500" />
            {status.longestStreak}
          </div>
          <p className="text-sm text-white/60 mt-1">Best Streak</p>
        </div>
      </div>

      {/* Streak at Risk Warning */}
      {streakAtRisk && !canClaim && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 bg-red-500/20 border border-red-500/30 rounded-xl"
        >
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">Streak at Risk!</p>
            <p className="text-xs text-white/60 mt-1">
              You missed yesterday. Use a streak freeze to save your {currentStreak}-day streak!
            </p>
          </div>
        </motion.div>
      )}

      {/* Today's Reward */}
      {canClaim && status.todayReward && (
        <div className="p-4 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">Today&apos;s Reward</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">C</span>
                  </div>
                  <span className="text-lg font-bold text-white">{status.todayReward.credits}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <span className="text-lg font-bold text-white">{status.todayReward.xp} XP</span>
                </div>
              </div>
            </div>
            {status.todayReward.isMilestone && (
              <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                <Crown className="w-4 h-4 text-white" />
                <span className="text-xs font-bold text-white">MILESTONE</span>
              </div>
            )}
          </div>
          {status.todayReward.mysteryBoxTier && (
            <div className="mt-3 flex items-center gap-2 text-sm text-purple-300">
              <Gift className="w-4 h-4" />
              <span>+ {status.todayReward.mysteryBoxTier.charAt(0).toUpperCase() + status.todayReward.mysteryBoxTier.slice(1)} Mystery Box</span>
            </div>
          )}
        </div>
      )}

      {/* Already Claimed */}
      {!canClaim && !streakAtRisk && (
        <div className="flex items-center gap-3 p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
          <Check className="w-5 h-5 text-green-400" />
          <div>
            <p className="text-sm font-medium text-green-400">Already Claimed!</p>
            <p className="text-xs text-white/60 mt-1">Come back tomorrow for your next reward</p>
          </div>
        </div>
      )}

      {/* Next Milestone */}
      {status.nextMilestone && (
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <div>
            <p className="text-xs text-white/40">Next milestone</p>
            <p className="text-sm font-medium text-white">Day {status.nextMilestone.days}</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-amber-400">{status.nextMilestone.reward.credits} credits</span>
            <span className="text-purple-400">{status.nextMilestone.reward.xp} XP</span>
          </div>
        </div>
      )}

      {/* Weekly Calendar Preview */}
      {calendar.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-white/60" />
            <p className="text-sm font-medium text-white/60">This Week</p>
          </div>
          <div className="flex gap-2">
            {calendar.slice(0, 7).reverse().map((day, index) => (
              <div
                key={day.date}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 p-2 rounded-lg',
                  day.claimed ? 'bg-green-500/20' : 'bg-white/5'
                )}
              >
                <span className="text-[10px] text-white/40">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                {day.claimed ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : index === calendar.length - 1 ? (
                  <Gift className="w-4 h-4 text-amber-400" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-white/10" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {canClaim && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClaim}
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Claiming...' : 'Claim Reward'}
          </motion.button>
        )}

        {streakAtRisk && status.streakFreezesOwned > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClaimWithFreeze}
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <Snowflake className="w-5 h-5" />
            {loading ? 'Using Freeze...' : 'Use Streak Freeze'}
          </motion.button>
        )}

        {streakAtRisk && status.streakFreezesOwned === 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={purchaseFreeze}
            disabled={loading}
            className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <Snowflake className="w-5 h-5 text-cyan-400" />
            Buy Streak Freeze (250 credits)
          </motion.button>
        )}
      </div>

      {/* Reward Claimed Modal */}
      <AnimatePresence>
        {lastReward && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm mx-4 p-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-amber-500/30"
            >
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center"
                >
                  <Gift className="w-10 h-10 text-white" />
                </motion.div>

                <div>
                  <h3 className="text-2xl font-bold text-white">Reward Claimed!</h3>
                  <p className="text-white/60 mt-1">Day {lastReward.newStreak} streak</p>
                </div>

                <div className="flex justify-center gap-6">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center"
                  >
                    <div className="text-3xl font-bold text-amber-400">+{lastReward.credits}</div>
                    <p className="text-sm text-white/60">Credits</p>
                  </motion.div>
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-center"
                  >
                    <div className="text-3xl font-bold text-purple-400">+{lastReward.xp}</div>
                    <p className="text-sm text-white/60">XP</p>
                  </motion.div>
                </div>

                {lastReward.isMilestone && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg"
                  >
                    <Crown className="w-5 h-5 text-purple-400" />
                    <span className="text-purple-300 font-medium">Milestone Reached!</span>
                  </motion.div>
                )}

                <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClose}
                  className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all"
                >
                  Awesome!
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DailyLoginReward;
