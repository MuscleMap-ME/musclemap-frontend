# MuscleMap Master Improvement Plan

**Created:** January 25, 2026
**Status:** Active
**Owner:** Development Team

---

## Executive Summary

This document outlines a comprehensive improvement strategy for MuscleMap based on a full codebase audit of ~480,000 lines of code across frontend and backend. The plan addresses:

1. **Critical Technical Debt** - Dual prescription engines, incomplete features
2. **Competitive Feature Gaps** - Apple Watch, video demos, health integrations
3. **Performance Optimization** - N+1 queries, caching, bundle size
4. **Architecture Consolidation** - Module structure, code organization
5. **User Experience Enhancement** - Onboarding, navigation, accessibility

---

## Priority Matrix

| Priority | Impact | Effort | Timeline |
|----------|--------|--------|----------|
| **P0** | Critical for user retention | < 4 weeks | Immediate |
| **P1** | High competitive value | 4-8 weeks | Short-term |
| **P2** | Medium improvement | 8-16 weeks | Medium-term |
| **P3** | Low priority enhancement | > 16 weeks | Long-term |

---

## Phase 1: Foundation (Weeks 1-4)

### 1.1 Prescription Engine Consolidation [P0]

**Problem:** Two active prescription engines (v2 + v3) create maintenance burden and potential inconsistencies.

**Solution:**
```
Week 1: Audit v3 completeness vs v2
Week 2: Create migration tests
Week 3: Complete v3 gaps
Week 4: Deprecate v2, remove dead code
```

**Files to consolidate:**
- `apps/api/src/modules/prescription/index.ts` (37KB) → DELETE
- `apps/api/src/modules/prescription-v3/` → KEEP (canonical)

**Acceptance Criteria:**
- [ ] All v2 features present in v3
- [ ] Integration tests pass for all prescription scenarios
- [ ] v2 code deleted from codebase
- [ ] No prescription-related bugs for 1 week post-migration

### 1.2 DataLoader Implementation [P0]

**Problem:** N+1 query risks in GraphQL resolvers causing performance degradation.

**Solution:**
```typescript
// Before (N+1 risk)
resolve: async (parent) => {
  return await db('users').where('id', parent.userId).first();
}

// After (batched)
resolve: async (parent, _, { loaders }) => {
  return loaders.users.load(parent.userId);
}
```

**Files to update:**
- `apps/api/src/graphql/resolvers.ts`
- Create `apps/api/src/graphql/dataloaders/`

**Implementation:**
```
Week 1: Create DataLoader infrastructure
Week 2: Add loaders for users, exercises, workouts
Week 3: Add loaders for stats, achievements
Week 4: Performance testing, optimization
```

### 1.3 Complete Stubbed Features [P0]

**Problem:** Critical features are stubbed but not implemented.

| Feature | File | Status | Action |
|---------|------|--------|--------|
| Screenshot OCR | `ScreenshotImportSheet.tsx` | Stubbed | Implement Tesseract.js |
| Health OAuth | `HealthSyncSheet.tsx` | Stubbed | Implement OAuth flows |
| Email sending | Various resolvers | TODO | Wire up email service |

**Week 1-2: Screenshot OCR**
```typescript
// Install: pnpm add tesseract.js
import Tesseract from 'tesseract.js';

async function extractWorkoutFromImage(imageData: string): Promise<ParsedExercise[]> {
  const result = await Tesseract.recognize(imageData, 'eng');
  return parseWorkoutText(result.data.text);
}
```

**Week 3-4: Health Platform OAuth**
- Apple Health: Implement HealthKit framework (React Native bridge)
- Google Fit: Implement Google Fit REST API
- Garmin: Implement Garmin Connect IQ SDK

---

## Phase 2: Competitive Features (Weeks 5-12)

### 2.1 Apple Watch Companion App [P0]

**Problem:** 100% of competitors have Apple Watch support. Critical for iOS user retention.

**Solution:** Create watchOS app with WatchConnectivity

**Architecture:**
```
apps/
├── mobile/          (existing React Native)
└── watch/           (NEW - watchOS Swift app)
    ├── MuscleMapWatch/
    │   ├── ContentView.swift
    │   ├── WorkoutView.swift
    │   ├── TimerView.swift
    │   └── WatchConnectivity.swift
    └── MuscleMapWatch.xcodeproj
```

**Core Features:**
1. Rest timer with haptic alerts
2. Current set display (exercise, weight, reps)
3. Quick log buttons
4. Heart rate during workout
5. Workout summary

