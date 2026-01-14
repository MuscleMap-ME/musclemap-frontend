/**
 * Tip Definitions
 *
 * Predefined contextual tips for various trigger conditions throughout the app.
 * Each tip has a unique id, trigger condition, message, and optional action.
 */

/**
 * Tip trigger types
 * @type {Object.<string, string>}
 */
export const TIP_TRIGGERS = {
  WORKOUT_COMPLETE: 'workout_complete',
  FIRST_LOGIN: 'first_login',
  EARNED_CREDITS: 'earned_credits',
  NEW_ACHIEVEMENT: 'new_achievement',
  STREAK_MILESTONE: 'streak_milestone',
  LEVEL_UP: 'level_up',
  NO_WORKOUT_3_DAYS: 'no_workout_3_days',
  PROFILE_INCOMPLETE: 'profile_incomplete',
  // Legacy/additional triggers
  LOW_CREDITS: 'low_credits',
  INACTIVE_3_DAYS: 'inactive_3_days',
  STREAK_AT_RISK: 'streak_at_risk',
  FIRST_WORKOUT: 'first_workout',
  MILESTONE_REACHED: 'milestone_reached',
  COMMUNITY_JOIN: 'community_join',
  ARCHETYPE_SELECTED: 'archetype_selected',
};

/**
 * Tip category icons and styling
 */
export const TIP_CATEGORIES = {
  action: {
    icon: 'zap',
    color: 'from-blue-500/30 to-cyan-500/30',
    glow: 'rgba(0, 102, 255, 0.3)',
  },
  progress: {
    icon: 'trending-up',
    color: 'from-green-500/30 to-emerald-500/30',
    glow: 'rgba(34, 197, 94, 0.3)',
  },
  reward: {
    icon: 'award',
    color: 'from-yellow-500/30 to-orange-500/30',
    glow: 'rgba(245, 158, 11, 0.3)',
  },
  social: {
    icon: 'users',
    color: 'from-purple-500/30 to-pink-500/30',
    glow: 'rgba(139, 92, 246, 0.3)',
  },
  reminder: {
    icon: 'bell',
    color: 'from-red-500/30 to-rose-500/30',
    glow: 'rgba(239, 68, 68, 0.3)',
  },
};

/**
 * Predefined tips configuration
 * @type {Object.<string, Object>}
 */
