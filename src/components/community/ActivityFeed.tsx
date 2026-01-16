/**
 * ActivityFeed Component
 *
 * Enhanced real-time activity feed with animations, reactions, and infinite scroll.
 * Respects user motion preferences through MotionContext.
 *
 * Features:
 * - Staggered item animations on load
 * - New items animate in from top
 * - High five button with burst animation
 * - Quick reactions (fire, flex, applause) with emoji burst
 * - Smooth removal animation when items leave
 * - Pull-to-refresh with spring animation (mobile)
 * - Infinite scroll with loading skeleton
 * - Share workout as visual card button
 */

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useMotion } from '../../contexts/MotionContext';
import {
  staggerChildren,
  staggerItem,
  transitionPresets,
} from '../../utils/motionVariants';

// ============================================
// CONSTANTS
// ============================================

const EVENT_ICONS = {
  'session.start': { icon: '🟢', color: 'text-green-400' },
  'session.end': { icon: '🔴', color: 'text-red-400' },
  'workout.started': { icon: '🏋️', color: 'text-blue-400' },
  'workout.completed': { icon: '💪', color: 'text-purple-400' },
  'exercise.selected': { icon: '📋', color: 'text-gray-400' },
  'exercise.completed': { icon: '✅', color: 'text-green-400' },
  'stage.entered': { icon: '🚪', color: 'text-yellow-400' },
  'stage.completed': { icon: '🏁', color: 'text-emerald-400' },
  'level.up': { icon: '⬆️', color: 'text-amber-400' },
  'archetype.switched': { icon: '🔄', color: 'text-cyan-400' },
  'achievement.unlocked': { icon: '🏆', color: 'text-yellow-400' },
  'competition.joined': { icon: '🎯', color: 'text-orange-400' },
  'competition.completed': { icon: '🥇', color: 'text-yellow-400' },
  'high.five': { icon: '🙌', color: 'text-yellow-400' },
};

const EVENT_LABELS = {
  'session.start': 'Started a session',
  'session.end': 'Ended session',
  'workout.started': 'Started a workout',
  'workout.completed': 'Completed a workout',
  'exercise.selected': 'Selected an exercise',
  'exercise.completed': 'Completed an exercise',
  'stage.entered': 'Entered a new stage',
  'stage.completed': 'Completed a stage',
  'level.up': 'Leveled up',
  'archetype.switched': 'Switched archetype',
  'achievement.unlocked': 'Unlocked an achievement',
  'competition.joined': 'Joined a competition',
  'competition.completed': 'Finished a competition',
  'high.five': 'Received a high five',
};

const QUICK_REACTIONS = [
  { emoji: '🔥', label: 'Fire', name: 'fire' },
  { emoji: '💪', label: 'Flex', name: 'flex' },
  { emoji: '👏', label: 'Applause', name: 'applause' },
  { emoji: '⚡', label: 'Energy', name: 'energy' },
];

const PULL_THRESHOLD = 80;

// ============================================
// EMOJI BURST COMPONENT
// ============================================

function EmojiBurst({ emoji, x, y, onComplete }) {
  const { shouldAnimate } = useMotion();

  const particles = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      angle: (i / 8) * Math.PI * 2,
      delay: i * 0.02,
    }));
  }, []);

  if (!shouldAnimate) {
    return null;
  }

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
    >
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute text-2xl"
          initial={{ opacity: 1, scale: 0.5, x: 0, y: 0 }}
          animate={{
            opacity: [1, 1, 0],
            scale: [0.5, 1.2, 0.8],
            x: Math.cos(particle.angle) * 60,
            y: Math.sin(particle.angle) * 60 - 20,
          }}
          transition={{
            duration: 0.6,
            delay: particle.delay,
            ease: 'easeOut',
          }}
          onAnimationComplete={particle.id === 0 ? onComplete : undefined}
        >
          {emoji}
        </motion.span>
      ))}
      <motion.span
        className="absolute text-4xl"
        initial={{ opacity: 1, scale: 0.3 }}
        animate={{
          opacity: [1, 1, 0],
          scale: [0.3, 1.5, 1],
        }}
        transition={{
          duration: 0.5,
          ease: 'easeOut',
        }}
      >
        {emoji}
      </motion.span>
    </div>
  );
}

// ============================================
// HIGH FIVE BUTTON COMPONENT
// ============================================

