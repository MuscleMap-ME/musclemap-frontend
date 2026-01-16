import { queryOne, queryAll, execute, transaction } from '../../db/client';

// =====================================================
// TYPES
// =====================================================

export interface CreateTradeInput {
  initiatorId: string;
  receiverId: string;
  initiatorItems: string[]; // user_spirit_cosmetics IDs
  initiatorCredits: number;
  receiverItems: string[]; // user_spirit_cosmetics IDs (requested)
  receiverCredits: number;
  message?: string;
}

export interface CounterTradeInput {
  initiatorItems: string[];
  initiatorCredits: number;
  receiverItems: string[];
  receiverCredits: number;
  message?: string;
}

// =====================================================
// TRADING SERVICE
// =====================================================

const TRADE_EXPIRATION_HOURS = 48;
const MAX_ITEMS_PER_SIDE = 10;
const MAX_VALUE_DIFFERENCE_PERCENT = 50;
const HIGH_VALUE_THRESHOLD = 10000;

export const tradingService = {
  // =====================================================
  // TRADE REQUESTS
  // =====================================================

  async createTradeRequest(input: CreateTradeInput) {
    const {
      initiatorId,
      receiverId,
      initiatorItems,
      initiatorCredits,
      receiverItems,
      receiverCredits,
      message,
    } = input;

    // Validation
    if (initiatorId === receiverId) {
      throw new Error('Cannot trade with yourself');
    }

    if (initiatorItems.length > MAX_ITEMS_PER_SIDE || receiverItems.length > MAX_ITEMS_PER_SIDE) {
      throw new Error(`Maximum ${MAX_ITEMS_PER_SIDE} items per side`);
    }

    if (initiatorItems.length === 0 && initiatorCredits === 0) {
      throw new Error('You must offer at least one item or credits');
    }

    if (receiverItems.length === 0 && receiverCredits === 0) {
      throw new Error('You must request at least one item or credits');
    }

    // Verify initiator owns all items they're offering
    if (initiatorItems.length > 0) {
      const ownedItems = await db('user_spirit_cosmetics')
        .whereIn('id', initiatorItems)
        .where({ user_id: initiatorId });

      if (ownedItems.length !== initiatorItems.length) {
        throw new Error('You do not own all the items you are offering');
      }

      // Check items are tradeable
      const cosmetics = await db('spirit_animal_cosmetics')
        .whereIn(
          'id',
          ownedItems.map((i) => i.cosmetic_id)
        )
        .select('id', 'is_tradeable');

      const nonTradeable = cosmetics.filter((c) => !c.is_tradeable);
      if (nonTradeable.length > 0) {
        throw new Error('Some items cannot be traded');
      }

      // Check items are not currently in trade or listed
      const inTrade = await db('trade_requests')
        .where({ initiator_id: initiatorId })
        .whereIn('status', ['pending', 'countered'])
        .whereRaw('initiator_items && ?', [initiatorItems]);

      if (inTrade.length > 0) {
        throw new Error('Some items are already in a pending trade');
      }

      const listed = await db('marketplace_listings')
        .whereIn('user_cosmetic_id', initiatorItems)
        .where({ status: 'active' });

      if (listed.length > 0) {
        throw new Error('Some items are currently listed on the marketplace');
      }
    }

    // Verify receiver owns items they're being asked for
    if (receiverItems.length > 0) {
      const receiverOwned = await db('user_spirit_cosmetics')
        .whereIn('id', receiverItems)
        .where({ user_id: receiverId });

      if (receiverOwned.length !== receiverItems.length) {
        throw new Error('Receiver does not own all requested items');
      }

      // Check items are tradeable
      const receiverCosmetics = await db('spirit_animal_cosmetics')
        .whereIn(
          'id',
          receiverOwned.map((i) => i.cosmetic_id)
        )
        .select('id', 'is_tradeable');

      const nonTradeable = receiverCosmetics.filter((c) => !c.is_tradeable);
      if (nonTradeable.length > 0) {
        throw new Error('Some requested items cannot be traded');
      }
    }

    // Check initiator has enough credits
    if (initiatorCredits > 0) {
      const balance = await db('credit_balances')
        .where({ user_id: initiatorId })
        .first();

      if (!balance || balance.balance < initiatorCredits) {
        throw new Error('Insufficient credits');
      }
    }

    // Calculate estimated values
    const initiatorValue = await this.calculateTradeValue(initiatorItems, initiatorCredits);
    const receiverValue = await this.calculateTradeValue(receiverItems, receiverCredits);

    // Check for value discrepancy (warn but don't block)
    const valueDiff = Math.abs(initiatorValue - receiverValue);
    const maxValue = Math.max(initiatorValue, receiverValue);
    const diffPercent = maxValue > 0 ? (valueDiff / maxValue) * 100 : 0;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TRADE_EXPIRATION_HOURS);

    const [trade] = await db('trade_requests')
      .insert({
        initiator_id: initiatorId,
        receiver_id: receiverId,
        initiator_items: initiatorItems,
        initiator_credits: initiatorCredits,
        receiver_items: receiverItems,
        receiver_credits: receiverCredits,
        message,
        initiator_estimated_value: initiatorValue,
        receiver_estimated_value: receiverValue,
        expires_at: expiresAt,
      })
      .returning('*');

    return {
      trade: await this.enrichTrade(trade),
      valueWarning:
        diffPercent > MAX_VALUE_DIFFERENCE_PERCENT
          ? `Warning: This trade has a ${Math.round(diffPercent)}% value difference`
          : null,
    };
  },

  async getTradeRequest(tradeId: string, userId: string) {
    const trade = await db('trade_requests')
      .where({ id: tradeId })
      .where(function () {
        this.where({ initiator_id: userId }).orWhere({ receiver_id: userId });
      })
      .first();

    if (!trade) {
      return null;
    }

    return this.enrichTrade(trade);
  },

  async getIncomingTrades(userId: string) {
    const trades = await db('trade_requests')
      .where({ receiver_id: userId })
      .whereIn('status', ['pending', 'countered'])
      .orderBy('created_at', 'desc');

    return Promise.all(trades.map((t) => this.enrichTrade(t)));
  },

  async getOutgoingTrades(userId: string) {
    const trades = await db('trade_requests')
      .where({ initiator_id: userId })
      .whereIn('status', ['pending', 'countered'])
      .orderBy('created_at', 'desc');

    return Promise.all(trades.map((t) => this.enrichTrade(t)));
  },

  async getTradeHistory(userId: string, limit = 50) {
    const trades = await db('trade_history')
      .where(function () {
        this.where({ user1_id: userId }).orWhere({ user2_id: userId });
      })
      .orderBy('completed_at', 'desc')
      .limit(limit);

    return trades;
  },

  // =====================================================
  // TRADE ACTIONS
  // =====================================================

  async acceptTrade(tradeId: string, receiverId: string) {
    return db.transaction(async (trx) => {
      const trade = await trx('trade_requests')
        .where({ id: tradeId, receiver_id: receiverId })
        .whereIn('status', ['pending', 'countered'])
        .forUpdate()
        .first();

      if (!trade) {
        throw new Error('Trade not found or already processed');
      }

      // Check trade hasn't expired
      if (new Date(trade.expires_at) < new Date()) {
        await trx('trade_requests')
          .where({ id: tradeId })
          .update({ status: 'expired' });
        throw new Error('Trade has expired');
      }

      // Verify ownership again (items may have been traded/sold since)
      if (trade.initiator_items.length > 0) {
        const initiatorOwns = await trx('user_spirit_cosmetics')
          .whereIn('id', trade.initiator_items)
          .where({ user_id: trade.initiator_id });

        if (initiatorOwns.length !== trade.initiator_items.length) {
          throw new Error('Initiator no longer owns all offered items');
        }
      }

      if (trade.receiver_items.length > 0) {
        const receiverOwns = await trx('user_spirit_cosmetics')
          .whereIn('id', trade.receiver_items)
          .where({ user_id: receiverId });

        if (receiverOwns.length !== trade.receiver_items.length) {
          throw new Error('You no longer own all requested items');
        }
      }

      // Verify credits
      if (trade.initiator_credits > 0) {
        const initiatorBalance = await trx('credit_balances')
          .where({ user_id: trade.initiator_id })
          .first();

        if (!initiatorBalance || initiatorBalance.balance < trade.initiator_credits) {
          throw new Error('Initiator no longer has sufficient credits');
        }
      }

      if (trade.receiver_credits > 0) {
        const receiverBalance = await trx('credit_balances')
          .where({ user_id: receiverId })
          .first();

        if (!receiverBalance || receiverBalance.balance < trade.receiver_credits) {
          throw new Error('You do not have sufficient credits');
        }
      }

      // Execute the trade

      // Transfer initiator's items to receiver
      if (trade.initiator_items.length > 0) {
        await trx('user_spirit_cosmetics')
          .whereIn('id', trade.initiator_items)
          .update({
            user_id: receiverId,
            acquired_at: new Date(),
            acquisition_method: 'trade',
          });
      }

      // Transfer receiver's items to initiator
      if (trade.receiver_items.length > 0) {
        await trx('user_spirit_cosmetics')
          .whereIn('id', trade.receiver_items)
          .update({
            user_id: trade.initiator_id,
            acquired_at: new Date(),
            acquisition_method: 'trade',
          });
      }

      // Transfer credits
      if (trade.initiator_credits > 0) {
        await trx('credit_balances')
          .where({ user_id: trade.initiator_id })
          .decrement('balance', trade.initiator_credits);

        await trx('credit_balances')
          .where({ user_id: receiverId })
          .increment('balance', trade.initiator_credits);
      }

      if (trade.receiver_credits > 0) {
        await trx('credit_balances')
          .where({ user_id: receiverId })
          .decrement('balance', trade.receiver_credits);

        await trx('credit_balances')
          .where({ user_id: trade.initiator_id })
          .increment('balance', trade.receiver_credits);
      }

      // Update trade status
      await trx('trade_requests')
        .where({ id: tradeId })
        .update({
          status: 'completed',
          completed_at: new Date(),
          updated_at: new Date(),
        });

      // Record in trade history
      const totalValue =
        trade.initiator_estimated_value + trade.receiver_estimated_value;

      // Get item details for history
      const initiatorItemDetails = trade.initiator_items.length > 0
        ? await trx('user_spirit_cosmetics')
            .join('spirit_animal_cosmetics', 'user_spirit_cosmetics.cosmetic_id', 'spirit_animal_cosmetics.id')
            .whereIn('user_spirit_cosmetics.id', trade.initiator_items)
            .select('spirit_animal_cosmetics.name', 'spirit_animal_cosmetics.rarity')
        : [];

      const receiverItemDetails = trade.receiver_items.length > 0
        ? await trx('user_spirit_cosmetics')
            .join('spirit_animal_cosmetics', 'user_spirit_cosmetics.cosmetic_id', 'spirit_animal_cosmetics.id')
            .whereIn('user_spirit_cosmetics.id', trade.receiver_items)
            .select('spirit_animal_cosmetics.name', 'spirit_animal_cosmetics.rarity')
        : [];

      await trx('trade_history').insert({
        trade_id: tradeId,
        user1_id: trade.initiator_id,
        user2_id: receiverId,
        user1_items: JSON.stringify(initiatorItemDetails),
        user1_credits: trade.initiator_credits,
        user2_items: JSON.stringify(receiverItemDetails),
        user2_credits: trade.receiver_credits,
        total_value: totalValue,
      });

      // Update user marketplace stats
      await this.updateTradeStats(trx, trade.initiator_id, totalValue / 2);
      await this.updateTradeStats(trx, receiverId, totalValue / 2);

      return { success: true, trade: { ...trade, status: 'completed' } };
    });
  },

  async declineTrade(tradeId: string, receiverId: string) {
    const trade = await db('trade_requests')
      .where({ id: tradeId, receiver_id: receiverId })
      .whereIn('status', ['pending', 'countered'])
      .first();

    if (!trade) {
      throw new Error('Trade not found or already processed');
    }

    await db('trade_requests')
      .where({ id: tradeId })
      .update({ status: 'declined', updated_at: new Date() });

    return { success: true };
  },

  async counterTrade(tradeId: string, receiverId: string, counter: CounterTradeInput) {
    const {
      initiatorItems,
      initiatorCredits,
      receiverItems,
      receiverCredits,
      message,
    } = counter;

    const trade = await db('trade_requests')
      .where({ id: tradeId, receiver_id: receiverId })
      .whereIn('status', ['pending', 'countered'])
      .first();

    if (!trade) {
      throw new Error('Trade not found or already processed');
    }

    // Validate counter offer
    if (initiatorItems.length > MAX_ITEMS_PER_SIDE || receiverItems.length > MAX_ITEMS_PER_SIDE) {
      throw new Error(`Maximum ${MAX_ITEMS_PER_SIDE} items per side`);
    }

    // Verify receiver owns counter items
    if (receiverItems.length > 0) {
      const owned = await db('user_spirit_cosmetics')
        .whereIn('id', receiverItems)
        .where({ user_id: receiverId });

      if (owned.length !== receiverItems.length) {
        throw new Error('You do not own all the items in your counter offer');
      }
    }

    // Verify initiator owns requested items
    if (initiatorItems.length > 0) {
      const initiatorOwns = await db('user_spirit_cosmetics')
        .whereIn('id', initiatorItems)
        .where({ user_id: trade.initiator_id });

      if (initiatorOwns.length !== initiatorItems.length) {
        throw new Error('The other user does not own all requested items');
      }
    }

    // Calculate new values
    const initiatorValue = await this.calculateTradeValue(initiatorItems, initiatorCredits);
    const receiverValue = await this.calculateTradeValue(receiverItems, receiverCredits);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TRADE_EXPIRATION_HOURS);

    // Swap initiator/receiver roles for counter
    await db('trade_requests')
      .where({ id: tradeId })
      .update({
        status: 'countered',
        // Swap who is the initiator for the counter
        initiator_id: receiverId,
        receiver_id: trade.initiator_id,
        initiator_items: receiverItems,
        initiator_credits: receiverCredits,
        receiver_items: initiatorItems,
        receiver_credits: initiatorCredits,
        initiator_estimated_value: receiverValue,
        receiver_estimated_value: initiatorValue,
        message,
        counter_count: trade.counter_count + 1,
        expires_at: expiresAt,
        updated_at: new Date(),
      });

    const updatedTrade = await db('trade_requests').where({ id: tradeId }).first();

    return { trade: await this.enrichTrade(updatedTrade) };
  },

  async cancelTrade(tradeId: string, initiatorId: string) {
    const trade = await db('trade_requests')
      .where({ id: tradeId, initiator_id: initiatorId })
      .whereIn('status', ['pending', 'countered'])
      .first();

    if (!trade) {
      throw new Error('Trade not found or you are not the initiator');
    }

    await db('trade_requests')
      .where({ id: tradeId })
      .update({ status: 'cancelled', updated_at: new Date() });

    return { success: true };
  },

  // =====================================================
  // VALUE CALCULATION
  // =====================================================

  async calculateTradeValue(itemIds: string[], credits: number): Promise<number> {
    let itemValue = 0;

    if (itemIds.length > 0) {
      const items = await db('user_spirit_cosmetics')
        .join('spirit_animal_cosmetics', 'user_spirit_cosmetics.cosmetic_id', 'spirit_animal_cosmetics.id')
        .whereIn('user_spirit_cosmetics.id', itemIds)
        .select('spirit_animal_cosmetics.id', 'spirit_animal_cosmetics.base_price');

      // Get average sale prices for these items
      for (const item of items) {
        const avgSale = await db('marketplace_transactions')
          .where({ cosmetic_id: item.id })
          .where('created_at', '>', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
          .avg('sale_price as avg')
          .first();

        itemValue += avgSale?.avg || item.base_price || 100;
      }
    }

    return Math.round(itemValue + credits);
  },

  async estimateTradeValue(itemIds: string[]) {
    const values: { itemId: string; name: string; estimatedValue: number }[] = [];

    for (const itemId of itemIds) {
      const item = await db('user_spirit_cosmetics')
        .join('spirit_animal_cosmetics', 'user_spirit_cosmetics.cosmetic_id', 'spirit_animal_cosmetics.id')
        .where('user_spirit_cosmetics.id', itemId)
        .select('spirit_animal_cosmetics.*')
        .first();

      if (!item) continue;

      const avgSale = await db('marketplace_transactions')
        .where({ cosmetic_id: item.id })
        .where('created_at', '>', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .avg('sale_price as avg')
        .first();

      values.push({
        itemId,
        name: item.name,
        estimatedValue: Math.round(avgSale?.avg || item.base_price || 100),
      });
    }

    const totalValue = values.reduce((sum, v) => sum + v.estimatedValue, 0);

    return { itemValues: values, totalValue };
  },

  // =====================================================
  // HELPERS
  // =====================================================

  async enrichTrade(trade: Record<string, unknown>) {
    const [initiator, receiver, initiatorItemDetails, receiverItemDetails] = await Promise.all([
      db('users')
        .where({ id: trade.initiator_id })
        .select('id', 'username', 'avatar_url')
        .first(),
      db('users')
        .where({ id: trade.receiver_id })
        .select('id', 'username', 'avatar_url')
        .first(),
      trade.initiator_items && (trade.initiator_items as string[]).length > 0
        ? db('user_spirit_cosmetics')
            .join('spirit_animal_cosmetics', 'user_spirit_cosmetics.cosmetic_id', 'spirit_animal_cosmetics.id')
            .whereIn('user_spirit_cosmetics.id', trade.initiator_items as string[])
            .select(
              'user_spirit_cosmetics.id as user_cosmetic_id',
              'spirit_animal_cosmetics.*'
            )
        : [],
      trade.receiver_items && (trade.receiver_items as string[]).length > 0
        ? db('user_spirit_cosmetics')
            .join('spirit_animal_cosmetics', 'user_spirit_cosmetics.cosmetic_id', 'spirit_animal_cosmetics.id')
            .whereIn('user_spirit_cosmetics.id', trade.receiver_items as string[])
            .select(
              'user_spirit_cosmetics.id as user_cosmetic_id',
              'spirit_animal_cosmetics.*'
            )
        : [],
    ]);

    return {
      ...trade,
      initiator,
      receiver,
      initiatorItemDetails,
      receiverItemDetails,
    };
  },

  async updateTradeStats(trx: typeof db, userId: string, valueExchanged: number) {
    await trx('user_marketplace_stats')
      .insert({ user_id: userId })
      .onConflict('user_id')
      .ignore();

    await trx('user_marketplace_stats')
      .where({ user_id: userId })
      .increment('total_trades', 1)
      .increment('trade_value_exchanged', Math.round(valueExchanged))
      .update({ updated_at: new Date() });
  },

  // Expire old trades
  async expireOldTrades() {
    const expired = await db('trade_requests')
      .whereIn('status', ['pending', 'countered'])
      .where('expires_at', '<', new Date())
      .update({ status: 'expired', updated_at: new Date() });

    return expired;
  },
};
