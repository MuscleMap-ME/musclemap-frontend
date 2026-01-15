# MuscleMap Unfinished Work Completion Plan

**Generated:** 2026-01-15
**Status:** Ready for Implementation
**Total Items:** 75+ unfinished tasks across 8 categories

---

## Executive Summary

After a comprehensive codebase analysis, I've identified all unfinished work, partial implementations, TODOs, and planned features that are not yet complete. This document organizes them by priority and provides a clear implementation roadmap.

### Quick Stats

| Category | Count | Priority |
|----------|-------|----------|
| Direct TODOs in Code | 7 (2 complete) | IMMEDIATE |
| Critical Missing Features (P0) | 6 | HIGH |
| High Priority Features (P1) | 8 | HIGH |
| Medium Priority Features (P2) | 7 | MEDIUM |
| Security/Integrity Issues | 4 | CRITICAL |
| Performance Issues | 5 | MEDIUM |
| Race Conditions | 5 | HIGH |
| Edge Cases | 20+ | MEDIUM |

---

## Part 1: Direct TODOs in Code (IMMEDIATE)

These are TODO comments left in the codebase that need implementation.

### 1.1 Frontend TODOs

| # | File | Line | TODO | Effort | Status |
|---|------|------|------|--------|--------|
| 1 | `src/store/feedbackStore.js` | 221 | Get appVersion from config (hardcoded to '1.0.0') | 15 min | PENDING |
| 2 | `src/components/workout-mode/WorkoutMode.jsx` | 320-321 | Connect bestWeight and best1RM to exercise history (both set to 0) | 2 hours | PENDING |
| 3 | `src/pages/MealPlans.jsx` | 112 | Implement "View shopping list" functionality | 4 hours | PENDING |
| 4 | `src/pages/Goals.jsx` | 416-600 | Goal update modal | 2 hours | **COMPLETE** |
| 5 | `src/pages/PluginSettings.jsx` | 288 | Open plugin settings modal/page | 2 hours | PENDING |

### 1.2 Backend TODOs

| # | File | Line | TODO | Effort |
|---|------|------|------|--------|
| 6 | `apps/api/src/http/routes/ranks.ts` | 126 | ~~Check user_field_visibility.show_rank for privacy~~ **DONE** | - |
| 7 | `apps/api/src/modules/organizations/index.ts` | 553 | ~~Recalculate level and path after org changes~~ **DONE** | - |
| 8 | `apps/api/src/modules/economy/geoHangouts.service.ts` | 724 | Add participantCount join (hardcoded to 0) | 1 hour |

### Implementation Plan

```bash
# Week 1, Day 1: Fix all 8 TODOs
# Morning: Backend TODOs (4 hours)
# Afternoon: Frontend TODOs (4 hours)
```

---

## Part 2: Critical Missing Features (P0)

These are table-stakes features that users expect. Missing them hurts competitiveness.

### 2.1 Apple Watch / Wear OS Companion App

**Gap Level:** CRITICAL
**Source:** `docs/FEATURE-GAP-ANALYSIS.md`
**Competitors:** ALL major apps have this

**What's Missing:**
- [ ] Apple Watch standalone app
- [ ] Real-time workout tracking without phone
- [ ] Heart rate monitoring during workouts
- [ ] Rest timer on wrist
- [ ] Rep counting via motion sensors
- [ ] Workout start/stop from watch
- [ ] Complication for quick workout launch
- [ ] Wear OS equivalent

**Estimated Effort:** 4-6 weeks (Apple Watch) + 2 weeks (Wear OS)

### 2.2 Video Exercise Demonstrations

**Gap Level:** CRITICAL
**Source:** `docs/FEATURE-GAP-ANALYSIS.md`
**Competitors:** ALL major apps have this

**What's Missing:**
- [ ] Video demos for each exercise (currently only illustrations)
- [ ] Multiple camera angles (front, side, back)
- [ ] Slow-motion technique breakdowns
- [ ] Common mistakes to avoid
- [ ] Trainer voiceover guidance

**Options:**
- License existing content: 2-3 weeks integration
- Create original content: 3-6 months production

### 2.3 Apple Health / Google Fit Integration

**Gap Level:** CRITICAL
**Source:** `docs/FEATURE-GAP-ANALYSIS.md`
**Competitors:** ALL major apps have this

**What's Missing:**
- [ ] Write workouts to Apple Health
- [ ] Read heart rate data during workouts
- [ ] Sync body measurements (weight, body fat)
- [ ] Read sleep data for recovery insights
- [ ] Google Fit equivalent for Android
- [ ] Bi-directional sync (read + write)

**Estimated Effort:** 2-3 weeks

### 2.4 Rest Timer Improvements

