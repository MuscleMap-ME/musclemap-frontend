# MuscleMap Repository Scan

*Generated: January 8, 2026*

## Summary

| Metric | Count |
|--------|-------|
| Total API Endpoints | 295 |
| Route Files | 39 |
| Database Tables | 29 |
| Service Modules | 19 |
| Service Files | 32 |
| Frontend Pages (Web) | 42 |
| Mobile Screens | 26 |
| Background Jobs | 14 functions |
| Cron Schedules | 3 (hourly, daily, weekly) |
| Documentation Files | 27 |
| Workspace Packages | 6 |
| Root Dependencies | 95+ packages |

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Web Frontend** | React 18 + Vite 5 + TailwindCSS 4 + Three.js |
| **Mobile Frontend** | React Native + Expo |
| **Backend API** | Fastify 5 + TypeScript |
| **Database** | PostgreSQL |
| **Real-time** | WebSockets, GraphQL subscriptions |
| **Authentication** | JWT + PBKDF2 hashing |
| **Caching** | Redis (optional) |
| **Job Queue** | BullMQ |
| **Payments** | Stripe |
| **Deployment** | Caddy + PM2 on Linux VPS |

---

## Endpoints Inventory

### Authentication & User (`/auth/*`, `/users/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | User registration |
| POST | `/auth/login` | No | User login (returns JWT) |
| POST | `/auth/refresh` | No | Refresh access token |
| GET | `/auth/me` | Yes | Get current user profile |
| PUT | `/auth/me` | Yes | Update current user profile |
| POST | `/auth/logout` | Yes | Invalidate refresh token |

### Economy & Credits (`/economy/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/economy/balance` | Yes | Get credit balance |
| GET | `/economy/pricing` | No | Get action pricing |
| GET | `/economy/history` | Yes | Transaction history |
| POST | `/economy/charge` | Yes | Charge credits for action |
| POST | `/economy/purchase` | Yes | Purchase credits (Stripe) |
| GET | `/economy/subscriptions` | Yes | List subscriptions |

### Workouts (`/workouts/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/workouts` | Yes | Log a workout |
| GET | `/workouts/me` | Yes | User's workout history |
| GET | `/workouts/me/stats` | Yes | Workout statistics |
| GET | `/workouts/:id` | Yes | Get specific workout |
| DELETE | `/workouts/:id` | Yes | Delete workout |

### Prescription Engine (`/prescription/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/prescription/generate` | Yes | Generate workout prescription |
| GET | `/prescription/preview` | Yes | Preview prescription (no credits) |
| GET | `/prescription/:id` | Yes | Get saved prescription |

### Journeys (`/journeys/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/journeys` | Yes | List user journeys |
| POST | `/journeys` | Yes | Start a new journey |
| GET | `/journeys/:id` | Yes | Get journey details |
| PUT | `/journeys/:id` | Yes | Update journey |
| DELETE | `/journeys/:id` | Yes | Abandon journey |
| GET | `/journeys/templates` | No | Available journey templates |
| POST | `/journeys/:id/complete-day` | Yes | Mark day complete |
| GET | `/journeys/:id/progress` | Yes | Journey progress stats |

### Goals (`/goals/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/goals` | Yes | List user goals |
| POST | `/goals` | Yes | Create goal |
| GET | `/goals/:id` | Yes | Get goal details |
| PUT | `/goals/:id` | Yes | Update goal |
| DELETE | `/goals/:id` | Yes | Delete goal |
| POST | `/goals/:id/check-in` | Yes | Log goal check-in |

### Stats & Leaderboards (`/stats/*`, `/leaderboards/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/stats/me` | Yes | User stats (RPG-style) |
| GET | `/stats/history` | Yes | Historical stats |
| GET | `/stats/leaderboards` | Optional | Global leaderboards |
| GET | `/leaderboards` | Optional | Leaderboard list |
| GET | `/leaderboards/global` | No | Global rankings |
| GET | `/leaderboards/me/rank` | Yes | User's rank |
| GET | `/leaderboards/:type` | Optional | Specific leaderboard |

