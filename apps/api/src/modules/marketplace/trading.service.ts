import { queryOne, queryAll, query, transaction } from '../../db/client';
import { PoolClient } from 'pg';

// =====================================================
// TYPES
// =====================================================

export interface CreateTradeInput {
  initiatorId: string;
  receiverId: string;
  initiatorItems?: string[]; // user_spirit_cosmetics IDs
  initiatorCredits?: number;
  receiverItems?: string[]; // user_spirit_cosmetics IDs (requested)
  receiverCredits?: number;
  message?: string;
}

export interface CounterTradeInput {
  initiatorItems?: string[];
  initiatorCredits?: number;
  receiverItems?: string[];
  receiverCredits?: number;
  message?: string;
}

interface TradeRequest {
  id: string;
  initiator_id: string;
  receiver_id: string;
  initiator_items: string[];
  initiator_credits: number;
  receiver_items: string[];
  receiver_credits: number;
  initiator_estimated_value: number;
  receiver_estimated_value: number;
  status: string;
  message: string | null;
  counter_count: number;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
}

interface UserCosmetic {
  id: string;
  user_id: string;
  cosmetic_id: string;
}

interface Cosmetic {
  id: string;
  name: string;
  rarity: string;
  is_tradeable: boolean;
  base_price: number;
}

interface UserBasic {
  id: string;
  username: string;
  avatar_url: string | null;
}

// =====================================================
// TRADING SERVICE
// =====================================================

const TRADE_EXPIRATION_HOURS = 48;
const MAX_ITEMS_PER_SIDE = 10;
const MAX_VALUE_DIFFERENCE_PERCENT = 50;

