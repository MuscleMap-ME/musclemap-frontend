# Route Cleanup Plan - MuscleMap

## Executive Summary

This document outlines a systematic cleanup of MuscleMap's routing architecture to eliminate:
- Route duplication
- Naming inconsistencies
- Orphaned pages
- Confusing shortcuts
- Non-RESTful patterns

## Current State Analysis

### Frontend Routes: 183 total
- Public: 25 routes
- Protected: 82 routes
- Admin: 8 routes
- Dynamic plugin routes: Variable
- **Issues Found**: 5 orphaned pages, naming mismatches

### API Routes: 500+ endpoints across 104 files
- **Critical Issues**: Massive duplication, dual registration, inconsistent patterns

---

## Part 1: Frontend Cleanup

### 1.1 Orphaned Pages to Resolve

| File | Current State | Action |
|------|---------------|--------|
| `AdminFraud.tsx` | No route | Add `/admin/fraud` route |
| `Buddy.tsx` | Used as component only | Keep as component, no route needed |
| `Leaderboard.tsx` | Used as embedded component | Add `/leaderboard` route for standalone view |
| `Store.tsx` | Superseded by other stores | DELETE - obsolete |
| `TrainerDashboard.tsx` | No route | Add `/trainer-dashboard` for trainers |

### 1.2 Route Naming Fixes

| Current | Issue | Fix |
|---------|-------|-----|
| `/wellness` → `Health` | Mismatch | Rename route to `/health` |

### 1.3 Frontend Route Organization

Routes will follow this hierarchy:

```
/ (public)
├── /login, /signup                    # Auth
├── /features, /technology, /science   # Marketing
├── /docs/*                            # Documentation
├── /privacy, /roadmap, /updates       # Public info
├── /live, /contribute, /issues        # Community engagement
│
/dashboard (protected - requires auth)
├── Core Experience
│   ├── /workout                       # Active workout
│   ├── /journey                       # Character progression
│   ├── /progression                   # Level/rank progress
│   └── /onboarding                    # New user setup
│
├── Profile & Settings
│   ├── /profile                       # User profile
│   └── /settings                      # Account settings
│
├── Fitness & Health
│   ├── /exercises                     # Exercise database
│   ├── /stats                         # Workout statistics
│   ├── /personal-records              # 1RM tracking
│   ├── /goals                         # Goal management
│   ├── /health                        # Health dashboard (was /wellness)
│   ├── /recovery                      # Recovery metrics
│   ├── /limitations                   # Injury tracking
│   ├── /pt-tests                      # Physical tests
│   ├── /career-readiness              # Career assessment
│   ├── /progress-photos               # Photo gallery
│   └── /leaderboard                   # Leaderboards (NEW)
│
├── Career System
│   ├── /career                        # Career hub
│   ├── /career/goals/:goalId          # Career goal
│   └── /career/standards/:standardId  # Career standard
│
├── Community & Social
│   ├── /community                     # Community hub
│   ├── /competitions                  # Challenges
│   ├── /locations                     # Hangouts
│   ├── /highfives                     # High fives
│   ├── /messages                      # DMs
│   ├── /crews                         # Teams
│   └── /rivals                        # Rival tracking
│
├── Economy & Commerce
│   ├── /credits                       # Credit balance
│   ├── /wallet                        # Transactions
│   ├── /skins                         # Cosmetics shop
│   ├── /marketplace                   # Trading
│   ├── /trading                       # P2P trading
│   ├── /collection                    # Inventory
│   ├── /mystery-boxes                 # Loot boxes
│   └── /trainers                      # Trainer hire
│
├── Nutrition System
│   ├── /nutrition                     # Dashboard
│   ├── /nutrition/settings            # Preferences
│   ├── /nutrition/recipes             # Recipes
│   ├── /nutrition/plans               # Meal plans
│   └── /nutrition/history             # History
│
├── Achievements
│   ├── /achievements                  # Achievement list
│   └── /achievements/verify/:id       # Verification
│
├── Skills & Martial Arts
│   ├── /skills                        # Skill trees
│   └── /martial-arts                  # Disciplines
│
├── Exploration
│   ├── /adventure-map                 # Quest map
│   └── /explore                       # Navigation map
│
└── Plugins
    ├── /plugins                       # Marketplace
    └── /plugins/settings              # Configuration

/admin (admin only)
├── /admin-control                     # General admin
├── /admin/issues                      # Issue moderation
├── /admin/monitoring                  # System monitoring
├── /admin/metrics                     # Performance KPIs
├── /admin/disputes                    # Disputes
├── /admin/fraud                       # Fraud detection (NEW)
└── /dev/anatomy-viewer                # Dev tools

/empire (master admin)
├── /empire                            # Master control
├── /empire/scorecard                  # Test results
└── /empire/deploy                     # Deployment

/trainer-dashboard (trainers only - NEW)
```

