/**
 * Loot Definitions
 *
 * Defines all possible loot items, rarity tiers, and generation utilities
 * for the MuscleMap loot drop reward system.
 *
 * @module lootDefinitions
 */

// ============================================
// RARITY SYSTEM
// ============================================

/**
 * Rarity color configurations for visual styling
 * Each rarity has primary, glow, border, and background colors
 */
export const RARITY_COLORS = {
  common: {
    primary: '#9ca3af',
    glow: 'rgba(156, 163, 175, 0.5)',
    border: 'rgba(156, 163, 175, 0.3)',
    background: 'rgba(156, 163, 175, 0.1)',
    gradient: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
  },
  rare: {
    primary: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.5)',
    border: 'rgba(59, 130, 246, 0.4)',
    background: 'rgba(59, 130, 246, 0.15)',
    gradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
  },
  epic: {
    primary: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.5)',
    border: 'rgba(168, 85, 247, 0.4)',
    background: 'rgba(168, 85, 247, 0.15)',
    gradient: 'linear-gradient(135deg, #c084fc 0%, #a855f7 100%)',
  },
  legendary: {
    primary: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.6)',
    border: 'rgba(245, 158, 11, 0.5)',
    background: 'rgba(245, 158, 11, 0.2)',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
  },
};

/**
 * Rarity weights for random loot generation
 * Higher number = more likely to appear
 */
export const RARITY_WEIGHTS = {
  common: 60,
  rare: 25,
  epic: 12,
  legendary: 3,
};

/**
 * Rarity order for sorting (higher = better)
 */
export const RARITY_ORDER = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

// ============================================
// LOOT TYPE DEFINITIONS
// ============================================

/**
 * All possible loot types with their properties
 */
export const LOOT_TYPES = {
  XP_BONUS: {
    id: 'xp_bonus',
    name: 'XP Boost',
    description: '+{amount} bonus XP',
    icon: '⭐',
    rarity: 'common',
    amounts: [25, 50, 100, 250],
    category: 'progression',
  },
  CREDITS: {
    id: 'credits',
    name: 'Credits',
    description: '{amount} credits',
    icon: '💎',
    rarity: 'common',
    amounts: [5, 10, 25, 50],
    category: 'economy',
  },
  STREAK_SHIELD: {
    id: 'streak_shield',
    name: 'Streak Shield',
    description: 'Protects your streak for 1 day',
    icon: '🛡️',
    rarity: 'rare',
    category: 'protection',
  },
  DOUBLE_XP: {
    id: 'double_xp',
    name: 'Double XP (24h)',
    description: 'Earn 2x XP for 24 hours',
    icon: '🔥',
    rarity: 'epic',
    category: 'boost',
    duration: 86400, // 24 hours in seconds
  },
  RARE_TITLE: {
    id: 'rare_title',
    name: 'Rare Title',
    description: 'Unlock "{title}" title',
    icon: '👑',
    rarity: 'legendary',
    titles: ['Iron Legend', 'Muscle Master', 'The Unstoppable', 'Power Surge', 'Beast Mode'],
    category: 'cosmetic',
  },
  AVATAR_FRAME: {
    id: 'avatar_frame',
    name: 'Avatar Frame',
    description: 'New profile frame',
    icon: '🖼️',
    rarity: 'rare',
    frames: ['gold_ring', 'fire_aura', 'electric_pulse', 'diamond_edge'],
    category: 'cosmetic',
  },
  MYSTERY_BOX: {
    id: 'mystery_box',
    name: 'Mystery Box',
    description: 'Contains a random reward',
    icon: '📦',
    rarity: 'rare',
    category: 'special',
  },
  MUSCLE_GLOW: {
    id: 'muscle_glow',
    name: 'Muscle Glow Effect',
    description: 'Special glow for {muscle} visualization',
    icon: '✨',
    rarity: 'epic',
    muscles: ['chest', 'back', 'shoulders', 'arms', 'legs', 'core'],
    category: 'cosmetic',
  },
  WORKOUT_BOOST: {
    id: 'workout_boost',
    name: 'Workout Boost',
    description: '+{amount}% credit earnings for next workout',
    icon: '💪',
    rarity: 'common',
    amounts: [10, 25, 50],
    category: 'boost',
  },
  LEADERBOARD_BADGE: {
    id: 'leaderboard_badge',
    name: 'Leaderboard Badge',
    description: 'Display a special badge on leaderboards',
    icon: '🏅',
    rarity: 'epic',
    badges: ['fire_starter', 'iron_will', 'elite_athlete'],
    category: 'cosmetic',
  },
  PREMIUM_EXERCISE: {
    id: 'premium_exercise',
    name: 'Premium Exercise Unlock',
    description: 'Unlock a premium exercise variation',
    icon: '🎯',
    rarity: 'legendary',
    category: 'content',
  },
  REST_TIMER_SKIN: {
    id: 'rest_timer_skin',
    name: 'Rest Timer Skin',
    description: 'New visual style for rest timer',
    icon: '⏱️',
    rarity: 'rare',
    skins: ['neon_pulse', 'liquid_metal', 'aurora', 'ember'],
    category: 'cosmetic',
  },
};