**Gap Level:** HIGH
**Current State:** Basic rest timer exists in `workoutSessionStore`

**What's Missing:**
- [ ] Auto-start timer after logging set
- [ ] Per-exercise default rest times
- [ ] Watch vibration/sound alerts
- [ ] Timer visible while browsing other exercises
- [ ] Quick adjust (+30s, -30s buttons)
- [ ] Timer presets (60s, 90s, 120s, 180s)

**Estimated Effort:** 1-2 weeks

### 2.5 1RM Tracking & Estimation

**Gap Level:** HIGH
**Source:** `docs/FEATURE-GAP-ANALYSIS.md`

**What's Missing:**
- [ ] Estimated 1RM calculation (Epley, Brzycki formulas)
- [ ] 1RM progression charts over time
- [ ] 1RM personal records by exercise
- [ ] Projected true 1RM
- [ ] 1RM goals and tracking

**Estimated Effort:** 1 week

### 2.6 Progress Photos Enhancement

**Gap Level:** HIGH
**Current State:** Basic implementation at `src/pages/Progress-photos.tsx`

**What's Missing:**
- [ ] Side-by-side comparison view improvements
- [ ] Photo timeline/gallery enhancements
- [ ] Body part categorization refinement
- [ ] Overlay grids for consistent positioning

**Estimated Effort:** 1-2 weeks

---

## Part 3: High Priority Features (P1)

Strong retention drivers - competitors differentiate with these.

### 3.1 Nutrition Tracking (Basic)

**Source:** `docs/IMPLEMENTATION_PLAN_REMAINING.md` Phase 4.1

**Current State:** Not implemented (placeholder only)

**What's Needed:**
- [ ] Database schema for meals/foods
- [ ] Food database integration (USDA or Nutritionix)
- [ ] Daily calorie tracking
- [ ] Macro tracking (protein, carbs, fat)
- [ ] Meal logging interface
- [ ] Calorie goal based on activity level
- [ ] Integration with weight goals

**Estimated Effort:** 4-6 weeks (in-house) or 2-3 weeks (API integration)

### 3.2 Sleep & Recovery Score

**Source:** `docs/FEATURE-GAP-ANALYSIS.md`

**What's Needed:**
- [ ] Sleep duration tracking (manual or via wearables)
- [ ] Sleep quality rating
- [ ] Recovery score calculation
- [ ] Training recommendations based on recovery
- [ ] HRV integration from wearables

**Estimated Effort:** 2-3 weeks

### 3.3 Workout Templates & Programs

**Source:** `docs/FEATURE-GAP-ANALYSIS.md`

**What's Needed:**
- [ ] Save workout as reusable template
- [ ] Multi-week structured programs (PPL, 5x5, PHUL)
- [ ] Program scheduling
- [ ] Program progress tracking
- [ ] Community-shared programs
- [ ] Pre-made program library

**Estimated Effort:** 3-4 weeks

### 3.4 RPE & RIR Tracking

**Source:** `docs/FEATURE-GAP-ANALYSIS.md`

**What's Needed:**
- [ ] RPE (Rate of Perceived Exertion) per set
- [ ] RIR (Reps in Reserve) per set
- [ ] Trends over time
- [ ] Auto-regulation suggestions

**Estimated Effort:** 1 week

### 3.5 Supersets & Circuit UI

**Source:** `docs/FEATURE-GAP-ANALYSIS.md`

**What's Needed:**
- [ ] Visual grouping of exercises in superset
- [ ] Drag-drop to create supersets
- [ ] Giant sets (3+ exercises)
- [ ] Circuit mode (timed rotations)

**Estimated Effort:** 2 weeks

### 3.6 Offline Mode Enhancement

**Current State:** Basic service worker support

**What's Needed:**
- [ ] Full workout logging offline
- [ ] Exercise database cached locally
- [ ] Sync queue with conflict resolution
- [ ] Extended offline duration (30+ days)
- [ ] Offline indicator in UI

**Estimated Effort:** 2-3 weeks

### 3.7 USA Gymnastics Program Expansion

**Source:** `docs/IMPLEMENTATION_PLAN_REMAINING.md` Phase 2.5

**What's Needed:**
- [ ] 10 new apparatus-specific skill trees
- [ ] 500+ individual USAG skills
- [ ] Difficulty ratings (A-G)
- [ ] Level-appropriate progressions (1-10 + Elite)
- [ ] Gender-specific trees (Male/Female)
- [ ] Code of Points references

**Database Additions:**
- `apparatus` field on skill trees
- `usag_level` field on skill nodes
- `difficulty_value` field
- `gender` field
- `code_of_points_id`

**Estimated Effort:** Large (500+ skills to enter)

### 3.8 Supplementation Module Structure

