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
} from '../../modules/economy';
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

  log.info('Enhanced economy routes registered');
}

export default economyEnhancedRoutes;
