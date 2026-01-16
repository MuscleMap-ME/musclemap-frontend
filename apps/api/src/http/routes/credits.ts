/**
 * Credits Economy Routes (Fastify)
 *
 * Comprehensive routes for the credits economy:
 * - Wallet operations (balance, transfers, history)
 * - Store (catalog, purchases, inventory)
 * - Training Buddy (creation, XP, cosmetics)
 * - Admin operations (adjustments, freezes, reversals)
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRole } from './auth';
import { walletService } from '../../modules/economy/wallet.service';
import { storeService } from '../../modules/economy/store.service';
import { buddyService, BUDDY_SPECIES } from '../../modules/economy/buddy.service';
import { earningService } from '../../modules/economy/earning.service';
import { antiabuseService, FlagStatus } from '../../modules/economy/antiabuse.service';
import { trustService } from '../../modules/economy/trust.service';
import { escrowService } from '../../modules/economy/escrow.service';
import { disputeService } from '../../modules/economy/dispute.service';
import { loggers } from '../../lib/logger';

const _log = loggers.http;

// Schemas
const transferSchema = z.object({
  recipientId: z.string().min(1),
  amount: z.number().int().min(1).max(1000000),
  note: z.string().max(500).optional(),
  tipType: z.enum(['trainer', 'user', 'group']).optional(),
});

const purchaseSchema = z.object({
  sku: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

const createBuddySchema = z.object({
  species: z.enum(BUDDY_SPECIES as unknown as [string, ...string[]]),
  nickname: z.string().max(30).optional(),
});

const equipCosmeticSchema = z.object({
  sku: z.string().min(1),
  slot: z.enum(['aura', 'armor', 'wings', 'tool', 'skin', 'emote_pack', 'voice_pack']),
});

const buddySettingsSchema = z.object({
  visible: z.boolean().optional(),
  showOnProfile: z.boolean().optional(),
  showInWorkouts: z.boolean().optional(),
});

const adminAdjustSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int(),
  reason: z.string().min(1).max(500),
});

const adminFreezeSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().min(1).max(500),
});

const adminReverseSchema = z.object({
  transactionId: z.string().min(1),
  reason: z.string().min(1).max(500),
});

export async function registerCreditsRoutes(app: FastifyInstance) {
  // ============================================
  // WALLET ROUTES
  // ============================================

  // Get wallet details
  app.get('/wallet', { preHandler: authenticate }, async (request, reply) => {
    const wallet = await walletService.getWalletDetails(request.user!.userId);
    return reply.send({ data: wallet });
  });

  // Get transaction history (keyset pagination)
  app.get('/wallet/transactions', { preHandler: authenticate }, async (request, reply) => {
    const queryParams = request.query as { limit?: string; cursor?: string; action?: string };
    const limit = Math.min(parseInt(queryParams.limit || '50'), 100);

    // Parse cursor for keyset pagination
    let cursorData: { createdAt: string; id: string } | null = null;
    if (queryParams.cursor) {
      try {
        cursorData = JSON.parse(Buffer.from(queryParams.cursor, 'base64').toString());
      } catch {
        // Invalid cursor, start from beginning
      }
    }

    const { queryAll } = await import('../../db/client');

    // Build keyset query
    let whereClause = 'user_id = $1';
    const params: unknown[] = [request.user!.userId];
    let paramIndex = 2;

    if (queryParams.action) {
      whereClause += ` AND action = $${paramIndex++}`;
      params.push(queryParams.action);
    }

    if (cursorData) {
      whereClause += ` AND (created_at, id) < ($${paramIndex++}, $${paramIndex++})`;
      params.push(cursorData.createdAt, cursorData.id);
    }

    // Fetch one extra to determine if there are more results
    params.push(limit + 1);

    const rows = await queryAll<{
      id: string;
      action: string;
      amount: number;
      balance_after: number;
      metadata: Record<string, unknown> | null;
      created_at: Date;
    }>(
      `SELECT id, action, amount, balance_after, metadata, created_at
       FROM credit_ledger
       WHERE ${whereClause}
       ORDER BY created_at DESC, id DESC
       LIMIT $${paramIndex}`,
      params
    );

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, -1) : rows;

    // Build next cursor
    const nextCursor = items.length > 0 && hasMore
      ? Buffer.from(JSON.stringify({
          createdAt: items[items.length - 1].created_at,
          id: items[items.length - 1].id
        })).toString('base64')
      : null;

    return reply.send({
      data: items.map((row) => ({
        id: row.id,
        action: row.action,
        amount: row.amount,
        balanceAfter: row.balance_after,
        metadata: row.metadata || null,
        createdAt: row.created_at,
      })),
      meta: { limit, hasMore, nextCursor },
    });
  });

  // Transfer credits
  app.post('/wallet/transfer', { preHandler: authenticate }, async (request, reply) => {
    const data = transferSchema.parse(request.body);

    const result = await walletService.transfer({
      senderId: request.user!.userId,
      recipientId: data.recipientId,
      amount: data.amount,
      note: data.note,
      tipType: data.tipType,
    });

    return reply.send({ data: result });
  });

  // Get transfer history (keyset pagination)
  app.get('/wallet/transfers', { preHandler: authenticate }, async (request, reply) => {
    const queryParams = request.query as { direction?: string; limit?: string; cursor?: string };
    const limit = Math.min(parseInt(queryParams.limit || '50'), 100);
    const direction = queryParams.direction as 'sent' | 'received' | 'all' | undefined;

    // Parse cursor for keyset pagination
    let cursorData: { createdAt: string; id: string } | null = null;
    if (queryParams.cursor) {
      try {
        cursorData = JSON.parse(Buffer.from(queryParams.cursor, 'base64').toString());
      } catch {
        // Invalid cursor, start from beginning
      }
    }

    const { queryAll } = await import('../../db/client');

    // Build keyset query
    let whereClause = direction === 'sent'
      ? 'sender_id = $1'
      : direction === 'received'
        ? 'recipient_id = $1'
        : '(sender_id = $1 OR recipient_id = $1)';

    const params: unknown[] = [request.user!.userId];
    let paramIndex = 2;

    if (cursorData) {
      whereClause += ` AND (created_at, id) < ($${paramIndex++}, $${paramIndex++})`;
      params.push(cursorData.createdAt, cursorData.id);
    }

    // Fetch one extra to determine if there are more results
    params.push(limit + 1);

    const rows = await queryAll<{
      id: string;
      sender_id: string;
      recipient_id: string;
      amount: number;
      note: string | null;
      status: string;
      created_at: Date;
    }>(
      `SELECT id, sender_id, recipient_id, amount, note, status, created_at
       FROM credit_transfers
       WHERE ${whereClause}
       ORDER BY created_at DESC, id DESC
       LIMIT $${paramIndex}`,
      params
    );

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, -1) : rows;

    // Build next cursor
    const nextCursor = items.length > 0 && hasMore
      ? Buffer.from(JSON.stringify({
          createdAt: items[items.length - 1].created_at,
          id: items[items.length - 1].id
        })).toString('base64')
      : null;

    return reply.send({
      data: items.map((row) => ({
        id: row.id,
        senderId: row.sender_id,
        recipientId: row.recipient_id,
        amount: row.amount,
        note: row.note ?? undefined,
        status: row.status,
        createdAt: row.created_at,
        direction: row.sender_id === request.user!.userId ? 'sent' : 'received',
      })),
      meta: { limit, hasMore, nextCursor },
    });
  });

  // Get earning history (keyset pagination)
  app.get('/wallet/earnings', { preHandler: authenticate }, async (request, reply) => {
    const queryParams = request.query as { limit?: string; cursor?: string; category?: string };
    const limit = Math.min(parseInt(queryParams.limit || '50'), 100);

    // Parse cursor for keyset pagination
    let cursorData: { createdAt: string; id: string } | null = null;
    if (queryParams.cursor) {
      try {
        cursorData = JSON.parse(Buffer.from(queryParams.cursor, 'base64').toString());
      } catch {
        // Invalid cursor, start from beginning
      }
    }

    const { queryAll } = await import('../../db/client');

    // Build keyset query
    let whereClause = 'ea.user_id = $1';
    const params: unknown[] = [request.user!.userId];
    let paramIndex = 2;

    if (queryParams.category) {
      whereClause += ` AND er.category = $${paramIndex++}`;
      params.push(queryParams.category);
    }

    if (cursorData) {
      whereClause += ` AND (ea.created_at, ea.id) < ($${paramIndex++}, $${paramIndex++})`;
      params.push(cursorData.createdAt, cursorData.id);
    }

    // Fetch one extra to determine if there are more results
    params.push(limit + 1);

    const rows = await queryAll<{
      id: string;
      rule_code: string;
      rule_name: string;
      category: string;
      source_type: string;
      source_id: string;
      credits_awarded: number;
      xp_awarded: number;
      created_at: Date;
    }>(
      `SELECT ea.id, ea.rule_code, er.name as rule_name, er.category,
              ea.source_type, ea.source_id, ea.credits_awarded, ea.xp_awarded, ea.created_at
       FROM earning_awards ea
       JOIN earning_rules er ON er.code = ea.rule_code
       WHERE ${whereClause}
       ORDER BY ea.created_at DESC, ea.id DESC
       LIMIT $${paramIndex}`,
      params
    );

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, -1) : rows;

    // Build next cursor
    const nextCursor = items.length > 0 && hasMore
      ? Buffer.from(JSON.stringify({
          createdAt: items[items.length - 1].created_at,
          id: items[items.length - 1].id
        })).toString('base64')
      : null;

    return reply.send({
      data: items.map((r) => ({
        id: r.id,
        ruleCode: r.rule_code,
        ruleName: r.rule_name,
        category: r.category,
        sourceType: r.source_type,
        sourceId: r.source_id,
        creditsAwarded: r.credits_awarded,
        xpAwarded: r.xp_awarded,
        createdAt: r.created_at,
      })),
      meta: { limit, hasMore, nextCursor },
    });
  });

  // ============================================
  // STORE ROUTES
  // ============================================

  // Get store categories
  app.get('/store/categories', async (request, reply) => {
    const categories = await storeService.getCategories();
    return reply.send({ data: categories });
  });

  // Get store items (keyset pagination)
  app.get('/store/items', async (request, reply) => {
    const queryParams = request.query as {
      category?: string;
      rarity?: string;
      featured?: string;
      limit?: string;
      cursor?: string;
    };

    const limit = Math.min(parseInt(queryParams.limit || '50'), 100);

    // Parse cursor for keyset pagination
    let cursorData: { sortOrder: number; sku: string } | null = null;
    if (queryParams.cursor) {
      try {
        cursorData = JSON.parse(Buffer.from(queryParams.cursor, 'base64').toString());
      } catch {
        // Invalid cursor, start from beginning
      }
    }

    const { queryAll } = await import('../../db/client');

    // Build keyset query
    let whereClause = 'enabled = TRUE';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (queryParams.category) {
      whereClause += ` AND category = $${paramIndex++}`;
      params.push(queryParams.category);
    }

    if (queryParams.rarity) {
      whereClause += ` AND rarity = $${paramIndex++}`;
      params.push(queryParams.rarity);
    }

    if (queryParams.featured === 'true') {
      whereClause += ` AND featured = TRUE`;
    }

    if (cursorData) {
      whereClause += ` AND (sort_order, sku) > ($${paramIndex++}, $${paramIndex++})`;
      params.push(cursorData.sortOrder, cursorData.sku);
    }

    // Fetch one extra to determine if there are more results
    params.push(limit + 1);

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
      requires_items: unknown;
      metadata: unknown;
      enabled: boolean;
      featured: boolean;
      sort_order: number;
    }>(
      `SELECT * FROM store_items
       WHERE ${whereClause}
       ORDER BY sort_order ASC, sku ASC
       LIMIT $${paramIndex}`,
      params
    );

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, -1) : rows;

    // Safe JSON parse helper
    const safeJsonParse = <T>(value: unknown, defaultValue: T): T => {
      if (value === null || value === undefined) return defaultValue;
      if (typeof value === 'object') return value as T;
      if (typeof value === 'string') {
        if (value.trim() === '') return defaultValue;
        try {
          return JSON.parse(value) as T;
        } catch {
          return defaultValue;
        }
      }
      return defaultValue;
    };

    // Build next cursor
    const nextCursor = items.length > 0 && hasMore
      ? Buffer.from(JSON.stringify({
          sortOrder: items[items.length - 1].sort_order,
          sku: items[items.length - 1].sku
        })).toString('base64')
      : null;

    return reply.send({
      data: items.map((r) => ({
        sku: r.sku,
        name: r.name,
        description: r.description ?? undefined,
        category: r.category,
        subcategory: r.subcategory ?? undefined,
        priceCredits: r.price_credits,
        rarity: r.rarity,
        limitedQuantity: r.limited_quantity ?? undefined,
        soldCount: r.sold_count,
        requiresLevel: r.requires_level,
        requiresItems: safeJsonParse<string[]>(r.requires_items, []),
        metadata: safeJsonParse<Record<string, unknown>>(r.metadata, {}),
        enabled: r.enabled,
        featured: r.featured,
        sortOrder: r.sort_order,
      })),
      meta: { limit, hasMore, nextCursor },
    });
  });

  // Get featured items
  app.get('/store/featured', async (request, reply) => {
    const items = await storeService.getFeaturedItems();
    return reply.send({ data: items });
  });

  // Get single item
  app.get('/store/items/:sku', async (request, reply) => {
    const { sku } = request.params as { sku: string };
    const item = await storeService.getItem(sku);

    if (!item) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Item not found', statusCode: 404 },
      });
    }

    return reply.send({ data: item });
  });

  // Purchase item
  app.post('/store/purchase', { preHandler: authenticate }, async (request, reply) => {
    const data = purchaseSchema.parse(request.body);

    try {
      const result = await storeService.purchase(request.user!.userId, data.sku, data.metadata);

      if (!result.success) {
        if (result.error?.includes('Insufficient')) {
          return reply.status(402).send({
            error: { code: 'INSUFFICIENT_CREDITS', message: result.error, statusCode: 402 },
          });
        }
        return reply.status(400).send({
          error: { code: 'PURCHASE_FAILED', message: result.error || 'Purchase failed', statusCode: 400 },
        });
      }

      return reply.send({ data: result });
    } catch (error: any) {
      if (error.statusCode === 402) {
        return reply.status(402).send({
          error: { code: 'INSUFFICIENT_CREDITS', message: error.message, statusCode: 402 },
        });
      }
      throw error;
    }
  });

  // Get user inventory (keyset pagination)
  app.get('/store/inventory', { preHandler: authenticate }, async (request, reply) => {
    const queryParams = request.query as { category?: string; limit?: string; cursor?: string };
    const limit = Math.min(parseInt(queryParams.limit || '100'), 200);

    // Parse cursor for keyset pagination
    let cursorData: { purchasedAt: string; id: string } | null = null;
    if (queryParams.cursor) {
      try {
        cursorData = JSON.parse(Buffer.from(queryParams.cursor, 'base64').toString());
      } catch {
        // Invalid cursor, start from beginning
      }
    }

    const { queryAll } = await import('../../db/client');

    // Build keyset query
    let whereClause = 'ui.user_id = $1';
    const params: unknown[] = [request.user!.userId];
    let paramIndex = 2;

    if (queryParams.category) {
      whereClause += ` AND si.category = $${paramIndex++}`;
      params.push(queryParams.category);
    }

    if (cursorData) {
      whereClause += ` AND (ui.purchased_at, ui.id) < ($${paramIndex++}, $${paramIndex++})`;
      params.push(cursorData.purchasedAt, cursorData.id);
    }

    // Fetch one extra to determine if there are more results
    params.push(limit + 1);

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
      item_metadata: unknown;
    }>(
      `SELECT ui.id, ui.user_id, ui.sku, ui.quantity, ui.purchased_at, ui.expires_at,
              si.name as item_name, si.description as item_description, si.category as item_category,
              si.subcategory as item_subcategory, si.price_credits as item_price, si.rarity as item_rarity,
              si.metadata as item_metadata
       FROM user_inventory ui
       JOIN store_items si ON si.sku = ui.sku
       WHERE ${whereClause}
       ORDER BY ui.purchased_at DESC, ui.id DESC
       LIMIT $${paramIndex}`,
      params
    );

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, -1) : rows;

    // Safe JSON parse helper
    const safeJsonParse = <T>(value: unknown, defaultValue: T): T => {
      if (value === null || value === undefined) return defaultValue;
      if (typeof value === 'object') return value as T;
      if (typeof value === 'string') {
        if (value.trim() === '') return defaultValue;
        try {
          return JSON.parse(value) as T;
        } catch {
          return defaultValue;
        }
      }
      return defaultValue;
    };

    // Build next cursor
    const nextCursor = items.length > 0 && hasMore
      ? Buffer.from(JSON.stringify({
          purchasedAt: items[items.length - 1].purchased_at,
          id: items[items.length - 1].id
        })).toString('base64')
      : null;

    return reply.send({
      data: items.map((r) => ({
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
          rarity: r.item_rarity,
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
      meta: { limit, hasMore, nextCursor },
    });
  });

  // Check if user owns an item
  app.get('/store/owns/:sku', { preHandler: authenticate }, async (request, reply) => {
    const { sku } = request.params as { sku: string };
    const owns = await storeService.ownsItem(request.user!.userId, sku);
    return reply.send({ data: { owns } });
  });

  // ============================================
  // TRAINING BUDDY ROUTES
  // ============================================

  // Get user's buddy
  app.get('/buddy', { preHandler: authenticate }, async (request, reply) => {
    const buddy = await buddyService.getBuddy(request.user!.userId);

    if (!buddy) {
      return reply.send({ data: null });
    }

    return reply.send({ data: buddy });
  });

  // Create buddy
  app.post('/buddy', { preHandler: authenticate }, async (request, reply) => {
    const data = createBuddySchema.parse(request.body);

    const buddy = await buddyService.createBuddy(
      request.user!.userId,
      data.species as any,
      data.nickname
    );

    return reply.status(201).send({ data: buddy });
  });

  // Change buddy species
  app.put('/buddy/species', { preHandler: authenticate }, async (request, reply) => {
    const data = z.object({ species: z.enum(BUDDY_SPECIES as unknown as [string, ...string[]]) }).parse(request.body);

    const buddy = await buddyService.changeSpecies(request.user!.userId, data.species as any);

    return reply.send({ data: buddy });
  });

  // Set buddy nickname
  app.put('/buddy/nickname', { preHandler: authenticate }, async (request, reply) => {
    const data = z.object({ nickname: z.string().max(30).nullable() }).parse(request.body);

    await buddyService.setNickname(request.user!.userId, data.nickname);

    const buddy = await buddyService.getBuddy(request.user!.userId);
    return reply.send({ data: buddy });
  });

  // Equip cosmetic
  app.post('/buddy/equip', { preHandler: authenticate }, async (request, reply) => {
    const data = equipCosmeticSchema.parse(request.body);

    await buddyService.equipCosmetic(request.user!.userId, data.sku, data.slot);

    const buddy = await buddyService.getBuddy(request.user!.userId);
    return reply.send({ data: buddy });
  });

  // Unequip cosmetic
  app.post('/buddy/unequip', { preHandler: authenticate }, async (request, reply) => {
    const data = z.object({
      slot: z.enum(['aura', 'armor', 'wings', 'tool', 'skin', 'emote_pack', 'voice_pack']),
    }).parse(request.body);

    await buddyService.unequipCosmetic(request.user!.userId, data.slot);

    const buddy = await buddyService.getBuddy(request.user!.userId);
    return reply.send({ data: buddy });
  });

  // Update display settings
  app.put('/buddy/settings', { preHandler: authenticate }, async (request, reply) => {
    const data = buddySettingsSchema.parse(request.body);

    await buddyService.updateDisplaySettings(request.user!.userId, data);

    const buddy = await buddyService.getBuddy(request.user!.userId);
    return reply.send({ data: buddy });
  });

  // Get evolution path for a species
  app.get('/buddy/evolution/:species', async (request, reply) => {
    const { species } = request.params as { species: string };

    if (!BUDDY_SPECIES.includes(species as any)) {
      return reply.status(400).send({
        error: { code: 'INVALID_SPECIES', message: 'Invalid species', statusCode: 400 },
      });
    }

    const path = await buddyService.getEvolutionPath(species as any);
    return reply.send({ data: path });
  });

  // Get buddy leaderboard (keyset pagination)
  app.get('/buddy/leaderboard', async (request, reply) => {
    const queryParams = request.query as { species?: string; limit?: string; cursor?: string };
    const limit = Math.min(parseInt(queryParams.limit || '50'), 100);

    const species = queryParams.species as any;
    if (species && !BUDDY_SPECIES.includes(species)) {
      return reply.status(400).send({
        error: { code: 'INVALID_SPECIES', message: 'Invalid species', statusCode: 400 },
      });
    }

    // Parse cursor for keyset pagination
    let cursorData: { level: number; totalXpEarned: number; id: string } | null = null;
    if (queryParams.cursor) {
      try {
        cursorData = JSON.parse(Buffer.from(queryParams.cursor, 'base64').toString());
      } catch {
        // Invalid cursor, start from beginning
      }
    }

    const { queryAll } = await import('../../db/client');

    // Build keyset query
    let whereClause = 'tb.visible = TRUE';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (species) {
      whereClause += ` AND tb.species = $${paramIndex++}`;
      params.push(species);
    }

    if (cursorData) {
      // Composite keyset for (level DESC, total_xp_earned DESC, user_id ASC)
      whereClause += ` AND (tb.level, tb.total_xp_earned, tb.user_id) < ($${paramIndex++}, $${paramIndex++}, $${paramIndex++})`;
      params.push(cursorData.level, cursorData.totalXpEarned, cursorData.id);
    }

    // Fetch one extra to determine if there are more results
    params.push(limit + 1);

    const rows = await queryAll<{
      user_id: string;
      username: string;
      species: string;
      nickname: string | null;
      level: number;
      stage: number;
      total_xp_earned: number;
    }>(
      `SELECT tb.user_id, u.username, tb.species, tb.nickname, tb.level, tb.stage, tb.total_xp_earned
       FROM training_buddies tb
       JOIN users u ON u.id = tb.user_id
       WHERE ${whereClause}
       ORDER BY tb.level DESC, tb.total_xp_earned DESC, tb.user_id ASC
       LIMIT $${paramIndex}`,
      params
    );

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, -1) : rows;

    // Get stage names for each entry
    const entries = await Promise.all(
      items.map(async (r, i) => {
        const stageInfo = await buddyService.getStageInfo(r.species as any, r.stage);
        return {
          rank: i + 1, // Note: Keyset pagination doesn't provide global rank, only relative position
          userId: r.user_id,
          username: r.username,
          species: r.species,
          nickname: r.nickname ?? undefined,
          level: r.level,
          stage: r.stage,
          stageName: stageInfo?.stageName || `${r.species} Stage ${r.stage}`,
        };
      })
    );

    // Build next cursor
    const nextCursor = items.length > 0 && hasMore
      ? Buffer.from(JSON.stringify({
          level: items[items.length - 1].level,
          totalXpEarned: items[items.length - 1].total_xp_earned,
          id: items[items.length - 1].user_id
        })).toString('base64')
      : null;

    return reply.send({
      data: entries,
      meta: { limit, hasMore, nextCursor },
    });
  });

  // ============================================
  // EARNING RULES (public info)
  // ============================================

  // Get earning rules
  app.get('/earning/rules', async (request, reply) => {
    const query = request.query as { category?: string };
    const rules = await earningService.getRules({ category: query.category });
    return reply.send({ data: rules });
  });

  // ============================================
  // ADMIN ROUTES
  // ============================================

  // Admin: Get user's wallet
  app.get('/admin/wallet/:userId', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const wallet = await walletService.getWalletDetails(userId);
    return reply.send({ data: wallet });
  });

  // Admin: Adjust credits
  app.post('/admin/credits/adjust', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const data = adminAdjustSchema.parse(request.body);

    const result = await walletService.adminAdjust({
      userId: data.userId,
      amount: data.amount,
      adminUserId: request.user!.userId,
      reason: data.reason,
    });

    return reply.send({ data: result });
  });

  // Admin: Freeze wallet
  app.post('/admin/wallet/freeze', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const data = adminFreezeSchema.parse(request.body);

    await walletService.freezeWallet(data.userId, request.user!.userId, data.reason);

    return reply.send({ data: { success: true } });
  });

  // Admin: Unfreeze wallet
  app.post('/admin/wallet/unfreeze', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const data = adminFreezeSchema.parse(request.body);

    await walletService.unfreezeWallet(data.userId, request.user!.userId, data.reason);

    return reply.send({ data: { success: true } });
  });

  // Admin: Reverse transaction
  app.post('/admin/credits/reverse', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const data = adminReverseSchema.parse(request.body);

    const result = await walletService.reverseTransaction({
      transactionId: data.transactionId,
      adminUserId: request.user!.userId,
      reason: data.reason,
    });

    return reply.send({ data: result });
  });

  // Admin: Grant item
  app.post('/admin/store/grant', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const data = z.object({
      userId: z.string().min(1),
      sku: z.string().min(1),
      reason: z.string().min(1).max(500),
    }).parse(request.body);

    const inventoryId = await storeService.grantItem(data.userId, data.sku, request.user!.userId, data.reason);

    return reply.send({ data: { inventoryId } });
  });

  // Admin: Revoke item
  app.post('/admin/store/revoke', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const data = z.object({
      userId: z.string().min(1),
      sku: z.string().min(1),
      reason: z.string().min(1).max(500),
    }).parse(request.body);

    await storeService.revokeItem(data.userId, data.sku, request.user!.userId, data.reason);

    return reply.send({ data: { success: true } });
  });

  // Admin: Get audit log (keyset pagination)
  app.get('/admin/credits/audit', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const queryParams = request.query as {
      adminId?: string;
      targetUserId?: string;
      action?: string;
      limit?: string;
      cursor?: string;
    };
    const limit = Math.min(parseInt(queryParams.limit || '50'), 100);

    // Parse cursor for keyset pagination
    let cursorData: { createdAt: string; id: string } | null = null;
    if (queryParams.cursor) {
      try {
        cursorData = JSON.parse(Buffer.from(queryParams.cursor, 'base64').toString());
      } catch {
        // Invalid cursor, start from beginning
      }
    }

    const { queryAll } = await import('../../db/client');

    // Build keyset query
    let whereClause = '1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (queryParams.adminId) {
      whereClause += ` AND al.admin_user_id = $${paramIndex++}`;
      params.push(queryParams.adminId);
    }
    if (queryParams.targetUserId) {
      whereClause += ` AND al.target_user_id = $${paramIndex++}`;
      params.push(queryParams.targetUserId);
    }
    if (queryParams.action) {
      whereClause += ` AND al.action = $${paramIndex++}`;
      params.push(queryParams.action);
    }

    if (cursorData) {
      whereClause += ` AND (al.created_at, al.id) < ($${paramIndex++}, $${paramIndex++})`;
      params.push(cursorData.createdAt, cursorData.id);
    }

    // Fetch one extra to determine if there are more results
    params.push(limit + 1);

    const rows = await queryAll<{
      id: string;
      admin_user_id: string;
      admin_username: string | null;
      action: string;
      target_user_id: string | null;
      target_username: string | null;
      target_tx_id: string | null;
      details: string;
      reason: string | null;
      created_at: Date;
    }>(
      `SELECT al.*, admin.username as admin_username, target.username as target_username
       FROM admin_credit_audit_log al
       LEFT JOIN users admin ON admin.id = al.admin_user_id
       LEFT JOIN users target ON target.id = al.target_user_id
       WHERE ${whereClause}
       ORDER BY al.created_at DESC, al.id DESC
       LIMIT $${paramIndex}`,
      params
    );

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, -1) : rows;

    // Build next cursor
    const nextCursor = items.length > 0 && hasMore
      ? Buffer.from(JSON.stringify({
          createdAt: items[items.length - 1].created_at,
          id: items[items.length - 1].id
        })).toString('base64')
      : null;

    return reply.send({
      data: items.map((r) => {
        const details = JSON.parse(r.details || '{}');
        return {
          id: r.id,
          adminId: r.admin_user_id,
          adminUsername: r.admin_username ?? undefined,
          action: r.action,
          targetUserId: r.target_user_id ?? undefined,
          targetUsername: r.target_username ?? undefined,
          targetType: details.targetType || '',
          targetId: r.target_tx_id || details.targetId || '',
          details,
          reason: r.reason ?? undefined,
          createdAt: r.created_at,
        };
      }),
      meta: { limit, hasMore, nextCursor },
    });
  });

  // ============================================
  // ANTI-ABUSE ADMIN ROUTES
  // ============================================

  // Admin: Get fraud flags (keyset pagination)
  app.get('/admin/fraud-flags', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const queryParams = request.query as {
      userId?: string;
      status?: string;
      severity?: string;
      limit?: string;
      cursor?: string;
    };
    const limit = Math.min(parseInt(queryParams.limit || '50'), 100);

    // Parse cursor for keyset pagination
    let cursorData: { severity: string; createdAt: string; id: string } | null = null;
    if (queryParams.cursor) {
      try {
        cursorData = JSON.parse(Buffer.from(queryParams.cursor, 'base64').toString());
      } catch {
        // Invalid cursor, start from beginning
      }
    }

    const { queryAll } = await import('../../db/client');

    // Build keyset query
    let whereClause = '1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (queryParams.userId) {
      whereClause += ` AND user_id = $${paramIndex++}`;
      params.push(queryParams.userId);
    }
    if (queryParams.status) {
      whereClause += ` AND status = $${paramIndex++}`;
      params.push(queryParams.status);
    }
    if (queryParams.severity) {
      whereClause += ` AND severity = $${paramIndex++}`;
      params.push(queryParams.severity);
    }

    // Severity order mapping for keyset pagination
    const severityOrder = { 'critical': 1, 'high': 2, 'medium': 3, 'low': 4 };

    if (cursorData) {
      const cursorSeverityOrder = severityOrder[cursorData.severity as keyof typeof severityOrder] || 4;
      whereClause += ` AND (
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        created_at DESC,
        id DESC
      ) > ($${paramIndex++}, $${paramIndex++}, $${paramIndex++})`;
      params.push(cursorSeverityOrder, cursorData.createdAt, cursorData.id);
    }

    // Fetch one extra to determine if there are more results
    params.push(limit + 1);

    const rows = await queryAll<{
      id: string;
      user_id: string;
      flag_type: string;
      severity: string;
      details: string;
      status: string;
      reviewed_by: string | null;
      reviewed_at: Date | null;
      resolution: string | null;
      created_at: Date;
    }>(
      `SELECT * FROM economy_fraud_flags
       WHERE ${whereClause}
       ORDER BY
         CASE severity
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
         END,
         created_at DESC,
         id DESC
       LIMIT $${paramIndex}`,
      params
    );

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, -1) : rows;

    // Build next cursor
    const nextCursor = items.length > 0 && hasMore
      ? Buffer.from(JSON.stringify({
          severity: items[items.length - 1].severity,
          createdAt: items[items.length - 1].created_at,
          id: items[items.length - 1].id
        })).toString('base64')
      : null;

    return reply.send({
      data: items.map((r) => {
        const details = JSON.parse(r.details || '{}');
        return {
          id: r.id,
          userId: r.user_id,
          flagType: r.flag_type as FlagStatus,
          severity: r.severity,
          description: details.description || '',
          metadata: details,
          status: r.status as FlagStatus,
          reviewedBy: r.reviewed_by ?? undefined,
          reviewedAt: r.reviewed_at ?? undefined,
          reviewNotes: r.resolution ?? undefined,
          createdAt: r.created_at,
        };
      }),
      meta: { limit, hasMore, nextCursor },
    });
  });

  // Admin: Review fraud flag
  app.post('/admin/fraud-flags/:flagId/review', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const { flagId } = request.params as { flagId: string };
    const data = z.object({
      status: z.enum(['open', 'investigating', 'resolved_valid', 'resolved_invalid', 'escalated']),
      notes: z.string().max(1000).optional(),
    }).parse(request.body);

    await antiabuseService.reviewFlag(
      flagId,
      request.user!.userId,
      data.status as FlagStatus,
      data.notes
    );

    return reply.send({ data: { success: true } });
  });

  // Admin: Create manual fraud flag
  app.post('/admin/fraud-flags', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const data = z.object({
      userId: z.string().min(1),
      flagType: z.enum(['velocity', 'self_farming', 'suspicious_pattern', 'bot_behavior', 'collusion', 'manual']),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      description: z.string().min(1).max(1000),
      metadata: z.record(z.unknown()).optional(),
    }).parse(request.body);

    const flag = await antiabuseService.createFlag({
      userId: data.userId,
      flagType: data.flagType as any,
      severity: data.severity as any,
      description: data.description,
      metadata: data.metadata,
    });

    // Log admin action
    await antiabuseService.logAdminAction({
      adminId: request.user!.userId,
      action: 'create_fraud_flag',
      targetUserId: data.userId,
      targetType: 'fraud_flag',
      targetId: flag.id,
      details: { flagType: data.flagType, severity: data.severity },
      reason: data.description,
    });

    return reply.status(201).send({ data: flag });
  });

  // Admin: Get rate limits
  app.get('/admin/rate-limits', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const limits = await antiabuseService.getRateLimits();
    return reply.send({ data: limits });
  });

  // Admin: Update rate limit
  app.put('/admin/rate-limits/:action', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const { action } = request.params as { action: string };
    const data = z.object({
      maxPerHour: z.number().int().min(0).optional(),
      maxPerDay: z.number().int().min(0).optional(),
      cooldownSeconds: z.number().int().min(0).optional(),
    }).parse(request.body);

    await antiabuseService.updateRateLimit(action, data);

    // Log admin action
    await antiabuseService.logAdminAction({
      adminId: request.user!.userId,
      action: 'update_rate_limit',
      targetType: 'rate_limit',
      targetId: action,
      details: data,
    });

    return reply.send({ data: { success: true } });
  });

  // Admin: Run abuse checks on a user
  app.post('/admin/abuse-check/:userId', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const { userId } = request.params as { userId: string };

    const result = await antiabuseService.runChecks(userId);

    // Log admin action
    await antiabuseService.logAdminAction({
      adminId: request.user!.userId,
      action: 'run_abuse_check',
      targetUserId: userId,
      targetType: 'user',
      targetId: userId,
      details: { passed: result.passed, flagCount: result.flags.length },
    });

    return reply.send({ data: result });
  });

  // Admin: Check user rate limit status
  app.get('/admin/rate-limit-status/:userId', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const query = request.query as { action?: string };

    const actions = query.action
      ? [query.action]
      : ['transfer', 'purchase', 'workout', 'earn'];

    const statuses: Record<string, any> = {};
    for (const action of actions) {
      statuses[action] = await antiabuseService.checkRateLimit(userId, action);
    }

    return reply.send({ data: statuses });
  });

  // Admin: Trigger leaderboard rewards (for manual processing)
  app.post('/admin/leaderboard-rewards/trigger', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const data = z.object({
      periodType: z.enum(['daily', 'weekly', 'monthly']),
    }).parse(request.body);

    // Import dynamically to avoid circular deps
    const { triggerLeaderboardRewards } = await import('../../lib/scheduler');

    await triggerLeaderboardRewards(data.periodType);

    // Log admin action
    await antiabuseService.logAdminAction({
      adminId: request.user!.userId,
      action: 'trigger_leaderboard_rewards',
      targetType: 'system',
      targetId: data.periodType,
      details: { periodType: data.periodType },
    });

    return reply.send({ data: { success: true, message: `${data.periodType} leaderboard rewards processing triggered` } });
  });

  // NOTE: Trainer routes are registered in trainers.ts
  // Browse all classes (keyset pagination)
  app.get('/classes/browse', async (request, reply) => {
    const queryParams = request.query as {
      category?: string;
      upcoming?: string;
      limit?: string;
      cursor?: string;
    };
    const limit = Math.min(parseInt(queryParams.limit || '50'), 100);

    // Parse cursor for keyset pagination
    let cursorData: { startAt: string; id: string } | null = null;
    if (queryParams.cursor) {
      try {
        cursorData = JSON.parse(Buffer.from(queryParams.cursor, 'base64').toString());
      } catch {
        // Invalid cursor, start from beginning
      }
    }

    const { queryAll } = await import('../../db/client');

    const upcoming = queryParams.upcoming !== 'false';

    // Build keyset query
    let whereClause = 'status = $1';
    const params: unknown[] = ['scheduled'];
    let paramIndex = 2;

    if (queryParams.category) {
      whereClause += ` AND category = $${paramIndex++}`;
      params.push(queryParams.category);
    }

    if (upcoming) {
      whereClause += ` AND start_at >= NOW()`;
    }

    if (cursorData) {
      whereClause += ` AND (start_at, id) > ($${paramIndex++}, $${paramIndex++})`;
      params.push(cursorData.startAt, cursorData.id);
    }

    // Fetch one extra to determine if there are more results
    params.push(limit + 1);

    const rows = await queryAll<{
      id: string;
      trainer_id: string;
      title: string;
      description: string | null;
      category: string;
      max_participants: number;
      credits_price: number;
      duration_minutes: number;
      start_at: Date;
      location_type: string;
      location_details: unknown;
      status: string;
      recurring_rule: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT * FROM trainer_classes
       WHERE ${whereClause}
       ORDER BY start_at ASC, id ASC
       LIMIT $${paramIndex}`,
      params
    );

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, -1) : rows;

    // Build next cursor
    const nextCursor = items.length > 0 && hasMore
      ? Buffer.from(JSON.stringify({
          startAt: items[items.length - 1].start_at,
          id: items[items.length - 1].id
        })).toString('base64')
      : null;

    return reply.send({
      data: items.map((row) => ({
        id: row.id,
        trainerId: row.trainer_id,
        title: row.title,
        description: row.description ?? undefined,
        category: row.category,
        maxParticipants: row.max_participants,
        creditsPrice: row.credits_price,
        durationMinutes: row.duration_minutes,
        startAt: row.start_at,
        locationType: row.location_type,
        locationDetails: row.location_details,
        status: row.status,
        recurringRule: row.recurring_rule ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      meta: { limit, hasMore, nextCursor },
    });
  });

  // ============================================
  // ECONOMY METRICS (Admin)
  // ============================================

  // Admin: Get economy metrics dashboard
  app.get('/admin/economy/metrics', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const query = request.query as { period?: string };
    const period = query.period || '24h';

    // Calculate time range
    let periodStart: Date;
    const now = new Date();
    switch (period) {
      case '1h':
        periodStart = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const { queryOne, queryAll } = await import('../../db/client');

    // Get total credits in circulation
    const circulation = await queryOne<{ total: string; user_count: string }>(
      `SELECT SUM(balance) as total, COUNT(*) as user_count FROM credit_balances WHERE balance > 0`
    );

    // Get credits issued in period
    const issued = await queryOne<{ total: string; count: string }>(
      `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
       FROM credit_ledger WHERE amount > 0 AND created_at >= $1`,
      [periodStart]
    );

    // Get credits spent in period
    const spent = await queryOne<{ total: string; count: string }>(
      `SELECT COALESCE(SUM(ABS(amount)), 0) as total, COUNT(*) as count
       FROM credit_ledger WHERE amount < 0 AND created_at >= $1`,
      [periodStart]
    );

    // Get transfers in period
    const transfers = await queryOne<{ total: string; count: string }>(
      `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
       FROM credit_transfers WHERE created_at >= $1 AND status = 'completed'`,
      [periodStart]
    );

    // Get top earning categories
    const topEarnings = await queryAll<{ rule_code: string; total: string; count: string }>(
      `SELECT rule_code, SUM(credits_awarded) as total, COUNT(*) as count
       FROM earning_awards WHERE created_at >= $1
       GROUP BY rule_code ORDER BY total DESC LIMIT 10`,
      [periodStart]
    );

    // Get top spending categories
    const topSpending = await queryAll<{ action: string; total: string; count: string }>(
      `SELECT action, SUM(ABS(amount)) as total, COUNT(*) as count
       FROM credit_ledger WHERE amount < 0 AND created_at >= $1
       GROUP BY action ORDER BY total DESC LIMIT 10`,
      [periodStart]
    );

    // Get store sales
    const storeSales = await queryAll<{ sku: string; name: string; total: string; count: string }>(
      `SELECT i.sku, s.name, SUM(s.price_credits) as total, COUNT(*) as count
       FROM user_inventory i
       JOIN store_items s ON s.sku = i.sku
       WHERE i.purchased_at >= $1
       GROUP BY i.sku, s.name ORDER BY count DESC LIMIT 10`,
      [periodStart]
    );

    // Get new users with wallets
    const newWallets = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM credit_balances WHERE created_at >= $1`,
      [periodStart]
    );

    // Get fraud flags in period
    const fraudFlags = await queryOne<{ pending: string; total: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pending') as pending,
         COUNT(*) as total
       FROM economy_fraud_flags WHERE created_at >= $1`,
      [periodStart]
    );

    return reply.send({
      data: {
        period,
        periodStart: periodStart.toISOString(),
        circulation: {
          totalCredits: parseInt(circulation?.total || '0'),
          activeWallets: parseInt(circulation?.user_count || '0'),
        },
        issuance: {
          creditsIssued: parseInt(issued?.total || '0'),
          transactionCount: parseInt(issued?.count || '0'),
        },
        spending: {
          creditsSpent: parseInt(spent?.total || '0'),
          transactionCount: parseInt(spent?.count || '0'),
        },
        transfers: {
          totalTransferred: parseInt(transfers?.total || '0'),
          transferCount: parseInt(transfers?.count || '0'),
        },
        topEarnings: topEarnings.map(e => ({
          ruleCode: e.rule_code,
          total: parseInt(e.total),
          count: parseInt(e.count),
        })),
        topSpending: topSpending.map(s => ({
          action: s.action,
          total: parseInt(s.total),
          count: parseInt(s.count),
        })),
        storeSales: storeSales.map(s => ({
          sku: s.sku,
          name: s.name,
          revenue: parseInt(s.total),
          sales: parseInt(s.count),
        })),
        growth: {
          newWallets: parseInt(newWallets?.count || '0'),
        },
        fraud: {
          pendingFlags: parseInt(fraudFlags?.pending || '0'),
          totalFlags: parseInt(fraudFlags?.total || '0'),
        },
      },
    });
  });

  // ============================================
  // TRUST TIER ROUTES
  // ============================================

  // Get current user's trust info
  app.get('/trust', { preHandler: authenticate }, async (request, reply) => {
    const trustInfo = await trustService.getUserTrust(request.user!.userId);
    return reply.send({ data: trustInfo });
  });

  // Get trust tier definitions
  app.get('/trust/tiers', async (request, reply) => {
    const tiers = await trustService.getTiers();
    return reply.send({ data: tiers });
  });

  // Admin: Get user's trust info
  app.get('/admin/trust/:userId', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const trustInfo = await trustService.getUserTrust(userId);
    return reply.send({ data: trustInfo });
  });

  // Admin: Set trust tier override
  app.post('/admin/trust/:userId/override', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const data = z.object({
      tier: z.number().int().min(0).max(5),
      reason: z.string().min(1).max(500),
    }).parse(request.body);

    await trustService.setOverrideTier(userId, data.tier, request.user!.userId, data.reason);

    const updatedInfo = await trustService.getUserTrust(userId);
    return reply.send({ data: updatedInfo });
  });

  // Admin: Clear trust tier override
  app.delete('/admin/trust/:userId/override', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const { userId } = request.params as { userId: string };

    await trustService.clearOverride(userId, request.user!.userId);

    const updatedInfo = await trustService.getUserTrust(userId);
    return reply.send({ data: updatedInfo });
  });

  // ============================================
  // ESCROW ROUTES
  // ============================================

  // Get user's escrow holds
  app.get('/escrow', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { status?: string };
    const holds = await escrowService.getUserHolds(
      request.user!.userId,
      query.status as any
    );
    return reply.send({ data: holds });
  });

  // Get single escrow hold
  app.get('/escrow/:escrowId', { preHandler: authenticate }, async (request, reply) => {
    const { escrowId } = request.params as { escrowId: string };
    const hold = await escrowService.getHold(escrowId);

    if (!hold) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Escrow hold not found', statusCode: 404 },
      });
    }

    // Only allow viewing own escrow or if you're the release target
    if (hold.userId !== request.user!.userId && hold.releaseTo !== request.user!.userId) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Not authorized to view this escrow', statusCode: 403 },
      });
    }

    return reply.send({ data: hold });
  });

  // Admin: Get all escrow holds (keyset pagination)
  app.get('/admin/escrow', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const queryParams = request.query as { userId?: string; status?: string; limit?: string; cursor?: string };
    const limit = Math.min(parseInt(queryParams.limit || '50'), 100);

    // Parse cursor for keyset pagination
    let cursorData: { createdAt: string; id: string } | null = null;
    if (queryParams.cursor) {
      try {
        cursorData = JSON.parse(Buffer.from(queryParams.cursor, 'base64').toString());
      } catch {
        // Invalid cursor, start from beginning
      }
    }

    const { queryAll } = await import('../../db/client');

    let whereClause = '1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (queryParams.userId) {
      whereClause += ` AND user_id = $${paramIndex++}`;
      params.push(queryParams.userId);
    }
    if (queryParams.status) {
      whereClause += ` AND status = $${paramIndex++}`;
      params.push(queryParams.status);
    }

    if (cursorData) {
      whereClause += ` AND (created_at, id) < ($${paramIndex++}, $${paramIndex++})`;
      params.push(cursorData.createdAt, cursorData.id);
    }

    // Fetch one extra to determine if there are more results
    params.push(limit + 1);

    const rows = await queryAll(
      `SELECT * FROM escrow_holds WHERE ${whereClause} ORDER BY created_at DESC, id DESC LIMIT $${paramIndex}`,
      params
    );

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, -1) : rows;

    // Build next cursor
    const nextCursor = items.length > 0 && hasMore
      ? Buffer.from(JSON.stringify({
          createdAt: (items[items.length - 1] as any).created_at,
          id: (items[items.length - 1] as any).id
        })).toString('base64')
      : null;

    return reply.send({
      data: items,
      meta: { limit, hasMore, nextCursor },
    });
  });

  // Admin: Release escrow
  app.post('/admin/escrow/:escrowId/release', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const { escrowId } = request.params as { escrowId: string };
    const data = z.object({
      releaseTo: z.string().optional(),
      releaseAmount: z.number().int().min(0).optional(),
      feeAmount: z.number().int().min(0).optional(),
      reason: z.string().min(1).max(500),
    }).parse(request.body);

    const result = await escrowService.release({
      escrowId,
      releaseTo: data.releaseTo,
      releaseAmount: data.releaseAmount,
      feeAmount: data.feeAmount,
      releasedBy: request.user!.userId,
      reason: data.reason,
    });

    return reply.send({ data: result });
  });

  // Admin: Refund escrow
  app.post('/admin/escrow/:escrowId/refund', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const { escrowId } = request.params as { escrowId: string };
    const data = z.object({
      reason: z.string().min(1).max(500),
    }).parse(request.body);

    const result = await escrowService.refund(escrowId, request.user!.userId, data.reason);

    return reply.send({ data: result });
  });

  // ============================================
  // DISPUTE ROUTES
  // ============================================

  // Get user's disputes (keyset pagination)
  app.get('/disputes', { preHandler: authenticate }, async (request, reply) => {
    const queryParams = request.query as { role?: string; status?: string; limit?: string; cursor?: string };
    const limit = Math.min(parseInt(queryParams.limit || '50'), 100);

    // Parse cursor for keyset pagination
    let cursorData: { createdAt: string; id: string } | null = null;
    if (queryParams.cursor) {
      try {
        cursorData = JSON.parse(Buffer.from(queryParams.cursor, 'base64').toString());
      } catch {
        // Invalid cursor, start from beginning
      }
    }

    const { queryAll } = await import('../../db/client');

    const role = queryParams.role as 'reporter' | 'respondent' | 'all' | undefined;
    let whereClause = role === 'reporter'
      ? 'reporter_id = $1'
      : role === 'respondent'
        ? 'respondent_id = $1'
        : '(reporter_id = $1 OR respondent_id = $1)';

    const params: unknown[] = [request.user!.userId];
    let paramIndex = 2;

    if (queryParams.status) {
      whereClause += ` AND status = $${paramIndex++}`;
      params.push(queryParams.status);
    }

    if (cursorData) {
      whereClause += ` AND (created_at, id) < ($${paramIndex++}, $${paramIndex++})`;
      params.push(cursorData.createdAt, cursorData.id);
    }

    // Fetch one extra to determine if there are more results
    params.push(limit + 1);

    const rows = await queryAll<{
      id: string;
      reporter_id: string;
      respondent_id: string;
      dispute_type: string;
      reference_type: string;
      reference_id: string;
      amount_disputed: number | null;
      escrow_id: string | null;
      description: string;
      evidence: Array<{ type: string; url?: string; text?: string; uploadedAt: string }> | null;
      status: string;
      resolution: string | null;
      resolution_amount: number | null;
      resolved_by: string | null;
      resolved_at: Date | null;
      deadline: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT * FROM economy_disputes WHERE ${whereClause} ORDER BY created_at DESC, id DESC LIMIT $${paramIndex}`,
      params
    );

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, -1) : rows;

    // Build next cursor
    const nextCursor = items.length > 0 && hasMore
      ? Buffer.from(JSON.stringify({
          createdAt: items[items.length - 1].created_at,
          id: items[items.length - 1].id
        })).toString('base64')
      : null;

    return reply.send({
      data: items.map((row) => ({
        id: row.id,
        reporterId: row.reporter_id,
        respondentId: row.respondent_id,
        disputeType: row.dispute_type,
        referenceType: row.reference_type,
        referenceId: row.reference_id,
        amountDisputed: row.amount_disputed ?? undefined,
        escrowId: row.escrow_id ?? undefined,
        description: row.description,
        evidence: row.evidence || [],
        status: row.status,
        resolution: row.resolution ?? undefined,
        resolutionAmount: row.resolution_amount ?? undefined,
        resolvedBy: row.resolved_by ?? undefined,
        resolvedAt: row.resolved_at ?? undefined,
        deadline: row.deadline ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      meta: { limit, hasMore, nextCursor },
    });
  });

  // Get single dispute
  app.get('/disputes/:disputeId', { preHandler: authenticate }, async (request, reply) => {
    const { disputeId } = request.params as { disputeId: string };
    const dispute = await disputeService.getDispute(disputeId);

    if (!dispute) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Dispute not found', statusCode: 404 },
      });
    }

    // Only allow viewing own disputes
    if (dispute.reporterId !== request.user!.userId && dispute.respondentId !== request.user!.userId) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Not authorized to view this dispute', statusCode: 403 },
      });
    }

    return reply.send({ data: dispute });
  });

  // Create dispute
  app.post('/disputes', { preHandler: authenticate }, async (request, reply) => {
    const data = z.object({
      respondentId: z.string().min(1),
      disputeType: z.enum(['class_noshow', 'class_quality', 'transfer_fraud', 'refund_request', 'other']),
      referenceType: z.string().min(1),
      referenceId: z.string().min(1),
      amountDisputed: z.number().int().min(0).optional(),
      escrowId: z.string().optional(),
      description: z.string().min(10).max(2000),
      evidence: z.array(z.object({
        type: z.string().min(1),
        url: z.string().optional(),
        text: z.string().optional(),
      })).optional(),
    }).parse(request.body);

    const dispute = await disputeService.createDispute({
      reporterId: request.user!.userId,
      respondentId: data.respondentId,
      disputeType: data.disputeType,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      amountDisputed: data.amountDisputed,
      escrowId: data.escrowId,
      description: data.description,
      evidence: data.evidence as Array<{ type: string; url?: string; text?: string }>,
    });

    return reply.status(201).send({ data: dispute });
  });

  // Get dispute messages
  app.get('/disputes/:disputeId/messages', { preHandler: authenticate }, async (request, reply) => {
    const { disputeId } = request.params as { disputeId: string };

    const dispute = await disputeService.getDispute(disputeId);
    if (!dispute) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Dispute not found', statusCode: 404 },
      });
    }

    // Only allow viewing own disputes
    if (dispute.reporterId !== request.user!.userId && dispute.respondentId !== request.user!.userId) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Not authorized', statusCode: 403 },
      });
    }

    const messages = await disputeService.getMessages(disputeId);
    return reply.send({ data: messages });
  });

  // Add message to dispute
  app.post('/disputes/:disputeId/messages', { preHandler: authenticate }, async (request, reply) => {
    const { disputeId } = request.params as { disputeId: string };
    const data = z.object({
      message: z.string().min(1).max(2000),
      attachments: z.array(z.string()).optional(),
    }).parse(request.body);

    const message = await disputeService.addMessage(
      disputeId,
      request.user!.userId,
      data.message,
      false,
      data.attachments
    );

    return reply.status(201).send({ data: message });
  });

  // Admin: Get pending disputes (keyset pagination)
  app.get('/admin/disputes', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const queryParams = request.query as { status?: string; disputeType?: string; limit?: string; cursor?: string };
    const limit = Math.min(parseInt(queryParams.limit || '50'), 100);

    // Parse cursor for keyset pagination
    let cursorData: { deadline: string | null; createdAt: string; id: string } | null = null;
    if (queryParams.cursor) {
      try {
        cursorData = JSON.parse(Buffer.from(queryParams.cursor, 'base64').toString());
      } catch {
        // Invalid cursor, start from beginning
      }
    }

    const { queryAll } = await import('../../db/client');

    const statuses = queryParams.status ? [queryParams.status] : ['open', 'investigating', 'pending_response'];

    let whereClause = `status = ANY($1)`;
    const params: unknown[] = [statuses];
    let paramIndex = 2;

    if (queryParams.disputeType) {
      whereClause += ` AND dispute_type = $${paramIndex++}`;
      params.push(queryParams.disputeType);
    }

    if (cursorData) {
      // Complex keyset for (deadline ASC NULLS LAST, created_at ASC)
      if (cursorData.deadline === null) {
        // Cursor points to a row with NULL deadline
        whereClause += ` AND (
          deadline IS NOT NULL
          OR (deadline IS NULL AND (created_at, id) > ($${paramIndex++}, $${paramIndex++}))
        )`;
        params.push(cursorData.createdAt, cursorData.id);
      } else {
        whereClause += ` AND (
          (deadline IS NOT NULL AND (deadline, created_at, id) > ($${paramIndex++}, $${paramIndex++}, $${paramIndex++}))
          OR deadline IS NULL
        )`;
        params.push(cursorData.deadline, cursorData.createdAt, cursorData.id);
      }
    }

    // Fetch one extra to determine if there are more results
    params.push(limit + 1);

    const rows = await queryAll<{
      id: string;
      reporter_id: string;
      respondent_id: string;
      dispute_type: string;
      reference_type: string;
      reference_id: string;
      amount_disputed: number | null;
      escrow_id: string | null;
      description: string;
      evidence: Array<{ type: string; url?: string; text?: string; uploadedAt: string }> | null;
      status: string;
      resolution: string | null;
      resolution_amount: number | null;
      resolved_by: string | null;
      resolved_at: Date | null;
      deadline: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT * FROM economy_disputes WHERE ${whereClause} ORDER BY deadline ASC NULLS LAST, created_at ASC, id ASC LIMIT $${paramIndex}`,
      params
    );

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, -1) : rows;

    // Build next cursor
    const nextCursor = items.length > 0 && hasMore
      ? Buffer.from(JSON.stringify({
          deadline: items[items.length - 1].deadline,
          createdAt: items[items.length - 1].created_at,
          id: items[items.length - 1].id
        })).toString('base64')
      : null;

    return reply.send({
      data: items.map((row) => ({
        id: row.id,
        reporterId: row.reporter_id,
        respondentId: row.respondent_id,
        disputeType: row.dispute_type,
        referenceType: row.reference_type,
        referenceId: row.reference_id,
        amountDisputed: row.amount_disputed ?? undefined,
        escrowId: row.escrow_id ?? undefined,
        description: row.description,
        evidence: row.evidence || [],
        status: row.status,
        resolution: row.resolution ?? undefined,
        resolutionAmount: row.resolution_amount ?? undefined,
        resolvedBy: row.resolved_by ?? undefined,
        resolvedAt: row.resolved_at ?? undefined,
        deadline: row.deadline ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      meta: { limit, hasMore, nextCursor },
    });
  });

  // Admin: Update dispute status
  app.patch('/admin/disputes/:disputeId/status', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const { disputeId } = request.params as { disputeId: string };
    const data = z.object({
      status: z.enum(['open', 'investigating', 'pending_response', 'escalated']),
    }).parse(request.body);

    await disputeService.updateStatus(disputeId, data.status, request.user!.userId);

    const dispute = await disputeService.getDispute(disputeId);
    return reply.send({ data: dispute });
  });

  // Admin: Resolve dispute
  app.post('/admin/disputes/:disputeId/resolve', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const { disputeId } = request.params as { disputeId: string };
    const data = z.object({
      status: z.enum(['resolved_reporter', 'resolved_respondent', 'resolved_split', 'dismissed']),
      resolution: z.string().min(1).max(1000),
      resolutionAmount: z.number().int().min(0).optional(),
      splitRatio: z.number().min(0).max(1).optional(),
    }).parse(request.body);

    await disputeService.resolve(disputeId, request.user!.userId, {
      status: data.status,
      resolution: data.resolution,
      resolutionAmount: data.resolutionAmount,
      splitRatio: data.splitRatio,
    });

    const dispute = await disputeService.getDispute(disputeId);
    return reply.send({ data: dispute });
  });

  // Admin: Add message to dispute
  app.post('/admin/disputes/:disputeId/messages', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const { disputeId } = request.params as { disputeId: string };
    const data = z.object({
      message: z.string().min(1).max(2000),
      attachments: z.array(z.string()).optional(),
    }).parse(request.body);

    const message = await disputeService.addMessage(
      disputeId,
      request.user!.userId,
      data.message,
      true, // isAdmin
      data.attachments
    );

    return reply.status(201).send({ data: message });
  });
}