**Source:** `docs/IMPLEMENTATION_PLAN_REMAINING.md` Phase 4.2

**What's Needed:**
- [ ] Database schema
- [ ] Supplement database
- [ ] Dosage tracking
- [ ] Timing reminders
- [ ] Stack recommendations
- [ ] Safety warnings

**Estimated Effort:** 2-3 weeks (structure only)

---

## Part 4: Medium Priority Features (P2)

Nice-to-have improvements.

### 4.1 Touchscreen UX Optimization

**Source:** `docs/IMPLEMENTATION_PLAN_REMAINING.md` Phase 5.1

**What's Needed:**
- [ ] One-tap interaction audit
- [ ] Eliminate multi-tap patterns
- [ ] Undo-instead-of-confirm pattern
- [ ] Swipe gesture support
- [ ] 48dp minimum touch targets
- [ ] Haptic feedback integration

**Areas to Improve:**
- Exercise cards (tap to add)
- Settings (auto-save on toggle)
- Navigation (swipe gestures)
- Workout logging (auto-advance)
- Modals (tap outside to close)

**Estimated Effort:** Ongoing (incremental)

### 4.2 AI Form Feedback (Video Analysis)

**Source:** `docs/FEATURE-GAP-ANALYSIS.md`

**What's Needed:**
- [ ] Camera-based form analysis
- [ ] Real-time feedback on technique
- [ ] Rep counting via video
- [ ] Posture correction suggestions

**Tech:** MediaPipe or TensorFlow Lite

**Estimated Effort:** 8-12 weeks

### 4.3 Workout Music/Playlists Integration

**What's Needed:**
- [ ] Spotify/Apple Music integration
- [ ] BPM-matched playlists
- [ ] In-app playback controls

**Estimated Effort:** 2-3 weeks

### 4.4 Body Measurements Tracking

**What's Needed:**
- [ ] Body measurements (chest, waist, arms, legs)
- [ ] Measurement history with graphs
- [ ] Progress visualization
- [ ] Measurement reminders

**Estimated Effort:** 1-2 weeks

### 4.5 Strava Integration

**What's Needed:**
- [ ] Push workouts to Strava
- [ ] Import Strava activities
- [ ] Map-based activity display
- [ ] Social sharing

**Estimated Effort:** 2 weeks

### 4.6 Garmin Connect Integration

**What's Needed:**
- [ ] Import Garmin activities
- [ ] Read Garmin health metrics
- [ ] Push workouts
- [ ] Sync steps, sleep, heart rate

**Estimated Effort:** 2-3 weeks

### 4.7 3D Anatomical Models

**Source:** `docs/IMPLEMENTATION_PLAN_REMAINING.md` Phase 6.1

**What's Needed:**
- [ ] Three.js integration
- [ ] Full 3D male/female models
- [ ] Individual muscle highlighting
- [ ] Rotation and zoom controls

**Estimated Effort:** Large

---

## Part 5: Security & Data Integrity Issues

From `docs/STAGE-4-5-6-SIMULATION-ANALYSIS-PLAN.md`

### 5.1 Security Bugs (VERIFIED STATUS)

| ID | Location | Issue | Status | Priority |
|----|----------|-------|--------|----------|
| SEC-001 | communities.service.ts | SQL injection | **FIXED** (uses parameterized queries) | N/A |
| SEC-002 | communities.service.ts | SQL injection | **FIXED** (uses parameterized queries) | N/A |
| SEC-003 | rivals.service.ts | Missing crypto import | **FIXED** (import present) | N/A |
| SEC-004 | credit.service.ts | Idempotency key collision | NEEDS VERIFICATION | Medium |

### 5.2 Data Integrity Issues

| ID | Location | Issue | Status | Fix |
|----|----------|-------|--------|-----|
| INT-001 | wallet.service.ts | Rate limit reset clock sensitivity | PENDING | Add time buffer |
| INT-002 | crews.service.ts | Race condition on crew creation | PENDING | Atomic insert |
| INT-003 | earning.service.ts | No upper bound on daily limits | PENDING | Add defaults |
| INT-004 | stats.service.ts | Race condition on stats update | PENDING | Optimistic locking |

### 5.3 Logic Errors

| ID | Location | Issue | Fix |
|----|----------|-------|-----|
| LOG-001 | leaderboard.service.ts | Percentile off-by-one error | Fix formula |
| LOG-002 | rivals.service.ts | Win condition logic error | Fix logic |
| LOG-003 | crews.service.ts | War streak calculation wrong | Fix algorithm |
| LOG-004 | antiabuse.service.ts | Wrong column names in query | Fix query |

---

## Part 6: Race Conditions (5 Critical)

From `docs/STAGE-4-5-6-SIMULATION-ANALYSIS-PLAN.md`

