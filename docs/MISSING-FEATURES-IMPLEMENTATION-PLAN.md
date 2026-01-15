# MuscleMap Missing Features & Implementation Plan

> **Generated:** January 2026
> **Total Items Identified:** 75+ incomplete tasks across 8 categories
> **Estimated Total Effort:** 16-24 weeks for full completion

---

## Executive Summary

| Category | Count | Priority |
|----------|-------|----------|
| Direct TODO Comments in Code | 8 | IMMEDIATE |
| Critical Missing Features (P0) | 6 | Week 1-5 |
| High Priority Features (P1) | 8 | Week 6-12 |
| Medium Priority Features (P2) | 7 | Week 13+ |
| Security/Integrity Issues | 4 | CRITICAL |
| Race Conditions | 5 | CRITICAL |
| Performance Bottlenecks | 5 | Week 6 |
| Edge Cases | 20+ | Ongoing |

**Current Implementation Status:**
- 27+ API modules implemented
- 46+ frontend pages built
- Advanced features working: 3D visualization, gamification, wealth tiers, economy, AI prescriptions

**Key Gaps:** Apple Watch, video demos, Apple Health, full nutrition tracking, 1RM calculation

---

## Phase 1: Quick Wins (Week 1) - ~15 hours

### 1.1 Direct TODO Comments to Fix

| # | File | Line | Issue | Fix | Time |
|---|------|------|-------|-----|------|
| 1 | `src/store/feedbackStore.js` | 221 | Hardcoded appVersion '1.0.0' | Import from package.json | 15m |
| 2 | `src/components/workout-mode/WorkoutMode.jsx` | 320 | bestWeight/best1RM disconnected | Connect to exercise history query | 2h |
| 3 | `src/pages/MealPlans.jsx` | 112 | "View shopping list" unimplemented | Add shopping list modal/page | 4h |
| 4 | `src/pages/Goals.jsx` | 461 | Goal update modal missing | Create GoalEditModal component | 2h |
| 5 | `src/pages/PluginSettings.jsx` | 288 | Plugin settings modal missing | Create PluginConfigModal | 2h |
| 6 | `apps/api/src/http/routes/ranks.ts` | 126 | Missing privacy check | Add user_field_visibility.show_rank check | 1h |
| 7 | `apps/api/src/modules/organizations/index.ts` | 553 | Level not recalculated on org change | Add recalculation trigger | 2h |
| 8 | `apps/api/src/modules/economy/geoHangouts.service.ts` | 724 | participantCount hardcoded to 0 | Add JOIN to count participants | 1h |

**Subtotal:** 14.5 hours

### 1.2 Data Integrity Fixes

| ID | Location | Issue | Fix |
|----|----------|-------|-----|
| INT-001 | `wallet.service.ts` | Rate limit reset clock sensitivity | Add 60s buffer window |
| INT-002 | `crews.service.ts` | Race condition on crew creation | Atomic insert with ON CONFLICT |
| INT-003 | `earning.service.ts` | No upper bound on daily earn limits | Add defaults in config |
| INT-004 | `stats.service.ts` | Race condition on stats update | Add version column + optimistic locking |

### 1.3 Logic Error Fixes

| ID | Location | Issue | Fix |
|----|----------|-------|-----|
| LOG-001 | `leaderboard.service.ts` | Percentile off-by-one | Adjust formula to use proper bounds |
| LOG-002 | `rivals.service.ts` | Win condition logic error | Fix comparison operators |
| LOG-003 | `crews.service.ts` | War streak calculation wrong | Recalculate using correct algorithm |
| LOG-004 | `antiabuse.service.ts` | Wrong column names | Update query columns |

---

## Phase 2: Critical Features - P0 (Weeks 2-5)

### 2.1 1RM Tracking & Estimation
**Effort:** 1 week | **Impact:** Very High

**Implementation:**
```typescript
// Formula: Epley 1RM = weight × (1 + reps/30)
function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}
```

**Tasks:**
- [ ] Add `estimated_1rm` field to workout_sets table
- [ ] Calculate 1RM on each set logged
- [ ] Add 1RM history chart to exercise detail page
- [ ] Create 1RM personal records tracking
- [ ] Add 1RM-based achievements (e.g., "1000lb Club")
- [ ] Display 1RM progression in stats dashboard

**Files to modify:**
- `apps/api/src/modules/workouts/workouts.service.ts`
- `apps/api/src/modules/stats/stats.service.ts`
- `src/pages/ExerciseDetail.jsx`
- `src/pages/Stats.jsx`

---