/**
 * Loot pools grouped by quality (used for generation)
 */
export const LOOT_POOLS = {
  common: ['XP_BONUS', 'CREDITS', 'WORKOUT_BOOST'],
  rare: ['STREAK_SHIELD', 'AVATAR_FRAME', 'MYSTERY_BOX', 'REST_TIMER_SKIN'],
  epic: ['DOUBLE_XP', 'MUSCLE_GLOW', 'LEADERBOARD_BADGE'],
  legendary: ['RARE_TITLE', 'PREMIUM_EXERCISE'],
};

// ============================================
// CHEST TYPE DEFINITIONS
// ============================================

/**
 * Chest types with different loot possibilities
 */
export const CHEST_TYPES = {
  BRONZE: {
    id: 'bronze',
    name: 'Bronze Chest',
    description: 'Basic workout reward',
    minItems: 1,
    maxItems: 2,
    guaranteedRarity: 'common',
    color: '#cd7f32',
    glowColor: 'rgba(205, 127, 50, 0.5)',
  },
  SILVER: {
    id: 'silver',
    name: 'Silver Chest',
    description: 'Quality workout reward',
    minItems: 2,
    maxItems: 3,
    guaranteedRarity: 'rare',
    color: '#c0c0c0',
    glowColor: 'rgba(192, 192, 192, 0.5)',
  },
  GOLD: {
    id: 'gold',
    name: 'Gold Chest',
    description: 'Excellent workout reward',
    minItems: 2,
    maxItems: 4,
    guaranteedRarity: 'epic',
    color: '#ffd700',
    glowColor: 'rgba(255, 215, 0, 0.6)',
  },
  DIAMOND: {
    id: 'diamond',
    name: 'Diamond Chest',
    description: 'Ultimate workout reward',
    minItems: 3,
    maxItems: 5,
    guaranteedRarity: 'legendary',
    color: '#b9f2ff',
    glowColor: 'rgba(185, 242, 255, 0.7)',
  },
};

// ============================================
// SOUND EFFECTS CONFIGURATION
// ============================================

/**
 * Sound configuration for loot animations
 */
