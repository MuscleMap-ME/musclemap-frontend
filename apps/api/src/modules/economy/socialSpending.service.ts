/**
 * Social Spending Service
 *
 * Handles credit-based social interactions:
 * - Tips (send credits to other users)
 * - Gifts (purchase store items for others)
 * - Super High Fives (enhanced reactions with cost)
 * - Post Boosts (promote content in feeds)
 *
 * Social spending creates engagement and community!
 */

import crypto from 'crypto';
import { queryOne, queryAll, query, serializableTransaction } from '../../db/client';
import { loggers } from '../../lib/logger';
import { creditService } from './credit.service';
import { earnEventsService } from './earnEvents.service';
import { storeService } from './store.service';

const log = loggers.economy;

// Super High Five costs
const SUPER_HIGH_FIVE_COSTS = {
  super: 5,
  mega: 25,
  standing_ovation: 100,
};

// Post boost costs and durations
const POST_BOOST_OPTIONS = {
  '24h': { cost: 100, durationHours: 24, multiplier: 2.0 },
  '7d': { cost: 500, durationHours: 168, multiplier: 1.5 },
};

export interface Tip {
  id: string;
  senderId: string;
  recipientId: string;
  amount: number;
  message?: string;
  sourceType?: string;
  sourceId?: string;
  createdAt: Date;
}

export interface Gift {
  id: string;
  senderId: string;
  recipientId: string;
  itemSku: string;
  itemName?: string;
  message?: string;
  totalCost: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: Date;
  expiresAt: Date;
}

export interface SuperHighFive {
  id: string;
  senderId: string;
  recipientId: string;
  type: 'super' | 'mega' | 'standing_ovation';
  cost: number;
  sourceType?: string;
  sourceId?: string;
  message?: string;
  createdAt: Date;
}

export interface PostBoost {
  id: string;
  userId: string;
  targetType: string;
  targetId: string;
  cost: number;
  boostMultiplier: number;
  startsAt: Date;
  endsAt: Date;
  impressionsGained: number;
}

