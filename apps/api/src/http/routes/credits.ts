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
import { trustService } from '../../modules/economy/trust.service';
import { escrowService } from '../../modules/economy/escrow.service';
import { disputeService } from '../../modules/economy/dispute.service';
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

  // ============================================
  // TRAINER ROUTES (Public Browse)
  // ============================================

  // Get trainer profiles (public browse)
  app.get('/trainers', async (request, reply) => {
    const query = request.query as {
      specialty?: string;
      verified?: string;
      limit?: string;
      offset?: string;
    };
    const limit = Math.min(parseInt(query.limit || '50'), 100);
    const offset = parseInt(query.offset || '0');

    const { trainerService } = await import('../../modules/economy/trainer.service');

    const result = await trainerService.listProfiles({
      specialty: query.specialty,
      verified: query.verified === 'true' ? true : undefined,
      status: 'active',
      limit,
      offset,
    });

    return reply.send({
      data: result.trainers,
      meta: { limit, offset, total: result.total },
    });
  });

  // Get single trainer profile
  app.get('/trainers/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };

    const { trainerService } = await import('../../modules/economy/trainer.service');

    const profile = await trainerService.getProfile(userId);
    if (!profile) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Trainer not found', statusCode: 404 },
      });
    }

    return reply.send({ data: profile });
  });

  // Get trainer's classes
  app.get('/trainers/:userId/classes', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const query = request.query as {
      upcoming?: string;
      limit?: string;
      offset?: string;
    };
    const limit = Math.min(parseInt(query.limit || '50'), 100);
    const offset = parseInt(query.offset || '0');

    const { trainerService } = await import('../../modules/economy/trainer.service');

    const result = await trainerService.listClasses({
      trainerUserId: userId,
      upcoming: query.upcoming === 'true',
      limit,
      offset,
    });

    return reply.send({
      data: result.classes,
      meta: { limit, offset, total: result.total },
    });
  });

  // Browse all classes
  app.get('/classes', async (request, reply) => {
    const query = request.query as {
      category?: string;
      upcoming?: string;
      limit?: string;
      offset?: string;
    };
    const limit = Math.min(parseInt(query.limit || '50'), 100);
    const offset = parseInt(query.offset || '0');

    const { trainerService } = await import('../../modules/economy/trainer.service');

    const result = await trainerService.listClasses({
      category: query.category,
      upcoming: query.upcoming !== 'false', // Default to upcoming
      status: 'scheduled',
      limit,
      offset,
    });

    return reply.send({
      data: result.classes,
      meta: { limit, offset, total: result.total },
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

  // Admin: Get all escrow holds
  app.get('/admin/escrow', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const query = request.query as { userId?: string; status?: string; limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || '50'), 100);
    const offset = parseInt(query.offset || '0');

    const { queryAll, queryOne } = await import('../../db/client');

    let whereClause = '1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (query.userId) {
      whereClause += ` AND user_id = $${paramIndex++}`;
      params.push(query.userId);
    }
    if (query.status) {
      whereClause += ` AND status = $${paramIndex++}`;
      params.push(query.status);
    }

    params.push(limit, offset);

    const rows = await queryAll(
      `SELECT * FROM escrow_holds WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM escrow_holds WHERE ${whereClause}`,
      params.slice(0, -2)
    );

    return reply.send({
      data: rows,
      meta: { limit, offset, total: parseInt(countResult?.count || '0') },
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

  // Get user's disputes
  app.get('/disputes', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { role?: string; status?: string; limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || '50'), 100);
    const offset = parseInt(query.offset || '0');

    const result = await disputeService.getUserDisputes(request.user!.userId, {
      role: query.role as any,
      status: query.status as any,
      limit,
      offset,
    });

    return reply.send({
      data: result.disputes,
      meta: { limit, offset, total: result.total },
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

  // Admin: Get pending disputes
  app.get('/admin/disputes', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const query = request.query as { status?: string; disputeType?: string; limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || '50'), 100);
    const offset = parseInt(query.offset || '0');

    const statuses = query.status ? [query.status] : undefined;

    const result = await disputeService.getPendingDisputes({
      status: statuses as any,
      disputeType: query.disputeType as any,
      limit,
      offset,
    });

    return reply.send({
      data: result.disputes,
      meta: { limit, offset, total: result.total },
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
