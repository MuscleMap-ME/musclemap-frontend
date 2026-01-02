-- MuscleMap PostgreSQL Schema
-- Optimized for performance with proper indexes, constraints, and foreign keys

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fast text search

-- ============================================
-- CORE TABLES
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT 'user_' || replace(uuid_generate_v4()::text, '-', ''),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  roles JSONB DEFAULT '["user"]'::jsonb,
  flags JSONB DEFAULT '{"verified":false,"banned":false,"suspended":false,"emailConfirmed":false}'::jsonb,
  current_archetype_id TEXT,
  current_level INTEGER DEFAULT 1,
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_username CHECK (username ~* '^[a-zA-Z0-9_]{3,30}$')
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN(roles);

-- Refresh tokens for JWT refresh mechanism
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY DEFAULT 'rt_' || replace(uuid_generate_v4()::text, '-', ''),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,

  CONSTRAINT token_not_expired CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash) WHERE revoked_at IS NULL;

-- ============================================
-- ECONOMY TABLES
-- ============================================

-- Credit balances with version for optimistic locking
CREATE TABLE IF NOT EXISTS credit_balances (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_earned >= 0),
  lifetime_spent INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_spent >= 0),
  version INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit transaction ledger (immutable)
CREATE TABLE IF NOT EXISTS credit_ledger (
  id TEXT PRIMARY KEY DEFAULT 'txn_' || replace(uuid_generate_v4()::text, '-', ''),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  metadata JSONB,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON credit_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_created ON credit_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_action ON credit_ledger(action);

-- Credit actions (premium features)
CREATE TABLE IF NOT EXISTS credit_actions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_cost INTEGER NOT NULL CHECK (default_cost >= 0),
  plugin_id TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY DEFAULT 'purch_' || replace(uuid_generate_v4()::text, '-', ''),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier_id TEXT NOT NULL,
  credits INTEGER NOT NULL CHECK (credits > 0),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  stripe_payment_id TEXT,
  stripe_session_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status) WHERE status = 'pending';

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY DEFAULT 'sub_' || replace(uuid_generate_v4()::text, '-', ''),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'past_due', 'canceled', 'unpaid')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status) WHERE status = 'active';

-- ============================================
-- FITNESS DATA TABLES
-- ============================================

-- Muscles
CREATE TABLE IF NOT EXISTS muscles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  anatomical_name TEXT,
  muscle_group TEXT NOT NULL,
  bias_weight REAL NOT NULL CHECK (bias_weight > 0),
  optimal_weekly_volume INTEGER,
  recovery_time INTEGER
);

CREATE INDEX IF NOT EXISTS idx_muscles_group ON muscles(muscle_group);

-- Exercises
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  difficulty INTEGER DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 5),
  description TEXT,
  cues TEXT,
  primary_muscles TEXT[],
  equipment_required JSONB DEFAULT '[]'::jsonb,
  equipment_optional JSONB DEFAULT '[]'::jsonb,
  locations JSONB DEFAULT '["gym"]'::jsonb,
  is_compound BOOLEAN DEFAULT FALSE,
  estimated_seconds INTEGER DEFAULT 45 CHECK (estimated_seconds > 0),
  rest_seconds INTEGER DEFAULT 60 CHECK (rest_seconds >= 0),
  movement_pattern TEXT
);

CREATE INDEX IF NOT EXISTS idx_exercises_type ON exercises(type);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON exercises(difficulty);
CREATE INDEX IF NOT EXISTS idx_exercises_name_trgm ON exercises USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_exercises_locations ON exercises USING GIN(locations);

-- Exercise muscle activations
CREATE TABLE IF NOT EXISTS exercise_activations (
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  muscle_id TEXT NOT NULL REFERENCES muscles(id) ON DELETE CASCADE,
  activation INTEGER NOT NULL CHECK (activation BETWEEN 0 AND 100),
  PRIMARY KEY (exercise_id, muscle_id)
);

CREATE INDEX IF NOT EXISTS idx_exercise_activations_muscle ON exercise_activations(muscle_id);

-- Workouts
CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY DEFAULT 'workout_' || replace(uuid_generate_v4()::text, '-', ''),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_tu REAL NOT NULL CHECK (total_tu >= 0),
  credits_used INTEGER NOT NULL DEFAULT 25 CHECK (credits_used >= 0),
  notes TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  exercise_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  muscle_activations JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workouts_user ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_public ON workouts(created_at DESC) WHERE is_public = TRUE;

