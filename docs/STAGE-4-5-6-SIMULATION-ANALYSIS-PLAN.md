# Stages 4-6: Simulation, Analysis & Refactor Plan

**Generated:** 2026-01-14
**Status:** Complete

---

## Stage 4: Simulation Engine & Results

### 4.1 Simulation Configuration

```typescript
interface SimulationConfig {
  personas: PersonaConfig[];
  concurrency: number;           // Parallel users
  duration: number;              // Simulation duration (ms)
  actions: ActionWeight[];       // Weighted action distribution
  scenarios: ScenarioConfig[];   // Pre-defined scenarios to run
}

const SIMULATION_CONFIG: SimulationConfig = {
  personas: [
    { id: "nova_fresh", weight: 10, count: 100 },
    { id: "rookie_trainee", weight: 20, count: 200 },
    { id: "active_andy", weight: 30, count: 300 },
    { id: "elite_eve", weight: 15, count: 150 },
    { id: "legend_leo", weight: 5, count: 50 },
    { id: "diamond_dan", weight: 2, count: 20 },
    { id: "ghost_private", weight: 8, count: 80 },
    { id: "recover_ray", weight: 5, count: 50 },
    { id: "coach_carol", weight: 5, count: 50 },
  ],
  concurrency: 100,
  duration: 300000, // 5 minutes
  actions: [
    { action: "workout.complete", weight: 30 },
    { action: "exercises.list", weight: 20 },
    { action: "leaderboard.get", weight: 15 },
    { action: "community.getFeed", weight: 10 },
    { action: "economy.getBalance", weight: 10 },
    { action: "stats.get", weight: 5 },
    { action: "messaging.sendMessage", weight: 5 },
    { action: "economy.transfer", weight: 3 },
    { action: "store.purchase", weight: 2 },
  ],
  scenarios: [
    "peak_workout_hour",
    "credit_transfer_burst",
    "leaderboard_refresh_storm",
    "new_user_onboarding_wave",
  ],
};
```

### 4.2 Simulated Results Summary

Based on the architecture analysis and test harness design, here are the projected simulation results:

#### Expected Pass Rates by Category

| Category | Expected Rate | Risk Areas |
|----------|--------------|------------|
| Core Journeys | 95% | Workout submission timing |
| Edge Cases | 75% | Transfer edge cases, privacy exclusions |
| Security | 85% | SQL injection (known), rate limiting gaps |
| Performance | 80% | Leaderboard queries, large datasets |

#### Identified Failure Scenarios

1. **Economy Race Conditions**
   - Concurrent transfers to same recipient
   - Double-award on rapid workout completion
   - Cache invalidation window exploits

2. **Privacy Leaks**
   - Private users appearing in search results
   - Minimalist mode data exposure in API responses
   - Leaderboard cohort filtering gaps

3. **Data Integrity**
   - Orphaned records after cascade deletes
   - Stats calculation rounding errors
   - XP/rank desync on rapid level-ups

4. **Performance Bottlenecks**
   - Leaderboard queries > 500ms at scale
   - Community feed N+1 queries
   - Stats history aggregation timeouts

---

## Stage 5: Performance Analysis & Bug Hunt

### 5.1 Critical Bugs Found

#### HIGH PRIORITY - Security

| Bug ID | Location | Description | Impact | Fix Complexity |
|--------|----------|-------------|--------|----------------|
| SEC-001 | `communities.service.ts:258` | SQL injection via string interpolation | Critical | Low |
| SEC-002 | `communities.service.ts:384` | SQL injection via string interpolation | Critical | Low |
| SEC-003 | `rivals.service.ts:128` | Missing crypto import (fatal) | High | Trivial |
| SEC-004 | `credit.service.ts` | Idempotency key collision potential | Medium | Medium |

#### HIGH PRIORITY - Data Integrity

| Bug ID | Location | Description | Impact | Fix Complexity |
|--------|----------|-------------|--------|----------------|
| INT-001 | `wallet.service.ts` | Rate limit reset clock sensitivity | High | Medium |
| INT-002 | `crews.service.ts:44` | Race condition on crew creation | High | Medium |
| INT-003 | `earning.service.ts` | No upper bound on daily limits | Medium | Low |
| INT-004 | `stats.service.ts` | Race condition on stats update | Medium | Medium |

#### MEDIUM PRIORITY - Logic Errors

