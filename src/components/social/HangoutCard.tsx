import React from 'react';

export interface Hangout {
  /** Hangout ID */
  id: string;
  /** Hangout name */
  name: string;
  /** Location name */
  location: string;
  /** Distance from user */
  distance: string;
  /** Number of members */
  members: number;
  /** Activity type */
  activity: string;
  /** Scheduled time */
  time: string;
  /** Optional member avatars (initials or URLs) */
  memberAvatars?: string[];
}

export interface HangoutCardProps {
  /** Hangout data */
  hangout: Hangout;
  /** Callback when join button is clicked */
  onJoin?: (hangout: Hangout) => void;
  /** Callback when card is clicked */
  onClick?: (hangout: Hangout) => void;
  /** Whether user has already joined */
  isJoined?: boolean;
  /** Optional className */
  className?: string;
}

/**
 * HangoutCard - Virtual workout group card with location, time, and member count
 *
 * @example
 * <HangoutCard
 *   hangout={{
 *     id: '1',
 *     name: 'Morning Lifters',
 *     location: 'Central Park',
 *     distance: '0.3 mi',
 *     members: 5,
 *     activity: 'Outdoor Workout',
 *     time: '7:00 AM',
 *   }}
 *   onJoin={(h) => console.log('Joining', h.name)}
 * />
 */
export const HangoutCard: React.FC<HangoutCardProps> = ({
  hangout,
  onJoin,
  onClick,
  isJoined = false,
  className = '',
}) => {
  const displayAvatars = hangout.memberAvatars?.slice(0, 3) || [];
  const remainingMembers = hangout.members - displayAvatars.length;

  return (
    <div
      className={`rounded-2xl bg-slate-800/50 border border-slate-700/50 p-4 hover:border-slate-600 transition-all ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={() => onClick?.(hangout)}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-3">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500/20 to-blue-500/20 flex items-center justify-center text-2xl flex-shrink-0">
          🏃
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white truncate">{hangout.name}</h3>
          <p className="text-sm text-slate-400">
            📍 {hangout.location} • {hangout.distance}
          </p>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="px-2 py-1 rounded-lg bg-slate-700/50 text-slate-300 text-sm">
          {hangout.activity}
        </span>
        <span className="px-2 py-1 rounded-lg bg-slate-700/50 text-slate-300 text-sm">
          ⏰ {hangout.time}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Member avatars */}
          <div className="flex -space-x-2">
            {displayAvatars.length > 0 ? (
              displayAvatars.map((avatar, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 border-2 border-slate-800 flex items-center justify-center text-xs text-white font-medium"
                >
                  {avatar}
                </div>
              ))
            ) : (
              // Default avatars if none provided
              Array.from({ length: Math.min(hangout.members, 3) }).map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 border-2 border-slate-800 flex items-center justify-center text-xs text-white font-medium"
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))
            )}
          </div>
          <span className="text-sm text-slate-400">
            {remainingMembers > 0
              ? `+${remainingMembers} more`
              : `${hangout.members} member${hangout.members !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Join button */}
        {onJoin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onJoin(hangout);
            }}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
              isJoined
                ? 'bg-slate-700 text-slate-400 cursor-default'
                : 'bg-teal-500 text-white hover:bg-teal-400'
            }`}
            disabled={isJoined}
          >
            {isJoined ? 'Joined' : 'Join'}
          </button>
        )}
      </div>
    </div>
  );
};

export default HangoutCard;