**Timeline:** 4-6 weeks

### 2.2 Video Exercise Library [P0]

**Problem:** All competitors have video demonstrations. Critical for injury prevention.

**Options:**
1. **License existing library** (2 weeks, $$)
   - MuscleWiki API
   - ExerciseDB
2. **Create our own** (3-6 months, $$$)
   - Professional filming
   - Multiple angles
   - Form cue overlays
3. **Hybrid approach** (Recommended)
   - License basic library immediately
   - Create premium content over time

**Database schema:**
```sql
CREATE TABLE exercise_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID REFERENCES exercises(id),
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  source VARCHAR(50), -- 'licensed' | 'original'
  angles JSONB, -- ['front', 'side', 'rear']
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exercise_videos_exercise ON exercise_videos(exercise_id);
```

### 2.3 Apple Health Integration [P1]

**Problem:** HealthKit integration is ~20% complete.

**Required Data Types:**
```swift
// Read permissions
HKQuantityType.workoutType()
HKQuantityType(.heartRate)
HKQuantityType(.activeEnergyBurned)
HKQuantityType(.stepCount)
HKCategoryType(.sleepAnalysis)

// Write permissions
HKWorkoutType.workoutType()
```

**Implementation:**
1. Create React Native bridge for HealthKit
2. Sync workout data bidirectionally
3. Import historical data on first connect
4. Background sync for new data

### 2.4 Nutrition Module [P1]

**Problem:** No nutrition tracking despite module skeleton existing.

**Current state:** `apps/api/src/modules/nutrition/` has structure but needs completion.

**Features to implement:**
1. Food database integration (USDA, OpenFoodFacts)
2. Barcode scanning
3. Macro tracking (calories, protein, carbs, fat)
4. Meal logging
5. Daily/weekly summaries
6. Goal integration (cutting, bulking, maintenance)

**Schema additions:**
```sql
CREATE TABLE food_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  food_name TEXT NOT NULL,
  barcode TEXT,
  calories INTEGER,
  protein_g DECIMAL(6,2),
  carbs_g DECIMAL(6,2),
  fat_g DECIMAL(6,2),
  serving_size DECIMAL(8,2),
  serving_unit VARCHAR(20),
  meal_type VARCHAR(20), -- 'breakfast', 'lunch', 'dinner', 'snack'
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_food_entries_user_date ON food_entries(user_id, logged_at::date);
```

---

## Phase 3: Architecture Improvements (Weeks 13-20)

### 3.1 Service Layer Refactoring [P1]

**Problem:** Service files vary wildly in size (200-1400 LOC).

**Rule:** Maximum 800 LOC per service file.

**Files to split:**

| File | Current LOC | Split Into |
|------|------------|------------|
| `intelligent-prescription.service.ts` | 1437 | `prescription-context.ts`, `prescription-scoring.ts`, `prescription-builder.ts` |
| `one-rep-max.service.ts` | 1328 | `orm-calculator.ts`, `orm-history.ts`, `orm-predictions.ts` |
| `long-term-analytics.service.ts` | 1298 | `analytics-trends.ts`, `analytics-aggregation.ts`, `analytics-export.ts` |
| `issues.service.ts` | 1318 | `bug-tracker.ts`, `feature-requests.ts`, `issue-notifications.ts` |

### 3.2 Component Index Files [P2]

**Problem:** Inconsistent exports across component folders.

**Standard pattern for all component folders:**
```typescript
// src/components/example/index.ts
export { ExampleComponent } from './ExampleComponent';
export { ExampleSubComponent } from './ExampleSubComponent';
export type { ExampleProps, ExampleConfig } from './types';
```

**Folders needing index.ts:**
- Run: `find src/components -type d -maxdepth 1 ! -name index.ts`

### 3.3 Page Consolidation [P2]

**Problem:** 95 pages suggests unclear information architecture.

**Proposed structure:**
```
Pages (User-Facing): 40
├── Core (10)
│   ├── Dashboard, Workout, ActivityLog, Profile
│   ├── Exercises, Progress, Goals, Settings
│   └── Login, Register
├── Social (8)
│   ├── Community, Crews, Rivals, Leaderboard
│   ├── Messages, Notifications, HighFives, Friends
├── Gamification (6)
│   ├── Achievements, Ranks, Skills, Quests
│   ├── Economy, Store
├── Specialized (8)
│   ├── Recovery, Nutrition, Career, MartialArts
│   ├── Programs, Analytics, Calendar, Maps
└── Onboarding (8)
    ├── Welcome, ArchetypeSelection, Goals, Equipment
    └── Experience, Schedule, HealthHistory, Complete

Pages (Admin): 15
├── Empire dashboard
├── User management
├── Content moderation
├── Analytics
└── System health

Pages (Experimental): 40 → REVIEW FOR DELETION
```

