/**
 * Ranks Module
 *
 * Handles the rank/level system for MuscleMap:
 * - 8 rank tiers: Novice → Trainee → Apprentice → Practitioner → Journeyperson → Expert → Master → Grandmaster
 * - Military-inspired insignia (chevrons, stars, shields)
 * - XP-based progression with configurable thresholds
 * - Veteran badges based on account tenure
 *
 * This module provides:
 * - Rank definitions and lookups
 * - User rank information
 * - Veteran tier calculations
 * - Leaderboard integration
 */

import { queryOne, queryAll, query } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.economy;

// Rank tier constants
export const RANK_TIERS = {
  NOVICE: 1,
  TRAINEE: 2,
  APPRENTICE: 3,
  PRACTITIONER: 4,
  JOURNEYPERSON: 5,
  EXPERT: 6,
  MASTER: 7,
  GRANDMASTER: 8,
} as const;

export type RankTier = (typeof RANK_TIERS)[keyof typeof RANK_TIERS];

export type RankName =
  | 'novice'
  | 'trainee'
  | 'apprentice'
  | 'practitioner'
  | 'journeyperson'
  | 'expert'
  | 'master'
  | 'grandmaster';

export interface RankDefinition {
  id: string;
  tier: RankTier;
  name: RankName;
  displayName: string;
  xpThreshold: number;
  badgeIcon: string;
  badgeColor: string;
  perks: string[];
}

export interface UserRankInfo {
  userId: string;
  currentRank: RankName;
  currentTier: RankTier;
  totalXp: number;
  xpToNextRank: number | null; // null if max rank
  progressPercent: number; // 0-100 progress to next rank
  nextRank: RankDefinition | null;
  currentRankDef: RankDefinition;
  rankUpdatedAt: Date | null;
  veteranTier: number;
  veteranLabel: string | null;
}

export interface VeteranBadge {
  tier: 0 | 1 | 2 | 3;
  label: string | null;
  icon: string;
  color: string;
  monthsActive: number;
}

// Default rank definitions (used if DB not seeded)
const DEFAULT_RANKS: RankDefinition[] = [
  { id: 'rank_novice', tier: 1, name: 'novice', displayName: 'Novice', xpThreshold: 0, badgeIcon: 'chevron-outline', badgeColor: '#6B7280', perks: ['Basic profile'] },
  { id: 'rank_trainee', tier: 2, name: 'trainee', displayName: 'Trainee', xpThreshold: 100, badgeIcon: 'chevron-1', badgeColor: '#22C55E', perks: ['Basic leaderboards'] },
  { id: 'rank_apprentice', tier: 3, name: 'apprentice', displayName: 'Apprentice', xpThreshold: 500, badgeIcon: 'chevron-2', badgeColor: '#3B82F6', perks: ['Custom bio'] },
  { id: 'rank_practitioner', tier: 4, name: 'practitioner', displayName: 'Practitioner', xpThreshold: 1500, badgeIcon: 'chevron-3', badgeColor: '#8B5CF6', perks: ['Extended history'] },
  { id: 'rank_journeyperson', tier: 5, name: 'journeyperson', displayName: 'Journeyperson', xpThreshold: 4000, badgeIcon: 'star-bronze', badgeColor: '#EAB308', perks: ['Create groups'] },
  { id: 'rank_expert', tier: 6, name: 'expert', displayName: 'Expert', xpThreshold: 10000, badgeIcon: 'star-silver', badgeColor: '#F97316', perks: ['Beta features'] },
  { id: 'rank_master', tier: 7, name: 'master', displayName: 'Master', xpThreshold: 25000, badgeIcon: 'star-gold', badgeColor: '#EF4444', perks: ['Mentor status'] },
  { id: 'rank_grandmaster', tier: 8, name: 'grandmaster', displayName: 'Grandmaster', xpThreshold: 60000, badgeIcon: 'shield-diamond', badgeColor: '#EC4899', perks: ['Elite status'] },
];

// Veteran tier thresholds (in months)
const VETERAN_TIERS = {
  0: { months: 0, label: null, icon: '', color: '' },
  1: { months: 6, label: '6 Months', icon: 'veteran-bronze', color: '#CD7F32' },
  2: { months: 12, label: '1 Year', icon: 'veteran-silver', color: '#C0C0C0' },
  3: { months: 24, label: '2+ Years', icon: 'veteran-gold', color: '#FFD700' },
};

// Cache for rank definitions
let rankDefinitionsCache: RankDefinition[] | null = null;
let rankDefinitionsCacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

