/**
 * Wealth Tier System Constants
 *
 * Defines the wealth tier system for MuscleMap users based on credit balance.
 * Wealth tiers provide visual indicators and prestige for users who have
 * accumulated credits through platform activity or purchases.
 */

// ============================================
// WEALTH TIER TYPES
// ============================================

export interface WealthTierDefinition {
  /** Tier level (0-6) */
  tier: number;
  /** Display name for the tier */
  name: string;
  /** Minimum credits required for this tier */
  minCredits: number;
  /** Hex color code for tier display */
  color: string;
  /** Icon identifier for the tier */
  icon: string;
  /** Description of the tier */
  description: string;
}

export type WealthTierLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type WealthTierName =
  | 'Broke'
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Platinum'
  | 'Diamond'
  | 'Obsidian';

// ============================================
// WEALTH TIER DEFINITIONS
// ============================================

/**
 * Complete wealth tier definitions with all metadata.
 * Order is from lowest (Broke) to highest (Obsidian).
 */
export const WEALTH_TIERS: readonly WealthTierDefinition[] = [
  {
    tier: 0,
    name: 'Broke',
    minCredits: 0,
    color: '#666666',
    icon: 'none',
    description: 'Just getting started',
  },
  {
    tier: 1,
    name: 'Bronze',
    minCredits: 10,
    color: '#CD7F32',
    icon: 'bronze_ring',
    description: 'Building momentum',
  },
  {
    tier: 2,
    name: 'Silver',
    minCredits: 100,
    color: '#C0C0C0',
    icon: 'silver_ring',
    description: 'Consistent contributor',
  },
  {
    tier: 3,
    name: 'Gold',
    minCredits: 1000,
    color: '#FFD700',
    icon: 'gold_ring',
    description: 'Dedicated athlete',
  },
  {
    tier: 4,
    name: 'Platinum',
    minCredits: 10000,
    color: '#E5E4E2',
    icon: 'platinum_ring',
    description: 'Elite performer',
  },
  {
    tier: 5,
    name: 'Diamond',
    minCredits: 100000,
    color: '#B9F2FF',
    icon: 'diamond_ring',
    description: 'Exceptional dedication',
  },
  {
    tier: 6,
    name: 'Obsidian',
    minCredits: 1000000,
    color: '#0D0D0D',
    icon: 'obsidian_crown',
    description: 'Legendary status',
  },
] as const;

/**
 * Wealth tiers indexed by tier number for quick lookup.
 */
export const WEALTH_TIERS_BY_LEVEL: Record<WealthTierLevel, WealthTierDefinition> = {
  0: WEALTH_TIERS[0],
  1: WEALTH_TIERS[1],
  2: WEALTH_TIERS[2],
  3: WEALTH_TIERS[3],
  4: WEALTH_TIERS[4],
  5: WEALTH_TIERS[5],
  6: WEALTH_TIERS[6],
};

/**
 * Wealth tiers indexed by name for quick lookup.
 */
export const WEALTH_TIERS_BY_NAME: Record<WealthTierName, WealthTierDefinition> = {
  Broke: WEALTH_TIERS[0],
  Bronze: WEALTH_TIERS[1],
  Silver: WEALTH_TIERS[2],
  Gold: WEALTH_TIERS[3],
  Platinum: WEALTH_TIERS[4],
  Diamond: WEALTH_TIERS[5],
  Obsidian: WEALTH_TIERS[6],
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculate the wealth tier level based on credit balance.
 * Matches the PostgreSQL calculate_wealth_tier function.
 *
 * @param credits - The user's current credit balance
 * @returns The tier level (0-6)
 */
export function calculateWealthTier(credits: number): WealthTierLevel {
  if (credits >= 1000000) return 6; // Obsidian
  if (credits >= 100000) return 5; // Diamond
  if (credits >= 10000) return 4; // Platinum
  if (credits >= 1000) return 3; // Gold
  if (credits >= 100) return 2; // Silver
  if (credits >= 10) return 1; // Bronze
  return 0; // Broke
}

/**
 * Get the full wealth tier definition for a given credit balance.
 *
 * @param credits - The user's current credit balance
 * @returns The complete wealth tier definition
 */
export function getWealthTierForCredits(credits: number): WealthTierDefinition {
  const tierLevel = calculateWealthTier(credits);
  return WEALTH_TIERS_BY_LEVEL[tierLevel];
}

/**
 * Get the full wealth tier definition for a given tier level.
 *
 * @param tier - The tier level (0-6)
 * @returns The complete wealth tier definition
 */
export function getWealthTierByLevel(tier: WealthTierLevel): WealthTierDefinition {
  return WEALTH_TIERS_BY_LEVEL[tier];
}

/**
 * Calculate credits needed to reach the next tier.
 *
 * @param currentCredits - The user's current credit balance
 * @returns Credits needed for next tier, or null if at max tier
 */
export function creditsToNextTier(currentCredits: number): number | null {
  const currentTier = calculateWealthTier(currentCredits);
  if (currentTier >= 6) return null; // Already at max tier

  const nextTier = WEALTH_TIERS[currentTier + 1];
  return nextTier.minCredits - currentCredits;
}

/**
 * Calculate progress percentage within current tier.
 *
 * @param credits - The user's current credit balance
 * @returns Progress percentage (0-100) within current tier
 */
export function wealthTierProgress(credits: number): number {
  const currentTier = calculateWealthTier(credits);
  if (currentTier >= 6) return 100; // At max tier

  const currentTierDef = WEALTH_TIERS[currentTier];
  const nextTierDef = WEALTH_TIERS[currentTier + 1];

  const tierRange = nextTierDef.minCredits - currentTierDef.minCredits;
  const progress = credits - currentTierDef.minCredits;

  return Math.min(100, Math.max(0, Math.round((progress / tierRange) * 100)));
}