-- Prescriptions (generated workout plans)
CREATE TABLE IF NOT EXISTS prescriptions (
  id TEXT PRIMARY KEY DEFAULT 'rx_' || replace(uuid_generate_v4()::text, '-', ''),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  constraints JSONB NOT NULL,
  exercises JSONB NOT NULL,
  warmup JSONB,
  cooldown JSONB,
  substitutions JSONB,
  muscle_coverage JSONB NOT NULL,
  estimated_duration INTEGER NOT NULL CHECK (estimated_duration > 0),
  actual_duration INTEGER NOT NULL CHECK (actual_duration > 0),
  credit_cost INTEGER NOT NULL DEFAULT 1 CHECK (credit_cost >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_user ON prescriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_created ON prescriptions(created_at DESC);

-- ============================================
-- ARCHETYPES & PROGRESSION
-- ============================================

-- Archetypes (fitness philosophies)
CREATE TABLE IF NOT EXISTS archetypes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  philosophy TEXT,
  description TEXT,
  focus_areas JSONB,
  icon_url TEXT
);

-- Archetype levels
CREATE TABLE IF NOT EXISTS archetype_levels (
  id SERIAL PRIMARY KEY,
  archetype_id TEXT NOT NULL REFERENCES archetypes(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level > 0),
  name TEXT NOT NULL,
  total_tu INTEGER NOT NULL CHECK (total_tu >= 0),
  description TEXT,
  muscle_targets JSONB,
  UNIQUE(archetype_id, level)
);

CREATE INDEX IF NOT EXISTS idx_archetype_levels_archetype ON archetype_levels(archetype_id);

-- ============================================
-- COMMUNITY TABLES
-- ============================================

-- Groups
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY DEFAULT 'grp_' || replace(uuid_generate_v4()::text, '-', ''),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_owner ON groups(owner_id);

-- Group memberships
CREATE TABLE IF NOT EXISTS group_memberships (
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin', 'owner')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_memberships_user ON group_memberships(user_id);

-- Competitions
CREATE TABLE IF NOT EXISTS competitions (
  id TEXT PRIMARY KEY DEFAULT 'comp_' || replace(uuid_generate_v4()::text, '-', ''),
  name TEXT NOT NULL,
  description TEXT,
  creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'total_tu' CHECK (type IN ('total_tu', 'streak', 'workouts', 'custom')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'canceled')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  max_participants INTEGER,
  entry_fee INTEGER CHECK (entry_fee IS NULL OR entry_fee >= 0),
  prize_pool INTEGER CHECK (prize_pool IS NULL OR prize_pool >= 0),
  rules JSONB,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_dates CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_competitions_status ON competitions(status);
CREATE INDEX IF NOT EXISTS idx_competitions_dates ON competitions(start_date, end_date);

-- Competition participants
CREATE TABLE IF NOT EXISTS competition_participants (
  competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score REAL NOT NULL DEFAULT 0,
  rank INTEGER,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (competition_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_competition_participants_score ON competition_participants(competition_id, score DESC);

-- Activity events (for community feed)
CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY DEFAULT 'evt_' || replace(uuid_generate_v4()::text, '-', ''),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  visibility_scope TEXT NOT NULL DEFAULT 'public_anon' CHECK (visibility_scope IN ('public_anon', 'public_profile', 'private')),
  geo_bucket TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_created ON activity_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_user ON activity_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_events_visibility ON activity_events(visibility_scope, created_at DESC);

-- ============================================
-- MESSAGING TABLES
-- ============================================

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY DEFAULT 'conv_' || replace(uuid_generate_v4()::text, '-', ''),
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  name TEXT,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC NULLS LAST);

-- Conversation participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  muted BOOLEAN DEFAULT FALSE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'owner')),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY DEFAULT 'msg_' || replace(uuid_generate_v4()::text, '-', ''),
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'file', 'system')),
  reply_to_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- Message attachments
CREATE TABLE IF NOT EXISTS message_attachments (
  id TEXT PRIMARY KEY DEFAULT 'att_' || replace(uuid_generate_v4()::text, '-', ''),
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0),
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  moderation_result TEXT,
  moderation_scores JSONB,
  moderated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id);

-- User blocks
CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

-- ============================================
-- TIPS & MILESTONES
-- ============================================

-- Tips
CREATE TABLE IF NOT EXISTS tips (
  id TEXT PRIMARY KEY DEFAULT 'tip_' || replace(uuid_generate_v4()::text, '-', ''),
  trigger_type TEXT NOT NULL,
  trigger_value TEXT,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  display_context TEXT[],
  min_level INTEGER DEFAULT 1,
  max_level INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tips_trigger ON tips(trigger_type, trigger_value);
CREATE INDEX IF NOT EXISTS idx_tips_category ON tips(category);

-- User tips seen
CREATE TABLE IF NOT EXISTS user_tips_seen (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tip_id TEXT NOT NULL REFERENCES tips(id) ON DELETE CASCADE,
  seen_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, tip_id)
);