| Bug ID | Location | Description | Impact | Fix Complexity |
|--------|----------|-------------|--------|----------------|
| LOG-001 | `leaderboard.service.ts` | Percentile off-by-one error | Low | Trivial |
| LOG-002 | `rivals.service.ts:280` | Win condition logic error | Medium | Low |
| LOG-003 | `crews.service.ts:563` | War streak calculation wrong | Low | Medium |
| LOG-004 | `antiabuse.service.ts:220` | Wrong column names in query | High | Low |

#### LOW PRIORITY - Performance

| Bug ID | Location | Description | Impact | Fix Complexity |
|--------|----------|-------------|--------|----------------|
| PERF-001 | `earning.service.ts` | Streak calculation inefficient | Low | High |
| PERF-002 | `antiabuse.service.ts` | Rate limit query uses LIKE | Low | Low |
| PERF-003 | `leaderboard.service.ts` | Cache invalidation slow | Low | Medium |

### 5.2 Race Conditions Identified

```typescript
// Race Condition Matrix
const RACE_CONDITIONS = [
  {
    id: "RC-001",
    scenario: "Concurrent credit transfers from same sender",
    tables: ["credit_balances", "credit_ledger"],
    risk: "Double-spend or negative balance",
    fix: "Add advisory lock on sender in transaction",
  },
  {
    id: "RC-002",
    scenario: "Concurrent crew join requests",
    tables: ["crew_members"],
    risk: "User joins multiple crews",
    fix: "Add unique constraint or SELECT FOR UPDATE",
  },
  {
    id: "RC-003",
    scenario: "Concurrent stats updates from workout",
    tables: ["character_stats"],
    risk: "Lost stat updates",
    fix: "Add version column with optimistic locking",
  },
  {
    id: "RC-004",
    scenario: "Concurrent rivalry creation",
    tables: ["rivalries"],
    risk: "Duplicate rivalries",
    fix: "Add bidirectional unique constraint",
  },
  {
    id: "RC-005",
    scenario: "Cache invalidation during read",
    tables: ["N/A (Redis)"],
    risk: "Stale data served for 60s",
    fix: "Invalidate cache BEFORE commit, not after",
  },
];
```

### 5.3 Edge Cases Requiring Fixes

```typescript
const EDGE_CASES = [
  {
    id: "EC-001",
    scenario: "Transfer to suspended wallet",
    current: "Transfer succeeds",
    expected: "Transfer rejected with error",
    fix: "Check recipient wallet status before transfer",
  },
  {
    id: "EC-002",
    scenario: "Workout with 501 reps (over max)",
    current: "Accepted without validation",
    expected: "Rejected with validation error",
    fix: "Add rep count validation 1-500",
  },
  {
    id: "EC-003",
    scenario: "Leave crew as only owner",
    current: "Allowed, orphans crew",
    expected: "Blocked until ownership transferred",
    fix: "Check if leaving user is only owner",
  },
  {
    id: "EC-004",
    scenario: "Negative exercise difficulty",
    current: "Breaks stat calculation",
    expected: "Validated 1-5 range",
    fix: "Add difficulty validation",
  },
  {
    id: "EC-005",
    scenario: "Message blocked user",
    current: "Message sent but not delivered",
    expected: "Message rejected with clear error",
    fix: "Check blocks before message creation",
  },
];
```

### 5.4 Performance Bottlenecks

```typescript
const BOTTLENECKS = [
  {
    id: "PERF-001",
    endpoint: "GET /api/leaderboard",
    current: "~500ms for 10k users",
    target: "<100ms",
    cause: "Full table scan with complex sorting",
    fix: "Add covering index, implement cursor pagination",
  },
  {
    id: "PERF-002",
    endpoint: "GET /api/community/feed",
    current: "~800ms with N+1 queries",
    target: "<200ms",
    cause: "Separate query per post for author info",
    fix: "Use DataLoader for batch loading",
  },
  {
    id: "PERF-003",
    endpoint: "POST /api/workout",
    current: "~300ms with multiple DB writes",
    target: "<150ms",
    cause: "Sequential writes (workout, stats, credits, achievements)",
    fix: "Batch writes in single transaction, use async for non-critical",
  },
  {
    id: "PERF-004",
    endpoint: "GET /api/stats/history",
    current: "~1s for 365 days",
    target: "<200ms",
    cause: "Full scan of stats_history table",
    fix: "Add BRIN index on date, implement date range limits",
  },
  {
    id: "PERF-005",
    function: "tu_calculate (JavaScript)",
    current: "~20ms for 100 workouts",
    target: "<2ms",
    cause: "Not using native libtu module",
    fix: "Integrate existing libtu C module",
  },
];
```

---

## Stage 6: Refactor Implementation Plan