### 2.2 Rest Timer Enhancements
**Effort:** 1-2 weeks | **Impact:** High

**Missing Features:**
- [ ] Auto-start timer after logging set
- [ ] Per-exercise default rest times (stored in user preferences)
- [ ] Quick adjust buttons (+30s, -30s)
- [ ] Timer presets (60s, 90s, 120s, 180s)
- [ ] Timer visible while browsing exercises (floating overlay)
- [ ] Sound/vibration alerts configurable

**Files to modify:**
- `src/store/workoutSessionStore.js` - Add rest timer presets
- `src/components/workout-mode/RestTimer.jsx` - Enhance UI
- `src/components/common/FloatingTimer.jsx` - Create new component

---

### 2.3 Apple Health / Google Fit Integration
**Effort:** 2-3 weeks | **Impact:** Very High

**Implementation Steps:**
1. Add `react-native-health` to mobile app
2. Create HealthKit service in `apps/mobile/src/services/health.ts`
3. Write workouts to Health on completion
4. Read heart rate during workouts (if available)
5. Sync body measurements (weight, body fat)
6. Add Google Fit equivalent via `react-native-google-fit`

**API Changes:**
- [ ] Add `/api/health/sync` endpoint
- [ ] Store last sync timestamp per user
- [ ] Handle bi-directional conflict resolution

**Files to create:**
- `apps/mobile/src/services/healthKit.ts`
- `apps/mobile/src/services/googleFit.ts`
- `apps/api/src/modules/wearables/health.service.ts`

---

### 2.4 Progress Photos Enhancement
**Effort:** 1-2 weeks | **Impact:** High

**Current State:** Basic page exists at `src/pages/Progress-photos.tsx`

**Missing Features:**
- [ ] Side-by-side comparison slider
- [ ] Timeline gallery view
- [ ] Body part categorization (front, back, side)
- [ ] Overlay guides for consistent positioning
- [ ] Local-only storage option for privacy
- [ ] Image compression before upload

**Files to modify:**
- `src/pages/Progress-photos.tsx`
- `src/components/photos/PhotoCompare.jsx` - Create new
- `src/components/photos/PhotoGallery.jsx` - Create new

---

### 2.5 Apple Watch App
**Effort:** 4-6 weeks | **Impact:** Very High | **Complexity:** High

**Required Features:**
- Standalone workout tracking
- Rest timer with haptic feedback
- Rep logging via Digital Crown
- Heart rate monitoring
- Quick-start workout from complication
- Sync with phone app

**Technical Notes:**
- Requires ejection from Expo OR custom native module
- Use WatchConnectivity framework
- Consider watchOS SwiftUI for native performance

**Files to create:**
- `apps/mobile/ios/MuscleMapWatch/` - Watch app target
- `apps/mobile/src/native/WatchConnectivity.ts`

---

### 2.6 Video Exercise Demonstrations
**Effort:** 2-3 weeks (integration) | **Impact:** Critical

**Options:**
1. **License existing content** - Partner with Vimeo/exercise video library
2. **Create original** - 3-6 months production
3. **Hybrid** - License common, create signature exercises

**Implementation:**
- [ ] Add `video_url` field to exercises table
- [ ] Create VideoPlayer component with lazy loading
- [ ] Implement adaptive streaming (HLS)
- [ ] Add video thumbnails to exercise cards
- [ ] Cache videos for offline use

**Files to modify:**
- `apps/api/src/db/migrations/XXX_add_exercise_videos.ts`
- `src/components/exercises/ExerciseVideo.jsx` - Create new
- `src/pages/ExerciseDetail.jsx`

---

## Phase 3: Race Conditions & Performance (Week 6)

### 3.1 Race Condition Fixes

| ID | Scenario | Fix |
|----|----------|-----|
| RC-001 | Concurrent credit transfers | Advisory lock on sender wallet |
| RC-002 | Concurrent crew joins | `SELECT FOR UPDATE` + unique constraint |
| RC-003 | Concurrent stats updates | Add `version` column, optimistic locking |
| RC-004 | Concurrent rivalry creation | Bidirectional unique constraint |
| RC-005 | Cache invalidation during read | Invalidate BEFORE commit, not after |

**Implementation Pattern for RC-001:**
```typescript
async transferCredits(senderId: string, receiverId: string, amount: number) {
  return db.transaction(async (trx) => {
    // Lock sender's wallet
    await trx.raw('SELECT pg_advisory_xact_lock(?)', [hashCode(senderId)]);

    // Verify balance
    const sender = await trx('credit_balances')
      .where('user_id', senderId)
      .forUpdate()
      .first();

    if (sender.balance < amount) throw new InsufficientFundsError();

    // Perform transfer atomically
    await trx('credit_balances').where('user_id', senderId).decrement('balance', amount);
    await trx('credit_balances').where('user_id', receiverId).increment('balance', amount);
    await trx('credit_ledger').insert([...]);
  });
}
```

