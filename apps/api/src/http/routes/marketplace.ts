import { FastifyInstance } from 'fastify';
import { authenticate } from './auth';
import { marketplaceService } from '../../modules/marketplace/marketplace.service';
import { tradingService } from '../../modules/marketplace/trading.service';
import { mysteryBoxService } from '../../modules/marketplace/mystery-box.service';
import { collectionService } from '../../modules/marketplace/collection.service';
import { healthMultiplierService } from '../../modules/marketplace/health-multiplier.service';
import { z } from 'zod';

// =====================================================
// SCHEMAS
// =====================================================

const createListingSchema = z.object({
  cosmeticId: z.string().uuid(),
  userCosmeticId: z.string().uuid(),
  listingType: z.enum(['buy_now', 'auction', 'offer_only', 'reserved']),
  price: z.number().int().positive().optional(),
  minOffer: z.number().int().positive().optional(),
  reservePrice: z.number().int().positive().optional(),
  buyNowPrice: z.number().int().positive().optional(),
  bidIncrement: z.number().int().positive().optional(),
  durationHours: z.number().int().min(1).max(168).default(168),
  allowOffers: z.boolean().optional(),
  reservedForUserId: z.string().optional(),
  sellerNote: z.string().max(500).optional(),
}).transform((data) => ({
  ...data,
  durationHours: data.durationHours ?? 168,
}));

