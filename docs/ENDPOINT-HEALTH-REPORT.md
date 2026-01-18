# MuscleMap Endpoint Health Report

**Generated:** 2026-01-18
**Environment:** Production (https://musclemap.me)

This document catalogs all frontend routes and API endpoints, their health status, and any issues found.

## Summary

| Category | Total | Passing | Failing | Blank Page | 404 | Other Issues |
|----------|-------|---------|---------|------------|-----|--------------|
| Frontend Routes (Public) | TBD | TBD | TBD | TBD | TBD | TBD |
| Frontend Routes (Protected) | TBD | TBD | TBD | TBD | TBD | TBD |
| Frontend Routes (Admin) | TBD | TBD | TBD | TBD | TBD | TBD |
| API Endpoints (Public) | TBD | TBD | TBD | TBD | TBD | TBD |
| API Endpoints (Auth Required) | TBD | TBD | TBD | TBD | TBD | TBD |
| API Endpoints (Admin) | TBD | TBD | TBD | TBD | TBD | TBD |

---

## Frontend Routes

### Public Routes (No Auth Required)

| Route | Status | Issue | Fix Required |
|-------|--------|-------|--------------|
| `/` | PENDING | | |
| `/login` | PENDING | | |
| `/signup` | PENDING | | |
| `/design-system` | PENDING | | |
| `/ui-showcase` | PENDING | | |
| `/features` | PENDING | | |
| `/technology` | PENDING | | |
| `/science` | PENDING | | |
| `/design` | PENDING | | |
| `/docs` | PENDING | | |
| `/docs/plugins` | PENDING | | |
| `/privacy` | PENDING | | |
| `/skills` | PENDING | | |
| `/martial-arts` | PENDING | | |
| `/issues` | PENDING | | |
| `/updates` | PENDING | | |
| `/roadmap` | PENDING | | |
| `/live` | PENDING | | |
| `/community/bulletin` | PENDING | | |
| `/contribute` | PENDING | | |

### Protected Routes (Auth Required)

| Route | Status | Issue | Fix Required |
|-------|--------|-------|--------------|
| `/dashboard` | PENDING | | |
| `/adventure-map` | PENDING | | |
| `/explore` | PENDING | | |
| `/onboarding` | PENDING | | |
| `/workout` | PENDING | | |
| `/journey` | PENDING | | |
| `/profile` | PENDING | | |
| `/settings` | PENDING | | |
| `/progression` | PENDING | | |
| `/community` | PENDING | | |
| `/competitions` | PENDING | | |
| `/locations` | PENDING | | |
| `/highfives` | PENDING | | |
| `/credits` | PENDING | | |
| `/messages` | PENDING | | |
| `/wallet` | PENDING | | |
| `/skins` | PENDING | | |
| `/trainers` | PENDING | | |
| `/marketplace` | PENDING | | |
| `/trading` | PENDING | | |
| `/collection` | PENDING | | |
| `/mystery-boxes` | PENDING | | |
| `/exercises` | PENDING | | |
| `/stats` | PENDING | | |
| `/personal-records` | PENDING | | |
| `/progress-photos` | PENDING | | |
| `/crews` | PENDING | | |
| `/rivals` | PENDING | | |
| `/health` | PENDING | | |
| `/recovery` | PENDING | | |
| `/goals` | PENDING | | |
| `/limitations` | PENDING | | |
| `/pt-tests` | PENDING | | |
| `/career-readiness` | PENDING | | |
| `/career` | PENDING | | |
| `/issues/new` | PENDING | | |
| `/my-issues` | PENDING | | |
| `/nutrition` | PENDING | | |
| `/nutrition/settings` | PENDING | | |
| `/nutrition/recipes` | PENDING | | |
| `/nutrition/plans` | PENDING | | |
| `/nutrition/history` | PENDING | | |
| `/achievements` | PENDING | | |
| `/plugins` | PENDING | | |
| `/plugins/settings` | PENDING | | |

### Admin Routes

| Route | Status | Issue | Fix Required |
|-------|--------|-------|--------------|
| `/admin-control` | PENDING | | |
| `/admin/issues` | PENDING | | |
| `/admin/monitoring` | PENDING | | |
| `/admin/metrics` | PENDING | | |
| `/admin/disputes` | PENDING | | |
| `/empire` | PENDING | | |
| `/empire/scorecard` | PENDING | | |
| `/dev/anatomy-viewer` | PENDING | | |

---

## API Endpoints

### Health & System (No Auth)

| Endpoint | Method | Status | Response | Issue |
|----------|--------|--------|----------|-------|
| `/health` | GET | PENDING | | |
| `/health/live` | GET | PENDING | | |
| `/health/ready` | GET | PENDING | | |
| `/health/detailed` | GET | PENDING | | |
| `/metrics` | GET | PENDING | | |

### GraphQL

| Endpoint | Method | Status | Response | Issue |
|----------|--------|--------|----------|-------|
| `/api/graphql` | GET | PENDING | | |
| `/api/graphql` | POST | PENDING | | |

### Auth Required Endpoints (Sample - Will Test Key Ones)

| Endpoint | Method | Status | Response | Issue |
|----------|--------|--------|----------|-------|
| `/api/workouts` | GET | PENDING | | |
| `/api/exercises` | GET | PENDING | | |
| `/api/stats` | GET | PENDING | | |
| `/api/credits/balance` | GET | PENDING | | |
| `/api/achievements` | GET | PENDING | | |
| `/api/communities` | GET | PENDING | | |
| `/api/goals` | GET | PENDING | | |
| `/api/journey` | GET | PENDING | | |
| `/api/progression` | GET | PENDING | | |
| `/api/skills` | GET | PENDING | | |

---

## Issues Found

### Critical Issues (Blank Pages / 404s)

_To be populated after testing_

### Warning Issues (Slow/Errors)

_To be populated after testing_

### Minor Issues

_To be populated after testing_

---

## Fixes Required

### Priority 1 (Critical - Blank Pages)

_To be populated after testing_

### Priority 2 (404 Errors)

_To be populated after testing_

### Priority 3 (Other Issues)

_To be populated after testing_

---

## Testing Methodology

1. **Frontend Routes**: Navigate to each route and check for:
   - Blank white page (React rendering failure)
   - 404 page shown
   - JavaScript console errors
   - Content renders correctly

2. **API Endpoints**: Make HTTP requests and check for:
   - 404 Not Found
   - 500 Server Error
   - 401/403 for auth-required endpoints (expected without auth)
   - Proper JSON response structure

3. **Classification**:
   - ✅ PASS - Works correctly
   - ⚠️ WARN - Works but with issues
   - ❌ FAIL - Broken (blank page, 404, error)
   - 🔒 AUTH - Returns 401/403 as expected (for protected endpoints)
