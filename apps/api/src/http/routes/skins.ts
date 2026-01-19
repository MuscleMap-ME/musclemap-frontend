/**
 * Skins Routes
 *
 * Provides convenient endpoints for the SkinsStore frontend page.
 * These are wrappers around store functionality for cosmetic items.
 */

import { FastifyInstance } from 'fastify';
import { authenticate } from './auth';
import { queryAll, queryOne } from '../../db/client';

// Skin categories in the store
const SKIN_CATEGORIES = [
  'buddy_skin',
  'dashboard_theme',
  'avatar_frame',
  'badge',
  'effect',
  'aura',
  'armor',
  'wings',
  'tool',
  'emote_pack',
  'voice_pack',
];

export async function registerSkinsRoutes(app: FastifyInstance) {
  // Get all available skins (cosmetic store items)
  app.get('/skins', async (request, reply) => {
    const items = await queryAll<{
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
       WHERE enabled = TRUE AND category = ANY($1)
       ORDER BY sort_order ASC, sku ASC`,
      [SKIN_CATEGORIES]
    );

    return reply.send({
      skins: items.map((r) => ({
        id: r.sku,
        name: r.name,
        description: r.description ?? undefined,
        category: r.category,
        price: r.price_credits,
        rarity: r.rarity,
        unlock_requirement: r.requires_level > 1 ? `Level ${r.requires_level}` : null,
        credits_required: r.requires_level > 1 ? r.requires_level * 100 : null,
      })),
    });
  });

  // Get user's owned skins
  app.get('/skins/owned', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const items = await queryAll<{
      sku: string;
      name: string;
      description: string | null;
      category: string;
      price_credits: number;
      rarity: string;
    }>(
      `SELECT si.sku, si.name, si.description, si.category, si.price_credits, si.rarity
       FROM user_inventory ui
       JOIN store_items si ON ui.sku = si.sku
       WHERE ui.user_id = $1 AND si.category = ANY($2) AND si.enabled = TRUE
       ORDER BY ui.acquired_at DESC`,
      [userId, SKIN_CATEGORIES]
    );

    return reply.send({
      skins: items.map((r) => ({
        id: r.sku,
        name: r.name,
        description: r.description ?? undefined,
        category: r.category,
        price: r.price_credits,
        rarity: r.rarity,
      })),
    });
  });

  // Get user's equipped skins
  app.get('/skins/equipped', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    // Get equipped cosmetics from user_buddies
    const buddy = await queryOne<{
      equipped_aura: string | null;
      equipped_armor: string | null;
      equipped_wings: string | null;
      equipped_tool: string | null;
      equipped_skin: string | null;
      equipped_emote_pack: string | null;
      equipped_voice_pack: string | null;
    }>(
      `SELECT equipped_aura, equipped_armor, equipped_wings, equipped_tool,
              equipped_skin, equipped_emote_pack, equipped_voice_pack
       FROM user_buddies WHERE user_id = $1`,
      [userId]
    );

    if (!buddy) {
      return reply.send({ skins: [] });
    }

    const equippedSkus = [
      buddy.equipped_aura,
      buddy.equipped_armor,
      buddy.equipped_wings,
      buddy.equipped_tool,
      buddy.equipped_skin,
      buddy.equipped_emote_pack,
      buddy.equipped_voice_pack,
    ].filter(Boolean) as string[];

    if (equippedSkus.length === 0) {
      return reply.send({ skins: [] });
    }

    const items = await queryAll<{
      sku: string;
      name: string;
      description: string | null;
      category: string;
      price_credits: number;
      rarity: string;
    }>(
      `SELECT sku, name, description, category, price_credits, rarity
       FROM store_items
       WHERE sku = ANY($1) AND enabled = TRUE`,
      [equippedSkus]
    );

    return reply.send({
      skins: items.map((r) => ({
        id: r.sku,
        name: r.name,
        description: r.description ?? undefined,
        category: r.category,
        price: r.price_credits,
        rarity: r.rarity,
      })),
    });
  });

  // Get unlockable skins (ones user doesn't own yet)
  app.get('/skins/unlockable', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const items = await queryAll<{
      sku: string;
      name: string;
      description: string | null;
      category: string;
      price_credits: number;
      rarity: string;
      requires_level: number;
    }>(
      `SELECT si.sku, si.name, si.description, si.category, si.price_credits, si.rarity, si.requires_level
       FROM store_items si
       WHERE si.enabled = TRUE
         AND si.category = ANY($1)
         AND si.sku NOT IN (SELECT sku FROM user_inventory WHERE user_id = $2)
       ORDER BY si.requires_level ASC, si.sort_order ASC`,
      [SKIN_CATEGORIES, userId]
    );

    return reply.send({
      skins: items.map((r) => ({
        id: r.sku,
        name: r.name,
        description: r.description ?? undefined,
        category: r.category,
        price: r.price_credits,
        rarity: r.rarity,
        unlock_requirement: r.requires_level > 1 ? `Level ${r.requires_level}` : null,
        credits_required: r.requires_level > 1 ? r.requires_level * 100 : null,
      })),
    });
  });

  // Purchase a skin
  app.post('/skins/:skinId/purchase', { preHandler: authenticate }, async (request, reply) => {
    const { skinId } = request.params as { skinId: string };
    const userId = request.user!.userId;

    // Import store service for purchase logic
    const { storeService } = await import('../../modules/economy/store.service');

    try {
      const result = await storeService.purchase(userId, skinId);
      return reply.send({ success: true, data: result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Purchase failed';
      return reply.status(400).send({
        error: { code: 'PURCHASE_FAILED', message, statusCode: 400 },
      });
    }
  });

  // Equip a skin
  app.post('/skins/:skinId/equip', { preHandler: authenticate }, async (request, reply) => {
    const { skinId } = request.params as { skinId: string };
    const userId = request.user!.userId;

    // Get the skin's category to know which slot to equip it in
    const item = await queryOne<{ category: string }>(
      `SELECT category FROM store_items WHERE sku = $1 AND enabled = TRUE`,
      [skinId]
    );

    if (!item) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Skin not found', statusCode: 404 },
      });
    }

    // Verify user owns this skin
    const owned = await queryOne<{ sku: string }>(
      `SELECT sku FROM user_inventory WHERE user_id = $1 AND sku = $2`,
      [userId, skinId]
    );

    if (!owned) {
      return reply.status(403).send({
        error: { code: 'NOT_OWNED', message: 'You do not own this skin', statusCode: 403 },
      });
    }

    // Map category to equipped column
    const categoryToColumn: Record<string, string> = {
      'buddy_skin': 'equipped_skin',
      'aura': 'equipped_aura',
      'armor': 'equipped_armor',
      'wings': 'equipped_wings',
      'tool': 'equipped_tool',
      'emote_pack': 'equipped_emote_pack',
      'voice_pack': 'equipped_voice_pack',
    };

    const column = categoryToColumn[item.category];
    if (!column) {
      // For categories without equip slots (themes, badges), just return success
      return reply.send({ success: true, message: 'Skin activated' });
    }

    // Equip it
    await queryOne(
      `UPDATE user_buddies SET ${column} = $1, updated_at = NOW() WHERE user_id = $2`,
      [skinId, userId]
    );

    return reply.send({ success: true });
  });

  // Unequip a skin
  app.post('/skins/:skinId/unequip', { preHandler: authenticate }, async (request, reply) => {
    const { skinId } = request.params as { skinId: string };
    const userId = request.user!.userId;

    // Get the skin's category
    const item = await queryOne<{ category: string }>(
      `SELECT category FROM store_items WHERE sku = $1`,
      [skinId]
    );

    if (!item) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Skin not found', statusCode: 404 },
      });
    }

    // Map category to equipped column
    const categoryToColumn: Record<string, string> = {
      'buddy_skin': 'equipped_skin',
      'aura': 'equipped_aura',
      'armor': 'equipped_armor',
      'wings': 'equipped_wings',
      'tool': 'equipped_tool',
      'emote_pack': 'equipped_emote_pack',
      'voice_pack': 'equipped_voice_pack',
    };

    const column = categoryToColumn[item.category];
    if (!column) {
      return reply.send({ success: true, message: 'Skin deactivated' });
    }

    // Unequip (set to null)
    await queryOne(
      `UPDATE user_buddies SET ${column} = NULL, updated_at = NOW() WHERE user_id = $1 AND ${column} = $2`,
      [userId, skinId]
    );

    return reply.send({ success: true });
  });
}
