/**
 * Gift Service
 *
 * Handles gifting of cosmetics, credits, and mystery boxes between users.
 * Supports scheduled delivery, anonymous gifting, and various wrapping styles.
 */

import { queryOne, queryAll, query, transaction } from '../../db/client';
import { PoolClient } from 'pg';

// =====================================================
// TYPES
// =====================================================

export interface CreateGiftInput {
  senderId: string;
  recipientId: string;
  cosmeticId?: string;      // user_spirit_cosmetics ID for cosmetic gifts
  creditAmount?: number;     // Credits to gift
  mysteryBoxId?: string;     // Mystery box to gift
  wrappingStyle?: 'standard' | 'birthday' | 'holiday' | 'congrats' | 'custom';
  message?: string;
  isAnonymous?: boolean;
  scheduledDelivery?: Date;
}

interface Gift {
  id: string;
  sender_id: string | null;
  recipient_id: string;
  cosmetic_id: string | null;
  credit_amount: number | null;
  mystery_box_id: string | null;
  wrapping_style: string;
  message: string | null;
  is_anonymous: boolean;
  scheduled_delivery: Date | null;
  status: string;
  delivered_at: Date | null;
  opened_at: Date | null;
  created_at: Date;
}

interface UserCosmetic {
  id: string;
  user_id: string;
  cosmetic_id: string;
  is_listed: boolean;
}

interface Cosmetic {
  id: string;
  name: string;
  rarity: string;
  is_giftable: boolean;
  base_price: number;
}

// =====================================================
// GIFT SERVICE
// =====================================================

