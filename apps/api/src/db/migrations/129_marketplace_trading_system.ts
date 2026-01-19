/**
 * Migration 129: Marketplace Trading System
 *
 * Implements the complete marketplace and trading system:
 * - Marketplace listings (buy now, auction, offers, reserved)
 * - Auction bids with proxy bidding and sniping protection
 * - P2P trading system with counter-offers
 * - Gift system for cosmetics and credits
 * - Mystery boxes with pity system
 * - Collection sets with rewards
 * - Health metrics for earning multipliers
 * - User marketplace statistics
 * - Seller ratings and reputation
 * - Price history tracking
 */

import { query } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 129_marketplace_trading_system');

  // =====================================================
  // ALTER USER_SPIRIT_COSMETICS FOR MARKETPLACE
  // =====================================================
  log.info('Adding marketplace columns to user_spirit_cosmetics...');

  await query(`
    ALTER TABLE user_spirit_cosmetics
    ADD COLUMN IF NOT EXISTS is_listed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS trade_cooldown_until TIMESTAMPTZ
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_user_cosmetics_tradeable
    ON user_spirit_cosmetics(user_id, is_listed)
    WHERE is_listed = FALSE
  `);

  // =====================================================
  // MARKETPLACE LISTINGS
  // =====================================================
  log.info('Creating marketplace listings table...');

  await query(`
    CREATE TABLE IF NOT EXISTS marketplace_listings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      cosmetic_id UUID NOT NULL REFERENCES spirit_animal_cosmetics(id) ON DELETE CASCADE,
      user_cosmetic_id UUID NOT NULL REFERENCES user_spirit_cosmetics(id) ON DELETE CASCADE,

      -- Listing type
      listing_type VARCHAR(20) NOT NULL CHECK (listing_type IN ('buy_now', 'auction', 'offer_only', 'reserved')),

      -- Pricing
      price INTEGER,
      min_offer INTEGER,
      reserve_price INTEGER,
      buy_now_price INTEGER,
      bid_increment INTEGER DEFAULT 10,

      -- Auction specific
      current_bid INTEGER,
      current_bidder_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      bid_count INTEGER DEFAULT 0,
      auction_end_time TIMESTAMPTZ,

      -- Options
      allow_offers BOOLEAN DEFAULT FALSE,
      reserved_for_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,

      -- Timing
      listed_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,

      -- Metadata
      seller_note TEXT,
      quantity INTEGER DEFAULT 1,

      -- Stats
      view_count INTEGER DEFAULT 0,
      watchlist_count INTEGER DEFAULT 0,
      offer_count INTEGER DEFAULT 0,

      -- Status
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'expired', 'cancelled', 'reserved')),
      sold_at TIMESTAMPTZ,
      sold_to_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      sold_price INTEGER,

      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_listings_seller ON marketplace_listings(seller_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_listings_cosmetic ON marketplace_listings(cosmetic_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_listings_status_type ON marketplace_listings(status, listing_type)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_listings_price ON marketplace_listings(price) WHERE status = 'active'`);
  await query(`CREATE INDEX IF NOT EXISTS idx_listings_auction_end ON marketplace_listings(auction_end_time) WHERE listing_type = 'auction' AND status = 'active'`);
  await query(`CREATE INDEX IF NOT EXISTS idx_listings_expires ON marketplace_listings(expires_at) WHERE status = 'active'`);
  await query(`CREATE INDEX IF NOT EXISTS idx_listings_active_price ON marketplace_listings(status, price) INCLUDE (cosmetic_id) WHERE status = 'active'`);
  await query(`CREATE INDEX IF NOT EXISTS idx_listings_seller_active ON marketplace_listings(seller_id, status) WHERE status = 'active'`);

  // Full text search on listing notes
  await query(`
    CREATE INDEX IF NOT EXISTS idx_listings_seller_note_fts ON marketplace_listings
    USING GIN(to_tsvector('english', COALESCE(seller_note, '')))
  `);

  // =====================================================
  // AUCTION BIDS
  // =====================================================
  log.info('Creating auction bids table...');

  await query(`
    CREATE TABLE IF NOT EXISTS auction_bids (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
      bidder_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

      bid_amount INTEGER NOT NULL,
      max_bid INTEGER,

      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'outbid', 'won', 'retracted')),

      created_at TIMESTAMPTZ DEFAULT NOW(),

      UNIQUE(listing_id, bidder_id, bid_amount)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_bids_listing ON auction_bids(listing_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bids_bidder ON auction_bids(bidder_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bids_listing_amount ON auction_bids(listing_id, bid_amount DESC)`);

  // =====================================================
  // MARKETPLACE OFFERS
  // =====================================================
  log.info('Creating marketplace offers table...');

  await query(`
    CREATE TABLE IF NOT EXISTS marketplace_offers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
      offerer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

      offer_amount INTEGER NOT NULL,
      message TEXT,

      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'countered', 'withdrawn')),

      counter_amount INTEGER,
      counter_message TEXT,

      parent_offer_id UUID REFERENCES marketplace_offers(id) ON DELETE SET NULL,

      expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '48 hours',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      responded_at TIMESTAMPTZ
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_offers_listing ON marketplace_offers(listing_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_offers_parent ON marketplace_offers(parent_offer_id) WHERE parent_offer_id IS NOT NULL`);
  await query(`CREATE INDEX IF NOT EXISTS idx_offers_offerer ON marketplace_offers(offerer_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_offers_status ON marketplace_offers(status) WHERE status = 'pending'`);

  // =====================================================
  // MARKETPLACE WATCHLIST
  // =====================================================
  log.info('Creating marketplace watchlist table...');

  await query(`
    CREATE TABLE IF NOT EXISTS marketplace_watchlist (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,

      price_alert INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),

      PRIMARY KEY (user_id, listing_id)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_watchlist_user ON marketplace_watchlist(user_id)`);

  // =====================================================
  // MARKETPLACE TRANSACTIONS
  // =====================================================
  log.info('Creating marketplace transactions table...');

  await query(`
    CREATE TABLE IF NOT EXISTS marketplace_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      listing_id UUID REFERENCES marketplace_listings(id) ON DELETE SET NULL,
      seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      buyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

      cosmetic_id UUID NOT NULL REFERENCES spirit_animal_cosmetics(id) ON DELETE CASCADE,

      sale_price INTEGER NOT NULL,
      platform_fee INTEGER NOT NULL,
      seller_received INTEGER NOT NULL,

      transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('buy_now', 'auction', 'offer_accepted')),

      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_mp_tx_seller ON marketplace_transactions(seller_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_mp_tx_buyer ON marketplace_transactions(buyer_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_mp_tx_cosmetic ON marketplace_transactions(cosmetic_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_mp_tx_created ON marketplace_transactions(created_at DESC)`);

  // =====================================================
  // TRADE REQUESTS
  // =====================================================
  log.info('Creating trade requests table...');

  await query(`
    CREATE TABLE IF NOT EXISTS trade_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      initiator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'countered', 'accepted', 'declined', 'expired', 'completed', 'cancelled')),

      -- Initiator offer
      initiator_items UUID[] DEFAULT '{}',
      initiator_credits INTEGER DEFAULT 0,

      -- Receiver offer
      receiver_items UUID[] DEFAULT '{}',
      receiver_credits INTEGER DEFAULT 0,

      -- Metadata
      message TEXT,
      counter_count INTEGER DEFAULT 0,

      -- Value tracking
      initiator_estimated_value INTEGER,
      receiver_estimated_value INTEGER,

      -- Timing
      expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '48 hours',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_trades_initiator ON trade_requests(initiator_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_trades_receiver ON trade_requests(receiver_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_trades_status ON trade_requests(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_trades_expires ON trade_requests(expires_at) WHERE status = 'pending'`);

  // GIN indexes for array searches
  await query(`CREATE INDEX IF NOT EXISTS idx_trade_initiator_items ON trade_requests USING GIN(initiator_items)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_trade_receiver_items ON trade_requests USING GIN(receiver_items)`);

  // =====================================================
  // TRADE HISTORY (AUDIT)
  // =====================================================
  log.info('Creating trade history table...');

  await query(`
    CREATE TABLE IF NOT EXISTS trade_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trade_id UUID NOT NULL REFERENCES trade_requests(id) ON DELETE CASCADE,

      user1_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user2_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

      user1_items JSONB,
      user1_credits INTEGER,
      user2_items JSONB,
      user2_credits INTEGER,

      total_value INTEGER,

      completed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_trade_history_users ON trade_history(user1_id, user2_id)`);

  // =====================================================
  // COSMETIC GIFTS
  // =====================================================
  log.info('Creating cosmetic gifts table...');

  await query(`
    CREATE TABLE IF NOT EXISTS cosmetic_gifts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sender_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

      -- Gift contents (one of these)
      cosmetic_id UUID REFERENCES spirit_animal_cosmetics(id) ON DELETE CASCADE,
      credit_amount INTEGER,
      mystery_box_id UUID,

      -- Presentation
      wrapping_style VARCHAR(20) DEFAULT 'standard' CHECK (wrapping_style IN ('standard', 'birthday', 'holiday', 'congrats', 'custom')),
      message TEXT,
      is_anonymous BOOLEAN DEFAULT FALSE,

      -- Scheduling
      scheduled_delivery TIMESTAMPTZ,

      -- Status
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'opened', 'returned')),
      delivered_at TIMESTAMPTZ,
      opened_at TIMESTAMPTZ,

      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_gifts_sender ON cosmetic_gifts(sender_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_gifts_recipient ON cosmetic_gifts(recipient_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_gifts_status ON cosmetic_gifts(status) WHERE status = 'pending'`);

  // =====================================================
  // COLLECTION SETS
  // =====================================================
  log.info('Creating collection sets table...');

  await query(`
    CREATE TABLE IF NOT EXISTS collection_sets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      theme VARCHAR(50),

      items UUID[] NOT NULL,

      -- Rewards
      rewards JSONB NOT NULL DEFAULT '[]',

      -- Availability
      is_limited BOOLEAN DEFAULT FALSE,
      release_date DATE,
      expiration_date DATE,

      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_collection_sets_theme ON collection_sets(theme)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_collection_sets_items ON collection_sets USING GIN(items)`);

  // =====================================================
  // USER COLLECTION PROGRESS
  // =====================================================
  log.info('Creating user collection progress table...');

  await query(`
    CREATE TABLE IF NOT EXISTS user_collection_progress (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      set_id UUID NOT NULL REFERENCES collection_sets(id) ON DELETE CASCADE,

      owned_items UUID[] DEFAULT '{}',
      completion_percent NUMERIC(5,2) DEFAULT 0,

      rewards_claimed JSONB DEFAULT '[]',

      completed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ DEFAULT NOW(),

      PRIMARY KEY (user_id, set_id)
    )
  `);

  // =====================================================
  // MYSTERY BOXES
  // =====================================================
  log.info('Creating mystery boxes table...');

  await query(`
    CREATE TABLE IF NOT EXISTS mystery_boxes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      box_type VARCHAR(20) NOT NULL CHECK (box_type IN ('standard', 'premium', 'legendary', 'event', 'workout')),

      price INTEGER NOT NULL,

      -- Drop rates
      drop_rates JSONB NOT NULL DEFAULT '{}',

      -- Contents pool
      item_pool UUID[] NOT NULL DEFAULT '{}',

      -- Limits
      max_purchases_per_user INTEGER,
      max_purchases_per_day INTEGER,
      total_supply INTEGER,

      -- Availability
      is_active BOOLEAN DEFAULT TRUE,
      available_from TIMESTAMPTZ,
      available_until TIMESTAMPTZ,

      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_mystery_boxes_type ON mystery_boxes(box_type)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_mystery_boxes_active ON mystery_boxes(is_active) WHERE is_active = TRUE`);

  // =====================================================
  // MYSTERY BOX OPENINGS
  // =====================================================
  log.info('Creating mystery box openings table...');

  await query(`
    CREATE TABLE IF NOT EXISTS mystery_box_openings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      box_id UUID NOT NULL REFERENCES mystery_boxes(id) ON DELETE CASCADE,

      cosmetic_received_id UUID REFERENCES spirit_animal_cosmetics(id) ON DELETE SET NULL,
      rarity_received VARCHAR(20),

      credits_spent INTEGER,

      -- Pity tracking
      pity_counter_at_open INTEGER,
      was_pity_reward BOOLEAN DEFAULT FALSE,

      opened_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_box_openings_user ON mystery_box_openings(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_box_openings_box ON mystery_box_openings(box_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_box_openings_date ON mystery_box_openings(opened_at DESC)`);

  // =====================================================
  // USER PITY COUNTERS
  // =====================================================
  log.info('Creating user pity counters table...');

  await query(`
    CREATE TABLE IF NOT EXISTS user_pity_counters (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      box_type VARCHAR(20) NOT NULL,

      epic_counter INTEGER DEFAULT 0,
      legendary_counter INTEGER DEFAULT 0,

      last_epic_at TIMESTAMPTZ,
      last_legendary_at TIMESTAMPTZ,

      updated_at TIMESTAMPTZ DEFAULT NOW(),

      PRIMARY KEY (user_id, box_type)
    )
  `);

  // =====================================================
  // DAILY HEALTH METRICS
  // =====================================================
  log.info('Creating daily health metrics table...');

  await query(`
    CREATE TABLE IF NOT EXISTS daily_health_metrics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,

      -- Exercise
      workout_completed BOOLEAN DEFAULT FALSE,
      workout_intensity VARCHAR(10) CHECK (workout_intensity IN ('low', 'medium', 'high')),
      workout_minutes INTEGER DEFAULT 0,
      steps_count INTEGER DEFAULT 0,
      active_minutes INTEGER DEFAULT 0,

      -- Recovery
      sleep_hours NUMERIC(4,2),
      sleep_quality INTEGER CHECK (sleep_quality BETWEEN 0 AND 100),
      resting_heart_rate INTEGER,
      hrv_score INTEGER,

      -- Nutrition
      calories_logged BOOLEAN DEFAULT FALSE,
      protein_goal_met BOOLEAN DEFAULT FALSE,
      hydration_liters NUMERIC(4,2),
      nutrition_score INTEGER CHECK (nutrition_score BETWEEN 0 AND 100),

      -- Calculated
      daily_health_score INTEGER,
      earning_multiplier NUMERIC(3,2) DEFAULT 1.0,

      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),

      UNIQUE(user_id, date)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_health_metrics_user_date ON daily_health_metrics(user_id, date DESC)`);

  // =====================================================
  // USER HEALTH TIER
  // =====================================================
  log.info('Creating user health tier table...');

  await query(`
    CREATE TABLE IF NOT EXISTS user_health_tier (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

      tier VARCHAR(20) DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
      streak_days INTEGER DEFAULT 0,
      current_multiplier NUMERIC(3,2) DEFAULT 1.0,

      workout_bonus NUMERIC(3,2) DEFAULT 0,
      sleep_bonus NUMERIC(3,2) DEFAULT 0,
      nutrition_bonus NUMERIC(3,2) DEFAULT 0,
      streak_bonus NUMERIC(3,2) DEFAULT 0,

      last_workout_date DATE,
      tier_progress NUMERIC(5,2) DEFAULT 0,

      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // =====================================================
  // CREW ECONOMY
  // =====================================================
  log.info('Creating crew economy table...');

  await query(`
    CREATE TABLE IF NOT EXISTS crew_economy (
      crew_id TEXT PRIMARY KEY REFERENCES crews(id) ON DELETE CASCADE,

      -- Treasury
      credit_balance INTEGER DEFAULT 0,
      lifetime_deposited INTEGER DEFAULT 0,
      lifetime_spent INTEGER DEFAULT 0,

      -- Permissions
      withdraw_user_ids TEXT[] DEFAULT '{}',
      max_withdrawal_amount INTEGER DEFAULT 1000,
      deposit_enabled BOOLEAN DEFAULT TRUE,

      -- Crew cosmetics
      crew_banner_id UUID REFERENCES spirit_animal_cosmetics(id) ON DELETE SET NULL,
      crew_badge_id UUID REFERENCES spirit_animal_cosmetics(id) ON DELETE SET NULL,
      crew_aura_id UUID REFERENCES spirit_animal_cosmetics(id) ON DELETE SET NULL,

      -- Shared inventory
      shared_inventory_ids UUID[] DEFAULT '{}',

      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // =====================================================
  // CREW TREASURY TRANSACTIONS
  // =====================================================
  log.info('Creating crew treasury transactions table...');

  await query(`
    CREATE TABLE IF NOT EXISTS crew_treasury_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      crew_id TEXT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,

      transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'purchase', 'gift', 'reward')),

      amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,

      description TEXT,
      cosmetic_id UUID REFERENCES spirit_animal_cosmetics(id) ON DELETE SET NULL,

      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_crew_treasury_tx ON crew_treasury_transactions(crew_id, created_at DESC)`);

  // =====================================================
  // ITEM SUPPLY TRACKING
  // =====================================================
  log.info('Creating item supply table...');

  await query(`
    CREATE TABLE IF NOT EXISTS item_supply (
      cosmetic_id UUID PRIMARY KEY REFERENCES spirit_animal_cosmetics(id) ON DELETE CASCADE,

      -- Supply limits
      max_supply INTEGER,
      current_supply INTEGER DEFAULT 0,
      circulating_supply INTEGER DEFAULT 0,

      -- Time limits
      available_from TIMESTAMPTZ,
      available_until TIMESTAMPTZ,

      -- Purchase limits
      max_per_user INTEGER,

      -- Restocking
      restock_enabled BOOLEAN DEFAULT FALSE,
      restock_interval VARCHAR(20),
      restock_amount INTEGER,
      last_restock_at TIMESTAMPTZ,
      next_restock_at TIMESTAMPTZ,

      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // =====================================================
  // PRICE HISTORY
  // =====================================================
  log.info('Creating price history table...');

  await query(`
    CREATE TABLE IF NOT EXISTS price_history (
      cosmetic_id UUID NOT NULL REFERENCES spirit_animal_cosmetics(id) ON DELETE CASCADE,
      date DATE NOT NULL,

      -- Daily stats
      avg_price INTEGER,
      min_price INTEGER,
      max_price INTEGER,

      volume INTEGER DEFAULT 0,
      total_value INTEGER DEFAULT 0,

      -- Listing stats
      active_listings INTEGER DEFAULT 0,

      PRIMARY KEY (cosmetic_id, date)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_price_history_cosmetic_date ON price_history(cosmetic_id, date DESC)`);

  // =====================================================
  // USER MARKETPLACE STATS
  // =====================================================
  log.info('Creating user marketplace stats table...');

  await query(`
    CREATE TABLE IF NOT EXISTS user_marketplace_stats (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

      -- Selling
      total_sales INTEGER DEFAULT 0,
      total_revenue INTEGER DEFAULT 0,
      avg_sale_price NUMERIC(10,2),

      -- Buying
      total_purchases INTEGER DEFAULT 0,
      total_spent INTEGER DEFAULT 0,
      avg_purchase_price NUMERIC(10,2),

      -- Trading
      total_trades INTEGER DEFAULT 0,
      trade_value_exchanged INTEGER DEFAULT 0,

      -- Reputation
      seller_rating NUMERIC(3,2),
      buyer_rating NUMERIC(3,2),
      total_ratings INTEGER DEFAULT 0,

      -- Activity
      active_listings INTEGER DEFAULT 0,
      watchlist_count INTEGER DEFAULT 0,

      -- Seller level
      seller_level INTEGER DEFAULT 1,
      marketplace_fee_percent NUMERIC(4,2) DEFAULT 7.0,

      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // =====================================================
  // SELLER RATINGS
  // =====================================================
  log.info('Creating seller ratings table...');

  await query(`
    CREATE TABLE IF NOT EXISTS seller_ratings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      transaction_id UUID NOT NULL REFERENCES marketplace_transactions(id) ON DELETE CASCADE,

      rater_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,

      created_at TIMESTAMPTZ DEFAULT NOW(),

      UNIQUE(transaction_id, rater_id)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_seller_ratings_seller ON seller_ratings(seller_id)`);

  // =====================================================
  // SEED SOME MYSTERY BOXES
  // =====================================================
  log.info('Seeding initial mystery boxes...');

  await query(`
    INSERT INTO mystery_boxes (name, description, box_type, price, drop_rates, item_pool)
    VALUES
      ('Standard Box', 'A standard mystery box with a mix of items', 'standard', 100,
       '{"common": 0.55, "uncommon": 0.30, "rare": 0.12, "epic": 0.025, "legendary": 0.0045, "mythic": 0.0005}'::jsonb,
       '{}'::uuid[]),
      ('Premium Box', 'A premium box with better odds for rare items', 'premium', 500,
       '{"uncommon": 0.40, "rare": 0.40, "epic": 0.15, "legendary": 0.04, "mythic": 0.009, "divine": 0.001}'::jsonb,
       '{}'::uuid[]),
      ('Legendary Box', 'A legendary box guaranteed rare or better', 'legendary', 2000,
       '{"rare": 0.30, "epic": 0.50, "legendary": 0.16, "mythic": 0.035, "divine": 0.005}'::jsonb,
       '{}'::uuid[])
    ON CONFLICT DO NOTHING
  `);

  // =====================================================
  // FUNCTIONS FOR MARKETPLACE AUTOMATION
  // =====================================================
  log.info('Creating marketplace helper functions...');

  // Function to expire old listings
  await query(`
    CREATE OR REPLACE FUNCTION expire_old_listings()
    RETURNS INTEGER AS $$
    DECLARE
      expired_count INTEGER;
    BEGIN
      UPDATE marketplace_listings
      SET status = 'expired', updated_at = NOW()
      WHERE status = 'active'
        AND expires_at < NOW();

      GET DIAGNOSTICS expired_count = ROW_COUNT;

      -- Also mark the user cosmetics as no longer listed
      UPDATE user_spirit_cosmetics
      SET is_listed = FALSE
      WHERE id IN (
        SELECT user_cosmetic_id FROM marketplace_listings
        WHERE status = 'expired' AND updated_at > NOW() - INTERVAL '1 minute'
      );

      RETURN expired_count;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Function to end auctions and assign winners
  await query(`
    CREATE OR REPLACE FUNCTION end_auctions()
    RETURNS INTEGER AS $$
    DECLARE
      ended_count INTEGER;
      auction RECORD;
    BEGIN
      ended_count := 0;

      FOR auction IN
        SELECT id, current_bidder_id, current_bid, seller_id, cosmetic_id
        FROM marketplace_listings
        WHERE listing_type = 'auction'
          AND status = 'active'
          AND auction_end_time < NOW()
          AND current_bidder_id IS NOT NULL
      LOOP
        -- Update listing to sold
        UPDATE marketplace_listings
        SET status = 'sold',
            sold_at = NOW(),
            sold_to_id = auction.current_bidder_id,
            sold_price = auction.current_bid,
            updated_at = NOW()
        WHERE id = auction.id;

        ended_count := ended_count + 1;
      END LOOP;

      -- Mark auctions with no bids as expired
      UPDATE marketplace_listings
      SET status = 'expired', updated_at = NOW()
      WHERE listing_type = 'auction'
        AND status = 'active'
        AND auction_end_time < NOW()
        AND current_bidder_id IS NULL;

      RETURN ended_count;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Function to expire old offers
  await query(`
    CREATE OR REPLACE FUNCTION expire_old_offers()
    RETURNS INTEGER AS $$
    DECLARE
      expired_count INTEGER;
    BEGIN
      UPDATE marketplace_offers
      SET status = 'expired'
      WHERE status = 'pending'
        AND expires_at < NOW();

      GET DIAGNOSTICS expired_count = ROW_COUNT;
      RETURN expired_count;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Function to expire old trade requests
  await query(`
    CREATE OR REPLACE FUNCTION expire_old_trades()
    RETURNS INTEGER AS $$
    DECLARE
      expired_count INTEGER;
    BEGIN
      UPDATE trade_requests
      SET status = 'expired', updated_at = NOW()
      WHERE status IN ('pending', 'countered')
        AND expires_at < NOW();

      GET DIAGNOSTICS expired_count = ROW_COUNT;
      RETURN expired_count;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Function to update price history daily
  await query(`
    CREATE OR REPLACE FUNCTION update_price_history()
    RETURNS void AS $$
    BEGIN
      INSERT INTO price_history (cosmetic_id, date, avg_price, min_price, max_price, volume, total_value, active_listings)
      SELECT
        cosmetic_id,
        CURRENT_DATE - 1,
        AVG(sold_price)::INTEGER,
        MIN(sold_price),
        MAX(sold_price),
        COUNT(*),
        SUM(sold_price),
        0
      FROM marketplace_transactions
      WHERE created_at >= CURRENT_DATE - 1
        AND created_at < CURRENT_DATE
      GROUP BY cosmetic_id
      ON CONFLICT (cosmetic_id, date) DO UPDATE SET
        avg_price = EXCLUDED.avg_price,
        min_price = EXCLUDED.min_price,
        max_price = EXCLUDED.max_price,
        volume = EXCLUDED.volume,
        total_value = EXCLUDED.total_value;

      -- Update active listings count
      UPDATE price_history ph
      SET active_listings = (
        SELECT COUNT(*) FROM marketplace_listings ml
        WHERE ml.cosmetic_id = ph.cosmetic_id
          AND ml.status = 'active'
      )
      WHERE ph.date = CURRENT_DATE - 1;
    END;
    $$ LANGUAGE plpgsql
  `);

  // =====================================================
  // TRIGGERS
  // =====================================================
  log.info('Creating marketplace triggers...');

  // Trigger to update user marketplace stats on transaction
  await query(`
    CREATE OR REPLACE FUNCTION update_marketplace_stats_on_transaction()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Update seller stats
      INSERT INTO user_marketplace_stats (user_id, total_sales, total_revenue)
      VALUES (NEW.seller_id, 1, NEW.seller_received)
      ON CONFLICT (user_id) DO UPDATE SET
        total_sales = user_marketplace_stats.total_sales + 1,
        total_revenue = user_marketplace_stats.total_revenue + NEW.seller_received,
        avg_sale_price = (user_marketplace_stats.total_revenue + NEW.seller_received) / (user_marketplace_stats.total_sales + 1),
        updated_at = NOW();

      -- Update buyer stats
      INSERT INTO user_marketplace_stats (user_id, total_purchases, total_spent)
      VALUES (NEW.buyer_id, 1, NEW.sale_price)
      ON CONFLICT (user_id) DO UPDATE SET
        total_purchases = user_marketplace_stats.total_purchases + 1,
        total_spent = user_marketplace_stats.total_spent + NEW.sale_price,
        avg_purchase_price = (user_marketplace_stats.total_spent + NEW.sale_price) / (user_marketplace_stats.total_purchases + 1),
        updated_at = NOW();

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await query(`
    DROP TRIGGER IF EXISTS trg_update_marketplace_stats ON marketplace_transactions
  `);

  await query(`
    CREATE TRIGGER trg_update_marketplace_stats
    AFTER INSERT ON marketplace_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_marketplace_stats_on_transaction()
  `);

  // Trigger to update listing view count
  await query(`
    CREATE OR REPLACE FUNCTION increment_listing_view_count()
    RETURNS TRIGGER AS $$
    BEGIN
      -- This is a placeholder - actual view tracking should be done at application level
      -- to avoid excessive writes
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Trigger to handle auction bid sniping protection
  await query(`
    CREATE OR REPLACE FUNCTION auction_sniping_protection()
    RETURNS TRIGGER AS $$
    DECLARE
      time_remaining INTERVAL;
    BEGIN
      -- Check if bid is in final 5 minutes
      SELECT auction_end_time - NOW() INTO time_remaining
      FROM marketplace_listings
      WHERE id = NEW.listing_id;

      IF time_remaining < INTERVAL '5 minutes' THEN
        -- Extend auction by 5 minutes
        UPDATE marketplace_listings
        SET auction_end_time = NOW() + INTERVAL '5 minutes',
            updated_at = NOW()
        WHERE id = NEW.listing_id;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await query(`
    DROP TRIGGER IF EXISTS trg_auction_sniping ON auction_bids
  `);

  await query(`
    CREATE TRIGGER trg_auction_sniping
    AFTER INSERT ON auction_bids
    FOR EACH ROW
    EXECUTE FUNCTION auction_sniping_protection()
  `);

  log.info('Migration 129_marketplace_trading_system completed successfully');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 129_marketplace_trading_system');

  // Drop triggers
  await query(`DROP TRIGGER IF EXISTS trg_auction_sniping ON auction_bids`);
  await query(`DROP TRIGGER IF EXISTS trg_update_marketplace_stats ON marketplace_transactions`);

  // Drop functions
  await query(`DROP FUNCTION IF EXISTS auction_sniping_protection()`);
  await query(`DROP FUNCTION IF EXISTS increment_listing_view_count()`);
  await query(`DROP FUNCTION IF EXISTS update_marketplace_stats_on_transaction()`);
  await query(`DROP FUNCTION IF EXISTS update_price_history()`);
  await query(`DROP FUNCTION IF EXISTS expire_old_trades()`);
  await query(`DROP FUNCTION IF EXISTS expire_old_offers()`);
  await query(`DROP FUNCTION IF EXISTS end_auctions()`);
  await query(`DROP FUNCTION IF EXISTS expire_old_listings()`);

  // Drop tables in reverse order of creation
  await query(`DROP TABLE IF EXISTS seller_ratings`);
  await query(`DROP TABLE IF EXISTS user_marketplace_stats`);
  await query(`DROP TABLE IF EXISTS price_history`);
  await query(`DROP TABLE IF EXISTS item_supply`);
  await query(`DROP TABLE IF EXISTS crew_treasury_transactions`);
  await query(`DROP TABLE IF EXISTS crew_economy`);
  await query(`DROP TABLE IF EXISTS user_health_tier`);
  await query(`DROP TABLE IF EXISTS daily_health_metrics`);
  await query(`DROP TABLE IF EXISTS user_pity_counters`);
  await query(`DROP TABLE IF EXISTS mystery_box_openings`);
  await query(`DROP TABLE IF EXISTS mystery_boxes`);
  await query(`DROP TABLE IF EXISTS user_collection_progress`);
  await query(`DROP TABLE IF EXISTS collection_sets`);
  await query(`DROP TABLE IF EXISTS cosmetic_gifts`);
  await query(`DROP TABLE IF EXISTS trade_history`);
  await query(`DROP TABLE IF EXISTS trade_requests`);
  await query(`DROP TABLE IF EXISTS marketplace_transactions`);
  await query(`DROP TABLE IF EXISTS marketplace_watchlist`);
  await query(`DROP TABLE IF EXISTS marketplace_offers`);
  await query(`DROP TABLE IF EXISTS auction_bids`);
  await query(`DROP TABLE IF EXISTS marketplace_listings`);

  // Remove columns from user_spirit_cosmetics
  await query(`ALTER TABLE user_spirit_cosmetics DROP COLUMN IF EXISTS is_listed`);
  await query(`ALTER TABLE user_spirit_cosmetics DROP COLUMN IF EXISTS trade_cooldown_until`);

  log.info('Rollback of migration 129_marketplace_trading_system completed');
}
