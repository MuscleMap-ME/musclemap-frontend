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
import { antiabuseService, FLAG_STATUSES, FlagStatus } from '../../modules/economy/antiabuse.service';
import { loggers } from '../../lib/logger';

const log = loggers.http;

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

  // Get transaction history
  app.get('/wallet/transactions', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { limit?: string; offset?: string; action?: string };
    const limit = Math.min(parseInt(query.limit || '50'), 100);
    const offset = parseInt(query.offset || '0');

    const result = await walletService.getTransactionHistory(request.user!.userId, {
      limit,
      offset,
      action: query.action,
    });

    return reply.send({
      data: result.transactions,
      meta: { limit, offset, total: result.total },
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

  // Get transfer history
  app.get('/wallet/transfers', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { direction?: string; limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || '50'), 100);
    const offset = parseInt(query.offset || '0');
    const direction = query.direction as 'sent' | 'received' | 'all' | undefined;

    const result = await walletService.getTransferHistory(request.user!.userId, {
      direction: direction || 'all',
      limit,
      offset,
    });

    return reply.send({
      data: result.transfers,
      meta: { limit, offset, total: result.total },
    });
  });

  // Get earning history
  app.get('/wallet/earnings', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { limit?: string; offset?: string; category?: string };
    const limit = Math.min(parseInt(query.limit || '50'), 100);
    const offset = parseInt(query.offset || '0');

    const result = await earningService.getHistory(request.user!.userId, {
      limit,
      offset,
      category: query.category,
    });

    return reply.send({
      data: result.awards,
      meta: { limit, offset, total: result.total },
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

  // Get store items
  app.get('/store/items', async (request, reply) => {
    const query = request.query as {
      category?: string;
      rarity?: string;
      featured?: string;
      limit?: string;
      offset?: string;
    };

    const limit = Math.min(parseInt(query.limit || '50'), 100);
    const offset = parseInt(query.offset || '0');

    const result = await storeService.getItems({
      category: query.category,
      rarity: query.rarity,
      featured: query.featured === 'true',
      limit,
      offset,
    });

    return reply.send({
      data: result.items,
      meta: { limit, offset, total: result.total },
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

  // Get user inventory
  app.get('/store/inventory', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { category?: string; limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || '100'), 200);
    const offset = parseInt(query.offset || '0');

    const result = await storeService.getInventory(request.user!.userId, {
      category: query.category,
      limit,
      offset,
    });

    return reply.send({
      data: result.items,
      meta: { limit, offset, total: result.total },
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

  // Get buddy leaderboard
  app.get('/buddy/leaderboard', async (request, reply) => {
    const query = request.query as { species?: string; limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || '50'), 100);
    const offset = parseInt(query.offset || '0');

    const species = query.species as any;
    if (species && !BUDDY_SPECIES.includes(species)) {
      return reply.status(400).send({
        error: { code: 'INVALID_SPECIES', message: 'Invalid species', statusCode: 400 },
      });
    }

    const result = await buddyService.getLeaderboard({ species, limit, offset });

    return reply.send({
      data: result.entries,
      meta: { limit, offset, total: result.total },
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

  // Admin: Get audit log
  app.get('/admin/credits/audit', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const query = request.query as {
      adminId?: string;
      targetUserId?: string;
      action?: string;
      limit?: string;
      offset?: string;
    };
    const limit = Math.min(parseInt(query.limit || '50'), 100);
    const offset = parseInt(query.offset || '0');

    const result = await antiabuseService.getAuditLog({
      adminId: query.adminId,
      targetUserId: query.targetUserId,
      action: query.action,
      limit,
      offset,
    });

    return reply.send({
      data: result.entries,
      meta: { limit, offset, total: result.total },
    });
  });

  // ============================================
  // ANTI-ABUSE ADMIN ROUTES
  // ============================================

  // Admin: Get fraud flags
  app.get('/admin/fraud-flags', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const query = request.query as {
      userId?: string;
      status?: string;
      severity?: string;
      limit?: string;
      offset?: string;
    };
    const limit = Math.min(parseInt(query.limit || '50'), 100);
    const offset = parseInt(query.offset || '0');

    const result = await antiabuseService.getFlags({
      userId: query.userId,
      status: query.status as FlagStatus,
      severity: query.severity as any,
      limit,
      offset,
    });

    return reply.send({
      data: result.flags,
      meta: { limit, offset, total: result.total },
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
}