### 3.4 Analytics Consolidation [P2]

**Problem:** Multiple analytics implementations.

**Consolidate into single module:**
```
apps/api/src/modules/analytics/
├── index.ts           # Public API
├── aggregation.ts     # Data aggregation
├── trends.ts          # Trend analysis
├── engagement.ts      # User engagement metrics
├── export.ts          # Data export
├── archival.ts        # Old data archival
└── types.ts           # Type definitions
```

**Deprecate:**
- `services/analytics-aggregation.service.ts`
- `services/long-term-analytics.service.ts`
- `modules/stats/` (merge relevant parts)

---

## Phase 4: Performance Optimization (Weeks 21-24)

### 4.1 Query Optimization [P1]

**Implement query analysis:**
```sql
-- Find slow queries
SELECT query, calls, mean_time, max_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 20;
```

**Add missing indexes:**
```sql
-- Leaderboard queries
CREATE INDEX CONCURRENTLY idx_users_total_tu_rank
ON users(total_tu DESC NULLS LAST, id)
WHERE total_tu > 0;

-- Exercise history
CREATE INDEX CONCURRENTLY idx_workout_sets_user_exercise_keyset
ON workout_sets(user_id, exercise_id, created_at DESC, id DESC);

-- Analytics queries
CREATE INDEX CONCURRENTLY idx_activity_events_user_date
ON activity_events(user_id, created_at::date);
```

### 4.2 Caching Strategy Documentation [P1]

**Document TTLs for all cached data:**

| Data Type | Cache Layer | TTL | Invalidation |
|-----------|-------------|-----|--------------|
| User profile | Redis | 5 min | On update |
| Exercise list | Redis | 1 hour | Daily refresh |
| Leaderboard | Redis | 1 min | On score change |
| Prescription | Redis | 30 min | On preference change |
| Stats | Redis | 15 min | On workout complete |

### 4.3 Bundle Size Optimization [P2]

**Current status:** ~400KB initial bundle (good)

**Opportunities:**
1. Tree-shake unused Lucide icons
2. Lazy load Three.js only on 3D pages
3. Split recharts into page-specific chunks
4. Implement resource hints (preload, prefetch)

### 4.4 Analytics Archival [P1]

**Implement data lifecycle:**
```typescript
// apps/api/src/jobs/archive-analytics.ts
export async function archiveOldAnalytics() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  // Move to archive table
  await db.raw(`
    INSERT INTO activity_events_archive
    SELECT * FROM activity_events
    WHERE created_at < $1
  `, [cutoff]);

  // Delete from main table
  await db('activity_events')
    .where('created_at', '<', cutoff)
    .delete();
}
```

---

## Phase 5: User Experience (Weeks 25-32)

### 5.1 Smart Entry Method Selection [P2]

**Problem:** 6 input methods might overwhelm users.

**Solution:** Context-aware suggestions
```typescript
function getSuggestedEntryMethod(context: UserContext): EntryMethod {
  // Time of day
  if (isGymHours(context.time)) return 'quick'; // Fast logging during workout

  // Recent activity
  if (context.hasRecentScreenshot) return 'screenshot';
  if (context.hasClipboardData) return 'text';

  // User preference
  if (context.preferredMethod) return context.preferredMethod;

  // Device capability
  if (!context.hasMicrophone) return 'quick';
  if (context.isLowBandwidth) return 'voice'; // No network needed

  return 'quick'; // Default
}
```

### 5.2 Comprehensive Onboarding [P2]

**Current gaps:**
- No health history collection
- No injury history
- No guided first workout

**New onboarding flow:**
```
1. Welcome → Account creation
2. Archetype Selection → Personality-based
3. Goals → What do you want to achieve?
4. Equipment → What do you have access to?
5. Experience → How long have you been training?
6. Schedule → When can you train?
7. Health History → Any injuries or conditions?
8. First Workout → Guided session with tips
9. Complete → Dashboard with personalized setup
```

### 5.3 Form Validation Library [P2]

