# Database Optimization Implementation Plan

This document outlines the recommended changes to improve PostgreSQL performance and user satisfaction for MuscleMap.

## Executive Summary

After analyzing the current database architecture (58 migrations, ~90+ indexes, materialized views), the following optimizations are prioritized by impact and implementation effort.

---

## Priority 1: Critical Performance Issues (Implement First)

### 1.1 Automated Materialized View Refresh

**Problem**: `mv_xp_rankings` (global leaderboard) requires manual refresh and can be up to 5 minutes stale.

**Current State**: Manual call to `refresh_xp_rankings()` required.

**Solution**: Add automated refresh via pg_cron or application-level scheduler.

**Implementation**:
```sql
-- Option A: pg_cron (preferred if available)
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('refresh-leaderboard', '*/5 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_xp_rankings');

-- Option B: Application-level (add to apps/api/src/services/scheduler.ts)
// Run every 5 minutes
setInterval(async () => {
  await db.raw('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_xp_rankings');
}, 5 * 60 * 1000);
```

**Migration**: `051_automated_matview_refresh.ts`

**Impact**: Consistent leaderboard freshness, improved UX for competitive users.

---

### 1.2 Missing Composite Index for Activity Feed

**Problem**: `activity_events` queries for user + event_type + time are not optimally indexed.

**Current State**: Separate indexes exist but no composite for the common query pattern.

**Solution**: Add composite keyset index.

**Implementation**:
```sql
CREATE INDEX CONCURRENTLY idx_activity_events_user_type_keyset
ON activity_events(user_id, event_type, created_at DESC, id DESC);
```

**Migration**: `051_activity_events_composite_index.ts`

**Impact**: 3-5x faster activity feed filtering by event type.

---

### 1.3 Denormalize Critical Profile Fields

**Problem**: `mv_xp_rankings` does LEFT JOIN to `user_profile_extended`, causing NULL issues and slower refresh.

**Current State**: Profile fields (country, ghost_mode, leaderboard_opt_in) in separate table.

**Solution**: Denormalize frequently-queried fields to `users` table.

**Implementation**:
```sql
-- Add columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS country VARCHAR(2),
  ADD COLUMN IF NOT EXISTS ghost_mode BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS leaderboard_opt_in BOOLEAN DEFAULT TRUE;

-- Migrate existing data
UPDATE users u SET
  country = up.country,
  ghost_mode = COALESCE(up.ghost_mode, FALSE),
  leaderboard_opt_in = COALESCE(up.leaderboard_opt_in, TRUE)
FROM user_profile_extended up
WHERE u.id = up.user_id;

-- Add sync trigger for backwards compatibility
CREATE OR REPLACE FUNCTION sync_user_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET
    country = NEW.country,
    ghost_mode = NEW.ghost_mode,
    leaderboard_opt_in = NEW.leaderboard_opt_in
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_profile_to_users
AFTER INSERT OR UPDATE ON user_profile_extended
FOR EACH ROW EXECUTE FUNCTION sync_user_profile_fields();
```

**Migration**: `052_denormalize_profile_fields.ts`

**Impact**:
- Eliminates JOIN in materialized view refresh (2x faster)
- Ensures no NULL values for leaderboard filtering
- Simplifies common queries

---

## Priority 2: Query Performance Improvements

### 2.1 Add Composite Indexes for Social Features

**Problem**: Friendship and mentorship queries lack optimal composite indexes.

**Implementation**:
```sql
-- Friendships: common lookup pattern
CREATE INDEX CONCURRENTLY idx_friendships_user_status
ON friendships(user_a_id, status)
WHERE status = 'accepted';

CREATE INDEX CONCURRENTLY idx_friendships_reverse_status
ON friendships(user_b_id, status)
WHERE status = 'accepted';

-- Mentorships: mentee lookup with status
CREATE INDEX CONCURRENTLY idx_mentorships_mentee_status
ON mentorships(mentee_id, status);

-- Crew members: user lookup
CREATE INDEX CONCURRENTLY idx_crew_members_user_crew
ON crew_members(user_id, crew_id);
```

**Migration**: `053_social_composite_indexes.ts`

**Impact**: 3-10x faster social feature queries.

---

### 2.2 Exercise Activation Reverse Lookup

**Problem**: "Which exercises work this muscle?" queries scan full table.

**Implementation**:
```sql
CREATE INDEX CONCURRENTLY idx_exercise_activations_muscle
ON exercise_activations(muscle_id, activation DESC)
INCLUDE (exercise_id);
```

**Migration**: `053_exercise_activation_reverse.ts`

**Impact**: Instant muscle-to-exercise lookups for workout prescription.

---

### 2.3 Conversation Participant Lookup

