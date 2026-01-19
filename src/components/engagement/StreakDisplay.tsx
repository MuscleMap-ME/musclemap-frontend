/**
 * StreakDisplay Component
 *
 * Shows all user streaks (workout, nutrition, sleep, social) with:
 * - Current streak count with flame animations
 * - Progress toward next milestone
 * - Unclaimed milestone badges
 * - Best streak history
 */

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Flame,
  Dumbbell,
  Apple,
  Moon,
  Users,
  Trophy,
  Star,
  Sparkles,
} from 'lucide-react';
import { useStreaks } from '../../store/engagementStore';
import { cn } from '../../lib/utils';

const STREAK_ICONS: Record<string, React.ElementType> = {
  workout: Dumbbell,
  nutrition: Apple,
  sleep: Moon,
  social: Users,
  login: Flame,
};

const STREAK_COLORS: Record<string, { gradient: string; bg: string; text: string }> = {
  workout: {
    gradient: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
  },
  nutrition: {
    gradient: 'from-green-500 to-emerald-500',
    bg: 'bg-green-500/20',
    text: 'text-green-400',
  },
  sleep: {
    gradient: 'from-purple-500 to-violet-500',
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
  },
  social: {
    gradient: 'from-pink-500 to-rose-500',
    bg: 'bg-pink-500/20',
    text: 'text-pink-400',
  },
  login: {
    gradient: 'from-orange-500 to-amber-500',
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
  },
};

const STREAK_NAMES: Record<string, string> = {
  workout: 'Workout',
  nutrition: 'Nutrition',
  sleep: 'Sleep',
  social: 'Social',
  login: 'Login',
};

interface StreakCardProps {
  streak: {
    streakType: string;
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string | null;
    nextMilestone: { days: number; credits: number; xp: number; badge?: string } | null;
    unclaimedMilestones: Array<{ days: number; credits: number; xp: number; badge?: string }>;
  };
  onClaimMilestone?: (type: string, days: number) => void;
}

function StreakCard({ streak, onClaimMilestone }: StreakCardProps) {
  const Icon = STREAK_ICONS[streak.streakType] || Flame;
  const colors = STREAK_COLORS[streak.streakType] || STREAK_COLORS.workout;
  const name = STREAK_NAMES[streak.streakType] || streak.streakType;

  const progress = streak.nextMilestone
    ? (streak.currentStreak / streak.nextMilestone.days) * 100
    : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-xl bg-gradient-to-br', colors.gradient)}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-white">{name}</h4>
            <p className="text-xs text-white/40">
              {streak.lastActivityDate
                ? `Last: ${new Date(streak.lastActivityDate).toLocaleDateString()}`
                : 'Start your streak!'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1">
            <Flame className={cn('w-5 h-5', colors.text)} />
            <span className="text-2xl font-bold text-white">{streak.currentStreak}</span>
          </div>
          <p className="text-xs text-white/40">days</p>
        </div>
      </div>

      {/* Progress Bar */}
      {streak.nextMilestone && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Next: Day {streak.nextMilestone.days}</span>
            <span className={colors.text}>
              {streak.nextMilestone.credits} credits + {streak.nextMilestone.xp} XP
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={cn('h-full rounded-full bg-gradient-to-r', colors.gradient)}
            />
          </div>
        </div>
      )}

      {/* Best Streak */}
      {streak.longestStreak > 0 && (
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Trophy className="w-3 h-3" />
          <span>Best: {streak.longestStreak} days</span>
        </div>
      )}

      {/* Unclaimed Milestones */}
      {streak.unclaimedMilestones.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-amber-400 flex items-center gap-1">
            <Star className="w-3 h-3" />
            Unclaimed Rewards
          </p>
          <div className="flex flex-wrap gap-2">
            {streak.unclaimedMilestones.map((milestone) => (
              <motion.button
                key={milestone.days}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onClaimMilestone?.(streak.streakType, milestone.days)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium',
                  'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30',
                  'hover:from-amber-500/30 hover:to-orange-500/30 transition-all'
                )}
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span className="text-white">Day {milestone.days}</span>
                <span className="text-amber-400">{milestone.credits} C</span>
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

interface StreakDisplayProps {
  showTotal?: boolean;
  compact?: boolean;
  streakTypes?: string[];
  className?: string;
}

export function StreakDisplay({
  showTotal = true,
  compact = false,
  streakTypes,
  className,
}: StreakDisplayProps) {
  const { streaks, totalCurrent, totalLongest, loading, fetchAll, claimMilestone } = useStreaks();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filteredStreaks = streakTypes
    ? streaks.filter((s) => streakTypes.includes(s.streakType))
    : streaks;

  if (loading && streaks.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse h-32 bg-white/5 rounded-xl" />
        ))}
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn('flex gap-4 overflow-x-auto pb-2', className)}>
        {filteredStreaks.map((streak) => {
          const Icon = STREAK_ICONS[streak.streakType] || Flame;
          const colors = STREAK_COLORS[streak.streakType] || STREAK_COLORS.workout;

          return (
            <motion.div
              key={streak.streakType}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl shrink-0',
                colors.bg,
                'border border-white/10'
              )}
            >
              <Icon className={cn('w-5 h-5', colors.text)} />
              <div className="flex items-center gap-1">
                <Flame className={cn('w-4 h-4', colors.text)} />
                <span className="text-xl font-bold text-white">{streak.currentStreak}</span>
              </div>
              {streak.unclaimedMilestones.length > 0 && (
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </motion.div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Total Overview */}
      {showTotal && (
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl border border-orange-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-white/60">Combined Streak Power</p>
              <p className="text-2xl font-bold text-white">{totalCurrent} days</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/40">All-time best</p>
            <p className="text-lg font-semibold text-white/80">{totalLongest} days</p>
          </div>
        </div>
      )}

      {/* Individual Streaks */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredStreaks.map((streak) => (
          <StreakCard
            key={streak.streakType}
            streak={streak}
            onClaimMilestone={claimMilestone}
          />
        ))}
      </div>
    </div>
  );
}

export default StreakDisplay;
