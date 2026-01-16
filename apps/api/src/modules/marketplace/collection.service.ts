import { db } from '../../db';

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

// =====================================================
// COLLECTION SERVICE
// =====================================================

export const collectionService = {
  // =====================================================
  // COLLECTION STATS
  // =====================================================

  async getUserCollectionStats(userId: string): Promise<CollectionStats> {
    // Get total owned count
    const totalOwned = await db('user_spirit_cosmetics')
      .where({ user_id: userId })
      .count('* as count')
      .first();

    // Get total estimated value
    const valueResult = await db('user_spirit_cosmetics')
      .join('spirit_animal_cosmetics', 'user_spirit_cosmetics.cosmetic_id', 'spirit_animal_cosmetics.id')
      .where('user_spirit_cosmetics.user_id', userId)
      .sum('spirit_animal_cosmetics.base_price as total')
      .first();

    // Get rarity breakdown
    const rarityBreakdown = await db('user_spirit_cosmetics')
      .join('spirit_animal_cosmetics', 'user_spirit_cosmetics.cosmetic_id', 'spirit_animal_cosmetics.id')
      .where('user_spirit_cosmetics.user_id', userId)
      .select('spirit_animal_cosmetics.rarity')
      .count('* as count')
      .groupBy('spirit_animal_cosmetics.rarity');

    // Get category breakdown
    const categoryBreakdown = await db('user_spirit_cosmetics')
      .join('spirit_animal_cosmetics', 'user_spirit_cosmetics.cosmetic_id', 'spirit_animal_cosmetics.id')
      .where('user_spirit_cosmetics.user_id', userId)
      .select('spirit_animal_cosmetics.category')
      .count('* as count')
      .groupBy('spirit_animal_cosmetics.category');

    // Get recent acquisitions
    const recentAcquisitions = await db('user_spirit_cosmetics')
      .join('spirit_animal_cosmetics', 'user_spirit_cosmetics.cosmetic_id', 'spirit_animal_cosmetics.id')
      .where('user_spirit_cosmetics.user_id', userId)
      .orderBy('user_spirit_cosmetics.acquired_at', 'desc')
      .limit(10)
      .select(
        'user_spirit_cosmetics.*',
        'spirit_animal_cosmetics.name',
        'spirit_animal_cosmetics.rarity',
        'spirit_animal_cosmetics.category',
        'spirit_animal_cosmetics.preview_url'
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

    let query = db('user_spirit_cosmetics')
      .join('spirit_animal_cosmetics', 'user_spirit_cosmetics.cosmetic_id', 'spirit_animal_cosmetics.id')
      .where('user_spirit_cosmetics.user_id', userId)
      .select(
        'user_spirit_cosmetics.*',
        'spirit_animal_cosmetics.name',
        'spirit_animal_cosmetics.description',
        'spirit_animal_cosmetics.rarity',
        'spirit_animal_cosmetics.category',
        'spirit_animal_cosmetics.slot',
        'spirit_animal_cosmetics.base_price',
        'spirit_animal_cosmetics.preview_url',
        'spirit_animal_cosmetics.asset_url',
        'spirit_animal_cosmetics.is_tradeable',
        'spirit_animal_cosmetics.is_giftable'
      );

    if (category) {
      query = query.where('spirit_animal_cosmetics.category', category);
    }

    if (rarity) {
      query = query.where('spirit_animal_cosmetics.rarity', rarity);
    }

    switch (sortBy) {
      case 'name':
        query = query.orderBy('spirit_animal_cosmetics.name', 'asc');
        break;
      case 'rarity':
        query = query.orderByRaw(`
          CASE spirit_animal_cosmetics.rarity
            WHEN 'divine' THEN 1
            WHEN 'mythic' THEN 2
            WHEN 'legendary' THEN 3
            WHEN 'epic' THEN 4
            WHEN 'rare' THEN 5
            WHEN 'uncommon' THEN 6
            WHEN 'common' THEN 7
          END
        `);
        break;
      case 'value':
        query = query.orderBy('spirit_animal_cosmetics.base_price', 'desc');
        break;
      case 'acquired':
      default:
        query = query.orderBy('user_spirit_cosmetics.acquired_at', 'desc');
    }

    const items = await query.limit(limit).offset(offset);

    const totalCount = await db('user_spirit_cosmetics')
      .where({ user_id: userId })
      .count('* as count')
      .first();

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
    const sets = await db('collection_sets')
      .where(function () {
        this.whereNull('expiration_date').orWhere('expiration_date', '>', new Date());
      })
      .orderBy('created_at', 'asc');

    return sets;
  },

  async getSetWithProgress(setId: string, userId: string) {
    const set = await db('collection_sets').where({ id: setId }).first();

    if (!set) {
      return null;
    }

    // Get user's progress
    let progress = await db('user_collection_progress')
      .where({ user_id: userId, set_id: setId })
      .first();

    if (!progress) {
      progress = {
        owned_items: [],
        completion_percent: 0,
        rewards_claimed: [],
      };
    }

    // Get all items in the set with ownership status
    const setItems = set.items || [];
    let itemsWithOwnership: Record<string, unknown>[] = [];

    if (setItems.length > 0) {
      itemsWithOwnership = await db('spirit_animal_cosmetics')
        .whereIn('id', setItems)
        .select('*')
        .then(async (items) => {
          const userCosmetics = await db('user_spirit_cosmetics')
            .where({ user_id: userId })
            .whereIn('cosmetic_id', setItems)
            .select('cosmetic_id');

          const ownedIds = new Set(userCosmetics.map((c) => c.cosmetic_id));

          return items.map((item) => ({
            ...item,
            owned: ownedIds.has(item.id),
          }));
        });
    }

    // Calculate current progress
    const ownedCount = itemsWithOwnership.filter((i) => i.owned).length;
    const totalCount = setItems.length;
    const completionPercent = totalCount > 0 ? (ownedCount / totalCount) * 100 : 0;

    // Get claimable rewards
    const rewards = set.rewards as SetReward[];
    const claimableRewards = rewards.filter(
      (r) =>
        completionPercent >= r.threshold &&
        !((progress.rewards_claimed as number[]) || []).includes(r.threshold)
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

    const { set, progress, claimableRewards } = setData;

    // Find the reward at this threshold
    const reward = claimableRewards.find((r: SetReward) => r.threshold === threshold);

    if (!reward) {
      throw new Error('Reward not available or already claimed');
    }

    // Process the reward
    await db.transaction(async (trx) => {
      switch (reward.reward.type) {
        case 'credits':
          await trx('credit_balances')
            .where({ user_id: userId })
            .increment('balance', reward.reward.value as number);
          break;

        case 'xp':
          await trx('users')
            .where({ id: userId })
            .increment('xp', reward.reward.value as number);
          break;

        case 'title':
          // Award title cosmetic or update user's custom title
          await trx('user_equipped_cosmetics')
            .insert({
              user_id: userId,
              custom_title: reward.reward.value as string,
            })
            .onConflict('user_id')
            .merge({ custom_title: reward.reward.value as string });
          break;

        case 'badge':
          // Create a badge achievement
          await trx('user_achievements')
            .insert({
              user_id: userId,
              achievement_key: reward.reward.value as string,
              unlocked_at: new Date(),
            })
            .onConflict(['user_id', 'achievement_key'])
            .ignore();
          break;

        case 'cosmetic':
          // Award the cosmetic
          await trx('user_spirit_cosmetics')
            .insert({
              user_id: userId,
              cosmetic_id: reward.reward.value as string,
              acquisition_method: 'reward',
              is_new: true,
            })
            .onConflict(['user_id', 'cosmetic_id'])
            .ignore();
          break;
      }

      // Update progress to mark reward as claimed
      const claimedRewards = [...((progress.rewardsClaimed as number[]) || []), threshold];

      await trx('user_collection_progress')
        .insert({
          user_id: userId,
          set_id: setId,
          owned_items: [],
          completion_percent: progress.completionPercent,
          rewards_claimed: JSON.stringify(claimedRewards),
          updated_at: new Date(),
        })
        .onConflict(['user_id', 'set_id'])
        .merge({
          rewards_claimed: JSON.stringify(claimedRewards),
          updated_at: new Date(),
        });
    });

    return { success: true, reward };
  },

  // =====================================================
  // SHOWCASE
  // =====================================================

  async getUserShowcase(userId: string) {
    // Get showcase configuration from user profile
    const showcase = await db('user_spirit_loadout')
      .where({ user_id: userId })
      .first();

    // Get featured items
    const featuredItemIds: string[] = []; // Could be stored in a separate showcase table

    const featuredItems = featuredItemIds.length > 0
      ? await db('user_spirit_cosmetics')
          .join('spirit_animal_cosmetics', 'user_spirit_cosmetics.cosmetic_id', 'spirit_animal_cosmetics.id')
          .whereIn('user_spirit_cosmetics.id', featuredItemIds)
          .select('user_spirit_cosmetics.*', 'spirit_animal_cosmetics.*')
      : [];

    // Get collection summary
    const stats = await this.getUserCollectionStats(userId);

    // Get rarest items for auto-showcase
    const rarestItems = await db('user_spirit_cosmetics')
      .join('spirit_animal_cosmetics', 'user_spirit_cosmetics.cosmetic_id', 'spirit_animal_cosmetics.id')
      .where('user_spirit_cosmetics.user_id', userId)
      .orderByRaw(`
        CASE spirit_animal_cosmetics.rarity
          WHEN 'divine' THEN 1
          WHEN 'mythic' THEN 2
          WHEN 'legendary' THEN 3
          WHEN 'epic' THEN 4
          WHEN 'rare' THEN 5
          WHEN 'uncommon' THEN 6
          WHEN 'common' THEN 7
        END
      `)
      .limit(3)
      .select('user_spirit_cosmetics.*', 'spirit_animal_cosmetics.*');

    return {
      loadout: showcase,
      featuredItems: featuredItems.length > 0 ? featuredItems : rarestItems,
      stats,
    };
  },

  async updateShowcase(
    userId: string,
    featuredItemIds: string[],
    layout?: string,
    showcaseEffect?: string
  ) {
    // Verify user owns all featured items
    if (featuredItemIds.length > 0) {
      const owned = await db('user_spirit_cosmetics')
        .whereIn('id', featuredItemIds)
        .where({ user_id: userId });

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
        const existing = await db('user_achievements')
          .where({ user_id: userId, achievement_key: milestone.key })
          .first();

        if (!existing) {
          // Award milestone
          await db.transaction(async (trx) => {
            await trx('user_achievements').insert({
              user_id: userId,
              achievement_key: milestone.key,
              unlocked_at: new Date(),
            });

            await trx('credit_balances')
              .where({ user_id: userId })
              .increment('balance', milestone.reward);
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
      const existing = await db('user_achievements')
        .where({ user_id: userId, achievement_key: 'rarity_hunter' })
        .first();

      if (!existing) {
        await db('user_achievements').insert({
          user_id: userId,
          achievement_key: 'rarity_hunter',
          unlocked_at: new Date(),
        });

        milestonesAwarded.push('rarity_hunter');
      }
    }

    return milestonesAwarded;
  },

  // =====================================================
  // DUPLICATES
  // =====================================================

  async getUserDuplicates(userId: string) {
    // Find cosmetics the user has multiple of (if we track duplicates separately)
    // For now, this is a placeholder since each cosmetic is unique

    return [];
  },

  // =====================================================
  // FAVORITES
  // =====================================================

  async toggleFavorite(userId: string, userCosmeticId: string) {
    const item = await db('user_spirit_cosmetics')
      .where({ id: userCosmeticId, user_id: userId })
      .first();

    if (!item) {
      throw new Error('Item not found');
    }

    const newFavoriteStatus = !item.is_favorite;

    await db('user_spirit_cosmetics')
      .where({ id: userCosmeticId })
      .update({ is_favorite: newFavoriteStatus });

    return { isFavorite: newFavoriteStatus };
  },

  async getUserFavorites(userId: string) {
    const favorites = await db('user_spirit_cosmetics')
      .join('spirit_animal_cosmetics', 'user_spirit_cosmetics.cosmetic_id', 'spirit_animal_cosmetics.id')
      .where('user_spirit_cosmetics.user_id', userId)
      .where('user_spirit_cosmetics.is_favorite', true)
      .select('user_spirit_cosmetics.*', 'spirit_animal_cosmetics.*');

    return favorites;
  },

  // =====================================================
  // MARK AS SEEN
  // =====================================================

  async markItemAsSeen(userId: string, userCosmeticId: string) {
    await db('user_spirit_cosmetics')
      .where({ id: userCosmeticId, user_id: userId })
      .update({ is_new: false });

    return { success: true };
  },

  async markAllAsSeen(userId: string) {
    await db('user_spirit_cosmetics')
      .where({ user_id: userId, is_new: true })
      .update({ is_new: false });

    return { success: true };
  },

  async getNewItemsCount(userId: string) {
    const count = await db('user_spirit_cosmetics')
      .where({ user_id: userId, is_new: true })
      .count('* as count')
      .first();

    return Number(count?.count || 0);
  },
};
