/**
 * ActiveEvents Component
 *
 * Displays currently active time-limited events with:
 * - Event countdown timer
 * - Multiplier bonuses display
 * - Join/participation status
 * - Progress tracking
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  Clock,
  Gift,
  Star,
  TrendingUp,
  Sparkles,
  Calendar,
  ChevronRight,
  Trophy,
} from 'lucide-react';
import { useEvents } from '../../store/engagementStore';
import { cn } from '../../lib/utils';

const EVENT_ICONS: Record<string, React.ElementType> = {
  flash_sale: Zap,
  double_credits: Gift,
  challenge_bonus: Trophy,
  seasonal: Calendar,
  community_goal: Star,
};

const EVENT_COLORS: Record<string, { gradient: string; bg: string; border: string }> = {
  flash_sale: {
    gradient: 'from-yellow-500 to-orange-500',
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/30',
  },
  double_credits: {
    gradient: 'from-green-500 to-emerald-500',
    bg: 'bg-green-500/20',
    border: 'border-green-500/30',
  },
  challenge_bonus: {
    gradient: 'from-purple-500 to-violet-500',
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/30',
  },
  seasonal: {
    gradient: 'from-pink-500 to-rose-500',
    bg: 'bg-pink-500/20',
    border: 'border-pink-500/30',
  },
  community_goal: {
    gradient: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
  },
};

function formatTimeRemaining(endDate: string): string {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return 'Ended';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  return `${hours}h ${minutes}m`;
}

interface EventCardProps {
  event: {
    id: string;
    eventType: string;
    name: string;
    description: string | null;
    startsAt: string;
    endsAt: string;
    config: {
      creditMultiplier?: number;
      xpMultiplier?: number;
      challengeMultiplier?: number;
      discountPercent?: number;
    };
    isJoined?: boolean;
    progress?: Record<string, unknown>;
  };
  onJoin?: (eventId: string) => void;
}

function EventCard({ event, onJoin }: EventCardProps) {
  const [timeRemaining, setTimeRemaining] = useState(formatTimeRemaining(event.endsAt));
  const Icon = EVENT_ICONS[event.eventType] || Zap;
  const colors = EVENT_COLORS[event.eventType] || EVENT_COLORS.flash_sale;

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(event.endsAt));
    }, 60000);
    return () => clearInterval(interval);
  }, [event.endsAt]);

  const multipliers = [];
  if (event.config.creditMultiplier && event.config.creditMultiplier > 1) {
    multipliers.push({ label: 'Credits', value: `${event.config.creditMultiplier}x` });
  }
  if (event.config.xpMultiplier && event.config.xpMultiplier > 1) {
    multipliers.push({ label: 'XP', value: `${event.config.xpMultiplier}x` });
  }
  if (event.config.challengeMultiplier && event.config.challengeMultiplier > 1) {
    multipliers.push({ label: 'Challenges', value: `${event.config.challengeMultiplier}x` });
  }
  if (event.config.discountPercent && event.config.discountPercent > 0) {
    multipliers.push({ label: 'Discount', value: `-${event.config.discountPercent}%` });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 rounded-xl border',
        colors.bg,
        colors.border
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-xl bg-gradient-to-br', colors.gradient)}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-white">{event.name}</h4>
            {event.description && (
              <p className="text-xs text-white/60 mt-0.5 line-clamp-1">{event.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm text-white/60">
          <Clock className="w-4 h-4" />
          <span>{timeRemaining}</span>
        </div>
      </div>

      {/* Multipliers */}
      {multipliers.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {multipliers.map((m) => (
            <div
              key={m.label}
              className="flex items-center gap-1 px-2 py-1 bg-white/10 rounded-lg"
            >
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-xs text-white/60">{m.label}</span>
              <span className="text-xs font-bold text-green-400">{m.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action */}
      <div className="mt-3">
        {event.isJoined ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-green-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Participating
            </span>
            <button className="text-xs text-white/60 hover:text-white flex items-center gap-1 transition-colors">
              View Progress
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onJoin?.(event.id)}
            className={cn(
              'w-full py-2 rounded-lg font-medium text-sm',
              'bg-gradient-to-r text-white',
              colors.gradient
            )}
          >
            Join Event
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

interface ActiveEventsProps {
  showUpcoming?: boolean;
  maxEvents?: number;
  className?: string;
}

export function ActiveEvents({
  showUpcoming = false,
  maxEvents = 3,
  className,
}: ActiveEventsProps) {
  const { active, upcoming, multipliers, loading, fetchActive, fetchUpcoming, join } = useEvents();

  useEffect(() => {
    fetchActive();
    if (showUpcoming) {
      fetchUpcoming();
    }
  }, [fetchActive, fetchUpcoming, showUpcoming]);

  const hasActiveMultipliers =
    multipliers.credits > 1 || multipliers.xp > 1 || multipliers.challenges > 1;

  if (loading && active.length === 0) {
    return (
      <div className={cn('space-y-3', className)}>
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse h-24 bg-white/5 rounded-xl" />
        ))}
      </div>
    );
  }

  if (active.length === 0 && (!showUpcoming || upcoming.length === 0)) {
    return (
      <div className={cn('p-6 bg-white/5 rounded-xl text-center', className)}>
        <Calendar className="w-10 h-10 text-white/20 mx-auto mb-3" />
        <p className="text-white/60">No active events</p>
        <p className="text-xs text-white/40 mt-1">Check back later for special events!</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Current Multipliers Banner */}
      {hasActiveMultipliers && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-4 p-3 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-orange-500/20 rounded-xl border border-purple-500/30"
        >
          <Sparkles className="w-5 h-5 text-purple-400" />
          <span className="text-sm font-medium text-white">Active Bonuses:</span>
          {multipliers.credits > 1 && (
            <span className="text-sm text-green-400">{multipliers.credits}x Credits</span>
          )}
          {multipliers.xp > 1 && (
            <span className="text-sm text-purple-400">{multipliers.xp}x XP</span>
          )}
          {multipliers.challenges > 1 && (
            <span className="text-sm text-blue-400">{multipliers.challenges}x Challenges</span>
          )}
        </motion.div>
      )}

      {/* Active Events */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white/60 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Active Events
          </h3>
          {active.slice(0, maxEvents).map((event) => (
            <EventCard key={event.id} event={event} onJoin={join} />
          ))}
        </div>
      )}

      {/* Upcoming Events */}
      {showUpcoming && upcoming.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white/40 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Coming Soon
          </h3>
          {upcoming.slice(0, 2).map((event) => {
            const Icon = EVENT_ICONS[event.eventType] || Zap;
            const startsIn = formatTimeRemaining(event.startsAt);

            return (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-white/40" />
                  <div>
                    <p className="text-sm font-medium text-white/60">{event.name}</p>
                    <p className="text-xs text-white/40">Starts in {startsIn}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ActiveEvents;
