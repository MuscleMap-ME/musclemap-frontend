# Coding Style Implementation Plan

> **Created:** January 2026
> **Status:** In Progress
> **Reference:** `docs/CODING-STYLE-GUIDE.md`

This plan outlines the concrete steps to implement the coding style guide across the MuscleMap codebase.

---

## Priority 1: Critical Issues (Immediate)

### 1.1 Fix Duplicate Migration Numbers
**Issue:** Migrations 069, 080-084 have duplicates that will cause migration failures.

**Files to rename:**
| Current | New |
|---------|-----|
| `069_nutrition_system.ts` | `085_nutrition_system.ts` |
| `080_exercise_library_expansion.ts` | `086_exercise_library_expansion.ts` |
| `081_lifeguard_career_standards.ts` | `087_lifeguard_career_standards.ts` |
| `082_skill_progressions.ts` | `088_skill_progressions.ts` |
| `083_trades_career_standards.ts` | `089_trades_career_standards.ts` |
| `084_transportation_career_standards.ts` | `090_transportation_career_standards.ts` |

**Status:** ⬜ Not Started

### 1.2 Fix N+1 Query in Messaging
**Issue:** `apps/api/src/http/routes/messaging.ts` lines 54-95 makes 4 queries per conversation.

**Current (N+1):**
```typescript
for (const conv of conversations) {
  const participants = await queryAll(...);  // N queries
  const lastMessage = await queryOne(...);   // N queries
  // etc.
}
```

**Fix:** Single query with JOINs and aggregation.

**Status:** ⬜ Not Started

---

## Priority 2: Consistency Improvements (This Week)

### 2.1 Standardize API Response Format
**Issue:** Some routes return `{ data }`, others return raw objects.

**Standard format:**
```typescript
// Success
{ data: T, meta?: { pagination?, timestamp } }

// Error
{ error: { code, message, statusCode, details? } }
```

**Files to update:**
- All routes in `apps/api/src/http/routes/`
- Create response helpers in `apps/api/src/utils/response.ts`

**Status:** ⬜ Not Started

### 2.2 Add Response Helper Functions
**Create:** `apps/api/src/utils/response.ts`

```typescript
export function successResponse<T>(data: T, meta?: ResponseMeta) {
  return { data, meta: { timestamp: new Date().toISOString(), ...meta } };
}

export function errorResponse(error: AppError) {
  return { error: { code: error.code, message: error.message, statusCode: error.statusCode } };
}

export function paginatedResponse<T>(data: T[], cursor?: string, hasMore?: boolean) {
  return { data, meta: { pagination: { cursor, hasMore }, timestamp: new Date().toISOString() } };
}
```

**Status:** ⬜ Not Started

### 2.3 Fix Unused Imports (Linter Warnings)
**Files with unused imports:**
- `src/components/career/CareerGoalWizard.jsx`
- `src/components/career/ReadinessDashboard.jsx`
- `src/components/feedback/FeedbackModal.jsx`
- `src/components/glass/GlassButton.jsx`
- `src/components/hangouts/HangoutChallengeCard.jsx`
- `src/components/nutrition/QuickLogModal.jsx`
- `src/components/stats/VolumeChart.jsx`
- `src/components/workout/RestTimerControl.jsx`
- `src/components/workout/SetLogger.jsx`
- `src/pages/CareerGoalPage.jsx`
- `src/pages/CareerPage.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/MealPlans.jsx`
- `src/pages/Nutrition.jsx`

**Status:** ⬜ Not Started

---

## Priority 3: Type Safety (This Month)

### 3.1 Add Result Pattern
**Create:** `packages/shared/src/result.ts`

```typescript
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}
```

**Status:** ⬜ Not Started

### 3.2 Add Zod Validation to Services
**Issue:** Services trust input from routes without additional validation.

**Pattern to add:**
```typescript
// At service boundary
export async function transferCredits(input: unknown) {
  const validated = transferSchema.parse(input);
  // proceed with validated data
}
```

**Priority services:**
- `apps/api/src/modules/economy/credit.service.ts`
- `apps/api/src/modules/economy/wallet.service.ts`

**Status:** ⬜ Not Started