export const TIP_DEFINITIONS = {
  // Workout completion tips
  workout_complete_view_map: {
    id: 'workout_complete_view_map',
    trigger: TIP_TRIGGERS.WORKOUT_COMPLETE,
    category: 'action',
    message: 'Great workout! View your muscle activation map',
    action: {
      label: 'View Map',
      to: '/stats',
    },
    priority: 1,
  },
  workout_complete_share: {
    id: 'workout_complete_share',
    trigger: TIP_TRIGGERS.WORKOUT_COMPLETE,
    category: 'social',
    message: 'Nice work! Share your progress with the community.',
    action: {
      label: 'Share',
      to: '/community/share',
    },
    priority: 2,
  },

  // First login tips
  first_login_welcome: {
    id: 'first_login_welcome',
    trigger: TIP_TRIGGERS.FIRST_LOGIN,
    category: 'action',
    message: 'Welcome! Start with the guided tour',
    action: {
      label: 'Start Tour',
      to: '/onboarding',
    },
    priority: 1,
  },
  first_login_complete_profile: {
    id: 'first_login_complete_profile',
    trigger: TIP_TRIGGERS.FIRST_LOGIN,
    category: 'action',
    message: 'Complete your profile to unlock all features and earn bonus credits!',
    action: {
      label: 'Complete Profile',
      to: '/profile/edit',
    },
    priority: 2,
  },
  first_login_choose_archetype: {
    id: 'first_login_choose_archetype',
    trigger: TIP_TRIGGERS.FIRST_LOGIN,
    category: 'action',
    message: 'Choose your training archetype to get personalized workouts.',
    action: {
      label: 'Choose Archetype',
      to: '/journey',
    },
    priority: 3,
  },

  // Earned credits tips
  earned_credits_store: {
    id: 'earned_credits_store',
    trigger: TIP_TRIGGERS.EARNED_CREDITS,
    category: 'reward',
    message: 'You earned credits! Visit the store',
    action: {
      label: 'Visit Store',
      to: '/store',
    },
    priority: 1,
  },

  // Streak milestone tips
  streak_milestone_amazing: {
    id: 'streak_milestone_amazing',
    trigger: TIP_TRIGGERS.STREAK_MILESTONE,
    category: 'progress',
    message: 'Amazing streak! Keep it going',
    action: {
      label: 'View Streak',
      to: '/stats',
    },
    priority: 1,
  },

  // No workout for 3 days tips
  no_workout_3_days_comeback: {
    id: 'no_workout_3_days_comeback',
    trigger: TIP_TRIGGERS.NO_WORKOUT_3_DAYS,
    category: 'reminder',
    message: 'Time to get back in the gym!',
    action: {
      label: 'Start Workout',
      to: '/workout',
    },
    priority: 1,
  },

  // Low credits tips
  low_credits_earn: {
    id: 'low_credits_earn',
    trigger: TIP_TRIGGERS.LOW_CREDITS,
    category: 'reward',
    message: 'Running low on credits? Complete workouts to earn more!',
    action: {
      label: 'Start Workout',
      to: '/workout',
    },
    priority: 1,
  },
  low_credits_daily: {
    id: 'low_credits_daily',
    trigger: TIP_TRIGGERS.LOW_CREDITS,
    category: 'reward',
    message: 'Claim your daily bonus credits to keep your streak going.',
    action: {
      label: 'Claim Bonus',
      to: '/rewards',
    },
    priority: 2,
  },

  // New achievement tips
  new_achievement_view: {
    id: 'new_achievement_view',
    trigger: TIP_TRIGGERS.NEW_ACHIEVEMENT,
    category: 'reward',
    message: 'You unlocked an achievement! View all achievements',
    action: {
      label: 'View Achievements',
      to: '/achievements',
    },
    priority: 1,
  },

  // Inactive user tips
  inactive_3_days_welcome_back: {
    id: 'inactive_3_days_welcome_back',
    trigger: TIP_TRIGGERS.INACTIVE_3_DAYS,
    category: 'reminder',
    message: "Ready to get back to training? Let's pick up where you left off.",
    action: {
      label: 'Resume Training',
      to: '/workout',
    },
    priority: 1,
  },
  inactive_3_days_quick_workout: {
    id: 'inactive_3_days_quick_workout',
    trigger: TIP_TRIGGERS.INACTIVE_3_DAYS,
    category: 'action',
    message: "Haven't worked out in a while? Try a quick 15-minute session.",
    action: {
      label: 'Quick Workout',
      to: '/workout/quick',
    },
    priority: 2,
  },

  // Profile incomplete tips
  profile_incomplete_bonus: {
    id: 'profile_incomplete_bonus',
    trigger: TIP_TRIGGERS.PROFILE_INCOMPLETE,
    category: 'action',
    message: 'Complete your profile for bonus XP',
    action: {
      label: 'Complete Profile',
      to: '/profile/edit',
    },
    priority: 1,
  },
  profile_incomplete_avatar: {
    id: 'profile_incomplete_avatar',
    trigger: TIP_TRIGGERS.PROFILE_INCOMPLETE,
    category: 'action',
    message: 'Add a profile photo to personalize your experience.',
    action: {
      label: 'Add Photo',
      to: '/profile/edit',
    },
    priority: 2,
  },

  // Streak at risk tips
  streak_at_risk: {
    id: 'streak_at_risk',
    trigger: TIP_TRIGGERS.STREAK_AT_RISK,
    category: 'reminder',
    message: "Your streak is at risk! Don't lose your progress.",
    action: {
      label: 'Quick Workout',
      to: '/workout',
    },
    priority: 1,
  },

  // Level up tips
  level_up_view: {
    id: 'level_up_view',
    trigger: TIP_TRIGGERS.LEVEL_UP,
    category: 'reward',
    message: 'You leveled up! Check your new stats',
    action: {
      label: 'View Stats',
      to: '/stats/progression',
    },
    priority: 1,
  },

  // First workout tips
  first_workout_welcome: {
    id: 'first_workout_welcome',
    trigger: TIP_TRIGGERS.FIRST_WORKOUT,
    category: 'progress',
    message: "You've completed your first workout! You're on your way to greatness.",
    action: {
      label: 'View Stats',
      to: '/stats',
    },
    priority: 1,
  },

  // Milestone tips
  milestone_reached: {
    id: 'milestone_reached',
    trigger: TIP_TRIGGERS.MILESTONE_REACHED,
    category: 'reward',
    message: "You've reached a new milestone! Celebrate your progress.",
    action: {
      label: 'View Milestone',
      to: '/achievements/milestones',
    },
    priority: 1,
  },

  // Community tips
  community_join_welcome: {
    id: 'community_join_welcome',
    trigger: TIP_TRIGGERS.COMMUNITY_JOIN,
    category: 'social',
    message: 'Welcome to the community! Introduce yourself in the feed.',
    action: {
      label: 'Say Hi',
      to: '/community',
    },
    priority: 1,
  },

  // Archetype tips
  archetype_selected_explore: {
    id: 'archetype_selected_explore',
    trigger: TIP_TRIGGERS.ARCHETYPE_SELECTED,
    category: 'action',
    message: 'Great choice! Explore your personalized training journey.',
    action: {
      label: 'Start Journey',
      to: '/journey',
    },
    priority: 1,
  },
};

/**
 * Get tips by trigger type
 * @param {string} trigger - The trigger type
 * @returns {Array} Array of tips matching the trigger
 */
export function getTipsByTrigger(trigger) {
  return Object.values(TIP_DEFINITIONS)
    .filter((tip) => tip.trigger === trigger)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Get the highest priority tip for a trigger
 * @param {string} trigger - The trigger type
 * @returns {Object|null} The highest priority tip or null
 */
export function getPrimaryTipForTrigger(trigger) {
  const tips = getTipsByTrigger(trigger);
  return tips.length > 0 ? tips[0] : null;
}

/**
 * Get a specific tip by id
 * @param {string} id - The tip id
 * @returns {Object|null} The tip or null
 */
export function getTipById(id) {
  return TIP_DEFINITIONS[id] || null;
}

export default TIP_DEFINITIONS;