-- Milestones
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY DEFAULT 'ms_' || replace(uuid_generate_v4()::text, '-', ''),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  condition_type TEXT NOT NULL,
  condition_value JSONB NOT NULL,
  reward_credits INTEGER DEFAULT 0 CHECK (reward_credits >= 0),
  badge_icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_category ON milestones(category);

-- User milestone progress
CREATE TABLE IF NOT EXISTS user_milestone_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  milestone_id TEXT NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  reward_claimed BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (user_id, milestone_id)
);

CREATE INDEX IF NOT EXISTS idx_user_milestone_progress_completed ON user_milestone_progress(completed_at) WHERE completed_at IS NOT NULL;

-- ============================================
-- PLUGINS
-- ============================================

CREATE TABLE IF NOT EXISTS installed_plugins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  display_name TEXT,
  description TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  config JSONB,
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_installed_plugins_updated_at ON installed_plugins;
CREATE TRIGGER update_installed_plugins_updated_at
  BEFORE UPDATE ON installed_plugins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Credit balance update function with optimistic locking
CREATE OR REPLACE FUNCTION update_credit_balance(
  p_user_id TEXT,
  p_amount INTEGER,
  p_action TEXT,
  p_metadata JSONB,
  p_idempotency_key TEXT,
  p_expected_version INTEGER
) RETURNS TABLE(success BOOLEAN, new_balance INTEGER, entry_id TEXT, error_message TEXT) AS $$
DECLARE
  v_current_balance INTEGER;
  v_current_version INTEGER;
  v_new_balance INTEGER;
  v_entry_id TEXT;
BEGIN
  -- Check for existing idempotent transaction
  SELECT id, balance_after INTO v_entry_id, v_new_balance
  FROM credit_ledger
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN QUERY SELECT TRUE, v_new_balance, v_entry_id, NULL::TEXT;
    RETURN;
  END IF;

  -- Get current balance with lock
  SELECT balance, version INTO v_current_balance, v_current_version
  FROM credit_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, NULL::TEXT, 'User has no credit account'::TEXT;
    RETURN;
  END IF;

  -- Check version for optimistic locking
  IF v_current_version != p_expected_version THEN
    RETURN QUERY SELECT FALSE, v_current_balance, NULL::TEXT, 'Concurrent modification detected'::TEXT;
    RETURN;
  END IF;

  v_new_balance := v_current_balance + p_amount;

  IF v_new_balance < 0 THEN
    RETURN QUERY SELECT FALSE, v_current_balance, NULL::TEXT, 'Insufficient credits'::TEXT;
    RETURN;
  END IF;

  -- Update balance
  UPDATE credit_balances
  SET balance = v_new_balance,
      lifetime_spent = CASE WHEN p_amount < 0 THEN lifetime_spent + ABS(p_amount) ELSE lifetime_spent END,
      lifetime_earned = CASE WHEN p_amount > 0 THEN lifetime_earned + p_amount ELSE lifetime_earned END,
      version = version + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Insert ledger entry
  v_entry_id := 'txn_' || replace(uuid_generate_v4()::text, '-', '');

  INSERT INTO credit_ledger (id, user_id, action, amount, balance_after, metadata, idempotency_key)
  VALUES (v_entry_id, p_user_id, p_action, p_amount, v_new_balance, p_metadata, p_idempotency_key);

  RETURN QUERY SELECT TRUE, v_new_balance, v_entry_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS
-- ============================================

-- Active users view (for analytics)
CREATE OR REPLACE VIEW active_users AS
SELECT
  u.id,
  u.username,
  u.display_name,
  u.current_archetype_id,
  u.current_level,
  cb.balance as credit_balance,
  (
    SELECT COUNT(*)
    FROM workouts w
    WHERE w.user_id = u.id
    AND w.date >= CURRENT_DATE - INTERVAL '7 days'
  ) as workouts_this_week,
  (
    SELECT COALESCE(SUM(w.total_tu), 0)
    FROM workouts w
    WHERE w.user_id = u.id
  ) as total_tu
FROM users u
LEFT JOIN credit_balances cb ON cb.user_id = u.id
WHERE u.flags->>'banned' = 'false'
  AND u.flags->>'suspended' = 'false';

-- Leaderboard view
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  u.id as user_id,
  u.username,
  u.display_name,
  u.avatar_url,
  u.current_archetype_id,
  u.current_level,
  COALESCE(SUM(w.total_tu), 0) as total_tu,
  COUNT(w.id) as workout_count,
  RANK() OVER (ORDER BY COALESCE(SUM(w.total_tu), 0) DESC) as rank
FROM users u
LEFT JOIN workouts w ON w.user_id = u.id AND w.is_public = TRUE
WHERE u.flags->>'banned' = 'false'
GROUP BY u.id
ORDER BY total_tu DESC;
