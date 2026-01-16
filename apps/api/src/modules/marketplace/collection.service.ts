import { queryOne, queryAll, query, transaction } from '../../db/client';
import { PoolClient } from 'pg';

// =====================================================
// TYPES
// =====================================================

export interface CollectionStats {
  totalOwned: number;
  totalValue: number;
  rarityBreakdown: { rarity: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
  recentAcquisitions: Record<string, unknown>[];
}

export interface SetReward {
  threshold: number;
  reward: {
    type: 'credits' | 'cosmetic' | 'title' | 'badge' | 'xp';
    value: string | number;
  };
}

interface CollectionSet {
  id: string;
  name: string;
  description: string | null;
  theme: string | null;
  items: string[];
  rewards: SetReward[];
  is_limited: boolean;
  expiration_date: Date | null;
  created_at: Date;
}

interface UserCollectionProgress {
  user_id: string;
  set_id: string;
  owned_items: string[];
  completion_percent: number;
  rewards_claimed: number[];
  updated_at: Date;
}

// =====================================================
// COLLECTION SERVICE
// =====================================================

export const collectionService = {
  // =====================================================
  // COLLECTION STATS
  // =====================================================

  async getUserCollectionStats(userId: string): Promise<CollectionStats> {
    // Get total owned count
    const totalOwned = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM user_spirit_cosmetics WHERE user_id = $1`,
      [userId]
    );

    // Get total estimated value
    const valueResult = await queryOne<{ total: string | null }>(
      `SELECT SUM(c.base_price) as total
       FROM user_spirit_cosmetics u
       JOIN spirit_animal_cosmetics c ON u.cosmetic_id = c.id
       WHERE u.user_id = $1`,
      [userId]
    );

    // Get rarity breakdown
    const rarityBreakdown = await queryAll<{ rarity: string; count: string }>(
      `SELECT c.rarity, COUNT(*) as count
       FROM user_spirit_cosmetics u
       JOIN spirit_animal_cosmetics c ON u.cosmetic_id = c.id
       WHERE u.user_id = $1
       GROUP BY c.rarity`,
      [userId]
    );

    // Get category breakdown
    const categoryBreakdown = await queryAll<{ category: string; count: string }>(
      `SELECT c.category, COUNT(*) as count
       FROM user_spirit_cosmetics u
       JOIN spirit_animal_cosmetics c ON u.cosmetic_id = c.id
       WHERE u.user_id = $1
       GROUP BY c.category`,
      [userId]
    );

    // Get recent acquisitions
    const recentAcquisitions = await queryAll<Record<string, unknown>>(
      `SELECT u.*, c.name, c.rarity, c.category, c.preview_url
       FROM user_spirit_cosmetics u
       JOIN spirit_animal_cosmetics c ON u.cosmetic_id = c.id
       WHERE u.user_id = $1
       ORDER BY u.acquired_at DESC
       LIMIT 10`,
      [userId]
    );

    return {
      totalOwned: Number(totalOwned?.count || 0),
      totalValue: Number(valueResult?.total || 0),
      rarityBreakdown: rarityBreakdown.map((r) => ({
        rarity: r.rarity,
        count: Number(r.count),
      })),
      categoryBreakdown: categoryBreakdown.map((c) => ({
        category: c.category,
        count: Number(c.count),
      })),
      recentAcquisitions,
    };
  },

  async getUserCollection(
    userId: string,
    filters?: {
      category?: string;
      rarity?: string;
      sortBy?: 'acquired' | 'name' | 'rarity' | 'value';
      limit?: number;
      offset?: number;
    }
  ) {
    const { category, rarity, sortBy = 'acquired', limit = 50, offset = 0 } = filters || {};

    let orderClause = '';
    switch (sortBy) {
      case 'name':
        orderClause = 'ORDER BY c.name ASC';
        break;
      case 'rarity':
        orderClause = `ORDER BY
          CASE c.rarity
            WHEN 'divine' THEN 1
            WHEN 'mythic' THEN 2
            WHEN 'legendary' THEN 3
            WHEN 'epic' THEN 4
            WHEN 'rare' THEN 5
            WHEN 'uncommon' THEN 6
            WHEN 'common' THEN 7
          END`;
        break;
      case 'value':
        orderClause = 'ORDER BY c.base_price DESC';
        break;
      case 'acquired':
      default:
        orderClause = 'ORDER BY u.acquired_at DESC';
    }

    const conditions: string[] = ['u.user_id = $1'];
    const params: unknown[] = [userId];
    let paramIndex = 2;

    if (category) {
      conditions.push(`c.category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (rarity) {
      conditions.push(`c.rarity = $${paramIndex}`);
      params.push(rarity);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const items = await queryAll<Record<string, unknown>>(
      `SELECT u.*, c.name, c.description, c.rarity, c.category, c.slot,
              c.base_price, c.preview_url, c.asset_url, c.is_tradeable, c.is_giftable
       FROM user_spirit_cosmetics u
       JOIN spirit_animal_cosmetics c ON u.cosmetic_id = c.id
       WHERE ${whereClause}
       ${orderClause}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const totalCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM user_spirit_cosmetics WHERE user_id = $1`,
      [userId]
    );

    return {
      items,
      total: Number(totalCount?.count || 0),
      hasMore: offset + items.length < Number(totalCount?.count || 0),
    };
  },

  // =====================================================
  // COLLECTION SETS
  // =====================================================

  async getCollectionSets() {
    const sets = await queryAll<CollectionSet>(
      `SELECT * FROM collection_sets
       WHERE expiration_date IS NULL OR expiration_date > NOW()
       ORDER BY created_at ASC`
    );

    return sets;
  },

  async getSetWithProgress(setId: string, userId: string) {
    const set = await queryOne<CollectionSet>(
      `SELECT * FROM collection_sets WHERE id = $1`,
      [setId]
    );

    if (!set) {
      return null;
    }

    // Get user's progress
    let progress = await queryOne<UserCollectionProgress>(
      `SELECT * FROM user_collection_progress WHERE user_id = $1 AND set_id = $2`,
      [userId, setId]
    );

    if (!progress) {
      progress = {
        user_id: userId,
        set_id: setId,
        owned_items: [],
        completion_percent: 0,
        rewards_claimed: [],
        updated_at: new Date(),
      };
    }

    // Get all items in the set with ownership status
    const setItems = set.items || [];
    let itemsWithOwnership: Record<string, unknown>[] = [];

    if (setItems.length > 0) {
      const items = await queryAll<Record<string, unknown>>(
        `SELECT * FROM spirit_animal_cosmetics WHERE id = ANY($1)`,
        [setItems]
      );

      const userCosmetics = await queryAll<{ cosmetic_id: string }>(
        `SELECT cosmetic_id FROM user_spirit_cosmetics
         WHERE user_id = $1 AND cosmetic_id = ANY($2)`,
        [userId, setItems]
      );

      const ownedIds = new Set(userCosmetics.map((c) => c.cosmetic_id));

      itemsWithOwnership = items.map((item) => ({
        ...item,
        owned: ownedIds.has(item.id as string),
      }));
    }

    // Calculate current progress
    const ownedCount = itemsWithOwnership.filter((i) => i.owned).length;
    const totalCount = setItems.length;
    const completionPercent = totalCount > 0 ? (ownedCount / totalCount) * 100 : 0;

    // Get claimable rewards
    const rewards = (set.rewards || []) as SetReward[];
    const claimedRewards = (progress.rewards_claimed || []) as number[];
    const claimableRewards = rewards.filter(
      (r) => completionPercent >= r.threshold && !claimedRewards.includes(r.threshold)
    );

    return {
      set,
      progress: {
        ownedCount,
        totalCount,
        completionPercent,
        rewardsClaimed: progress.rewards_claimed || [],
      },
      items: itemsWithOwnership,
      claimableRewards,
    };
  },

  async getUserSetsProgress(userId: string) {
    const sets = await this.getCollectionSets();

    const setsWithProgress = await Promise.all(
      sets.map(async (set) => {
        const progress = await this.getSetWithProgress(set.id, userId);
        return {
          id: set.id,
          name: set.name,
          theme: set.theme,
          isLimited: set.is_limited,
          expirationDate: set.expiration_date,
          progress: progress?.progress,
          claimableRewardsCount: progress?.claimableRewards?.length || 0,
        };
      })
    );

    return setsWithProgress;
  },

  async claimSetReward(userId: string, setId: string, threshold: number) {
    const setData = await this.getSetWithProgress(setId, userId);

    if (!setData) {
      throw new Error('Set not found');
    }

    const { progress, claimableRewards } = setData;

    // Find the reward at this threshold
    const reward = claimableRewards.find((r: SetReward) => r.threshold === threshold);

    if (!reward) {
      throw new Error('Reward not available or already claimed');
    }

    // Process the reward
    await transaction(async (client: PoolClient) => {
      switch (reward.reward.type) {
        case 'credits':
          await client.query(
            `UPDATE credit_balances SET balance = balance + $1 WHERE user_id = $2`,
            [reward.reward.value as number, userId]
          );
          break;

        case 'xp':
          await client.query(
            `UPDATE users SET xp = xp + $1 WHERE id = $2`,
            [reward.reward.value as number, userId]
          );
          break;

        case 'title':
          // Award title cosmetic or update user's custom title
          await client.query(
            `INSERT INTO user_equipped_cosmetics (user_id, custom_title)
             VALUES ($1, $2)
             ON CONFLICT (user_id) DO UPDATE SET custom_title = $2`,
            [userId, reward.reward.value as string]
          );
          break;

        case 'badge':
          // Create a badge achievement
          await client.query(
            `INSERT INTO user_achievements (user_id, achievement_key, unlocked_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (user_id, achievement_key) DO NOTHING`,
            [userId, reward.reward.value as string]
          );
          break;

        case 'cosmetic':
          // Award the cosmetic
          await client.query(
            `INSERT INTO user_spirit_cosmetics (user_id, cosmetic_id, acquisition_method, is_new)
             VALUES ($1, $2, 'reward', true)
             ON CONFLICT (user_id, cosmetic_id) DO NOTHING`,
            [userId, reward.reward.value as string]
          );
          break;
      }

      // Update progress to mark reward as claimed
      const claimedRewards = [...((progress.rewardsClaimed as number[]) || []), threshold];

      await client.query(
        `INSERT INTO user_collection_progress (user_id, set_id, owned_items, completion_percent, rewards_claimed, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id, set_id) DO UPDATE SET
           rewards_claimed = $5,
           updated_at = NOW()`,
        [userId, setId, [], progress.completionPercent, JSON.stringify(claimedRewards)]
      );
    });

    return { success: true, reward };
  },

  // =====================================================
  // SHOWCASE
  // =====================================================

  async getUserShowcase(userId: string) {
    // Get showcase configuration from user profile
    const showcase = await queryOne<Record<string, unknown>>(
      `SELECT * FROM user_spirit_loadout WHERE user_id = $1`,
      [userId]
    );

    // Get featured items (could be stored in a separate showcase table)
    const featuredItemIds: string[] = [];

    let featuredItems: Record<string, unknown>[] = [];
    if (featuredItemIds.length > 0) {
      featuredItems = await queryAll<Record<string, unknown>>(
        `SELECT u.*, c.*
         FROM user_spirit_cosmetics u
         JOIN spirit_animal_cosmetics c ON u.cosmetic_id = c.id
         WHERE u.id = ANY($1)`,
        [featuredItemIds]
      );
    }

    // Get collection summary
    const stats = await this.getUserCollectionStats(userId);

    // Get rarest items for auto-showcase
    const rarestItems = await queryAll<Record<string, unknown>>(
      `SELECT u.*, c.*
       FROM user_spirit_cosmetics u
       JOIN spirit_animal_cosmetics c ON u.cosmetic_id = c.id
       WHERE u.user_id = $1
       ORDER BY
         CASE c.rarity
           WHEN 'divine' THEN 1
           WHEN 'mythic' THEN 2
           WHEN 'legendary' THEN 3
           WHEN 'epic' THEN 4
           WHEN 'rare' THEN 5
           WHEN 'uncommon' THEN 6
           WHEN 'common' THEN 7
         END
       LIMIT 3`,
      [userId]
    );

    return {
      loadout: showcase,
      featuredItems: featuredItems.length > 0 ? featuredItems : rarestItems,
      stats,
    };
  },

  async updateShowcase(
    userId: string,
    featuredItemIds: string[],
    _layout?: string,
    _showcaseEffect?: string
  ) {
    // Verify user owns all featured items
    if (featuredItemIds.length > 0) {
      const owned = await queryAll<{ id: string }>(
        `SELECT id FROM user_spirit_cosmetics WHERE id = ANY($1) AND user_id = $2`,
        [featuredItemIds, userId]
      );

      if (owned.length !== featuredItemIds.length) {
        throw new Error('You do not own all featured items');
      }
    }

    // For now, store in a simple way - could expand to dedicated showcase table
    // This is a placeholder - actual implementation would depend on your schema

    return { success: true };
  },

  // =====================================================
  // COLLECTION MILESTONES
  // =====================================================

  async checkAndAwardMilestones(userId: string) {
    const stats = await this.getUserCollectionStats(userId);
    const milestonesAwarded: string[] = [];

    const milestones = [
      { key: 'collector_1', threshold: 10, reward: 100 },
      { key: 'collector_2', threshold: 50, reward: 500 },
      { key: 'collector_3', threshold: 100, reward: 1000 },
      { key: 'collector_4', threshold: 250, reward: 2500 },
      { key: 'collector_5', threshold: 500, reward: 5000 },
    ];

    for (const milestone of milestones) {
      if (stats.totalOwned >= milestone.threshold) {
        // Check if already awarded
        const existing = await queryOne<{ id: string }>(
          `SELECT id FROM user_achievements WHERE user_id = $1 AND achievement_key = $2`,
          [userId, milestone.key]
        );

        if (!existing) {
          // Award milestone
          await transaction(async (client: PoolClient) => {
            await client.query(
              `INSERT INTO user_achievements (user_id, achievement_key, unlocked_at)
               VALUES ($1, $2, NOW())`,
              [userId, milestone.key]
            );

            await client.query(
              `UPDATE credit_balances SET balance = balance + $1 WHERE user_id = $2`,
              [milestone.reward, userId]
            );
          });

          milestonesAwarded.push(milestone.key);
        }
      }
    }

    // Check rarity milestone (one of each)
    const raritySet = new Set(stats.rarityBreakdown.map((r) => r.rarity));
    const allRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'divine'];
    const hasAllRarities = allRarities.every((r) => raritySet.has(r));

    if (hasAllRarities) {
      const existing = await queryOne<{ id: string }>(
        `SELECT id FROM user_achievements WHERE user_id = $1 AND achievement_key = $2`,
        [userId, 'rarity_hunter']
      );

      if (!existing) {
        await query(
          `INSERT INTO user_achievements (user_id, achievement_key, unlocked_at)
           VALUES ($1, $2, NOW())`,
          [userId, 'rarity_hunter']
        );

        milestonesAwarded.push('rarity_hunter');
      }
    }

    return milestonesAwarded;
  },

  // =====================================================
  // DUPLICATES
  // =====================================================

  async getUserDuplicates(_userId: string) {
    // Find cosmetics the user has multiple of (if we track duplicates separately)
    // For now, this is a placeholder since each cosmetic is unique

    return [];
  },

  // =====================================================
  // FAVORITES
  // =====================================================

  async toggleFavorite(userId: string, userCosmeticId: string) {
    const item = await queryOne<{ id: string; is_favorite: boolean }>(
      `SELECT id, is_favorite FROM user_spirit_cosmetics WHERE id = $1 AND user_id = $2`,
      [userCosmeticId, userId]
    );

    if (!item) {
      throw new Error('Item not found');
    }

    const newFavoriteStatus = !item.is_favorite;

    await query(
      `UPDATE user_spirit_cosmetics SET is_favorite = $1 WHERE id = $2`,
      [newFavoriteStatus, userCosmeticId]
    );

    return { isFavorite: newFavoriteStatus };
  },

  async getUserFavorites(userId: string) {
    const favorites = await queryAll<Record<string, unknown>>(
      `SELECT u.*, c.*
       FROM user_spirit_cosmetics u
       JOIN spirit_animal_cosmetics c ON u.cosmetic_id = c.id
       WHERE u.user_id = $1 AND u.is_favorite = true`,
      [userId]
    );

    return favorites;
  },

  // =====================================================
  // MARK AS SEEN
  // =====================================================

  async markItemAsSeen(userId: string, userCosmeticId: string) {
    await query(
      `UPDATE user_spirit_cosmetics SET is_new = false WHERE id = $1 AND user_id = $2`,
      [userCosmeticId, userId]
    );

    return { success: true };
  },

  async markAllAsSeen(userId: string) {
    await query(
      `UPDATE user_spirit_cosmetics SET is_new = false WHERE user_id = $1 AND is_new = true`,
      [userId]
    );

    return { success: true };
  },

  async getNewItemsCount(userId: string) {
    const count = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM user_spirit_cosmetics WHERE user_id = $1 AND is_new = true`,
      [userId]
    );

    return Number(count?.count || 0);
  },
};