### 3.2 Performance Optimizations

| Endpoint | Current | Target | Fix |
|----------|---------|--------|-----|
| GET /leaderboard | ~500ms | <100ms | Covering index + keyset pagination |
| GET /community/feed | ~800ms | <200ms | DataLoader batching |
| POST /workout | ~300ms | <150ms | Batch writes |
| GET /stats/history | ~1s | <200ms | BRIN index on timestamp |

**Index to add:**
```sql
-- Covering index for leaderboard
CREATE INDEX idx_leaderboard_covering
ON user_stats(total_xp DESC, user_id)
INCLUDE (username, avatar_url, level);

-- BRIN index for time-series stats
CREATE INDEX idx_stats_history_brin
ON stats_history USING BRIN(created_at);
```

---

## Phase 4: High Priority Features - P1 (Weeks 7-12)

### 4.1 Nutrition Tracking System
**Effort:** 4-6 weeks | **Impact:** High

**Database Schema:**
```sql
CREATE TABLE food_items (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  serving_size DECIMAL,
  serving_unit TEXT,
  calories INTEGER,
  protein DECIMAL,
  carbs DECIMAL,
  fat DECIMAL,
  fiber DECIMAL,
  source TEXT, -- 'usda', 'user', 'openfoodfacts'
  barcode TEXT UNIQUE
);

CREATE TABLE meal_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  food_item_id UUID REFERENCES food_items(id),
  servings DECIMAL DEFAULT 1,
  meal_type TEXT, -- 'breakfast', 'lunch', 'dinner', 'snack'
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE daily_nutrition_goals (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  calories INTEGER,
  protein INTEGER,
  carbs INTEGER,
  fat INTEGER
);
```

**API Endpoints:**
- `GET /api/nutrition/search?q=chicken` - Food search
- `POST /api/nutrition/log` - Log meal
- `GET /api/nutrition/daily?date=2026-01-15` - Daily summary
- `GET /api/nutrition/goals` - Get/set goals

**Data Sources (Free):**
- USDA FoodData Central API (300K+ foods)
- Open Food Facts API (2.8M+ products)

---

### 4.2 Sleep & Recovery Score
**Effort:** 2-3 weeks | **Impact:** High

**Implementation:**
- Manual sleep logging (bed time, wake time, quality 1-5)
- Recovery score calculation (sleep + HRV + rest days)
- Training recommendations based on recovery
- Integration with Apple Health sleep data

**Recovery Score Formula:**
```typescript
function calculateRecoveryScore(
  sleepHours: number,
  sleepQuality: number, // 1-5
  restDaysSinceLastWorkout: number,
  hrv?: number
): number {
  let score = 0;

  // Sleep duration (0-40 points)
  score += Math.min(sleepHours / 8 * 40, 40);

  // Sleep quality (0-30 points)
  score += (sleepQuality / 5) * 30;

  // Rest days (0-20 points)
  score += Math.min(restDaysSinceLastWorkout * 10, 20);

  // HRV bonus (0-10 points)
  if (hrv) score += Math.min(hrv / 100 * 10, 10);

  return Math.round(score);
}
```

---

### 4.3 Workout Templates & Programs
**Effort:** 3-4 weeks | **Impact:** High

**Features:**
- Save any workout as template
- Multi-week program creation (4-12 weeks)
- Auto-progression rules
- Program marketplace (community shared)
- Pre-made programs: PPL, 5x5, PHUL, Upper/Lower

**Database Schema:**
```sql
CREATE TABLE workout_templates (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  exercises JSONB, -- [{exerciseId, sets, reps, weight}]
  is_public BOOLEAN DEFAULT FALSE,
  downloads INTEGER DEFAULT 0
);

CREATE TABLE programs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  weeks INTEGER,
  schedule JSONB, -- {week1: {day1: templateId, day2: ...}}
  progression_rules JSONB
);
```

---

### 4.4 RPE & RIR Tracking
**Effort:** 1 week | **Impact:** High

**Implementation:**
- Add `rpe` (0-10) and `rir` (0-5) fields to workout_sets
- RPE selector component (tap to select)
- Trend charts showing effort over time
- Auto-regulation suggestions

---

### 4.5 Supersets & Circuit Mode
**Effort:** 2 weeks | **Impact:** High

