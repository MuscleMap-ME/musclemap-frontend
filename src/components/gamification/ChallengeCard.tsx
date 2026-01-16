import React from 'react';

export interface ChallengeCardProps {
  /** Challenge name */
  name: string;
  /** Challenge description */
  description: string;
  /** User's current progress */
  progress: number;
  /** Goal amount */
  goal: number;
  /** Number of participants */
  participants: number;
  /** Days remaining */
  daysLeft: number;
  /** Prize amount (credits) */
  prize: number;
  /** Optional callback for leaderboard click */
  onViewLeaderboard?: () => void;
  /** Optional callback for join/details */
  onClick?: () => void;
  /** Optional className */
  className?: string;
}

/**
 * ChallengeCard - Challenge display with progress bar, participant count, and prize
 *
 * @example
 * <ChallengeCard
 *   name="January Push Challenge"
 *   description="Complete 1000 push-ups"
 *   progress={650}
 *   goal={1000}
 *   participants={234}
 *   daysLeft={12}
 *   prize={500}
 * />
 */
export const ChallengeCard: React.FC<ChallengeCardProps> = ({
  name,
  description,
  progress,
  goal,
  participants,
  daysLeft,
  prize,
  onViewLeaderboard,
  onClick,
  className = '',
}) => {
  const percentage = Math.min((progress / goal) * 100, 100);
  const isCompleted = progress >= goal;

  return (
    <div
      className={`rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 p-5 ${
        onClick ? 'cursor-pointer hover:border-purple-500/50 transition-all' : ''
      } ${className}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-medium">
            Challenge
          </span>
          <h3 className="font-bold text-lg text-white mt-2">{name}</h3>
          <p className="text-sm text-slate-400">{description}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-slate-400">
            {daysLeft > 0 ? `${daysLeft} days left` : 'Ended'}
          </p>
          <p className="text-sm text-yellow-400 font-medium mt-1">
            🏆 {prize.toLocaleString()} credits
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Your Progress</span>
          <span className="font-mono text-white">
            {progress.toLocaleString()}/{goal.toLocaleString()}
          </span>
        </div>
        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isCompleted
                ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                : 'bg-gradient-to-r from-purple-500 to-pink-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {isCompleted && (
          <p className="text-sm text-green-400 font-medium">✓ Challenge completed!</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">
          {participants.toLocaleString()} participants
        </span>
        {onViewLeaderboard && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewLeaderboard();
            }}
            className="text-sm text-purple-400 font-medium hover:text-purple-300 transition-colors"
          >
            View Leaderboard →
          </button>
        )}
      </div>
    </div>
  );
};

export default ChallengeCard;
