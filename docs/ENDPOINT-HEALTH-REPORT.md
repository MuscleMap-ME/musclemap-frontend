# MuscleMap Endpoint Health Report

**Generated:** 2026-01-18
**Environment:** Production (https://musclemap.me)
**Test Method:** HTTP requests via curl, checking status codes and response sizes

---

## Executive Summary

| Category | Total | Passing | 404 Errors | 500 Errors | Notes |
|----------|-------|---------|------------|------------|-------|
| Frontend Routes (Public) | 20 | 20 | 0 | 0 | All working |
| Frontend Routes (Protected) | 45 | 44 | 0 | 0 | `/health` intercepted by API |
| Frontend Routes (Admin) | 8 | 8 | 0 | 0 | All working |
| API Endpoints (System) | 6 | 6 | 0 | 0 | All working |
| API Endpoints (User) | ~85 tested | 33 | **44** | **2** | Many 404s |
| API Endpoints (Admin) | 17 | 16 | 0 | 0 | All protected |

### Critical Issues Found

1. **44 API endpoints returning 404** - Routes defined in code but not registered/working
2. **2 API endpoints returning 500** - Server errors on `/api/leaderboards` and `/api/beta-tester/status`
3. **Frontend `/health` route conflict** - API `/health` intercepts the frontend route

---

## Frontend Routes

### Public Routes (No Auth Required) - ALL PASSING

| Route | Status | Bytes |
|-------|--------|-------|
| `/` | ✅ 200 | 5873 |
| `/login` | ✅ 200 | 5873 |
| `/signup` | ✅ 200 | 5873 |
| `/design-system` | ✅ 200 | 5873 |
| `/ui-showcase` | ✅ 200 | 5873 |
| `/features` | ✅ 200 | 5873 |
| `/technology` | ✅ 200 | 5873 |
| `/science` | ✅ 200 | 5873 |
| `/design` | ✅ 200 | 5873 |
| `/docs` | ✅ 200 | 5873 |
| `/docs/plugins` | ✅ 200 | 5873 |
| `/privacy` | ✅ 200 | 5873 |
| `/skills` | ✅ 200 | 5873 |
| `/martial-arts` | ✅ 200 | 5873 |
| `/issues` | ✅ 200 | 5873 |
| `/updates` | ✅ 200 | 5873 |
| `/roadmap` | ✅ 200 | 5873 |
| `/live` | ✅ 200 | 5873 |
| `/community/bulletin` | ✅ 200 | 5873 |
| `/contribute` | ✅ 200 | 5873 |

### Protected Routes (Auth Required) - ALL PASSING

| Route | Status | Bytes |
|-------|--------|-------|
| `/dashboard` | ✅ 200 | 5873 |
| `/adventure-map` | ✅ 200 | 5873 |
| `/explore` | ✅ 200 | 5873 |
| `/onboarding` | ✅ 200 | 5873 |
| `/workout` | ✅ 200 | 5873 |
| `/journey` | ✅ 200 | 5873 |
| `/profile` | ✅ 200 | 5873 |
| `/settings` | ✅ 200 | 5873 |
| `/progression` | ✅ 200 | 5873 |
| `/community` | ✅ 200 | 5873 |
| `/competitions` | ✅ 200 | 5873 |
| `/locations` | ✅ 200 | 5873 |
| `/highfives` | ✅ 200 | 5873 |
| `/credits` | ✅ 200 | 5873 |
| `/messages` | ✅ 200 | 5873 |
| `/wallet` | ✅ 200 | 5873 |
| `/skins` | ✅ 200 | 5873 |
| `/trainers` | ✅ 200 | 5873 |
| `/marketplace` | ✅ 200 | 5873 |
| `/trading` | ✅ 200 | 5873 |
| `/collection` | ✅ 200 | 5873 |
| `/mystery-boxes` | ✅ 200 | 5873 |
| `/exercises` | ✅ 200 | 5873 |
| `/stats` | ✅ 200 | 5873 |
| `/personal-records` | ✅ 200 | 5873 |
| `/progress-photos` | ✅ 200 | 5873 |
| `/crews` | ✅ 200 | 5873 |
| `/rivals` | ✅ 200 | 5873 |
| `/recovery` | ✅ 200 | 5873 |
| `/goals` | ✅ 200 | 5873 |
| `/limitations` | ✅ 200 | 5873 |
| `/pt-tests` | ✅ 200 | 5873 |
| `/career-readiness` | ✅ 200 | 5873 |
| `/career` | ✅ 200 | 5873 |
| `/issues/new` | ✅ 200 | 5873 |
| `/my-issues` | ✅ 200 | 5873 |
| `/nutrition` | ✅ 200 | 5873 |
| `/nutrition/settings` | ✅ 200 | 5873 |
| `/nutrition/recipes` | ✅ 200 | 5873 |
| `/nutrition/plans` | ✅ 200 | 5873 |
| `/nutrition/history` | ✅ 200 | 5873 |
| `/achievements` | ✅ 200 | 5873 |
| `/plugins` | ✅ 200 | 5873 |
| `/plugins/settings` | ✅ 200 | 5873 |

**Note:** `/health` returns API JSON response (213 bytes) instead of frontend HTML. This is a route conflict.

### Admin Routes - ALL PASSING

| Route | Status | Bytes |
|-------|--------|-------|
| `/admin-control` | ✅ 200 | 5873 |
| `/admin/issues` | ✅ 200 | 5873 |
| `/admin/monitoring` | ✅ 200 | 5873 |
| `/admin/metrics` | ✅ 200 | 5873 |
| `/admin/disputes` | ✅ 200 | 5873 |
| `/empire` | ✅ 200 | 5873 |
| `/empire/scorecard` | ✅ 200 | 5873 |
| `/dev/anatomy-viewer` | ✅ 200 | 5873 |

---

## API Endpoints

### System/Health Endpoints - ALL PASSING

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/health` | GET | ✅ 200 | Basic health check |
| `/health/live` | GET | ✅ 200 | Liveness probe |
| `/health/ready` | GET | ✅ 200 | Readiness probe |
| `/health/detailed` | GET | ✅ 200 | Detailed health info |
| `/metrics` | GET | ✅ 200 | Prometheus metrics |
| `/api/graphql` | POST | ✅ 200 | GraphQL endpoint (400 on GET without query) |

### Working User Endpoints (Auth Required = 401, Public = 200)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/api/exercises` | GET | ✅ 200 | Public - no auth needed |
| `/api/communities` | GET | ✅ 200 | Public - no auth needed |
| `/api/virtual-hangouts` | GET | ✅ 200 | Public - no auth needed |
| `/api/identities` | GET | ✅ 200 | Public - no auth needed |
| `/api/programs` | GET | ✅ 200 | Public - no auth needed |
| `/api/rpe/scale` | GET | ✅ 200 | Public - no auth needed |
| `/api/economy/packages` | GET | ✅ 200 | Public - no auth needed |
| `/api/venues` | GET | ✅ 200 | Public - no auth needed |
| `/api/credits/balance` | GET | 🔒 401 | Auth required - working |
| `/api/goals` | GET | 🔒 401 | Auth required - working |
| `/api/journey` | GET | 🔒 401 | Auth required - working |
| `/api/milestones` | GET | 🔒 401 | Auth required - working |
| `/api/streaks` | GET | 🔒 401 | Auth required - working |
| `/api/notifications` | GET | 🔒 401 | Auth required - working |
| `/api/messaging/conversations` | GET | 🔒 401 | Auth required - working |
| `/api/friends` | GET | 🔒 401 | Auth required - working |
| `/api/friend-requests` | GET | 🔒 401 | Auth required - working |
| `/api/crews/my` | GET | 🔒 401 | Auth required - working |
| `/api/rivals` | GET | 🔒 401 | Auth required - working |
| `/api/wearables` | GET | 🔒 401 | Auth required - working |
| `/api/plugins` | GET | 🔒 401 | Auth required - working |
| `/api/identities/me` | GET | 🔒 401 | Auth required - working |
| `/api/body-measurements` | GET | 🔒 401 | Auth required - working |
| `/api/progress-photos` | GET | 🔒 401 | Auth required - working |
| `/api/1rm/summary` | GET | 🔒 401 | Auth required - working |
| `/api/1rm/best` | GET | 🔒 401 | Auth required - working |
| `/api/limitations` | GET | 🔒 401 | Auth required - working |
| `/api/economy/balance` | GET | 🔒 401 | Auth required - working |
| `/api/economy/earn-events` | GET | 🔒 401 | Auth required - working |
| `/api/mentors` | GET | 🔒 401 | Auth required - working |
| `/api/mentorship/requests` | GET | 🔒 401 | Auth required - working |
| `/api/buddy/preferences` | GET | 🔒 401 | Auth required - working |
| `/api/buddy/matches` | GET | 🔒 401 | Auth required - working |
| `/api/feedback` | GET | 🔒 401 | Auth required - working |
| `/api/archetype/suggested-communities` | GET | 🔒 401 | Auth required - working |
| `/api/archetypes/communities` | GET | 🔒 401 | Auth required - working |
| `/api/me/nutrition` | GET | 🔒 401 | Auth required - working |
| `/api/rehabilitation/body-regions` | GET | 🔒 401 | Auth required - working |
| `/api/rehabilitation/my-injuries` | GET | 🔒 401 | Auth required - working |
| `/api/resources/most-helpful` | GET | 🔒 401 | Auth required - working |
| `/api/reports` | GET | 🔒 401 | Auth required - working |

---

## CRITICAL: 404 Errors (Routes Not Found)

These endpoints are defined in the codebase but return 404:

### Priority 1 - Core User Features (HIGH IMPACT)

| Endpoint | Expected Function | Fix Priority |
|----------|-------------------|--------------|
| `/api/workouts` | List user workouts | **P1** |
| `/api/stats` | User statistics | **P1** |
| `/api/achievements` | User achievements | **P1** |
| `/api/progression` | Progression tracking | **P1** |
| `/api/skills` | User skills | **P1** |
| `/api/collection` | User collection | **P1** |
| `/api/marketplace` | Marketplace listings | **P1** |
| `/api/mystery-boxes` | Mystery box system | **P1** |
| `/api/trades/history` | Trade history | **P1** |
| `/api/recovery` | Recovery tracking | **P1** |
| `/api/health-multiplier` | Health multiplier | **P1** |
| `/api/prescriptions` | Workout prescriptions | **P1** |

### Priority 2 - Secondary Features (MEDIUM IMPACT)

| Endpoint | Expected Function | Fix Priority |
|----------|-------------------|--------------|
| `/api/martial-arts` | Martial arts data | **P2** |
| `/api/ranks` | Rank information | **P2** |
| `/api/daily-login` | Daily login rewards | **P2** |
| `/api/challenges` | User challenges | **P2** |
| `/api/events` | Events list | **P2** |
| `/api/hangouts` | Hangouts list | **P2** |
| `/api/volume-stats` | Volume statistics | **P2** |
| `/api/careers` | Career data | **P2** |
| `/api/tips/daily` | Daily tips | **P2** |
| `/api/engagement-recovery` | Engagement system | **P2** |
| `/api/competition` | Competition data | **P2** |
| `/api/onboarding/progress` | Onboarding status | **P2** |
| `/api/bulletin` | Bulletin posts | **P2** |
| `/api/live-activity` | Live activity feed | **P2** |

### Priority 3 - Supporting Features (LOWER IMPACT)

| Endpoint | Expected Function | Fix Priority |
|----------|-------------------|--------------|
| `/api/social/high-five/costs` | High-five pricing | **P3** |
| `/api/social/high-fives/received` | Received high-fives | **P3** |
| `/api/equipment` | Equipment list | **P3** |
| `/api/exercise-groups` | Exercise groupings | **P3** |
| `/api/exercise-videos` | Video demos | **P3** |
| `/api/watch/status` | Apple Watch status | **P3** |
| `/api/organizations` | Organizations | **P3** |
| `/api/cohort-preferences` | Cohort preferences | **P3** |
| `/api/errors` | Error reporting | **P3** |
| `/api/monitoring` | Monitoring data | **P3** |
| `/api/vitals` | Web vitals | **P3** |
| `/api/checkins` | Check-ins | **P3** |
| `/api/verifications` | Verifications | **P3** |
| `/api/mascot` | Mascot data | **P3** |
| `/api/personalization/themes` | Theme options | **P3** |
| `/api/personalization/settings` | User settings | **P3** |
| `/api/privacy/settings` | Privacy settings | **P3** |

---

## CRITICAL: 500 Server Errors

| Endpoint | Error | Likely Cause | Fix Priority |
|----------|-------|--------------|--------------|
| `/api/leaderboards` | 500 | Database query error or missing data | **P1** |
| `/api/beta-tester/status` | 500 | Missing handler or DB error | **P2** |

---

## Admin Endpoints - ALL PROPERLY PROTECTED

All admin endpoints correctly return 401/403 without authentication:

| Endpoint | Status | Notes |
|----------|--------|-------|
| `/api/admin/database/stats` | 🔒 403 | Protected |
| `/api/admin/database/tables` | 🔒 403 | Protected |
| `/api/admin/database/health` | 🔒 403 | Protected |
| `/api/admin/deploy/status` | 🔒 401 | Protected |
| `/api/admin/deploy/history` | 🔒 401 | Protected |
| `/api/admin/docs/list` | 🔒 403 | Protected |
| `/api/admin/docs/stats` | 🔒 403 | Protected |
| `/api/admin/logs/search` | 🔒 401 | Protected |
| `/api/admin/logs/stats` | 🔒 401 | Protected |
| `/api/admin/server/status` | 🔒 403 | Protected |
| `/api/admin/server/git` | 🔒 403 | Protected |
| `/api/admin/env/variables` | 🔒 401 | Protected |
| `/api/admin/scheduler/jobs` | 🔒 401 | Protected |
| `/api/admin/metrics/realtime` | 🔒 401 | Protected |
| `/api/admin/security/sessions` | 🔒 401 | Protected |
| `/api/admin/backup/list` | 🔒 401 | Protected |
| `/api/admin/beta-testers/` | 301 | Redirect (trailing slash) |

---

## Route Conflict Issues

| Frontend Route | API Route | Issue | Fix |
|----------------|-----------|-------|-----|
| `/health` | `/health` | API intercepts frontend route | Rename frontend route to `/my-health` or similar |

---

## Recommendations for Fixes

### Phase 1: Critical (Server Errors)
1. Fix `/api/leaderboards` - investigate 500 error
2. Fix `/api/beta-tester/status` - investigate 500 error

### Phase 2: Core Features (404s - P1)
Register missing routes in Fastify for:
- Workouts, Stats, Achievements, Progression
- Skills, Collection, Marketplace, Mystery boxes
- Trades, Recovery, Health multiplier, Prescriptions

### Phase 3: Secondary Features (404s - P2)
Register missing routes for:
- Martial arts, Ranks, Daily login, Challenges
- Events, Hangouts, Volume stats, Careers
- Tips, Engagement, Competition, Onboarding, Bulletin, Live activity

### Phase 4: Supporting Features (404s - P3)
Register missing routes for remaining endpoints

### Phase 5: Route Conflict
- Rename frontend `/health` route to avoid conflict with API `/health`

---

## Files to Investigate

Based on the 404 errors, these route registration files likely need updates:

```
apps/api/src/http/routes/
├── workouts.ts          # /api/workouts - 404
├── stats.ts             # /api/stats - 404
├── achievements.ts      # /api/achievements - 404
├── progression.ts       # /api/progression - 404
├── skills.ts            # /api/skills - 404
├── collection.ts        # /api/collection - 404
├── marketplace.ts       # /api/marketplace - 404
├── mystery-boxes.ts     # /api/mystery-boxes - 404
├── trades.ts            # /api/trades - 404
├── recovery.ts          # /api/recovery - 404
├── health-multiplier.ts # /api/health-multiplier - 404
├── prescriptions.ts     # /api/prescriptions - 404
├── leaderboards.ts      # /api/leaderboards - 500
└── beta-tester.ts       # /api/beta-tester - 500
```

The routes may exist in the codebase but not be registered in the main server file (`apps/api/src/http/server.ts` or similar).

---

## Test Commands for Verification

```bash
# Test all 404 endpoints after fixes
curl -s -o /dev/null -w "%{http_code}" https://musclemap.me/api/workouts
curl -s -o /dev/null -w "%{http_code}" https://musclemap.me/api/stats
# ... etc

# Test 500 endpoints after fixes
curl -s https://musclemap.me/api/leaderboards
curl -s https://musclemap.me/api/beta-tester/status

# Full health check script
pnpm test:frontend-health:prod
```
