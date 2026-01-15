/**
 * Daily Challenge Definitions
 *
 * Defines all challenge types with their configurations, targets, and rewards.
 * Challenges are selected randomly each day with varying difficulty levels.
 */

/**
 * Challenge difficulty levels
 */
export const DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

/**
 * Challenge type definitions
 */
export const CHALLENGE_TYPES = {
  LOG_SETS: {
    id: 'log_sets',
    title: 'Rep Master',
    description: 'Log {target} sets today',
    icon: '\uD83D\uDCAA',
    category: 'workout',
    targets: {
      [DIFFICULTY.EASY]: 3,
      [DIFFICULTY.MEDIUM]: 5,
      [DIFFICULTY.HARD]: 10,
    },
    rewards: {
      xp: { [DIFFICULTY.EASY]: 50, [DIFFICULTY.MEDIUM]: 100, [DIFFICULTY.HARD]: 200 },
      credits: { [DIFFICULTY.EASY]: 5, [DIFFICULTY.MEDIUM]: 10, [DIFFICULTY.HARD]: 25 },
    },
    trackingKey: 'setsLogged',
  },
  WORKOUT_STREAK: {
    id: 'workout_streak',
    title: 'Streak Builder',
    description: 'Complete {target} workout{plural} today',
    icon: '\uD83D\uDD25',
    category: 'consistency',
    targets: {
      [DIFFICULTY.EASY]: 1,
      [DIFFICULTY.MEDIUM]: 2,
      [DIFFICULTY.HARD]: 3,
    },
    rewards: {
      xp: { [DIFFICULTY.EASY]: 75, [DIFFICULTY.MEDIUM]: 150, [DIFFICULTY.HARD]: 300 },
      credits: { [DIFFICULTY.EASY]: 10, [DIFFICULTY.MEDIUM]: 20, [DIFFICULTY.HARD]: 50 },
    },
    trackingKey: 'workoutsCompleted',
  },
  HIT_MUSCLE_GROUPS: {
    id: 'hit_muscle_groups',
    title: 'Full Body Focus',
    description: 'Train {target} different muscle group{plural}',
    icon: '\uD83C\uDFAF',
    category: 'variety',
    targets: {
      [DIFFICULTY.EASY]: 2,
      [DIFFICULTY.MEDIUM]: 3,
      [DIFFICULTY.HARD]: 5,
    },
    rewards: {
      xp: { [DIFFICULTY.EASY]: 60, [DIFFICULTY.MEDIUM]: 120, [DIFFICULTY.HARD]: 250 },
      credits: { [DIFFICULTY.EASY]: 8, [DIFFICULTY.MEDIUM]: 15, [DIFFICULTY.HARD]: 35 },
    },
    trackingKey: 'muscleGroupsHit',
  },
  HIGH_FIVE_FRIENDS: {
    id: 'high_five_friends',
    title: 'Social Butterfly',
    description: 'Send {target} high five{plural} to friends',
    icon: '\uD83D\uDD90\uFE0F',
    category: 'social',
    targets: {
      [DIFFICULTY.EASY]: 1,
      [DIFFICULTY.MEDIUM]: 3,
      [DIFFICULTY.HARD]: 5,
    },
    rewards: {
      xp: { [DIFFICULTY.EASY]: 30, [DIFFICULTY.MEDIUM]: 60, [DIFFICULTY.HARD]: 100 },
      credits: { [DIFFICULTY.EASY]: 3, [DIFFICULTY.MEDIUM]: 8, [DIFFICULTY.HARD]: 15 },
    },
    trackingKey: 'highFivesSent',
  },
  BEAT_PR: {
    id: 'beat_pr',
    title: 'PR Crusher',
    description: 'Set {target} new personal record{plural}',
    icon: '\uD83C\uDFC6',
    category: 'achievement',
    targets: {
      [DIFFICULTY.EASY]: 1,
      [DIFFICULTY.MEDIUM]: 2,
      [DIFFICULTY.HARD]: 3,
    },
    rewards: {
      xp: { [DIFFICULTY.EASY]: 100, [DIFFICULTY.MEDIUM]: 200, [DIFFICULTY.HARD]: 400 },
      credits: { [DIFFICULTY.EASY]: 15, [DIFFICULTY.MEDIUM]: 30, [DIFFICULTY.HARD]: 75 },
    },
    trackingKey: 'prsSet',
  },
  COMPLETE_WORKOUT: {
    id: 'complete_workout',
    title: 'Session Complete',
    description: 'Finish {target} complete workout session{plural}',
    icon: '\u2705',
    category: 'workout',
    targets: {
      [DIFFICULTY.EASY]: 1,
      [DIFFICULTY.MEDIUM]: 2,
      [DIFFICULTY.HARD]: 3,
    },
    rewards: {
      xp: { [DIFFICULTY.EASY]: 80, [DIFFICULTY.MEDIUM]: 160, [DIFFICULTY.HARD]: 320 },
      credits: { [DIFFICULTY.EASY]: 12, [DIFFICULTY.MEDIUM]: 25, [DIFFICULTY.HARD]: 60 },
    },
    trackingKey: 'workoutsCompleted',
  },
  EXPLORE_EXERCISE: {
    id: 'explore_exercise',
    title: 'Exercise Explorer',
    description: 'Try {target} new exercise{plural} you haven\'t done before',
    icon: '\uD83D\uDCA1',
    category: 'variety',
    targets: {
      [DIFFICULTY.EASY]: 1,
      [DIFFICULTY.MEDIUM]: 2,
      [DIFFICULTY.HARD]: 4,
    },
    rewards: {
      xp: { [DIFFICULTY.EASY]: 40, [DIFFICULTY.MEDIUM]: 80, [DIFFICULTY.HARD]: 180 },
      credits: { [DIFFICULTY.EASY]: 5, [DIFFICULTY.MEDIUM]: 12, [DIFFICULTY.HARD]: 30 },
    },
    trackingKey: 'newExercisesTried',
  },
  EARN_XP: {
    id: 'earn_xp',
    title: 'XP Hunter',
    description: 'Earn {target} XP today',
    icon: '\u2B50',
    category: 'achievement',
    targets: {
      [DIFFICULTY.EASY]: 100,
      [DIFFICULTY.MEDIUM]: 250,
      [DIFFICULTY.HARD]: 500,
    },
    rewards: {
      xp: { [DIFFICULTY.EASY]: 25, [DIFFICULTY.MEDIUM]: 50, [DIFFICULTY.HARD]: 100 },
      credits: { [DIFFICULTY.EASY]: 5, [DIFFICULTY.MEDIUM]: 10, [DIFFICULTY.HARD]: 20 },
    },
    trackingKey: 'xpEarned',
  },
  TOTAL_VOLUME: {
    id: 'total_volume',
    title: 'Volume King',
    description: 'Lift {target} total lbs/kg today',
    icon: '\uD83D\uDCAA',
    category: 'workout',
    targets: {
      [DIFFICULTY.EASY]: 1000,
      [DIFFICULTY.MEDIUM]: 5000,
      [DIFFICULTY.HARD]: 10000,
    },
    rewards: {
      xp: { [DIFFICULTY.EASY]: 60, [DIFFICULTY.MEDIUM]: 150, [DIFFICULTY.HARD]: 300 },
      credits: { [DIFFICULTY.EASY]: 8, [DIFFICULTY.MEDIUM]: 20, [DIFFICULTY.HARD]: 45 },
    },
    trackingKey: 'totalVolume',
  },
};