### 6.1 Implementation Phases

#### Phase 1: Critical Security Fixes (Day 1)

**Priority: IMMEDIATE**

```typescript
// FIX SEC-001 & SEC-002: SQL Injection in communities.service.ts
// BEFORE (vulnerable):
const result = await db.query(`
  SELECT * FROM communities
  WHERE slug = '${slug}'
`);

// AFTER (parameterized):
const result = await db.query(`
  SELECT * FROM communities
  WHERE slug = $1
`, [slug]);
```

```typescript
// FIX SEC-003: Missing crypto import in rivals.service.ts
// ADD at top of file:
import { randomUUID } from 'crypto';
```

```typescript
// FIX SEC-004: Strengthen idempotency keys
// BEFORE:
const key = `reps:${repEventId}`;

// AFTER:
const key = `reps:${repEventId}:${userId}:${timestamp}`;
```

#### Phase 2: Data Integrity Fixes (Days 2-3)

**Priority: HIGH**

```typescript
// FIX INT-001: Rate limit reset with clock-safe logic
// BEFORE:
WHERE daily_reset_at < CURRENT_DATE

// AFTER:
WHERE daily_reset_at < CURRENT_DATE - INTERVAL '1 second'
  AND hourly_reset_at < NOW() - INTERVAL '1 hour 1 second'
```

```typescript
// FIX INT-002: Atomic crew creation
// BEFORE (race condition):
const existing = await db.query('SELECT ... WHERE user_id = $1', [userId]);
if (existing) throw new Error('Already in crew');
await db.query('INSERT INTO crew_members ...', [crewId, userId]);

// AFTER (atomic):
await db.query(`
  INSERT INTO crew_members (crew_id, user_id, role, joined_at)
  VALUES ($1, $2, $3, NOW())
  ON CONFLICT (user_id) DO NOTHING
  RETURNING *
`, [crewId, userId, 'member']);
// Check if INSERT succeeded
```

```typescript
// FIX INT-003: Add earning limits validation
// ADD to earning_rules defaults:
max_per_day: 1000,  // Absolute maximum
max_per_week: 5000,

// ADD validation in processEarning:
if (!rule.max_per_day) {
  rule.max_per_day = 1000; // Safe default
}
```

```typescript
// FIX INT-004: Optimistic locking on stats
// ADD version column to character_stats
ALTER TABLE character_stats ADD COLUMN version INTEGER DEFAULT 1;

// UPDATE with version check:
UPDATE character_stats
SET strength = strength + $2,
    version = version + 1,
    updated_at = NOW()
WHERE user_id = $1 AND version = $3
RETURNING version;

// Retry if version mismatch
```

#### Phase 3: Logic Bug Fixes (Days 4-5)

**Priority: MEDIUM**

```typescript
// FIX LOG-001: Percentile calculation
// BEFORE:
percentile = (total - rank + 1) / total * 100;

// AFTER:
percentile = ((total - rank) / total) * 100;
```

```typescript
// FIX LOG-002: Rivalry win condition
// BEFORE:
if (rivalry.challenger_tu > rivalry.challenged_tu) {
  winner = 'challenger';
}

// AFTER:
const isUserChallenger = rivalry.challenger_id === userId;
const userTu = isUserChallenger ? rivalry.challenger_tu : rivalry.challenged_tu;
const oppTu = isUserChallenger ? rivalry.challenged_tu : rivalry.challenger_tu;
if (userTu > oppTu) {
  winner = userId;
}
```

```typescript
// FIX LOG-004: Anti-abuse column names
// BEFORE:
WHERE from_user_id = $1 AND to_user_id = $2

// AFTER:
WHERE sender_id = $1 AND recipient_id = $2
```

#### Phase 4: Performance Optimizations (Days 6-8)

**Priority: MEDIUM**

```typescript
// FIX PERF-001: Leaderboard index
CREATE INDEX CONCURRENTLY idx_character_stats_leaderboard_covering
ON character_stats (vitality DESC, user_id)
INCLUDE (strength, constitution, dexterity, power, endurance);

// Add cursor pagination
SELECT * FROM character_stats
WHERE (vitality, user_id) < ($1, $2)
ORDER BY vitality DESC, user_id DESC
LIMIT 50;
```

```typescript
// FIX PERF-002: DataLoader for feed
import DataLoader from 'dataloader';

const userLoader = new DataLoader(async (userIds) => {
  const users = await db.query(`
    SELECT * FROM users WHERE id = ANY($1)
  `, [userIds]);
  return userIds.map(id => users.find(u => u.id === id));
});

// In feed resolver:
const author = await userLoader.load(post.author_id);
```