const browseListingsSchema = z.object({
  category: z.string().optional(),
  rarity: z.string().optional(),
  minPrice: z.coerce.number().int().optional(),
  maxPrice: z.coerce.number().int().optional(),
  listingType: z.enum(['buy_now', 'auction', 'offer_only']).optional(),
  sellerId: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['price_asc', 'price_desc', 'newest', 'ending_soon', 'popular']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const makeOfferSchema = z.object({
  amount: z.number().int().positive(),
  message: z.string().max(500).optional(),
});

const respondToOfferSchema = z.object({
  action: z.enum(['accept', 'decline', 'counter']),
  counterAmount: z.number().int().positive().optional(),
  counterMessage: z.string().max(500).optional(),
});

const createTradeSchema = z.object({
  receiverId: z.string(),
  initiatorItems: z.array(z.string().uuid()).max(10).default([]),
  initiatorCredits: z.number().int().min(0).default(0),
  receiverItems: z.array(z.string().uuid()).max(10).default([]),
  receiverCredits: z.number().int().min(0).default(0),
  message: z.string().max(500).optional(),
});

const counterTradeSchema = z.object({
  initiatorItems: z.array(z.string().uuid()).max(10).default([]),
  initiatorCredits: z.number().int().min(0).default(0),
  receiverItems: z.array(z.string().uuid()).max(10).default([]),
  receiverCredits: z.number().int().min(0).default(0),
  message: z.string().max(500).optional(),
});

const openBoxSchema = z.object({
  quantity: z.number().int().min(1).max(10).default(1),
});

const logHealthMetricsSchema = z.object({
  workoutCompleted: z.boolean().optional(),
  workoutIntensity: z.enum(['low', 'medium', 'high']).optional(),
  sleepHours: z.number().min(0).max(24).optional(),
  sleepQuality: z.number().int().min(0).max(100).optional(),
  nutritionScore: z.number().int().min(0).max(100).optional(),
  hydrationLiters: z.number().min(0).max(10).optional(),
  stepsCount: z.number().int().min(0).optional(),
  activeMinutes: z.number().int().min(0).optional(),
});

// =====================================================
// ROUTES
// =====================================================

export async function marketplaceRoutes(fastify: FastifyInstance) {
  // =====================================================
  // MARKETPLACE LISTINGS
  // =====================================================

  // Browse marketplace
  fastify.get('/marketplace', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const filters = browseListingsSchema.parse(request.query);
      const result = await marketplaceService.browseListings(filters);
      return { data: result };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Get single listing
  fastify.get('/marketplace/listings/:id', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const listing = await marketplaceService.getListing(id);

      if (!listing) {
        return reply.status(404).send({ error: { message: 'Listing not found' } });
      }

      return { data: listing };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Create listing
  fastify.post('/marketplace/listings', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const input = createListingSchema.parse(request.body);

      const listing = await marketplaceService.createListing({
        ...input,
        sellerId: userId,
      });

      return { data: listing };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Update listing
  fastify.patch('/marketplace/listings/:id', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const { id } = request.params as { id: string };
      const updates = request.body as { price?: number; sellerNote?: string; allowOffers?: boolean };

      const listing = await marketplaceService.updateListing(id, userId, updates);
      return { data: listing };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Cancel listing
  fastify.delete('/marketplace/listings/:id', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const { id } = request.params as { id: string };

      await marketplaceService.cancelListing(id, userId);
      return { data: { success: true } };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Buy now
  fastify.post('/marketplace/listings/:id/buy', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const { id } = request.params as { id: string };

      const result = await marketplaceService.buyNow(id, userId);
      return { data: result };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // =====================================================
  // OFFERS
  // =====================================================

  // Make offer
  fastify.post('/marketplace/listings/:id/offer', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const { id } = request.params as { id: string };
      const input = makeOfferSchema.parse(request.body);

      const offer = await marketplaceService.makeOffer({
        listingId: id,
        offererId: userId,
        ...input,
      });

      return { data: offer };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Respond to offer
  fastify.post('/marketplace/offers/:id/respond', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const { id } = request.params as { id: string };
      const input = respondToOfferSchema.parse(request.body);

      const result = await marketplaceService.respondToOffer(
        id,
        userId,
        input.action,
        input.counterAmount,
        input.counterMessage
      );

      return { data: result };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Get listing offers (for seller)
  fastify.get('/marketplace/listings/:id/offers', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const { id } = request.params as { id: string };

      const offers = await marketplaceService.getListingOffers(id, userId);
      return { data: offers };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Get my offers
  fastify.get('/marketplace/my-offers', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const offers = await marketplaceService.getUserOffers(userId);
      return { data: offers };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Withdraw offer
  fastify.delete('/marketplace/offers/:id', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const { id } = request.params as { id: string };

      await marketplaceService.withdrawOffer(id, userId);
      return { data: { success: true } };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // =====================================================
  // WATCHLIST
  // =====================================================

  // Get watchlist
  fastify.get('/marketplace/watchlist', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const items = await marketplaceService.getUserWatchlist(userId);
      return { data: items };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Add to watchlist
  fastify.post('/marketplace/watchlist', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const { listingId, priceAlert } = request.body as { listingId: string; priceAlert?: number };

      await marketplaceService.addToWatchlist(userId, listingId, priceAlert);
      return { data: { success: true } };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Remove from watchlist
  fastify.delete('/marketplace/watchlist/:listingId', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const { listingId } = request.params as { listingId: string };

      await marketplaceService.removeFromWatchlist(userId, listingId);
      return { data: { success: true } };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // =====================================================
  // MY LISTINGS & STATS
  // =====================================================

  // Get my listings
  fastify.get('/marketplace/my-listings', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const { status } = request.query as { status?: string };

      const result = await marketplaceService.browseListings({
        sellerId: userId,
        ...(status && status !== 'all' ? {} : {}),
      });

      const stats = await marketplaceService.getUserStats(userId);

      return { data: { ...result, stats } };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Get my stats
  fastify.get('/marketplace/my-stats', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const stats = await marketplaceService.getUserStats(userId);
      return { data: stats };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Get price suggestion
  fastify.get('/marketplace/price-suggestion/:cosmeticId', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { cosmeticId } = request.params as { cosmeticId: string };
      const suggestion = await marketplaceService.getPriceSuggestion(cosmeticId);
      return { data: suggestion };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Get price history
  fastify.get('/marketplace/price-history/:cosmeticId', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { cosmeticId } = request.params as { cosmeticId: string };
      const { period } = request.query as { period?: '7d' | '30d' | '90d' | 'all' };

      const history = await marketplaceService.getPriceHistory(cosmeticId, period);
      return { data: history };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Get market overview
  fastify.get('/marketplace/overview', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const overview = await marketplaceService.getMarketOverview();
      return { data: overview };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // =====================================================
  // TRADING
  // =====================================================

  // Get incoming trades
  fastify.get('/trades/incoming', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const trades = await tradingService.getIncomingTrades(userId);
      return { data: trades };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Get outgoing trades
  fastify.get('/trades/outgoing', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const trades = await tradingService.getOutgoingTrades(userId);
      return { data: trades };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Get trade history
  fastify.get('/trades/history', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const trades = await tradingService.getTradeHistory(userId);
      return { data: trades };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Create trade request
  fastify.post('/trades', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const input = createTradeSchema.parse(request.body);

      const result = await tradingService.createTradeRequest({
        ...input,
        initiatorId: userId,
      });

      return { data: result };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Get trade details
  fastify.get('/trades/:id', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const { id } = request.params as { id: string };

      const trade = await tradingService.getTradeRequest(id, userId);

      if (!trade) {
        return reply.status(404).send({ error: { message: 'Trade not found' } });
      }

      return { data: trade };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Accept trade
  fastify.post('/trades/:id/accept', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const { id } = request.params as { id: string };

      const result = await tradingService.acceptTrade(id, userId);
      return { data: result };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Decline trade
  fastify.post('/trades/:id/decline', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const { id } = request.params as { id: string };

      await tradingService.declineTrade(id, userId);
      return { data: { success: true } };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Counter trade
  fastify.post('/trades/:id/counter', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const { id } = request.params as { id: string };
      const input = counterTradeSchema.parse(request.body);

      const result = await tradingService.counterTrade(id, userId, input);
      return { data: result };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Cancel trade
  fastify.delete('/trades/:id', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const { id } = request.params as { id: string };

      await tradingService.cancelTrade(id, userId);
      return { data: { success: true } };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Estimate trade value
  fastify.post('/trades/estimate-value', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { items } = request.body as { items: string[] };

      const result = await tradingService.estimateTradeValue(items);
      return { data: result };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // =====================================================
  // MYSTERY BOXES
  // =====================================================

  // Get available boxes
  fastify.get('/mystery-boxes', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const boxes = await mysteryBoxService.getAvailableBoxes();
      return { data: boxes };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Get box details
  fastify.get('/mystery-boxes/:id', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const details = await mysteryBoxService.getBoxDetails(id);

      if (!details) {
        return reply.status(404).send({ error: { message: 'Box not found' } });
      }

      return { data: details };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Open box
  fastify.post('/mystery-boxes/:id/open', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const { id } = request.params as { id: string };
      const input = openBoxSchema.parse(request.body);

      const results = await mysteryBoxService.openBox(userId, id, input.quantity);
      return { data: results };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Get pity counters
  fastify.get('/mystery-boxes/pity', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const counters = await mysteryBoxService.getUserPityCounters(userId);
      return { data: counters };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Get opening history
  fastify.get('/mystery-boxes/history', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const history = await mysteryBoxService.getUserOpeningHistory(userId);
      return { data: history };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // =====================================================
  // COLLECTION
  // =====================================================

  // Get collection stats
  fastify.get('/collection/stats', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const stats = await collectionService.getUserCollectionStats(userId);
      return { data: stats };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Get collection items
  fastify.get('/collection', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const filters = request.query as {
        category?: string;
        rarity?: string;
        sortBy?: 'acquired' | 'name' | 'rarity' | 'value';
        limit?: string;
        offset?: string;
      };

      const result = await collectionService.getUserCollection(userId, {
        ...filters,
        limit: filters.limit ? parseInt(filters.limit) : undefined,
        offset: filters.offset ? parseInt(filters.offset) : undefined,
      });

      return { data: result };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Get collection sets
  fastify.get('/collection/sets', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const sets = await collectionService.getUserSetsProgress(userId);
      return { data: sets };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Get set details
  fastify.get('/collection/sets/:id', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const { id } = request.params as { id: string };

      const setData = await collectionService.getSetWithProgress(id, userId);

      if (!setData) {
        return reply.status(404).send({ error: { message: 'Set not found' } });
      }

      return { data: setData };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Claim set reward
  fastify.post('/collection/sets/:id/claim', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const { id } = request.params as { id: string };
      const { threshold } = request.body as { threshold: number };

      const result = await collectionService.claimSetReward(userId, id, threshold);
      return { data: result };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Get showcase
  fastify.get('/collection/showcase/:userId', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };
      const showcase = await collectionService.getUserShowcase(userId);
      return { data: showcase };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Update showcase
  fastify.put('/collection/showcase', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const { featuredItems, layout, showcaseEffect } = request.body as {
        featuredItems: string[];
        layout?: string;
        showcaseEffect?: string;
      };

      await collectionService.updateShowcase(userId, featuredItems, layout, showcaseEffect);
      return { data: { success: true } };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Toggle favorite
  fastify.post('/collection/items/:id/favorite', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const { id } = request.params as { id: string };

      const result = await collectionService.toggleFavorite(userId, id);
      return { data: result };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Get favorites
  fastify.get('/collection/favorites', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const favorites = await collectionService.getUserFavorites(userId);
      return { data: favorites };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Mark item as seen
  fastify.post('/collection/items/:id/seen', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const { id } = request.params as { id: string };

      await collectionService.markItemAsSeen(userId, id);
      return { data: { success: true } };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Mark all as seen
  fastify.post('/collection/seen-all', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      await collectionService.markAllAsSeen(userId);
      return { data: { success: true } };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Get new items count
  fastify.get('/collection/new-count', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const count = await collectionService.getNewItemsCount(userId);
      return { data: { count } };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // =====================================================
  // HEALTH MULTIPLIER
  // =====================================================

  // Get current multiplier
  fastify.get('/health-multiplier', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const multiplier = await healthMultiplierService.getUserMultiplier(userId);
      return { data: multiplier };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Log daily health metrics
  fastify.post('/health-multiplier/metrics', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const input = logHealthMetricsSchema.parse(request.body);

      const metrics = await healthMultiplierService.logDailyMetrics(userId, input);
      return { data: metrics };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Get today's metrics
  fastify.get('/health-multiplier/today', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const metrics = await healthMultiplierService.getTodayMetrics(userId);
      return { data: metrics };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Get metrics history
  fastify.get('/health-multiplier/history', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const { days } = request.query as { days?: string };

      const history = await healthMultiplierService.getMetricsHistory(
        userId,
        days ? parseInt(days) : 30
      );
      return { data: history };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Get health stats summary
  fastify.get('/health-multiplier/stats', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const stats = await healthMultiplierService.getHealthStatsSummary(userId);
      return { data: stats };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Calculate earnings with multiplier
  fastify.post('/health-multiplier/calculate', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const { amount } = request.body as { amount: number };

      const result = await healthMultiplierService.applyMultiplier(userId, amount);
      return { data: result };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });

  // Get streak leaderboard
  fastify.get('/health-multiplier/leaderboard', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { limit } = request.query as { limit?: string };
      const leaderboard = await healthMultiplierService.getStreakLeaderboard(
        limit ? parseInt(limit) : 50
      );
      return { data: leaderboard };
    } catch (error) {
      return reply.status(400).send({ error: { message: (error as Error).message } });
    }
  });
}
