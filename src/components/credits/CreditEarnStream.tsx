/**
 * CreditEarnStream - Real-time credit earning feed
 *
 * Shows a live stream of credit earnings with animations.
 * Uses polling or WebSocket for real-time updates.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins,
  Dumbbell,
  Target,
  Users,
  Gift,
  Flame,
  Trophy,
  Zap,
  Heart,
  Star,
  Clock,
} from 'lucide-react';

// Source icons mapping
const SOURCE_ICONS = {
  rep: Dumbbell,
  set: Dumbbell,
  workout: Zap,
  goal: Target,
  social: Users,
  tip: Heart,
  high_five: Star,
  bonus: Gift,
  streak: Flame,
  competition: Trophy,
  purchase: Coins,
  default: Coins,
};

const SOURCE_COLORS = {
  rep: '#3B82F6',
  set: '#3B82F6',
  workout: '#8B5CF6',
  goal: '#22C55E',
  social: '#A855F7',
  tip: '#EC4899',
  high_five: '#F59E0B',
  bonus: '#FFD700',
  streak: '#EF4444',
  competition: '#06B6D4',
  purchase: '#22C55E',
  default: '#F59E0B',
};

function formatTimeAgo(date) {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function EarnEventItem({ event, isNew }) {
  const source = event.source?.split('.')[0] || 'default';
  const Icon = SOURCE_ICONS[source] || SOURCE_ICONS.default;
  const color = SOURCE_COLORS[source] || SOURCE_COLORS.default;

  return (
    <motion.div
      initial={isNew ? { opacity: 0, x: -50, scale: 0.8 } : { opacity: 1, x: 0, scale: 1 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`
        flex items-center gap-3 p-3 rounded-lg
        ${isNew ? 'bg-amber-500/10 border border-amber-400/30' : 'bg-gray-800/50'}
        transition-colors duration-500
      `}
    >
      {/* Icon */}
      <motion.div
        className="p-2 rounded-lg shrink-0"
        style={{ backgroundColor: `${color}20` }}
        animate={isNew ? {
          scale: [1, 1.2, 1],
          rotate: [0, 10, -10, 0],
        } : {}}
        transition={{ duration: 0.5 }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </motion.div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate">
          {event.description || `Earned from ${source}`}
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Clock className="w-3 h-3" />
          {formatTimeAgo(event.createdAt)}
        </div>
      </div>

      {/* Amount */}
      <motion.div
        className="text-right shrink-0"
        animate={isNew ? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        <div className="text-lg font-bold" style={{ color }}>
          +{event.amount}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function CreditEarnStream({
  events = [],
  maxItems = 10,
  showEmpty = true,
  pollingInterval = 5000,
  onFetchMore,
  className = '',
}) {
  const [newEventIds, setNewEventIds] = useState(new Set());
  const previousEventsRef = useRef([]);

  // Track new events for animation
  useEffect(() => {
    const previousIds = new Set(previousEventsRef.current.map(e => e.id));
    const newIds = events.filter(e => !previousIds.has(e.id)).map(e => e.id);

    if (newIds.length > 0) {
      setNewEventIds(new Set(newIds));
      // Clear "new" status after animation
      const timer = setTimeout(() => {
        setNewEventIds(new Set());
      }, 2000);
      return () => clearTimeout(timer);
    }

    previousEventsRef.current = events;
  }, [events]);

  // Polling for new events
  useEffect(() => {
    if (!onFetchMore || pollingInterval <= 0) return;

    const interval = setInterval(() => {
      onFetchMore();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [onFetchMore, pollingInterval]);

  const displayEvents = events.slice(0, maxItems);

  return (
    <div className={`bg-gray-900/50 backdrop-blur-md rounded-xl border border-gray-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold text-white">Recent Earnings</h3>
        </div>
        {events.length > 0 && (
          <span className="text-xs text-white/40">
            {events.length} events
          </span>
        )}
      </div>

      {/* Event list */}
      <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
        <AnimatePresence mode="popLayout" initial={false}>
          {displayEvents.length === 0 && showEmpty ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-white/50"
            >
              <Coins className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No recent earnings</p>
              <p className="text-sm mt-1">Complete activities to earn credits!</p>
            </motion.div>
          ) : (
            displayEvents.map(event => (
              <EarnEventItem
                key={event.id}
                event={event}
                isNew={newEventIds.has(event.id)}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Load more */}
      {events.length > maxItems && onFetchMore && (
        <div className="p-3 border-t border-gray-800">
          <button
            onClick={onFetchMore}
            className="w-full py-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}

export default CreditEarnStream;
