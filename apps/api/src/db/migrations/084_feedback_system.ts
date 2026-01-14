/**
 * Migration: User Feedback System
 *
 * Adds tables for:
 * - Bug reports
 * - Feature suggestions
 * - Questions/support requests
 * - Feedback responses (admin replies)
 * - FAQ entries (for common questions)
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

export async function up(): Promise<void> {
  log.info('Running migration: 084_feedback_system');

  // ============================================
  // USER FEEDBACK TABLE
  // ============================================
  if (!(await tableExists('user_feedback'))) {
    log.info('Creating user_feedback table...');
    await db.query(`
      CREATE TABLE user_feedback (
        id TEXT PRIMARY KEY DEFAULT 'fb_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Feedback type: bug_report, feature_request, question, general
        type TEXT NOT NULL CHECK (type IN ('bug_report', 'feature_request', 'question', 'general')),

        -- Status tracking
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'wont_fix')),

        -- Priority (for bugs)
        priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

        -- Content
        title TEXT NOT NULL,
        description TEXT NOT NULL,

        -- For bugs: steps to reproduce, expected vs actual behavior
        steps_to_reproduce TEXT,
        expected_behavior TEXT,
        actual_behavior TEXT,

        -- Device/browser info (auto-captured)
        user_agent TEXT,
        screen_size TEXT,
        app_version TEXT,
        platform TEXT,

        -- For feature requests: category
        category TEXT,

        -- Attachments (screenshot URLs, etc.)
        attachments JSONB DEFAULT '[]',

        -- Metadata
        metadata JSONB DEFAULT '{}',

        -- Voting (for feature requests)
        upvotes INTEGER DEFAULT 0,

        -- Admin notes (internal only)
        admin_notes TEXT,
        assigned_to TEXT,

        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ
      )
    `);

    // Indexes for efficient querying
    await db.query('CREATE INDEX idx_user_feedback_user ON user_feedback(user_id, created_at DESC)');
    await db.query('CREATE INDEX idx_user_feedback_type ON user_feedback(type, status)');
    await db.query('CREATE INDEX idx_user_feedback_status ON user_feedback(status, created_at DESC)');
    await db.query('CREATE INDEX idx_user_feedback_priority ON user_feedback(priority, status) WHERE type = \'bug_report\'');
    await db.query('CREATE INDEX idx_user_feedback_keyset ON user_feedback(created_at DESC, id DESC)');
    await db.query('CREATE INDEX idx_user_feedback_upvotes ON user_feedback(upvotes DESC) WHERE type = \'feature_request\'');

    log.info('user_feedback table created');
  }

  // ============================================
  // FEEDBACK RESPONSES TABLE (Admin/System replies)
  // ============================================
  if (!(await tableExists('feedback_responses'))) {
    log.info('Creating feedback_responses table...');
    await db.query(`
      CREATE TABLE feedback_responses (
        id TEXT PRIMARY KEY DEFAULT 'fbr_' || replace(gen_random_uuid()::text, '-', ''),
        feedback_id TEXT NOT NULL REFERENCES user_feedback(id) ON DELETE CASCADE,

        -- Who responded (null for system messages)
        responder_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        responder_type TEXT NOT NULL DEFAULT 'system' CHECK (responder_type IN ('system', 'admin', 'user')),

        -- Response content
        message TEXT NOT NULL,

        -- Internal only (not shown to user)
        is_internal BOOLEAN DEFAULT FALSE,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_feedback_responses_feedback ON feedback_responses(feedback_id, created_at ASC)');

    log.info('feedback_responses table created');
  }

  // ============================================
  // FEEDBACK UPVOTES TABLE (for feature requests)
  // ============================================
  if (!(await tableExists('feedback_upvotes'))) {
    log.info('Creating feedback_upvotes table...');
    await db.query(`
      CREATE TABLE feedback_upvotes (
        id TEXT PRIMARY KEY DEFAULT 'fbu_' || replace(gen_random_uuid()::text, '-', ''),
        feedback_id TEXT NOT NULL REFERENCES user_feedback(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT unique_feedback_upvote UNIQUE (feedback_id, user_id)
      )
    `);

    await db.query('CREATE INDEX idx_feedback_upvotes_feedback ON feedback_upvotes(feedback_id)');
    await db.query('CREATE INDEX idx_feedback_upvotes_user ON feedback_upvotes(user_id)');

    log.info('feedback_upvotes table created');
  }

  // ============================================
  // FAQ TABLE (for common questions)
  // ============================================
  if (!(await tableExists('faq_entries'))) {
    log.info('Creating faq_entries table...');
    await db.query(`
      CREATE TABLE faq_entries (
        id TEXT PRIMARY KEY DEFAULT 'faq_' || replace(gen_random_uuid()::text, '-', ''),

        -- Category for organization
        category TEXT NOT NULL DEFAULT 'general',

        -- Question and answer
        question TEXT NOT NULL,
        answer TEXT NOT NULL,

        -- Search keywords (for better matching)
        keywords TEXT[],

        -- Ordering
        display_order INTEGER DEFAULT 0,

        -- Is this visible to users?
        is_published BOOLEAN DEFAULT TRUE,

        -- Stats
        view_count INTEGER DEFAULT 0,
        helpful_count INTEGER DEFAULT 0,
        not_helpful_count INTEGER DEFAULT 0,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_faq_entries_category ON faq_entries(category, display_order) WHERE is_published = TRUE');
    await db.query('CREATE INDEX idx_faq_entries_keywords ON faq_entries USING GIN(keywords)');

    log.info('faq_entries table created');
  }

  // ============================================
  // TRIGGER: Update upvote count
  // ============================================
  await db.query(`
    CREATE OR REPLACE FUNCTION update_feedback_upvotes()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        UPDATE user_feedback SET upvotes = upvotes + 1, updated_at = NOW() WHERE id = NEW.feedback_id;
      ELSIF TG_OP = 'DELETE' THEN
        UPDATE user_feedback SET upvotes = upvotes - 1, updated_at = NOW() WHERE id = OLD.feedback_id;
      END IF;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql
  `);

  await db.query(`
    DROP TRIGGER IF EXISTS trg_update_feedback_upvotes ON feedback_upvotes
  `);

  await db.query(`
    CREATE TRIGGER trg_update_feedback_upvotes
    AFTER INSERT OR DELETE ON feedback_upvotes
    FOR EACH ROW EXECUTE FUNCTION update_feedback_upvotes()
  `);

  // ============================================
  // SEED INITIAL FAQ ENTRIES
  // ============================================
  log.info('Seeding initial FAQ entries...');

  const faqEntries = [
    {
      category: 'getting_started',
      question: 'How do I start tracking my workouts?',
      answer: 'From your Dashboard, tap the "Start Workout" button. You can either create a custom workout or use one of our pre-built templates. Select exercises, add sets with weights and reps, and we\'ll track your progress automatically.',
      keywords: ['workout', 'tracking', 'start', 'begin', 'log']
    },
    {
      category: 'getting_started',
      question: 'What is an Archetype and how do I choose one?',
      answer: 'Archetypes represent different fitness personalities and goals. During onboarding, we help you discover your archetype based on your preferences. You can change your archetype anytime from the Profile settings.',
      keywords: ['archetype', 'personality', 'type', 'path', 'character']
    },
    {
      category: 'features',
      question: 'How does the 3D muscle visualization work?',
      answer: 'Our interactive 3D body model shows you which muscles you\'ve worked. As you complete exercises, the targeted muscles light up with intensity based on your workout volume. Tap any muscle to see detailed stats.',
      keywords: ['3d', 'muscle', 'body', 'visualization', 'model', 'anatomy']
    },
    {
      category: 'features',
      question: 'What are Credits and how do I earn them?',
      answer: 'Credits are our in-app currency earned by completing workouts, achieving goals, and participating in the community. Use credits to unlock premium themes, purchase marketplace items, or boost your profile visibility.',
      keywords: ['credits', 'currency', 'earn', 'money', 'coins', 'points']
    },
    {
      category: 'features',
      question: 'How do Crews work?',
      answer: 'Crews are fitness teams you can join or create. Train together, compete in challenges, and climb the crew leaderboards. Crew members share achievements and can motivate each other through high-fives.',
      keywords: ['crew', 'team', 'group', 'together', 'social', 'friends']
    },
    {
      category: 'account',
      question: 'How do I change my username or profile picture?',
      answer: 'Go to Profile > Edit Profile. You can update your username, avatar, bio, and other details. Username changes may be limited to prevent abuse.',
      keywords: ['username', 'profile', 'picture', 'avatar', 'name', 'change']
    },
    {
      category: 'account',
      question: 'Is my workout data private?',
      answer: 'By default, your workout data is private. You control what\'s visible through Privacy Settings. You can choose to share workouts publicly, with friends only, or keep everything private.',
      keywords: ['privacy', 'private', 'data', 'visible', 'public', 'share']
    },
    {
      category: 'troubleshooting',
      question: 'My workout didn\'t save. What happened?',
      answer: 'Workouts save automatically as you log sets. If you lost connection during a workout, try refreshing the app - we cache data locally. If data is still missing, please submit a bug report with details.',
      keywords: ['save', 'lost', 'missing', 'data', 'workout', 'error']
    }
  ];

  for (let i = 0; i < faqEntries.length; i++) {
    const entry = faqEntries[i];
    await db.query(
      `INSERT INTO faq_entries (category, question, answer, keywords, display_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [entry.category, entry.question, entry.answer, entry.keywords, i]
    );
  }

  log.info('Migration 084_feedback_system completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 084_feedback_system');

  await db.query('DROP TRIGGER IF EXISTS trg_update_feedback_upvotes ON feedback_upvotes');
  await db.query('DROP FUNCTION IF EXISTS update_feedback_upvotes()');
  await db.query('DROP TABLE IF EXISTS faq_entries CASCADE');
  await db.query('DROP TABLE IF EXISTS feedback_upvotes CASCADE');
  await db.query('DROP TABLE IF EXISTS feedback_responses CASCADE');
  await db.query('DROP TABLE IF EXISTS user_feedback CASCADE');

  log.info('Rollback 084_feedback_system completed');
}
