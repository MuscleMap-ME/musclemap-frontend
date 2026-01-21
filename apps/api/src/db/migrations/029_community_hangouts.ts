// DESTRUCTIVE: Schema modification for community hangouts - contains DROP/TRUNCATE operations
// SQL-SAFE: Template literals contain static SQL only, no external input
/**
 * Migration: Community Hangouts & Virtual Spaces
 *
 * This migration creates the themed virtual community system:
 *
 * 1. virtual_hangouts - Themed spaces tied to archetypes/goals (not geo-located)
 *    - Warrior's Cave, Hunter's Den, Runner's Camp, Police Academy, etc.
 *    - Each has themed graphics, content, and member lists
 *
 * 2. communities - Self-organized groups with leaders and hierarchy
 *    - Goal-based (weight loss, muscle gain)
 *    - Interest-based (martial arts, running)
 *    - Institution-based (military, police, fire)
 *
 * 3. bulletin_boards - Community bulletin boards with voting
 *    - Posts with upvote/downvote
 *    - Pinned content by moderators
 *
 * 4. community_artifacts - Documents, links, resources per community
 *
 * 5. user_community_profiles - Extended privacy and visibility controls
 *    - Ghost mode (invisible in lists)
 *    - Selective profile data sharing
 *
 * 6. community_roles - Social hierarchy within communities
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
  log.info('Running migration: 029_community_hangouts');

  // ============================================
  // VIRTUAL HANGOUT THEMES
  // ============================================
  if (!(await tableExists('virtual_hangout_themes'))) {
    log.info('Creating virtual_hangout_themes table...');
    await db.query(`
      CREATE TABLE virtual_hangout_themes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tagline TEXT,
        description TEXT,

        -- Visual theming
        primary_color TEXT DEFAULT '#0066FF',
        secondary_color TEXT DEFAULT '#1a1a2e',
        accent_color TEXT DEFAULT '#ffffff',
        background_image_url TEXT,
        icon_url TEXT,
        banner_url TEXT,

        -- Associated archetype category (optional)
        archetype_category_id TEXT REFERENCES archetype_categories(id),

        -- Associated goal types (JSONB array)
        goal_types JSONB DEFAULT '[]',

        -- Target audiences (JSONB array: military, first_responder, civilian, athlete, etc.)
        target_audiences JSONB DEFAULT '[]',

        -- Features enabled for this theme
        features JSONB DEFAULT '{"bulletin_board": true, "artifacts": true, "events": true, "chat": true}',

        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Seed themed virtual hangouts
    log.info('Seeding virtual hangout themes...');
    const themes = [
      // Military themes
      {
        id: 'warriors_cave',
        name: "Warrior's Cave",
        tagline: 'Strength. Honor. Brotherhood.',
        description: 'A gathering place for military personnel and veterans focused on combat fitness, tactical training, and mutual support.',
        primary_color: '#2d5016',
        secondary_color: '#1a1a1a',
        accent_color: '#c9a227',
        archetype_category_id: 'military',
        target_audiences: ['military', 'veterans'],
        goal_types: ['strength', 'endurance', 'combat_readiness'],
      },
      {
        id: 'iron_forge',
        name: 'The Iron Forge',
        tagline: 'Forged in Fire',
        description: 'Where serious lifters gather. Heavy iron, proven programs, and a community that understands the grind.',
        primary_color: '#4a0e0e',
        secondary_color: '#1c1c1c',
        accent_color: '#ff6b35',
        archetype_category_id: 'general',
        target_audiences: ['powerlifters', 'bodybuilders', 'strength_athletes'],
        goal_types: ['muscle_gain', 'strength'],
      },
      // First Responder themes
      {
        id: 'firehouse',
        name: 'The Firehouse',
        tagline: 'Ready to Respond',
        description: 'Community hub for firefighters and CPAT candidates. Functional fitness, heat tolerance training, and brotherhood.',
        primary_color: '#b91c1c',
        secondary_color: '#1f1f1f',
        accent_color: '#fbbf24',
        archetype_category_id: 'first_responder',
        target_audiences: ['firefighters', 'ems'],
        goal_types: ['functional_fitness', 'endurance'],
      },
      {
        id: 'precinct',
        name: 'The Precinct',
        tagline: 'Protect and Serve',
        description: 'Law enforcement fitness community. POPAT prep, pursuit fitness, and officer wellness.',
        primary_color: '#1e3a5f',
        secondary_color: '#0f172a',
        accent_color: '#60a5fa',
        archetype_category_id: 'first_responder',
        target_audiences: ['police', 'law_enforcement'],
        goal_types: ['agility', 'endurance', 'strength'],
      },
      // Sports/Activity themes
      {
        id: 'hunters_den',
        name: "Hunter's Den",
        tagline: 'Track. Pursue. Conquer.',
        description: 'For those who chase goals relentlessly. Outdoor athletes, hunters, and endurance seekers.',
        primary_color: '#3d5a3d',
        secondary_color: '#1a1f1a',
        accent_color: '#8fbc8f',
        archetype_category_id: 'sports',
        target_audiences: ['outdoor_athletes', 'hunters'],
        goal_types: ['endurance', 'functional_fitness'],
      },
      {
        id: 'runners_camp',
        name: "Runner's Camp",
        tagline: 'Every Mile Matters',
        description: 'Community for runners of all levels. From couch to 5K to ultramarathons.',
        primary_color: '#0891b2',
        secondary_color: '#0c4a6e',
        accent_color: '#22d3ee',
        archetype_category_id: 'sports',
        target_audiences: ['runners', 'endurance_athletes'],
        goal_types: ['endurance', 'weight_loss', 'cardio'],
      },
      {
        id: 'dojo',
        name: 'The Dojo',
        tagline: 'Mind. Body. Spirit.',
        description: 'Martial arts community spanning all disciplines. BJJ, Karate, MMA, Judo, and more.',
        primary_color: '#7c2d12',
        secondary_color: '#1c1917',
        accent_color: '#fef3c7',
        archetype_category_id: 'sports',
        target_audiences: ['martial_artists', 'combat_sports'],
        goal_types: ['flexibility', 'strength', 'combat_readiness'],
      },
      // Goal-based themes
      {
        id: 'transformation_station',
        name: 'Transformation Station',
        tagline: 'Your Journey Starts Here',
        description: 'A supportive community for those on weight loss journeys. Share progress, get motivation, celebrate wins.',
        primary_color: '#7c3aed',
        secondary_color: '#1e1b4b',
        accent_color: '#c4b5fd',
        archetype_category_id: 'general',
        target_audiences: ['beginners', 'weight_loss'],
        goal_types: ['weight_loss'],
      },
      {
        id: 'gains_garage',
        name: 'Gains Garage',
        tagline: 'Build Your Best Self',
        description: 'Muscle building community. Bulking strategies, hypertrophy training, and nutrition.',
        primary_color: '#0f766e',
        secondary_color: '#134e4a',
        accent_color: '#5eead4',
        archetype_category_id: 'general',
        target_audiences: ['bodybuilders', 'muscle_building'],
        goal_types: ['muscle_gain', 'hypertrophy'],
      },
      {
        id: 'mobility_lab',
        name: 'Mobility Lab',
        tagline: 'Move Better. Feel Better.',
        description: 'For those focused on flexibility, recovery, and injury prevention. Yoga, stretching, and mobility work.',
        primary_color: '#4c1d95',
        secondary_color: '#2e1065',
        accent_color: '#a78bfa',
        archetype_category_id: 'rehabilitation',
        target_audiences: ['recovery', 'flexibility'],
        goal_types: ['flexibility', 'recovery', 'injury_prevention'],
      },
      // Professional/Occupational themes
      {
        id: 'national_guard_armory',
        name: 'National Guard Armory',
        tagline: 'Always Ready. Always There.',
        description: 'For National Guard members balancing civilian life with military readiness.',
        primary_color: '#1e3a5f',
        secondary_color: '#0a1628',
        accent_color: '#fcd34d',
        archetype_category_id: 'military',
        target_audiences: ['national_guard', 'reserves'],
        goal_types: ['combat_readiness', 'pt_test_prep'],
      },
      {
        id: 'first_responder_hub',
        name: 'First Responder Hub',
        tagline: 'Heroes in Training',
        description: 'Cross-discipline hub for all first responders: fire, police, EMS, dispatch.',
        primary_color: '#dc2626',
        secondary_color: '#1c1917',
        accent_color: '#fef08a',
        archetype_category_id: 'first_responder',
        target_audiences: ['first_responders'],
        goal_types: ['functional_fitness', 'pt_test_prep'],
      },
    ];

    for (const theme of themes) {
      await db.query(
        `INSERT INTO virtual_hangout_themes
         (id, name, tagline, description, primary_color, secondary_color, accent_color,
          archetype_category_id, target_audiences, goal_types)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [
          theme.id,
          theme.name,
          theme.tagline,
          theme.description,
          theme.primary_color,
          theme.secondary_color,
          theme.accent_color,
          theme.archetype_category_id,
          JSON.stringify(theme.target_audiences),
          JSON.stringify(theme.goal_types),
        ]
      );
    }
  }

  // ============================================
  // VIRTUAL HANGOUTS (instances of themes)
  // ============================================
  if (!(await tableExists('virtual_hangouts'))) {
    log.info('Creating virtual_hangouts table...');
    await db.query(`
      CREATE TABLE virtual_hangouts (
        id BIGSERIAL PRIMARY KEY,
        theme_id TEXT NOT NULL REFERENCES virtual_hangout_themes(id),

        -- Override theme defaults if needed
        custom_name TEXT,
        custom_description TEXT,
        custom_banner_url TEXT,

        -- Regional/demographic scoping (optional)
        region_code TEXT,
        language_code CHAR(7) DEFAULT 'en',

        -- Stats
        member_count INTEGER NOT NULL DEFAULT 0,
        active_member_count INTEGER NOT NULL DEFAULT 0,
        post_count INTEGER NOT NULL DEFAULT 0,

        -- Settings
        settings JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT TRUE,

        created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_virtual_hangouts_theme ON virtual_hangouts(theme_id)');
    await db.query('CREATE INDEX idx_virtual_hangouts_region ON virtual_hangouts(region_code) WHERE region_code IS NOT NULL');
    await db.query('CREATE INDEX idx_virtual_hangouts_active ON virtual_hangouts(is_active, member_count DESC)');

    // Create default hangouts for each theme
    log.info('Creating default virtual hangouts for each theme...');
    await db.query(`
      INSERT INTO virtual_hangouts (theme_id)
      SELECT id FROM virtual_hangout_themes WHERE is_active = TRUE
      ON CONFLICT DO NOTHING
    `);
  }

  // ============================================
  // VIRTUAL HANGOUT MEMBERSHIPS
  // ============================================
  if (!(await tableExists('virtual_hangout_memberships'))) {
    log.info('Creating virtual_hangout_memberships table...');
    await db.query(`
      CREATE TABLE virtual_hangout_memberships (
        hangout_id BIGINT NOT NULL REFERENCES virtual_hangouts(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Role: 0=member, 1=moderator, 2=admin, 3=founder
        role SMALLINT DEFAULT 0,

        -- Display rank/title within the hangout
        rank_title TEXT,

        -- Visibility settings for this hangout
        show_in_member_list BOOLEAN DEFAULT TRUE,
        show_activity BOOLEAN DEFAULT TRUE,

        -- Engagement stats
        post_count INTEGER DEFAULT 0,
        reputation_score INTEGER DEFAULT 0,

        -- Notifications
        notifications_enabled BOOLEAN DEFAULT TRUE,
        notification_level SMALLINT DEFAULT 1,

        joined_at TIMESTAMPTZ DEFAULT NOW(),
        last_active_at TIMESTAMPTZ DEFAULT NOW(),

        PRIMARY KEY (hangout_id, user_id)
      )
    `);

    await db.query('CREATE INDEX idx_vh_members_user ON virtual_hangout_memberships(user_id)');
    await db.query('CREATE INDEX idx_vh_members_hangout_active ON virtual_hangout_memberships(hangout_id, last_active_at DESC)');
    await db.query('CREATE INDEX idx_vh_members_visible ON virtual_hangout_memberships(hangout_id) WHERE show_in_member_list = TRUE');

    // Trigger for member count
    await db.query(`
      CREATE OR REPLACE FUNCTION update_virtual_hangout_member_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE virtual_hangouts SET member_count = member_count + 1, updated_at = NOW() WHERE id = NEW.hangout_id;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE virtual_hangouts SET member_count = GREATEST(member_count - 1, 0), updated_at = NOW() WHERE id = OLD.hangout_id;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql
    `);

    await db.query(`
      CREATE TRIGGER trg_vh_membership_count
      AFTER INSERT OR DELETE ON virtual_hangout_memberships
      FOR EACH ROW EXECUTE FUNCTION update_virtual_hangout_member_count()
    `);
  }

  // ============================================
  // COMMUNITIES (Self-organized groups)
  // ============================================
  if (!(await tableExists('communities'))) {
    log.info('Creating communities table...');
    await db.query(`
      CREATE TABLE communities (
        id TEXT PRIMARY KEY DEFAULT 'comm_' || replace(gen_random_uuid()::text, '-', ''),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        tagline TEXT,
        description TEXT,

        -- Visual identity
        avatar_url TEXT,
        banner_url TEXT,
        primary_color TEXT DEFAULT '#0066FF',

        -- Type: archetype, goal, interest, institution, local, custom
        community_type TEXT NOT NULL DEFAULT 'custom'
          CHECK (community_type IN ('archetype', 'goal', 'interest', 'institution', 'local', 'custom')),

        -- Linked to archetype or theme (optional)
        archetype_id TEXT REFERENCES archetypes(id),
        virtual_hangout_id BIGINT REFERENCES virtual_hangouts(id),

        -- Goal type for goal-based communities
        goal_type TEXT,

        -- Privacy: public, private (request to join), secret (invite only)
        privacy TEXT DEFAULT 'public' CHECK (privacy IN ('public', 'private', 'secret')),

        -- Stats
        member_count INTEGER NOT NULL DEFAULT 0,
        post_count INTEGER NOT NULL DEFAULT 0,
        active_today INTEGER DEFAULT 0,

        -- Verification/official status
        is_verified BOOLEAN DEFAULT FALSE,
        is_official BOOLEAN DEFAULT FALSE,

        -- Features enabled
        features JSONB DEFAULT '{
          "bulletin_board": true,
          "artifacts": true,
          "events": true,
          "chat": true,
          "challenges": true
        }',

        -- Moderation settings
        moderation_settings JSONB DEFAULT '{
          "require_post_approval": false,
          "auto_moderate": true,
          "min_account_age_days": 0
        }',

        settings JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT TRUE,

        created_by TEXT NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_communities_type ON communities(community_type)');
    await db.query('CREATE INDEX idx_communities_archetype ON communities(archetype_id) WHERE archetype_id IS NOT NULL');
    await db.query('CREATE INDEX idx_communities_goal ON communities(goal_type) WHERE goal_type IS NOT NULL');
    await db.query(`CREATE INDEX idx_communities_public ON communities(is_active, member_count DESC) WHERE privacy = 'public'`);
    await db.query('CREATE INDEX idx_communities_slug ON communities(slug)');
  }

  // ============================================
  // COMMUNITY ROLES (Custom hierarchy)
  // ============================================
  if (!(await tableExists('community_roles'))) {
    log.info('Creating community_roles table...');
    await db.query(`
      CREATE TABLE community_roles (
        id TEXT PRIMARY KEY DEFAULT 'role_' || replace(gen_random_uuid()::text, '-', ''),
        community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,

        name TEXT NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#6b7280',
        icon TEXT,

        -- Hierarchy level (higher = more permissions)
        level INTEGER NOT NULL DEFAULT 0,

        -- Permissions (JSONB for flexibility)
        permissions JSONB DEFAULT '{
          "can_post": true,
          "can_comment": true,
          "can_pin": false,
          "can_delete_posts": false,
          "can_kick": false,
          "can_ban": false,
          "can_invite": false,
          "can_manage_roles": false,
          "can_manage_settings": false
        }',

        -- Auto-assign conditions
        auto_assign_conditions JSONB,

        is_default BOOLEAN DEFAULT FALSE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),

        UNIQUE(community_id, name)
      )
    `);

    await db.query('CREATE INDEX idx_community_roles_comm ON community_roles(community_id)');
  }

  // ============================================
  // COMMUNITY MEMBERSHIPS
  // ============================================
  if (!(await tableExists('community_memberships'))) {
    log.info('Creating community_memberships table...');
    await db.query(`
      CREATE TABLE community_memberships (
        community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Role reference
        role_id TEXT REFERENCES community_roles(id) ON DELETE SET NULL,

        -- Built-in role level: 0=member, 1=moderator, 2=admin, 3=leader/founder
        role_level SMALLINT DEFAULT 0,

        -- Custom title (e.g., "Sergeant", "Senior Member")
        title TEXT,

        -- Visibility
        show_in_member_list BOOLEAN DEFAULT TRUE,
        show_stats BOOLEAN DEFAULT TRUE,
        show_activity BOOLEAN DEFAULT TRUE,

        -- Engagement metrics
        post_count INTEGER DEFAULT 0,
        comment_count INTEGER DEFAULT 0,
        reputation INTEGER DEFAULT 0,
        contribution_score INTEGER DEFAULT 0,

        -- Status
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'muted', 'banned', 'pending')),
        status_reason TEXT,
        status_expires_at TIMESTAMPTZ,

        -- Notifications
        notifications_enabled BOOLEAN DEFAULT TRUE,

        joined_at TIMESTAMPTZ DEFAULT NOW(),
        last_active_at TIMESTAMPTZ DEFAULT NOW(),

        PRIMARY KEY (community_id, user_id)
      )
    `);

    await db.query('CREATE INDEX idx_comm_members_user ON community_memberships(user_id)');
    await db.query('CREATE INDEX idx_comm_members_role ON community_memberships(role_level DESC, joined_at)');
    await db.query(`CREATE INDEX idx_comm_members_active ON community_memberships(community_id, last_active_at DESC) WHERE status = 'active'`);
    await db.query(`CREATE INDEX idx_comm_members_visible ON community_memberships(community_id) WHERE show_in_member_list = TRUE AND status = 'active'`);

    // Member count trigger
    await db.query(`
      CREATE OR REPLACE FUNCTION update_community_member_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE communities SET member_count = member_count + 1, updated_at = NOW() WHERE id = NEW.community_id;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE communities SET member_count = GREATEST(member_count - 1, 0), updated_at = NOW() WHERE id = OLD.community_id;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql
    `);

    await db.query(`
      CREATE TRIGGER trg_community_membership_count
      AFTER INSERT OR DELETE ON community_memberships
      FOR EACH ROW EXECUTE FUNCTION update_community_member_count()
    `);
  }

  // ============================================
  // BULLETIN BOARD POSTS
  // ============================================
  if (!(await tableExists('bulletin_posts'))) {
    log.info('Creating bulletin_posts table...');
    await db.query(`
      CREATE TABLE bulletin_posts (
        id TEXT PRIMARY KEY DEFAULT 'bp_' || replace(gen_random_uuid()::text, '-', ''),

        -- Can belong to community OR virtual hangout
        community_id TEXT REFERENCES communities(id) ON DELETE CASCADE,
        virtual_hangout_id BIGINT REFERENCES virtual_hangouts(id) ON DELETE CASCADE,

        author_id TEXT REFERENCES users(id) ON DELETE SET NULL,

        -- Content
        title TEXT,
        content TEXT NOT NULL,
        content_format TEXT DEFAULT 'markdown' CHECK (content_format IN ('plain', 'markdown', 'html')),

        -- Media
        media_urls JSONB DEFAULT '[]',
        link_preview JSONB,

        -- Voting
        upvote_count INTEGER DEFAULT 0,
        downvote_count INTEGER DEFAULT 0,
        score INTEGER GENERATED ALWAYS AS (upvote_count - downvote_count) STORED,

        -- Engagement
        comment_count INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        share_count INTEGER DEFAULT 0,

        -- Status
        is_pinned BOOLEAN DEFAULT FALSE,
        is_announcement BOOLEAN DEFAULT FALSE,
        is_hidden BOOLEAN DEFAULT FALSE,
        is_locked BOOLEAN DEFAULT FALSE,

        -- Moderation
        moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
        moderation_note TEXT,

        -- Sorting/ranking
        hot_score NUMERIC(12,6) DEFAULT 0,
        trending_score NUMERIC(12,6) DEFAULT 0,

        -- Tags
        tags JSONB DEFAULT '[]',

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        pinned_at TIMESTAMPTZ,
        pinned_by TEXT REFERENCES users(id),

        -- Ensure post belongs to exactly one parent
        CONSTRAINT bulletin_post_parent CHECK (
          (community_id IS NOT NULL AND virtual_hangout_id IS NULL) OR
          (community_id IS NULL AND virtual_hangout_id IS NOT NULL)
        )
      )
    `);

    await db.query('CREATE INDEX idx_bulletin_community ON bulletin_posts(community_id, created_at DESC) WHERE community_id IS NOT NULL');
    await db.query('CREATE INDEX idx_bulletin_vh ON bulletin_posts(virtual_hangout_id, created_at DESC) WHERE virtual_hangout_id IS NOT NULL');
    await db.query('CREATE INDEX idx_bulletin_author ON bulletin_posts(author_id) WHERE author_id IS NOT NULL');
    await db.query('CREATE INDEX idx_bulletin_hot ON bulletin_posts(hot_score DESC) WHERE is_hidden = FALSE');
    await db.query('CREATE INDEX idx_bulletin_pinned ON bulletin_posts(community_id, pinned_at DESC) WHERE is_pinned = TRUE');
  }

  // ============================================
  // BULLETIN POST VOTES
  // ============================================
  if (!(await tableExists('bulletin_votes'))) {
    log.info('Creating bulletin_votes table...');
    await db.query(`
      CREATE TABLE bulletin_votes (
        post_id TEXT NOT NULL REFERENCES bulletin_posts(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- 1 = upvote, -1 = downvote
        vote_value SMALLINT NOT NULL CHECK (vote_value IN (-1, 1)),

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        PRIMARY KEY (post_id, user_id)
      )
    `);

    await db.query('CREATE INDEX idx_bulletin_votes_post ON bulletin_votes(post_id)');
    await db.query('CREATE INDEX idx_bulletin_votes_user ON bulletin_votes(user_id)');

    // Trigger to update vote counts
    await db.query(`
      CREATE OR REPLACE FUNCTION update_bulletin_vote_counts()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          IF NEW.vote_value = 1 THEN
            UPDATE bulletin_posts SET upvote_count = upvote_count + 1, updated_at = NOW() WHERE id = NEW.post_id;
          ELSE
            UPDATE bulletin_posts SET downvote_count = downvote_count + 1, updated_at = NOW() WHERE id = NEW.post_id;
          END IF;
        ELSIF TG_OP = 'DELETE' THEN
          IF OLD.vote_value = 1 THEN
            UPDATE bulletin_posts SET upvote_count = GREATEST(upvote_count - 1, 0), updated_at = NOW() WHERE id = OLD.post_id;
          ELSE
            UPDATE bulletin_posts SET downvote_count = GREATEST(downvote_count - 1, 0), updated_at = NOW() WHERE id = OLD.post_id;
          END IF;
        ELSIF TG_OP = 'UPDATE' AND OLD.vote_value != NEW.vote_value THEN
          IF NEW.vote_value = 1 THEN
            UPDATE bulletin_posts SET
              upvote_count = upvote_count + 1,
              downvote_count = GREATEST(downvote_count - 1, 0),
              updated_at = NOW()
            WHERE id = NEW.post_id;
          ELSE
            UPDATE bulletin_posts SET
              upvote_count = GREATEST(upvote_count - 1, 0),
              downvote_count = downvote_count + 1,
              updated_at = NOW()
            WHERE id = NEW.post_id;
          END IF;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql
    `);

    await db.query(`
      CREATE TRIGGER trg_bulletin_vote_counts
      AFTER INSERT OR DELETE OR UPDATE ON bulletin_votes
      FOR EACH ROW EXECUTE FUNCTION update_bulletin_vote_counts()
    `);
  }

  // ============================================
  // BULLETIN COMMENTS
  // ============================================
  if (!(await tableExists('bulletin_comments'))) {
    log.info('Creating bulletin_comments table...');
    await db.query(`
      CREATE TABLE bulletin_comments (
        id TEXT PRIMARY KEY DEFAULT 'bc_' || replace(gen_random_uuid()::text, '-', ''),
        post_id TEXT NOT NULL REFERENCES bulletin_posts(id) ON DELETE CASCADE,
        parent_id TEXT REFERENCES bulletin_comments(id) ON DELETE CASCADE,
        author_id TEXT REFERENCES users(id) ON DELETE SET NULL,

        content TEXT NOT NULL,

        -- Voting
        upvote_count INTEGER DEFAULT 0,
        downvote_count INTEGER DEFAULT 0,
        score INTEGER GENERATED ALWAYS AS (upvote_count - downvote_count) STORED,

        -- Status
        is_hidden BOOLEAN DEFAULT FALSE,
        is_pinned BOOLEAN DEFAULT FALSE,

        depth SMALLINT DEFAULT 0,
        reply_count INTEGER DEFAULT 0,

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_bulletin_comments_post ON bulletin_comments(post_id, created_at)');
    await db.query('CREATE INDEX idx_bulletin_comments_parent ON bulletin_comments(parent_id) WHERE parent_id IS NOT NULL');
    await db.query('CREATE INDEX idx_bulletin_comments_author ON bulletin_comments(author_id) WHERE author_id IS NOT NULL');

    // Comment count trigger
    await db.query(`
      CREATE OR REPLACE FUNCTION update_bulletin_comment_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE bulletin_posts SET comment_count = comment_count + 1, updated_at = NOW() WHERE id = NEW.post_id;
          IF NEW.parent_id IS NOT NULL THEN
            UPDATE bulletin_comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_id;
          END IF;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE bulletin_posts SET comment_count = GREATEST(comment_count - 1, 0), updated_at = NOW() WHERE id = OLD.post_id;
          IF OLD.parent_id IS NOT NULL THEN
            UPDATE bulletin_comments SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.parent_id;
          END IF;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql
    `);

    await db.query(`
      CREATE TRIGGER trg_bulletin_comment_count
      AFTER INSERT OR DELETE ON bulletin_comments
      FOR EACH ROW EXECUTE FUNCTION update_bulletin_comment_count()
    `);
  }

  // ============================================
  // COMMUNITY ARTIFACTS (Documents, Links, Resources)
  // ============================================
  if (!(await tableExists('community_artifacts'))) {
    log.info('Creating community_artifacts table...');
    await db.query(`
      CREATE TABLE community_artifacts (
        id TEXT PRIMARY KEY DEFAULT 'art_' || replace(gen_random_uuid()::text, '-', ''),

        -- Parent (community or virtual hangout)
        community_id TEXT REFERENCES communities(id) ON DELETE CASCADE,
        virtual_hangout_id BIGINT REFERENCES virtual_hangouts(id) ON DELETE CASCADE,

        -- Type: document, link, image, video, file, guide, template
        artifact_type TEXT NOT NULL CHECK (artifact_type IN ('document', 'link', 'image', 'video', 'file', 'guide', 'template', 'form')),

        title TEXT NOT NULL,
        description TEXT,

        -- Content
        content TEXT,
        url TEXT,
        file_url TEXT,
        thumbnail_url TEXT,

        -- Metadata
        metadata JSONB DEFAULT '{}',

        -- Categorization
        category TEXT,
        tags JSONB DEFAULT '[]',

        -- Access
        is_pinned BOOLEAN DEFAULT FALSE,
        is_members_only BOOLEAN DEFAULT TRUE,
        required_role_level SMALLINT DEFAULT 0,

        -- Stats
        view_count INTEGER DEFAULT 0,
        download_count INTEGER DEFAULT 0,

        uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        -- Ensure artifact belongs to exactly one parent
        CONSTRAINT artifact_parent CHECK (
          (community_id IS NOT NULL AND virtual_hangout_id IS NULL) OR
          (community_id IS NULL AND virtual_hangout_id IS NOT NULL)
        )
      )
    `);

    await db.query('CREATE INDEX idx_artifacts_community ON community_artifacts(community_id) WHERE community_id IS NOT NULL');
    await db.query('CREATE INDEX idx_artifacts_vh ON community_artifacts(virtual_hangout_id) WHERE virtual_hangout_id IS NOT NULL');
    await db.query('CREATE INDEX idx_artifacts_type ON community_artifacts(artifact_type)');
    await db.query('CREATE INDEX idx_artifacts_pinned ON community_artifacts(is_pinned DESC, created_at DESC)');
  }

  // ============================================
  // USER COMMUNITY PROFILE (Privacy & Visibility)
  // ============================================
  if (!(await tableExists('user_community_profiles'))) {
    log.info('Creating user_community_profiles table...');
    await db.query(`
      CREATE TABLE user_community_profiles (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

        -- Ghost Mode: completely invisible in all community features
        ghost_mode BOOLEAN DEFAULT FALSE,

        -- Selective visibility
        show_in_member_lists BOOLEAN DEFAULT TRUE,
        show_in_leaderboards BOOLEAN DEFAULT TRUE,
        show_online_status BOOLEAN DEFAULT TRUE,
        show_last_active BOOLEAN DEFAULT TRUE,

        -- Profile data visibility
        show_workout_stats BOOLEAN DEFAULT TRUE,
        show_goals BOOLEAN DEFAULT TRUE,
        show_archetype BOOLEAN DEFAULT TRUE,
        show_level BOOLEAN DEFAULT TRUE,
        show_achievements BOOLEAN DEFAULT TRUE,
        show_pt_results BOOLEAN DEFAULT FALSE,

        -- Contact preferences
        allow_direct_messages BOOLEAN DEFAULT TRUE,
        allow_group_invites BOOLEAN DEFAULT TRUE,
        allow_friend_requests BOOLEAN DEFAULT TRUE,

        -- Message filtering
        dm_filter_level SMALLINT DEFAULT 0,

        -- Bio and custom fields
        bio TEXT,
        tagline TEXT,
        custom_title TEXT,
        social_links JSONB DEFAULT '{}',

        -- Featured content
        featured_workout_id TEXT,
        featured_achievement_id TEXT,

        -- Auto-join settings
        auto_join_archetype_community BOOLEAN DEFAULT TRUE,
        auto_join_goal_communities BOOLEAN DEFAULT TRUE,

        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_ucp_ghost ON user_community_profiles(ghost_mode) WHERE ghost_mode = TRUE');
    await db.query('CREATE INDEX idx_ucp_visible ON user_community_profiles(user_id) WHERE ghost_mode = FALSE AND show_in_member_lists = TRUE');
  }

  // ============================================
  // COMMUNITY EVENTS
  // ============================================
  if (!(await tableExists('community_events'))) {
    log.info('Creating community_events table...');
    await db.query(`
      CREATE TABLE community_events (
        id TEXT PRIMARY KEY DEFAULT 'evt_' || replace(gen_random_uuid()::text, '-', ''),

        community_id TEXT REFERENCES communities(id) ON DELETE CASCADE,
        virtual_hangout_id BIGINT REFERENCES virtual_hangouts(id) ON DELETE CASCADE,

        title TEXT NOT NULL,
        description TEXT,

        -- Timing
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ,
        timezone TEXT DEFAULT 'UTC',
        is_all_day BOOLEAN DEFAULT FALSE,

        -- Recurrence
        recurrence_rule TEXT,

        -- Type: workout, challenge, meetup, webinar, competition
        event_type TEXT DEFAULT 'general' CHECK (event_type IN ('workout', 'challenge', 'meetup', 'webinar', 'competition', 'general')),

        -- Location (virtual or physical)
        location_type TEXT DEFAULT 'virtual' CHECK (location_type IN ('virtual', 'physical', 'hybrid')),
        location_details JSONB DEFAULT '{}',
        hangout_id BIGINT REFERENCES virtual_hangouts(id),

        -- Capacity
        max_participants INTEGER,
        current_participants INTEGER DEFAULT 0,

        -- Media
        cover_image_url TEXT,

        -- Status
        status TEXT DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'live', 'completed', 'cancelled')),

        created_by TEXT NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT event_parent CHECK (
          (community_id IS NOT NULL AND virtual_hangout_id IS NULL) OR
          (community_id IS NULL AND virtual_hangout_id IS NOT NULL) OR
          (community_id IS NULL AND virtual_hangout_id IS NULL)
        )
      )
    `);

    await db.query('CREATE INDEX idx_events_community ON community_events(community_id, starts_at) WHERE community_id IS NOT NULL');
    await db.query('CREATE INDEX idx_events_vh ON community_events(virtual_hangout_id, starts_at) WHERE virtual_hangout_id IS NOT NULL');
    // Note: Can't use NOW() in partial index predicate (not IMMUTABLE), so we just index scheduled events
    await db.query(`CREATE INDEX idx_events_upcoming ON community_events(starts_at) WHERE status = 'scheduled'`);
  }

  // ============================================
  // EVENT PARTICIPANTS
  // ============================================
  if (!(await tableExists('event_participants'))) {
    log.info('Creating event_participants table...');
    await db.query(`
      CREATE TABLE event_participants (
        event_id TEXT NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'no_show', 'cancelled')),
        registered_at TIMESTAMPTZ DEFAULT NOW(),
        attended_at TIMESTAMPTZ,

        PRIMARY KEY (event_id, user_id)
      )
    `);

    await db.query('CREATE INDEX idx_event_participants_event ON event_participants(event_id)');
    await db.query('CREATE INDEX idx_event_participants_user ON event_participants(user_id)');
  }

  // ============================================
  // COMMUNITY INVITES
  // ============================================
  if (!(await tableExists('community_invites'))) {
    log.info('Creating community_invites table...');
    await db.query(`
      CREATE TABLE community_invites (
        id TEXT PRIMARY KEY DEFAULT 'inv_' || replace(gen_random_uuid()::text, '-', ''),
        community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,

        -- Invite code (for link-based invites)
        code TEXT UNIQUE,

        -- Direct invite (to specific user)
        invited_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,

        invited_by TEXT NOT NULL REFERENCES users(id),

        -- Usage limits
        max_uses INTEGER,
        use_count INTEGER DEFAULT 0,

        -- Expiry
        expires_at TIMESTAMPTZ,

        -- Role to assign on join
        assign_role_id TEXT REFERENCES community_roles(id),

        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'revoked')),

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_invites_community ON community_invites(community_id)');
    await db.query('CREATE INDEX idx_invites_code ON community_invites(code) WHERE code IS NOT NULL');
    await db.query('CREATE INDEX idx_invites_user ON community_invites(invited_user_id) WHERE invited_user_id IS NOT NULL');
  }

  // ============================================
  // ADD COMMUNITY PREFERENCES TO USERS
  // ============================================
  if (await tableExists('users')) {
    if (!(await columnExists('users', 'default_community_id'))) {
      log.info('Adding default_community_id to users...');
      await db.query('ALTER TABLE users ADD COLUMN default_community_id TEXT REFERENCES communities(id) ON DELETE SET NULL');
    }
  }

  // ============================================
  // UPDATE user_privacy_mode WITH COMMUNITY SETTINGS
  // ============================================
  if (await tableExists('user_privacy_mode')) {
    if (!(await columnExists('user_privacy_mode', 'opt_out_virtual_hangouts'))) {
      log.info('Adding community privacy settings to user_privacy_mode...');
      await db.query('ALTER TABLE user_privacy_mode ADD COLUMN opt_out_virtual_hangouts BOOLEAN DEFAULT FALSE');
    }
    if (!(await columnExists('user_privacy_mode', 'ghost_mode'))) {
      await db.query('ALTER TABLE user_privacy_mode ADD COLUMN ghost_mode BOOLEAN DEFAULT FALSE');
    }
  }

  // ============================================
  // ANALYZE NEW TABLES
  // ============================================
  log.info('Analyzing new tables...');
  const newTables = [
    'virtual_hangout_themes',
    'virtual_hangouts',
    'virtual_hangout_memberships',
    'communities',
    'community_roles',
    'community_memberships',
    'bulletin_posts',
    'bulletin_votes',
    'bulletin_comments',
    'community_artifacts',
    'user_community_profiles',
    'community_events',
    'event_participants',
    'community_invites',
  ];

  for (const table of newTables) {
    if (await tableExists(table)) {
      try {
        await db.query(`ANALYZE ${table}`);
      } catch (_e) {
        log.debug(`Could not analyze ${table}`);
      }
    }
  }

  log.info('Migration 029_community_hangouts complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 029_community_hangouts');

  // Drop in reverse order of creation
  const tables = [
    'community_invites',
    'event_participants',
    'community_events',
    'user_community_profiles',
    'community_artifacts',
    'bulletin_comments',
    'bulletin_votes',
    'bulletin_posts',
    'community_memberships',
    'community_roles',
    'communities',
    'virtual_hangout_memberships',
    'virtual_hangouts',
    'virtual_hangout_themes',
  ];

  for (const table of tables) {
    await db.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
  }

  // Remove columns
  if (await columnExists('users', 'default_community_id')) {
    await db.query('ALTER TABLE users DROP COLUMN default_community_id');
  }
  if (await columnExists('user_privacy_mode', 'opt_out_virtual_hangouts')) {
    await db.query('ALTER TABLE user_privacy_mode DROP COLUMN opt_out_virtual_hangouts');
  }
  if (await columnExists('user_privacy_mode', 'ghost_mode')) {
    await db.query('ALTER TABLE user_privacy_mode DROP COLUMN ghost_mode');
  }

  // Drop functions
  await db.query('DROP FUNCTION IF EXISTS update_virtual_hangout_member_count CASCADE');
  await db.query('DROP FUNCTION IF EXISTS update_community_member_count CASCADE');
  await db.query('DROP FUNCTION IF EXISTS update_bulletin_vote_counts CASCADE');
  await db.query('DROP FUNCTION IF EXISTS update_bulletin_comment_count CASCADE');

  log.info('Rollback 029_community_hangouts complete');
}

export const migrate = up;