| ID | Scenario | Tables | Risk | Fix |
|----|----------|--------|------|-----|
| RC-001 | Concurrent credit transfers | credit_balances, credit_ledger | Double-spend | Advisory lock on sender |
| RC-002 | Concurrent crew join requests | crew_members | User joins multiple crews | Unique constraint or SELECT FOR UPDATE |
| RC-003 | Concurrent stats updates | character_stats | Lost updates | Version column with optimistic locking |
| RC-004 | Concurrent rivalry creation | rivalries | Duplicate rivalries | Bidirectional unique constraint |
| RC-005 | Cache invalidation during read | Redis | Stale data 60s+ | Invalidate BEFORE commit |

---

## Part 7: Performance Bottlenecks

| ID | Endpoint | Current | Target | Fix |
|----|----------|---------|--------|-----|
| PERF-001 | GET /api/leaderboard | ~500ms | <100ms | Covering index, cursor pagination |
| PERF-002 | GET /api/community/feed | ~800ms | <200ms | DataLoader for batch loading |
| PERF-003 | POST /api/workout | ~300ms | <150ms | Batch writes in single transaction |
| PERF-004 | GET /api/stats/history | ~1s | <200ms | BRIN index on date |
| PERF-005 | tu_calculate (JavaScript) | ~20ms | <2ms | Use native libtu module |

---

## Part 8: Edge Cases (20+)

Sample from `docs/STAGE-4-5-6-SIMULATION-ANALYSIS-PLAN.md`:

| ID | Scenario | Current | Expected | Fix |
|----|----------|---------|----------|-----|
| EC-001 | Transfer to suspended wallet | Transfer succeeds | Rejected with error | Check wallet status |
| EC-002 | Workout with 501 reps | Accepted | Rejected | Add 1-500 validation |
| EC-003 | Leave crew as only owner | Allowed, orphans crew | Blocked | Check if only owner |
| EC-004 | Negative exercise difficulty | Breaks calculation | Validated 1-5 | Add validation |
| EC-005 | Message blocked user | Sent but not delivered | Rejected with error | Check blocks first |

---

## Part 9: Implementation Roadmap

### Phase 1: Quick Wins (Week 1)
**Days 1-2: Code TODOs**
- [ ] Fix all 8 TODO comments in code
- [ ] Run `pnpm typecheck` and `pnpm test`
- [ ] Deploy

**Days 3-5: Data Integrity**
- [ ] Fix INT-001 through INT-004
- [ ] Fix LOG-001 through LOG-004
- [ ] Add unit tests for each fix

### Phase 2: Critical Features (Weeks 2-5)
**Week 2: 1RM & Rest Timer**
- [ ] Implement 1RM calculation and UI
- [ ] Enhance rest timer with all features

**Week 3: Apple Health Integration**
- [ ] Implement HealthKit read/write
- [ ] Test on real devices

**Weeks 4-5: Progress Photos & Templates**
- [ ] Enhance progress photos comparison
- [ ] Implement workout templates

### Phase 3: Race Conditions & Performance (Week 6)
- [ ] Fix RC-001 through RC-005
- [ ] Implement PERF-001 through PERF-005
- [ ] Add database indexes

### Phase 4: Major Features (Weeks 7-12)
**Weeks 7-10: Apple Watch App**
- [ ] WatchConnectivity integration
- [ ] Watch UI implementation
- [ ] Testing and refinement

**Weeks 11-12: Nutrition Module**
- [ ] Database schema
- [ ] API endpoints
- [ ] Basic UI

### Phase 5: Enhancement Features (Weeks 13+)
- Video exercise demos (licensed or created)
- Sleep & recovery tracking
- Workout programs
- Third-party integrations

---

## Part 10: Pending Approvals

From `docs/MASTER-IMPLEMENTATION-PLAN.md`:

The following items require explicit approval before implementation:

1. [ ] Wealth tier system design (already documented in CLAUDE.md)
2. [ ] Test harness architecture
3. [ ] Bug fix priorities
4. [ ] Performance optimization approach
5. [ ] 21-day timeline for comprehensive refactor

---

## Quick Reference: Commands

```bash
# Run all tests
pnpm test

# Run E2E journey test
pnpm test:e2e:api

# Run comprehensive test harness
pnpm test:harness

# Type check
pnpm typecheck

# Deploy
./deploy.sh "description"

# Check services
./scripts/musclemap-start.sh --status
```

---

## Document Maintenance

This document should be updated:
- **Weekly:** Mark items as complete, add new discoveries
- **After each deployment:** Update status of implemented features
- **Monthly:** Review priorities based on user feedback

---

*Ready for implementation. Prioritize Phase 1 (Quick Wins) first.*