**Implement React Hook Form + Zod:**
```typescript
// src/lib/forms/index.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export function useValidatedForm<T extends z.ZodType>(schema: T) {
  return useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
  });
}

// Usage
const workoutSchema = z.object({
  name: z.string().min(1, 'Name required'),
  exercises: z.array(exerciseSchema).min(1, 'At least one exercise'),
});

const form = useValidatedForm(workoutSchema);
```

### 5.4 Offline-First Strategy [P2]

**Document offline capabilities:**

| Feature | Offline Support | Sync Strategy |
|---------|----------------|---------------|
| View exercises | ✅ Cached | Background refresh |
| Log workout | ✅ Queue | Sync on reconnect |
| View history | ✅ Cached | Merge on sync |
| Leaderboard | ❌ Online only | Show stale notice |
| Messages | ⚠️ Read only | Queue sends |
| Prescriptions | ⚠️ Last cached | Regenerate on sync |

---

## Phase 6: Testing & Documentation (Weeks 33-40)

### 6.1 Test Coverage Targets [P1]

**Set and enforce:**
- Unit tests: 60% coverage
- Integration tests: 40% coverage
- E2E tests: Critical paths (login, workout, log)

**Add coverage reporting:**
```json
// vitest.config.ts
{
  "coverage": {
    "provider": "v8",
    "reporter": ["text", "json", "html"],
    "branches": 60,
    "functions": 60,
    "lines": 60,
    "statements": 60
  }
}
```

### 6.2 API Documentation [P2]

**Generate OpenAPI spec from GraphQL:**
```bash
pnpm add graphql-to-openapi
```

**Create interactive docs:**
- GraphQL Playground (already exists)
- Add descriptions to all types
- Add examples to all mutations

### 6.3 Architecture Decision Records [P2]

**Create ADR folder:**
```
docs/decisions/
├── 001-graphql-only-api.md
├── 002-prescription-v3-migration.md
├── 003-zustand-over-redux.md
├── 004-fastify-over-express.md
└── template.md
```

### 6.4 Runbook Creation [P2]

**Operational runbooks:**
- Deployment procedure
- Rollback procedure
- Database migration
- Cache invalidation
- Performance troubleshooting
- Security incident response

---

## Metrics & Success Criteria

### Technical Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Test coverage | ~20% | 60% | Week 40 |
| Bundle size | ~400KB | <350KB | Week 24 |
| API p99 latency | ~500ms | <300ms | Week 24 |
| Build time | ~90s | <60s | Week 12 |
| TypeScript strict | Partial | 100% | Week 20 |

### Business Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Feature parity | 60% | 90% | Week 32 |
| User retention (D7) | TBD | +20% | Week 32 |
| App Store rating | TBD | 4.5+ | Week 40 |
| Workout completion | TBD | +15% | Week 20 |

### Code Quality

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| TODOs in codebase | 50+ | <10 | Week 12 |
| Duplicate code | High | Low | Week 20 |
| Service file avg LOC | ~600 | <400 | Week 20 |
| Documentation coverage | 60% | 90% | Week 40 |

---

## Resource Requirements

### Phase 1 (Weeks 1-4): 1 senior developer
- Prescription consolidation
- DataLoader implementation
- Stubbed feature completion

### Phase 2 (Weeks 5-12): 2 developers + 1 designer
- Apple Watch (iOS developer required)
- Video library (designer for UI)
- Health integrations

### Phase 3 (Weeks 13-20): 1 senior developer
- Service refactoring
- Component standardization
- Analytics consolidation

### Phase 4-6 (Weeks 21-40): 1-2 developers
- Performance optimization
- Testing
- Documentation

**Total estimate:** 8-10 developer-months

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Prescription migration breaks workouts | Medium | High | Comprehensive testing, feature flags |
| Apple Watch delay | High | Medium | Prioritize core features first |
| Video licensing cost | Medium | Medium | Start with free/open sources |
| Performance regression | Low | High | Performance budgets, monitoring |
| Team bandwidth | High | High | Prioritize P0 items, defer P3 |

---

## Conclusion

This master plan addresses the most critical issues in the MuscleMap codebase while building toward competitive feature parity. The phased approach ensures continuous delivery of value while managing technical debt.

**Key success factors:**
1. Complete prescription engine consolidation first (removes major debt)
2. Ship Apple Watch app within 6 weeks (user retention critical)
3. Maintain test coverage as features are added
4. Document all architectural decisions

**Next steps:**
1. Review this plan with stakeholders
2. Prioritize based on business goals
3. Create sprint tickets for Phase 1
4. Begin prescription v3 audit immediately

---

*Last updated: January 25, 2026*
