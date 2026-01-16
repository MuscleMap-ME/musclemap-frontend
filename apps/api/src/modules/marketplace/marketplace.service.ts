import { db, queryOne, queryAll, query, serializableTransaction } from '../../db/client';
import { v4 as uuidv4 } from 'uuid';

// =====================================================
// TYPES
// =====================================================

export interface CreateListingInput {
  sellerId: string;
  cosmeticId: string;
  userCosmeticId: string;
  listingType: 'buy_now' | 'auction' | 'offer_only' | 'reserved';
  price?: number;
  minOffer?: number;
  reservePrice?: number;
  buyNowPrice?: number;
  bidIncrement?: number;
  durationHours: number;
  allowOffers?: boolean;
  reservedForUserId?: string;
  sellerNote?: string;
}

export interface ListingFilters {
  category?: string;
  rarity?: string;
  minPrice?: number;
  maxPrice?: number;
  listingType?: 'buy_now' | 'auction' | 'offer_only';
  sellerId?: string;
  search?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'ending_soon' | 'popular';
  cursor?: string;
  limit?: number;
}

export interface MakeOfferInput {
  listingId: string;
  offererId: string;
  amount: number;
  message?: string;
}

// =====================================================
// MARKETPLACE SERVICE
// =====================================================

const PLATFORM_FEE_PERCENT = 5;
const DEFAULT_LISTING_DURATION_HOURS = 168; // 7 days
const MAX_ACTIVE_LISTINGS_DEFAULT = 10;