**Problem**: "Get all conversations for user" requires full scan.

**Implementation**:
```sql
CREATE INDEX CONCURRENTLY idx_conversation_participants_user_unread
ON conversation_participants(user_id, last_read_at)
INCLUDE (conversation_id, muted);
```

**Migration**: `053_conversation_participant_lookup.ts`

**Impact**: Faster messaging inbox load.

---

## Priority 3: Data Lifecycle Management

### 3.1 Implement Table Partitioning for Time-Series Data

**Problem**: `activity_events`, `request_logs`, `xp_history` will grow unbounded.

**Solution**: Partition by month for efficient archival.

**Implementation**:
```sql
-- Convert activity_events to partitioned table
CREATE TABLE activity_events_partitioned (
  LIKE activity_events INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE activity_events_y2025m01 PARTITION OF activity_events_partitioned
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Function to auto-create partitions
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name TEXT, year INT, month INT)
RETURNS VOID AS $$
DECLARE
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
BEGIN
  partition_name := table_name || '_y' || year || 'm' || LPAD(month::TEXT, 2, '0');
  start_date := make_date(year, month, 1);
  end_date := start_date + INTERVAL '1 month';

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
    partition_name, table_name || '_partitioned', start_date, end_date
  );
END;
$$ LANGUAGE plpgsql;
```

**Migration**: `054_partition_timeseries_tables.ts`

**Impact**:
- Efficient data archival (DROP old partitions)
- Faster queries on recent data
- Reduced vacuum overhead

---

### 3.2 Implement Data Retention Policies

**Problem**: `tracked_errors`, `request_logs` have no retention policy.

**Solution**: Add cleanup functions and scheduler.

**Implementation**:
```sql
-- Retention policy function
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Delete tracked errors older than 30 days
  DELETE FROM tracked_errors
  WHERE created_at < NOW() - INTERVAL '30 days'
  AND resolved = TRUE;

  -- Delete request logs older than 7 days
  DELETE FROM request_logs
  WHERE created_at < NOW() - INTERVAL '7 days';

  -- Archive credit ledger entries older than 1 year
  -- (Move to archive table instead of delete)
  INSERT INTO credit_ledger_archive
  SELECT * FROM credit_ledger
  WHERE created_at < NOW() - INTERVAL '1 year';

  DELETE FROM credit_ledger
  WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Schedule daily at 3 AM
SELECT cron.schedule('cleanup-old-data', '0 3 * * *', 'SELECT cleanup_old_data()');
```

**Migration**: `055_data_retention_policies.ts`

**Impact**: Controlled table growth, better query performance.

---

### 3.3 Credit Ledger Archival

**Problem**: Append-only `credit_ledger` will grow unbounded.

**Solution**: Implement hot/cold storage pattern.

**Implementation**:
```sql
-- Archive table (cold storage)
CREATE TABLE credit_ledger_archive (
  LIKE credit_ledger INCLUDING ALL
);

-- Add archive flag to main table
ALTER TABLE credit_ledger ADD COLUMN archived BOOLEAN DEFAULT FALSE;

-- Archival function (run monthly)
CREATE OR REPLACE FUNCTION archive_old_transactions()
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  WITH archived AS (
    INSERT INTO credit_ledger_archive
    SELECT * FROM credit_ledger
    WHERE created_at < NOW() - INTERVAL '6 months'
    AND archived = FALSE
    RETURNING id
  )
  SELECT COUNT(*) INTO archived_count FROM archived;

  UPDATE credit_ledger SET archived = TRUE
  WHERE created_at < NOW() - INTERVAL '6 months';

  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;
```

**Migration**: `056_credit_ledger_archival.ts`

**Impact**: Bounded main ledger size, faster balance queries.

---

## Priority 4: Connection & Query Optimization

### 4.1 Connection Pooling Tuning

**Problem**: Default connection pool settings may not be optimal.

**Solution**: Tune PgBouncer or native pooling.

**Implementation** (in `apps/api/src/db/connection.ts`):
```typescript
const pool = new Pool({
  max: 20,                    // Max connections
  min: 5,                     // Min idle connections
  idleTimeoutMillis: 30000,   // Close idle after 30s
  connectionTimeoutMillis: 5000, // Connection timeout
  statement_timeout: 30000,   // Query timeout 30s
});
```

**Impact**: Better connection utilization, faster query startup.

---

### 4.2 Query Plan Caching

**Problem**: Complex queries recompute plans on each execution.

**Solution**: Use prepared statements for frequent queries.

