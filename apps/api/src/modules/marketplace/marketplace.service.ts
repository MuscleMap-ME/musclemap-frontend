/**
 * Marketplace Service
 *
 * Handles marketplace listings, offers, watchlist, and transactions.
 * Uses raw pg queries for all database operations.
 */

import { queryOne, queryAll, query, serializableTransaction } from '../../db/client';
import { PoolClient } from 'pg';
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
  durationHours?: number;
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
// CONSTANTS
// =====================================================

const PLATFORM_FEE_PERCENT = 5;
const DEFAULT_LISTING_DURATION_HOURS = 168; // 7 days
const MAX_ACTIVE_LISTINGS_DEFAULT = 10;

// =====================================================
// SERVICE
// =====================================================

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
    const userCosmetic = await queryOne<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM user_spirit_cosmetics
       WHERE id = $1 AND user_id = $2`,
      [userCosmeticId, sellerId]
    );

    if (!userCosmetic) {
      throw new Error('You do not own this cosmetic');
    }

    // Check if item is tradeable
    const cosmetic = await queryOne<{ id: string; is_tradeable: boolean }>(
      `SELECT id, is_tradeable FROM spirit_animal_cosmetics WHERE id = $1`,
      [cosmeticId]
    );

    if (!cosmetic?.is_tradeable) {
      throw new Error('This item cannot be traded');
    }

    // Check if item is already listed
    const existingListing = await queryOne<{ id: string }>(
      `SELECT id FROM marketplace_listings
       WHERE user_cosmetic_id = $1 AND status = 'active'`,
      [userCosmeticId]
    );

    if (existingListing) {
      throw new Error('This item is already listed');
    }

    // Check seller's active listing count
    const activeListingCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM marketplace_listings
       WHERE seller_id = $1 AND status = 'active'`,
      [sellerId]
    );

    const sellerLevel = await this.getSellerLevel(sellerId);
    const maxListings = MAX_ACTIVE_LISTINGS_DEFAULT + (sellerLevel * 5);

    if (parseInt(activeListingCount?.count || '0') >= maxListings) {
      throw new Error(`You can only have ${maxListings} active listings at your seller level`);
    }

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + durationHours);

    // Create listing
    const listingId = uuidv4();
    const listing = await queryOne<{ id: string }>(
      `INSERT INTO marketplace_listings (
        id, seller_id, cosmetic_id, user_cosmetic_id, listing_type,
        price, min_offer, reserve_price, buy_now_price, bid_increment,
        allow_offers, reserved_for_user_id, seller_note, expires_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active')
      RETURNING id`,
      [
        listingId, sellerId, cosmeticId, userCosmeticId, listingType,
        price, minOffer, reservePrice, buyNowPrice, bidIncrement,
        allowOffers, reservedForUserId, sellerNote, expiresAt,
      ]
    );

    // Mark cosmetic as listed
    await query(
      `UPDATE user_spirit_cosmetics SET is_listed = true WHERE id = $1`,
      [userCosmeticId]
    );

    return this.getListing(listing!.id);
  },

  async getListing(listingId: string) {
    const listing = await queryOne<{
      id: string;
      seller_id: string;
      cosmetic_id: string;
      user_cosmetic_id: string;
      listing_type: string;
      price: number;
      min_offer: number;
      reserve_price: number;
      buy_now_price: number;
      current_bid: number;
      bid_count: number;
      allow_offers: boolean;
      seller_note: string;
      status: string;
      expires_at: string;
      created_at: string;
      cosmetic_name: string;
      cosmetic_description: string;
      cosmetic_icon: string;
      rarity: string;
      category: string;
      seller_username: string;
      view_count: number;
    }>(
      `SELECT l.*,
        c.name as cosmetic_name, c.description as cosmetic_description,
        c.icon as cosmetic_icon, c.rarity, c.category,
        u.username as seller_username
       FROM marketplace_listings l
       JOIN spirit_animal_cosmetics c ON l.cosmetic_id = c.id
       JOIN users u ON l.seller_id = u.id
       WHERE l.id = $1`,
      [listingId]
    );

    return listing;
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
      limit = 24,
    } = filters;

    const conditions: string[] = ["l.status = 'active'"];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (category) {
      conditions.push(`c.category = $${paramIndex++}`);
      params.push(category);
    }

    if (rarity) {
      conditions.push(`c.rarity = $${paramIndex++}`);
      params.push(rarity);
    }

    if (minPrice !== undefined) {
      conditions.push(`l.price >= $${paramIndex++}`);
      params.push(minPrice);
    }

    if (maxPrice !== undefined) {
      conditions.push(`l.price <= $${paramIndex++}`);
      params.push(maxPrice);
    }

    if (listingType) {
      conditions.push(`l.listing_type = $${paramIndex++}`);
      params.push(listingType);
    }

    if (sellerId) {
      conditions.push(`l.seller_id = $${paramIndex++}`);
      params.push(sellerId);
    }

    if (search) {
      conditions.push(`(c.name ILIKE $${paramIndex++} OR c.description ILIKE $${paramIndex++})`);
      params.push(`%${search}%`, `%${search}%`);
    }

    // Sort order
    let orderBy = 'l.created_at DESC';
    switch (sortBy) {
      case 'price_asc':
        orderBy = 'l.price ASC NULLS LAST';
        break;
      case 'price_desc':
        orderBy = 'l.price DESC NULLS LAST';
        break;
      case 'ending_soon':
        orderBy = 'l.expires_at ASC';
        break;
      case 'popular':
        orderBy = 'l.view_count DESC, l.created_at DESC';
        break;
    }

    // Cursor for pagination (using created_at, id)
    if (cursor) {
      try {
        const [createdAt, id] = cursor.split('_');
        conditions.push(`(l.created_at, l.id) < ($${paramIndex++}, $${paramIndex++})`);
        params.push(createdAt, id);
      } catch {
        // Invalid cursor, ignore
      }
    }

    params.push(limit + 1); // Fetch one extra to check for more

    const listings = await queryAll<{
      id: string;
      seller_id: string;
      listing_type: string;
      price: number;
      current_bid: number;
      bid_count: number;
      expires_at: string;
      created_at: string;
      cosmetic_name: string;
      cosmetic_icon: string;
      rarity: string;
      category: string;
      seller_username: string;
    }>(
      `SELECT l.id, l.seller_id, l.listing_type, l.price, l.current_bid,
        l.bid_count, l.expires_at, l.created_at,
        c.name as cosmetic_name, c.icon as cosmetic_icon, c.rarity, c.category,
        u.username as seller_username
       FROM marketplace_listings l
       JOIN spirit_animal_cosmetics c ON l.cosmetic_id = c.id
       JOIN users u ON l.seller_id = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY ${orderBy}
       LIMIT $${paramIndex}`,
      params
    );

    const hasMore = listings.length > limit;
    const resultListings = hasMore ? listings.slice(0, -1) : listings;
    const nextCursor = hasMore && resultListings.length > 0
      ? `${resultListings[resultListings.length - 1].created_at}_${resultListings[resultListings.length - 1].id}`
      : null;

    return {
      listings: resultListings,
      nextCursor,
      hasMore,
    };
  },

  async updateListing(
    listingId: string,
    sellerId: string,
    updates: { price?: number; sellerNote?: string; allowOffers?: boolean }
  ) {
    // Verify ownership
    const listing = await queryOne<{ id: string; seller_id: string; status: string }>(
      `SELECT id, seller_id, status FROM marketplace_listings WHERE id = $1`,
      [listingId]
    );

    if (!listing || listing.seller_id !== sellerId) {
      throw new Error('Listing not found or not authorized');
    }

    if (listing.status !== 'active') {
      throw new Error('Cannot update inactive listing');
    }

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (updates.price !== undefined) {
      setClauses.push(`price = $${paramIndex++}`);
      params.push(updates.price);
    }

    if (updates.sellerNote !== undefined) {
      setClauses.push(`seller_note = $${paramIndex++}`);
      params.push(updates.sellerNote);
    }

    if (updates.allowOffers !== undefined) {
      setClauses.push(`allow_offers = $${paramIndex++}`);
      params.push(updates.allowOffers);
    }

    if (setClauses.length === 0) {
      return this.getListing(listingId);
    }

    setClauses.push(`updated_at = NOW()`);
    params.push(listingId);

    await query(
      `UPDATE marketplace_listings SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
      params
    );

    return this.getListing(listingId);
  },

  async cancelListing(listingId: string, sellerId: string) {
    const listing = await queryOne<{ id: string; seller_id: string; status: string; user_cosmetic_id: string }>(
      `SELECT id, seller_id, status, user_cosmetic_id FROM marketplace_listings WHERE id = $1`,
      [listingId]
    );

    if (!listing || listing.seller_id !== sellerId) {
      throw new Error('Listing not found or not authorized');
    }

    if (listing.status !== 'active') {
      throw new Error('Listing is already inactive');
    }

    // Cancel listing and unlock cosmetic
    await query(
      `UPDATE marketplace_listings SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [listingId]
    );

    await query(
      `UPDATE user_spirit_cosmetics SET is_listed = false WHERE id = $1`,
      [listing.user_cosmetic_id]
    );

    // Decline pending offers
    await query(
      `UPDATE marketplace_offers SET status = 'declined', updated_at = NOW()
       WHERE listing_id = $1 AND status = 'pending'`,
      [listingId]
    );
  },

  async buyNow(listingId: string, buyerId: string) {
    return await serializableTransaction(async (client: PoolClient) => {
      // Get listing with lock
      const result = await client.query(
        `SELECT l.*, u.credit_balance as seller_balance
         FROM marketplace_listings l
         JOIN users u ON l.seller_id = u.id
         WHERE l.id = $1
         FOR UPDATE`,
        [listingId]
      );
      const listing = result.rows[0];

      if (!listing) {
        throw new Error('Listing not found');
      }

      if (listing.status !== 'active') {
        throw new Error('Listing is no longer active');
      }

      if (listing.seller_id === buyerId) {
        throw new Error('You cannot buy your own listing');
      }

      const price = listing.listing_type === 'auction'
        ? listing.buy_now_price
        : listing.price;

      if (!price) {
        throw new Error('This listing does not support buy now');
      }

      // Check buyer balance
      const buyerResult = await client.query(
        `SELECT credit_balance FROM users WHERE id = $1 FOR UPDATE`,
        [buyerId]
      );
      const buyer = buyerResult.rows[0];

      if (!buyer || buyer.credit_balance < price) {
        throw new Error('Insufficient credits');
      }

      // Calculate fees
      const platformFee = Math.floor(price * PLATFORM_FEE_PERCENT / 100);
      const sellerProceeds = price - platformFee;

      // Transfer credits
      await client.query(
        `UPDATE users SET credit_balance = credit_balance - $1 WHERE id = $2`,
        [price, buyerId]
      );

      await client.query(
        `UPDATE users SET credit_balance = credit_balance + $1 WHERE id = $2`,
        [sellerProceeds, listing.seller_id]
      );

      // Transfer cosmetic ownership
      await client.query(
        `UPDATE user_spirit_cosmetics SET user_id = $1, is_listed = false, acquired_at = NOW()
         WHERE id = $2`,
        [buyerId, listing.user_cosmetic_id]
      );

      // Update listing
      await client.query(
        `UPDATE marketplace_listings SET status = 'sold', sold_to_id = $1, sold_price = $2,
         sold_at = NOW(), updated_at = NOW() WHERE id = $3`,
        [buyerId, price, listingId]
      );

      // Record transaction
      await client.query(
        `INSERT INTO marketplace_transactions (
          id, listing_id, seller_id, buyer_id, cosmetic_id,
          sale_price, platform_fee, seller_received, transaction_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'buy_now')`,
        [
          uuidv4(), listingId, listing.seller_id, buyerId, listing.cosmetic_id,
          price, platformFee, sellerProceeds,
        ]
      );

      // Decline pending offers
      await client.query(
        `UPDATE marketplace_offers SET status = 'declined', updated_at = NOW()
         WHERE listing_id = $1 AND status = 'pending'`,
        [listingId]
      );

      return { success: true, price, platformFee, sellerProceeds };
    });
  },

  // =====================================================
  // OFFERS
  // =====================================================

  async makeOffer(input: MakeOfferInput) {
    const { listingId, offererId, amount, message } = input;

    const listing = await queryOne<{
      id: string;
      seller_id: string;
      status: string;
      allow_offers: boolean;
      min_offer: number;
      listing_type: string;
    }>(
      `SELECT id, seller_id, status, allow_offers, min_offer, listing_type
       FROM marketplace_listings WHERE id = $1`,
      [listingId]
    );

    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.status !== 'active') {
      throw new Error('Listing is no longer active');
    }

    if (listing.seller_id === offererId) {
      throw new Error('You cannot make an offer on your own listing');
    }

    if (listing.listing_type !== 'offer_only' && !listing.allow_offers) {
      throw new Error('This listing does not accept offers');
    }

    if (listing.min_offer && amount < listing.min_offer) {
      throw new Error(`Offer must be at least ${listing.min_offer} credits`);
    }

    // Check offerer balance
    const offerer = await queryOne<{ credit_balance: number }>(
      `SELECT credit_balance FROM users WHERE id = $1`,
      [offererId]
    );

    if (!offerer || offerer.credit_balance < amount) {
      throw new Error('Insufficient credits for this offer');
    }

    // Create offer
    const offerId = uuidv4();
    await query(
      `INSERT INTO marketplace_offers (id, listing_id, offerer_id, amount, message, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [offerId, listingId, offererId, amount, message]
    );

    return queryOne(`SELECT * FROM marketplace_offers WHERE id = $1`, [offerId]);
  },

  async respondToOffer(
    offerId: string,
    sellerId: string,
    action: 'accept' | 'decline' | 'counter',
    counterAmount?: number,
    counterMessage?: string
  ) {
    const offer = await queryOne<{
      id: string;
      listing_id: string;
      offerer_id: string;
      amount: number;
      status: string;
    }>(
      `SELECT o.*, l.seller_id FROM marketplace_offers o
       JOIN marketplace_listings l ON o.listing_id = l.id
       WHERE o.id = $1`,
      [offerId]
    );

    if (!offer || (offer as any).seller_id !== sellerId) {
      throw new Error('Offer not found or not authorized');
    }

    if (offer.status !== 'pending') {
      throw new Error('Offer has already been processed');
    }

    if (action === 'decline') {
      await query(
        `UPDATE marketplace_offers SET status = 'declined', updated_at = NOW() WHERE id = $1`,
        [offerId]
      );
      return { success: true, action: 'declined' };
    }

    if (action === 'counter') {
      if (!counterAmount) {
        throw new Error('Counter amount is required');
      }

      const counterOfferId = uuidv4();
      await query(
        `INSERT INTO marketplace_offers (id, listing_id, offerer_id, amount, message, status, parent_offer_id)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
        [counterOfferId, offer.listing_id, sellerId, counterAmount, counterMessage, offerId]
      );

      await query(
        `UPDATE marketplace_offers SET status = 'countered', updated_at = NOW() WHERE id = $1`,
        [offerId]
      );

      return { success: true, action: 'countered', counterOfferId };
    }

    // Accept offer - execute transaction
    return await serializableTransaction(async (client: PoolClient) => {
      // Get listing with lock
      const listingResult = await client.query(
        `SELECT * FROM marketplace_listings WHERE id = $1 FOR UPDATE`,
        [offer.listing_id]
      );
      const listing = listingResult.rows[0];

      if (!listing || listing.status !== 'active') {
        throw new Error('Listing is no longer active');
      }

      // Check offerer balance
      const offererResult = await client.query(
        `SELECT credit_balance FROM users WHERE id = $1 FOR UPDATE`,
        [offer.offerer_id]
      );
      const offerer = offererResult.rows[0];

      if (!offerer || offerer.credit_balance < offer.amount) {
        throw new Error('Offerer has insufficient credits');
      }

      // Calculate fees
      const platformFee = Math.floor(offer.amount * PLATFORM_FEE_PERCENT / 100);
      const sellerProceeds = offer.amount - platformFee;

      // Transfer credits
      await client.query(
        `UPDATE users SET credit_balance = credit_balance - $1 WHERE id = $2`,
        [offer.amount, offer.offerer_id]
      );

      await client.query(
        `UPDATE users SET credit_balance = credit_balance + $1 WHERE id = $2`,
        [sellerProceeds, sellerId]
      );

      // Transfer cosmetic ownership
      await client.query(
        `UPDATE user_spirit_cosmetics SET user_id = $1, is_listed = false, acquired_at = NOW()
         WHERE id = $2`,
        [offer.offerer_id, listing.user_cosmetic_id]
      );

      // Update listing and offer
      await client.query(
        `UPDATE marketplace_listings SET status = 'sold', buyer_id = $1, final_price = $2,
         platform_fee = $3, updated_at = NOW() WHERE id = $4`,
        [offer.offerer_id, offer.amount, platformFee, offer.listing_id]
      );

      await client.query(
        `UPDATE marketplace_offers SET status = 'accepted', updated_at = NOW() WHERE id = $1`,
        [offerId]
      );

      // Decline other pending offers
      await client.query(
        `UPDATE marketplace_offers SET status = 'declined', updated_at = NOW()
         WHERE listing_id = $1 AND id != $2 AND status = 'pending'`,
        [offer.listing_id, offerId]
      );

      // Record transaction
      await client.query(
        `INSERT INTO marketplace_transactions (
          id, listing_id, seller_id, buyer_id, cosmetic_id,
          sale_price, platform_fee, seller_proceeds, transaction_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'offer_accepted')`,
        [
          uuidv4(), offer.listing_id, sellerId, offer.offerer_id, listing.cosmetic_id,
          offer.amount, platformFee, sellerProceeds,
        ]
      );

      return { success: true, action: 'accepted', price: offer.amount };
    });
  },

  async getListingOffers(listingId: string, sellerId: string) {
    // Verify seller owns listing
    const listing = await queryOne<{ seller_id: string }>(
      `SELECT seller_id FROM marketplace_listings WHERE id = $1`,
      [listingId]
    );

    if (!listing || listing.seller_id !== sellerId) {
      throw new Error('Listing not found or not authorized');
    }

    return queryAll(
      `SELECT o.*, u.username as offerer_username
       FROM marketplace_offers o
       JOIN users u ON o.offerer_id = u.id
       WHERE o.listing_id = $1
       ORDER BY o.created_at DESC`,
      [listingId]
    );
  },

  async getUserOffers(userId: string) {
    return queryAll(
      `SELECT o.*, l.cosmetic_id, c.name as cosmetic_name, c.icon as cosmetic_icon,
        u.username as seller_username
       FROM marketplace_offers o
       JOIN marketplace_listings l ON o.listing_id = l.id
       JOIN spirit_animal_cosmetics c ON l.cosmetic_id = c.id
       JOIN users u ON l.seller_id = u.id
       WHERE o.offerer_id = $1
       ORDER BY o.created_at DESC`,
      [userId]
    );
  },

  async withdrawOffer(offerId: string, offererId: string) {
    const offer = await queryOne<{ id: string; offerer_id: string; status: string }>(
      `SELECT id, offerer_id, status FROM marketplace_offers WHERE id = $1`,
      [offerId]
    );

    if (!offer || offer.offerer_id !== offererId) {
      throw new Error('Offer not found or not authorized');
    }

    if (offer.status !== 'pending') {
      throw new Error('Offer cannot be withdrawn');
    }

    await query(
      `UPDATE marketplace_offers SET status = 'withdrawn', updated_at = NOW() WHERE id = $1`,
      [offerId]
    );
  },

  // =====================================================
  // WATCHLIST
  // =====================================================

  async getUserWatchlist(userId: string) {
    return queryAll(
      `SELECT w.*, l.price, l.listing_type, l.expires_at, l.status,
        c.name as cosmetic_name, c.icon as cosmetic_icon, c.rarity
       FROM marketplace_watchlist w
       JOIN marketplace_listings l ON w.listing_id = l.id
       JOIN spirit_animal_cosmetics c ON l.cosmetic_id = c.id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [userId]
    );
  },

  async addToWatchlist(userId: string, listingId: string, priceAlert?: number) {
    // Verify listing exists
    const listing = await queryOne<{ id: string }>(
      `SELECT id FROM marketplace_listings WHERE id = $1`,
      [listingId]
    );

    if (!listing) {
      throw new Error('Listing not found');
    }

    await query(
      `INSERT INTO marketplace_watchlist (user_id, listing_id, price_alert)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, listing_id) DO UPDATE SET price_alert = $3`,
      [userId, listingId, priceAlert]
    );

    // Increment watchlist count on listing
    await query(
      `UPDATE marketplace_listings SET watchlist_count = watchlist_count + 1 WHERE id = $1`,
      [listingId]
    );
  },

  async removeFromWatchlist(userId: string, listingId: string) {
    const result = await query(
      `DELETE FROM marketplace_watchlist WHERE user_id = $1 AND listing_id = $2`,
      [userId, listingId]
    );

    // Decrement watchlist count on listing if row was deleted
    if (result.rowCount && result.rowCount > 0) {
      await query(
        `UPDATE marketplace_listings SET watchlist_count = GREATEST(0, watchlist_count - 1) WHERE id = $1`,
        [listingId]
      );
    }
  },

  // =====================================================
  // USER STATS & LEVELS
  // =====================================================

  async getUserStats(userId: string) {
    const stats = await queryOne<{
      total_sales: string;
      total_purchases: string;
      total_revenue: string;
      avg_rating: number;
    }>(
      `SELECT
        COALESCE(COUNT(*) FILTER (WHERE seller_id = $1), 0)::text as total_sales,
        COALESCE(COUNT(*) FILTER (WHERE buyer_id = $1), 0)::text as total_purchases,
        COALESCE(SUM(sale_price) FILTER (WHERE seller_id = $1), 0)::text as total_revenue,
        AVG(seller_rating) as avg_rating
       FROM marketplace_transactions
       WHERE seller_id = $1 OR buyer_id = $1`,
      [userId]
    );

    const sellerLevel = await this.getSellerLevel(userId);

    return {
      totalSales: parseInt(stats?.total_sales || '0'),
      totalPurchases: parseInt(stats?.total_purchases || '0'),
      totalRevenue: parseInt(stats?.total_revenue || '0'),
      avgRating: stats?.avg_rating || 0,
      sellerLevel,
      feeDiscount: sellerLevel * 0.5, // 0.5% discount per level
    };
  },

  async getSellerLevel(userId: string): Promise<number> {
    const result = await queryOne<{ total_sales: string }>(
      `SELECT COUNT(*)::text as total_sales FROM marketplace_transactions WHERE seller_id = $1`,
      [userId]
    );

    const sales = parseInt(result?.total_sales || '0');

    // Level tiers based on sales
    if (sales >= 1000) return 5;
    if (sales >= 500) return 4;
    if (sales >= 100) return 3;
    if (sales >= 25) return 2;
    if (sales >= 5) return 1;
    return 0;
  },

  // =====================================================
  // PRICE HISTORY
  // =====================================================

  async getPriceHistory(cosmeticId: string, period: '7d' | '30d' | '90d' | 'all' = '30d') {
    let intervalClause = "created_at >= NOW() - INTERVAL '30 days'";
    if (period === '7d') intervalClause = "created_at >= NOW() - INTERVAL '7 days'";
    else if (period === '90d') intervalClause = "created_at >= NOW() - INTERVAL '90 days'";
    else if (period === 'all') intervalClause = '1=1';

    return queryAll(
      `SELECT sale_price, listing_type, created_at
       FROM price_history
       WHERE cosmetic_id = $1 AND ${intervalClause}
       ORDER BY created_at ASC`,
      [cosmeticId]
    );
  },

  async getPriceSuggestion(cosmeticId: string) {
    const stats = await queryOne<{
      avg_price: number;
      min_price: number;
      max_price: number;
      recent_count: string;
    }>(
      `SELECT
        AVG(sale_price)::numeric as avg_price,
        MIN(sale_price) as min_price,
        MAX(sale_price) as max_price,
        COUNT(*)::text as recent_count
       FROM price_history
       WHERE cosmetic_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
      [cosmeticId]
    );

    return {
      suggestedPrice: Math.round(stats?.avg_price || 100),
      minRecentPrice: stats?.min_price || 0,
      maxRecentPrice: stats?.max_price || 0,
      recentSales: parseInt(stats?.recent_count || '0'),
    };
  },

  async getMarketOverview() {
    const overview = await queryOne<{
      total_active: string;
      total_volume_24h: string;
      total_sales_24h: string;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM marketplace_listings WHERE status = 'active')::text as total_active,
        COALESCE((SELECT SUM(sale_price) FROM marketplace_transactions WHERE created_at >= NOW() - INTERVAL '24 hours'), 0)::text as total_volume_24h,
        (SELECT COUNT(*) FROM marketplace_transactions WHERE created_at >= NOW() - INTERVAL '24 hours')::text as total_sales_24h`
    );

    const trending = await queryAll<{ cosmetic_id: string; name: string; icon: string; sales: string }>(
      `SELECT c.id as cosmetic_id, c.name, c.icon, COUNT(*)::text as sales
       FROM marketplace_transactions t
       JOIN spirit_animal_cosmetics c ON t.cosmetic_id = c.id
       WHERE t.created_at >= NOW() - INTERVAL '24 hours'
       GROUP BY c.id, c.name, c.icon
       ORDER BY COUNT(*) DESC
       LIMIT 5`
    );

    return {
      totalActiveListings: parseInt(overview?.total_active || '0'),
      volume24h: parseInt(overview?.total_volume_24h || '0'),
      sales24h: parseInt(overview?.total_sales_24h || '0'),
      trending,
    };
  },

  // =====================================================
  // AUCTION BIDDING
  // =====================================================

  async placeBid(listingId: string, bidderId: string, amount: number) {
    return await serializableTransaction(async (client: PoolClient) => {
      // Get listing with lock
      const listingResult = await client.query(
        `SELECT * FROM marketplace_listings WHERE id = $1 FOR UPDATE`,
        [listingId]
      );
      const listing = listingResult.rows[0];

      if (!listing) {
        throw new Error('Listing not found');
      }

      if (listing.status !== 'active') {
        throw new Error('Listing is no longer active');
      }

      if (listing.listing_type !== 'auction') {
        throw new Error('This listing is not an auction');
      }

      if (listing.seller_id === bidderId) {
        throw new Error('You cannot bid on your own listing');
      }

      // Check if auction has ended
      const auctionEndTime = listing.auction_end_time || listing.expires_at;
      if (new Date(auctionEndTime) < new Date()) {
        throw new Error('This auction has ended');
      }

      // Validate bid amount
      const currentBid = listing.current_bid || 0;
      const minBid = currentBid > 0
        ? currentBid + (listing.bid_increment || 10)
        : (listing.min_offer || listing.reserve_price || 1);

      if (amount < minBid) {
        throw new Error(`Bid must be at least ${minBid} credits`);
      }

      // Check bidder balance
      const bidderResult = await client.query(
        `SELECT credit_balance FROM users WHERE id = $1 FOR UPDATE`,
        [bidderId]
      );
      const bidder = bidderResult.rows[0];

      if (!bidder || bidder.credit_balance < amount) {
        throw new Error('Insufficient credits for this bid');
      }

      // Get previous high bidder (for outbid notification)
      const previousHighBidder = listing.current_bidder_id;

      // Mark previous active bids as outbid
      await client.query(
        `UPDATE auction_bids SET status = 'outbid'
         WHERE listing_id = $1 AND status = 'active'`,
        [listingId]
      );

      // Record the bid
      const bidId = uuidv4();
      await client.query(
        `INSERT INTO auction_bids (id, listing_id, bidder_id, bid_amount, status)
         VALUES ($1, $2, $3, $4, 'active')`,
        [bidId, listingId, bidderId, amount]
      );

      // Update listing with new bid
      await client.query(
        `UPDATE marketplace_listings SET
         current_bid = $1,
         current_bidder_id = $2,
         bid_count = bid_count + 1,
         updated_at = NOW()
         WHERE id = $3`,
        [amount, bidderId, listingId]
      );

      return {
        success: true,
        bidId,
        amount,
        previousBid: currentBid,
        outbidUserId: previousHighBidder,
        isReserveMet: listing.reserve_price ? amount >= listing.reserve_price : true,
      };
    });
  },

  async getListingBids(listingId: string) {
    return queryAll<{
      id: string;
      bidder_id: string;
      bid_amount: number;
      status: string;
      created_at: string;
      bidder_username: string;
    }>(
      `SELECT b.id, b.bidder_id, b.bid_amount, b.status, b.created_at,
        u.username as bidder_username
       FROM auction_bids b
       JOIN users u ON b.bidder_id = u.id
       WHERE b.listing_id = $1
       ORDER BY b.bid_amount DESC, b.created_at ASC`,
      [listingId]
    );
  },

  async getUserBids(userId: string) {
    return queryAll<{
      id: string;
      listing_id: string;
      bid_amount: number;
      status: string;
      created_at: string;
      cosmetic_name: string;
      cosmetic_icon: string;
      rarity: string;
      listing_status: string;
      current_bid: number;
      auction_end_time: string;
    }>(
      `SELECT b.id, b.listing_id, b.bid_amount, b.status, b.created_at,
        c.name as cosmetic_name, c.icon as cosmetic_icon, c.rarity,
        l.status as listing_status, l.current_bid, l.auction_end_time
       FROM auction_bids b
       JOIN marketplace_listings l ON b.listing_id = l.id
       JOIN spirit_animal_cosmetics c ON l.cosmetic_id = c.id
       WHERE b.bidder_id = $1
       ORDER BY b.created_at DESC`,
      [userId]
    );
  },

  // Process ended auctions (should be called by a scheduled job)
  async processEndedAuctions() {
    const endedAuctions = await queryAll<{
      id: string;
      seller_id: string;
      cosmetic_id: string;
      user_cosmetic_id: string;
      current_bid: number;
      current_bidder_id: string;
      reserve_price: number;
    }>(
      `SELECT id, seller_id, cosmetic_id, user_cosmetic_id, current_bid,
        current_bidder_id, reserve_price
       FROM marketplace_listings
       WHERE listing_type = 'auction'
         AND status = 'active'
         AND (auction_end_time <= NOW() OR expires_at <= NOW())`
    );

    let processedCount = 0;

    for (const auction of endedAuctions) {
      try {
        await serializableTransaction(async (client: PoolClient) => {
          // Recheck the listing with lock
          const result = await client.query(
            `SELECT * FROM marketplace_listings WHERE id = $1 FOR UPDATE`,
            [auction.id]
          );
          const listing = result.rows[0];

          if (!listing || listing.status !== 'active') {
            return; // Already processed
          }

          // Check if reserve met
          const reserveMet = !listing.reserve_price || listing.current_bid >= listing.reserve_price;

          if (listing.current_bidder_id && reserveMet) {
            // Auction won - complete the sale
            const buyerId = listing.current_bidder_id;
            const price = listing.current_bid;

            // Check winner has sufficient balance
            const buyerResult = await client.query(
              `SELECT credit_balance FROM users WHERE id = $1 FOR UPDATE`,
              [buyerId]
            );

            if (buyerResult.rows[0]?.credit_balance < price) {
              // Winner doesn't have balance - mark as expired and return item
              await client.query(
                `UPDATE marketplace_listings SET status = 'expired', updated_at = NOW() WHERE id = $1`,
                [listing.id]
              );

              await client.query(
                `UPDATE user_spirit_cosmetics SET is_listed = false WHERE id = $1`,
                [listing.user_cosmetic_id]
              );

              // Mark the winning bid as retracted
              await client.query(
                `UPDATE auction_bids SET status = 'retracted' WHERE listing_id = $1 AND bidder_id = $2 AND status = 'active'`,
                [listing.id, buyerId]
              );
              return;
            }

            // Calculate fees
            const platformFee = Math.floor(price * PLATFORM_FEE_PERCENT / 100);
            const sellerProceeds = price - platformFee;

            // Transfer credits
            await client.query(
              `UPDATE users SET credit_balance = credit_balance - $1 WHERE id = $2`,
              [price, buyerId]
            );

            await client.query(
              `UPDATE users SET credit_balance = credit_balance + $1 WHERE id = $2`,
              [sellerProceeds, listing.seller_id]
            );

            // Transfer cosmetic ownership
            await client.query(
              `UPDATE user_spirit_cosmetics SET user_id = $1, is_listed = false, acquired_at = NOW()
               WHERE id = $2`,
              [buyerId, listing.user_cosmetic_id]
            );

            // Update listing
            await client.query(
              `UPDATE marketplace_listings SET status = 'sold', sold_to_id = $1, sold_price = $2,
               sold_at = NOW(), updated_at = NOW() WHERE id = $3`,
              [buyerId, price, listing.id]
            );

            // Mark the winning bid as won
            await client.query(
              `UPDATE auction_bids SET status = 'won' WHERE listing_id = $1 AND bidder_id = $2 AND status = 'active'`,
              [listing.id, buyerId]
            );

            // Record transaction (using 'auction' as that's the valid enum value)
            await client.query(
              `INSERT INTO marketplace_transactions (
                id, listing_id, seller_id, buyer_id, cosmetic_id,
                sale_price, platform_fee, seller_received, transaction_type
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'auction')`,
              [
                uuidv4(), listing.id, listing.seller_id, buyerId, listing.cosmetic_id,
                price, platformFee, sellerProceeds,
              ]
            );
          } else {
            // No bids or reserve not met - return item to seller
            await client.query(
              `UPDATE marketplace_listings SET status = 'expired', updated_at = NOW() WHERE id = $1`,
              [listing.id]
            );

            await client.query(
              `UPDATE user_spirit_cosmetics SET is_listed = false WHERE id = $1`,
              [listing.user_cosmetic_id]
            );
          }
        });
        processedCount++;
      } catch (error) {
        console.error(`Failed to process ended auction ${auction.id}:`, error);
      }
    }

    return processedCount;
  },
};