export const marketplaceService = {
  // =====================================================
  // LISTINGS
  // =====================================================

  async createListing(input: CreateListingInput) {
    const {
      sellerId,
      cosmeticId,
      userCosmeticId,
      listingType,
      price,
      minOffer,
      reservePrice,
      buyNowPrice,
      bidIncrement = 10,
      durationHours = DEFAULT_LISTING_DURATION_HOURS,
      allowOffers = false,
      reservedForUserId,
      sellerNote,
    } = input;

    // Verify user owns the cosmetic
    const userCosmetic = await db('user_spirit_cosmetics')
      .where({ id: userCosmeticId, user_id: sellerId })
      .first();

    if (!userCosmetic) {
      throw new Error('You do not own this cosmetic');
    }

    // Check if item is tradeable
    const cosmetic = await db('spirit_animal_cosmetics')
      .where({ id: cosmeticId })
      .first();

    if (!cosmetic?.is_tradeable) {
      throw new Error('This item cannot be traded');
    }

    // Check if item is already listed
    const existingListing = await db('marketplace_listings')
      .where({ user_cosmetic_id: userCosmeticId, status: 'active' })
      .first();

    if (existingListing) {
      throw new Error('This item is already listed');
    }

    // Check user's active listing count
    const activeCount = await db('marketplace_listings')
      .where({ seller_id: sellerId, status: 'active' })
      .count('id as count')
      .first();

    const stats = await this.getUserStats(sellerId);
    const maxListings = this.getMaxListingsForLevel(stats?.total_sales || 0);

    if (Number(activeCount?.count || 0) >= maxListings) {
      throw new Error(`You can only have ${maxListings} active listings`);
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + durationHours);

    const auctionEndTime = listingType === 'auction' ? expiresAt : null;

    const [listing] = await db('marketplace_listings')
      .insert({
        seller_id: sellerId,
        cosmetic_id: cosmeticId,
        user_cosmetic_id: userCosmeticId,
        listing_type: listingType,
        price,
        min_offer: minOffer,
        reserve_price: reservePrice,
        buy_now_price: buyNowPrice,
        bid_increment: bidIncrement,
        auction_end_time: auctionEndTime,
        allow_offers: allowOffers,
        reserved_for_user_id: reservedForUserId,
        seller_note: sellerNote,
        expires_at: expiresAt,
      })
      .returning('*');

    // Update user stats
    await this.updateUserStats(sellerId, { activeListings: 1 });

    return this.enrichListing(listing);
  },

  async getListing(listingId: string) {
    const listing = await db('marketplace_listings')
      .where({ id: listingId })
      .first();

    if (!listing) {
      return null;
    }

    // Increment view count
    await db('marketplace_listings')
      .where({ id: listingId })
      .increment('view_count', 1);

    return this.enrichListing(listing);
  },

  async browseListings(filters: ListingFilters) {
    const {
      category,
      rarity,
      minPrice,
      maxPrice,
      listingType,
      sellerId,
      search,
      sortBy = 'newest',
      cursor,
      limit = 20,
    } = filters;

    let query = db('marketplace_listings as ml')
      .join('spirit_animal_cosmetics as sac', 'ml.cosmetic_id', 'sac.id')
      .join('users as u', 'ml.seller_id', 'u.id')
      .where('ml.status', 'active')
      .select(
        'ml.*',
        'sac.name as cosmetic_name',
        'sac.description as cosmetic_description',
        'sac.category',
        'sac.rarity',
        'sac.preview_url',
        'sac.asset_url',
        'u.username as seller_username',
        'u.avatar_url as seller_avatar'
      );

    // Apply filters
    if (category) {
      query = query.where('sac.category', category);
    }
    if (rarity) {
      query = query.where('sac.rarity', rarity);
    }
    if (minPrice !== undefined) {
      query = query.where('ml.price', '>=', minPrice);
    }
    if (maxPrice !== undefined) {
      query = query.where('ml.price', '<=', maxPrice);
    }
    if (listingType) {
      query = query.where('ml.listing_type', listingType);
    }
    if (sellerId) {
      query = query.where('ml.seller_id', sellerId);
    }
    if (search) {
      query = query.where(function () {
        this.whereILike('sac.name', `%${search}%`)
          .orWhereILike('sac.description', `%${search}%`)
          .orWhereILike('ml.seller_note', `%${search}%`);
      });
    }

    // Apply sorting
    switch (sortBy) {
      case 'price_asc':
        query = query.orderBy('ml.price', 'asc');
        break;
      case 'price_desc':
        query = query.orderBy('ml.price', 'desc');
        break;
      case 'ending_soon':
        query = query.orderBy('ml.expires_at', 'asc');
        break;
      case 'popular':
        query = query.orderBy('ml.view_count', 'desc');
        break;
      case 'newest':
      default:
        query = query.orderBy('ml.created_at', 'desc');
    }

    // Keyset pagination
    if (cursor) {
      const [createdAt, id] = cursor.split('_');
      query = query.where(function () {
        this.where('ml.created_at', '<', new Date(createdAt))
          .orWhere(function () {
            this.where('ml.created_at', '=', new Date(createdAt))
              .andWhere('ml.id', '<', id);
          });
      });
    }

    query = query.orderBy('ml.id', 'desc').limit(limit + 1);

    const listings = await query;

    const hasMore = listings.length > limit;
    const results = hasMore ? listings.slice(0, -1) : listings;

    let nextCursor: string | undefined;
    if (hasMore && results.length > 0) {
      const last = results[results.length - 1];
      nextCursor = `${last.created_at.toISOString()}_${last.id}`;
    }

    // Get total count
    const totalQuery = db('marketplace_listings')
      .where('status', 'active')
      .count('id as count')
      .first();

    const total = await totalQuery;

    return {
      listings: results,
      nextCursor,
      total: Number(total?.count || 0),
    };
  },

  async updateListing(
    listingId: string,
    sellerId: string,
    updates: { price?: number; sellerNote?: string; allowOffers?: boolean }
  ) {
    const listing = await db('marketplace_listings')
      .where({ id: listingId, seller_id: sellerId, status: 'active' })
      .first();

    if (!listing) {
      throw new Error('Listing not found or you are not the seller');
    }

    // Cannot update auction with bids
    if (listing.listing_type === 'auction' && listing.bid_count > 0) {
      throw new Error('Cannot modify auction with existing bids');
    }

    const [updated] = await db('marketplace_listings')
      .where({ id: listingId })
      .update({
        ...updates,
        updated_at: new Date(),
      })
      .returning('*');

    return this.enrichListing(updated);
  },

  async cancelListing(listingId: string, sellerId: string) {
    const listing = await db('marketplace_listings')
      .where({ id: listingId, seller_id: sellerId, status: 'active' })
      .first();

    if (!listing) {
      throw new Error('Listing not found or you are not the seller');
    }

    // Cannot cancel auction with bids
    if (listing.listing_type === 'auction' && listing.bid_count > 0) {
      throw new Error('Cannot cancel auction with existing bids');
    }

    await db('marketplace_listings')
      .where({ id: listingId })
      .update({ status: 'cancelled', updated_at: new Date() });

    // Update user stats
    await this.updateUserStats(sellerId, { activeListings: -1 });

    return { success: true };
  },

  // =====================================================
  // PURCHASES
  // =====================================================

  async buyNow(listingId: string, buyerId: string) {
    return db.transaction(async (trx) => {
      const listing = await trx('marketplace_listings')
        .where({ id: listingId, status: 'active' })
        .forUpdate()
        .first();

      if (!listing) {
        throw new Error('Listing not found or no longer available');
      }

      if (listing.seller_id === buyerId) {
        throw new Error('Cannot buy your own listing');
      }

      // Check if reserved for someone else
      if (listing.reserved_for_user_id && listing.reserved_for_user_id !== buyerId) {
        throw new Error('This listing is reserved for another user');
      }

      // Get price (could be buy_now_price for auctions)
      const price = listing.listing_type === 'auction'
        ? listing.buy_now_price
        : listing.price;

      if (!price) {
        throw new Error('This listing does not support buy now');
      }

      // Check buyer's balance
      const buyerBalance = await trx('credit_balances')
        .where({ user_id: buyerId })
        .first();

      if (!buyerBalance || buyerBalance.balance < price) {
        throw new Error('Insufficient credits');
      }

      // Calculate fees
      const platformFee = Math.floor(price * PLATFORM_FEE_PERCENT / 100);
      const sellerReceives = price - platformFee;

      // Deduct from buyer
      await trx('credit_balances')
        .where({ user_id: buyerId })
        .decrement('balance', price);

      // Credit seller
      await trx('credit_balances')
        .where({ user_id: listing.seller_id })
        .increment('balance', sellerReceives);

      // Transfer cosmetic ownership
      await trx('user_spirit_cosmetics')
        .where({ id: listing.user_cosmetic_id })
        .update({
          user_id: buyerId,
          acquired_at: new Date(),
          acquisition_method: 'purchase',
          credits_spent: price,
        });

      // Update listing status
      await trx('marketplace_listings')
        .where({ id: listingId })
        .update({
          status: 'sold',
          sold_at: new Date(),
          sold_to_id: buyerId,
          sold_price: price,
        });

      // Record transaction
      const [transaction] = await trx('marketplace_transactions')
        .insert({
          listing_id: listingId,
          seller_id: listing.seller_id,
          buyer_id: buyerId,
          cosmetic_id: listing.cosmetic_id,
          sale_price: price,
          platform_fee: platformFee,
          seller_received: sellerReceives,
          transaction_type: 'buy_now',
        })
        .returning('*');

      // Update user stats
      await this.updateUserStatsInTransaction(trx, listing.seller_id, {
        totalSales: 1,
        totalRevenue: sellerReceives,
        activeListings: -1,
      });
      await this.updateUserStatsInTransaction(trx, buyerId, {
        totalPurchases: 1,
        totalSpent: price,
      });

      // Record price history
      await this.recordPriceHistory(trx, listing.cosmetic_id, price);

      return {
        transaction,
        cosmetic: await trx('user_spirit_cosmetics')
          .where({ id: listing.user_cosmetic_id })
          .first(),
      };
    });
  },

  // =====================================================
  // OFFERS
  // =====================================================

  async makeOffer(input: MakeOfferInput) {
    const { listingId, offererId, amount, message } = input;

    const listing = await db('marketplace_listings')
      .where({ id: listingId, status: 'active' })
      .first();

    if (!listing) {
      throw new Error('Listing not found');
    }

    if (!listing.allow_offers && listing.listing_type !== 'offer_only') {
      throw new Error('This listing does not accept offers');
    }

    if (listing.seller_id === offererId) {
      throw new Error('Cannot make offer on your own listing');
    }

    if (listing.min_offer && amount < listing.min_offer) {
      throw new Error(`Minimum offer is ${listing.min_offer} credits`);
    }

    // Check if user already has pending offer
    const existingOffer = await db('marketplace_offers')
      .where({
        listing_id: listingId,
        offerer_id: offererId,
        status: 'pending',
      })
      .first();

    if (existingOffer) {
      throw new Error('You already have a pending offer on this listing');
    }

    // Check buyer's balance
    const buyerBalance = await db('credit_balances')
      .where({ user_id: offererId })
      .first();

    if (!buyerBalance || buyerBalance.balance < amount) {
      throw new Error('Insufficient credits');
    }

    const [offer] = await db('marketplace_offers')
      .insert({
        listing_id: listingId,
        offerer_id: offererId,
        offer_amount: amount,
        message,
      })
      .returning('*');

    // Update listing offer count
    await db('marketplace_listings')
      .where({ id: listingId })
      .increment('offer_count', 1);

    return offer;
  },

  async respondToOffer(
    offerId: string,
    sellerId: string,
    action: 'accept' | 'decline' | 'counter',
    counterAmount?: number,
    counterMessage?: string
  ) {
    const offer = await db('marketplace_offers')
      .join('marketplace_listings', 'marketplace_offers.listing_id', 'marketplace_listings.id')
      .where('marketplace_offers.id', offerId)
      .where('marketplace_listings.seller_id', sellerId)
      .where('marketplace_offers.status', 'pending')
      .select('marketplace_offers.*', 'marketplace_listings.cosmetic_id', 'marketplace_listings.user_cosmetic_id')
      .first();

    if (!offer) {
      throw new Error('Offer not found or you are not the seller');
    }

    if (action === 'accept') {
      // Process the sale
      return db.transaction(async (trx) => {
        const price = offer.offer_amount;
        const platformFee = Math.floor(price * PLATFORM_FEE_PERCENT / 100);
        const sellerReceives = price - platformFee;

        // Check buyer still has funds
        const buyerBalance = await trx('credit_balances')
          .where({ user_id: offer.offerer_id })
          .first();

        if (!buyerBalance || buyerBalance.balance < price) {
          throw new Error('Buyer no longer has sufficient credits');
        }

        // Process payment
        await trx('credit_balances')
          .where({ user_id: offer.offerer_id })
          .decrement('balance', price);

        await trx('credit_balances')
          .where({ user_id: sellerId })
          .increment('balance', sellerReceives);

        // Transfer ownership
        await trx('user_spirit_cosmetics')
          .where({ id: offer.user_cosmetic_id })
          .update({
            user_id: offer.offerer_id,
            acquired_at: new Date(),
            acquisition_method: 'purchase',
            credits_spent: price,
          });

        // Update offer status
        await trx('marketplace_offers')
          .where({ id: offerId })
          .update({ status: 'accepted', responded_at: new Date() });

        // Update listing status
        await trx('marketplace_listings')
          .where({ id: offer.listing_id })
          .update({
            status: 'sold',
            sold_at: new Date(),
            sold_to_id: offer.offerer_id,
            sold_price: price,
          });

        // Decline all other offers
        await trx('marketplace_offers')
          .where({ listing_id: offer.listing_id })
          .whereNot({ id: offerId })
          .update({ status: 'declined', responded_at: new Date() });

        // Record transaction
        const [transaction] = await trx('marketplace_transactions')
          .insert({
            listing_id: offer.listing_id,
            seller_id: sellerId,
            buyer_id: offer.offerer_id,
            cosmetic_id: offer.cosmetic_id,
            sale_price: price,
            platform_fee: platformFee,
            seller_received: sellerReceives,
            transaction_type: 'offer_accepted',
          })
          .returning('*');

        return { offer: { ...offer, status: 'accepted' }, transaction };
      });
    } else if (action === 'decline') {
      await db('marketplace_offers')
        .where({ id: offerId })
        .update({ status: 'declined', responded_at: new Date() });

      return { offer: { ...offer, status: 'declined' } };
    } else if (action === 'counter') {
      if (!counterAmount) {
        throw new Error('Counter amount is required');
      }

      await db('marketplace_offers')
        .where({ id: offerId })
        .update({
          status: 'countered',
          counter_amount: counterAmount,
          counter_message: counterMessage,
          responded_at: new Date(),
        });

      return {
        offer: {
          ...offer,
          status: 'countered',
          counter_amount: counterAmount,
          counter_message: counterMessage,
        },
      };
    }

    throw new Error('Invalid action');
  },

  async getListingOffers(listingId: string, sellerId: string) {
    const listing = await db('marketplace_listings')
      .where({ id: listingId, seller_id: sellerId })
      .first();

    if (!listing) {
      throw new Error('Listing not found or you are not the seller');
    }

    const offers = await db('marketplace_offers')
      .join('users', 'marketplace_offers.offerer_id', 'users.id')
      .where('marketplace_offers.listing_id', listingId)
      .select(
        'marketplace_offers.*',
        'users.username as offerer_username',
        'users.avatar_url as offerer_avatar'
      )
      .orderBy('marketplace_offers.created_at', 'desc');

    return offers;
  },

  async getUserOffers(userId: string) {
    const offers = await db('marketplace_offers')
      .join('marketplace_listings', 'marketplace_offers.listing_id', 'marketplace_listings.id')
      .join('spirit_animal_cosmetics', 'marketplace_listings.cosmetic_id', 'spirit_animal_cosmetics.id')
      .join('users', 'marketplace_listings.seller_id', 'users.id')
      .where('marketplace_offers.offerer_id', userId)
      .select(
        'marketplace_offers.*',
        'spirit_animal_cosmetics.name as cosmetic_name',
        'spirit_animal_cosmetics.preview_url',
        'users.username as seller_username'
      )
      .orderBy('marketplace_offers.created_at', 'desc');

    return offers;
  },

  async withdrawOffer(offerId: string, offererId: string) {
    const offer = await db('marketplace_offers')
      .where({ id: offerId, offerer_id: offererId, status: 'pending' })
      .first();

    if (!offer) {
      throw new Error('Offer not found or cannot be withdrawn');
    }

    await db('marketplace_offers')
      .where({ id: offerId })
      .update({ status: 'withdrawn' });

    return { success: true };
  },

  // =====================================================
  // WATCHLIST
  // =====================================================

  async addToWatchlist(userId: string, listingId: string, priceAlert?: number) {
    const listing = await db('marketplace_listings')
      .where({ id: listingId, status: 'active' })
      .first();

    if (!listing) {
      throw new Error('Listing not found');
    }

    await db('marketplace_watchlist')
      .insert({
        user_id: userId,
        listing_id: listingId,
        price_alert: priceAlert,
      })
      .onConflict(['user_id', 'listing_id'])
      .merge({ price_alert: priceAlert });

    // Update listing watchlist count
    await db('marketplace_listings')
      .where({ id: listingId })
      .increment('watchlist_count', 1);

    // Update user stats
    await this.updateUserStats(userId, { watchlistCount: 1 });

    return { success: true };
  },

  async removeFromWatchlist(userId: string, listingId: string) {
    const deleted = await db('marketplace_watchlist')
      .where({ user_id: userId, listing_id: listingId })
      .delete();

    if (deleted) {
      await db('marketplace_listings')
        .where({ id: listingId })
        .decrement('watchlist_count', 1);

      await this.updateUserStats(userId, { watchlistCount: -1 });
    }

    return { success: true };
  },

  async getUserWatchlist(userId: string) {
    const items = await db('marketplace_watchlist')
      .join('marketplace_listings', 'marketplace_watchlist.listing_id', 'marketplace_listings.id')
      .join('spirit_animal_cosmetics', 'marketplace_listings.cosmetic_id', 'spirit_animal_cosmetics.id')
      .join('users', 'marketplace_listings.seller_id', 'users.id')
      .where('marketplace_watchlist.user_id', userId)
      .select(
        'marketplace_watchlist.*',
        'marketplace_listings.price',
        'marketplace_listings.status',
        'marketplace_listings.listing_type',
        'marketplace_listings.expires_at',
        'spirit_animal_cosmetics.name as cosmetic_name',
        'spirit_animal_cosmetics.rarity',
        'spirit_animal_cosmetics.preview_url',
        'users.username as seller_username'
      )
      .orderBy('marketplace_watchlist.created_at', 'desc');

    return items;
  },

  // =====================================================
  // USER STATS
  // =====================================================

  async getUserStats(userId: string) {
    let stats = await db('user_marketplace_stats')
      .where({ user_id: userId })
      .first();

    if (!stats) {
      // Create default stats
      [stats] = await db('user_marketplace_stats')
        .insert({ user_id: userId })
        .returning('*');
    }

    return stats;
  },

  async updateUserStats(
    userId: string,
    updates: {
      totalSales?: number;
      totalRevenue?: number;
      totalPurchases?: number;
      totalSpent?: number;
      activeListings?: number;
      watchlistCount?: number;
    }
  ) {
    const incrementUpdates: Record<string, number> = {};

    if (updates.totalSales) incrementUpdates.total_sales = updates.totalSales;
    if (updates.totalRevenue) incrementUpdates.total_revenue = updates.totalRevenue;
    if (updates.totalPurchases) incrementUpdates.total_purchases = updates.totalPurchases;
    if (updates.totalSpent) incrementUpdates.total_spent = updates.totalSpent;
    if (updates.activeListings) incrementUpdates.active_listings = updates.activeListings;
    if (updates.watchlistCount) incrementUpdates.watchlist_count = updates.watchlistCount;

    // Ensure stats row exists
    await db('user_marketplace_stats')
      .insert({ user_id: userId })
      .onConflict('user_id')
      .ignore();

    // Apply increments
    let query = db('user_marketplace_stats').where({ user_id: userId });

    for (const [field, value] of Object.entries(incrementUpdates)) {
      if (value > 0) {
        query = query.increment(field, value);
      } else if (value < 0) {
        query = query.decrement(field, Math.abs(value));
      }
    }

    await query.update({ updated_at: new Date() });
  },

  async updateUserStatsInTransaction(
    trx: typeof db,
    userId: string,
    updates: {
      totalSales?: number;
      totalRevenue?: number;
      totalPurchases?: number;
      totalSpent?: number;
      activeListings?: number;
    }
  ) {
    // Ensure stats row exists
    await trx('user_marketplace_stats')
      .insert({ user_id: userId })
      .onConflict('user_id')
      .ignore();

    const incrementUpdates: Record<string, number> = {};

    if (updates.totalSales) incrementUpdates.total_sales = updates.totalSales;
    if (updates.totalRevenue) incrementUpdates.total_revenue = updates.totalRevenue;
    if (updates.totalPurchases) incrementUpdates.total_purchases = updates.totalPurchases;
    if (updates.totalSpent) incrementUpdates.total_spent = updates.totalSpent;
    if (updates.activeListings) incrementUpdates.active_listings = updates.activeListings;

    let query = trx('user_marketplace_stats').where({ user_id: userId });

    for (const [field, value] of Object.entries(incrementUpdates)) {
      if (value > 0) {
        query = query.increment(field, value);
      } else if (value < 0) {
        query = query.decrement(field, Math.abs(value));
      }
    }

    await query.update({ updated_at: new Date() });
  },

  // =====================================================
  // PRICE HISTORY
  // =====================================================

  async recordPriceHistory(trx: typeof db, cosmeticId: string, price: number) {
    const today = new Date().toISOString().split('T')[0];

    const existing = await trx('price_history')
      .where({ cosmetic_id: cosmeticId, date: today })
      .first();

    if (existing) {
      await trx('price_history')
        .where({ cosmetic_id: cosmeticId, date: today })
        .update({
          min_price: trx.raw('LEAST(min_price, ?)', [price]),
          max_price: trx.raw('GREATEST(max_price, ?)', [price]),
          avg_price: trx.raw('((avg_price * volume) + ?) / (volume + 1)', [price]),
          volume: trx.raw('volume + 1'),
          total_value: trx.raw('total_value + ?', [price]),
        });
    } else {
      await trx('price_history').insert({
        cosmetic_id: cosmeticId,
        date: today,
        avg_price: price,
        min_price: price,
        max_price: price,
        volume: 1,
        total_value: price,
        active_listings: 1,
      });
    }
  },

  async getPriceHistory(
    cosmeticId: string,
    period: '7d' | '30d' | '90d' | 'all' = '30d'
  ) {
    let query = db('price_history')
      .where({ cosmetic_id: cosmeticId })
      .orderBy('date', 'desc');

    if (period !== 'all') {
      const days = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      query = query.where('date', '>=', startDate.toISOString().split('T')[0]);
    }

    const history = await query;

    // Calculate stats
    const stats = {
      avgPrice: 0,
      minPrice: Infinity,
      maxPrice: 0,
      totalVolume: 0,
      priceChange: 0,
    };

    if (history.length > 0) {
      stats.avgPrice = Math.round(
        history.reduce((sum, h) => sum + h.avg_price, 0) / history.length
      );
      stats.minPrice = Math.min(...history.map((h) => h.min_price));
      stats.maxPrice = Math.max(...history.map((h) => h.max_price));
      stats.totalVolume = history.reduce((sum, h) => sum + h.volume, 0);

      if (history.length >= 2) {
        const latest = history[0].avg_price;
        const earliest = history[history.length - 1].avg_price;
        stats.priceChange = Math.round(((latest - earliest) / earliest) * 100);
      }
    }

    return { history: history.reverse(), stats };
  },

  // =====================================================
  // MARKET OVERVIEW
  // =====================================================

  async getMarketOverview() {
    const [hotItems, recentSales, volume24h] = await Promise.all([
      // Hot items (most viewed in last 24h)
      db('marketplace_listings as ml')
        .join('spirit_animal_cosmetics as sac', 'ml.cosmetic_id', 'sac.id')
        .where('ml.status', 'active')
        .where('ml.created_at', '>', new Date(Date.now() - 24 * 60 * 60 * 1000))
        .orderBy('ml.view_count', 'desc')
        .limit(10)
        .select('ml.*', 'sac.name', 'sac.rarity', 'sac.preview_url'),

      // Recent sales
      db('marketplace_transactions as mt')
        .join('spirit_animal_cosmetics as sac', 'mt.cosmetic_id', 'sac.id')
        .orderBy('mt.created_at', 'desc')
        .limit(10)
        .select('mt.*', 'sac.name', 'sac.rarity', 'sac.preview_url'),

      // 24h volume
      db('marketplace_transactions')
        .where('created_at', '>', new Date(Date.now() - 24 * 60 * 60 * 1000))
        .sum('sale_price as total')
        .first(),
    ]);

    return {
      hotItems,
      recentSales,
      volume24h: Number(volume24h?.total || 0),
    };
  },

  // =====================================================
  // HELPERS
  // =====================================================

  async enrichListing(listing: Record<string, unknown>) {
    const [cosmetic, seller] = await Promise.all([
      db('spirit_animal_cosmetics').where({ id: listing.cosmetic_id }).first(),
      db('users')
        .where({ id: listing.seller_id })
        .select('id', 'username', 'avatar_url')
        .first(),
    ]);

    return {
      ...listing,
      cosmetic,
      seller,
    };
  },

  getMaxListingsForLevel(totalSales: number): number {
    if (totalSales >= 501) return 999; // Unlimited
    if (totalSales >= 201) return 100;
    if (totalSales >= 51) return 50;
    if (totalSales >= 11) return 25;
    return MAX_ACTIVE_LISTINGS_DEFAULT;
  },

  getSellerLevel(totalSales: number): { level: number; name: string; feePercent: number } {
    if (totalSales >= 501) return { level: 5, name: 'Tycoon', feePercent: 3 };
    if (totalSales >= 201) return { level: 4, name: 'Dealer', feePercent: 4 };
    if (totalSales >= 51) return { level: 3, name: 'Merchant', feePercent: 5 };
    if (totalSales >= 11) return { level: 2, name: 'Seller', feePercent: 6 };
    return { level: 1, name: 'Newcomer', feePercent: 7 };
  },

  // Get price suggestion based on recent sales
  async getPriceSuggestion(cosmeticId: string) {
    const recentSales = await db('marketplace_transactions')
      .where({ cosmetic_id: cosmeticId })
      .where('created_at', '>', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .orderBy('created_at', 'desc')
      .limit(10);

    const activeListings = await db('marketplace_listings')
      .where({ cosmetic_id: cosmeticId, status: 'active' })
      .count('id as count')
      .first();

    let suggestedPrice = 0;

    if (recentSales.length > 0) {
      suggestedPrice = Math.round(
        recentSales.reduce((sum, s) => sum + s.sale_price, 0) / recentSales.length
      );
    } else {
      // Fall back to base price from cosmetic
      const cosmetic = await db('spirit_animal_cosmetics')
        .where({ id: cosmeticId })
        .first();
      suggestedPrice = cosmetic?.base_price || 100;
    }

    return {
      suggestedPrice,
      recentSales,
      activeListings: Number(activeListings?.count || 0),
    };
  },
};