**Features:**
- Visual grouping of exercises
- Drag-drop to create supersets
- Giant sets (3+ exercises)
- Circuit timer with auto-rotation
- Rest between vs within supersets

---

### 4.6 Offline Mode Enhancement
**Effort:** 2-3 weeks | **Impact:** High

**Current State:** Basic service worker exists

**Enhancements:**
- Full workout logging offline
- Exercise database cached (IndexedDB)
- Sync queue with conflict resolution
- 30+ days offline data retention
- Visual sync status indicator

---

## Phase 5: Medium Priority - P2 (Weeks 13+)

### 5.1 AI Form Feedback (Video Analysis)
**Effort:** 8-12 weeks | **Complexity:** Very High

Uses MediaPipe or TensorFlow Lite for real-time pose estimation.

### 5.2 Music Integration
**Effort:** 2-3 weeks

Spotify/Apple Music API integration with BPM-matched playlists.

### 5.3 Body Measurements
**Effort:** 1-2 weeks

Track chest, waist, arms, thighs with progress graphs.

### 5.4 Strava Integration
**Effort:** 2 weeks

Push strength workouts, import activities.

### 5.5 Garmin Connect
**Effort:** 2-3 weeks

Sync health metrics, import activities.

### 5.6 3D Anatomical Model Improvements
**Effort:** Large (3D modeling work)

Full male/female models with individual muscle highlighting.

### 5.7 USA Gymnastics Skills
**Effort:** Large (500+ skills data entry)

10 apparatus-specific skill trees with USAG levels 1-10 + Elite.

---

## Edge Cases to Handle

| ID | Scenario | Current | Expected |
|----|----------|---------|----------|
| EC-001 | Transfer to suspended wallet | Succeeds | Rejected |
| EC-002 | Workout with 501 reps | Accepted | Rejected (max 500) |
| EC-003 | Leave crew as only owner | Orphans crew | Blocked |
| EC-004 | Negative exercise difficulty | Breaks calc | Validate 1-5 |
| EC-005 | Message blocked user | Sent | Rejected |
| EC-006 | Empty workout submission | Creates record | Rejected |
| EC-007 | Duplicate email registration | Race condition | Unique constraint |
| EC-008 | XSS in bio/comments | Stored | Sanitized |

---

## SPA Bundle Optimization

**Current Issues:**
- Initial bundle: 3.3MB (target: <500KB)
- No lazy loading on 44 pages
- No loading states between routes

**Fixes:**
```javascript
// Convert all pages to lazy loading
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));

// Add Suspense with skeleton fallbacks
<Suspense fallback={<PageSkeleton />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
  </Routes>
</Suspense>
```

**Chunk Strategy (vite.config.js):**
- `react-vendor`: Core React (~150KB)
- `three-vendor`: 3D only (~400KB, lazy)
- `apollo-vendor`: GraphQL (~100KB, lazy)
- `animation-vendor`: Framer Motion (~80KB)

---

## Implementation Priority Matrix

```
                    HIGH IMPACT
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
    │  Apple Watch       │  1RM Tracking      │
    │  Video Demos       │  Rest Timer        │
    │  Apple Health      │  Nutrition         │
    │                    │                    │
LOW ├────────────────────┼────────────────────┤ HIGH
EFFORT                   │                    EFFORT
    │                    │                    │
    │  RPE/RIR           │  AI Form Feedback  │
    │  Body Measurements │  Apple Watch       │
    │  Music Integration │  USAG Skills       │
    │                    │                    │
    └────────────────────┼────────────────────┘
                         │
                    LOW IMPACT
```

---

## Next Steps

1. **This Week:** Fix all 8 TODO comments and run full test suite
2. **Week 2-3:** Implement 1RM tracking and rest timer enhancements
3. **Week 4-5:** Apple Health integration
4. **Week 6:** Fix race conditions and performance bottlenecks
5. **Week 7-10:** Nutrition tracking system
6. **Week 11-12:** Sleep/recovery and workout templates
7. **Week 13+:** Apple Watch app development

---

## Related Documentation

- `docs/UNFINISHED-WORK-COMPLETION-PLAN.md` - Detailed bug fixes
- `docs/FEATURE-GAP-ANALYSIS.md` - Competitive analysis
- `docs/NUTRITION-SYSTEM-PLAN.md` - Full nutrition spec
- `docs/SPA-UX-IMPROVEMENTS-PLAN.md` - Frontend optimization
- `docs/SCALING-ARCHITECTURE-PLAN.md` - Infrastructure scaling