---

## Part 2: API Route Cleanup

### 2.1 Duplicate Routes to Consolidate

#### Economy/Credits Consolidation

**BEFORE** (3 different paths for same data):
```
GET /api/economy/balance
GET /api/credits/balance
GET /api/wallet
```

**AFTER** (single canonical path + deprecation):
```
GET /api/economy/balance           # CANONICAL
GET /api/economy/wallet            # CANONICAL
GET /api/credits/balance           # DEPRECATED → redirect to /api/economy/balance
GET /api/wallet                    # DEPRECATED → redirect to /api/economy/wallet
```

#### Full Economy Route Mapping

| Old Path | New Canonical Path | Action |
|----------|-------------------|--------|
| `/api/economy/balance` | `/api/economy/balance` | Keep |
| `/api/credits/balance` | — | Remove, use economy |
| `/api/economy/wallet` | `/api/economy/wallet` | Keep |
| `/api/credits/wallet` | — | Remove, use economy |
| `/api/wallet` | — | Remove, use economy |
| `/api/economy/history` | `/api/economy/transactions` | Keep transactions, remove history |
| `/api/economy/transactions` | `/api/economy/transactions` | Keep |

### 2.2 Remove Dual Registration

**Current Problem** (server.ts lines 490-498):
```typescript
// Register at /api/credits
await api.register(async (credits) => {
  await registerCreditsRoutes(credits);
}, { prefix: '/credits' });

// Register AGAIN at /api root (!)
await api.register(async (storeAlias) => {
  await registerCreditsRoutes(storeAlias);
}, { prefix: '' });
```

**Fix**: Remove the second registration and update frontend to use `/api/credits/*` paths.

### 2.3 Admin Route Consolidation

**BEFORE** (mixed prefixes):
```
/api/admin-control/*           # AdminControl page
/api/admin/*                   # Various admin routes
```

**AFTER** (unified):
```
/api/admin/*                   # ALL admin routes
/api/admin/control/*           # Former admin-control routes
```

### 2.4 RESTful Pattern Fixes

| Current | Issue | RESTful Fix |
|---------|-------|-------------|
| `POST /workout/complete` | Action verb | `PATCH /workouts/:id { status: 'completed' }` |
| `GET /my-issues` | Implicit filter | `GET /issues?owner=me` |
| `POST /notifications/:id/read` | Action verb | `PATCH /notifications/:id { read: true }` |
| `POST /recipes/:id/save` | Action verb | `POST /recipes/:id/saves` |
| `DELETE /recipes/:id/save` | Wrong pattern | `DELETE /recipes/:id/saves` |

### 2.5 API Route Categories

**Proposed API Structure:**

```
/api/v1/                           # Future versioning
├── /auth                          # Authentication
│   ├── POST /register
│   ├── POST /login
│   ├── POST /refresh
│   ├── POST /logout
│   └── GET /me
│
├── /users                         # User management
│   ├── GET /:id
│   ├── PATCH /:id
│   └── GET /:id/stats
│
├── /workouts                      # Workout tracking
│   ├── GET /
│   ├── POST /
│   ├── GET /:id
│   ├── PATCH /:id
│   ├── DELETE /:id
│   └── GET /:id/exercises
│
├── /exercises                     # Exercise database
│   ├── GET /
│   ├── GET /:id
│   ├── GET /:id/alternatives
│   └── GET /:id/videos
│
├── /economy                       # Credits & wallet
│   ├── GET /balance
│   ├── GET /wallet
│   ├── GET /transactions
│   ├── POST /charge
│   ├── POST /transfer
│   └── GET /pricing
│
├── /store                         # Shop/marketplace
│   ├── GET /catalog
│   ├── POST /purchase
│   ├── GET /inventory
│   └── GET /mystery-boxes
│
├── /community                     # Social features
│   ├── GET /feed
│   ├── GET /stats
│   ├── POST /posts
│   └── GET /presence
│
├── /communities                   # Community groups
│   ├── GET /
│   ├── POST /
│   ├── GET /:id
│   ├── POST /:id/join
│   └── POST /:id/leave
│
├── /messaging                     # Direct messages
│   ├── GET /conversations
│   ├── POST /conversations
│   └── GET /conversations/:id/messages
│
├── /journey                       # Character progression
│   ├── GET /
│   ├── GET /archetypes
│   ├── POST /select
│   └── GET /stages
│
├── /stats                         # Statistics
│   ├── GET /me
│   ├── GET /leaderboards
│   └── GET /history
│
├── /goals                         # Goal tracking
│   ├── GET /
│   ├── POST /
│   ├── GET /:id
│   ├── PATCH /:id
│   └── DELETE /:id
│
├── /achievements                  # Achievements
│   ├── GET /
│   ├── GET /categories
│   └── POST /:id/verify
│
├── /mascot                        # Buddy/companion
│   ├── GET /state
│   ├── PATCH /nickname
│   ├── POST /feed
│   └── POST /equip/:slot
│
├── /nutrition                     # Nutrition tracking
│   ├── GET /dashboard
│   ├── GET /goals
│   ├── PATCH /goals
│   └── POST /meals
│
├── /recovery                      # Sleep/recovery
│   ├── GET /score
│   ├── GET /recommendations
│   └── POST /sleep
│
├── /programs                      # Training programs
│   ├── GET /
│   ├── GET /:id
│   ├── POST /:id/enroll
│   └── POST /:id/workout
│
├── /admin                         # Admin operations
│   ├── /control                   # System control
│   ├── /metrics                   # Performance
│   ├── /users                     # User management
│   ├── /economy                   # Economy admin
│   ├── /features                  # Feature flags
│   ├── /logs                      # Log analysis
│   ├── /security                  # Security audit
│   ├── /database                  # DB management
│   ├── /scheduler                 # Scheduled jobs
│   ├── /alerts                    # Alert rules
│   └── /deploy                    # Deployment
│
└── /graphql                       # GraphQL endpoint
```