/**
 * Get all challenge type IDs
 */
export const CHALLENGE_TYPE_IDS = Object.keys(CHALLENGE_TYPES);

/**
 * Format challenge description with target value
 * @param {Object} challenge - Challenge type definition
 * @param {string} difficulty - Difficulty level
 * @returns {string} Formatted description
 */
export function formatChallengeDescription(challenge, difficulty) {
  const target = challenge.targets[difficulty];
  const plural = target !== 1 ? 's' : '';
  return challenge.description
    .replace('{target}', target.toLocaleString())
    .replace('{plural}', plural);
}

/**
 * Get rewards for a challenge at a specific difficulty
 * @param {Object} challenge - Challenge type definition
 * @param {string} difficulty - Difficulty level
 * @returns {Object} { xp, credits }
 */
export function getChallengeRewards(challenge, difficulty) {
  return {
    xp: challenge.rewards.xp[difficulty],
    credits: challenge.rewards.credits[difficulty],
  };
}

/**
 * Get target value for a challenge at a specific difficulty
 * @param {Object} challenge - Challenge type definition
 * @param {string} difficulty - Difficulty level
 * @returns {number} Target value
 */
export function getChallengeTarget(challenge, difficulty) {
  return challenge.targets[difficulty];
}

/**
 * Generate a deterministic daily seed based on date and user ID
 * @param {string} userId - User ID for personalization
 * @param {Date} date - Date to generate challenges for
 * @returns {number} Seed value
 */
