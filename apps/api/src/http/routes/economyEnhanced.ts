/**
 * Enhanced Economy Routes
 *
 * New economy endpoints for:
 * - Credit earn events (real-time visibility)
 * - Bonus events (lucky rep, golden set, etc.)
 * - Geo-based hangouts
 * - Credit packages and purchases
 * - Social spending (tips, gifts, boosts)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  earnEventsService,
  bonusEventsService,
  geoHangoutsService,
  paymentsService,
  socialSpendingService,
  creditService,
} from '../../modules/economy';
import { streaksService } from '../../modules/engagement/streaks.service';
import { dailyLoginService } from '../../modules/engagement/daily-login.service';
import { authenticate } from './auth';
import { loggers } from '../../lib/logger';

const log = loggers.http;

// ============================================
// SCHEMAS
// ============================================

const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().optional(),
  city: z.string().optional(),
  stateProvince: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  timezone: z.string().optional(),
  shareExact: z.boolean().optional(),
  shareCity: z.boolean().optional(),
  visibleInHangout: z.boolean().optional(),
});

const createChallengeSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  challengeType: z.string(),
  metricKey: z.string().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  basePrize: z.number().min(0).optional(),
  entryFee: z.number().min(0).optional(),
  maxParticipants: z.number().min(1).optional(),
});

const createEventSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  locationType: z.enum(['in_person', 'virtual', 'hybrid']),
  locationName: z.string().optional(),
  locationAddress: z.string().optional(),
  maxAttendees: z.number().min(1).optional(),
});

const sendTipSchema = z.object({
  recipientId: z.string(),
  amount: z.number().min(1).max(10000),
  message: z.string().max(500).optional(),
  sourceType: z.string().optional(),
  sourceId: z.string().optional(),
});

const sendGiftSchema = z.object({
  recipientId: z.string(),
  itemSku: z.string(),
  message: z.string().max(500).optional(),
});

const superHighFiveSchema = z.object({
  recipientId: z.string(),
  type: z.enum(['super', 'mega', 'standing_ovation']),
  sourceType: z.string().optional(),
  sourceId: z.string().optional(),
  message: z.string().max(255).optional(),
});

const boostPostSchema = z.object({
  targetType: z.string(),
  targetId: z.string(),
  boostOption: z.enum(['24h', '7d']),
});

const stripeCheckoutSchema = z.object({
  packageId: z.string(),
  quantity: z.number().min(1).max(10).optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

// ============================================
// ROUTE REGISTRATION
// ============================================

export async function economyEnhancedRoutes(fastify: FastifyInstance) {
  // ============================================
  // CREDIT EARN EVENTS
  // ============================================

  // Get unseen earn events
  fastify.get('/earn-events', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;
      const { limit } = paginationSchema.parse(request.query);

      const events = await earnEventsService.getUnseenEvents(userId, limit);

      return reply.send({
        events,
        count: events.length,
      });
    },
  });

  // Get recent earn events (including seen)
  fastify.get('/earn-events/recent', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;
      const { limit } = paginationSchema.parse(request.query);

      const events = await earnEventsService.getRecentEvents(userId, limit);

      return reply.send({
        events,
        count: events.length,
      });
    },
  });

  // Mark events as seen
  fastify.post('/earn-events/mark-seen', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;
      const body = request.body as { eventIds?: string[] };

      const count = await earnEventsService.markEventsSeen(userId, body.eventIds);

      return reply.send({ marked: count });
    },
  });

  // Get today's earning summary
  fastify.get('/earn-events/today', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;

      const summary = await earnEventsService.getTodaySummary(userId);

      return reply.send(summary);
    },
  });

  // Get this week's earning summary
  fastify.get('/earn-events/week', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;

      const summary = await earnEventsService.getWeekSummary(userId);

      return reply.send(summary);
    },
  });

  // ============================================
  // BONUS EVENTS
  // ============================================

  // Get bonus event types
  fastify.get('/bonus-events/types', {
    handler: async (_request: FastifyRequest, reply: FastifyReply) => {
      const types = await bonusEventsService.getEventTypes(true);

      return reply.send({ types });
    },
  });

  // Get user's bonus event history
  fastify.get('/bonus-events/history', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;
      const { limit, offset } = paginationSchema.parse(request.query);

      const history = await bonusEventsService.getUserBonusHistory(userId, limit, offset);

      return reply.send({ history });
    },
  });

  // ============================================
  // GEO HANGOUTS
  // ============================================

  // Update user location
  fastify.post('/location', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;
      const body = updateLocationSchema.parse(request.body);

      const location = await geoHangoutsService.updateUserLocation(
        userId,
        body.latitude,
        body.longitude,
        {
          accuracyMeters: body.accuracyMeters,
          city: body.city,
          stateProvince: body.stateProvince,
          country: body.country,
          postalCode: body.postalCode,
          timezone: body.timezone,
          shareExact: body.shareExact,
          shareCity: body.shareCity,
          visibleInHangout: body.visibleInHangout,
        }
      );

      return reply.send({ location });
    },
  });

  // Get user's location
  fastify.get('/location', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;

      const location = await geoHangoutsService.getUserLocation(userId);

      if (!location) {
        return reply.status(404).send({ error: 'Location not set' });
      }

      return reply.send({ location });
    },
  });

  // Get user's primary hangout
  fastify.get('/hangouts/geo/my', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;

      const hangout = await geoHangoutsService.getUserPrimaryHangout(userId);

      if (!hangout) {
        return reply.status(404).send({ error: 'No hangout assigned. Update your location first.' });
      }

      return reply.send({ hangout });
    },
  });

  // Get hangout details
  fastify.get('/hangouts/geo/:hangoutId', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { hangoutId } = request.params as { hangoutId: string };

      const hangout = await geoHangoutsService.getHangout(hangoutId);

      if (!hangout) {
        return reply.status(404).send({ error: 'Hangout not found' });
      }

      return reply.send({ hangout });
    },
  });

  // Get hangout members
  fastify.get('/hangouts/geo/:hangoutId/members', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;
      const { hangoutId } = request.params as { hangoutId: string };
      const { limit, offset } = paginationSchema.parse(request.query);
      const { onlineOnly } = request.query as { onlineOnly?: string };

      const result = await geoHangoutsService.getHangoutMembers(hangoutId, userId, {
        limit,
        offset,
        onlineOnly: onlineOnly === 'true',
      });

      return reply.send(result);
    },
  });

  // Get hangout challenges
  fastify.get('/hangouts/geo/:hangoutId/challenges', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { hangoutId } = request.params as { hangoutId: string };
      const { limit, offset } = paginationSchema.parse(request.query);
      const { status } = request.query as { status?: string };

      const challenges = await geoHangoutsService.getHangoutChallenges(hangoutId, {
        limit,
        offset,
        status,
      });

      return reply.send({ challenges });
    },
  });

  // Create hangout challenge
  fastify.post('/hangouts/geo/:hangoutId/challenges', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;
      const { hangoutId } = request.params as { hangoutId: string };
      const body = createChallengeSchema.parse(request.body);

      const challenge = await geoHangoutsService.createChallenge(hangoutId, userId, {
        name: body.name,
        description: body.description,
        challengeType: body.challengeType,
        metricKey: body.metricKey,
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
        basePrize: body.basePrize,
        entryFee: body.entryFee,
        maxParticipants: body.maxParticipants,
      });

      return reply.status(201).send({ challenge });
    },
  });

  // Get hangout events
  fastify.get('/hangouts/geo/:hangoutId/events', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { hangoutId } = request.params as { hangoutId: string };
      const { limit, offset } = paginationSchema.parse(request.query);
      const { upcoming } = request.query as { upcoming?: string };

      const events = await geoHangoutsService.getHangoutEvents(hangoutId, {
        limit,
        offset,
        upcoming: upcoming !== 'false',
      });

      return reply.send({ events });
    },
  });

  // Create hangout event
  fastify.post('/hangouts/geo/:hangoutId/events', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;
      const { hangoutId } = request.params as { hangoutId: string };
      const body = createEventSchema.parse(request.body);

      const event = await geoHangoutsService.createEvent(hangoutId, userId, {
        title: body.title,
        description: body.description,
        startsAt: new Date(body.startsAt),
        endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
        locationType: body.locationType,
        locationName: body.locationName,
        locationAddress: body.locationAddress,
        maxAttendees: body.maxAttendees,
      });

      return reply.status(201).send({ event });
    },
  });

  // ============================================
  // CREDIT PACKAGES & PAYMENTS
  // ============================================

  // Get credit packages
  fastify.get('/packages', {
    handler: async (_request: FastifyRequest, reply: FastifyReply) => {
      const packages = await paymentsService.getPackages(true);

      return reply.send({ packages });
    },
  });

  // Get specific package
  fastify.get('/packages/:packageId', {
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { packageId } = request.params as { packageId: string };

      const pkg = await paymentsService.getPackage(packageId);

      if (!pkg) {
        return reply.status(404).send({ error: 'Package not found' });
      }

      return reply.send({ package: pkg });
    },
  });

  // Calculate custom price
  fastify.get('/packages/custom/:credits', {
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { credits } = request.params as { credits: string };
      const numCredits = parseInt(credits);

      if (isNaN(numCredits) || numCredits < 100) {
        return reply.status(400).send({ error: 'Minimum 100 credits' });
      }

      const pricing = paymentsService.calculateCustomPrice(numCredits);

      return reply.send(pricing);
    },
  });

  // Create Stripe checkout session
  fastify.post('/checkout/stripe', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;
      const body = stripeCheckoutSchema.parse(request.body);

      try {
        const session = await paymentsService.createStripeCheckout(userId, body.packageId, {
          successUrl: body.successUrl,
          cancelUrl: body.cancelUrl,
          quantity: body.quantity,
        });

        return reply.send(session);
      } catch (error: any) {
        log.error({ error, userId }, 'Failed to create checkout session');
        return reply.status(400).send({ error: error.message });
      }
    },
  });

  // Stripe webhook
  fastify.post('/webhook/stripe', {
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const signature = request.headers['stripe-signature'] as string;
      // For raw body access, we use request.body as string since Fastify parses it
      const body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);

      if (!signature || !body) {
        return reply.status(400).send({ error: 'Missing signature or body' });
      }

      const event = paymentsService.verifyStripeWebhook(body, signature);

      if (!event) {
        return reply.status(400).send({ error: 'Invalid webhook signature' });
      }

      try {
        await paymentsService.handleStripeWebhook(event);
        return reply.send({ received: true });
      } catch (error: any) {
        log.error({ error }, 'Webhook handler failed');
        return reply.status(500).send({ error: 'Webhook handler failed' });
      }
    },
  });

  // Get user's purchase history
  fastify.get('/purchases', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;
      const { limit, offset } = paginationSchema.parse(request.query);

      const purchases = await paymentsService.getUserPurchases(userId, { limit, offset });

      return reply.send({ purchases });
    },
  });

  // ============================================
  // SOCIAL SPENDING
  // ============================================

  // Send a tip
  fastify.post('/social/tip', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;
      const body = sendTipSchema.parse(request.body);

      try {
        const tip = await socialSpendingService.sendTip(userId, body.recipientId, body.amount, {
          message: body.message,
          sourceType: body.sourceType,
          sourceId: body.sourceId,
        });

        return reply.status(201).send({ tip });
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    },
  });

  // Get sent tips
  fastify.get('/social/tips/sent', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;
      const { limit } = paginationSchema.parse(request.query);

      const tips = await socialSpendingService.getSentTips(userId, limit);

      return reply.send({ tips });
    },
  });

  // Get received tips
  fastify.get('/social/tips/received', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;
      const { limit } = paginationSchema.parse(request.query);

      const tips = await socialSpendingService.getReceivedTips(userId, limit);

      return reply.send({ tips });
    },
  });

  // Send a gift
  fastify.post('/social/gift', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;
      const body = sendGiftSchema.parse(request.body);

      try {
        const gift = await socialSpendingService.sendGift(userId, body.recipientId, body.itemSku, {
          message: body.message,
        });

        return reply.status(201).send({ gift });
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    },
  });

  // Get pending gifts
  fastify.get('/social/gifts/pending', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;

      const gifts = await socialSpendingService.getPendingGifts(userId);

      return reply.send({ gifts });
    },
  });

  // Accept a gift
  fastify.post('/social/gifts/:giftId/accept', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;
      const { giftId } = request.params as { giftId: string };

      try {
        await socialSpendingService.acceptGift(giftId, userId);
        return reply.send({ success: true });
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    },
  });

  // Decline a gift
  fastify.post('/social/gifts/:giftId/decline', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;
      const { giftId } = request.params as { giftId: string };

      try {
        await socialSpendingService.declineGift(giftId, userId);
        return reply.send({ success: true });
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    },
  });

  // Send super high five
  fastify.post('/social/high-five/super', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;
      const body = superHighFiveSchema.parse(request.body);

      try {
        const highFive = await socialSpendingService.sendSuperHighFive(
          userId,
          body.recipientId,
          body.type,
          {
            sourceType: body.sourceType,
            sourceId: body.sourceId,
            message: body.message,
          }
        );

        return reply.status(201).send({ highFive });
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    },
  });

  // Get super high five costs
  fastify.get('/social/high-five/costs', {
    handler: async (_request: FastifyRequest, reply: FastifyReply) => {
      const costs = socialSpendingService.getSuperHighFiveCosts();

      return reply.send({ costs });
    },
  });

  // Get received super high fives
  fastify.get('/social/high-fives/received', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;
      const { limit } = paginationSchema.parse(request.query);

      const highFives = await socialSpendingService.getReceivedSuperHighFives(userId, limit);

      return reply.send({ highFives });
    },
  });

  // Boost a post
  fastify.post('/social/boost', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;
      const body = boostPostSchema.parse(request.body);

      try {
        const boost = await socialSpendingService.boostPost(
          userId,
          body.targetType,
          body.targetId,
          body.boostOption
        );

        return reply.status(201).send({ boost });
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    },
  });

  // Get post boost options
  fastify.get('/social/boost/options', {
    handler: async (_request: FastifyRequest, reply: FastifyReply) => {
      const options = socialSpendingService.getPostBoostOptions();

      return reply.send({ options });
    },
  });

  // Check if post has active boost
  fastify.get('/social/boost/check', {
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { targetType, targetId } = request.query as { targetType: string; targetId: string };

      if (!targetType || !targetId) {
        return reply.status(400).send({ error: 'Missing targetType or targetId' });
      }

      const boost = await socialSpendingService.getActiveBoost(targetType, targetId);

      return reply.send({ boost, hasBost: !!boost });
    },
  });

  // ============================================
  // STREAK FREEZE PURCHASE
  // ============================================

  // Get streak freeze pricing and user status
  fastify.get('/utility/streak-freeze', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;

      // Get current streak status
      const streakStatus = await dailyLoginService.getStatus(userId);
      const allStreaks = await streaksService.getAllStreaks(userId);

      // Define pricing (50 credits per freeze as per economy plan)
      const STREAK_FREEZE_PRICE = 50;
      const MAX_FREEZES_OWNED = 5;

      return reply.send({
        price: STREAK_FREEZE_PRICE,
        maxOwned: MAX_FREEZES_OWNED,
        currentOwned: streakStatus.streakFreezesOwned,
        canPurchase: streakStatus.streakFreezesOwned < MAX_FREEZES_OWNED,
        loginStreak: {
          current: streakStatus.currentStreak,
          atRisk: streakStatus.streakAtRisk,
        },
        workoutStreak: {
          current: allStreaks.streaks.find((s) => s.streakType === 'workout')?.currentStreak ?? 0,
        },
      });
    },
  });

  // Purchase a streak freeze
  fastify.post('/utility/streak-freeze/purchase', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;
      const body = z
        .object({
          quantity: z.number().min(1).max(5).default(1),
        })
        .parse(request.body || {});

      const STREAK_FREEZE_PRICE = 50;
      const MAX_FREEZES_OWNED = 5;

      // Check current freeze count
      const streakStatus = await dailyLoginService.getStatus(userId);
      const canPurchase = MAX_FREEZES_OWNED - streakStatus.streakFreezesOwned;

      if (canPurchase <= 0) {
        return reply.status(400).send({
          error: `Already own maximum freezes (${MAX_FREEZES_OWNED})`,
        });
      }

      const quantityToBuy = Math.min(body.quantity, canPurchase);
      const totalCost = quantityToBuy * STREAK_FREEZE_PRICE;

      // Deduct credits using charge method
      const chargeResult = await creditService.charge({
        userId,
        action: 'purchase.streak_freeze',
        amount: totalCost,
        metadata: { quantity: quantityToBuy },
        idempotencyKey: `streak-freeze-${userId}-${Date.now()}`,
      });

      if (!chargeResult.success) {
        return reply.status(402).send({
          error: chargeResult.error || 'Insufficient credits',
          required: totalCost,
        });
      }

      // Add freezes to user
      const { query } = await import('../../db/client');
      await query(
        `UPDATE user_login_streaks
         SET streak_freezes_owned = COALESCE(streak_freezes_owned, 0) + $1
         WHERE user_id = $2`,
        [quantityToBuy, userId]
      );

      // Create earn event for visibility
      await earnEventsService.createEvent({
        userId,
        amount: -totalCost,
        source: 'purchase.streak_freeze',
        description: `Purchased ${quantityToBuy} streak freeze${quantityToBuy > 1 ? 's' : ''}`,
        forceAnimationType: 'purchase',
        forceIcon: 'shield',
      });

      return reply.status(201).send({
        success: true,
        purchased: quantityToBuy,
        totalCost,
        newBalance: chargeResult.newBalance,
        freezesOwned: streakStatus.streakFreezesOwned + quantityToBuy,
      });
    },
  });

  // Use a streak freeze
  fastify.post('/utility/streak-freeze/use', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;
      const body = z
        .object({
          streakType: z.enum(['login', 'workout', 'nutrition', 'sleep', 'social']).default('login'),
        })
        .parse(request.body || {});

      try {
        // Currently only login streak freezes are implemented
        if (body.streakType !== 'login') {
          return reply.status(400).send({
            error: `Streak freezes for ${body.streakType} are not yet implemented. Only login streak freezes are available.`,
          });
        }

        const result = await dailyLoginService.useStreakFreeze(userId);

        return reply.send({
          success: result.success,
          streakType: body.streakType,
          freezesRemaining: result.freezesRemaining,
          message: `Streak freeze applied to ${body.streakType} streak`,
        });
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    },
  });

  // ============================================
  // REAL-TIME EARN EVENTS (SSE STREAMING)
  // ============================================

  // SSE endpoint for real-time credit earn events
  fastify.get('/earn-events/stream', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;

      // Set SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable Nginx buffering
      });

      // Send initial connection event
      reply.raw.write(`event: connected\ndata: ${JSON.stringify({ userId, timestamp: new Date().toISOString() })}\n\n`);

      // Poll for new events every 2 seconds
      let lastEventId: string | null = null;
      let isConnected = true;

      const pollInterval = setInterval(async () => {
        if (!isConnected) {
          clearInterval(pollInterval);
          return;
        }

        try {
          // Get unseen events
          const events = await earnEventsService.getUnseenEvents(userId, 10);

          if (events.length > 0) {
            // Filter to only new events (after lastEventId)
            const newEvents = lastEventId
              ? events.filter((e) => e.id > lastEventId!)
              : events;

            if (newEvents.length > 0) {
              // Send each event
              for (const event of newEvents) {
                reply.raw.write(
                  `event: earn\ndata: ${JSON.stringify({
                    id: event.id,
                    amount: event.amount,
                    source: event.source,
                    description: event.description,
                    animationType: event.animationType,
                    icon: event.icon,
                    color: event.color,
                    createdAt: event.createdAt,
                  })}\n\n`
                );
                lastEventId = event.id;
              }

              // Mark as seen
              await earnEventsService.markEventsSeen(
                userId,
                newEvents.map((e) => e.id)
              );
            }
          }
        } catch (error) {
          log.warn({ userId, error }, 'Error polling earn events');
        }
      }, 2000);

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        if (!isConnected) {
          clearInterval(heartbeatInterval);
          return;
        }
        reply.raw.write(`: heartbeat\n\n`);
      }, 30000);

      // Clean up on disconnect
      request.raw.on('close', () => {
        isConnected = false;
        clearInterval(pollInterval);
        clearInterval(heartbeatInterval);
        log.debug({ userId }, 'Earn events SSE connection closed');
      });

      // Don't end the response - keep it open for SSE
      // reply.raw.end() will be called when the client disconnects
    },
  });

  // ============================================
  // CREDIT SUBSCRIPTIONS
  // ============================================

  // Get subscription tiers
  fastify.get('/subscriptions/tiers', {
    handler: async (_request: FastifyRequest, reply: FastifyReply) => {
      // Subscription tiers from the economy plan
      const tiers = [
        {
          id: 'bronze',
          name: 'Bronze',
          pricePerMonth: 499, // $4.99
          creditsPerMonth: 600,
          effectiveRate: 83, // $0.83 per 100 credits
          perks: ['5% store discount'],
          stripePriceId: process.env.STRIPE_BRONZE_PRICE_ID,
        },
        {
          id: 'silver',
          name: 'Silver',
          pricePerMonth: 999, // $9.99
          creditsPerMonth: 1400,
          effectiveRate: 71, // $0.71 per 100 credits
          perks: ['10% store discount', 'Priority support'],
          stripePriceId: process.env.STRIPE_SILVER_PRICE_ID,
        },
        {
          id: 'gold',
          name: 'Gold',
          pricePerMonth: 1999, // $19.99
          creditsPerMonth: 3200,
          effectiveRate: 62, // $0.62 per 100 credits
          perks: ['15% store discount', 'Priority support', 'Early access'],
          popular: true,
          stripePriceId: process.env.STRIPE_GOLD_PRICE_ID,
        },
        {
          id: 'platinum',
          name: 'Platinum',
          pricePerMonth: 4999, // $49.99
          creditsPerMonth: 9000,
          effectiveRate: 55, // $0.55 per 100 credits
          perks: ['20% store discount', 'Priority support', 'Early access', 'Exclusive items'],
          bestValue: true,
          stripePriceId: process.env.STRIPE_PLATINUM_PRICE_ID,
        },
      ];

      return reply.send({ tiers });
    },
  });

  // Get user's current subscription
  fastify.get('/subscriptions/current', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;

      const { queryOne } = await import('../../db/client');

      const subscription = await queryOne<{
        id: string;
        tier: string;
        status: string;
        current_period_start: Date;
        current_period_end: Date;
        cancel_at_period_end: boolean;
        stripe_subscription_id: string | null;
      }>(
        `SELECT * FROM credit_subscriptions WHERE user_id = $1 AND status = 'active'`,
        [userId]
      );

      if (!subscription) {
        return reply.send({ subscription: null });
      }

      return reply.send({
        subscription: {
          id: subscription.id,
          tier: subscription.tier,
          status: subscription.status,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      });
    },
  });

  // Create subscription checkout (Stripe)
  fastify.post('/subscriptions/checkout', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;
      const body = z
        .object({
          tier: z.enum(['bronze', 'silver', 'gold', 'platinum']),
          successUrl: z.string().url(),
          cancelUrl: z.string().url(),
        })
        .parse(request.body);

      // Map tier to Stripe price ID
      const priceIdMap: Record<string, string | undefined> = {
        bronze: process.env.STRIPE_BRONZE_PRICE_ID,
        silver: process.env.STRIPE_SILVER_PRICE_ID,
        gold: process.env.STRIPE_GOLD_PRICE_ID,
        platinum: process.env.STRIPE_PLATINUM_PRICE_ID,
      };

      const priceId = priceIdMap[body.tier];
      if (!priceId) {
        return reply.status(400).send({
          error: 'Subscription tier not configured. Please contact support.',
        });
      }

      try {
        // Create Stripe checkout session for subscription
        const stripe = paymentsService.getStripeClient();
        if (!stripe) {
          return reply.status(503).send({
            error: 'Payment processing not available',
          });
        }

        // Get or create Stripe customer
        const { queryOne, query } = await import('../../db/client');
        let stripeCustomerId = await queryOne<{ stripe_customer_id: string }>(
          `SELECT stripe_customer_id FROM users WHERE id = $1`,
          [userId]
        );

        if (!stripeCustomerId?.stripe_customer_id) {
          // Get user email
          const user = await queryOne<{ email: string; username: string }>(
            `SELECT email, username FROM users WHERE id = $1`,
            [userId]
          );

          if (!user?.email) {
            return reply.status(400).send({ error: 'User email not found' });
          }

          // Create Stripe customer
          const customer = await stripe.customers.create({
            email: user.email,
            metadata: { userId, username: user.username },
          });

          await query(
            `UPDATE users SET stripe_customer_id = $1 WHERE id = $2`,
            [customer.id, userId]
          );

          stripeCustomerId = { stripe_customer_id: customer.id };
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
          customer: stripeCustomerId.stripe_customer_id,
          mode: 'subscription',
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          success_url: body.successUrl,
          cancel_url: body.cancelUrl,
          metadata: {
            userId,
            tier: body.tier,
            type: 'subscription',
          },
        });

        return reply.send({
          checkoutUrl: session.url,
          sessionId: session.id,
        });
      } catch (error: any) {
        log.error({ userId, error }, 'Failed to create subscription checkout');
        return reply.status(400).send({ error: error.message });
      }
    },
  });

  // Cancel subscription
  fastify.post('/subscriptions/cancel', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id;

      const { queryOne, query } = await import('../../db/client');

      const subscription = await queryOne<{
        id: string;
        stripe_subscription_id: string | null;
      }>(
        `SELECT id, stripe_subscription_id FROM credit_subscriptions WHERE user_id = $1 AND status = 'active'`,
        [userId]
      );

      if (!subscription) {
        return reply.status(404).send({ error: 'No active subscription found' });
      }

      // Cancel in Stripe
      if (subscription.stripe_subscription_id) {
        const stripe = paymentsService.getStripeClient();
        if (stripe) {
          await stripe.subscriptions.update(subscription.stripe_subscription_id, {
            cancel_at_period_end: true,
          });
        }
      }

      // Update local record
      await query(
        `UPDATE credit_subscriptions SET cancel_at_period_end = true, updated_at = NOW() WHERE id = $1`,
        [subscription.id]
      );

      return reply.send({
        success: true,
        message: 'Subscription will be canceled at the end of the current billing period',
      });
    },
  });

  log.info('Enhanced economy routes registered');
}

export default economyEnhancedRoutes;