export const giftService = {
  // =====================================================
  // CREATE & SEND GIFTS
  // =====================================================

  async createGift(input: CreateGiftInput) {
    const {
      senderId,
      recipientId,
      cosmeticId,
      creditAmount,
      mysteryBoxId,
      wrappingStyle = 'standard',
      message,
      isAnonymous = false,
      scheduledDelivery,
    } = input;

    // Validation
    if (senderId === recipientId) {
      throw new Error('Cannot gift to yourself');
    }

    if (!cosmeticId && !creditAmount && !mysteryBoxId) {
      throw new Error('Gift must include a cosmetic, credits, or mystery box');
    }

    // Verify recipient exists
    const recipient = await queryOne<{ id: string }>(
      `SELECT id FROM users WHERE id = $1`,
      [recipientId]
    );

    if (!recipient) {
      throw new Error('Recipient not found');
    }

    // Handle cosmetic gift
    let actualCosmeticId: string | null = null;
    if (cosmeticId) {
      const userCosmetic = await queryOne<UserCosmetic>(
        `SELECT id, user_id, cosmetic_id, is_listed FROM user_spirit_cosmetics
         WHERE id = $1 AND user_id = $2`,
        [cosmeticId, senderId]
      );

      if (!userCosmetic) {
        throw new Error('You do not own this cosmetic');
      }

      if (userCosmetic.is_listed) {
        throw new Error('Cannot gift a cosmetic that is listed on the marketplace');
      }

      // Check if cosmetic is giftable
      const cosmetic = await queryOne<Cosmetic>(
        `SELECT id, is_giftable FROM spirit_animal_cosmetics WHERE id = $1`,
        [userCosmetic.cosmetic_id]
      );

      if (!cosmetic?.is_giftable) {
        throw new Error('This cosmetic cannot be gifted');
      }

      actualCosmeticId = userCosmetic.cosmetic_id;
    }

    // Handle credit gift
    if (creditAmount) {
      if (creditAmount < 1) {
        throw new Error('Credit amount must be positive');
      }

      const senderBalance = await queryOne<{ balance: number }>(
        `SELECT balance FROM credit_balances WHERE user_id = $1`,
        [senderId]
      );

      if (!senderBalance || senderBalance.balance < creditAmount) {
        throw new Error('Insufficient credits');
      }
    }

    // Handle mystery box gift
    if (mysteryBoxId) {
      const box = await queryOne<{ id: string; price: number }>(
        `SELECT id, price FROM mystery_boxes WHERE id = $1 AND is_active = true`,
        [mysteryBoxId]
      );

      if (!box) {
        throw new Error('Mystery box not found or not available');
      }

      // Check sender has credits to buy the box
      const senderBalance = await queryOne<{ balance: number }>(
        `SELECT balance FROM credit_balances WHERE user_id = $1`,
        [senderId]
      );

      if (!senderBalance || senderBalance.balance < box.price) {
        throw new Error('Insufficient credits to gift this mystery box');
      }
    }

    // Create the gift in a transaction
    return transaction(async (client: PoolClient) => {
      // Deduct credits if gifting credits or mystery box
      if (creditAmount) {
        await client.query(
          `UPDATE credit_balances SET balance = balance - $1 WHERE user_id = $2`,
          [creditAmount, senderId]
        );
      }

      if (mysteryBoxId) {
        const boxResult = await client.query<{ price: number }>(
          `SELECT price FROM mystery_boxes WHERE id = $1`,
          [mysteryBoxId]
        );
        const boxPrice = boxResult.rows[0]?.price || 0;

        await client.query(
          `UPDATE credit_balances SET balance = balance - $1 WHERE user_id = $2`,
          [boxPrice, senderId]
        );
      }

      // Transfer cosmetic ownership temporarily (mark as in gift)
      if (cosmeticId) {
        await client.query(
          `UPDATE user_spirit_cosmetics
           SET trade_cooldown_until = NOW() + INTERVAL '7 days'
           WHERE id = $1`,
          [cosmeticId]
        );
      }

      // Create gift record
      const result = await client.query<Gift>(
        `INSERT INTO cosmetic_gifts (
          sender_id, recipient_id, cosmetic_id, credit_amount, mystery_box_id,
          wrapping_style, message, is_anonymous, scheduled_delivery, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          senderId, recipientId, actualCosmeticId, creditAmount, mysteryBoxId,
          wrappingStyle, message, isAnonymous, scheduledDelivery,
          scheduledDelivery ? 'pending' : 'delivered',
        ]
      );

      const gift = result.rows[0];

      // If no scheduled delivery, deliver immediately
      if (!scheduledDelivery) {
        await this.deliverGiftWithClient(client, gift.id, cosmeticId);
      }

      return gift;
    });
  },

  async deliverGiftWithClient(client: PoolClient, giftId: string, userCosmeticId?: string) {
    const giftResult = await client.query<Gift>(
      `SELECT * FROM cosmetic_gifts WHERE id = $1 AND status = 'pending'`,
      [giftId]
    );

    const gift = giftResult.rows[0];
    if (!gift) {
      return;
    }

    // Transfer cosmetic
    if (gift.cosmetic_id && userCosmeticId) {
      await client.query(
        `UPDATE user_spirit_cosmetics
         SET user_id = $1, acquired_at = NOW(), acquisition_method = 'gift',
             trade_cooldown_until = NOW() + INTERVAL '24 hours'
         WHERE id = $2`,
        [gift.recipient_id, userCosmeticId]
      );
    }

    // Transfer credits
    if (gift.credit_amount) {
      await client.query(
        `INSERT INTO credit_balances (user_id, balance)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET balance = credit_balances.balance + $2`,
        [gift.recipient_id, gift.credit_amount]
      );
    }

    // Update gift status
    await client.query(
      `UPDATE cosmetic_gifts SET status = 'delivered', delivered_at = NOW() WHERE id = $1`,
      [giftId]
    );
  },

  // =====================================================
  // VIEW & OPEN GIFTS
  // =====================================================

  async getReceivedGifts(userId: string, status?: 'pending' | 'delivered' | 'opened') {
    let statusCondition = '';
    const params: unknown[] = [userId];

    if (status) {
      statusCondition = 'AND g.status = $2';
      params.push(status);
    }

    return queryAll<Record<string, unknown>>(
      `SELECT g.*,
        c.name as cosmetic_name, c.rarity as cosmetic_rarity, c.preview_url as cosmetic_preview,
        mb.name as mystery_box_name,
        CASE WHEN g.is_anonymous THEN NULL ELSE u.username END as sender_username,
        CASE WHEN g.is_anonymous THEN NULL ELSE u.avatar_url END as sender_avatar
       FROM cosmetic_gifts g
       LEFT JOIN spirit_animal_cosmetics c ON g.cosmetic_id = c.id
       LEFT JOIN mystery_boxes mb ON g.mystery_box_id = mb.id
       LEFT JOIN users u ON g.sender_id = u.id
       WHERE g.recipient_id = $1 ${statusCondition}
       ORDER BY g.created_at DESC`,
      params
    );
  },

  async getSentGifts(userId: string, limit = 50) {
    return queryAll<Record<string, unknown>>(
      `SELECT g.*,
        c.name as cosmetic_name, c.rarity as cosmetic_rarity, c.preview_url as cosmetic_preview,
        mb.name as mystery_box_name,
        u.username as recipient_username, u.avatar_url as recipient_avatar
       FROM cosmetic_gifts g
       LEFT JOIN spirit_animal_cosmetics c ON g.cosmetic_id = c.id
       LEFT JOIN mystery_boxes mb ON g.mystery_box_id = mb.id
       JOIN users u ON g.recipient_id = u.id
       WHERE g.sender_id = $1
       ORDER BY g.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
  },

  async getGiftDetails(giftId: string, userId: string) {
    const gift = await queryOne<Record<string, unknown>>(
      `SELECT g.*,
        c.name as cosmetic_name, c.rarity as cosmetic_rarity,
        c.description as cosmetic_description, c.preview_url as cosmetic_preview,
        mb.name as mystery_box_name, mb.description as mystery_box_description,
        CASE WHEN g.is_anonymous AND g.recipient_id = $2 THEN NULL ELSE sender.username END as sender_username,
        CASE WHEN g.is_anonymous AND g.recipient_id = $2 THEN NULL ELSE sender.avatar_url END as sender_avatar,
        recipient.username as recipient_username, recipient.avatar_url as recipient_avatar
       FROM cosmetic_gifts g
       LEFT JOIN spirit_animal_cosmetics c ON g.cosmetic_id = c.id
       LEFT JOIN mystery_boxes mb ON g.mystery_box_id = mb.id
       LEFT JOIN users sender ON g.sender_id = sender.id
       JOIN users recipient ON g.recipient_id = recipient.id
       WHERE g.id = $1 AND (g.sender_id = $2 OR g.recipient_id = $2)`,
      [giftId, userId]
    );

    return gift;
  },

  async openGift(giftId: string, userId: string) {
    const gift = await queryOne<Gift>(
      `SELECT * FROM cosmetic_gifts
       WHERE id = $1 AND recipient_id = $2 AND status = 'delivered'`,
      [giftId, userId]
    );

    if (!gift) {
      throw new Error('Gift not found or already opened');
    }

    // Mark as opened
    await query(
      `UPDATE cosmetic_gifts SET status = 'opened', opened_at = NOW() WHERE id = $1`,
      [giftId]
    );

    // Return the gift contents
    const details = await this.getGiftDetails(giftId, userId);

    return {
      ...details,
      justOpened: true,
    };
  },

  // =====================================================
  // RETURN GIFTS
  // =====================================================

  async returnGift(giftId: string, userId: string) {
    return transaction(async (client: PoolClient) => {
      const giftResult = await client.query<Gift>(
        `SELECT * FROM cosmetic_gifts
         WHERE id = $1 AND recipient_id = $2 AND status = 'delivered'
         FOR UPDATE`,
        [giftId, userId]
      );

      const gift = giftResult.rows[0];
      if (!gift) {
        throw new Error('Gift not found or cannot be returned');
      }

      if (!gift.sender_id) {
        throw new Error('Cannot return a gift from an unknown sender');
      }

      // Return cosmetic
      if (gift.cosmetic_id) {
        // Find the user_spirit_cosmetics entry
        const cosmeticResult = await client.query<{ id: string }>(
          `SELECT id FROM user_spirit_cosmetics
           WHERE user_id = $1 AND cosmetic_id = $2
           ORDER BY acquired_at DESC
           LIMIT 1`,
          [userId, gift.cosmetic_id]
        );

        if (cosmeticResult.rows[0]) {
          await client.query(
            `UPDATE user_spirit_cosmetics
             SET user_id = $1, acquired_at = NOW(), acquisition_method = 'gift_returned'
             WHERE id = $2`,
            [gift.sender_id, cosmeticResult.rows[0].id]
          );
        }
      }

      // Return credits
      if (gift.credit_amount) {
        await client.query(
          `UPDATE credit_balances SET balance = balance - $1 WHERE user_id = $2`,
          [gift.credit_amount, userId]
        );
        await client.query(
          `INSERT INTO credit_balances (user_id, balance)
           VALUES ($1, $2)
           ON CONFLICT (user_id) DO UPDATE SET balance = credit_balances.balance + $2`,
          [gift.sender_id, gift.credit_amount]
        );
      }

      // Update gift status
      await client.query(
        `UPDATE cosmetic_gifts SET status = 'returned' WHERE id = $1`,
        [giftId]
      );

      return { success: true };
    });
  },

  // =====================================================
  // SCHEDULED GIFT DELIVERY
  // =====================================================

  async deliverScheduledGifts() {
    const gifts = await queryAll<Gift>(
      `SELECT * FROM cosmetic_gifts
       WHERE status = 'pending'
         AND scheduled_delivery IS NOT NULL
         AND scheduled_delivery <= NOW()`
    );

    let deliveredCount = 0;

    for (const gift of gifts) {
      try {
        await transaction(async (client: PoolClient) => {
          // Find the user_cosmetic_id if it's a cosmetic gift
          let userCosmeticId: string | undefined;
          if (gift.cosmetic_id && gift.sender_id) {
            const cosmeticResult = await client.query<{ id: string }>(
              `SELECT id FROM user_spirit_cosmetics
               WHERE user_id = $1 AND cosmetic_id = $2
               ORDER BY acquired_at DESC
               LIMIT 1`,
              [gift.sender_id, gift.cosmetic_id]
            );
            userCosmeticId = cosmeticResult.rows[0]?.id;
          }

          await this.deliverGiftWithClient(client, gift.id, userCosmeticId);
        });
        deliveredCount++;
      } catch (error) {
        // Log error but continue processing other gifts
        console.error(`Failed to deliver gift ${gift.id}:`, error);
      }
    }

    return deliveredCount;
  },

  // =====================================================
  // GIFT STATS
  // =====================================================

  async getUserGiftStats(userId: string) {
    const stats = await queryOne<{
      gifts_sent: string;
      gifts_received: string;
      total_credits_gifted: string;
      total_credits_received: string;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM cosmetic_gifts WHERE sender_id = $1)::text as gifts_sent,
        (SELECT COUNT(*) FROM cosmetic_gifts WHERE recipient_id = $1 AND status != 'returned')::text as gifts_received,
        COALESCE((SELECT SUM(credit_amount) FROM cosmetic_gifts WHERE sender_id = $1), 0)::text as total_credits_gifted,
        COALESCE((SELECT SUM(credit_amount) FROM cosmetic_gifts WHERE recipient_id = $1 AND status != 'returned'), 0)::text as total_credits_received`,
      [userId]
    );

    return {
      giftsSent: parseInt(stats?.gifts_sent || '0'),
      giftsReceived: parseInt(stats?.gifts_received || '0'),
      totalCreditsGifted: parseInt(stats?.total_credits_gifted || '0'),
      totalCreditsReceived: parseInt(stats?.total_credits_received || '0'),
    };
  },

  // Get count of unopened gifts for notification badge
  async getUnopenedGiftCount(userId: string): Promise<number> {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM cosmetic_gifts
       WHERE recipient_id = $1 AND status = 'delivered'`,
      [userId]
    );

    return parseInt(result?.count || '0');
  },
};