export function getDailySeed(userId = 'anonymous', date = new Date()) {
  const dateStr = date.toISOString().split('T')[0];
  const combined = `${dateStr}-${userId}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Seeded random number generator
 * @param {number} seed - Initial seed
 * @returns {Function} Random function
 */
function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * Select daily challenges for a user
 * Ensures one easy, one medium, and one hard challenge
 * @param {string} userId - User ID for personalization
 * @param {Date} date - Date to generate challenges for
 * @returns {Array} Array of 3 challenge objects
 */
export function selectDailyChallenges(userId = 'anonymous', date = new Date()) {
  const seed = getDailySeed(userId, date);
  const random = seededRandom(seed);
  const typeIds = [...CHALLENGE_TYPE_IDS];
  const difficulties = [DIFFICULTY.EASY, DIFFICULTY.MEDIUM, DIFFICULTY.HARD];

  // Shuffle available challenge types
  for (let i = typeIds.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [typeIds[i], typeIds[j]] = [typeIds[j], typeIds[i]];
  }

  // Select 3 unique challenges, one for each difficulty
  const challenges = difficulties.map((difficulty, index) => {
    const typeId = typeIds[index];
    const challengeType = CHALLENGE_TYPES[typeId];
    return {
      id: `${challengeType.id}-${difficulty}-${date.toISOString().split('T')[0]}`,
      typeId: challengeType.id,
      type: challengeType,
      difficulty,
      target: getChallengeTarget(challengeType, difficulty),
      rewards: getChallengeRewards(challengeType, difficulty),
      description: formatChallengeDescription(challengeType, difficulty),
    };
  });

  // Shuffle the final order so difficulty isn't always in the same position
  for (let i = challenges.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [challenges[i], challenges[j]] = [challenges[j], challenges[i]];
  }

  return challenges;
}

/**
 * Default empty progress state
 */
export const DEFAULT_PROGRESS = {
  setsLogged: 0,
  workoutsCompleted: 0,
  muscleGroupsHit: 0,
  highFivesSent: 0,
  prsSet: 0,
  newExercisesTried: 0,
  xpEarned: 0,
  totalVolume: 0,
};

/**
 * Get time until midnight in the user's timezone
 * @returns {Object} { hours, minutes, seconds, totalMs }
 */
export function getTimeUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const totalMs = midnight - now;
  const hours = Math.floor(totalMs / (1000 * 60 * 60));
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((totalMs % (1000 * 60)) / 1000);
  return { hours, minutes, seconds, totalMs };
}

/**
 * Check if a date is today
 * @param {string|Date} dateStr - Date string or Date object
 * @returns {boolean}
 */
export function isToday(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export default CHALLENGE_TYPES;
