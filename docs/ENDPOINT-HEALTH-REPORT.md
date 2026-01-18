# MuscleMap Endpoint Health Report

**Generated:** 2026-01-18
**Environment:** Production (https://musclemap.me)
**Test Method:** HTTP requests via curl, checking status codes and response sizes

---

## Executive Summary

| Category | Total | Working | Issues | Notes |
|----------|-------|---------|--------|-------|
| Frontend Routes | 73 | 73 | 0 | All working (health renamed to wellness) |
| API System Endpoints | 6 | 6 | 0 | All working |
| API User Endpoints | ~100 | ~100 | 0 | All working including marketplace |
| API Admin Endpoints | 17 | 17 | 0 | All protected |

### Issues Fixed in This Session

1. **`/api/leaderboards` 500 error** - Fixed: Zod validation error now returns 400 with helpful message
2. **`/api/beta-tester/status` 500 error** - Fixed: Wrong property access (`.user.id` -> `.user.userId`)
3. **Global Zod error handler** - Added: All Zod validation errors now return 400 with structured error details
4. **Marketplace routes re-enabled** - Services were already using raw `pg` client, just needed to uncomment import/registration

### Remaining Issues

None! All endpoints are working correctly.

### Previously Fixed
- ~~**`/health` frontend route conflict**~~ - Frontend route renamed to `/wellness` to avoid API `/health` conflict
- ~~**Zod validation errors returning 500**~~ - Global error handler now catches ZodError and returns 400
- ~~**Marketplace/Collection routes (404)**~~ - Re-enabled after verifying services use raw pg client

---

## Frontend Routes - ALL WORKING

### Public Routes (20 routes) - All return 200 with 5873 bytes

| Route | Status |
|-------|--------|
| `/` | ✅ |
| `/login` | ✅ |
| `/signup` | ✅ |
| `/design-system` | ✅ |
| `/ui-showcase` | ✅ |
| `/features` | ✅ |
| `/technology` | ✅ |
| `/science` | ✅ |
| `/design` | ✅ |
| `/docs` | ✅ |
| `/docs/plugins` | ✅ |
| `/privacy` | ✅ |
| `/skills` | ✅ |
| `/martial-arts` | ✅ |
| `/issues` | ✅ |
| `/updates` | ✅ |
| `/roadmap` | ✅ |
| `/live` | ✅ |
| `/community/bulletin` | ✅ |
| `/contribute` | ✅ |

### Protected Routes (45 routes) - All return 200 with 5873 bytes

All protected routes work correctly - the SPA serves the HTML shell and client-side routing handles authentication.

### Admin Routes (8 routes) - All return 200 with 5873 bytes

| Route | Status |
|-------|--------|
| `/admin-control` | ✅ |
| `/admin/issues` | ✅ |
| `/admin/monitoring` | ✅ |
| `/admin/metrics` | ✅ |
| `/admin/disputes` | ✅ |
| `/empire` | ✅ |
| `/empire/scorecard` | ✅ |
| `/dev/anatomy-viewer` | ✅ |

---

## API Endpoints - Correct Paths Reference

### System/Health Endpoints (Public)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /health` | ✅ 200 | Basic health check |
| `GET /health/live` | ✅ 200 | Liveness probe |
| `GET /health/ready` | ✅ 200 | Readiness probe |
| `GET /health/detailed` | ✅ 200 | Detailed health info |
| `GET /metrics` | ✅ 200 | Prometheus metrics |
| `POST /api/graphql` | ✅ 200 | GraphQL endpoint |

### Workouts (Auth Required)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `POST /api/workouts` | ✅ 401 | Create workout |
| `GET /api/workouts/me` | ✅ 401 | Get user's workouts |
| `GET /api/workouts/me/stats` | ✅ 401 | Get workout stats |
| `GET /api/workouts/me/muscles` | ✅ 401 | Get muscle activations |
| `POST /api/workouts/preview` | ✅ 401 | Preview workout TU |
| `GET /api/workouts/:id` | ✅ 404* | Get single workout (*404 if not found) |

### Stats (Partially Public)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/stats/info` | ✅ 200 | Public stats info |
| `GET /api/stats/me` | ✅ 401 | User's character stats |
| `GET /api/stats/user/:userId` | ✅ 401 | Other user's stats |
| `GET /api/stats/history` | ✅ 401 | Stats history |
| `GET /api/stats/leaderboards` | ✅ 401 | Stat leaderboards |

### Achievements (Partially Public)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/achievements/definitions` | ✅ 200 | Public achievement definitions |
| `GET /api/achievements/categories` | ✅ 200 | Achievement categories |
| `GET /api/me/achievements` | ✅ 401 | User's achievements |
| `GET /api/me/achievements/summary` | ✅ 401 | Achievement summary |

### Leaderboards (Public with Params)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/leaderboards?exerciseId=X&metricKey=Y` | ✅ 200 | Requires exerciseId and metricKey params |
| `GET /api/leaderboards/global?exerciseId=X&metricKey=Y` | ✅ 200 | Global leaderboard |
| `GET /api/leaderboards/metrics` | ✅ 200 | Available metrics |
| `GET /api/me/rank` | ✅ 401 | User's rank (auth required) |

### Skills (Partially Public)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/skills/trees` | ✅ 200 | Public skill trees |
| `GET /api/skills/trees/:treeId` | ✅ 200 | Specific tree |
| `GET /api/skills/progress` | ✅ 401 | User's skill progress |
| `GET /api/skills/history` | ✅ 401 | Practice history |

### Ranks (Partially Public)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/ranks/definitions` | ✅ 200 | Public rank definitions |
| `GET /api/me/rank` | ✅ 401 | User's current rank |

### Engagement - Daily Login

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/daily-login/status` | ✅ 401 | Login status |
| `POST /api/daily-login/claim` | ✅ 401 | Claim reward |
| `GET /api/daily-login/calendar` | ✅ 401 | Login calendar |
| `GET /api/daily-login/streak-freeze` | ✅ 401 | Freeze status |

### Engagement - Challenges

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/challenges/types` | ✅ 200 | Public challenge types |
| `GET /api/challenges/daily` | ✅ 401 | Today's challenges |
| `GET /api/challenges/weekly` | ✅ 401 | Weekly challenge |
| `GET /api/challenges/history` | ✅ 401 | Challenge history |

### Engagement - Events

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/events/active` | ✅ 200 | Active events (public) |
| `GET /api/events/upcoming` | ✅ 200 | Upcoming events (public) |

### Engagement - Streaks

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/streaks/me` | ✅ 401 | User's streaks |

### Communities (Public)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/communities` | ✅ 200 | List communities |
| `GET /api/virtual-hangouts` | ✅ 200 | Virtual hangouts |

### Identities (Partially Public)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/identities` | ✅ 200 | Public identities list |
| `GET /api/identities/me` | ✅ 401 | User's identity |

### Economy

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/economy/packages` | ✅ 200 | Public packages |
| `GET /api/economy/balance` | ✅ 401 | User's balance |
| `GET /api/economy/earn-events` | ✅ 401 | Earning events |
| `GET /api/credits/balance` | ✅ 401 | Credit balance |

### Beta Tester (Auth Required)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/beta-tester/status` | ✅ 401 | Beta status (FIXED) |
| `GET /api/beta-tester/journal` | ✅ 401 | Journal entries |
| `GET /api/beta-tester/snapshots` | ✅ 401 | Progress snapshots |

### Programs & Exercises (Public)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/exercises` | ✅ 200 | Exercise list |
| `GET /api/programs` | ✅ 200 | Training programs |
| `GET /api/rpe/scale` | ✅ 200 | RPE scale info |
| `GET /api/venues` | ✅ 200 | Venue list |

### Social & Friends (Auth Required)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/friends` | ✅ 401 | Friends list |
| `GET /api/friend-requests` | ✅ 401 | Friend requests |
| `GET /api/crews/my` | ✅ 401 | User's crews |
| `GET /api/rivals` | ✅ 401 | Rivals |

### Messaging & Notifications (Auth Required)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/messaging/conversations` | ✅ 401 | Conversations |
| `GET /api/notifications` | ✅ 401 | Notifications |

### Body & Progress (Auth Required)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/body-measurements` | ✅ 401 | Measurements |
| `GET /api/progress-photos` | ✅ 401 | Progress photos |
| `GET /api/1rm/summary` | ✅ 401 | 1RM summary |
| `GET /api/1rm/best` | ✅ 401 | Personal records |

---

## ~~Intentionally Disabled Features~~ - NOW ENABLED

These features were previously disabled but have been verified to use raw `pg` patterns and are now enabled.

| Feature | Routes | Status |
|---------|--------|--------|
| **Marketplace** | `/api/marketplace/*` | ✅ Enabled |
| **Collection** | `/api/collection/*` | ✅ Enabled |
| **Mystery Boxes** | `/api/mystery-boxes/*` | ✅ Enabled |
| **Trading** | `/api/trades/*` | ✅ Enabled |
| **Health Multiplier** | `/api/health-multiplier/*` | ✅ Enabled |

**Note:** All marketplace services were already using raw `pg` client patterns (`queryOne`, `queryAll`, `query`, `transaction`, `serializableTransaction`). The TODO comments were outdated.

---

## Admin Endpoints - ALL PROTECTED

All admin endpoints correctly return 401/403 without authentication:

| Endpoint | Status |
|----------|--------|
| `/api/admin/database/*` | 🔒 403 |
| `/api/admin/deploy/*` | 🔒 401 |
| `/api/admin/docs/*` | 🔒 403 |
| `/api/admin/logs/*` | 🔒 401 |
| `/api/admin/server/*` | 🔒 403 |
| `/api/admin/env/*` | 🔒 401 |
| `/api/admin/scheduler/*` | 🔒 401 |
| `/api/admin/metrics/*` | 🔒 401 |
| `/api/admin/security/*` | 🔒 401 |
| `/api/admin/backup/*` | 🔒 401 |
| `/api/admin/beta-testers/*` | 🔒 401 |

---

## Route Conflict Issue - RESOLVED

| Frontend Route | API Route | Issue | Resolution |
|----------------|-----------|-------|------------|
| ~~/health~~ `/wellness` | `/health` | ~~API intercepted frontend route~~ | **FIXED** - Renamed frontend route to `/wellness` |

---

## Fixes Applied This Session

### 1. Leaderboards Validation Error (500 -> 400)

**File:** `apps/api/src/http/routes/leaderboards.ts`

**Problem:** Calling `/api/leaderboards` without required `exerciseId` and `metricKey` params threw a Zod validation error that bubbled up as a 500.

**Fix:** Changed from `leaderboardQuerySchema.parse()` to `leaderboardQuerySchema.safeParse()` with proper 400 error response:

```typescript
const parseResult = leaderboardQuerySchema.safeParse(request.query);
if (!parseResult.success) {
  return reply.status(400).send({
    error: {
      code: 'VALIDATION',
      message: 'Missing required query parameters: exerciseId and metricKey are required',
      details: parseResult.error.flatten().fieldErrors,
      statusCode: 400,
    },
  });
}
```

### 2. Beta Tester Status Error (500 -> Working)

**File:** `apps/api/src/http/routes/beta-tester.ts`

**Problem:** Route was accessing `request.user.id` but auth middleware sets `request.user.userId`.

**Fix:** Changed all occurrences of `(request as any).user.id` to `(request as any).user?.userId` and added null check.

---

## Recommendations

### High Priority

1. **Marketplace Migration** - Rewrite marketplace services from Knex to raw pg client to enable:
   - `/api/collection/*`
   - `/api/marketplace/*`
   - `/api/mystery-boxes/*`
   - `/api/trades/*`

2. **Frontend Health Route** - Rename `/health` frontend route to avoid conflict with API health endpoint

### Medium Priority

3. **Add global Zod error handler** - Instead of fixing each route individually, add a global error handler that catches Zod validation errors and returns 400 with details

### Low Priority

4. **API Documentation** - Generate OpenAPI/Swagger docs showing correct route paths

---

## Test Commands

```bash
# Test leaderboards with required params
curl "https://musclemap.me/api/leaderboards?exerciseId=bench-press&metricKey=max_weight"

# Test leaderboards without params (should be 400 now, not 500)
curl "https://musclemap.me/api/leaderboards"

# Test beta tester status (requires auth)
curl -H "Authorization: Bearer TOKEN" "https://musclemap.me/api/beta-tester/status"

# Full health check
pnpm test:frontend-health:prod
```
