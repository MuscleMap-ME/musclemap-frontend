/**
 * CreditEarnToast - Real-time credit earning notification
 *
 * Shows animated toast when user earns credits.
 * Different animations based on amount:
 * - Small (1-10): Quick subtle fade
 * - Medium (11-50): Standard animation with particle trail
 * - Large (51-100): Golden glow effect
 * - Huge (100+): Full celebration with confetti
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins, Zap, Trophy, Gift, Flame, Star, Target, Medal,
  Calendar, Sunrise, Moon, Heart, CreditCard, Users, TrendingUp
} from 'lucide-react';

// Icon mapping for different sources
const SOURCE_ICONS = {
  workout_complete: Zap,
  rep_complete: Coins,
  set_complete: Coins,
  pr_set: Trophy,
  streak_3: Flame,
  streak_7: Flame,
  streak_14: Flame,
  streak_30: Flame,
  streak_60: Flame,
  streak_100: Star,
  streak_180: Star,
  streak_365: Trophy,
  goal_25_percent: Target,
  goal_50_percent: Target,
  goal_75_percent: Target,
  goal_complete_easy: Target,
  goal_complete_medium: Target,
  goal_complete_hard: Trophy,
  leaderboard_1st: Medal,
  leaderboard_2nd: Medal,
  leaderboard_3rd: Medal,
  leaderboard_top10: TrendingUp,
  high_five_receive: Heart,
  daily_login: Calendar,
  early_bird_workout: Sunrise,
  night_owl_workout: Moon,
  weekend_workout: Calendar,
  lucky_rep: Star,
  golden_set: Zap,
  jackpot_workout: Gift,
  mystery_box: Gift,
  purchase: CreditCard,
  tip_received: Heart,
  gift_received: Gift,
  referral_signup: Users,
  volume_5000: TrendingUp,
  volume_10000: TrendingUp,
};

// Animation variants
const toastVariants = {
  small: {
    initial: { opacity: 0, y: 20, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.95 },
  },
  medium: {
    initial: { opacity: 0, y: 30, scale: 0.8 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.9 },
  },
  large: {
    initial: { opacity: 0, y: 40, scale: 0.7 },
    animate: {
      opacity: 1,
      y: 0,
      scale: [0.7, 1.1, 1],
      transition: { duration: 0.5 }
    },
    exit: { opacity: 0, scale: 1.1 },
  },
  celebration: {
    initial: { opacity: 0, y: 50, scale: 0.5 },
    animate: {
      opacity: 1,
      y: 0,
      scale: [0.5, 1.2, 1],
      transition: { duration: 0.6, type: 'spring' }
    },
    exit: { opacity: 0, scale: 1.2 },
  },
};

// Get animation type based on amount
function getAnimationType(amount) {
  if (amount <= 10) return 'small';
  if (amount <= 50) return 'medium';
  if (amount <= 100) return 'large';
  return 'celebration';
}

// Get toast duration based on amount
function getToastDuration(amount) {
  if (amount <= 10) return 2000;
  if (amount <= 50) return 3000;
  if (amount <= 100) return 4000;
  return 5000;
}

// Single toast item
function ToastItem({ event, onDismiss }) {
  const { id, amount, source, description, color } = event;
  const animationType = getAnimationType(amount);
  const duration = getToastDuration(amount);

  const IconComponent = SOURCE_ICONS[source] || Coins;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  return (
    <motion.div
      layout
      variants={toastVariants[animationType]}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`
        relative flex items-center gap-3 px-4 py-3 rounded-xl
        backdrop-blur-md border shadow-lg cursor-pointer
        ${animationType === 'celebration'
          ? 'bg-gradient-to-r from-amber-500/20 to-purple-500/20 border-amber-400/50'
          : animationType === 'large'
            ? 'bg-gradient-to-r from-amber-500/15 to-yellow-500/15 border-amber-400/40'
            : 'bg-black/60 border-white/10'
        }
      `}
      onClick={() => onDismiss(id)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Icon */}
      <div
        className={`
          p-2 rounded-lg
          ${animationType === 'celebration' || animationType === 'large'
            ? 'bg-gradient-to-br from-amber-400 to-yellow-500'
            : 'bg-white/10'
          }
        `}
        style={color ? { backgroundColor: `${color}20` } : undefined}
      >
        <IconComponent
          className="w-5 h-5"
          style={{ color: color || '#FFD700' }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <motion.span
            className={`
              font-bold text-lg
              ${animationType === 'celebration'
                ? 'text-amber-300'
                : animationType === 'large'
                  ? 'text-yellow-400'
                  : 'text-white'
              }
            `}
            initial={{ scale: 0.5 }}
            animate={{ scale: [0.5, 1.2, 1] }}
            transition={{ duration: 0.3 }}
          >
            +{amount}
          </motion.span>
          <span className="text-xs text-white/60">credits</span>
        </div>
        {description && (
          <p className="text-sm text-white/70 truncate">{description}</p>
        )}
      </div>

      {/* Sparkle effect for large amounts */}
      {(animationType === 'large' || animationType === 'celebration') && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-amber-400 rounded-full"
              initial={{
                x: '50%',
                y: '50%',
                opacity: 1,
              }}
              animate={{
                x: `${20 + Math.random() * 60}%`,
                y: `${20 + Math.random() * 60}%`,
                opacity: 0,
                scale: [1, 2, 0],
              }}
              transition={{
                duration: 0.8,
                delay: i * 0.1,
                repeat: Infinity,
                repeatDelay: 1,
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// Toast container with queue management
export function CreditEarnToast({ events = [], onMarkSeen }) {
  const [visibleEvents, setVisibleEvents] = useState([]);

  // Add new events to visible queue
  useEffect(() => {
    if (events.length > 0) {
      setVisibleEvents(prev => {
        const newEvents = events.filter(
          e => !prev.find(p => p.id === e.id)
        );
        return [...prev, ...newEvents].slice(-5); // Max 5 visible
      });
    }
  }, [events]);

  const handleDismiss = useCallback((id) => {
    setVisibleEvents(prev => prev.filter(e => e.id !== id));
    onMarkSeen?.([id]);
  }, [onMarkSeen]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      <AnimatePresence mode="popLayout">
        {visibleEvents.map(event => (
          <ToastItem
            key={event.id}
            event={event}
            onDismiss={handleDismiss}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default CreditEarnToast;