function HighFiveButton({ eventId, onHighFive, count = 0, hasHighFived = false }) {
  const { shouldAnimate, reducedMotion } = useMotion();
  const [localCount, setLocalCount] = useState(count);
  const [localHasHighFived, setLocalHasHighFived] = useState(hasHighFived);
  const [showBurst, setShowBurst] = useState(false);
  const buttonRef = useRef(null);
  const [burstPosition, setBurstPosition] = useState({ x: 0, y: 0 });

  const handleClick = useCallback(
    () => {
      if (localHasHighFived) return;

      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) {
        setBurstPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }

      setLocalCount((c) => c + 1);
      setLocalHasHighFived(true);
      setShowBurst(true);

      onHighFive?.(eventId);
    },
    [eventId, localHasHighFived, onHighFive]
  );

  return (
    <>
      <motion.button
        ref={buttonRef}
        onClick={handleClick}
        disabled={localHasHighFived}
        className={clsx(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors',
          localHasHighFived
            ? 'bg-yellow-500/20 text-yellow-400 cursor-default'
            : 'bg-gray-700/50 text-gray-300 hover:bg-yellow-500/20 hover:text-yellow-400'
        )}
        whileHover={
          !reducedMotion && !localHasHighFived ? { scale: 1.05 } : undefined
        }
        whileTap={
          !reducedMotion && !localHasHighFived ? { scale: 0.95 } : undefined
        }
        aria-label={`High five (${localCount})`}
      >
        <motion.span
          animate={
            showBurst && shouldAnimate
              ? {
                  scale: [1, 1.3, 1],
                  rotate: [0, -15, 15, 0],
                }
              : {}
          }
          transition={{ duration: 0.4 }}
        >
          🙌
        </motion.span>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={localCount}
            initial={shouldAnimate ? { opacity: 0, y: -10 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldAnimate ? { opacity: 0, y: 10 } : undefined}
            className="min-w-[1.5ch] text-center"
          >
            {localCount}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {showBurst && (
          <EmojiBurst
            emoji="🙌"
            x={burstPosition.x}
            y={burstPosition.y}
            onComplete={() => setShowBurst(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================
// QUICK REACTIONS COMPONENT
// ============================================

function QuickReactions({ eventId, onReact, reactions = {} }) {
  const { shouldAnimate, reducedMotion } = useMotion();
  const [activeReaction, setActiveReaction] = useState(null);
  const [burstState, setBurstState] = useState(null);

  const handleReact = useCallback(
    (reaction, e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setBurstState({
        emoji: reaction.emoji,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
      setActiveReaction(reaction.name);
      onReact?.(eventId, reaction.name);

      setTimeout(() => setActiveReaction(null), 300);
    },
    [eventId, onReact]
  );

  return (
    <>
      <div className="flex items-center gap-1">
        {QUICK_REACTIONS.map((reaction) => (
          <motion.button
            key={reaction.name}
            onClick={(e) => handleReact(reaction, e)}
            className={clsx(
              'p-1.5 rounded-lg transition-colors',
              reactions[reaction.name] > 0
                ? 'bg-gray-600/50'
                : 'hover:bg-gray-700/50'
            )}
            whileHover={!reducedMotion ? { scale: 1.15 } : undefined}
            whileTap={!reducedMotion ? { scale: 0.9 } : undefined}
            animate={
              activeReaction === reaction.name && shouldAnimate
                ? { scale: [1, 1.3, 1] }
                : {}
            }
            aria-label={reaction.label}
            title={reaction.label}
          >
            <span className="text-lg">{reaction.emoji}</span>
            {reactions[reaction.name] > 0 && (
              <span className="text-xs text-gray-400 ml-0.5">
                {reactions[reaction.name]}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {burstState && (
          <EmojiBurst
            emoji={burstState.emoji}
            x={burstState.x}
            y={burstState.y}
            onComplete={() => setBurstState(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================
// SHARE BUTTON COMPONENT
// ============================================

function ShareButton({ event, onShare }) {
  const { reducedMotion } = useMotion();
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    try {
      await onShare?.(event);
    } finally {
      setTimeout(() => setIsSharing(false), 500);
    }
  }, [event, onShare]);

  return (
    <motion.button
      onClick={handleShare}
      disabled={isSharing}
      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
      whileHover={!reducedMotion ? { scale: 1.1 } : undefined}
      whileTap={!reducedMotion ? { scale: 0.9 } : undefined}
      aria-label="Share workout"
      title="Share as card"
    >
      <motion.svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={isSharing ? { rotate: 360 } : {}}
        transition={{ duration: 0.5 }}
      >
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </motion.svg>
    </motion.button>
  );
}

// ============================================
// ACTIVITY CARD COMPONENT
// ============================================

function ActivityCard({
  event,
  isNew = false,
  onHighFive,
  onReact,
  onShare,
  onRemove: _onRemove,
}) {
  const { shouldAnimate, reducedMotion } = useMotion();
  const eventConfig = EVENT_ICONS[event.type] || { icon: '📌', color: 'text-gray-400' };
  const label = EVENT_LABELS[event.type] || event.type;
  const time = formatDistanceToNow(new Date(event.ts), { addSuffix: true });

  const cardVariants = useMemo(
    () => ({
      initial: reducedMotion
        ? { opacity: 0 }
        : isNew
        ? { opacity: 0, y: -30, scale: 0.95 }
        : { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: reducedMotion
        ? { opacity: 0 }
        : { opacity: 0, x: -100, scale: 0.9 },
    }),
    [reducedMotion, isNew]
  );

  return (
    <motion.div
      layout={shouldAnimate}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={
        reducedMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 300, damping: 25 }
      }
      className={clsx(
        'glass rounded-xl p-4 transition-colors',
        isNew && 'ring-2 ring-blue-500/50'
      )}
      whileHover={!reducedMotion ? { scale: 1.01 } : undefined}
    >
      <div className="flex items-start gap-3">
        {/* Event Icon */}
        <motion.div
          className={clsx('text-2xl flex-shrink-0', eventConfig.color)}
          animate={
            isNew && shouldAnimate
              ? {
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0],
                }
              : {}
          }
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {eventConfig.icon}
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white truncate">
              {event.displayName || 'Anonymous'}
            </span>
            {event.geoBucket && (
              <motion.span
                className="text-xs bg-gray-700/70 px-2 py-0.5 rounded-full text-gray-300"
                initial={shouldAnimate ? { opacity: 0, scale: 0.8 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                {event.geoBucket}
              </motion.span>
            )}
          </div>

          <p className="text-gray-300 text-sm mt-0.5">{label}</p>

          {/* Event Details */}
          {event.payload?.exerciseName && (
            <motion.p
              className="text-purple-400 text-sm mt-1"
              initial={shouldAnimate ? { opacity: 0, x: -10 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              {event.payload.exerciseName}
            </motion.p>
          )}
          {event.payload?.totalTu && (
            <motion.p
              className="text-green-400 text-sm mt-1 font-medium"
              initial={shouldAnimate ? { opacity: 0, scale: 0.8 } : false}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              +{Math.round(event.payload.totalTu)} TU
            </motion.p>
          )}
          {event.payload?.newLevel && (
            <motion.p
              className="text-yellow-400 text-sm mt-1 font-medium"
              initial={shouldAnimate ? { opacity: 0, y: 5 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Level {event.payload.newLevel}
              {event.payload.archetypeName && ` - ${event.payload.archetypeName}`}
            </motion.p>
          )}

          {/* Actions Row */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <HighFiveButton
              eventId={event.id}
              onHighFive={onHighFive}
              count={event.highFives || 0}
              hasHighFived={event.hasHighFived}
            />
            <QuickReactions
              eventId={event.id}
              onReact={onReact}
              reactions={event.reactions}
            />
            {event.type === 'workout.completed' && (
              <ShareButton event={event} onShare={onShare} />
            )}
          </div>
        </div>

        {/* Timestamp */}
        <div className="text-xs text-gray-500 flex-shrink-0">{time}</div>
      </div>
    </motion.div>
  );
}

// ============================================
// LOADING SKELETON
// ============================================

function ActivitySkeleton() {
  const { reducedMotion } = useMotion();

  return (
    <motion.div
      className="glass rounded-xl p-4"
      animate={
        !reducedMotion
          ? { opacity: [0.5, 0.8, 0.5] }
          : { opacity: 0.7 }
      }
      transition={
        !reducedMotion
          ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
          : {}
      }
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-700/50" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-gray-700/50 rounded" />
          <div className="h-3 w-48 bg-gray-700/50 rounded" />
          <div className="h-3 w-24 bg-gray-700/50 rounded" />
        </div>
        <div className="h-3 w-16 bg-gray-700/50 rounded" />
      </div>
    </motion.div>
  );
}

// ============================================
// PULL TO REFRESH INDICATOR
// ============================================

function PullToRefreshIndicator({ pullDistance, isRefreshing }) {
  const { shouldAnimate, reducedMotion } = useMotion();
  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <motion.div
      className="absolute left-0 right-0 flex justify-center pointer-events-none"
      style={{ top: pullDistance - 40 }}
      animate={{ opacity: progress }}
    >
      <motion.div
        className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center shadow-lg"
        animate={
          isRefreshing && shouldAnimate
            ? { rotate: 360 }
            : { rotate: progress * 180 }
        }
        transition={
          isRefreshing
            ? { duration: 1, repeat: Infinity, ease: 'linear' }
            : reducedMotion
            ? { duration: 0 }
            : transitionPresets.spring(false)
        }
      >
        <svg
          className="w-5 h-5 text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// MAIN ACTIVITY FEED COMPONENT
// ============================================

export default function ActivityFeed({
  events = [],
  loading = false,
  connected = false,
  hasMore = true,
  onLoadMore,
  onRefresh,
  onHighFive,
  onReact,
  onShare,
}) {
  const { shouldAnimate, reducedMotion } = useMotion();
  const containerRef = useRef(null);
  const [newEventIds, setNewEventIds] = useState(new Set());
  const [removingIds, setRemovingIds] = useState(new Set());
  const previousEventsRef = useRef(events);

  // Pull to refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  // Detect new events
  useEffect(() => {
    const previousIds = new Set(previousEventsRef.current.map((e) => e.id));
    const newIds = events
      .filter((e) => !previousIds.has(e.id))
      .map((e) => e.id);

    if (newIds.length > 0) {
      setNewEventIds(new Set(newIds));
      // Clear "new" state after animation
      setTimeout(() => setNewEventIds(new Set()), 3000);
    }

    previousEventsRef.current = events;
  }, [events]);

  // Infinite scroll observer
  const loadMoreRef = useRef(null);
  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore?.();
        }
      },
      { rootMargin: '200px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  // Pull to refresh handlers
  const handleTouchStart = useCallback((e) => {
    if (containerRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling.current) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    if (diff > 0) {
      e.preventDefault();
      setPullDistance(Math.min(diff * 0.5, PULL_THRESHOLD * 1.5));
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh?.();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    isPulling.current = false;
  }, [pullDistance, isRefreshing, onRefresh]);

  // Container variants for stagger animation
  const containerVariants = useMemo(
    () => staggerChildren(reducedMotion, { staggerDelay: 0.05 }),
    [reducedMotion]
  );

  // Item variants for stagger animation (available for future use)
  const _itemVariants = useMemo(
    () => staggerItem(reducedMotion, 'up'),
    [reducedMotion]
  );

  // Initial loading state
  if (loading && events.length === 0) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <ActivitySkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative space-y-3"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to Refresh Indicator */}
      {pullDistance > 0 && (
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
        />
      )}

      {/* Connection Status */}
      <motion.div
        className="flex items-center gap-2 text-sm"
        initial={shouldAnimate ? { opacity: 0, y: -10 } : false}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div
          className={clsx(
            'w-2 h-2 rounded-full',
            connected ? 'bg-green-500' : 'bg-gray-500'
          )}
          animate={
            connected && shouldAnimate
              ? { scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }
              : {}
          }
          transition={
            connected
              ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
              : {}
          }
        />
        <span className="text-gray-400">
          {connected ? 'Live updates active' : 'Connecting...'}
        </span>
      </motion.div>

      {/* Events List */}
      {events.length === 0 ? (
        <motion.div
          className="text-center py-12 text-gray-400"
          initial={shouldAnimate ? { opacity: 0, scale: 0.9 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={transitionPresets.spring(reducedMotion)}
        >
          <motion.p
            className="text-4xl mb-3"
            animate={
              shouldAnimate
                ? { rotate: [0, 10, -10, 0] }
                : {}
            }
            transition={{ duration: 2, repeat: Infinity }}
          >
            ✨
          </motion.p>
          <p>No activity yet. Be the first!</p>
        </motion.div>
      ) : (
        <motion.div
          className="space-y-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{
            transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          }}
        >
          <AnimatePresence mode="popLayout">
            {events
              .filter((event) => !removingIds.has(event.id))
              .map((event) => (
                <ActivityCard
                  key={event.id}
                  event={event}
                  isNew={newEventIds.has(event.id)}
                  onHighFive={onHighFive}
                  onReact={onReact}
                  onShare={onShare}
                  onRemove={(id) =>
                    setRemovingIds((prev) => new Set([...prev, id]))
                  }
                />
              ))}
          </AnimatePresence>

          {/* Load More Trigger */}
          {hasMore && (
            <div ref={loadMoreRef} className="py-4">
              {loading && (
                <div className="space-y-2">
                  <ActivitySkeleton />
                  <ActivitySkeleton />
                </div>
              )}
            </div>
          )}

          {/* End of Feed */}
          {!hasMore && events.length > 0 && (
            <motion.p
              className="text-center text-gray-500 text-sm py-4"
              initial={shouldAnimate ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
            >
              You have reached the end
            </motion.p>
          )}
        </motion.div>
      )}
    </div>
  );
}
