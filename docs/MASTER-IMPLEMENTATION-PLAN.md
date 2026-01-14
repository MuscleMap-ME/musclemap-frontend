# Master Implementation Plan: Comprehensive System Refactor

**Generated:** 2026-01-14
**Status:** Awaiting Approval
**Estimated Duration:** 21 days

---

## Executive Summary

This document consolidates the complete analysis and implementation plan for MuscleMap's comprehensive system refactor. It includes the wealth tier system, user profile enhancements, exhaustive testing infrastructure, performance optimizations, and bug fixes.

---

## Part 1: Wealth Tier & Profile Enhancements

### 1.1 Wealth Tier System

Users accumulate credits in tiers that provide visual distinction:

| Tier | Name | Credit Range | Visual | Animation |
|------|------|--------------|--------|-----------|
| 0 | Broke | 0-9 | None | None |
| 1 | Bronze | 10-99 | Bronze ring | None |
| 2 | Silver | 100-999 | Silver ring | Subtle glow |
| 3 | Gold | 1,000-9,999 | Gold ring | Pulse |
| 4 | Platinum | 10,000-99,999 | Platinum double ring | Shimmer |
| 5 | Diamond | 100,000-999,999 | Diamond gradient | Sparkle |
| 6 | Obsidian | 1,000,000+ | Obsidian crown | Intense flames |

### 1.2 Enhanced Profile Fields

**New Database Columns:**
```sql
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN bio_rich_json JSONB;  -- Rich text editing
ALTER TABLE users ADD COLUMN wealth_tier INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN wealth_tier_updated_at TIMESTAMP;
ALTER TABLE users ADD COLUMN profile_visibility TEXT DEFAULT 'public';
ALTER TABLE users ADD COLUMN social_links JSONB DEFAULT '{}';
```

**Profile Display Components:**
- Avatar with wealth tier ring
- Username with rank badge
- Rich text bio (markdown support)
- Physical stats (height, weight, gender)
- Adaptive category (disability/rehab indicator)
- Geo location (city, country)
- Leaderboard positions
- Community memberships
- Crew affiliation
- Rivalry record
- Achievement showcase

### 1.3 Implementation Pseudocode

```typescript
// Wealth tier calculation (triggered on credit change)
function calculateWealthTier(credits: number): WealthTier {
  if (credits >= 1_000_000) return { tier: 6, name: 'Obsidian' };
  if (credits >= 100_000) return { tier: 5, name: 'Diamond' };
  if (credits >= 10_000) return { tier: 4, name: 'Platinum' };
  if (credits >= 1_000) return { tier: 3, name: 'Gold' };
  if (credits >= 100) return { tier: 2, name: 'Silver' };
  if (credits >= 10) return { tier: 1, name: 'Bronze' };
  return { tier: 0, name: 'Broke' };
}

// Profile component with wealth indicator
const ProfileCard = ({ user }) => {
  const tier = WEALTH_TIERS[user.wealthTier];

  return (
    <div className={`profile-card ring-${tier.name.toLowerCase()}`}>
      <Avatar
        src={user.avatarUrl}
        ringColor={tier.color}
        animation={tier.animationLevel}
      />
      <div className="profile-info">
        <h2>{user.displayName}</h2>
        <RankBadge rank={user.currentRank} />
        <WealthBadge tier={tier} />
        <Bio content={user.bio} richJson={user.bioRichJson} />
        <PhysicalStats user={user} />
        <Location user={user} />
        <SocialLinks links={user.socialLinks} />
      </div>
    </div>
  );
};
```

---

## Part 2: Testing Infrastructure

### 2.1 Test Coverage Summary

| Category | Tests | Expected Pass Rate |
|----------|-------|-------------------|
| Core User Journeys | 50 | 95% |
| Edge Cases | 100 | 75% |
| Security | 50 | 85% |
| Performance | 30 | 80% |
| **Total** | **230** | **~85%** |

### 2.2 User Personas (15 profiles)

