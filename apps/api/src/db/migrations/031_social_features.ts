/**
 * Migration: Social Features & Community Enhancements
 *
 * This migration adds:
 *
 * 1. Social Graph - Friends, follows, and connections
 * 2. Buddy Matching - Find workout partners with similar goals
 * 3. Mentorship System - Mentor/mentee pairing
 * 4. Community Analytics - Growth and engagement tracking
 * 5. Auto-join by Archetype - Link archetypes to default communities
 * 6. Community Resources - Knowledge base, artifacts, wiki pages
 * 7. Content Reporting/Flagging - Moderation workflow
 * 8. Inter-Community Challenges - Federated events
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
  log.info('Running migration: 031_social_features');

  // ============================================
  // FEATURE FLAGS
  // ============================================
  log.info('Adding feature flags for social features...');
  await db.query(`
    INSERT INTO feature_flags (id, name, description, enabled, rollout_percentage)
    VALUES
      ('social_graph', 'Social Graph', 'Friends, follows, and connections between users', true, 100),
      ('buddy_matching', 'Buddy Matching', 'Find workout partners with similar goals', true, 100),
      ('mentorship', 'Mentorship System', 'Mentor/mentee pairing for guidance', true, 100),
      ('community_analytics', 'Community Analytics', 'Growth and engagement metrics for communities', true, 100),
      ('community_resources', 'Community Resources', 'Knowledge base and artifacts per community', true, 100),
      ('content_reporting', 'Content Reporting', 'Report and flag inappropriate content', true, 100),
      ('inter_community_challenges', 'Inter-Community Challenges', 'Federated challenges between communities', true, 100)
    ON CONFLICT (id) DO NOTHING
  `);

  // ============================================
  // SOCIAL GRAPH: FOLLOWS
  // ============================================
  if (!(await tableExists('user_follows'))) {
    log.info('Creating user_follows table...');
    await db.query(`
      CREATE TABLE user_follows (
        id TEXT PRIMARY KEY DEFAULT 'uf_' || replace(gen_random_uuid()::text, '-', ''),
        follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT no_self_follow CHECK (follower_id != following_id),
        CONSTRAINT unique_follow UNIQUE (follower_id, following_id)
      )
    `);
    await db.query('CREATE INDEX idx_follows_follower ON user_follows(follower_id)');
    await db.query('CREATE INDEX idx_follows_following ON user_follows(following_id)');
  }

  // ============================================
  // SOCIAL GRAPH: FRIENDSHIPS (mutual follows or explicit)
  // ============================================
  if (!(await tableExists('friendships'))) {
    log.info('Creating friendships table...');
    await db.query(`
      CREATE TABLE friendships (
        id TEXT PRIMARY KEY DEFAULT 'fr_' || replace(gen_random_uuid()::text, '-', ''),
        user_a_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_b_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
        initiated_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Context
        met_at_hangout_id BIGINT REFERENCES hangouts(id) ON DELETE SET NULL,
        met_at_community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        accepted_at TIMESTAMPTZ,

        CONSTRAINT no_self_friend CHECK (user_a_id != user_b_id),
        -- Ensure user_a_id < user_b_id to prevent duplicate pairs
        CONSTRAINT ordered_pair CHECK (user_a_id < user_b_id)
      )
    `);
    await db.query('CREATE UNIQUE INDEX idx_friendships_pair ON friendships(user_a_id, user_b_id)');
    await db.query('CREATE INDEX idx_friendships_user_a ON friendships(user_a_id, status)');
    await db.query('CREATE INDEX idx_friendships_user_b ON friendships(user_b_id, status)');
  }

  // ============================================
  // BUDDY MATCHING: REQUESTS & PREFERENCES
  // ============================================
  if (!(await tableExists('buddy_preferences'))) {
    log.info('Creating buddy_preferences table...');
    await db.query(`
      CREATE TABLE buddy_preferences (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

        -- What they're looking for
        seeking_buddy BOOLEAN DEFAULT false,
        preferred_goals TEXT[] DEFAULT '{}',
        preferred_archetypes TEXT[] DEFAULT '{}',
        preferred_experience_levels TEXT[] DEFAULT '{}',
        preferred_schedule TEXT[] DEFAULT '{}', -- morning, afternoon, evening, flexible
        preferred_workout_types TEXT[] DEFAULT '{}',

        -- Location preferences
        max_distance_km INTEGER DEFAULT 50,
        prefer_same_hangout BOOLEAN DEFAULT true,
        prefer_same_community BOOLEAN DEFAULT true,

        -- Demographics (optional matching)
        match_gender BOOLEAN DEFAULT false,
        match_age_range BOOLEAN DEFAULT false,
        min_age INTEGER,
        max_age INTEGER,

        -- Bio for matching
        buddy_bio TEXT,

        -- Visibility
        visible_in_buddy_search BOOLEAN DEFAULT true,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }

  if (!(await tableExists('buddy_requests'))) {
    log.info('Creating buddy_requests table...');
    await db.query(`
      CREATE TABLE buddy_requests (
        id TEXT PRIMARY KEY DEFAULT 'br_' || replace(gen_random_uuid()::text, '-', ''),
        sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),

        message TEXT,
        match_score NUMERIC(5, 2), -- Algorithm-computed compatibility score

        created_at TIMESTAMPTZ DEFAULT NOW(),
        responded_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',

        CONSTRAINT no_self_buddy CHECK (sender_id != receiver_id)
      )
    `);
    await db.query('CREATE INDEX idx_buddy_requests_sender ON buddy_requests(sender_id, status)');
    await db.query('CREATE INDEX idx_buddy_requests_receiver ON buddy_requests(receiver_id, status)');
    await db.query('CREATE UNIQUE INDEX idx_buddy_requests_active ON buddy_requests(sender_id, receiver_id) WHERE status = \'pending\'');
  }

  if (!(await tableExists('buddy_pairs'))) {
    log.info('Creating buddy_pairs table...');
    await db.query(`
      CREATE TABLE buddy_pairs (
        id TEXT PRIMARY KEY DEFAULT 'bp_' || replace(gen_random_uuid()::text, '-', ''),
        user_a_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_b_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Stats
        workouts_together INTEGER DEFAULT 0,
        last_workout_together TIMESTAMPTZ,
        streak_days INTEGER DEFAULT 0,

        -- Status
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),

        created_at TIMESTAMPTZ DEFAULT NOW(),
        ended_at TIMESTAMPTZ,

        CONSTRAINT ordered_buddy_pair CHECK (user_a_id < user_b_id)
      )
    `);
    await db.query('CREATE UNIQUE INDEX idx_buddy_pairs_unique ON buddy_pairs(user_a_id, user_b_id)');
  }

  // ============================================
  // MENTORSHIP SYSTEM
  // ============================================
  if (!(await tableExists('mentor_profiles'))) {
    log.info('Creating mentor_profiles table...');
    await db.query(`
      CREATE TABLE mentor_profiles (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

        -- Mentor status
        is_mentor BOOLEAN DEFAULT false,
        verified_mentor BOOLEAN DEFAULT false,
        mentor_since TIMESTAMPTZ,

        -- What they can help with
        expertise_areas TEXT[] DEFAULT '{}',
        specializations TEXT[] DEFAULT '{}',
        certifications TEXT[] DEFAULT '{}',

        -- Availability
        accepting_mentees BOOLEAN DEFAULT true,
        max_mentees INTEGER DEFAULT 3,
        current_mentee_count INTEGER DEFAULT 0,

        -- Bio
        mentor_bio TEXT,
        years_experience INTEGER,

        -- Stats
        total_mentees_helped INTEGER DEFAULT 0,
        average_rating NUMERIC(3, 2),
        total_ratings INTEGER DEFAULT 0,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.query('CREATE INDEX idx_mentor_profiles_active ON mentor_profiles(is_mentor, accepting_mentees) WHERE is_mentor = true');
  }

  if (!(await tableExists('mentorships'))) {
    log.info('Creating mentorships table...');
    await db.query(`
      CREATE TABLE mentorships (
        id TEXT PRIMARY KEY DEFAULT 'ms_' || replace(gen_random_uuid()::text, '-', ''),
        mentor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mentee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Focus area
        focus_area TEXT,
        goals TEXT[] DEFAULT '{}',

        -- Status
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),

        -- Duration
        started_at TIMESTAMPTZ,
        target_end_date TIMESTAMPTZ,
        ended_at TIMESTAMPTZ,

        -- Progress tracking
        milestones_completed INTEGER DEFAULT 0,
        check_ins_count INTEGER DEFAULT 0,
        last_check_in TIMESTAMPTZ,

        -- Review (after completion)
        mentee_rating INTEGER CHECK (mentee_rating >= 1 AND mentee_rating <= 5),
        mentee_review TEXT,
        mentor_notes TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT no_self_mentor CHECK (mentor_id != mentee_id)
      )
    `);
    await db.query('CREATE INDEX idx_mentorships_mentor ON mentorships(mentor_id, status)');
    await db.query('CREATE INDEX idx_mentorships_mentee ON mentorships(mentee_id, status)');
  }

  if (!(await tableExists('mentorship_check_ins'))) {
    log.info('Creating mentorship_check_ins table...');
    await db.query(`
      CREATE TABLE mentorship_check_ins (
        id TEXT PRIMARY KEY DEFAULT 'mci_' || replace(gen_random_uuid()::text, '-', ''),
        mentorship_id TEXT NOT NULL REFERENCES mentorships(id) ON DELETE CASCADE,

        -- Check-in details
        notes TEXT,
        progress_update TEXT,
        goals_reviewed TEXT[] DEFAULT '{}',
        next_steps TEXT[] DEFAULT '{}',

        -- Mood/sentiment
        mentee_mood TEXT CHECK (mentee_mood IN ('great', 'good', 'okay', 'struggling', 'frustrated')),

        created_at TIMESTAMPTZ DEFAULT NOW(),
        created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await db.query('CREATE INDEX idx_mentorship_checkins ON mentorship_check_ins(mentorship_id, created_at DESC)');
  }

  // ============================================
  // COMMUNITY ANALYTICS
  // ============================================
  if (!(await tableExists('community_analytics_daily'))) {
    log.info('Creating community_analytics_daily table...');
    await db.query(`
      CREATE TABLE community_analytics_daily (
        id TEXT PRIMARY KEY DEFAULT 'cad_' || replace(gen_random_uuid()::text, '-', ''),
        community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
        virtual_hangout_id BIGINT REFERENCES virtual_hangouts(id) ON DELETE CASCADE,

        date DATE NOT NULL,

        -- Membership
        total_members INTEGER DEFAULT 0,
        new_members INTEGER DEFAULT 0,
        churned_members INTEGER DEFAULT 0,
        active_members INTEGER DEFAULT 0, -- Posted, commented, or voted

        -- Engagement
        total_posts INTEGER DEFAULT 0,
        total_comments INTEGER DEFAULT 0,
        total_votes INTEGER DEFAULT 0,
        total_workouts_shared INTEGER DEFAULT 0,

        -- Content
        average_post_score NUMERIC(8, 2),
        top_post_id TEXT,

        -- Events
        events_held INTEGER DEFAULT 0,
        event_attendees INTEGER DEFAULT 0,

        created_at TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT one_community_type CHECK (
          (community_id IS NOT NULL AND virtual_hangout_id IS NULL) OR
          (community_id IS NULL AND virtual_hangout_id IS NOT NULL)
        )
      )
    `);
    await db.query('CREATE UNIQUE INDEX idx_community_analytics_daily_community ON community_analytics_daily(community_id, date) WHERE community_id IS NOT NULL');
    await db.query('CREATE UNIQUE INDEX idx_community_analytics_daily_hangout ON community_analytics_daily(virtual_hangout_id, date) WHERE virtual_hangout_id IS NOT NULL');
  }

  if (!(await tableExists('community_health_scores'))) {
    log.info('Creating community_health_scores table...');
    await db.query(`
      CREATE TABLE community_health_scores (
        id TEXT PRIMARY KEY DEFAULT 'chs_' || replace(gen_random_uuid()::text, '-', ''),
        community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
        virtual_hangout_id BIGINT REFERENCES virtual_hangouts(id) ON DELETE CASCADE,

        calculated_at TIMESTAMPTZ DEFAULT NOW(),

        -- Overall score (0-100)
        health_score INTEGER DEFAULT 50,

        -- Component scores (0-100)
        growth_score INTEGER DEFAULT 50,
        engagement_score INTEGER DEFAULT 50,
        retention_score INTEGER DEFAULT 50,
        activity_score INTEGER DEFAULT 50,
        quality_score INTEGER DEFAULT 50, -- Based on post ratings

        -- Trends
        growth_trend TEXT CHECK (growth_trend IN ('rising', 'stable', 'declining')),
        engagement_trend TEXT CHECK (engagement_trend IN ('rising', 'stable', 'declining')),

        -- Insights (JSON)
        insights JSONB DEFAULT '[]',

        CONSTRAINT one_community_type_health CHECK (
          (community_id IS NOT NULL AND virtual_hangout_id IS NULL) OR
          (community_id IS NULL AND virtual_hangout_id IS NOT NULL)
        )
      )
    `);
    await db.query('CREATE INDEX idx_community_health_scores_community ON community_health_scores(community_id, calculated_at DESC) WHERE community_id IS NOT NULL');
    await db.query('CREATE INDEX idx_community_health_scores_hangout ON community_health_scores(virtual_hangout_id, calculated_at DESC) WHERE virtual_hangout_id IS NOT NULL');
  }

  // ============================================
  // AUTO-JOIN BY ARCHETYPE
  // ============================================
  if (!(await tableExists('archetype_community_links'))) {
    log.info('Creating archetype_community_links table...');
    await db.query(`
      CREATE TABLE archetype_community_links (
        id TEXT PRIMARY KEY DEFAULT 'acl_' || replace(gen_random_uuid()::text, '-', ''),
        archetype_id TEXT NOT NULL REFERENCES archetypes(id) ON DELETE CASCADE,

        -- Link to either a community or virtual hangout
        community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
        virtual_hangout_id BIGINT REFERENCES virtual_hangouts(id) ON DELETE CASCADE,

        -- Auto-join behavior
        auto_join BOOLEAN DEFAULT true,
        recommended BOOLEAN DEFAULT true,
        priority INTEGER DEFAULT 0, -- Higher = more prominent recommendation

        created_at TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT one_target_type CHECK (
          (community_id IS NOT NULL AND virtual_hangout_id IS NULL) OR
          (community_id IS NULL AND virtual_hangout_id IS NOT NULL)
        )
      )
    `);
    await db.query('CREATE INDEX idx_archetype_community_links_archetype ON archetype_community_links(archetype_id)');
  }

  // ============================================
  // COMMUNITY RESOURCES / KNOWLEDGE BASE
  // ============================================
  if (!(await tableExists('community_resources'))) {
    log.info('Creating community_resources table...');
    await db.query(`
      CREATE TABLE community_resources (
        id TEXT PRIMARY KEY DEFAULT 'cr_' || replace(gen_random_uuid()::text, '-', ''),

        -- Owner
        community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
        virtual_hangout_id BIGINT REFERENCES virtual_hangouts(id) ON DELETE CASCADE,

        -- Resource details
        title TEXT NOT NULL,
        description TEXT,
        resource_type TEXT NOT NULL CHECK (resource_type IN (
          'article', 'guide', 'video', 'link', 'document', 'template', 'checklist', 'faq'
        )),

        -- Content
        content TEXT, -- For articles/guides (markdown)
        url TEXT, -- For external links
        media_url TEXT, -- For videos/documents

        -- Organization
        category TEXT,
        tags TEXT[] DEFAULT '{}',

        -- Access
        visibility TEXT DEFAULT 'members' CHECK (visibility IN ('public', 'members', 'moderators')),
        pinned BOOLEAN DEFAULT false,

        -- Stats
        view_count INTEGER DEFAULT 0,
        helpful_count INTEGER DEFAULT 0,

        -- Authorship
        created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        last_edited_by TEXT REFERENCES users(id) ON DELETE SET NULL,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT one_owner_type CHECK (
          (community_id IS NOT NULL AND virtual_hangout_id IS NULL) OR
          (community_id IS NULL AND virtual_hangout_id IS NOT NULL)
        )
      )
    `);
    await db.query('CREATE INDEX idx_community_resources_community ON community_resources(community_id, resource_type) WHERE community_id IS NOT NULL');
    await db.query('CREATE INDEX idx_community_resources_hangout ON community_resources(virtual_hangout_id, resource_type) WHERE virtual_hangout_id IS NOT NULL');
    await db.query('CREATE INDEX idx_community_resources_tags ON community_resources USING GIN(tags)');
  }

  if (!(await tableExists('resource_helpful_votes'))) {
    log.info('Creating resource_helpful_votes table...');
    await db.query(`
      CREATE TABLE resource_helpful_votes (
        resource_id TEXT NOT NULL REFERENCES community_resources(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        helpful BOOLEAN NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (resource_id, user_id)
      )
    `);
  }

  // ============================================
  // CONTENT REPORTING / FLAGGING
  // ============================================
  if (!(await tableExists('content_reports'))) {
    log.info('Creating content_reports table...');
    await db.query(`
      CREATE TABLE content_reports (
        id TEXT PRIMARY KEY DEFAULT 'rep_' || replace(gen_random_uuid()::text, '-', ''),

        -- Reporter
        reported_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Content being reported
        content_type TEXT NOT NULL CHECK (content_type IN (
          'post', 'comment', 'message', 'profile', 'resource', 'community', 'hangout'
        )),
        content_id TEXT NOT NULL,

        -- Report details
        reason TEXT NOT NULL CHECK (reason IN (
          'spam', 'harassment', 'hate_speech', 'misinformation', 'inappropriate',
          'violence', 'self_harm', 'illegal', 'copyright', 'impersonation', 'other'
        )),
        details TEXT,

        -- Context
        community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
        virtual_hangout_id BIGINT REFERENCES virtual_hangouts(id) ON DELETE SET NULL,

        -- Status
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
        priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

        -- Resolution
        reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ,
        resolution TEXT,
        action_taken TEXT CHECK (action_taken IN (
          'none', 'warning', 'content_removed', 'content_hidden', 'user_warned',
          'user_muted', 'user_suspended', 'user_banned'
        )),

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.query('CREATE INDEX idx_content_reports_status ON content_reports(status, priority, created_at)');
    await db.query('CREATE INDEX idx_content_reports_content ON content_reports(content_type, content_id)');
    await db.query('CREATE INDEX idx_content_reports_community ON content_reports(community_id) WHERE community_id IS NOT NULL');
  }

  if (!(await tableExists('user_moderation_history'))) {
    log.info('Creating user_moderation_history table...');
    await db.query(`
      CREATE TABLE user_moderation_history (
        id TEXT PRIMARY KEY DEFAULT 'umh_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        action_type TEXT NOT NULL CHECK (action_type IN (
          'warning', 'mute', 'unmute', 'suspend', 'unsuspend', 'ban', 'unban',
          'content_removed', 'content_hidden', 'restriction_added', 'restriction_removed'
        )),

        -- Scope
        scope TEXT DEFAULT 'global' CHECK (scope IN ('global', 'community', 'hangout')),
        community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
        virtual_hangout_id BIGINT REFERENCES virtual_hangouts(id) ON DELETE SET NULL,

        -- Details
        reason TEXT,
        related_report_id TEXT REFERENCES content_reports(id) ON DELETE SET NULL,
        duration_hours INTEGER, -- For temporary actions
        expires_at TIMESTAMPTZ,

        -- Who did it
        actioned_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.query('CREATE INDEX idx_user_moderation_history_user ON user_moderation_history(user_id, created_at DESC)');
  }

  // ============================================
  // INTER-COMMUNITY CHALLENGES
  // ============================================
  if (!(await tableExists('inter_community_challenges'))) {
    log.info('Creating inter_community_challenges table...');
    await db.query(`
      CREATE TABLE inter_community_challenges (
        id TEXT PRIMARY KEY DEFAULT 'icc_' || replace(gen_random_uuid()::text, '-', ''),

        -- Challenge details
        title TEXT NOT NULL,
        description TEXT,
        challenge_type TEXT NOT NULL CHECK (challenge_type IN (
          'total_volume', 'total_workouts', 'streak', 'milestone', 'custom'
        )),

        -- Scoring
        metric_key TEXT, -- e.g., 'total_tu', 'workout_count'
        target_value NUMERIC(15, 4),
        scoring_method TEXT DEFAULT 'sum' CHECK (scoring_method IN ('sum', 'average', 'max', 'count')),

        -- Participating communities (stored in join table)
        min_communities INTEGER DEFAULT 2,
        max_communities INTEGER,

        -- Timeline
        registration_start TIMESTAMPTZ,
        registration_end TIMESTAMPTZ,
        challenge_start TIMESTAMPTZ NOT NULL,
        challenge_end TIMESTAMPTZ NOT NULL,

        -- Status
        status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'registration', 'active', 'completed', 'cancelled')),

        -- Results
        winner_community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
        winner_hangout_id BIGINT REFERENCES virtual_hangouts(id) ON DELETE SET NULL,

        -- Creator
        created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.query('CREATE INDEX idx_inter_community_challenges_status ON inter_community_challenges(status, challenge_start)');
  }

  if (!(await tableExists('inter_community_challenge_participants'))) {
    log.info('Creating inter_community_challenge_participants table...');
    await db.query(`
      CREATE TABLE inter_community_challenge_participants (
        id TEXT PRIMARY KEY DEFAULT 'iccp_' || replace(gen_random_uuid()::text, '-', ''),
        challenge_id TEXT NOT NULL REFERENCES inter_community_challenges(id) ON DELETE CASCADE,

        -- Participant (community or hangout)
        community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
        virtual_hangout_id BIGINT REFERENCES virtual_hangouts(id) ON DELETE CASCADE,

        -- Registration
        registered_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        registered_at TIMESTAMPTZ DEFAULT NOW(),

        -- Current score
        current_score NUMERIC(15, 4) DEFAULT 0,
        rank INTEGER,

        -- Participation
        participating_members INTEGER DEFAULT 0,

        CONSTRAINT one_participant_type CHECK (
          (community_id IS NOT NULL AND virtual_hangout_id IS NULL) OR
          (community_id IS NULL AND virtual_hangout_id IS NOT NULL)
        )
      )
    `);
    await db.query('CREATE INDEX idx_inter_challenge_participants ON inter_community_challenge_participants(challenge_id)');
    await db.query('CREATE UNIQUE INDEX idx_inter_challenge_community ON inter_community_challenge_participants(challenge_id, community_id) WHERE community_id IS NOT NULL');
    await db.query('CREATE UNIQUE INDEX idx_inter_challenge_hangout ON inter_community_challenge_participants(challenge_id, virtual_hangout_id) WHERE virtual_hangout_id IS NOT NULL');
  }

  // ============================================
  // ADD COLUMNS TO EXISTING TABLES
  // ============================================

  // Add follower/following counts to users
  if (await tableExists('users')) {
    if (!(await columnExists('users', 'follower_count'))) {
      log.info('Adding social counts to users table...');
      await db.query('ALTER TABLE users ADD COLUMN follower_count INTEGER DEFAULT 0');
      await db.query('ALTER TABLE users ADD COLUMN following_count INTEGER DEFAULT 0');
      await db.query('ALTER TABLE users ADD COLUMN friend_count INTEGER DEFAULT 0');
    }
  }

  // Add moderation status to users
  if (await tableExists('users')) {
    if (!(await columnExists('users', 'moderation_status'))) {
      log.info('Adding moderation status to users table...');
      await db.query(`ALTER TABLE users ADD COLUMN moderation_status TEXT DEFAULT 'good' CHECK (moderation_status IN ('good', 'warned', 'muted', 'suspended', 'banned'))`);
      await db.query('ALTER TABLE users ADD COLUMN moderation_until TIMESTAMPTZ');
    }
  }

  // Analyze new tables
  log.info('Analyzing new tables...');
  const newTables = [
    'user_follows', 'friendships', 'buddy_preferences', 'buddy_requests', 'buddy_pairs',
    'mentor_profiles', 'mentorships', 'mentorship_check_ins',
    'community_analytics_daily', 'community_health_scores',
    'archetype_community_links', 'community_resources', 'resource_helpful_votes',
    'content_reports', 'user_moderation_history',
    'inter_community_challenges', 'inter_community_challenge_participants'
  ];
  for (const table of newTables) {
    if (await tableExists(table)) {
      await db.query(`ANALYZE ${table}`);
    }
  }

  log.info('Migration 031_social_features complete');
}

export async function down(): Promise<void> {
  // Drop in reverse order due to foreign keys
  await db.query('DROP TABLE IF EXISTS inter_community_challenge_participants CASCADE');
  await db.query('DROP TABLE IF EXISTS inter_community_challenges CASCADE');
  await db.query('DROP TABLE IF EXISTS user_moderation_history CASCADE');
  await db.query('DROP TABLE IF EXISTS content_reports CASCADE');
  await db.query('DROP TABLE IF EXISTS resource_helpful_votes CASCADE');
  await db.query('DROP TABLE IF EXISTS community_resources CASCADE');
  await db.query('DROP TABLE IF EXISTS archetype_community_links CASCADE');
  await db.query('DROP TABLE IF EXISTS community_health_scores CASCADE');
  await db.query('DROP TABLE IF EXISTS community_analytics_daily CASCADE');
  await db.query('DROP TABLE IF EXISTS mentorship_check_ins CASCADE');
  await db.query('DROP TABLE IF EXISTS mentorships CASCADE');
  await db.query('DROP TABLE IF EXISTS mentor_profiles CASCADE');
  await db.query('DROP TABLE IF EXISTS buddy_pairs CASCADE');
  await db.query('DROP TABLE IF EXISTS buddy_requests CASCADE');
  await db.query('DROP TABLE IF EXISTS buddy_preferences CASCADE');
  await db.query('DROP TABLE IF EXISTS friendships CASCADE');
  await db.query('DROP TABLE IF EXISTS user_follows CASCADE');
}
