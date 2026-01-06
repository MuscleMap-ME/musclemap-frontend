/**
 * Migration: Issue Tracker System
 *
 * This migration adds a comprehensive bug and issue tracking system:
 * 1. Issues table - bugs, feature requests, suggestions
 * 2. Issue comments - threaded discussions
 * 3. Issue votes - upvotes for prioritization
 * 4. Issue subscribers - follow updates
 * 5. Issue status history - audit trail
 * 6. Issue labels/tags - categorization
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function indexExists(indexName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_indexes WHERE indexname = $1`,
    [indexName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function migrate(): Promise<void> {
  log.info('Running migration: 008_issue_tracker');

  // ============================================
  // ISSUE LABELS
  // ============================================
  if (!(await tableExists('issue_labels'))) {
    log.info('Creating issue_labels table...');
    await db.query(`
      CREATE TABLE issue_labels (
        id TEXT PRIMARY KEY DEFAULT 'lbl_' || replace(uuid_generate_v4()::text, '-', ''),
        name VARCHAR(50) NOT NULL UNIQUE,
        slug VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        color VARCHAR(7) NOT NULL DEFAULT '#6366f1',
        icon VARCHAR(10),
        display_order SMALLINT DEFAULT 0,
        is_system BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Seed default labels
    const defaultLabels = [
      { slug: 'bug', name: 'Bug', description: 'Something is not working correctly', color: '#ef4444', icon: '🐛', order: 1, system: true },
      { slug: 'feature', name: 'Feature Request', description: 'Suggestion for a new feature', color: '#22c55e', icon: '✨', order: 2, system: true },
      { slug: 'enhancement', name: 'Enhancement', description: 'Improvement to existing functionality', color: '#3b82f6', icon: '💡', order: 3, system: true },
      { slug: 'account', name: 'Account Issue', description: 'Problems with user account', color: '#f97316', icon: '👤', order: 4, system: true },
      { slug: 'ui-ux', name: 'UI/UX', description: 'User interface and experience issues', color: '#8b5cf6', icon: '🎨', order: 5, system: true },
      { slug: 'performance', name: 'Performance', description: 'Speed and performance related', color: '#eab308', icon: '⚡', order: 6, system: true },
      { slug: 'documentation', name: 'Documentation', description: 'Documentation improvements', color: '#06b6d4', icon: '📚', order: 7, system: true },
      { slug: 'question', name: 'Question', description: 'General questions and support', color: '#ec4899', icon: '❓', order: 8, system: true },
    ];

    for (const label of defaultLabels) {
      await db.query(
        `INSERT INTO issue_labels (slug, name, description, color, icon, display_order, is_system)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (slug) DO NOTHING`,
        [label.slug, label.name, label.description, label.color, label.icon, label.order, label.system]
      );
    }
    log.info('Issue labels seeded');
  }

  // ============================================
  // ISSUES
  // ============================================
  if (!(await tableExists('issues'))) {
    log.info('Creating issues table...');
    await db.query(`
      CREATE TABLE issues (
        id TEXT PRIMARY KEY DEFAULT 'iss_' || replace(uuid_generate_v4()::text, '-', ''),
        issue_number SERIAL UNIQUE,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        type SMALLINT NOT NULL DEFAULT 0,
        status SMALLINT NOT NULL DEFAULT 0,
        priority SMALLINT NOT NULL DEFAULT 1,
        author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        label_ids TEXT[] DEFAULT '{}',
        vote_count INTEGER DEFAULT 0,
        comment_count INTEGER DEFAULT 0,
        subscriber_count INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        is_pinned BOOLEAN DEFAULT FALSE,
        is_locked BOOLEAN DEFAULT FALSE,
        is_public BOOLEAN DEFAULT TRUE,
        resolved_at TIMESTAMPTZ,
        resolved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        resolution_note TEXT,
        browser_info JSONB,
        device_info JSONB,
        page_url TEXT,
        screenshot_urls TEXT[] DEFAULT '{}',
        related_issue_ids TEXT[] DEFAULT '{}',
        duplicate_of_id TEXT REFERENCES issues(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Issue Type: 0=bug, 1=feature, 2=enhancement, 3=account, 4=question, 5=other
    // Status: 0=open, 1=in_progress, 2=under_review, 3=resolved, 4=closed, 5=wont_fix, 6=duplicate
    // Priority: 0=low, 1=medium, 2=high, 3=critical

    await db.query('CREATE INDEX idx_issues_author ON issues (author_id)');
    await db.query('CREATE INDEX idx_issues_assignee ON issues (assignee_id) WHERE assignee_id IS NOT NULL');
    await db.query('CREATE INDEX idx_issues_status ON issues (status, created_at DESC) WHERE is_public = TRUE');
    await db.query('CREATE INDEX idx_issues_type ON issues (type) WHERE is_public = TRUE');
    await db.query('CREATE INDEX idx_issues_votes ON issues (vote_count DESC, created_at DESC) WHERE status < 3');
    await db.query('CREATE INDEX idx_issues_pinned ON issues (is_pinned DESC, created_at DESC) WHERE is_public = TRUE');
    await db.query('CREATE INDEX idx_issues_number ON issues (issue_number)');
    await db.query('CREATE INDEX idx_issues_search ON issues USING gin(to_tsvector(\'english\', title || \' \' || description))');
  }

  // ============================================
  // ISSUE COMMENTS
  // ============================================
  if (!(await tableExists('issue_comments'))) {
    log.info('Creating issue_comments table...');
    await db.query(`
      CREATE TABLE issue_comments (
        id TEXT PRIMARY KEY DEFAULT 'cmt_' || replace(uuid_generate_v4()::text, '-', ''),
        issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
        author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        parent_id TEXT REFERENCES issue_comments(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_staff_reply BOOLEAN DEFAULT FALSE,
        is_solution BOOLEAN DEFAULT FALSE,
        is_hidden BOOLEAN DEFAULT FALSE,
        edit_count SMALLINT DEFAULT 0,
        last_edited_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_comments_issue ON issue_comments (issue_id, created_at)');
    await db.query('CREATE INDEX idx_comments_author ON issue_comments (author_id)');
    await db.query('CREATE INDEX idx_comments_parent ON issue_comments (parent_id) WHERE parent_id IS NOT NULL');
    await db.query('CREATE INDEX idx_comments_solution ON issue_comments (issue_id) WHERE is_solution = TRUE');

    // Comment count trigger
    await db.query(`
      CREATE OR REPLACE FUNCTION update_issue_comment_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE issues SET comment_count = comment_count + 1, updated_at = NOW() WHERE id = NEW.issue_id;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE issues SET comment_count = GREATEST(comment_count - 1, 0), updated_at = NOW() WHERE id = OLD.issue_id;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql
    `);

    await db.query(`
      CREATE TRIGGER trg_issue_comment_count
      AFTER INSERT OR DELETE ON issue_comments
      FOR EACH ROW EXECUTE FUNCTION update_issue_comment_count()
    `);
  }

  // ============================================
  // ISSUE VOTES
  // ============================================
  if (!(await tableExists('issue_votes'))) {
    log.info('Creating issue_votes table...');
    await db.query(`
      CREATE TABLE issue_votes (
        issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (issue_id, user_id)
      )
    `);

    await db.query('CREATE INDEX idx_votes_issue ON issue_votes (issue_id)');
    await db.query('CREATE INDEX idx_votes_user ON issue_votes (user_id)');

    // Vote count trigger
    await db.query(`
      CREATE OR REPLACE FUNCTION update_issue_vote_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE issues SET vote_count = vote_count + 1 WHERE id = NEW.issue_id;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE issues SET vote_count = GREATEST(vote_count - 1, 0) WHERE id = OLD.issue_id;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql
    `);

    await db.query(`
      CREATE TRIGGER trg_issue_vote_count
      AFTER INSERT OR DELETE ON issue_votes
      FOR EACH ROW EXECUTE FUNCTION update_issue_vote_count()
    `);
  }

  // ============================================
  // ISSUE SUBSCRIBERS
  // ============================================
  if (!(await tableExists('issue_subscribers'))) {
    log.info('Creating issue_subscribers table...');
    await db.query(`
      CREATE TABLE issue_subscribers (
        issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notify_comments BOOLEAN DEFAULT TRUE,
        notify_status BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (issue_id, user_id)
      )
    `);

    await db.query('CREATE INDEX idx_subscribers_issue ON issue_subscribers (issue_id)');
    await db.query('CREATE INDEX idx_subscribers_user ON issue_subscribers (user_id)');

    // Subscriber count trigger
    await db.query(`
      CREATE OR REPLACE FUNCTION update_issue_subscriber_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE issues SET subscriber_count = subscriber_count + 1 WHERE id = NEW.issue_id;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE issues SET subscriber_count = GREATEST(subscriber_count - 1, 0) WHERE id = OLD.issue_id;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql
    `);

    await db.query(`
      CREATE TRIGGER trg_issue_subscriber_count
      AFTER INSERT OR DELETE ON issue_subscribers
      FOR EACH ROW EXECUTE FUNCTION update_issue_subscriber_count()
    `);
  }

  // ============================================
  // ISSUE STATUS HISTORY
  // ============================================
  if (!(await tableExists('issue_status_history'))) {
    log.info('Creating issue_status_history table...');
    await db.query(`
      CREATE TABLE issue_status_history (
        id TEXT PRIMARY KEY DEFAULT 'ish_' || replace(uuid_generate_v4()::text, '-', ''),
        issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
        actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        old_value TEXT,
        new_value TEXT,
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_status_history_issue ON issue_status_history (issue_id, created_at DESC)');
    await db.query('CREATE INDEX idx_status_history_actor ON issue_status_history (actor_id)');
  }

  // ============================================
  // DEVELOPMENT UPDATES / ANNOUNCEMENTS
  // ============================================
  if (!(await tableExists('dev_updates'))) {
    log.info('Creating dev_updates table...');
    await db.query(`
      CREATE TABLE dev_updates (
        id TEXT PRIMARY KEY DEFAULT 'upd_' || replace(uuid_generate_v4()::text, '-', ''),
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        type SMALLINT NOT NULL DEFAULT 0,
        author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        related_issue_ids TEXT[] DEFAULT '{}',
        is_published BOOLEAN DEFAULT FALSE,
        published_at TIMESTAMPTZ,
        view_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Type: 0=update, 1=release, 2=announcement, 3=bugfix, 4=maintenance

    await db.query('CREATE INDEX idx_updates_published ON dev_updates (published_at DESC) WHERE is_published = TRUE');
    await db.query('CREATE INDEX idx_updates_type ON dev_updates (type) WHERE is_published = TRUE');
    await db.query('CREATE INDEX idx_updates_author ON dev_updates (author_id)');
  }

  // ============================================
  // ROADMAP ITEMS
  // ============================================
  if (!(await tableExists('roadmap_items'))) {
    log.info('Creating roadmap_items table...');
    await db.query(`
      CREATE TABLE roadmap_items (
        id TEXT PRIMARY KEY DEFAULT 'rm_' || replace(uuid_generate_v4()::text, '-', ''),
        title VARCHAR(200) NOT NULL,
        description TEXT,
        status SMALLINT NOT NULL DEFAULT 0,
        quarter VARCHAR(10),
        category VARCHAR(50),
        progress SMALLINT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        related_issue_ids TEXT[] DEFAULT '{}',
        vote_count INTEGER DEFAULT 0,
        display_order SMALLINT DEFAULT 0,
        is_public BOOLEAN DEFAULT TRUE,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Status: 0=planned, 1=in_progress, 2=completed, 3=paused, 4=cancelled

    await db.query('CREATE INDEX idx_roadmap_status ON roadmap_items (status, display_order) WHERE is_public = TRUE');
    await db.query('CREATE INDEX idx_roadmap_quarter ON roadmap_items (quarter) WHERE is_public = TRUE');
  }

  // ============================================
  // ROADMAP VOTES
  // ============================================
  if (!(await tableExists('roadmap_votes'))) {
    log.info('Creating roadmap_votes table...');
    await db.query(`
      CREATE TABLE roadmap_votes (
        roadmap_id TEXT NOT NULL REFERENCES roadmap_items(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (roadmap_id, user_id)
      )
    `);

    await db.query('CREATE INDEX idx_roadmap_votes_item ON roadmap_votes (roadmap_id)');

    // Vote count trigger for roadmap
    await db.query(`
      CREATE OR REPLACE FUNCTION update_roadmap_vote_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE roadmap_items SET vote_count = vote_count + 1 WHERE id = NEW.roadmap_id;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE roadmap_items SET vote_count = GREATEST(vote_count - 1, 0) WHERE id = OLD.roadmap_id;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql
    `);

    await db.query(`
      CREATE TRIGGER trg_roadmap_vote_count
      AFTER INSERT OR DELETE ON roadmap_votes
      FOR EACH ROW EXECUTE FUNCTION update_roadmap_vote_count()
    `);
  }

  // ============================================
  // UPDATED_AT TRIGGERS
  // ============================================
  log.info('Setting up updated_at triggers...');

  const tablesNeedingTriggers = ['issues', 'issue_comments', 'dev_updates', 'roadmap_items'];

  for (const table of tablesNeedingTriggers) {
    if (await tableExists(table)) {
      try {
        await db.query(`DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table}`);
        await db.query(`
          CREATE TRIGGER update_${table}_updated_at
          BEFORE UPDATE ON ${table}
          FOR EACH ROW EXECUTE FUNCTION update_updated_at()
        `);
      } catch (e: any) {
        log.debug(`Could not create trigger for ${table}`, { error: e.message });
      }
    }
  }

  // ============================================
  // ANALYZE TABLES
  // ============================================
  log.info('Analyzing new tables...');
  const newTables = [
    'issue_labels',
    'issues',
    'issue_comments',
    'issue_votes',
    'issue_subscribers',
    'issue_status_history',
    'dev_updates',
    'roadmap_items',
    'roadmap_votes',
  ];

  for (const table of newTables) {
    if (await tableExists(table)) {
      try {
        await db.query(`ANALYZE ${table}`);
      } catch (e) {
        log.debug(`Could not analyze ${table}`);
      }
    }
  }

  log.info('Migration 008_issue_tracker complete');
}

// Alias for compatibility
export const up = migrate;