| ID | Persona | Rank | Credits | Use Case |
|----|---------|------|---------|----------|
| 1 | Nova Fresh | 1 | 100 | New user |
| 2 | Rookie Trainee | 2 | 250 | Early adopter |
| 3 | Active Andy | 4 | 3,500 | Engaged user |
| 4 | Elite Eve | 6 | 25,000 | Power user |
| 5 | Legend Leo | 8 | 150,000 | Grandmaster |
| 6 | Diamond Dan | 7 | 1,500,000 | Whale |
| 7 | Ghost | 3 | 500 | Privacy-focused |
| 8 | Recover Ray | 2 | 150 | Rehabilitation |
| 9 | Silver Sally | 3 | 800 | Senior |
| 10 | Wheel Walter | 4 | 1,200 | Adaptive |
| 11 | Ninja Nat | 5 | 4,000 | Martial artist |
| 12 | Sleepy Sam | 3 | 450 | Dormant |
| 13 | Banned Bob | 2 | 0 | Suspended |
| 14 | Coach Carol | 6 | 35,000 | Trainer |
| 15 | Student Steve | 2 | 100 | Mentee |

### 2.3 Test Harness Architecture

```
scripts/test-harness/
├── index.ts           # Main entry
├── orchestrator.ts    # Test coordination
├── parser.ts          # YAML script parser
├── executor.ts        # Action execution
├── assertions.ts      # Validation engine
├── scorecard.ts       # Results aggregation
└── scripts/
    ├── core-journeys.yaml
    ├── edge-cases.yaml
    ├── security.yaml
    └── performance.yaml
```

### 2.4 Empire Dashboard Scorecard

```typescript
interface Scorecard {
  overall: {
    totalTests: number;
    passed: number;
    failed: number;
    passRate: number;
    grade: "A+" | "A" | "B" | "C" | "D" | "F";
  };
  categories: {
    core: CategoryStats;
    edge: CategoryStats;
    security: CategoryStats;
    performance: CategoryStats;
  };
  failedTests: TestResult[];
  recommendations: string[];
  history: { date: string; score: number }[];
}
```

---

## Part 3: Critical Fixes

### 3.1 Security Fixes (Phase 1 - Day 1)

| ID | Issue | Location | Fix |
|----|-------|----------|-----|
| SEC-001 | SQL Injection | communities.service.ts:258 | Parameterize query |
| SEC-002 | SQL Injection | communities.service.ts:384 | Parameterize query |
| SEC-003 | Missing import | rivals.service.ts:128 | Add crypto import |
| SEC-004 | Weak idempotency | credit.service.ts | Strengthen keys |

### 3.2 Data Integrity Fixes (Phase 2 - Days 2-3)

| ID | Issue | Location | Fix |
|----|-------|----------|-----|
| INT-001 | Clock sensitivity | wallet.service.ts | Add time buffer |
| INT-002 | Race condition | crews.service.ts:44 | Atomic insert |
| INT-003 | No earning caps | earning.service.ts | Add defaults |
| INT-004 | Stats race | stats.service.ts | Optimistic locking |

### 3.3 Logic Fixes (Phase 3 - Days 4-5)

| ID | Issue | Location | Fix |
|----|-------|----------|-----|
| LOG-001 | Percentile error | leaderboard.service.ts | Fix formula |
| LOG-002 | Win condition | rivals.service.ts:280 | Fix logic |
| LOG-003 | Streak calc | crews.service.ts:563 | Fix algorithm |
| LOG-004 | Column names | antiabuse.service.ts:220 | Fix query |

### 3.4 Performance Fixes (Phase 4 - Days 6-8)

| ID | Issue | Current | Target | Fix |
|----|-------|---------|--------|-----|
| PERF-001 | Leaderboard slow | 500ms | <100ms | Covering index |
| PERF-002 | Feed N+1 | 800ms | <200ms | DataLoader |
| PERF-003 | Workout writes | 300ms | <150ms | Batch transaction |
| PERF-004 | Stats history | 1s | <200ms | BRIN index |
| PERF-005 | TU calculation | 20ms | <2ms | Use native module |

---

## Part 4: Performance Optimizations

### 4.1 Native C Module Integration