### 3.3 Convert Key Files to TypeScript
**Priority files (currently .jsx):**
- `src/store/authStore.js` → `authStore.ts`
- `src/store/uiStore.js` → `uiStore.ts`
- `src/hooks/index.js` → `index.ts`

**Status:** ⬜ Not Started

---

## Priority 4: Performance (This Month)

### 4.1 Add DataLoader to REST Routes
**Issue:** REST routes don't use DataLoaders (only GraphQL does).

**Pattern:**
```typescript
// Create DataLoader for batching
const userLoader = new DataLoader(async (ids) => {
  const users = await db.query('SELECT * FROM users WHERE id = ANY($1)', [ids]);
  return ids.map(id => users.find(u => u.id === id));
});
```

**Status:** ⬜ Not Started

### 4.2 Add Materialized View Refresh Scheduler
**Issue:** `mv_xp_rankings` exists but no automated refresh.

**Add to:** PM2 ecosystem or cron job
```bash
# Every 5 minutes
*/5 * * * * psql -c "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_xp_rankings"
```

**Status:** ⬜ Not Started

### 4.3 Add Data Retention Scheduler
**Issue:** Retention policies defined but no scheduler.

**Add:** Background job to execute retention policies nightly.

**Status:** ⬜ Not Started

---

## Priority 5: Security Hardening (This Month)

### 5.1 Add Password Complexity Validation
**Current:** Only minimum 8 characters.
**Add:** Uppercase, lowercase, number, special character requirements.

```typescript
const passwordSchema = z.string()
  .min(8)
  .regex(/[A-Z]/, 'Must contain uppercase')
  .regex(/[a-z]/, 'Must contain lowercase')
  .regex(/[0-9]/, 'Must contain number')
  .regex(/[^A-Za-z0-9]/, 'Must contain special character');
```

**Status:** ⬜ Not Started

### 5.2 Add Refresh Token Pattern
**Issue:** 7-day JWT expiration is too long.

**Implementation:**
- Short-lived access tokens (15 minutes)
- Long-lived refresh tokens (7 days)
- Refresh endpoint to get new access token

**Status:** ⬜ Not Started

### 5.3 Add JTI to JWT for Revocation
**Issue:** JWTs can't be revoked without JTI tracking.

**Add:** Include `jti` claim in all tokens, track revocations in Redis.

**Status:** ⬜ Not Started

---

## Priority 6: Testing (Ongoing)

### 6.1 Add Frontend Component Tests
**Coverage target:** 60% for components
**Framework:** Vitest + @testing-library/react

**Priority components:**
- Login/Signup forms
- Workout tracking
- Credit operations

**Status:** ⬜ Not Started

### 6.2 Enable Coverage Reporting
**Add to:** CI pipeline

```bash
pnpm test:coverage
# Fail if below thresholds
```

**Status:** ⬜ Not Started

### 6.3 Add Accessibility Tests
**Framework:** @axe-core/playwright

**Status:** ⬜ Not Started

---

## Implementation Schedule

| Week | Focus | Tasks |
|------|-------|-------|
| 1 | Critical | Fix migrations, N+1 query |
| 2 | Consistency | Response format, unused imports |
| 3 | Type Safety | Result pattern, service validation |
| 4 | Performance | DataLoaders, schedulers |
| 5 | Security | Password, refresh tokens, JTI |
| 6+ | Testing | Component tests, coverage |

---

## Progress Tracking

### Completed
- [x] Create CODING-STYLE-GUIDE.md
- [x] Add reference to CLAUDE.md
- [ ] Fix duplicate migrations
- [ ] Fix N+1 query in messaging
- [ ] Standardize response format
- [ ] Add response helpers
- [ ] Fix unused imports
- [ ] Add Result pattern
- [ ] Add service validation
- [ ] Add DataLoaders to REST
- [ ] Add refresh scheduler
- [ ] Add retention scheduler
- [ ] Add password complexity
- [ ] Add refresh tokens
- [ ] Add JTI to JWT
- [ ] Add component tests
- [ ] Enable coverage reporting
- [ ] Add accessibility tests

---

## Notes

- Each task should be committed separately for easy rollback
- Run `pnpm typecheck && pnpm lint && pnpm test` before each commit
- Update this plan as tasks are completed