### Hangouts & Community (`/hangouts/*`, `/communities/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/hangouts` | Yes | Create hangout |
| GET | `/hangouts` | Yes | List user's hangouts |
| GET | `/hangouts/nearby` | Yes | Nearby hangouts (geo) |
| GET | `/hangouts/:id` | Yes | Hangout details |
| PUT | `/hangouts/:id` | Yes | Update hangout |
| DELETE | `/hangouts/:id` | Yes | Delete hangout |
| POST | `/hangouts/:id/join` | Yes | Join hangout |
| POST | `/hangouts/:id/leave` | Yes | Leave hangout |
| POST | `/hangouts/:id/check-in` | Yes | Check in at hangout |
| POST | `/hangouts/:id/check-out` | Yes | Check out |
| GET | `/virtual-hangouts` | Yes | List virtual hangouts |
| POST | `/virtual-hangouts` | Yes | Create virtual hangout |
| POST | `/virtual-hangouts/:id/join` | Yes | Join virtual hangout |

### Communities

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/communities` | Yes | Create community |
| GET | `/communities` | Yes | List communities |
| GET | `/communities/:id` | Yes | Community details |
| PUT | `/communities/:id` | Yes | Update community |
| DELETE | `/communities/:id` | Yes | Delete community |
| POST | `/communities/:id/join` | Yes | Join community |
| POST | `/communities/:id/leave` | Yes | Leave community |
| GET | `/communities/:id/members` | Yes | List members |
| GET | `/communities/:id/feed` | Yes | Community activity feed |

### Achievements & Milestones (`/achievements/*`, `/milestones/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/achievements/definitions` | No | All achievement definitions |
| GET | `/achievements/me` | Yes | User's earned achievements |
| GET | `/achievements/me/progress` | Yes | Progress toward achievements |
| GET | `/skill-milestones` | No | Available skill milestones |
| POST | `/skill-milestones/start` | Yes | Start milestone journey |
| GET | `/skill-milestones/me` | Yes | User's milestone progress |
| POST | `/skill-milestones/:id/complete` | Yes | Mark milestone complete |

### Competition (`/competition/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/competition/categories` | No | Competition categories |
| GET | `/competition/me` | Yes | User's competition status |
| POST | `/competition/me` | Yes | Register for competition |
| GET | `/competition/:id` | Yes | Competition details |
| GET | `/competition/:id/standings` | Yes | Competition standings |
| POST | `/competition/:id/submit` | Yes | Submit competition entry |

### Messaging (`/messaging/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/messaging/conversations` | Yes | List conversations |
| POST | `/messaging/conversations` | Yes | Start conversation |
| GET | `/messaging/conversations/:id` | Yes | Get conversation |
| POST | `/messaging/messages` | Yes | Send message |
| GET | `/messaging/messages/:conversationId` | Yes | Get messages |
| PUT | `/messaging/messages/:id/read` | Yes | Mark as read |
| WS | `/messaging/ws` | Yes | Real-time messaging |

### PT Tests & Health (`/pt-tests/*`, `/health/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/pt-tests` | No | Available PT test definitions |
| POST | `/pt-tests/results` | Yes | Log PT test results |
| GET | `/pt-tests/me` | Yes | User's PT test history |
| GET | `/pt-tests/me/readiness` | Yes | Readiness assessment |
| GET | `/health/me` | Yes | Health metrics dashboard |

### Privacy & Settings (`/privacy/*`, `/settings/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/privacy` | Yes | Get privacy settings |
| PUT | `/privacy` | Yes | Update privacy settings |
| GET | `/settings` | Yes | Get user settings |
| PUT | `/settings` | Yes | Update settings |

### Onboarding (`/onboarding/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/onboarding/profile` | Yes | Set profile basics |
| POST | `/onboarding/physical` | Yes | Set physical attributes |
| POST | `/onboarding/equipment` | Yes | Set available equipment |
| POST | `/onboarding/goals` | Yes | Set initial goals |
| POST | `/onboarding/archetype` | Yes | Select archetype |
| POST | `/onboarding/complete` | Yes | Mark onboarding complete |
| GET | `/onboarding/status` | Yes | Get onboarding progress |

### Equipment & Locations (`/equipment/*`, `/locations/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/equipment/types` | No | Equipment type definitions |
| GET | `/equipment/home` | Yes | User's home equipment |
| POST | `/equipment/home` | Yes | Set home equipment |
| PUT | `/equipment/home` | Yes | Update home equipment |
| GET | `/locations/me` | Yes | User's saved locations |
| POST | `/locations` | Yes | Save new location |

### Limitations (`/limitations/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/limitations` | Yes | User's physical limitations |
| POST | `/limitations` | Yes | Add limitation |
| PUT | `/limitations/:id` | Yes | Update limitation |
| DELETE | `/limitations/:id` | Yes | Remove limitation |

### Issues & Feedback (`/issues/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/issues` | Optional | List public issues |
| POST | `/issues` | Yes | Create issue |
| GET | `/issues/:id` | Optional | Issue details |
| PUT | `/issues/:id` | Yes | Update issue |
| POST | `/issues/:id/vote` | Yes | Vote on issue |
| POST | `/issues/:id/comments` | Yes | Comment on issue |
| GET | `/roadmap` | No | Public roadmap |

### Monitoring & Admin (`/monitoring/*`, `/admin/*`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/monitoring/errors/track` | Yes | Track client error |
| GET | `/monitoring/health` | No | System health status |
| GET | `/admin/users` | Admin | List all users |
| GET | `/admin/stats` | Admin | System statistics |
| POST | `/admin/broadcast` | Admin | Send broadcast message |

### Miscellaneous (`/muscles`, `/exercises`, `/tips`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/muscles` | No | All muscle definitions |
| GET | `/muscles/:id` | No | Muscle details |
| GET | `/exercises` | No | All exercises |
| GET | `/exercises/:id` | No | Exercise details |
| GET | `/tips` | Yes | Get contextual tips |
| POST | `/tips/:id/dismiss` | Yes | Dismiss tip |
| GET | `/archetypes` | No | All archetypes |
| POST | `/archetypes/select` | Yes | Select archetype |

---

## Data Models

### users
Primary user account table.

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (UUID) | Primary key |
| email | TEXT | Unique, indexed |
| password_hash | TEXT | PBKDF2 hash |
| display_name | TEXT | Public name |
| archetype_id | TEXT | FK to archetypes |
| roles | JSONB | Role array (user, admin) |
| flags | JSONB | Feature flags |
| onboarding_complete | BOOLEAN | Onboarding status |
| minimalist_mode | BOOLEAN | Privacy setting |
| last_active_at | TIMESTAMP | Activity tracking |
| created_at | TIMESTAMP | Account creation |
| updated_at | TIMESTAMP | Last modification |

**Indexes:** email (unique), archetype_id (btree), last_active_at (btree)

### credit_balances
User credit balances with optimistic locking.

| Field | Type | Description |
|-------|------|-------------|
| user_id | TEXT | FK to users, unique |
| balance | INTEGER | Current credits |
| lifetime_earned | INTEGER | Total earned |
| lifetime_spent | INTEGER | Total spent |
| version | INTEGER | Optimistic lock |
| updated_at | TIMESTAMP | Last change |

### credit_ledger
Immutable transaction log.

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (UUID) | Primary key |
| user_id | TEXT | FK to users |
| amount | INTEGER | Credits (+/-) |
| type | TEXT | transaction type |
| action_id | TEXT | Related action |
| description | TEXT | Human-readable |
| metadata | JSONB | Additional data |
| created_at | TIMESTAMP | Transaction time |

### workouts
Workout logs with muscle activation.

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (UUID) | Primary key |
| user_id | TEXT | FK to users |
| name | TEXT | Workout name |
| exercises | JSONB | Exercise array |
| total_tu | INTEGER | Total Training Units |
| muscle_activations | JSONB | Per-muscle activation |
| duration_minutes | INTEGER | Workout duration |
| location | TEXT | Where performed |
| equipment_used | TEXT[] | Equipment list |
| notes | TEXT | User notes |
| completed_at | TIMESTAMP | Completion time |
| created_at | TIMESTAMP | Log creation |

### prescriptions
Generated workout plans.

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (UUID) | Primary key |
| user_id | TEXT | FK to users |
| constraints | JSONB | Input constraints |
| workout | JSONB | Generated workout |
| credits_charged | INTEGER | Credits used |
| created_at | TIMESTAMP | Generation time |

### muscles
Anatomical muscle definitions.

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | Primary key (slug) |
| name | TEXT | Display name |
| group | TEXT | Muscle group |
| location | TEXT | Anatomical location |
| function | TEXT | Primary function |
| activation_weight | REAL | Relative importance |

### exercises
Exercise definitions with muscle activation.

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | Primary key (slug) |
| name | TEXT | Display name |
| description | TEXT | How to perform |
| difficulty | TEXT | easy/medium/hard |
| equipment | TEXT[] | Required equipment |
| primary_muscles | TEXT[] | Main muscles |
| secondary_muscles | TEXT[] | Supporting muscles |
| category | TEXT | Exercise category |
| instructions | TEXT[] | Step-by-step |
| tips | TEXT[] | Form tips |

### exercise_activations
Muscle-to-exercise activation percentages.

| Field | Type | Description |
|-------|------|-------------|
| exercise_id | TEXT | FK to exercises |
| muscle_id | TEXT | FK to muscles |
| activation_pct | REAL | 0-100 activation % |
| is_primary | BOOLEAN | Primary vs secondary |

**Indexes:** Composite (exercise_id, muscle_id)

### archetypes
Training identity archetypes.

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | Primary key |
| name | TEXT | Display name |
| description | TEXT | Long description |
| focus_areas | TEXT[] | Training focus |
| icon | TEXT | Icon identifier |
| color | TEXT | Theme color |

**Current Archetypes (11):**
- Spartan, Gladiator, Judoka, Wrestler, Boxer
- Marine, Firefighter, Ironworker
- Powerlifter, Bodybuilder, CrossFitter

### archetype_levels
Progression within archetypes.

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | Primary key |
| archetype_id | TEXT | FK to archetypes |
| level | INTEGER | Level number |
| name | TEXT | Level name |
| xp_required | INTEGER | XP to achieve |
| rewards | JSONB | Unlocked features |

### groups / hangouts
Location-based or virtual communities.

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (UUID) | Primary key |
| name | TEXT | Group name |
| description | TEXT | Group description |
| type | TEXT | geo/virtual |
| location | JSONB | Geo coordinates |
| geohash | TEXT | Location hash |
| owner_id | TEXT | FK to users |
| privacy | TEXT | public/private |
| max_members | INTEGER | Member limit |
| created_at | TIMESTAMP | Creation time |

### group_memberships
User-to-group relationships.

| Field | Type | Description |
|-------|------|-------------|
| user_id | TEXT | FK to users |
| group_id | TEXT | FK to groups |
| role | TEXT | member/moderator/admin |
| joined_at | TIMESTAMP | Join time |
| status | TEXT | active/pending |

### conversations
Message thread containers.

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (UUID) | Primary key |
| type | TEXT | direct/group |
| title | TEXT | Optional title |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last activity |

### messages
Individual messages.

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (UUID) | Primary key |
| conversation_id | TEXT | FK to conversations |
| sender_id | TEXT | FK to users |
| content | TEXT | Message body |
| type | TEXT | text/image/workout |
| metadata | JSONB | Attachments |
| read_by | TEXT[] | Read receipts |
| created_at | TIMESTAMP | Send time |

### milestones
Achievement/skill milestones.

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | Primary key |
| name | TEXT | Milestone name |
| description | TEXT | How to achieve |
| category | TEXT | Category |
| requirements | JSONB | Completion criteria |
| rewards | JSONB | XP, badges, etc. |
| icon | TEXT | Icon identifier |

### user_milestone_progress
Per-user milestone tracking.

| Field | Type | Description |
|-------|------|-------------|
| user_id | TEXT | FK to users |
| milestone_id | TEXT | FK to milestones |
| progress | JSONB | Current progress |
| completed_at | TIMESTAMP | Completion time |
| started_at | TIMESTAMP | Start time |

### activity_events
User activity feed.

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (UUID) | Primary key |
| user_id | TEXT | FK to users |
| type | TEXT | Event type |
| data | JSONB | Event payload |
| visibility | TEXT | public/friends/private |
| created_at | TIMESTAMP | Event time |

### user_blocks
User blocking relationships.

| Field | Type | Description |
|-------|------|-------------|
| blocker_id | TEXT | FK to users |
| blocked_id | TEXT | FK to users |
| created_at | TIMESTAMP | Block time |

---

## Services Map

### Economy Service (`apps/api/src/modules/economy/`)

**Purpose:** Credit-based economy for premium features.

**Key Methods:**
- `getBalance(userId)` - Current credit balance
- `chargeCredits(userId, action, amount)` - Deduct credits
- `addCredits(userId, amount, source)` - Add credits
- `getTransactionHistory(userId)` - Ledger history
- `getActionPricing()` - Cost of each action

### Stats Service (`apps/api/src/modules/stats/`)

**Purpose:** RPG-style character statistics.

**Key Methods:**
- `getUserStats(userId)` - Computed stats (strength, endurance, etc.)
- `getLeaderboard(type, limit)` - Ranked users
- `awardXP(userId, amount, source)` - Add experience
- `getLevelInfo(xp)` - Level from XP

### Community Service (`apps/api/src/modules/community/`)

**Purpose:** Social features and community management.

**Key Methods:**
- `createCommunity(ownerId, data)` - New community
- `joinCommunity(userId, communityId)` - Join request
- `getCommunityFeed(communityId)` - Activity feed
- `getMembers(communityId)` - Member list

### Wearables Service (`apps/api/src/modules/wearables/`)

**Purpose:** Biometric device integration.

**Key Methods:**
- `syncHealthData(userId, provider, data)` - Import health data
- `getSupportedProviders()` - Available integrations
- `getHealthSummary(userId)` - Aggregated health metrics

### Crews Service (`apps/api/src/modules/crews/`)

**Purpose:** Team/squad management.

**Key Methods:**
- `createCrew(ownerId, data)` - New crew
- `inviteMember(crewId, userId)` - Send invite
- `getCrewStats(crewId)` - Team statistics
- `getCrewLeaderboard(crewId)` - Internal rankings

### Rivals Service (`apps/api/src/modules/rivals/`)

**Purpose:** 1v1 rivalry system.

**Key Methods:**
- `createRivalry(userId, targetId)` - Start rivalry
- `getRivalryStatus(rivalryId)` - Current standings
- `updateScores()` - Refresh from workouts
- `sendChallenge(rivalryId, challenge)` - Issue challenge

### Achievements Service (`apps/api/src/modules/achievements/`)

**Purpose:** Achievement tracking and badges.

**Key Methods:**
- `getDefinitions()` - All achievements
- `getUserAchievements(userId)` - Earned achievements
- `checkAndAward(userId, event)` - Check triggers
- `getProgress(userId)` - Progress toward locked

### Leaderboards Service (`apps/api/src/modules/leaderboards/`)

**Purpose:** Multi-dimensional ranking systems.

**Key Methods:**
- `getGlobalLeaderboard(metric, window)` - Global rankings
- `getHangoutLeaderboard(hangoutId)` - Local rankings
- `getUserRank(userId, metric)` - User's position
- `snapshotWeekly()` - Archive weekly standings

### Monitoring Service (`apps/api/src/modules/monitoring/`)

**Purpose:** Error tracking and APM.

**Key Methods:**
- `trackError(error, context)` - Log error
- `getHealthStatus()` - System health
- `getMetrics()` - Performance metrics

### Mentorship Service (`apps/api/src/modules/mentorship/`)

**Purpose:** Mentor-mentee relationships.

**Key Methods:**
- `findMentors(criteria)` - Search mentors
- `requestMentorship(userId, mentorId)` - Send request
- `getMentorshipStatus(mentorshipId)` - Current status

### Anticheat Service (`apps/api/src/modules/anticheat/`)

**Purpose:** Workout validity verification.

**Key Methods:**
- `validateWorkout(workout)` - Check for anomalies
- `flagSuspicious(workoutId)` - Mark for review
- `getViolations(userId)` - User's violations

### Entitlements Service (`apps/api/src/modules/entitlements/`)

**Purpose:** Feature access control.

**Key Methods:**
- `hasAccess(userId, feature)` - Check permission
- `getEntitlements(userId)` - All entitlements
- `grantEntitlement(userId, feature)` - Grant access

---

## Existing Features (Checklist)

### Core Fitness

- [x] Exercise database (65+ exercises)
- [x] Muscle activation percentages
- [x] 3D body visualization (Three.js)
- [x] Workout logging
- [x] Prescription engine (constraint satisfaction)
- [x] Training Unit (TU) scoring
- [x] Equipment constraints
- [x] Location constraints (home, gym, park, hotel, office, travel)

### Economy

- [x] Credit system (100 credits = $1)
- [x] 3-month free trial
- [x] Stripe integration
- [x] Transaction ledger
- [x] Action pricing

### Archetypes & Identity

- [x] 11 archetypes (Spartan, Judoka, Marine, etc.)
- [x] Archetype selection
- [x] Level progression within archetype
- [x] Archetype-specific content

### Social & Community

- [x] Hangouts (geo-based groups)
- [x] Virtual hangouts
- [x] Check-in/check-out
- [x] Community feed
- [x] Direct messaging
- [x] Crews (teams)
- [x] Rivals (1v1)
- [x] User blocking
- [x] Mentorship framework

### Gamification

- [x] Achievements
- [x] Milestones
- [x] Leaderboards (global, local)
- [x] XP system
- [x] Level progression
- [x] Character stats (RPG-style)

### User Experience

- [x] Onboarding flow
- [x] Tips system (40+ tips)
- [x] Privacy settings
- [x] Minimalist mode
- [x] Issue tracking
- [x] Public roadmap

### Technical

- [x] JWT authentication
- [x] Refresh token rotation
- [x] GraphQL endpoint
- [x] REST API
- [x] WebSocket support
- [x] Background jobs (cron)
- [x] Error monitoring
- [x] Health checks

---

## Known Gaps

### Not Yet Built

- [ ] Activity recording (GPS tracking, route recording)
- [ ] Route planning/discovery
- [ ] Timed performance sections ("Segments")
- [ ] Real-time location sharing (safety feature)
- [ ] Device integrations (Garmin, Apple Watch direct)
- [ ] Nutrition tracking
- [ ] Career physical standards (CPAT, ACFT, PFT)
- [ ] Team readiness dashboards
- [ ] Competition prep modules
- [ ] Internationalization (i18n)

### Partially Built

- [ ] PT Tests (routes exist, limited test catalog)
- [ ] Wearables (service exists, limited providers)
- [ ] Goal journeys (basic goals, no structured journeys)

### TODOs Found in Code

1. `// TODO: Add rate limiting to public endpoints`
2. `// TODO: Implement email verification`
3. `// TODO: Add push notification support`
4. `// TODO: Implement workout templates`
5. `// TODO: Add offline sync for mobile`
6. `// TODO: Implement challenge system`

---

## Background Jobs

### Hourly Jobs
- `checkAtRiskStreaks()` - Identify users about to lose streaks
- `updateRivalScores()` - Refresh rivalry standings

### Daily Jobs (Midnight)
- `expireStreaks()` - Reset broken streaks
- `expirePendingChallenges()` - Clean stale challenges
- `expireDailyChallenges()` - Remove expired daily challenges
- `createWeeklySnapshots()` - Archive activity data
- `sendDailyChallengeNotifications()` - Push notifications

### Weekly Jobs (Sunday Midnight)
- `snapshotWeeklyLeaderboard()` - Archive weekly rankings
- `updateAllTimeLeaderboard()` - Recalculate all-time stats

---

## Infrastructure

### Server
- **VPS:** 72.62.83.202 (musclemap.me)
- **Reverse Proxy:** Caddy (automatic HTTPS)
- **Process Manager:** PM2
- **Database:** PostgreSQL
- **Cache:** Redis (optional)

### Deployment
```bash
./deploy.sh "commit message"  # Full deployment
ssh root@musclemap.me "pm2 restart musclemap-api"  # API restart
ssh root@musclemap.me "cd /var/www/musclemap.me/apps/api && pnpm db:migrate"  # Migrations
```

### Monitoring
- Health endpoint: `GET /health`
- PM2 logs: `pm2 logs musclemap-api`
- Error tracking: Internal monitoring service

---

## File Structure Summary

```
musclemap.me/
├── apps/
│   ├── api/                    # Fastify API server
│   │   ├── src/
│   │   │   ├── db/            # Database layer
│   │   │   │   ├── migrations/ # 39 migration files
│   │   │   │   ├── schema.ts   # Table definitions
│   │   │   │   └── index.ts    # DB connection
│   │   │   ├── http/
│   │   │   │   ├── routes/     # 39 route files
│   │   │   │   ├── middleware/ # Auth, validation
│   │   │   │   └── server.ts   # Fastify setup
│   │   │   ├── modules/        # 19 service modules
│   │   │   └── graphql/        # GraphQL schema
│   │   └── dist/               # Compiled output
│   └── mobile/                 # React Native/Expo
│       ├── app/                # Expo Router pages
│       │   ├── (auth)/        # Auth screens
│       │   ├── (onboarding)/  # Onboarding flow
│       │   └── (tabs)/        # Main tabs
│       └── src/
│           └── components/     # Shared components
├── packages/
│   ├── client/                # API client SDK
│   ├── shared/                # Shared types
│   ├── core/                  # Business logic
│   ├── plugin-sdk/            # Plugin development
│   └── ui/                    # UI components
├── src/                       # React web frontend
│   ├── pages/                 # 42 page components
│   ├── components/            # Shared components
│   └── lib/                   # Utilities
├── docs/                      # Documentation
│   ├── analysis/              # This analysis
│   └── specs/                 # Feature specs
├── scripts/                   # Automation
└── native/                    # C native modules
```

---

*End of Repository Scan*
