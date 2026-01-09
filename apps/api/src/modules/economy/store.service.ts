/**
 * Store Service
 *
 * Handles the in-app store for purchasing:
 * - Training Buddy species and cosmetics
 * - App cosmetics (frames, themes, trails)
 * - Community actions (tips, boosts, challenges)
 * - Utility unlocks (analytics, export, support)
 * - Trainer features (promotion, verification)
 * - Status/prestige items
 */

import crypto from 'crypto';
import { queryOne, queryAll, query, serializableTransaction } from '../../db/client';
import { ValidationError, NotFoundError, ForbiddenError } from '../../lib/errors';
import { loggers } from '../../lib/logger';
import { creditService } from './credit.service';
import { walletService } from './wallet.service';

const log = loggers.economy;

// Safe JSON parse helper
function safeJsonParse<T>(str: string | null | undefined, defaultValue: T): T {
  if (!str || str.trim() === '') return defaultValue;
  try {
    return JSON.parse(str) as T;
  } catch {
    return defaultValue;
  }
}

export interface StoreItem {
  sku: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  priceCredits: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  limitedQuantity?: number;
  soldCount: number;
  requiresLevel: number;
  requiresItems: string[];
  metadata: Record<string, unknown>;
  enabled: boolean;
  featured: boolean;
  sortOrder: number;
}

export interface InventoryItem {
  id: string;
  userId: string;
  sku: string;
  item: StoreItem;
  quantity: number;
  purchasedAt: Date;
  expiresAt?: Date;
}

export interface PurchaseResult {
  success: boolean;
  inventoryId?: string;
  newBalance?: number;
  error?: string;
}