---

## Part 3: Implementation Plan

### Phase 1: Frontend Cleanup (Low Risk)

1. **Delete orphaned page**: `Store.tsx`
2. **Add missing routes**:
   - `/health` (rename from `/wellness`)
   - `/leaderboard`
   - `/admin/fraud`
   - `/trainer-dashboard`
3. **Update imports** in App.tsx

### Phase 2: API Route Consolidation (Medium Risk)

1. **Remove dual registration** in server.ts (lines 496-498)
2. **Update frontend** to use canonical paths
3. **Add deprecation headers** to old paths
4. **Consolidate admin routes** under `/api/admin/*`

### Phase 3: RESTful Refactoring (Higher Risk)

1. **Create migration guide** for non-RESTful endpoints
2. **Add new RESTful endpoints** alongside old ones
3. **Update frontend** to use new endpoints
4. **Deprecate old endpoints**
5. **Remove old endpoints** after 2 release cycles

### Phase 4: Documentation

1. **Generate OpenAPI spec** from Swagger
2. **Create route map** documentation
3. **Update CLAUDE.md** with new patterns

---

## Part 4: Breaking Changes

### Frontend Updates Required

| File | Change |
|------|--------|
| `src/api/economy.ts` | Update paths from `/credits/*` to `/economy/*` |
| `src/pages/Wallet.tsx` | Update API calls |
| `src/pages/Credits.tsx` | Update API calls |
| `src/store/authStore.ts` | Update balance endpoint |

### API Changes

| Old | New | Migration |
|-----|-----|-----------|
| `POST /workout/complete` | `PATCH /workouts/:id` | Accept both for 2 releases |
| `/api/credits/*` | `/api/economy/*` | Redirect with deprecation header |
| `/api/admin-control/*` | `/api/admin/control/*` | Redirect with deprecation header |

---

## Part 5: Testing Checklist

- [ ] All frontend routes load without error
- [ ] All API endpoints return expected data
- [ ] Deprecated endpoints return deprecation headers
- [ ] E2E test suite passes
- [ ] No 404 errors in production logs
- [ ] GraphQL queries work as expected

---

## Timeline

| Phase | Duration | Risk Level |
|-------|----------|------------|
| Phase 1: Frontend | 2-3 hours | Low |
| Phase 2: API Consolidation | 4-6 hours | Medium |
| Phase 3: RESTful Refactor | 8-12 hours | Medium-High |
| Phase 4: Documentation | 2-3 hours | Low |

**Total Estimated: 16-24 hours**

---

## Files to Modify

### Frontend
- `src/App.tsx` - Route definitions
- `src/pages/Store.tsx` - DELETE
- `src/api/*.ts` - Update API paths

### Backend
- `apps/api/src/http/server.ts` - Remove dual registration
- `apps/api/src/http/routes/credits.ts` - Consolidate into economy
- `apps/api/src/http/routes/economy.ts` - Add wallet routes
- `apps/api/src/http/routes/admin-control.ts` - Move to admin/control

### Documentation
- `docs/ROUTE-MAP.md` - New file with complete route map
- `docs/API-MIGRATION.md` - Migration guide for breaking changes
- `CLAUDE.md` - Update with new patterns
