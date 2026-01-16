/**
 * Gamification Module
 *
 * Unified entry point for MuscleMap's gamification system including
 * daily challenges, loot drops, and reward systems.
 *
 * This module combines components from:
 * - @/components/challenges - Daily challenge system
 * - @/components/loot - Loot drop reward system
 * - @/components/celebrations - Achievement celebrations
 *
 * @example
 * import {
 *   // Daily Challenges
 *   DailyChallenges,
 *   ChallengeCard,
 *   useDailyChallenges,
 *   CHALLENGE_TYPES,
 *   DIFFICULTY,
 *
 *   // Loot Drops
 *   LootDrop,
 *   LootReward,
 *   useLootDrop,
 *   LOOT_TABLES,
 *   RARITY_COLORS,
 *
 *   // Celebrations
 *   LevelUpCelebration,
 *   AchievementBurst,
 * } from '@/components/gamification';
 */

// ============================================
// DAILY CHALLENGES
// ============================================

// Components
export { DailyChallenges } from './DailyChallenges';
export { ChallengeCard } from './ChallengeCard';

// Re-export additional challenge components from source
export {
  ChallengeTimer,
  ChallengeTimerCompact,
} from '../challenges/ChallengeTimer';
export { ChallengeProgress } from '../challenges/ChallengeProgress';
export { ChallengeReward, RewardBadge } from '../challenges/ChallengeReward';

// Hooks
export { useDailyChallenges } from './useDailyChallenges';
export { useChallenges } from '../challenges/useChallenges';

// Definitions
export {
  CHALLENGE_TYPES,
  CHALLENGE_TYPE_IDS,
  DIFFICULTY,
  DEFAULT_PROGRESS,
  formatChallengeDescription,
  getChallengeRewards,
  getChallengeTarget,
  selectDailyChallenges,
  getDailySeed,
  getTimeUntilMidnight,
  isToday,
} from './challengeDefinitions';

// ============================================
// LOOT DROPS
// ============================================

// Components
export { LootDrop } from './LootDrop';
export { LootReward } from './LootReward';
export { LootChest, CHEST_STATES } from '../loot/LootChest';
export { LootReveal } from '../loot/LootReveal';

// Hooks
export { useLootDrop, LOOT_DROP_STATES } from '../loot/useLootDrop';

// Loot Definitions
export {
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
} from '../loot/lootDefinitions';

// Loot Tables
export {
  LOOT_TABLES,
  generateItemFromTable,
  generateFromTable,
  getTableForContext,
  adjustTableForPlayer,
} from './lootTables';

// ============================================
// CELEBRATIONS
// ============================================

export { LevelUpCelebration } from '../celebrations/LevelUpCelebration';
export { AchievementBurst } from '../celebrations/AchievementBurst';
export { SuccessBurst, useConfetti } from '../celebrations/SuccessBurst';
export { Confetti } from '../celebrations/Confetti';
export { StreakFire } from '../celebrations/StreakFire';
export { StreakFlame } from '../celebrations/StreakFlame';
export { LevelUpEffect } from '../celebrations/LevelUpEffect';
export { useCelebration } from '../celebrations/useCelebration';

// ============================================
// NEW GAMIFICATION COMPONENTS (TypeScript)
// ============================================

export { XPProgress } from './XPProgress';
export { DailyQuests } from './DailyQuests';
export { LevelUpModal } from './LevelUpModal';
export { ChallengeCard as ChallengeCardNew } from './ChallengeCard.tsx';

// ============================================
// DEFAULT EXPORT
// ============================================

export { DailyChallenges as default } from './DailyChallenges';