**Activate libtu for TU calculations:**
```typescript
import { tu_calculate_batch } from '@musclemap/native/tu';

// Replace JavaScript implementation
const results = tu_calculate_batch(workouts, exercises, muscles);
// Expected: 10x performance improvement
```

**New librank module for leaderboards:**
```c
// native/src/rank/rank_calculator.c
void rank_sort_users(RankedUser* users, size_t count);
void rank_calculate_percentiles(double* scores, size_t count, double* percentiles);
// Expected: 10x performance improvement
```

### 4.2 Cache Strategy

- Invalidate cache BEFORE commit (not after)
- Use write-through for critical data
- Implement stale-while-revalidate pattern
- Domain-specific compression for repeated data

### 4.3 Database Optimizations

```sql
-- Covering indexes for hot queries
CREATE INDEX CONCURRENTLY idx_character_stats_leaderboard_covering
ON character_stats (vitality DESC, user_id)
INCLUDE (strength, constitution, dexterity, power, endurance);

-- BRIN indexes for time-series data
CREATE INDEX idx_activity_events_created_brin
ON activity_events USING BRIN (created_at);
```

### 4.4 Bandwidth Optimization

- Remove null values from responses
- Compress repeated structures (exercises, muscles)
- Domain-specific compression (80% reduction)
- Enable response streaming

---

## Part 5: Implementation Timeline

| Phase | Days | Focus | Deliverables |
|-------|------|-------|--------------|
| 1 | 1 | Security | Fix SQL injection, missing imports |
| 2 | 2-3 | Integrity | Fix race conditions, add locking |
| 3 | 4-5 | Logic | Fix calculation errors |
| 4 | 6-8 | Performance | Add indexes, DataLoader, batch writes |
| 5 | 9-12 | Native | Integrate libtu, create librank |
| 6 | 13-14 | Caching | New cache strategy |
| 7 | 15-17 | Robustness | Circuit breaker, retry logic |
| 8 | 18-19 | Bandwidth | Response compression |
| 9 | 20-21 | Hardening | Input validation, rate limits |

**Total: 21 days**

---

## Part 6: Expected Outcomes

### Metrics Improvement

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Test Pass Rate | ~60% | 95% | +35% |
| API Latency (p99) | 500ms | 100ms | 5x faster |
| Bandwidth Usage | Baseline | -30% | Reduced |
| Security Score | 85% | 100% | Full coverage |
| Race Conditions | 5 | 0 | Eliminated |

### Feature Additions

1. Wealth tier system with visual indicators
2. Enhanced user profiles with rich text bios
3. Comprehensive test harness with scripting
4. Empire dashboard test scorecard
5. Native C modules for performance

---

## Part 7: Documentation Updates Required

| Document | Updates |
|----------|---------|
| CLAUDE.md | Add wealth tier system, test harness commands |
| docs/ROADMAP.md | Update completed features |
| docs/API.md | Document new profile endpoints |
| scripts/README.md | Add test harness documentation |
| CHANGELOG.md | Document all changes |

---

## Part 8: Risk Mitigation

### Deployment Strategy

1. **Feature flags** for wealth tier UI
2. **Gradual rollout** of native modules
3. **A/B testing** for performance changes
4. **Rollback plan** for each phase

### Monitoring

1. Real-time error tracking
2. Performance regression alerts
3. Database query monitoring
4. Cache hit rate tracking

---

## Approval Request

This plan requires your approval to proceed with implementation.

**Please confirm:**
1. [ ] Wealth tier system design approved
2. [ ] Test harness architecture approved
3. [ ] Bug fix priorities approved
4. [ ] Performance optimization approach approved
5. [ ] 21-day timeline acceptable

Upon approval, I will begin Phase 1 (Critical Security Fixes) immediately.

---

## Reference Documents

- `docs/STAGE-1-ARCHITECTURE-ANALYSIS.md` - Complete system analysis
- `docs/STAGE-2-USER-PERSONAS.md` - User persona definitions
- `docs/STAGE-3-TEST-HARNESS.md` - Test harness design
- `docs/STAGE-4-5-6-SIMULATION-ANALYSIS-PLAN.md` - Simulation and refactor plan

---

*Awaiting your approval to proceed.*
