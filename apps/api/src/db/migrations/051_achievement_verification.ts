// DESTRUCTIVE: Schema modification for achievement verification - contains DROP/TRUNCATE operations
// SQL-SAFE: Template literals contain static SQL only, no external input
/**
 * Migration: Achievement Verification System
 *
 * Adds video verification for elite achievements:
 * - Tier system for achievements (bronze, silver, gold, platinum, diamond)
 * - Video proof submissions
 * - Witness attestations from other users
 * - Verification status tracking
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 051_achievement_verification');

  // ============================================
  // ADD TIER AND VERIFICATION COLUMNS TO ACHIEVEMENT_DEFINITIONS
  // ============================================
  if (await tableExists('achievement_definitions')) {
    if (!(await columnExists('achievement_definitions', 'tier'))) {
      log.info('Adding tier column to achievement_definitions...');
      await db.query(`
        ALTER TABLE achievement_definitions
        ADD COLUMN tier TEXT DEFAULT 'bronze'
        CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond'))
      `);
    }

    if (!(await columnExists('achievement_definitions', 'requires_verification'))) {
      log.info('Adding requires_verification column to achievement_definitions...');
      await db.query(`
        ALTER TABLE achievement_definitions
        ADD COLUMN requires_verification BOOLEAN DEFAULT FALSE
      `);
    }

    // Update existing achievements with appropriate tiers based on rarity
    log.info('Updating existing achievements with tiers...');
    await db.query(`
      UPDATE achievement_definitions SET tier = CASE
        WHEN rarity = 'common' THEN 'bronze'
        WHEN rarity = 'uncommon' THEN 'silver'
        WHEN rarity = 'rare' THEN 'gold'
        WHEN rarity = 'epic' THEN 'platinum'
        WHEN rarity = 'legendary' THEN 'diamond'
        ELSE 'bronze'
      END
      WHERE tier IS NULL OR tier = 'bronze'
    `);
  }

  // ============================================
  // ACHIEVEMENT VERIFICATIONS TABLE
  // ============================================
  if (!(await tableExists('achievement_verifications'))) {
    log.info('Creating achievement_verifications table...');
    await db.query(`
      CREATE TABLE achievement_verifications (
        id TEXT PRIMARY KEY DEFAULT 'av_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        achievement_id TEXT NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,

        -- Video proof
        video_asset_id TEXT REFERENCES video_assets(id) ON DELETE SET NULL,
        video_url TEXT,
        thumbnail_url TEXT,
        video_duration_seconds INTEGER,

        -- Status tracking
        status TEXT DEFAULT 'pending_witness' CHECK (status IN (
          'pending_witness',
          'verified',
          'rejected',
          'expired'
        )),

        -- Metadata
        notes TEXT,
        rejection_reason TEXT,
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        verified_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes
    await db.query('CREATE INDEX idx_verifications_user ON achievement_verifications(user_id, status)');
    await db.query('CREATE INDEX idx_verifications_achievement ON achievement_verifications(achievement_id)');
    await db.query(`
      CREATE INDEX idx_verifications_pending ON achievement_verifications(status, expires_at)
      WHERE status = 'pending_witness'
    `);
    await db.query('CREATE INDEX idx_verifications_submitted ON achievement_verifications(submitted_at DESC)');

    // Trigger for updated_at
    await db.query(`
      CREATE OR REPLACE FUNCTION update_verification_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await db.query(`
      CREATE TRIGGER trg_verification_updated
      BEFORE UPDATE ON achievement_verifications
      FOR EACH ROW EXECUTE FUNCTION update_verification_timestamp()
    `);
  }

  // ============================================
  // ACHIEVEMENT WITNESSES TABLE
  // ============================================
  if (!(await tableExists('achievement_witnesses'))) {
    log.info('Creating achievement_witnesses table...');
    await db.query(`
      CREATE TABLE achievement_witnesses (
        id TEXT PRIMARY KEY DEFAULT 'aw_' || replace(gen_random_uuid()::text, '-', ''),
        verification_id TEXT NOT NULL REFERENCES achievement_verifications(id) ON DELETE CASCADE,
        witness_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Attestation details
        attestation_text TEXT,
        relationship TEXT,
        location_description TEXT,

        -- Status
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),

        -- Public visibility
        is_public BOOLEAN DEFAULT TRUE,

        requested_at TIMESTAMPTZ DEFAULT NOW(),
        responded_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),

        -- One witness request per verification
        UNIQUE(verification_id)
      )
    `);

    // Indexes
    await db.query('CREATE INDEX idx_witnesses_user ON achievement_witnesses(witness_user_id, status)');
    await db.query('CREATE INDEX idx_witnesses_verification ON achievement_witnesses(verification_id)');
    await db.query(`
      CREATE INDEX idx_witnesses_pending ON achievement_witnesses(witness_user_id, status)
      WHERE status = 'pending'
    `);
  }

  // ============================================
  // SEED ELITE ACHIEVEMENTS
  // ============================================
  if (await tableExists('achievement_definitions')) {
    log.info('Seeding elite achievements that require verification...');

    const eliteAchievements = [
      // Calisthenics mastery - Platinum tier
      {
        key: 'one_arm_handstand',
        name: 'One-Arm Handstand',
        description: 'Hold a stable one-arm handstand for 3+ seconds',
        icon: 'hand-raised',
        category: 'special',
        tier: 'platinum',
        requires_verification: true,
        rarity: 'legendary',
        points: 2000,
      },
      {
        key: 'full_planche',
        name: 'Full Planche',
        description: 'Hold a full planche with straight body for 3+ seconds',
        icon: 'arrow-trending-up',
        category: 'special',
        tier: 'platinum',
        requires_verification: true,
        rarity: 'legendary',
        points: 2500,
      },
      {
        key: 'iron_cross',
        name: 'Iron Cross',
        description: 'Hold an iron cross on rings for 3+ seconds',
        icon: 'plus',
        category: 'special',
        tier: 'platinum',
        requires_verification: true,
        rarity: 'legendary',
        points: 2000,
      },

      // Gold tier
      {
        key: 'freestanding_hspu',
        name: 'Freestanding Handstand Push-up',
        description: 'Complete a full handstand push-up without wall support',
        icon: 'arrow-up',
        category: 'special',
        tier: 'gold',
        requires_verification: true,
        rarity: 'epic',
        points: 1000,
      },
      {
        key: 'full_front_lever',
        name: 'Full Front Lever',
        description: 'Hold a full front lever with straight body for 3+ seconds',
        icon: 'minus',
        category: 'special',
        tier: 'gold',
        requires_verification: true,
        rarity: 'epic',
        points: 800,
      },
      {
        key: 'full_back_lever',
        name: 'Full Back Lever',
        description: 'Hold a full back lever with straight body for 3+ seconds',
        icon: 'minus',
        category: 'special',
        tier: 'gold',
        requires_verification: true,
        rarity: 'rare',
        points: 600,
      },
      {
        key: 'human_flag',
        name: 'Human Flag',
        description: 'Hold a human flag with straight body for 3+ seconds',
        icon: 'flag',
        category: 'special',
        tier: 'gold',
        requires_verification: true,
        rarity: 'epic',
        points: 1000,
      },

      // Flexibility - Gold tier
      {
        key: 'full_front_split',
        name: 'Full Front Split',
        description: 'Achieve a full front split with hips square',
        icon: 'arrows-pointing-out',
        category: 'special',
        tier: 'gold',
        requires_verification: true,
        rarity: 'rare',
        points: 500,
      },
      {
        key: 'full_middle_split',
        name: 'Full Middle Split',
        description: 'Achieve a full middle split (180 degrees)',
        icon: 'arrows-pointing-out',
        category: 'special',
        tier: 'gold',
        requires_verification: true,
        rarity: 'epic',
        points: 700,
      },
      {
        key: 'full_pancake',
        name: 'Full Pancake',
        description: 'Achieve a full pancake stretch with chest to floor',
        icon: 'arrows-pointing-out',
        category: 'special',
        tier: 'gold',
        requires_verification: true,
        rarity: 'rare',
        points: 500,
      },

      // Strength milestones - Gold tier
      {
        key: 'bodyweight_ohp',
        name: 'Bodyweight Overhead Press',
        description: 'Strict press your bodyweight overhead',
        icon: 'arrow-up-circle',
        category: 'record',
        tier: 'gold',
        requires_verification: true,
        rarity: 'rare',
        points: 600,
      },
      {
        key: 'double_bodyweight_deadlift',
        name: '2x Bodyweight Deadlift',
        description: 'Deadlift double your bodyweight',
        icon: 'arrow-up-circle',
        category: 'record',
        tier: 'gold',
        requires_verification: true,
        rarity: 'rare',
        points: 700,
      },
      {
        key: 'double_bodyweight_squat',
        name: '2x Bodyweight Squat',
        description: 'Squat double your bodyweight',
        icon: 'arrow-up-circle',
        category: 'record',
        tier: 'gold',
        requires_verification: true,
        rarity: 'rare',
        points: 700,
      },

      // Silver tier (optional verification)
      {
        key: 'muscle_up_strict',
        name: 'Strict Muscle-Up',
        description: 'Complete a strict muscle-up without kipping',
        icon: 'arrow-up',
        category: 'first_time',
        tier: 'silver',
        requires_verification: false,
        rarity: 'uncommon',
        points: 300,
      },
      {
        key: 'pistol_squat',
        name: 'Pistol Squat',
        description: 'Complete a full pistol squat on each leg',
        icon: 'user',
        category: 'first_time',
        tier: 'silver',
        requires_verification: false,
        rarity: 'uncommon',
        points: 200,
      },
      {
        key: 'l_sit_30s',
        name: '30-Second L-Sit',
        description: 'Hold an L-sit for 30 seconds',
        icon: 'pause',
        category: 'first_time',
        tier: 'silver',
        requires_verification: false,
        rarity: 'uncommon',
        points: 150,
      },
    ];

    for (const achievement of eliteAchievements) {
      await db.query(
        `INSERT INTO achievement_definitions (key, name, description, icon, category, tier, requires_verification, rarity, points, enabled)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
         ON CONFLICT (key) DO UPDATE SET
           tier = EXCLUDED.tier,
           requires_verification = EXCLUDED.requires_verification`,
        [
          achievement.key,
          achievement.name,
          achievement.description,
          achievement.icon,
          achievement.category,
          achievement.tier,
          achievement.requires_verification,
          achievement.rarity,
          achievement.points,
        ]
      );
    }

    log.info(`Seeded ${eliteAchievements.length} elite achievements`);
  }

  // ============================================
  // ADD VERIFICATION FIELDS TO ACHIEVEMENT_EVENTS
  // ============================================
  if (await tableExists('achievement_events')) {
    if (!(await columnExists('achievement_events', 'verification_id'))) {
      log.info('Adding verification_id to achievement_events...');
      await db.query(`
        ALTER TABLE achievement_events
        ADD COLUMN verification_id TEXT REFERENCES achievement_verifications(id) ON DELETE SET NULL
      `);
    }

    if (!(await columnExists('achievement_events', 'is_verified'))) {
      log.info('Adding is_verified to achievement_events...');
      await db.query(`
        ALTER TABLE achievement_events
        ADD COLUMN is_verified BOOLEAN DEFAULT FALSE
      `);
    }

    if (!(await columnExists('achievement_events', 'witness_username'))) {
      log.info('Adding witness_username to achievement_events...');
      await db.query(`
        ALTER TABLE achievement_events
        ADD COLUMN witness_username TEXT
      `);
    }
  }

  log.info('Migration 051_achievement_verification completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 051_achievement_verification');

  // Remove verification columns from achievement_events
  if (await columnExists('achievement_events', 'witness_username')) {
    await db.query('ALTER TABLE achievement_events DROP COLUMN witness_username');
  }
  if (await columnExists('achievement_events', 'is_verified')) {
    await db.query('ALTER TABLE achievement_events DROP COLUMN is_verified');
  }
  if (await columnExists('achievement_events', 'verification_id')) {
    await db.query('ALTER TABLE achievement_events DROP COLUMN verification_id');
  }

  // Drop tables
  await db.query('DROP TABLE IF EXISTS achievement_witnesses CASCADE');
  await db.query('DROP TABLE IF EXISTS achievement_verifications CASCADE');

  // Remove columns from achievement_definitions
  if (await columnExists('achievement_definitions', 'requires_verification')) {
    await db.query('ALTER TABLE achievement_definitions DROP COLUMN requires_verification');
  }
  if (await columnExists('achievement_definitions', 'tier')) {
    await db.query('ALTER TABLE achievement_definitions DROP COLUMN tier');
  }

  // Drop trigger and function
  await db.query('DROP TRIGGER IF EXISTS trg_verification_updated ON achievement_verifications');
  await db.query('DROP FUNCTION IF EXISTS update_verification_timestamp()');

  log.info('Rollback 051_achievement_verification completed');
}