export const socialSpendingService = {
  /**
   * Send a tip to another user
   */
  async sendTip(
    senderId: string,
    recipientId: string,
    amount: number,
    options: {
      message?: string;
      sourceType?: string;
      sourceId?: string;
    } = {}
  ): Promise<Tip> {
    if (senderId === recipientId) {
      throw new Error('Cannot tip yourself');
    }

    if (amount < 1) {
      throw new Error('Minimum tip is 1 credit');
    }

    if (amount > 10000) {
      throw new Error('Maximum single tip is 10,000 credits');
    }

    return await serializableTransaction(async (client) => {
      // Check sender balance
      const senderBalance = await client.query<{ balance: number }>(
        'SELECT balance FROM credit_balances WHERE user_id = $1 FOR UPDATE',
        [senderId]
      );

      if (!senderBalance.rows[0] || senderBalance.rows[0].balance < amount) {
        throw new Error('Insufficient credits');
      }

      // Deduct from sender
      const senderIdempotency = `tip-send-${senderId}-${recipientId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const chargeResult = await creditService.charge({
        userId: senderId,
        action: 'social.tip',
        amount,
        metadata: { recipientId, message: options.message },
        idempotencyKey: senderIdempotency,
      });

      if (!chargeResult.success) {
        throw new Error(chargeResult.error || 'Failed to charge credits');
      }

      // Add to recipient
      const recipientIdempotency = `tip-receive-${senderId}-${recipientId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const addResult = await creditService.addCredits(
        recipientId,
        amount,
        'social.tip_received',
        { senderId, message: options.message },
        recipientIdempotency
      );

      if (!addResult.success) {
        // Refund sender if recipient add failed
        await creditService.addCredits(
          senderId,
          amount,
          'social.tip_refund',
          { recipientId, reason: 'recipient_add_failed' }
        );
        throw new Error('Failed to add credits to recipient');
      }

      // Record the tip
      const tipId = `tip_${crypto.randomBytes(12).toString('hex')}`;
      await client.query(
        `INSERT INTO user_tips (id, sender_id, recipient_id, amount, message, source_type, source_id, sender_ledger_id, recipient_ledger_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          tipId,
          senderId,
          recipientId,
          amount,
          options.message || null,
          options.sourceType || null,
          options.sourceId || null,
          chargeResult.ledgerEntryId,
          addResult.ledgerEntryId,
        ]
      );

      // Create earn event for recipient
      await earnEventsService.createEvent({
        userId: recipientId,
        amount,
        source: 'tip_received',
        sourceId: tipId,
        description: `Tip received`,
        forceIcon: 'heart',
        forceColor: '#EC4899',
      });

      log.info({ tipId, senderId, recipientId, amount }, 'Tip sent');

      return {
        id: tipId,
        senderId,
        recipientId,
        amount,
        message: options.message,
        sourceType: options.sourceType,
        sourceId: options.sourceId,
        createdAt: new Date(),
      };
    });
  },

  /**
   * Send a gift (store item) to another user
   */
  async sendGift(
    senderId: string,
    recipientId: string,
    itemSku: string,
    options: { message?: string } = {}
  ): Promise<Gift> {
    if (senderId === recipientId) {
      throw new Error('Cannot gift to yourself');
    }

    // Get item details
    const item = await storeService.getItem(itemSku);
    if (!item) {
      throw new Error('Item not found');
    }

    if (!item.enabled) {
      throw new Error('Item is not available');
    }

    // Gift fee is 10% of item price
    const giftFee = Math.ceil(item.priceCredits * 0.1);
    const totalCost = item.priceCredits + giftFee;

    // Charge sender
    const idempotencyKey = `gift-${senderId}-${recipientId}-${itemSku}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const chargeResult = await creditService.charge({
      userId: senderId,
      action: 'social.gift',
      amount: totalCost,
      metadata: { recipientId, itemSku, itemPrice: item.priceCredits, giftFee },
      idempotencyKey,
    });

    if (!chargeResult.success) {
      throw new Error(chargeResult.error || 'Insufficient credits');
    }

    // Create gift record (pending acceptance)
    const giftId = `gift_${crypto.randomBytes(12).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await query(
      `INSERT INTO user_gifts (id, sender_id, recipient_id, item_sku, message, total_cost, ledger_id, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)`,
      [giftId, senderId, recipientId, itemSku, options.message || null, totalCost, chargeResult.ledgerEntryId, expiresAt]
    );

    log.info({ giftId, senderId, recipientId, itemSku, totalCost }, 'Gift sent');

    return {
      id: giftId,
      senderId,
      recipientId,
      itemSku,
      itemName: item.name,
      message: options.message,
      totalCost,
      status: 'pending',
      createdAt: new Date(),
      expiresAt,
    };
  },

  /**
   * Accept a gift
   */
  async acceptGift(giftId: string, recipientId: string): Promise<void> {
    const gift = await queryOne<{
      id: string;
      sender_id: string;
      recipient_id: string;
      item_sku: string;
      status: string;
    }>('SELECT * FROM user_gifts WHERE id = $1', [giftId]);

    if (!gift) {
      throw new Error('Gift not found');
    }

    if (gift.recipient_id !== recipientId) {
      throw new Error('Not authorized');
    }

    if (gift.status !== 'pending') {
      throw new Error('Gift already processed');
    }

    // Add item to recipient's inventory
    await storeService.grantItem(recipientId, gift.item_sku, gift.sender_id, `gift:${giftId}`);

    // Update gift status
    await query(
      `UPDATE user_gifts SET status = 'accepted', accepted_at = NOW() WHERE id = $1`,
      [giftId]
    );

    // Create earn event
    await earnEventsService.createEvent({
      userId: recipientId,
      amount: 0, // No credits, but show notification
      source: 'gift_received',
      sourceId: giftId,
      description: `Gift accepted`,
      forceIcon: 'gift',
      forceColor: '#EC4899',
    });

    log.info({ giftId, recipientId }, 'Gift accepted');
  },

  /**
   * Decline a gift (refund sender)
   */
  async declineGift(giftId: string, recipientId: string): Promise<void> {
    const gift = await queryOne<{
      id: string;
      sender_id: string;
      recipient_id: string;
      total_cost: number;
      status: string;
    }>('SELECT * FROM user_gifts WHERE id = $1', [giftId]);

    if (!gift) {
      throw new Error('Gift not found');
    }

    if (gift.recipient_id !== recipientId) {
      throw new Error('Not authorized');
    }

    if (gift.status !== 'pending') {
      throw new Error('Gift already processed');
    }

    // Refund sender
    await creditService.addCredits(
      gift.sender_id,
      gift.total_cost,
      'social.gift_declined_refund',
      { giftId }
    );

    // Update gift status
    await query(
      `UPDATE user_gifts SET status = 'declined' WHERE id = $1`,
      [giftId]
    );

    log.info({ giftId, recipientId, senderId: gift.sender_id }, 'Gift declined, sender refunded');
  },

  /**
   * Send a super high five
   */
  async sendSuperHighFive(
    senderId: string,
    recipientId: string,
    type: 'super' | 'mega' | 'standing_ovation',
    options: {
      sourceType?: string;
      sourceId?: string;
      message?: string;
    } = {}
  ): Promise<SuperHighFive> {
    if (senderId === recipientId) {
      throw new Error('Cannot high five yourself');
    }

    const cost = SUPER_HIGH_FIVE_COSTS[type];

    // Charge sender
    const idempotencyKey = `shf-${senderId}-${recipientId}-${type}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const chargeResult = await creditService.charge({
      userId: senderId,
      action: `social.high_five_${type}`,
      amount: cost,
      metadata: { recipientId, type },
      idempotencyKey,
    });

    if (!chargeResult.success) {
      throw new Error(chargeResult.error || 'Insufficient credits');
    }

    // Record the high five
    const id = `shf_${crypto.randomBytes(12).toString('hex')}`;
    await query(
      `INSERT INTO super_high_fives (id, sender_id, recipient_id, type, cost, source_type, source_id, message, ledger_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, senderId, recipientId, type, cost, options.sourceType || null, options.sourceId || null, options.message || null, chargeResult.ledgerEntryId]
    );

    log.info({ id, senderId, recipientId, type, cost }, 'Super high five sent');

    return {
      id,
      senderId,
      recipientId,
      type,
      cost,
      sourceType: options.sourceType,
      sourceId: options.sourceId,
      message: options.message,
      createdAt: new Date(),
    };
  },

  /**
   * Boost a post
   */
  async boostPost(
    userId: string,
    targetType: string,
    targetId: string,
    boostOption: '24h' | '7d'
  ): Promise<PostBoost> {
    const option = POST_BOOST_OPTIONS[boostOption];
    if (!option) {
      throw new Error('Invalid boost option');
    }

    // Check for existing active boost
    const existingBoost = await queryOne<{ id: string }>(
      `SELECT id FROM post_boosts
       WHERE user_id = $1 AND target_type = $2 AND target_id = $3 AND ends_at > NOW()`,
      [userId, targetType, targetId]
    );

    if (existingBoost) {
      throw new Error('Post already has an active boost');
    }

    // Charge user
    const idempotencyKey = `boost-${userId}-${targetType}-${targetId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const chargeResult = await creditService.charge({
      userId,
      action: 'social.post_boost',
      amount: option.cost,
      metadata: { targetType, targetId, boostOption },
      idempotencyKey,
    });

    if (!chargeResult.success) {
      throw new Error(chargeResult.error || 'Insufficient credits');
    }

    // Create boost
    const id = `boost_${crypto.randomBytes(12).toString('hex')}`;
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + option.durationHours * 60 * 60 * 1000);

    await query(
      `INSERT INTO post_boosts (id, user_id, target_type, target_id, cost, boost_multiplier, starts_at, ends_at, ledger_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, userId, targetType, targetId, option.cost, option.multiplier, startsAt, endsAt, chargeResult.ledgerEntryId]
    );

    log.info({ id, userId, targetType, targetId, boostOption, cost: option.cost }, 'Post boosted');

    return {
      id,
      userId,
      targetType,
      targetId,
      cost: option.cost,
      boostMultiplier: option.multiplier,
      startsAt,
      endsAt,
      impressionsGained: 0,
    };
  },

  /**
   * Get user's sent tips
   */
  async getSentTips(userId: string, limit: number = 50): Promise<Tip[]> {
    const rows = await queryAll<{
      id: string;
      sender_id: string;
      recipient_id: string;
      amount: number;
      message: string | null;
      source_type: string | null;
      source_id: string | null;
      created_at: Date;
    }>(
      `SELECT * FROM user_tips WHERE sender_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );

    return rows.map(r => ({
      id: r.id,
      senderId: r.sender_id,
      recipientId: r.recipient_id,
      amount: r.amount,
      message: r.message || undefined,
      sourceType: r.source_type || undefined,
      sourceId: r.source_id || undefined,
      createdAt: r.created_at,
    }));
  },

  /**
   * Get user's received tips
   */
  async getReceivedTips(userId: string, limit: number = 50): Promise<Tip[]> {
    const rows = await queryAll<{
      id: string;
      sender_id: string;
      recipient_id: string;
      amount: number;
      message: string | null;
      source_type: string | null;
      source_id: string | null;
      created_at: Date;
    }>(
      `SELECT * FROM user_tips WHERE recipient_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );

    return rows.map(r => ({
      id: r.id,
      senderId: r.sender_id,
      recipientId: r.recipient_id,
      amount: r.amount,
      message: r.message || undefined,
      sourceType: r.source_type || undefined,
      sourceId: r.source_id || undefined,
      createdAt: r.created_at,
    }));
  },

  /**
   * Get pending gifts for a user
   */
  async getPendingGifts(userId: string): Promise<Gift[]> {
    const rows = await queryAll<{
      id: string;
      sender_id: string;
      recipient_id: string;
      item_sku: string;
      message: string | null;
      total_cost: number;
      status: string;
      created_at: Date;
      expires_at: Date;
    }>(
      `SELECT * FROM user_gifts
       WHERE recipient_id = $1 AND status = 'pending' AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [userId]
    );

    return rows.map(r => ({
      id: r.id,
      senderId: r.sender_id,
      recipientId: r.recipient_id,
      itemSku: r.item_sku,
      message: r.message || undefined,
      totalCost: r.total_cost,
      status: r.status as Gift['status'],
      createdAt: r.created_at,
      expiresAt: r.expires_at,
    }));
  },

  /**
   * Get super high fives received
   */
  async getReceivedSuperHighFives(userId: string, limit: number = 50): Promise<SuperHighFive[]> {
    const rows = await queryAll<{
      id: string;
      sender_id: string;
      recipient_id: string;
      type: string;
      cost: number;
      source_type: string | null;
      source_id: string | null;
      message: string | null;
      created_at: Date;
    }>(
      `SELECT * FROM super_high_fives WHERE recipient_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );

    return rows.map(r => ({
      id: r.id,
      senderId: r.sender_id,
      recipientId: r.recipient_id,
      type: r.type as SuperHighFive['type'],
      cost: r.cost,
      sourceType: r.source_type || undefined,
      sourceId: r.source_id || undefined,
      message: r.message || undefined,
      createdAt: r.created_at,
    }));
  },

  /**
   * Get active boosts for a post
   */
  async getActiveBoost(targetType: string, targetId: string): Promise<PostBoost | null> {
    const row = await queryOne<{
      id: string;
      user_id: string;
      target_type: string;
      target_id: string;
      cost: number;
      boost_multiplier: string;
      starts_at: Date;
      ends_at: Date;
      impressions_gained: number;
    }>(
      `SELECT * FROM post_boosts
       WHERE target_type = $1 AND target_id = $2 AND ends_at > NOW()
       ORDER BY ends_at DESC LIMIT 1`,
      [targetType, targetId]
    );

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      targetType: row.target_type,
      targetId: row.target_id,
      cost: row.cost,
      boostMultiplier: parseFloat(row.boost_multiplier),
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      impressionsGained: row.impressions_gained,
    };
  },

  /**
   * Get super high five costs
   */
  getSuperHighFiveCosts() {
    return SUPER_HIGH_FIVE_COSTS;
  },

  /**
   * Get post boost options
   */
  getPostBoostOptions() {
    return POST_BOOST_OPTIONS;
  },
};

export default socialSpendingService;
