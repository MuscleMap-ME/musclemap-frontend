import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // =====================================================
  // MARKETPLACE LISTINGS
  // =====================================================
  await knex.schema.createTable('marketplace_listings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.text('seller_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.uuid('cosmetic_id').references('id').inTable('spirit_animal_cosmetics');
    table.uuid('user_cosmetic_id').references('id').inTable('user_spirit_cosmetics');

    // Listing type
    table.string('listing_type', 20).notNullable();
    table.check('listing_type IN (\'buy_now\', \'auction\', \'offer_only\', \'reserved\')');

    // Pricing
    table.integer('price');
    table.integer('min_offer');
    table.integer('reserve_price');
    table.integer('buy_now_price');
    table.integer('bid_increment').defaultTo(10);

    // Auction specific
    table.integer('current_bid');
    table.text('current_bidder_id').references('id').inTable('users');
    table.integer('bid_count').defaultTo(0);
    table.timestamp('auction_end_time', { useTz: true });

    // Options
    table.boolean('allow_offers').defaultTo(false);
    table.text('reserved_for_user_id').references('id').inTable('users');

    // Timing
    table.timestamp('listed_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('expires_at', { useTz: true }).notNullable();

    // Metadata
    table.text('seller_note');
    table.integer('quantity').defaultTo(1);

    // Stats
    table.integer('view_count').defaultTo(0);
    table.integer('watchlist_count').defaultTo(0);
    table.integer('offer_count').defaultTo(0);

    // Status
    table.string('status', 20).defaultTo('active');
    table.check('status IN (\'active\', \'sold\', \'expired\', \'cancelled\', \'reserved\')');
    table.timestamp('sold_at', { useTz: true });
    table.text('sold_to_id').references('id').inTable('users');
    table.integer('sold_price');

    // Timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());

    // Indexes
    table.index('seller_id');
    table.index('cosmetic_id');
    table.index(['status', 'listing_type']);
    table.index('expires_at');
  });

  // Partial indexes for marketplace
  await knex.raw(`
    CREATE INDEX idx_listings_price_active ON marketplace_listings(price) WHERE status = 'active';
    CREATE INDEX idx_listings_auction_end_active ON marketplace_listings(auction_end_time)
      WHERE listing_type = 'auction' AND status = 'active';
  `);

  // =====================================================
  // AUCTION BIDS
  // =====================================================
  await knex.schema.createTable('auction_bids', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('listing_id').references('id').inTable('marketplace_listings').onDelete('CASCADE').notNullable();
    table.text('bidder_id').references('id').inTable('users').onDelete('CASCADE').notNullable();

    table.integer('bid_amount').notNullable();
    table.integer('max_bid');

    table.string('status', 20).defaultTo('active');
    table.check('status IN (\'active\', \'outbid\', \'won\', \'retracted\')');

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    table.index('listing_id');
    table.index('bidder_id');
    table.unique(['listing_id', 'bidder_id', 'bid_amount']);
  });

  // =====================================================
  // MARKETPLACE OFFERS
  // =====================================================
  await knex.schema.createTable('marketplace_offers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('listing_id').references('id').inTable('marketplace_listings').onDelete('CASCADE').notNullable();
    table.text('offerer_id').references('id').inTable('users').onDelete('CASCADE').notNullable();

    table.integer('offer_amount').notNullable();
    table.text('message');

    table.string('status', 20).defaultTo('pending');
    table.check('status IN (\'pending\', \'accepted\', \'declined\', \'expired\', \'countered\', \'withdrawn\')');

    table.integer('counter_amount');
    table.text('counter_message');

    table.timestamp('expires_at', { useTz: true }).defaultTo(knex.raw("NOW() + INTERVAL '48 hours'"));
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('responded_at', { useTz: true });

    table.index('listing_id');
    table.index('offerer_id');
  });

  // =====================================================
  // MARKETPLACE WATCHLIST
  // =====================================================
  await knex.schema.createTable('marketplace_watchlist', (table) => {
    table.text('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.uuid('listing_id').references('id').inTable('marketplace_listings').onDelete('CASCADE').notNullable();

    table.integer('price_alert');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    table.primary(['user_id', 'listing_id']);
  });

  // =====================================================
  // MARKETPLACE TRANSACTIONS
  // =====================================================
  await knex.schema.createTable('marketplace_transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table.uuid('listing_id').references('id').inTable('marketplace_listings');
    table.text('seller_id').references('id').inTable('users');
    table.text('buyer_id').references('id').inTable('users');

    table.uuid('cosmetic_id').references('id').inTable('spirit_animal_cosmetics');

    table.integer('sale_price').notNullable();
    table.integer('platform_fee').notNullable();
    table.integer('seller_received').notNullable();

    table.string('transaction_type', 20).notNullable();
    table.check('transaction_type IN (\'buy_now\', \'auction\', \'offer_accepted\')');

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    table.index('seller_id');
    table.index('buyer_id');
    table.index('cosmetic_id');
  });

  // =====================================================
  // TRADE REQUESTS
  // =====================================================
  await knex.schema.createTable('trade_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.text('initiator_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.text('receiver_id').references('id').inTable('users').onDelete('CASCADE').notNullable();

    table.string('status', 20).defaultTo('pending');
    table.check('status IN (\'pending\', \'countered\', \'accepted\', \'declined\', \'expired\', \'completed\', \'cancelled\')');

    // Initiator offer
    table.specificType('initiator_items', 'uuid[]').defaultTo('{}');
    table.integer('initiator_credits').defaultTo(0);

    // Receiver offer
    table.specificType('receiver_items', 'uuid[]').defaultTo('{}');
    table.integer('receiver_credits').defaultTo(0);

    // Metadata
    table.text('message');
    table.integer('counter_count').defaultTo(0);

    // Value tracking
    table.integer('initiator_estimated_value');
    table.integer('receiver_estimated_value');

    // Timing
    table.timestamp('expires_at', { useTz: true }).defaultTo(knex.raw("NOW() + INTERVAL '48 hours'"));
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('completed_at', { useTz: true });

    table.index('initiator_id');
    table.index('receiver_id');
    table.index('status');
  });

  // GIN indexes for array columns
  await knex.raw(`
    CREATE INDEX idx_trade_initiator_items ON trade_requests USING GIN(initiator_items);
    CREATE INDEX idx_trade_receiver_items ON trade_requests USING GIN(receiver_items);
  `);

  // =====================================================
  // TRADE HISTORY
  // =====================================================
  await knex.schema.createTable('trade_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('trade_id').references('id').inTable('trade_requests');

    table.text('user1_id').references('id').inTable('users');
    table.text('user2_id').references('id').inTable('users');

    table.jsonb('user1_items');
    table.integer('user1_credits');
    table.jsonb('user2_items');
    table.integer('user2_credits');

    table.integer('total_value');

    table.timestamp('completed_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  // =====================================================
  // COSMETIC GIFTS
  // =====================================================
  await knex.schema.createTable('cosmetic_gifts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.text('sender_id').references('id').inTable('users').onDelete('SET NULL');
    table.text('recipient_id').references('id').inTable('users').onDelete('CASCADE').notNullable();

    // Gift contents
    table.uuid('cosmetic_id').references('id').inTable('spirit_animal_cosmetics');
    table.integer('credit_amount');
    table.uuid('mystery_box_id');

    // Presentation
    table.string('wrapping_style', 20).defaultTo('standard');
    table.text('message');
    table.boolean('is_anonymous').defaultTo(false);

    // Scheduling
    table.timestamp('scheduled_delivery', { useTz: true });

    // Status
    table.string('status', 20).defaultTo('pending');
    table.check('status IN (\'pending\', \'delivered\', \'opened\', \'returned\')');
    table.timestamp('delivered_at', { useTz: true });
    table.timestamp('opened_at', { useTz: true });

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    table.index('sender_id');
    table.index('recipient_id');
  });

  // =====================================================
  // COLLECTION SETS
  // =====================================================
  await knex.schema.createTable('collection_sets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable();
    table.text('description');
    table.string('theme', 50);

    table.specificType('items', 'uuid[]').notNullable();

    // Rewards
    table.jsonb('rewards').notNullable();

    // Availability
    table.boolean('is_limited').defaultTo(false);
    table.date('release_date');
    table.date('expiration_date');

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  // =====================================================
  // USER COLLECTION PROGRESS
  // =====================================================
  await knex.schema.createTable('user_collection_progress', (table) => {
    table.text('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.uuid('set_id').references('id').inTable('collection_sets').onDelete('CASCADE').notNullable();

    table.specificType('owned_items', 'uuid[]').defaultTo('{}');
    table.decimal('completion_percent', 5, 2).defaultTo(0);

    table.jsonb('rewards_claimed').defaultTo('[]');

    table.timestamp('completed_at', { useTz: true });
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());

    table.primary(['user_id', 'set_id']);
  });

  // =====================================================
  // MYSTERY BOXES
  // =====================================================
  await knex.schema.createTable('mystery_boxes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable();
    table.text('description');
    table.string('box_type', 20).notNullable();

    table.integer('price').notNullable();

    // Drop rates
    table.jsonb('drop_rates').notNullable();

    // Contents pool
    table.specificType('item_pool', 'uuid[]').notNullable();

    // Limits
    table.integer('max_purchases_per_user');
    table.integer('max_purchases_per_day');
    table.integer('total_supply');

    // Availability
    table.timestamp('available_from', { useTz: true });
    table.timestamp('available_until', { useTz: true });

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  // =====================================================
  // MYSTERY BOX OPENINGS
  // =====================================================
  await knex.schema.createTable('mystery_box_openings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.text('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.uuid('box_id').references('id').inTable('mystery_boxes');

    table.uuid('cosmetic_received_id').references('id').inTable('spirit_animal_cosmetics');
    table.string('rarity_received', 20);

    table.integer('credits_spent');

    // Pity tracking
    table.integer('pity_counter_at_open');
    table.boolean('was_pity_reward').defaultTo(false);

    table.timestamp('opened_at', { useTz: true }).defaultTo(knex.fn.now());

    table.index('user_id');
  });

  // =====================================================
  // USER PITY COUNTERS
  // =====================================================
  await knex.schema.createTable('user_pity_counters', (table) => {
    table.text('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.string('box_type', 20).notNullable();

    table.integer('epic_counter').defaultTo(0);
    table.integer('legendary_counter').defaultTo(0);

    table.timestamp('last_epic_at', { useTz: true });
    table.timestamp('last_legendary_at', { useTz: true });

    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());

    table.primary(['user_id', 'box_type']);
  });

  // =====================================================
  // DAILY HEALTH METRICS
  // =====================================================
  await knex.schema.createTable('daily_health_metrics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.text('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.date('date').notNullable();

    // Exercise
    table.integer('workouts_completed').defaultTo(0);
    table.integer('workout_minutes').defaultTo(0);
    table.integer('steps').defaultTo(0);
    table.integer('active_calories').defaultTo(0);

    // Recovery
    table.decimal('sleep_hours', 4, 2);
    table.integer('sleep_quality');
    table.integer('resting_heart_rate');
    table.integer('hrv_score');

    // Nutrition
    table.boolean('calories_logged').defaultTo(false);
    table.boolean('protein_goal_met').defaultTo(false);
    table.integer('water_intake');
    table.integer('nutrition_score');

    // Calculated
    table.integer('daily_health_score');
    table.decimal('earning_multiplier', 3, 2).defaultTo(1.0);

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    table.unique(['user_id', 'date']);
    table.index(['user_id', 'date']);
  });

  // =====================================================
  // USER HEALTH TIER
  // =====================================================
  await knex.schema.createTable('user_health_tier', (table) => {
    table.text('user_id').primary().references('id').inTable('users').onDelete('CASCADE');

    table.integer('current_tier').defaultTo(1);
    table.check('current_tier BETWEEN 1 AND 5');
    table.string('tier_name', 20);

    table.decimal('avg_health_score', 5, 2);
    table.integer('calculation_period_days').defaultTo(30);

    table.integer('earning_bonus_percent').defaultTo(0);
    table.integer('marketplace_fee_discount').defaultTo(0);

    table.timestamp('last_calculated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('next_calculation_at', { useTz: true }).defaultTo(knex.raw("NOW() + INTERVAL '1 day'"));
  });

  // =====================================================
  // CREW ECONOMY (extends existing crews table)
  // =====================================================
  await knex.schema.createTable('crew_economy', (table) => {
    table.text('crew_id').primary().references('id').inTable('crews').onDelete('CASCADE');

    // Treasury
    table.integer('credit_balance').defaultTo(0);
    table.integer('lifetime_deposited').defaultTo(0);
    table.integer('lifetime_spent').defaultTo(0);

    // Permissions
    table.specificType('withdraw_user_ids', 'text[]').defaultTo('{}');
    table.integer('max_withdrawal_amount').defaultTo(1000);
    table.boolean('deposit_enabled').defaultTo(true);

    // Crew cosmetics
    table.uuid('crew_banner_id').references('id').inTable('spirit_animal_cosmetics');
    table.uuid('crew_badge_id').references('id').inTable('spirit_animal_cosmetics');
    table.uuid('crew_aura_id').references('id').inTable('spirit_animal_cosmetics');

    // Shared inventory
    table.specificType('shared_inventory_ids', 'uuid[]').defaultTo('{}');

    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  // =====================================================
  // CREW TREASURY TRANSACTIONS
  // =====================================================
  await knex.schema.createTable('crew_treasury_transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.text('crew_id').references('id').inTable('crews').onDelete('CASCADE').notNullable();
    table.text('user_id').references('id').inTable('users');

    table.string('transaction_type', 20).notNullable();
    table.check('transaction_type IN (\'deposit\', \'withdrawal\', \'purchase\', \'gift\', \'reward\')');

    table.integer('amount').notNullable();
    table.integer('balance_after').notNullable();

    table.text('description');
    table.uuid('cosmetic_id').references('id').inTable('spirit_animal_cosmetics');

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  // =====================================================
  // ITEM SUPPLY TRACKING
  // =====================================================
  await knex.schema.createTable('item_supply', (table) => {
    table.uuid('cosmetic_id').primary().references('id').inTable('spirit_animal_cosmetics').onDelete('CASCADE');

    // Supply limits
    table.integer('max_supply');
    table.integer('current_supply').defaultTo(0);
    table.integer('circulating_supply').defaultTo(0);

    // Time limits
    table.timestamp('available_from', { useTz: true });
    table.timestamp('available_until', { useTz: true });

    // Purchase limits
    table.integer('max_per_user');

    // Restocking
    table.boolean('restock_enabled').defaultTo(false);
    table.string('restock_interval', 20);
    table.integer('restock_amount');
    table.timestamp('last_restock_at', { useTz: true });
    table.timestamp('next_restock_at', { useTz: true });

    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  // =====================================================
  // PRICE HISTORY
  // =====================================================
  await knex.schema.createTable('price_history', (table) => {
    table.uuid('cosmetic_id').references('id').inTable('spirit_animal_cosmetics').onDelete('CASCADE').notNullable();
    table.date('date').notNullable();

    // Daily stats
    table.integer('avg_price');
    table.integer('min_price');
    table.integer('max_price');

    table.integer('volume');
    table.integer('total_value');

    // Listing stats
    table.integer('active_listings');

    table.primary(['cosmetic_id', 'date']);
    table.index(['cosmetic_id', 'date']);
  });

  // =====================================================
  // USER MARKETPLACE STATS
  // =====================================================
  await knex.schema.createTable('user_marketplace_stats', (table) => {
    table.text('user_id').primary().references('id').inTable('users').onDelete('CASCADE');

    // Selling
    table.integer('total_sales').defaultTo(0);
    table.integer('total_revenue').defaultTo(0);
    table.decimal('avg_sale_price', 10, 2);

    // Buying
    table.integer('total_purchases').defaultTo(0);
    table.integer('total_spent').defaultTo(0);
    table.decimal('avg_purchase_price', 10, 2);

    // Trading
    table.integer('total_trades').defaultTo(0);
    table.integer('trade_value_exchanged').defaultTo(0);

    // Reputation
    table.decimal('seller_rating', 3, 2);
    table.decimal('buyer_rating', 3, 2);
    table.integer('total_ratings').defaultTo(0);

    // Activity
    table.integer('active_listings').defaultTo(0);
    table.integer('watchlist_count').defaultTo(0);

    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  // =====================================================
  // SELLER RATINGS
  // =====================================================
  await knex.schema.createTable('seller_ratings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('transaction_id').references('id').inTable('marketplace_transactions');

    table.text('rater_id').references('id').inTable('users');
    table.text('seller_id').references('id').inTable('users');

    table.integer('rating');
    table.check('rating BETWEEN 1 AND 5');
    table.text('comment');

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    table.unique(['transaction_id', 'rater_id']);
  });

  // =====================================================
  // BATTLE PASS SEASONS
  // =====================================================
  await knex.schema.createTable('battle_pass_seasons', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable();
    table.text('description');
    table.integer('season_number').notNullable().unique();

    table.integer('max_level').defaultTo(100);
    table.integer('xp_per_level').defaultTo(1000);

    // Rewards
    table.jsonb('free_track_rewards').notNullable();
    table.jsonb('premium_track_rewards').notNullable();

    table.integer('premium_price').defaultTo(500);

    // Timing
    table.timestamp('starts_at', { useTz: true }).notNullable();
    table.timestamp('ends_at', { useTz: true }).notNullable();

    table.boolean('is_active').defaultTo(false);

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  // =====================================================
  // USER BATTLE PASS PROGRESS
  // =====================================================
  await knex.schema.createTable('user_battle_pass', (table) => {
    table.text('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.uuid('season_id').references('id').inTable('battle_pass_seasons').onDelete('CASCADE').notNullable();

    table.integer('current_level').defaultTo(1);
    table.integer('current_xp').defaultTo(0);
    table.integer('total_xp').defaultTo(0);

    table.boolean('has_premium').defaultTo(false);
    table.timestamp('premium_purchased_at', { useTz: true });

    table.jsonb('claimed_free_rewards').defaultTo('[]');
    table.jsonb('claimed_premium_rewards').defaultTo('[]');

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());

    table.primary(['user_id', 'season_id']);
  });

  // =====================================================
  // DAILY TASKS
  // =====================================================
  await knex.schema.createTable('daily_tasks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('task_key', 50).notNullable().unique();
    table.string('name', 100).notNullable();
    table.text('description');

    table.string('task_type', 20).notNullable();
    table.jsonb('requirements').notNullable();

    // Rewards
    table.integer('credit_reward').defaultTo(0);
    table.integer('xp_reward').defaultTo(0);

    table.boolean('is_active').defaultTo(true);

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  // =====================================================
  // USER DAILY TASK PROGRESS
  // =====================================================
  await knex.schema.createTable('user_daily_tasks', (table) => {
    table.text('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.date('date').notNullable();
    table.uuid('task_id').references('id').inTable('daily_tasks').notNullable();

    table.boolean('completed').defaultTo(false);
    table.integer('progress').defaultTo(0);
    table.integer('target').notNullable();

    table.boolean('reward_claimed').defaultTo(false);
    table.timestamp('completed_at', { useTz: true });

    table.primary(['user_id', 'date', 'task_id']);
  });

  // =====================================================
  // WEEKLY CHALLENGES
  // =====================================================
  await knex.schema.createTable('weekly_challenges', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('challenge_key', 50).notNullable();
    table.string('name', 100).notNullable();
    table.text('description');

    table.string('challenge_type', 20).notNullable();
    table.jsonb('requirements').notNullable();

    // Rewards
    table.integer('credit_reward').defaultTo(0);
    table.integer('xp_reward').defaultTo(0);
    table.uuid('cosmetic_reward_id').references('id').inTable('spirit_animal_cosmetics');

    // Timing (week number and year)
    table.integer('week_number').notNullable();
    table.integer('year').notNullable();

    table.boolean('is_active').defaultTo(true);

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  // =====================================================
  // USER WEEKLY CHALLENGE PROGRESS
  // =====================================================
  await knex.schema.createTable('user_weekly_challenges', (table) => {
    table.text('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.uuid('challenge_id').references('id').inTable('weekly_challenges').notNullable();

    table.boolean('completed').defaultTo(false);
    table.integer('progress').defaultTo(0);
    table.integer('target').notNullable();

    table.boolean('reward_claimed').defaultTo(false);
    table.timestamp('completed_at', { useTz: true });

    table.primary(['user_id', 'challenge_id']);
  });

  // =====================================================
  // SEED INITIAL DATA
  // =====================================================

  // Insert default daily tasks
  await knex('daily_tasks').insert([
    {
      task_key: 'complete_workout',
      name: 'Complete a Workout',
      description: 'Complete at least one workout today',
      task_type: 'workout',
      requirements: JSON.stringify({ workouts: 1 }),
      credit_reward: 10,
      xp_reward: 50,
    },
    {
      task_key: 'log_nutrition',
      name: 'Log Nutrition',
      description: 'Log your meals for today',
      task_type: 'nutrition',
      requirements: JSON.stringify({ meals: 1 }),
      credit_reward: 5,
      xp_reward: 25,
    },
    {
      task_key: 'hit_step_goal',
      name: 'Hit Step Goal',
      description: 'Reach 10,000 steps today',
      task_type: 'steps',
      requirements: JSON.stringify({ steps: 10000 }),
      credit_reward: 5,
      xp_reward: 25,
    },
    {
      task_key: 'log_sleep',
      name: 'Log Sleep',
      description: 'Log your sleep from last night',
      task_type: 'sleep',
      requirements: JSON.stringify({ logged: true }),
      credit_reward: 5,
      xp_reward: 25,
    },
    {
      task_key: 'social_interaction',
      name: 'Social Interaction',
      description: 'Give a high five or comment on someone\'s workout',
      task_type: 'social',
      requirements: JSON.stringify({ interactions: 1 }),
      credit_reward: 5,
      xp_reward: 25,
    },
  ]);

  // Insert default mystery boxes
  await knex('mystery_boxes').insert([
    {
      name: 'Standard Box',
      description: 'A basic mystery box with common to rare items',
      box_type: 'standard',
      price: 100,
      drop_rates: JSON.stringify({
        common: 55,
        uncommon: 30,
        rare: 12,
        epic: 2.5,
        legendary: 0.45,
        mythic: 0.05,
      }),
      item_pool: [],
      max_purchases_per_day: 10,
    },
    {
      name: 'Premium Box',
      description: 'Better odds with no common drops',
      box_type: 'premium',
      price: 500,
      drop_rates: JSON.stringify({
        uncommon: 40,
        rare: 40,
        epic: 15,
        legendary: 4,
        mythic: 0.9,
        divine: 0.1,
      }),
      item_pool: [],
      max_purchases_per_day: 5,
    },
    {
      name: 'Legendary Box',
      description: 'High-tier box with guaranteed rare or better',
      box_type: 'legendary',
      price: 2000,
      drop_rates: JSON.stringify({
        rare: 30,
        epic: 50,
        legendary: 16,
        mythic: 3.5,
        divine: 0.5,
      }),
      item_pool: [],
      max_purchases_per_day: 2,
    },
  ]);

  // Insert initial collection sets
  await knex('collection_sets').insert([
    {
      name: 'Starter Collection',
      description: 'Basic cosmetics every user should collect',
      theme: 'basics',
      items: [],
      rewards: JSON.stringify([
        { threshold: 25, reward: { type: 'credits', value: 100 } },
        { threshold: 50, reward: { type: 'credits', value: 250 } },
        { threshold: 75, reward: { type: 'credits', value: 500 } },
        { threshold: 100, reward: { type: 'title', value: 'Collector' } },
      ]),
      is_limited: false,
    },
    {
      name: 'Fitness Fanatic',
      description: 'Workout-themed cosmetics for dedicated athletes',
      theme: 'fitness',
      items: [],
      rewards: JSON.stringify([
        { threshold: 25, reward: { type: 'credits', value: 200 } },
        { threshold: 50, reward: { type: 'credits', value: 500 } },
        { threshold: 75, reward: { type: 'xp', value: 5000 } },
        { threshold: 100, reward: { type: 'title', value: 'Fitness Fanatic' } },
      ]),
      is_limited: false,
    },
    {
      name: 'Rainbow Collection',
      description: 'Collect one item of each rarity tier',
      theme: 'rarity',
      items: [],
      rewards: JSON.stringify([
        { threshold: 100, reward: { type: 'badge', value: 'rainbow_collector' } },
      ]),
      is_limited: false,
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order of creation (due to foreign keys)
  await knex.schema.dropTableIfExists('user_weekly_challenges');
  await knex.schema.dropTableIfExists('weekly_challenges');
  await knex.schema.dropTableIfExists('user_daily_tasks');
  await knex.schema.dropTableIfExists('daily_tasks');
  await knex.schema.dropTableIfExists('user_battle_pass');
  await knex.schema.dropTableIfExists('battle_pass_seasons');
  await knex.schema.dropTableIfExists('seller_ratings');
  await knex.schema.dropTableIfExists('user_marketplace_stats');
  await knex.schema.dropTableIfExists('price_history');
  await knex.schema.dropTableIfExists('item_supply');
  await knex.schema.dropTableIfExists('crew_treasury_transactions');
  await knex.schema.dropTableIfExists('crew_economy');
  await knex.schema.dropTableIfExists('user_health_tier');
  await knex.schema.dropTableIfExists('daily_health_metrics');
  await knex.schema.dropTableIfExists('user_pity_counters');
  await knex.schema.dropTableIfExists('mystery_box_openings');
  await knex.schema.dropTableIfExists('mystery_boxes');
  await knex.schema.dropTableIfExists('user_collection_progress');
  await knex.schema.dropTableIfExists('collection_sets');
  await knex.schema.dropTableIfExists('cosmetic_gifts');
  await knex.schema.dropTableIfExists('trade_history');
  await knex.schema.dropTableIfExists('trade_requests');
  await knex.schema.dropTableIfExists('marketplace_transactions');
  await knex.schema.dropTableIfExists('marketplace_watchlist');
  await knex.schema.dropTableIfExists('marketplace_offers');
  await knex.schema.dropTableIfExists('auction_bids');
  await knex.schema.dropTableIfExists('marketplace_listings');
}