export const tradingService = {
  // =====================================================
  // TRADE REQUESTS
  // =====================================================

  async createTradeRequest(input: CreateTradeInput) {
    const {
      initiatorId,
      receiverId,
      initiatorItems = [],
      initiatorCredits = 0,
      receiverItems = [],
      receiverCredits = 0,
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
      const ownedItems = await queryAll<UserCosmetic>(
        `SELECT id, user_id, cosmetic_id FROM user_spirit_cosmetics
         WHERE id = ANY($1) AND user_id = $2`,
        [initiatorItems, initiatorId]
      );

      if (ownedItems.length !== initiatorItems.length) {
        throw new Error('You do not own all the items you are offering');
      }

      // Check items are tradeable
      const cosmeticIds = ownedItems.map((i) => i.cosmetic_id);
      const cosmetics = await queryAll<Cosmetic>(
        `SELECT id, is_tradeable FROM spirit_animal_cosmetics
         WHERE id = ANY($1)`,
        [cosmeticIds]
      );

      const nonTradeable = cosmetics.filter((c) => !c.is_tradeable);
      if (nonTradeable.length > 0) {
        throw new Error('Some items cannot be traded');
      }

      // Check items are not currently in trade or listed
      const inTrade = await queryAll<{ id: string }>(
        `SELECT id FROM trade_requests
         WHERE initiator_id = $1
         AND status IN ('pending', 'countered')
         AND initiator_items && $2::uuid[]`,
        [initiatorId, initiatorItems]
      );

      if (inTrade.length > 0) {
        throw new Error('Some items are already in a pending trade');
      }

      const listed = await queryAll<{ id: string }>(
        `SELECT id FROM marketplace_listings
         WHERE user_cosmetic_id = ANY($1) AND status = 'active'`,
        [initiatorItems]
      );

      if (listed.length > 0) {
        throw new Error('Some items are currently listed on the marketplace');
      }
    }

    // Verify receiver owns items they're being asked for
    if (receiverItems.length > 0) {
      const receiverOwned = await queryAll<UserCosmetic>(
        `SELECT id, user_id, cosmetic_id FROM user_spirit_cosmetics
         WHERE id = ANY($1) AND user_id = $2`,
        [receiverItems, receiverId]
      );

      if (receiverOwned.length !== receiverItems.length) {
        throw new Error('Receiver does not own all requested items');
      }

      // Check items are tradeable
      const receiverCosmeticIds = receiverOwned.map((i) => i.cosmetic_id);
      const receiverCosmetics = await queryAll<Cosmetic>(
        `SELECT id, is_tradeable FROM spirit_animal_cosmetics
         WHERE id = ANY($1)`,
        [receiverCosmeticIds]
      );

      const nonTradeable = receiverCosmetics.filter((c) => !c.is_tradeable);
      if (nonTradeable.length > 0) {
        throw new Error('Some requested items cannot be traded');
      }
    }

    // Check initiator has enough credits
    if (initiatorCredits > 0) {
      const balance = await queryOne<{ balance: number }>(
        `SELECT balance FROM credit_balances WHERE user_id = $1`,
        [initiatorId]
      );

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

    const trade = await queryOne<TradeRequest>(
      `INSERT INTO trade_requests (
        initiator_id, receiver_id, initiator_items, initiator_credits,
        receiver_items, receiver_credits, message,
        initiator_estimated_value, receiver_estimated_value, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        initiatorId, receiverId, initiatorItems, initiatorCredits,
        receiverItems, receiverCredits, message,
        initiatorValue, receiverValue, expiresAt
      ]
    );

    return {
      trade: await this.enrichTrade(trade!),
      valueWarning:
        diffPercent > MAX_VALUE_DIFFERENCE_PERCENT
          ? `Warning: This trade has a ${Math.round(diffPercent)}% value difference`
          : null,
    };
  },

  async getTradeRequest(tradeId: string, userId: string) {
    const trade = await queryOne<TradeRequest>(
      `SELECT * FROM trade_requests
       WHERE id = $1 AND (initiator_id = $2 OR receiver_id = $2)`,
      [tradeId, userId]
    );

    if (!trade) {
      return null;
    }

    return this.enrichTrade(trade);
  },

  async getIncomingTrades(userId: string) {
    const trades = await queryAll<TradeRequest>(
      `SELECT * FROM trade_requests
       WHERE receiver_id = $1 AND status IN ('pending', 'countered')
       ORDER BY created_at DESC`,
      [userId]
    );

    return Promise.all(trades.map((t) => this.enrichTrade(t)));
  },

  async getOutgoingTrades(userId: string) {
    const trades = await queryAll<TradeRequest>(
      `SELECT * FROM trade_requests
       WHERE initiator_id = $1 AND status IN ('pending', 'countered')
       ORDER BY created_at DESC`,
      [userId]
    );

    return Promise.all(trades.map((t) => this.enrichTrade(t)));
  },

  async getTradeHistory(userId: string, limit = 50) {
    const trades = await queryAll<Record<string, unknown>>(
      `SELECT * FROM trade_history
       WHERE user1_id = $1 OR user2_id = $1
       ORDER BY completed_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return trades;
  },

  // =====================================================
  // TRADE ACTIONS
  // =====================================================

  async acceptTrade(tradeId: string, receiverId: string) {
    return transaction(async (client: PoolClient) => {
      const tradeResult = await client.query<TradeRequest>(
        `SELECT * FROM trade_requests
         WHERE id = $1 AND receiver_id = $2 AND status IN ('pending', 'countered')
         FOR UPDATE`,
        [tradeId, receiverId]
      );

      const trade = tradeResult.rows[0];
      if (!trade) {
        throw new Error('Trade not found or already processed');
      }

      // Check trade hasn't expired
      if (new Date(trade.expires_at) < new Date()) {
        await client.query(
          `UPDATE trade_requests SET status = 'expired' WHERE id = $1`,
          [tradeId]
        );
        throw new Error('Trade has expired');
      }

      // Verify ownership again (items may have been traded/sold since)
      if (trade.initiator_items && trade.initiator_items.length > 0) {
        const initiatorOwnsResult = await client.query<UserCosmetic>(
          `SELECT id FROM user_spirit_cosmetics
           WHERE id = ANY($1) AND user_id = $2`,
          [trade.initiator_items, trade.initiator_id]
        );

        if (initiatorOwnsResult.rows.length !== trade.initiator_items.length) {
          throw new Error('Initiator no longer owns all offered items');
        }
      }

      if (trade.receiver_items && trade.receiver_items.length > 0) {
        const receiverOwnsResult = await client.query<UserCosmetic>(
          `SELECT id FROM user_spirit_cosmetics
           WHERE id = ANY($1) AND user_id = $2`,
          [trade.receiver_items, receiverId]
        );

        if (receiverOwnsResult.rows.length !== trade.receiver_items.length) {
          throw new Error('You no longer own all requested items');
        }
      }

      // Verify credits
      if (trade.initiator_credits > 0) {
        const initiatorBalanceResult = await client.query<{ balance: number }>(
          `SELECT balance FROM credit_balances WHERE user_id = $1`,
          [trade.initiator_id]
        );

        const initiatorBalance = initiatorBalanceResult.rows[0];
        if (!initiatorBalance || initiatorBalance.balance < trade.initiator_credits) {
          throw new Error('Initiator no longer has sufficient credits');
        }
      }

      if (trade.receiver_credits > 0) {
        const receiverBalanceResult = await client.query<{ balance: number }>(
          `SELECT balance FROM credit_balances WHERE user_id = $1`,
          [receiverId]
        );

        const receiverBalance = receiverBalanceResult.rows[0];
        if (!receiverBalance || receiverBalance.balance < trade.receiver_credits) {
          throw new Error('You do not have sufficient credits');
        }
      }

      // Execute the trade

      // Transfer initiator's items to receiver
      if (trade.initiator_items && trade.initiator_items.length > 0) {
        await client.query(
          `UPDATE user_spirit_cosmetics
           SET user_id = $1, acquired_at = NOW(), acquisition_method = 'trade'
           WHERE id = ANY($2)`,
          [receiverId, trade.initiator_items]
        );
      }

      // Transfer receiver's items to initiator
      if (trade.receiver_items && trade.receiver_items.length > 0) {
        await client.query(
          `UPDATE user_spirit_cosmetics
           SET user_id = $1, acquired_at = NOW(), acquisition_method = 'trade'
           WHERE id = ANY($2)`,
          [trade.initiator_id, trade.receiver_items]
        );
      }

      // Transfer credits
      if (trade.initiator_credits > 0) {
        await client.query(
          `UPDATE credit_balances SET balance = balance - $1 WHERE user_id = $2`,
          [trade.initiator_credits, trade.initiator_id]
        );
        await client.query(
          `UPDATE credit_balances SET balance = balance + $1 WHERE user_id = $2`,
          [trade.initiator_credits, receiverId]
        );
      }

      if (trade.receiver_credits > 0) {
        await client.query(
          `UPDATE credit_balances SET balance = balance - $1 WHERE user_id = $2`,
          [trade.receiver_credits, receiverId]
        );
        await client.query(
          `UPDATE credit_balances SET balance = balance + $1 WHERE user_id = $2`,
          [trade.receiver_credits, trade.initiator_id]
        );
      }

      // Update trade status
      await client.query(
        `UPDATE trade_requests
         SET status = 'completed', completed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [tradeId]
      );

      // Record in trade history
      const totalValue = trade.initiator_estimated_value + trade.receiver_estimated_value;

      // Get item details for history
      let initiatorItemDetails: { name: string; rarity: string }[] = [];
      if (trade.initiator_items && trade.initiator_items.length > 0) {
        const detailsResult = await client.query<{ name: string; rarity: string }>(
          `SELECT c.name, c.rarity
           FROM user_spirit_cosmetics u
           JOIN spirit_animal_cosmetics c ON u.cosmetic_id = c.id
           WHERE u.id = ANY($1)`,
          [trade.initiator_items]
        );
        initiatorItemDetails = detailsResult.rows;
      }

      let receiverItemDetails: { name: string; rarity: string }[] = [];
      if (trade.receiver_items && trade.receiver_items.length > 0) {
        const detailsResult = await client.query<{ name: string; rarity: string }>(
          `SELECT c.name, c.rarity
           FROM user_spirit_cosmetics u
           JOIN spirit_animal_cosmetics c ON u.cosmetic_id = c.id
           WHERE u.id = ANY($1)`,
          [trade.receiver_items]
        );
        receiverItemDetails = detailsResult.rows;
      }

      await client.query(
        `INSERT INTO trade_history (
          trade_id, user1_id, user2_id, user1_items, user1_credits,
          user2_items, user2_credits, total_value
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          tradeId, trade.initiator_id, receiverId,
          JSON.stringify(initiatorItemDetails), trade.initiator_credits,
          JSON.stringify(receiverItemDetails), trade.receiver_credits,
          totalValue
        ]
      );

      // Update user marketplace stats
      await this.updateTradeStatsWithClient(client, trade.initiator_id, totalValue / 2);
      await this.updateTradeStatsWithClient(client, receiverId, totalValue / 2);

      return { success: true, trade: { ...trade, status: 'completed' } };
    });
  },

  async declineTrade(tradeId: string, receiverId: string) {
    const trade = await queryOne<TradeRequest>(
      `SELECT * FROM trade_requests
       WHERE id = $1 AND receiver_id = $2 AND status IN ('pending', 'countered')`,
      [tradeId, receiverId]
    );

    if (!trade) {
      throw new Error('Trade not found or already processed');
    }

    await query(
      `UPDATE trade_requests SET status = 'declined', updated_at = NOW() WHERE id = $1`,
      [tradeId]
    );

    return { success: true };
  },

  async counterTrade(tradeId: string, receiverId: string, counter: CounterTradeInput) {
    const {
      initiatorItems = [],
      initiatorCredits = 0,
      receiverItems = [],
      receiverCredits = 0,
      message,
    } = counter;

    const trade = await queryOne<TradeRequest>(
      `SELECT * FROM trade_requests
       WHERE id = $1 AND receiver_id = $2 AND status IN ('pending', 'countered')`,
      [tradeId, receiverId]
    );

    if (!trade) {
      throw new Error('Trade not found or already processed');
    }

    // Validate counter offer
    if (initiatorItems.length > MAX_ITEMS_PER_SIDE || receiverItems.length > MAX_ITEMS_PER_SIDE) {
      throw new Error(`Maximum ${MAX_ITEMS_PER_SIDE} items per side`);
    }

    // Verify receiver owns counter items
    if (receiverItems.length > 0) {
      const owned = await queryAll<UserCosmetic>(
        `SELECT id FROM user_spirit_cosmetics
         WHERE id = ANY($1) AND user_id = $2`,
        [receiverItems, receiverId]
      );

      if (owned.length !== receiverItems.length) {
        throw new Error('You do not own all the items in your counter offer');
      }
    }

    // Verify initiator owns requested items
    if (initiatorItems.length > 0) {
      const initiatorOwns = await queryAll<UserCosmetic>(
        `SELECT id FROM user_spirit_cosmetics
         WHERE id = ANY($1) AND user_id = $2`,
        [initiatorItems, trade.initiator_id]
      );

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
    await query(
      `UPDATE trade_requests SET
        status = 'countered',
        initiator_id = $1,
        receiver_id = $2,
        initiator_items = $3,
        initiator_credits = $4,
        receiver_items = $5,
        receiver_credits = $6,
        initiator_estimated_value = $7,
        receiver_estimated_value = $8,
        message = $9,
        counter_count = counter_count + 1,
        expires_at = $10,
        updated_at = NOW()
      WHERE id = $11`,
      [
        receiverId, trade.initiator_id,
        receiverItems, receiverCredits,
        initiatorItems, initiatorCredits,
        receiverValue, initiatorValue,
        message, expiresAt, tradeId
      ]
    );

    const updatedTrade = await queryOne<TradeRequest>(
      `SELECT * FROM trade_requests WHERE id = $1`,
      [tradeId]
    );

    return { trade: await this.enrichTrade(updatedTrade!) };
  },

  async cancelTrade(tradeId: string, initiatorId: string) {
    const trade = await queryOne<TradeRequest>(
      `SELECT * FROM trade_requests
       WHERE id = $1 AND initiator_id = $2 AND status IN ('pending', 'countered')`,
      [tradeId, initiatorId]
    );

    if (!trade) {
      throw new Error('Trade not found or you are not the initiator');
    }

    await query(
      `UPDATE trade_requests SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [tradeId]
    );

    return { success: true };
  },

  // =====================================================
  // VALUE CALCULATION
  // =====================================================

  async calculateTradeValue(itemIds: string[], credits: number): Promise<number> {
    let itemValue = 0;

    if (itemIds.length > 0) {
      // FIXED: Batch query instead of N+1 pattern
      // Get items and their average sale prices in a single query
      const itemsWithPrices = await queryAll<{ id: string; base_price: number; avg_sale: number | null }>(
        `SELECT c.id, c.base_price, avg_prices.avg_sale
         FROM user_spirit_cosmetics u
         JOIN spirit_animal_cosmetics c ON u.cosmetic_id = c.id
         LEFT JOIN (
           SELECT cosmetic_id, AVG(sale_price) as avg_sale
           FROM marketplace_transactions
           WHERE created_at > NOW() - INTERVAL '30 days'
           GROUP BY cosmetic_id
         ) avg_prices ON avg_prices.cosmetic_id = c.id
         WHERE u.id = ANY($1)`,
        [itemIds]
      );

      for (const item of itemsWithPrices) {
        itemValue += item.avg_sale || item.base_price || 100;
      }
    }

    return Math.round(itemValue + credits);
  },

  async estimateTradeValue(itemIds: string[]) {
    if (itemIds.length === 0) {
      return { itemValues: [], totalValue: 0 };
    }

    // FIXED: Batch query instead of N+1 pattern
    // Get all items and their average sale prices in a single query
    const itemsWithPrices = await queryAll<{
      user_cosmetic_id: string;
      id: string;
      name: string;
      base_price: number;
      avg_sale: number | null;
    }>(
      `SELECT u.id as user_cosmetic_id, c.id, c.name, c.base_price, avg_prices.avg_sale
       FROM user_spirit_cosmetics u
       JOIN spirit_animal_cosmetics c ON u.cosmetic_id = c.id
       LEFT JOIN (
         SELECT cosmetic_id, AVG(sale_price) as avg_sale
         FROM marketplace_transactions
         WHERE created_at > NOW() - INTERVAL '30 days'
         GROUP BY cosmetic_id
       ) avg_prices ON avg_prices.cosmetic_id = c.id
       WHERE u.id = ANY($1)`,
      [itemIds]
    );

    const values = itemsWithPrices.map(item => ({
      itemId: item.user_cosmetic_id,
      name: item.name,
      estimatedValue: Math.round(item.avg_sale || item.base_price || 100),
    }));

    const totalValue = values.reduce((sum, v) => sum + v.estimatedValue, 0);

    return { itemValues: values, totalValue };
  },

  // =====================================================
  // HELPERS
  // =====================================================

  async enrichTrade(trade: TradeRequest) {
    const [initiator, receiver] = await Promise.all([
      queryOne<UserBasic>(
        `SELECT id, username, avatar_url FROM users WHERE id = $1`,
        [trade.initiator_id]
      ),
      queryOne<UserBasic>(
        `SELECT id, username, avatar_url FROM users WHERE id = $1`,
        [trade.receiver_id]
      ),
    ]);

    let initiatorItemDetails: Record<string, unknown>[] = [];
    if (trade.initiator_items && trade.initiator_items.length > 0) {
      initiatorItemDetails = await queryAll<Record<string, unknown>>(
        `SELECT u.id as user_cosmetic_id, c.*
         FROM user_spirit_cosmetics u
         JOIN spirit_animal_cosmetics c ON u.cosmetic_id = c.id
         WHERE u.id = ANY($1)`,
        [trade.initiator_items]
      );
    }

    let receiverItemDetails: Record<string, unknown>[] = [];
    if (trade.receiver_items && trade.receiver_items.length > 0) {
      receiverItemDetails = await queryAll<Record<string, unknown>>(
        `SELECT u.id as user_cosmetic_id, c.*
         FROM user_spirit_cosmetics u
         JOIN spirit_animal_cosmetics c ON u.cosmetic_id = c.id
         WHERE u.id = ANY($1)`,
        [trade.receiver_items]
      );
    }

    return {
      ...trade,
      initiator,
      receiver,
      initiatorItemDetails,
      receiverItemDetails,
    };
  },

  async updateTradeStatsWithClient(client: PoolClient, userId: string, valueExchanged: number) {
    // Upsert user marketplace stats
    await client.query(
      `INSERT INTO user_marketplace_stats (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    await client.query(
      `UPDATE user_marketplace_stats
       SET total_trades = total_trades + 1,
           trade_value_exchanged = trade_value_exchanged + $1,
           updated_at = NOW()
       WHERE user_id = $2`,
      [Math.round(valueExchanged), userId]
    );
  },

  // Expire old trades
  async expireOldTrades() {
    const result = await query(
      `UPDATE trade_requests
       SET status = 'expired', updated_at = NOW()
       WHERE status IN ('pending', 'countered') AND expires_at < NOW()`
    );

    return result.rowCount || 0;
  },
};