export const LOOT_SOUNDS = {
  chestAppear: {
    frequency: 220,
    duration: 0.3,
    type: 'triangle',
  },
  chestShake: {
    frequency: 150,
    duration: 0.1,
    type: 'sine',
  },
  chestOpen: {
    frequency: 440,
    duration: 0.5,
    type: 'sine',
    ramp: true,
  },
  itemReveal: {
    common: { frequency: 523, duration: 0.2 },    // C5
    rare: { frequency: 659, duration: 0.3 },      // E5
    epic: { frequency: 784, duration: 0.4 },      // G5
    legendary: { frequency: 1047, duration: 0.5 }, // C6
  },
  claimAll: {
    frequency: 880,
    duration: 0.4,
    type: 'sine',
    chord: [880, 1108, 1320], // A major chord
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get a random loot item based on rarity weights
 * @param {Object} options - Generation options
 * @param {number} options.workoutQuality - Quality score of workout (1-100)
 * @param {number} options.currentStreak - Current workout streak
 * @param {string} options.minRarity - Minimum rarity to guarantee
 * @returns {Object} Generated loot item
 */
export function generateLootItem(options = {}) {
  const { workoutQuality = 50, currentStreak = 0, minRarity = null } = options;

  // Adjust weights based on workout quality and streak
  const adjustedWeights = { ...RARITY_WEIGHTS };

  // Better workouts increase rare+ chances
  if (workoutQuality >= 80) {
    adjustedWeights.rare += 10;
    adjustedWeights.epic += 5;
    adjustedWeights.legendary += 2;
  } else if (workoutQuality >= 60) {
    adjustedWeights.rare += 5;
    adjustedWeights.epic += 2;
  }

  // Streaks increase epic+ chances
  if (currentStreak >= 30) {
    adjustedWeights.epic += 8;
    adjustedWeights.legendary += 4;
  } else if (currentStreak >= 14) {
    adjustedWeights.epic += 4;
    adjustedWeights.legendary += 2;
  } else if (currentStreak >= 7) {
    adjustedWeights.rare += 5;
    adjustedWeights.epic += 2;
  }

  // Select rarity
  let selectedRarity = selectWeightedRarity(adjustedWeights);

  // Enforce minimum rarity if specified
  if (minRarity && RARITY_ORDER[selectedRarity] < RARITY_ORDER[minRarity]) {
    selectedRarity = minRarity;
  }

  // Select item from pool
  const pool = LOOT_POOLS[selectedRarity];
  const lootTypeKey = pool[Math.floor(Math.random() * pool.length)];
  const lootType = LOOT_TYPES[lootTypeKey];

  // Generate the actual item
  return createLootInstance(lootType);
}

/**
 * Select a rarity based on weighted random selection
 * @param {Object} weights - Rarity weights
 * @returns {string} Selected rarity
 */
function selectWeightedRarity(weights) {
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (const [rarity, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) {
      return rarity;
    }
  }

  return 'common'; // Fallback
}

/**
 * Create an instance of a loot item with specific values
 * @param {Object} lootType - Loot type definition
 * @returns {Object} Loot item instance
 */
export function createLootInstance(lootType) {
  const item = {
    id: `${lootType.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    typeId: lootType.id,
    name: lootType.name,
    icon: lootType.icon,
    rarity: lootType.rarity,
    category: lootType.category,
    description: lootType.description,
    timestamp: Date.now(),
  };

  // Handle variable amounts
  if (lootType.amounts) {
    const amount = lootType.amounts[Math.floor(Math.random() * lootType.amounts.length)];
    item.amount = amount;
    item.description = lootType.description.replace('{amount}', amount);
  }

  // Handle titles
  if (lootType.titles) {
    const title = lootType.titles[Math.floor(Math.random() * lootType.titles.length)];
    item.title = title;
    item.description = lootType.description.replace('{title}', title);
  }

  // Handle frames
  if (lootType.frames) {
    const frame = lootType.frames[Math.floor(Math.random() * lootType.frames.length)];
    item.frame = frame;
  }

  // Handle muscles
  if (lootType.muscles) {
    const muscle = lootType.muscles[Math.floor(Math.random() * lootType.muscles.length)];
    item.muscle = muscle;
    item.description = lootType.description.replace('{muscle}', muscle);
  }

  // Handle badges
  if (lootType.badges) {
    const badge = lootType.badges[Math.floor(Math.random() * lootType.badges.length)];
    item.badge = badge;
  }

  // Handle skins
  if (lootType.skins) {
    const skin = lootType.skins[Math.floor(Math.random() * lootType.skins.length)];
    item.skin = skin;
  }

  // Handle duration
  if (lootType.duration) {
    item.duration = lootType.duration;
  }

  return item;
}

/**
 * Generate a complete loot drop for a workout
 * @param {Object} options - Generation options
 * @param {number} options.workoutQuality - Quality score (1-100)
 * @param {number} options.currentStreak - Current streak count
 * @param {string} options.chestType - Type of chest (bronze, silver, gold, diamond)
 * @returns {Object} Complete loot drop with chest and items
 */
export function generateLootDrop(options = {}) {
  const { workoutQuality = 50, currentStreak = 0, chestType = 'BRONZE' } = options;

  const chest = CHEST_TYPES[chestType] || CHEST_TYPES.BRONZE;
  const itemCount =
    Math.floor(Math.random() * (chest.maxItems - chest.minItems + 1)) + chest.minItems;

  const items = [];

  // First item is guaranteed minimum rarity
  items.push(
    generateLootItem({
      workoutQuality,
      currentStreak,
      minRarity: chest.guaranteedRarity,
    })
  );

  // Remaining items are random
  for (let i = 1; i < itemCount; i++) {
    items.push(
      generateLootItem({
        workoutQuality,
        currentStreak,
      })
    );
  }

  // Sort by rarity (best first)
  items.sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity]);

  // Determine overall drop rarity (highest item rarity)
  const overallRarity = items[0]?.rarity || 'common';

  return {
    id: `drop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    chest,
    items,
    rarity: overallRarity,
    timestamp: Date.now(),
    workoutQuality,
    currentStreak,
  };
}

/**
 * Determine chest type based on workout metrics
 * @param {Object} metrics - Workout metrics
 * @param {number} metrics.totalSets - Total sets completed
 * @param {number} metrics.totalVolume - Total volume lifted
 * @param {number} metrics.duration - Workout duration in minutes
 * @param {number} metrics.streak - Current streak
 * @returns {string} Chest type key
 */
export function determineChestType(metrics = {}) {
  const { totalSets = 0, totalVolume = 0, duration = 0, streak = 0 } = metrics;

  // Calculate workout score
  let score = 0;

  // Sets contribute to score
  score += Math.min(totalSets * 2, 40);

  // Volume contributes (normalized)
  score += Math.min(totalVolume / 500, 20);

  // Duration contributes
  score += Math.min(duration / 2, 20);

  // Streak bonus
  if (streak >= 30) score += 15;
  else if (streak >= 14) score += 10;
  else if (streak >= 7) score += 5;

  // Random bonus (up to 10)
  score += Math.random() * 10;

  // Determine chest based on score
  if (score >= 80) return 'DIAMOND';
  if (score >= 60) return 'GOLD';
  if (score >= 40) return 'SILVER';
  return 'BRONZE';
}

export default {
  RARITY_COLORS,
  RARITY_WEIGHTS,
  RARITY_ORDER,
  LOOT_TYPES,
  LOOT_POOLS,
  CHEST_TYPES,
  LOOT_SOUNDS,
  generateLootItem,
  createLootInstance,
  generateLootDrop,
  determineChestType,
};
