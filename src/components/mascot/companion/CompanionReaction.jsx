/**
 * CompanionReaction
 *
 * Speech bubble that appears when the companion reacts to events.
 * Shows brief celebratory messages for workouts, streaks, PRs, etc.
 */

import React from 'react';
import { motion } from 'framer-motion';

// Reaction messages by event type
const REACTION_MESSAGES = {
  workout_logged: [
    '💪 Great workout!',
    '🔥 Keep it up!',
    '⚡ Nice session!',
    '💥 Crushed it!',
  ],
  streak_hit: [
    '🔥 Streak!',
    '🏆 On fire!',
    '⭐ Consistent!',
    '💫 Amazing!',
  ],
  pr_set: [
    '🏆 New PR!',
    '💪 Record broken!',
    '🎉 Personal best!',
    '⚡ Stronger!',
  ],
  upgrade_purchased: [
    '✨ Upgraded!',
    '🌟 Nice choice!',
    '💎 Equipped!',
    '🎁 New gear!',
  ],
  stage_evolved: [
    '🌟 EVOLVED!',
    '🚀 Level up!',
    '⭐ Growing!',
    '💫 Transformed!',
  ],
  badge_awarded: [
    '🏅 New badge!',
    '🎖️ Achievement!',
    '🏆 Earned it!',
  ],
  goal_progress: [
    '📈 Progress!',
    '🎯 Getting closer!',
    '💪 On track!',
  ],
  default: [
    '👋 Hello!',
    '✨ Nice!',
  ],
};

export default function CompanionReaction({ event }) {
  if (!event) return null;

  const eventType = event.event_type || 'default';
  const messages = REACTION_MESSAGES[eventType] || REACTION_MESSAGES.default;
  const message = messages[Math.floor(Math.random() * messages.length)];

  // Special styling for evolution
  const isEvolution = eventType === 'stage_evolved';

  return (
    <motion.div
      className="absolute -top-14 left-1/2 -translate-x-1/2 whitespace-nowrap z-20"
      initial={{ opacity: 0, y: 10, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      <div
        className={`
          px-3 py-1.5 rounded-full shadow-lg
          ${isEvolution
            ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black'
            : 'bg-white text-gray-900'
          }
          text-sm font-medium
        `}
      >
        {message}
      </div>

      {/* Speech bubble tail */}
      <div
        className={`
          absolute left-1/2 -translate-x-1/2 -bottom-1.5
          w-3 h-3 rotate-45
          ${isEvolution
            ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
            : 'bg-white'
          }
        `}
      />

      {/* XP indicator for evolution */}
      {event.xp_awarded > 0 && (
        <motion.div
          className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-green-400"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
        >
          +{event.xp_awarded} XP
        </motion.div>
      )}

      {/* Training units indicator */}
      {event.units_awarded > 0 && (
        <motion.div
          className="absolute -top-5 right-0 text-xs font-bold text-yellow-400"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ delay: 0.1 }}
        >
          +{event.units_awarded} 🪙
        </motion.div>
      )}
    </motion.div>
  );
}
