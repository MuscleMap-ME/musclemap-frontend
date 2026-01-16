/**
 * Help Content - Predefined explanations for MuscleMap terms
 *
 * This file contains all the help text for terms used throughout the app.
 * Each entry includes a brief explanation and an optional learn more URL.
 *
 * ADDING NEW TERMS:
 * 1. Add a new entry to HELP_CONTENT with a unique key
 * 2. Include 'term', 'explanation', and optionally 'learnMoreUrl'
 * 3. Keep explanations concise (1-2 sentences)
 */

export const HELP_CONTENT = {
  // ============================================
  // CORE METRICS
  // ============================================

  TU: {
    term: 'Training Units',
    explanation:
      'Training Units (TU) measure your workout effort. You earn TU based on exercise volume, intensity, and muscle activation. The more you push, the more you earn.',
    learnMoreUrl: '/docs/training-units',
  },

  XP: {
    term: 'Experience Points',
    explanation:
      'Experience Points track your overall progress. Earn XP by completing workouts, hitting milestones, and achieving goals. Level up to unlock new features.',
    learnMoreUrl: '/docs/xp-system',
  },

  credits: {
    term: 'Credits',
    explanation:
      'Credits are the in-app currency you earn through workouts and achievements. Spend them on premium features, challenges, and to support other users.',
    learnMoreUrl: '/docs/credits',
  },

  // ============================================
  // CHARACTER SYSTEM
  // ============================================

  archetype: {
    term: 'Archetype',
    explanation:
      'Your Archetype defines your training focus and playstyle. Each archetype has unique strengths, progression paths, and visual themes.',
    learnMoreUrl: '/docs/archetypes',
  },

  journey: {
    term: 'Journey',
    explanation:
      'Your Journey is the progression path within your Archetype. Complete stages to unlock new abilities, badges, and exclusive challenges.',
    learnMoreUrl: '/docs/journey',
  },

  rank: {
    term: 'Rank',
    explanation:
      'Your Rank shows your standing in the community. Rise through ranks by earning XP, completing challenges, and maintaining consistency.',
    learnMoreUrl: '/docs/ranks',
  },

  wealthTier: {
    term: 'Wealth Tier',
    explanation:
      'Wealth Tier reflects your accumulated credits. Higher tiers unlock exclusive visual badges and profile effects.',
    learnMoreUrl: '/docs/wealth-tiers',
  },

  // ============================================
  // WORKOUT TERMS
  // ============================================

  muscleActivation: {
    term: 'Muscle Activation',
    explanation:
      'Muscle Activation shows how intensely a muscle group is being worked during an exercise. Higher activation means more targeted muscle engagement.',
    learnMoreUrl: '/docs/muscle-activation',
  },

  restTimer: {
    term: 'Rest Timer',
    explanation:
      'The Rest Timer helps you optimize recovery between sets. Recommended rest times vary by exercise type and training goal.',
  },

  set: {
    term: 'Set',
    explanation:
      'A Set is a group of consecutive repetitions of an exercise. Log your sets to track progress and earn TU.',
  },

  rep: {
    term: 'Rep (Repetition)',
    explanation:
      'A Rep is one complete movement of an exercise. Multiple reps make up a set.',
  },

  oneRM: {
    term: '1RM (One Rep Max)',
    explanation:
      'Your One Rep Max is the maximum weight you can lift for a single repetition. It\'s used to calculate training percentages.',
    learnMoreUrl: '/docs/one-rep-max',
  },

  volume: {
    term: 'Volume',
    explanation:
      'Training Volume is the total amount of work performed, calculated as sets x reps x weight. Higher volume generally means more muscle growth stimulus.',
  },

  // ============================================
  // SOCIAL & COMMUNITY
  // ============================================

  crew: {
    term: 'Crew',
    explanation:
      'A Crew is your training group. Join or create a Crew to share workouts, compete on leaderboards, and motivate each other.',
    learnMoreUrl: '/docs/crews',
  },

  highFive: {
    term: 'High Five',
    explanation:
      'High Fives are quick kudos you can send to celebrate others\' achievements. Spread the motivation!',
  },

  streak: {
    term: 'Streak',
    explanation:
      'Your Streak counts consecutive days with logged workouts. Maintain your streak for bonus XP and achievements.',
  },

  // ============================================
  // ECONOMY
  // ============================================

  transfer: {
    term: 'Credit Transfer',
    explanation:
      'Send credits to other users as tips, gifts, or payments. A small fee helps maintain the economy.',
  },

  dailyReward: {
    term: 'Daily Reward',
    explanation:
      'Log in daily to claim free credits. Longer streaks mean bigger rewards!',
  },

  // ============================================
  // FEATURES
  // ============================================

  competition: {
    term: 'Competition',
    explanation:
      'Competitions are time-limited challenges where you compete with others. Win credits, badges, and bragging rights.',
    learnMoreUrl: '/docs/competitions',
  },

  milestone: {
    term: 'Milestone',
    explanation:
      'Milestones mark significant achievements in your fitness journey. Each milestone unlocks rewards and recognition.',
  },

  achievement: {
    term: 'Achievement',
    explanation:
      'Achievements are special badges earned by completing specific challenges or reaching goals. Collect them all!',
    learnMoreUrl: '/docs/achievements',
  },

  skill: {
    term: 'Skill',
    explanation:
      'Skills represent specific exercise competencies. Level up skills by performing exercises with proper form and consistency.',
    learnMoreUrl: '/docs/skills',
  },

  // ============================================
  // TECHNICAL
  // ============================================

  graphQL: {
    term: 'GraphQL',
    explanation:
      'GraphQL is the technology powering our API. It allows efficient data fetching with exactly what you need.',
  },

  websocket: {
    term: 'WebSocket',
    explanation:
      'WebSockets enable real-time updates. See live activity, instant notifications, and sync across devices.',
  },
};

/**
 * Get help content for a term
 * @param {string} termKey - The key from HELP_CONTENT
 * @returns {object|null} - The help content or null if not found
 */
export function getHelpContent(termKey) {
  return HELP_CONTENT[termKey] || null;
}

/**
 * Get all help terms for a category
 * @param {string} prefix - Category prefix (e.g., 'workout', 'social')
 * @returns {object} - Filtered help content
 */
export function getHelpByCategory(prefix) {
  return Object.entries(HELP_CONTENT)
    .filter(([key]) => key.toLowerCase().startsWith(prefix.toLowerCase()))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
}

/**
 * Search help content by term or explanation
 * @param {string} query - Search query
 * @returns {object[]} - Matching help entries
 */
export function searchHelp(query) {
  const lowerQuery = query.toLowerCase();
  return Object.entries(HELP_CONTENT)
    .filter(
      ([key, value]) =>
        key.toLowerCase().includes(lowerQuery) ||
        value.term.toLowerCase().includes(lowerQuery) ||
        value.explanation.toLowerCase().includes(lowerQuery)
    )
    .map(([key, value]) => ({ key, ...value }));
}

export default HELP_CONTENT;