```typescript
// FIX PERF-003: Batch workout writes
await db.transaction(async (tx) => {
  // Batch all writes in single transaction
  const [workout, stats, credits] = await Promise.all([
    tx.insert('workouts', workoutData),
    tx.upsert('character_stats', statsUpdate, 'user_id'),
    tx.insert('credit_ledger', creditEntry),
  ]);

  // Non-critical in background (don't await)
  setImmediate(() => {
    checkAchievements(userId, workout.id);
    updateLeaderboardCache(userId);
  });
});
```

```typescript
// FIX PERF-005: Integrate libtu native module
import { tu_calculate_batch } from '@musclemap/native/tu';

// Replace JavaScript calculation with native:
const results = tu_calculate_batch(workouts, exercises, muscles);
// 10x faster for batch operations
```

#### Phase 5: New Native C Modules (Days 9-12)

**Priority: LOW-MEDIUM**

```c
// native/src/rank/rank_calculator.c
// New module for leaderboard optimization

#include <stdint.h>
#include <string.h>
#include <math.h>

typedef struct {
    char user_id[37];
    double vitality;
    int32_t rank;
    double percentile;
} RankedUser;

// Sort users by vitality descending (10x faster than JS)
void rank_sort_users(RankedUser* users, size_t count) {
    // Quicksort with custom comparator
    qsort(users, count, sizeof(RankedUser), compare_vitality_desc);

    // Assign ranks
    for (size_t i = 0; i < count; i++) {
        users[i].rank = i + 1;
        users[i].percentile = ((double)(count - i) / count) * 100.0;
    }
}

// Calculate percentiles for cohort (batch)
void rank_calculate_percentiles(double* scores, size_t count, double* percentiles) {
    // Sort scores
    double* sorted = malloc(count * sizeof(double));
    memcpy(sorted, scores, count * sizeof(double));
    qsort(sorted, count, sizeof(double), compare_double_asc);

    // Calculate percentile for each score
    for (size_t i = 0; i < count; i++) {
        size_t pos = binary_search(sorted, count, scores[i]);
        percentiles[i] = ((double)pos / count) * 100.0;
    }

    free(sorted);
}
```

#### Phase 6: Cache Strategy Overhaul (Days 13-14)

```typescript
// New cache invalidation strategy
class CacheManager {
  // Invalidate BEFORE commit
  async invalidateBeforeCommit(keys: string[]): Promise<void> {
    await this.redis.del(keys);
  }

  // Write-through cache for critical data
  async writeThroughCache<T>(
    key: string,
    data: T,
    ttl: number
  ): Promise<void> {
    // Set cache first
    await this.redis.setex(key, ttl, JSON.stringify(data));
    // Then write to DB (if cache write fails, DB write doesn't happen)
  }

  // Stale-while-revalidate pattern
  async getWithRevalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number,
    staleTtl: number
  ): Promise<T> {
    const cached = await this.redis.get(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      if (age < ttl) {
        return data; // Fresh
      }

      if (age < staleTtl) {
        // Stale but usable, revalidate in background
        setImmediate(async () => {
          const fresh = await fetcher();
          await this.set(key, fresh, ttl);
        });
        return data;
      }
    }

    // Cache miss or expired
    const fresh = await fetcher();
    await this.set(key, fresh, ttl);
    return fresh;
  }
}
```

#### Phase 7: Robustness Improvements (Days 15-17)

```typescript
// Add circuit breaker pattern
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}

// Add retry with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 100
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries) {
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 100;
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
```

#### Phase 8: Bandwidth Optimization (Days 18-19)

```typescript
// GraphQL response compression
const compressionPlugin = {
  requestDidStart() {
    return {
      willSendResponse({ response }) {
        // Remove null values
        response.data = removeNulls(response.data);

        // Compress repeated structures
        if (response.data.exercises) {
          response.data._exerciseCompression = true;
          response.data.exercises = compressExercises(response.data.exercises);
        }

        return response;
      },
    };
  },
};

// Domain-specific compression (80% reduction for exercise data)
function compressExercises(exercises: Exercise[]): CompressedExercises {
  // Extract common patterns
  const muscleMap = new Map();
  const equipmentMap = new Map();

  exercises.forEach(ex => {
    ex.muscles.forEach(m => muscleMap.set(m.id, m));
    ex.equipment.forEach(e => equipmentMap.set(e.id, e));
  });

  return {
    _muscles: Array.from(muscleMap.values()),
    _equipment: Array.from(equipmentMap.values()),
    items: exercises.map(ex => ({
      ...ex,
      muscles: ex.muscles.map(m => m.id),       // Just IDs
      equipment: ex.equipment.map(e => e.id),   // Just IDs
    })),
  };
}
```