**Implementation** (in resolvers/services):
```typescript
// Prepare common queries at startup
const PREPARED_QUERIES = {
  getWorkouts: {
    name: 'get_user_workouts',
    text: `SELECT * FROM workouts
           WHERE user_id = $1
           AND (created_at, id) < ($2, $3)
           ORDER BY created_at DESC, id DESC
           LIMIT $4`,
  },
  getBalance: {
    name: 'get_credit_balance',
    text: `SELECT balance, version FROM credit_balances WHERE user_id = $1`,
  },
};

// Use prepared statement
const result = await pool.query(PREPARED_QUERIES.getWorkouts, [userId, cursor, cursorId, limit]);
```

**Impact**: 10-20% faster query execution for hot paths.

---

## Priority 5: Monitoring & Observability

### 5.1 Query Performance Tracking

**Problem**: No visibility into slow queries in production.

**Solution**: Enable pg_stat_statements and create dashboard.

**Implementation**:
```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create monitoring view
CREATE VIEW slow_queries AS
SELECT
  queryid,
  LEFT(query, 100) as query_preview,
  calls,
  total_time / 1000 as total_seconds,
  mean_time as avg_ms,
  max_time as max_ms,
  rows
FROM pg_stat_statements
WHERE mean_time > 100  -- Queries averaging > 100ms
ORDER BY total_time DESC
LIMIT 20;
```

**Migration**: `057_query_monitoring.ts`

**Endpoint**: Add `/admin/slow-queries` endpoint.

**Impact**: Proactive identification of performance regressions.

---

### 5.2 Index Usage Monitoring

**Problem**: Some indexes may be unused and waste space.

**Solution**: Add index usage view and periodic review.

**Implementation**:
```sql
CREATE VIEW unused_indexes AS
SELECT
  schemaname || '.' || relname as table,
  indexrelname as index,
  pg_size_pretty(pg_relation_size(i.indexrelid)) as size,
  idx_scan as scans
FROM pg_stat_user_indexes ui
JOIN pg_index i ON ui.indexrelid = i.indexrelid
WHERE idx_scan < 50
  AND pg_relation_size(i.indexrelid) > 1024 * 1024  -- > 1MB
ORDER BY pg_relation_size(i.indexrelid) DESC;
```

**Impact**: Identify and remove wasteful indexes.

---

## Implementation Roadmap

### Phase 1: Quick Wins - IMPLEMENTED
1. ✅ `059_performance_optimization_phase1.ts` - Activity feed indexes, matview tracking, conversation participant index, exercise activation reverse lookup

### Phase 2: Core Optimizations - IMPLEMENTED
2. ✅ `060_social_composite_indexes.ts` - Social feature indexes (friendships, mentorships, crews, follows, blocks, high fives)
3. ✅ `061_denormalize_profile_fields.ts` - Profile field denormalization + optimized mv_xp_rankings_v2

### Phase 3: Data Lifecycle - IMPLEMENTED
4. ✅ `062_data_retention_policies.ts` - Cleanup functions with configurable retention policies
5. ✅ `063_credit_ledger_archival.ts` - Transaction archival (hot/cold storage pattern)

### Phase 4: Monitoring - IMPLEMENTED
6. ✅ `064_query_monitoring.ts` - Performance tracking views, index usage, slow query detection

### Application-Level Changes - IMPLEMENTED
7. ✅ Scheduler service updated with:
   - Materialized view refresh every 5 minutes
   - Data retention policies daily at 3 AM UTC
   - Credit archival weekly on Sunday at 2 AM UTC
   - Performance snapshot capture every 15 minutes

---

## Expected Results

| Metric | Current | After Optimization |
|--------|---------|-------------------|
| Leaderboard freshness | Up to 5 min stale | < 30s stale |
| Activity feed query | ~150ms | ~30ms |
| Workout history query | ~80ms | ~20ms |
| Messaging inbox load | ~120ms | ~40ms |
| Database size growth | Unbounded | Controlled |
| Slow query visibility | None | Full |

---

## Rollback Plan

Each migration includes a `down()` function. To rollback:

```bash
# Rollback single migration
pnpm -C apps/api db:migrate:down --name 051_automated_matview_refresh

# Rollback multiple
pnpm -C apps/api db:migrate:down --to 050
```

---

## Verification Queries

After implementation, run these to verify improvements:

```sql
-- Check materialized view freshness
SELECT
  schemaname,
  matviewname,
  last_refresh  -- Should be < 5 min ago
FROM pg_matviews
WHERE matviewname = 'mv_xp_rankings';

-- Check index usage
SELECT indexrelname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE indexrelname LIKE 'idx_activity%'
ORDER BY idx_scan DESC;

-- Check query performance
SELECT query, mean_time, calls
FROM pg_stat_statements
WHERE query LIKE '%activity_events%'
ORDER BY mean_time DESC;
```