export const storeService = {
  /**
   * Get all store items with optional filtering
   */
  async getItems(options: {
    category?: string;
    rarity?: string;
    featured?: boolean;
    enabledOnly?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ items: StoreItem[]; total: number }> {
    const { category, rarity, featured, enabledOnly = true, limit = 100, offset = 0 } = options;

    let whereClause = enabledOnly ? 'enabled = TRUE' : '1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (category) {
      whereClause += ` AND category = $${paramIndex++}`;
      params.push(category);
    }

    if (rarity) {
      whereClause += ` AND rarity = $${paramIndex++}`;
      params.push(rarity);
    }

    if (featured !== undefined) {
      whereClause += ` AND featured = $${paramIndex++}`;
      params.push(featured);
    }

    params.push(limit, offset);

    const rows = await queryAll<{
      sku: string;
      name: string;
      description: string | null;
      category: string;
      subcategory: string | null;
      price_credits: number;
      rarity: string;
      limited_quantity: number | null;
      sold_count: number;
      requires_level: number;
      requires_items: string;
      metadata: string;
      enabled: boolean;
      featured: boolean;
      sort_order: number;
    }>(
      `SELECT * FROM store_items
       WHERE ${whereClause}
       ORDER BY sort_order, category, rarity DESC, price_credits
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM store_items WHERE ${whereClause}`,
      params.slice(0, -2)
    );

    return {
      items: rows.map((r) => ({
        sku: r.sku,
        name: r.name,
        description: r.description ?? undefined,
        category: r.category,
        subcategory: r.subcategory ?? undefined,
        priceCredits: r.price_credits,
        rarity: r.rarity as StoreItem['rarity'],
        limitedQuantity: r.limited_quantity ?? undefined,
        soldCount: r.sold_count,
        requiresLevel: r.requires_level,
        requiresItems: safeJsonParse<string[]>(r.requires_items, []),
        metadata: safeJsonParse<Record<string, unknown>>(r.metadata, {}),
        enabled: r.enabled,
        featured: r.featured,
        sortOrder: r.sort_order,
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  },

  /**
   * Get a specific store item by SKU
   */
  async getItem(sku: string): Promise<StoreItem | null> {
    const row = await queryOne<{
      sku: string;
      name: string;
      description: string | null;
      category: string;
      subcategory: string | null;
      price_credits: number;
      rarity: string;
      limited_quantity: number | null;
      sold_count: number;
      requires_level: number;
      requires_items: string;
      metadata: string;
      enabled: boolean;
      featured: boolean;
      sort_order: number;
    }>('SELECT * FROM store_items WHERE sku = $1', [sku]);

    if (!row) return null;

    return {
      sku: row.sku,
      name: row.name,
      description: row.description ?? undefined,
      category: row.category,
      subcategory: row.subcategory ?? undefined,
      priceCredits: row.price_credits,
      rarity: row.rarity as StoreItem['rarity'],
      limitedQuantity: row.limited_quantity ?? undefined,
      soldCount: row.sold_count,
      requiresLevel: row.requires_level,
      requiresItems: safeJsonParse<string[]>(row.requires_items, []),
      metadata: safeJsonParse<Record<string, unknown>>(row.metadata, {}),
      enabled: row.enabled,
      featured: row.featured,
      sortOrder: row.sort_order,
    };
  },

  /**
   * Get store categories
   */
  async getCategories(): Promise<Array<{ category: string; count: number }>> {
    const rows = await queryAll<{ category: string; count: string }>(
      `SELECT category, COUNT(*) as count
       FROM store_items
       WHERE enabled = TRUE
       GROUP BY category
       ORDER BY category`
    );

    return rows.map((r) => ({ category: r.category, count: parseInt(r.count, 10) }));
  },

  /**
   * Purchase a store item
   */
  async purchase(userId: string, sku: string, metadata?: Record<string, unknown>): Promise<PurchaseResult> {
    // Get item
    const item = await this.getItem(sku);
    if (!item) {
      throw new NotFoundError('Item not found');
    }

    if (!item.enabled) {
      throw new ValidationError('Item is not available for purchase');
    }

    // Check limited quantity
    if (item.limitedQuantity !== undefined && item.soldCount >= item.limitedQuantity) {
      throw new ValidationError('Item is sold out');
    }

    // Check if user already owns non-consumable item
    if (!this.isConsumable(item.category)) {
      const existing = await queryOne<{ id: string }>(
        'SELECT id FROM user_inventory WHERE user_id = $1 AND sku = $2',
        [userId, sku]
      );

      if (existing) {
        throw new ValidationError('You already own this item');
      }
    }

    // Check wallet status
    const canTransact = await walletService.canTransact(userId);
    if (!canTransact.allowed) {
      throw new ForbiddenError(canTransact.reason);
    }

    // Check level requirements
    if (item.requiresLevel > 1) {
      const buddy = await queryOne<{ level: number }>(
        'SELECT level FROM training_buddies WHERE user_id = $1',
        [userId]
      );

      if (!buddy || buddy.level < item.requiresLevel) {
        throw new ValidationError(`Requires buddy level ${item.requiresLevel}`);
      }
    }

    // Check required items
    if (item.requiresItems.length > 0) {
      const ownedItems = await queryAll<{ sku: string }>(
        'SELECT sku FROM user_inventory WHERE user_id = $1',
        [userId]
      );
      const ownedSkus = new Set(ownedItems.map((i) => i.sku));

      for (const required of item.requiresItems) {
        if (!ownedSkus.has(required)) {
          throw new ValidationError(`Requires item: ${required}`);
        }
      }
    }

    // Process purchase
    const inventoryId = `inv_${crypto.randomBytes(12).toString('hex')}`;
    const idempotencyKey = `purchase-${userId}-${sku}-${Date.now()}`;

    try {
      const result = await serializableTransaction(async (client) => {
        // Check balance
        const balance = await client.query<{ balance: number }>(
          'SELECT balance FROM credit_balances WHERE user_id = $1 FOR UPDATE',
          [userId]
        );

        if (balance.rows.length === 0 || balance.rows[0].balance < item.priceCredits) {
          throw new ValidationError('Insufficient credits');
        }

        const newBalance = balance.rows[0].balance - item.priceCredits;
        const txId = `txn_${crypto.randomBytes(12).toString('hex')}`;

        // Debit credits
        await client.query(
          `UPDATE credit_balances
           SET balance = $1, lifetime_spent = lifetime_spent + $2, version = version + 1, updated_at = NOW()
           WHERE user_id = $3`,
          [newBalance, item.priceCredits, userId]
        );

        // Create ledger entry
        await client.query(
          `INSERT INTO credit_ledger (id, user_id, action, amount, balance_after, metadata, idempotency_key)
           VALUES ($1, $2, 'purchase', $3, $4, $5, $6)`,
          [txId, userId, -item.priceCredits, newBalance, JSON.stringify({ sku, itemName: item.name, ...metadata }), idempotencyKey]
        );

        // Add to inventory
        await client.query(
          `INSERT INTO user_inventory (id, user_id, sku, purchase_tx_id, metadata)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id, sku) DO UPDATE SET
             quantity = user_inventory.quantity + 1,
             purchased_at = NOW()`,
          [inventoryId, userId, sku, txId, metadata ? JSON.stringify(metadata) : '{}']
        );

        // Update sold count
        await client.query(
          'UPDATE store_items SET sold_count = sold_count + 1, updated_at = NOW() WHERE sku = $1',
          [sku]
        );

        return { newBalance };
      });

      log.info({
        inventoryId,
        userId,
        sku,
        itemName: item.name,
        priceCredits: item.priceCredits,
      }, 'Store purchase completed');

      return {
        success: true,
        inventoryId,
        newBalance: result.newBalance,
      };
    } catch (error: any) {
      if (error.message?.includes('Insufficient')) {
        return { success: false, error: 'Insufficient credits' };
      }
      if (error.message?.includes('already own')) {
        return { success: false, error: 'You already own this item' };
      }
      log.error({ userId, sku, error }, 'Store purchase failed');
      throw error;
    }
  },

  /**
   * Get user's inventory
   */
  async getInventory(userId: string, options: {
    category?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ items: InventoryItem[]; total: number }> {
    const { category, limit = 100, offset = 0 } = options;

    let whereClause = 'ui.user_id = $1';
    const params: unknown[] = [userId];
    let paramIndex = 2;

    if (category) {
      whereClause += ` AND si.category = $${paramIndex++}`;
      params.push(category);
    }

    params.push(limit, offset);

    const rows = await queryAll<{
      id: string;
      user_id: string;
      sku: string;
      quantity: number;
      purchased_at: Date;
      expires_at: Date | null;
      item_name: string;
      item_description: string | null;
      item_category: string;
      item_subcategory: string | null;
      item_price: number;
      item_rarity: string;
      item_metadata: string;
    }>(
      `SELECT ui.id, ui.user_id, ui.sku, ui.quantity, ui.purchased_at, ui.expires_at,
              si.name as item_name, si.description as item_description, si.category as item_category,
              si.subcategory as item_subcategory, si.price_credits as item_price, si.rarity as item_rarity,
              si.metadata as item_metadata
       FROM user_inventory ui
       JOIN store_items si ON si.sku = ui.sku
       WHERE ${whereClause}
       ORDER BY ui.purchased_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM user_inventory ui
       JOIN store_items si ON si.sku = ui.sku
       WHERE ${whereClause}`,
      params.slice(0, -2)
    );

    return {
      items: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        sku: r.sku,
        item: {
          sku: r.sku,
          name: r.item_name,
          description: r.item_description ?? undefined,
          category: r.item_category,
          subcategory: r.item_subcategory ?? undefined,
          priceCredits: r.item_price,
          rarity: r.item_rarity as StoreItem['rarity'],
          soldCount: 0,
          requiresLevel: 1,
          requiresItems: [],
          metadata: safeJsonParse<Record<string, unknown>>(r.item_metadata, {}),
          enabled: true,
          featured: false,
          sortOrder: 0,
        },
        quantity: r.quantity,
        purchasedAt: r.purchased_at,
        expiresAt: r.expires_at ?? undefined,
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  },

  /**
   * Check if user owns an item
   */
  async ownsItem(userId: string, sku: string): Promise<boolean> {
    const result = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM user_inventory WHERE user_id = $1 AND sku = $2',
      [userId, sku]
    );
    return parseInt(result?.count || '0', 10) > 0;
  },

  /**
   * Get all items owned by user as a set of SKUs
   */
  async getOwnedSkus(userId: string): Promise<Set<string>> {
    const rows = await queryAll<{ sku: string }>(
      'SELECT sku FROM user_inventory WHERE user_id = $1',
      [userId]
    );
    return new Set(rows.map((r) => r.sku));
  },

  /**
   * Check if a category is consumable (can be purchased multiple times)
   */
  isConsumable(category: string): boolean {
    const consumableCategories = [
      'community_tip',
      'community_bounty',
      'community_challenge',
      'community_boost',
      'community_shoutout',
      'community_gift',
    ];
    return consumableCategories.includes(category);
  },

  /**
   * Get featured items
   */
  async getFeaturedItems(limit: number = 10): Promise<StoreItem[]> {
    const { items } = await this.getItems({ featured: true, limit });
    return items;
  },

  /**
   * Get items by rarity
   */
  async getItemsByRarity(rarity: string, limit: number = 20): Promise<StoreItem[]> {
    const { items } = await this.getItems({ rarity, limit });
    return items;
  },

  /**
   * Admin: Grant an item to a user
   */
  async grantItem(userId: string, sku: string, adminUserId: string, reason: string): Promise<string> {
    const item = await this.getItem(sku);
    if (!item) {
      throw new NotFoundError('Item not found');
    }

    const inventoryId = `inv_${crypto.randomBytes(12).toString('hex')}`;

    await query(
      `INSERT INTO user_inventory (id, user_id, sku, metadata)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, sku) DO UPDATE SET
         quantity = user_inventory.quantity + 1,
         purchased_at = NOW()`,
      [inventoryId, userId, sku, JSON.stringify({ grantedBy: adminUserId, reason })]
    );

    // Audit log
    await walletService.logAdminAction({
      adminUserId,
      action: 'grant_item',
      targetUserId: userId,
      reason,
      details: { sku, itemName: item.name },
    });

    log.info({ inventoryId, userId, sku, adminUserId, reason }, 'Item granted by admin');

    return inventoryId;
  },

  /**
   * Admin: Revoke an item from a user
   */
  async revokeItem(userId: string, sku: string, adminUserId: string, reason: string): Promise<void> {
    const item = await this.getItem(sku);
    if (!item) {
      throw new NotFoundError('Item not found');
    }

    await query(
      'DELETE FROM user_inventory WHERE user_id = $1 AND sku = $2',
      [userId, sku]
    );

    // Audit log
    await walletService.logAdminAction({
      adminUserId,
      action: 'revoke_item',
      targetUserId: userId,
      reason,
      details: { sku, itemName: item.name },
    });

    log.info({ userId, sku, adminUserId, reason }, 'Item revoked by admin');
  },
};

export default storeService;