export const rankService = {
  /**
   * Get all rank definitions
   */
  async getRankDefinitions(): Promise<RankDefinition[]> {
    // Check cache
    if (rankDefinitionsCache && Date.now() - rankDefinitionsCacheTime < CACHE_TTL) {
      return rankDefinitionsCache;
    }

    try {
      const rows = await queryAll<{
        id: string;
        tier: number;
        name: string;
        display_name: string;
        xp_threshold: number;
        badge_icon: string;
        badge_color: string;
        perks: string[];
      }>('SELECT * FROM rank_definitions ORDER BY tier ASC');

      if (rows.length === 0) {
        return DEFAULT_RANKS;
      }

      const ranks = rows.map((r) => ({
        id: r.id,
        tier: r.tier as RankTier,
        name: r.name as RankName,
        displayName: r.display_name,
        xpThreshold: r.xp_threshold,
        badgeIcon: r.badge_icon,
        badgeColor: r.badge_color,
        perks: r.perks || [],
      }));

      // Update cache
      rankDefinitionsCache = ranks;
      rankDefinitionsCacheTime = Date.now();

      return ranks;
    } catch (error) {
      log.warn({ error }, 'Failed to fetch rank definitions, using defaults');
      return DEFAULT_RANKS;
    }
  },

  /**
   * Get rank definition by name
   */
  async getRankByName(name: RankName): Promise<RankDefinition | null> {
    const ranks = await this.getRankDefinitions();
    return ranks.find((r) => r.name === name) || null;
  },

  /**
   * Get rank definition by tier
   */
  async getRankByTier(tier: RankTier): Promise<RankDefinition | null> {
    const ranks = await this.getRankDefinitions();
    return ranks.find((r) => r.tier === tier) || null;
  },

  /**
   * Get the rank for a given XP amount
   */
  async getRankForXp(totalXp: number): Promise<RankDefinition> {
    const ranks = await this.getRankDefinitions();

    // Find the highest rank where XP meets or exceeds threshold
    let currentRank = ranks[0];
    for (const rank of ranks) {
      if (totalXp >= rank.xpThreshold) {
        currentRank = rank;
      } else {
        break;
      }
    }

    return currentRank;
  },

  /**
   * Get next rank after a given rank
   */
  async getNextRank(currentRankName: RankName): Promise<RankDefinition | null> {
    const ranks = await this.getRankDefinitions();
    const currentIndex = ranks.findIndex((r) => r.name === currentRankName);

    if (currentIndex === -1 || currentIndex >= ranks.length - 1) {
      return null; // No next rank (already at max or not found)
    }

    return ranks[currentIndex + 1];
  },

  /**
   * Get complete rank info for a user
   */
  async getUserRankInfo(userId: string): Promise<UserRankInfo | null> {
    const user = await queryOne<{
      total_xp: number;
      current_rank: string;
      rank_updated_at: Date | null;
      veteran_tier: number;
      created_at: Date;
    }>(
      'SELECT total_xp, current_rank, rank_updated_at, veteran_tier, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      return null;
    }

    const ranks = await this.getRankDefinitions();
    const currentRankDef = ranks.find((r) => r.name === user.current_rank) || ranks[0];
    const currentIndex = ranks.findIndex((r) => r.name === user.current_rank);
    const nextRank = currentIndex < ranks.length - 1 ? ranks[currentIndex + 1] : null;

    // Calculate progress to next rank
    let xpToNextRank: number | null = null;
    let progressPercent = 100;

    if (nextRank) {
      xpToNextRank = nextRank.xpThreshold - user.total_xp;
      const xpInCurrentTier = user.total_xp - currentRankDef.xpThreshold;
      const xpForTier = nextRank.xpThreshold - currentRankDef.xpThreshold;
      progressPercent = Math.min(100, Math.max(0, (xpInCurrentTier / xpForTier) * 100));
    }

    // Calculate veteran tier if not already set
    const veteranTier = user.veteran_tier || this.calculateVeteranTier(user.created_at);
    const veteranLabel = VETERAN_TIERS[veteranTier as 0 | 1 | 2 | 3]?.label || null;

    return {
      userId,
      currentRank: user.current_rank as RankName,
      currentTier: currentRankDef.tier,
      totalXp: user.total_xp,
      xpToNextRank,
      progressPercent,
      nextRank,
      currentRankDef,
      rankUpdatedAt: user.rank_updated_at,
      veteranTier,
      veteranLabel,
    };
  },

  /**
   * Calculate veteran tier from account creation date
   */
  calculateVeteranTier(createdAt: Date): 0 | 1 | 2 | 3 {
    const now = new Date();
    const monthsActive = (now.getFullYear() - createdAt.getFullYear()) * 12 +
      (now.getMonth() - createdAt.getMonth());

    if (monthsActive >= 24) return 3;
    if (monthsActive >= 12) return 2;
    if (monthsActive >= 6) return 1;
    return 0;
  },

  /**
   * Get veteran badge info for a user
   */
  async getVeteranBadge(userId: string): Promise<VeteranBadge | null> {
    const user = await queryOne<{ veteran_tier: number; created_at: Date }>(
      'SELECT veteran_tier, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (!user) return null;

    const tier = user.veteran_tier || this.calculateVeteranTier(user.created_at);
    const tierInfo = VETERAN_TIERS[tier as 0 | 1 | 2 | 3];

    const now = new Date();
    const monthsActive = (now.getFullYear() - user.created_at.getFullYear()) * 12 +
      (now.getMonth() - user.created_at.getMonth());

    return {
      tier: tier as 0 | 1 | 2 | 3,
      label: tierInfo.label,
      icon: tierInfo.icon,
      color: tierInfo.color,
      monthsActive,
    };
  },

  /**
   * Update veteran tier for a user (called by nightly job)
   */
  async updateVeteranTier(userId: string): Promise<number> {
    const user = await queryOne<{ created_at: Date; veteran_tier: number }>(
      'SELECT created_at, veteran_tier FROM users WHERE id = $1',
      [userId]
    );

    if (!user) return 0;

    const newTier = this.calculateVeteranTier(user.created_at);

    if (newTier !== user.veteran_tier) {
      await query(
        'UPDATE users SET veteran_tier = $1 WHERE id = $2',
        [newTier, userId]
      );
      log.info({ userId, previousTier: user.veteran_tier, newTier }, 'Veteran tier updated');
    }

    return newTier;
  },

  /**
   * Update veteran tiers for all users (batch operation)
   */
  async updateAllVeteranTiers(): Promise<{ updated: number }> {
    const result = await query(`
      UPDATE users
      SET veteran_tier = CASE
        WHEN created_at <= NOW() - INTERVAL '24 months' THEN 3
        WHEN created_at <= NOW() - INTERVAL '12 months' THEN 2
        WHEN created_at <= NOW() - INTERVAL '6 months' THEN 1
        ELSE 0
      END
      WHERE veteran_tier IS DISTINCT FROM CASE
        WHEN created_at <= NOW() - INTERVAL '24 months' THEN 3
        WHEN created_at <= NOW() - INTERVAL '12 months' THEN 2
        WHEN created_at <= NOW() - INTERVAL '6 months' THEN 1
        ELSE 0
      END
    `);

    const updated = result.rowCount || 0;
    log.info({ updated }, 'Batch veteran tier update complete');
    return { updated };
  },

  /**
   * Refresh the XP rankings materialized view
   */
  async refreshRankings(): Promise<void> {
    try {
      await query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_xp_rankings');
      log.info('XP rankings materialized view refreshed');
    } catch (error: any) {
      // If concurrent refresh fails, try non-concurrent
      if (error.message?.includes('CONCURRENTLY')) {
        await query('REFRESH MATERIALIZED VIEW mv_xp_rankings');
        log.info('XP rankings materialized view refreshed (non-concurrent)');
      } else {
        throw error;
      }
    }
  },

  /**
   * Get XP leaderboard from materialized view
   */
  async getXpLeaderboard(options: {
    limit?: number;
    offset?: number;
    country?: string;
    state?: string;
    city?: string;
  } = {}): Promise<{
    entries: Array<{
      rank: number;
      userId: string;
      username: string;
      displayName?: string;
      avatarUrl?: string;
      totalXp: number;
      currentRank: RankName;
      veteranTier: number;
      country?: string;
    }>;
    total: number;
  }> {
    const { limit = 50, offset = 0, country, state, city } = options;

    let whereClause = '1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (country) {
      whereClause += ` AND country = $${paramIndex++}`;
      params.push(country);
    }
    if (state) {
      whereClause += ` AND state = $${paramIndex++}`;
      params.push(state);
    }
    if (city) {
      whereClause += ` AND city = $${paramIndex++}`;
      params.push(city);
    }

    params.push(limit, offset);

    const rows = await queryAll<{
      user_id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      total_xp: number;
      current_rank: string;
      veteran_tier: number;
      country: string | null;
      global_xp_rank: number;
    }>(
      `SELECT user_id, username, display_name, avatar_url, total_xp, current_rank, veteran_tier, country, global_xp_rank
       FROM mv_xp_rankings
       WHERE ${whereClause}
       ORDER BY global_xp_rank ASC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM mv_xp_rankings WHERE ${whereClause}`,
      params.slice(0, -2)
    );

    return {
      entries: rows.map((r) => ({
        rank: r.global_xp_rank,
        userId: r.user_id,
        username: r.username,
        displayName: r.display_name || undefined,
        avatarUrl: r.avatar_url || undefined,
        totalXp: r.total_xp,
        currentRank: r.current_rank as RankName,
        veteranTier: r.veteran_tier,
        country: r.country || undefined,
      })),
      total: parseInt(countResult?.count || '0'),
    };
  },
};

export { xpService } from './xp.service';
export default rankService;