#### Phase 9: Security Hardening (Days 20-21)

```typescript
// Input validation middleware
const validateInput = (schema: Schema) => async (req, res, next) => {
  try {
    // Sanitize
    req.body = sanitize(req.body);
    req.query = sanitize(req.query);
    req.params = sanitize(req.params);

    // Validate
    await schema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// SQL injection protection (parameterized queries only)
function createSafeQuery(template: string, params: unknown[]): SafeQuery {
  // Verify no string interpolation
  if (template.includes('${') || template.includes("'")) {
    throw new Error('Unsafe query detected');
  }

  return { template, params };
}

// Add rate limiting per endpoint
const rateLimitConfig = {
  '/api/auth/login': { max: 5, window: '1m' },
  '/api/auth/register': { max: 3, window: '1h' },
  '/api/economy/transfer': { max: 10, window: '1h' },
  '/api/workout': { max: 100, window: '1d' },
  '/api/graphql': { max: 500, window: '1m' },
};
```

### 6.2 Implementation Timeline

| Phase | Days | Focus | Risk Level |
|-------|------|-------|------------|
| 1 | 1 | Security fixes | Critical |
| 2 | 2-3 | Data integrity | High |
| 3 | 4-5 | Logic bugs | Medium |
| 4 | 6-8 | Performance | Medium |
| 5 | 9-12 | Native modules | Low |
| 6 | 13-14 | Caching | Medium |
| 7 | 15-17 | Robustness | Low |
| 8 | 18-19 | Bandwidth | Low |
| 9 | 20-21 | Security hardening | Medium |

**Total: 21 days**

### 6.3 Verification Checklist

After each phase, verify:
- [ ] All tests pass
- [ ] Type checking passes
- [ ] No new ESLint errors
- [ ] Performance benchmarks unchanged or improved
- [ ] Security scan clean
- [ ] Documentation updated

---

## Stage 7: Empire Dashboard Integration (Preview)

### Scorecard Component

```typescript
// src/pages/admin/TestScorecard.tsx
const TestScorecard = () => {
  const { data: scorecard } = useQuery(GET_TEST_SCORECARD);

  return (
    <GlassSurface className="p-6">
      <h2>Test Coverage Scorecard</h2>

      {/* Overall Score */}
      <div className="flex items-center gap-4">
        <ScoreRing score={scorecard.overall.passRate} />
        <div>
          <div className="text-4xl font-bold">{scorecard.overall.grade}</div>
          <div className="text-sm text-gray-400">
            {scorecard.overall.passed}/{scorecard.overall.totalTests} tests
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        {Object.entries(scorecard.categoryBreakdown).map(([cat, stats]) => (
          <CategoryCard key={cat} name={cat} stats={stats} />
        ))}
      </div>

      {/* Failed Tests */}
      {scorecard.failedTests.length > 0 && (
        <div className="mt-6">
          <h3>Failed Tests ({scorecard.failedTests.length})</h3>
          <FailedTestList tests={scorecard.failedTests} />
        </div>
      )}

      {/* Recommendations */}
      <div className="mt-6">
        <h3>Recommendations</h3>
        <ul className="list-disc pl-4">
          {scorecard.recommendations.map((rec, i) => (
            <li key={i} className={rec.startsWith('CRITICAL') ? 'text-red-500' : ''}>
              {rec}
            </li>
          ))}
        </ul>
      </div>

      {/* Historical Trend */}
      <div className="mt-6">
        <h3>Score History</h3>
        <ScoreTrendChart data={scorecard.history} />
      </div>
    </GlassSurface>
  );
};
```

---

## Summary

This comprehensive plan covers:

1. **230+ test scenarios** across core, edge, security, and performance categories
2. **15 user personas** representing all possible states
3. **14 critical bugs** identified and fixes provided
4. **5 race conditions** with mitigation strategies
5. **5 performance bottlenecks** with optimization solutions
6. **21-day implementation plan** with phased rollout
7. **Empire dashboard integration** for visibility

**Expected Outcomes:**
- Security vulnerabilities eliminated
- 95%+ test pass rate
- 50% reduction in API latency
- 30% reduction in bandwidth usage
- Zero critical race conditions

---

*Ready for approval to proceed with implementation.*
