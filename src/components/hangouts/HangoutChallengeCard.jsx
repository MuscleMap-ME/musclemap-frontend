/**
 * HangoutChallengeCard - Displays a hangout challenge with prize pool
 *
 * Shows challenge details, participants, prize distribution, and progress.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Users,
  Coins,
  Clock,
  Target,
  Flame,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Calendar,
  Award,
  Zap,
} from 'lucide-react';

// Challenge type configurations
const CHALLENGE_TYPES = {
  workout_count: {
    icon: Dumbbell,
    label: 'Workout Count',
    unit: 'workouts',
    color: '#3B82F6',
  },
  total_volume: {
    icon: Target,
    label: 'Total Volume',
    unit: 'lbs',
    color: '#22C55E',
  },
  streak: {
    icon: Flame,
    label: 'Streak Challenge',
    unit: 'days',
    color: '#EF4444',
  },
  rep_count: {
    icon: Zap,
    label: 'Rep Count',
    unit: 'reps',
    color: '#A855F7',
  },
};

function formatTimeRemaining(endDate) {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end - now;

  if (diff <= 0) return 'Ended';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  return 'Ending soon';
}

function formatNumber(num) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

export function HangoutChallengeCard({
  challenge,
  userRank,
  userProgress,
  onJoin,
  onViewDetails,
  isJoined = false,
  className = '',
}) {
  const [showPrizes, setShowPrizes] = useState(false);

  const config = CHALLENGE_TYPES[challenge.challengeType] || CHALLENGE_TYPES.workout_count;
  const Icon = config.icon;

  const isActive = new Date(challenge.endDate) > new Date();
  const hasEnded = !isActive;
  const progressPercent = challenge.targetValue
    ? Math.min(100, (userProgress / challenge.targetValue) * 100)
    : 0;

  return (
    <motion.div
      className={`
        bg-gray-900/50 backdrop-blur-md rounded-xl border overflow-hidden
        ${isActive ? 'border-gray-700/50' : 'border-gray-800/50 opacity-75'}
        ${className}
      `}
      layout
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div
              className="p-3 rounded-xl shrink-0"
              style={{ backgroundColor: `${config.color}20` }}
            >
              <Icon className="w-5 h-5" style={{ color: config.color }} />
            </div>

            <div>
              {/* Title */}
              <div className="font-semibold text-white">
                {challenge.name}
              </div>

              {/* Type and target */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-white/60">
                  {config.label}
                </span>
                {challenge.targetValue && (
                  <>
                    <span className="text-white/30">•</span>
                    <span className="text-sm" style={{ color: config.color }}>
                      {formatNumber(challenge.targetValue)} {config.unit}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div className={`
            px-2 py-1 rounded-lg text-xs font-medium
            ${isActive
              ? 'bg-green-500/20 text-green-400'
              : 'bg-gray-600/20 text-gray-400'
            }
          `}>
            {isActive ? 'Active' : 'Ended'}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-4">
          {/* Prize pool */}
          <div className="flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-300">
              {formatNumber(challenge.prizePool)} pool
            </span>
          </div>

          {/* Participants */}
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-white/40" />
            <span className="text-sm text-white/60">
              {challenge.participantCount} participants
            </span>
          </div>

          {/* Time remaining */}
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-white/40" />
            <span className="text-sm text-white/60">
              {formatTimeRemaining(challenge.endDate)}
            </span>
          </div>
        </div>

        {/* User progress (if joined) */}
        {isJoined && isActive && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">Your Progress</span>
              <div className="flex items-center gap-2">
                {userRank && (
                  <span className="text-sm font-medium text-amber-300">
                    #{userRank}
                  </span>
                )}
                <span className="text-sm text-white">
                  {formatNumber(userProgress)} / {formatNumber(challenge.targetValue)}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: config.color }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Prize distribution (collapsible) */}
      <div className="border-t border-gray-800">
        <button
          onClick={() => setShowPrizes(!showPrizes)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-white">Prize Distribution</span>
          </div>
          {showPrizes ? (
            <ChevronUp className="w-4 h-4 text-white/40" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/40" />
          )}
        </button>

        {showPrizes && challenge.prizes && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4"
          >
            <div className="space-y-2">
              {challenge.prizes.map((prize, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-800/30"
                >
                  <div className="flex items-center gap-2">
                    <Award
                      className="w-4 h-4"
                      style={{
                        color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'
                      }}
                    />
                    <span className="text-sm text-white">
                      {prize.position === 1 ? '1st' : prize.position === 2 ? '2nd' : prize.position === 3 ? '3rd' : `${prize.position}th`} Place
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-sm font-medium text-amber-300">
                      {formatNumber(prize.credits)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Action button */}
      <div className="p-4 border-t border-gray-800 bg-gray-800/30">
        {isActive && !isJoined ? (
          <button
            onClick={onJoin}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-medium hover:opacity-90 transition-opacity"
          >
            Join Challenge
          </button>
        ) : isActive && isJoined ? (
          <button
            onClick={onViewDetails}
            className="w-full py-2.5 rounded-lg border border-amber-400/30 text-amber-300 font-medium hover:bg-amber-500/10 transition-colors"
          >
            View Leaderboard
          </button>
        ) : (
          <button
            onClick={onViewDetails}
            className="w-full py-2.5 rounded-lg border border-gray-700 text-white/60 font-medium hover:bg-gray-800/50 transition-colors"
          >
            View Results
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default HangoutChallengeCard;
