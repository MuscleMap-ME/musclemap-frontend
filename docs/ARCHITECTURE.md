# MuscleMap Architecture

## Overview

MuscleMap is a fitness visualization platform that transforms workout data into real-time muscle activation displays using a proprietary bias weight normalization system.

## Tech Stack

### Backend
- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.x
- **Framework**: Fastify 5.x
- **Database**: PostgreSQL 16+ with connection pooling (pg library)
- **Cache/Realtime**: Redis (optional, for pub/sub and presence)
- **Schema Validation**: TypeBox (JSON Schema compatible)
- **Logging**: Pino with structured JSON output
- **Auth**: JWT with bcrypt password hashing

### Frontend
- **Build Tool**: Vite 5.x
- **Framework**: React 18.x
- **Styling**: Tailwind CSS 3.x
- **3D Visualization**: Three.js with @react-three/fiber
- **Animation**: Framer Motion
- **HTTP Client**: Custom HTTP client with retry/caching (`@musclemap/client`)

### Infrastructure
- **Hosting**: VPS with Nginx reverse proxy
- **Process Manager**: PM2
- **Package Manager**: pnpm (workspace monorepo)

## Monorepo Structure

```
musclemap/
├── apps/
│   ├── api/              # Fastify API server
│   └── mobile/           # React Native app (Expo)
├── packages/
│   ├── client/           # HTTP client with caching & retry
│   ├── core/             # Shared types, constants, permissions
│   ├── shared/           # Shared utilities (error extraction, etc.)
│   └── plugin-sdk/       # Plugin development SDK
├── plugins/              # Drop-in plugins
├── src/                  # Frontend (Vite + React)
│   ├── components/       # Shared React components
│   ├── contexts/         # React contexts (UserContext, etc.)
│   ├── pages/            # Route pages
│   └── utils/            # Frontend utilities
└── docs/                 # Documentation
```

## API Architecture

```
apps/api/src/
├── index.ts              # Entry point
├── config/               # Environment configuration (Zod validated)
├── db/
│   ├── client.ts         # PostgreSQL pool with query helpers
│   ├── schema.sql        # Database schema
│   ├── seed.ts           # Data seeding
│   ├── migrate.ts        # Migration runner
│   └── migrations/       # Incremental schema migrations
├── http/
│   ├── server.ts         # Fastify app configuration
│   ├── router.ts         # API route mounting
│   └── routes/           # Route handlers
│       ├── auth.ts       # Authentication endpoints
│       ├── community.ts  # Activity feed & social
│       ├── economy.ts    # Credits & transactions
│       ├── journey.ts    # Archetypes & progress
│       ├── messaging.ts  # Direct messaging
│       ├── misc.ts       # Exercises, muscles, settings
│       ├── prescription.ts # Workout generation
│       ├── tips.ts       # Contextual tips & insights
│       └── workouts.ts   # Workout logging
├── lib/
│   ├── logger.ts         # Pino logger with child loggers
│   ├── errors.ts         # Error types and helpers
│   └── redis.ts          # Redis client (optional)
└── modules/              # Business logic modules
    ├── entitlements/     # Feature access control
    └── economy/          # Credit system logic
```

## Frontend Architecture

```
src/
├── App.jsx               # Route definitions
├── pages/
│   ├── Landing.jsx       # Public landing page
│   ├── Login.jsx         # Authentication
│   ├── Signup.jsx        # Registration
│   ├── Onboarding.jsx    # Archetype selection
│   ├── Dashboard.jsx     # Main dashboard
│   ├── Workout.jsx       # Active workout session
│   ├── Exercises.jsx     # Exercise library browser
│   ├── Journey.jsx       # Progress tracking
│   ├── Progression.jsx   # Level progression
│   ├── Profile.jsx       # User profile
│   ├── Settings.jsx      # User settings
│   ├── Credits.jsx       # Credit management
│   ├── CommunityDashboard.jsx # Social features
│   ├── Competitions.jsx  # Challenges & leaderboards
│   ├── HighFives.jsx     # Social recognition
│   ├── Messages.jsx      # Direct messaging
│   ├── Locations.jsx     # Workout locations
│   ├── Wallet.jsx        # In-app wallet
│   ├── SkinsStore.jsx    # Cosmetic store
│   └── AdminControl.jsx  # Admin panel
├── components/
│   ├── ErrorBoundary.jsx # Error handling
│   └── ...               # Shared components
├── contexts/
│   └── UserContext.jsx   # Auth state management
└── utils/
    └── logger.js         # Frontend logging
```

## Core Concepts

### Training Units (TU)

The proprietary bias weight system normalizes muscle activation across different muscle sizes:

```
normalizedActivation = rawActivation / biasWeight × 100
```

- Large muscles (glutes, lats) have higher bias weights (18-22)
- Small muscles (rear delts, rotator cuff) have lower bias weights (4-8)
- This ensures balanced visual feedback regardless of muscle size

### Archetypes

Users select a training archetype that defines their fitness path:
- **Bodybuilder** - Aesthetic muscle building
- **Powerlifter** - Strength-focused training
- **Gymnast** - Bodyweight mastery
- **CrossFit** - Functional fitness
- **Martial Artist** - Combat sports conditioning
- **Runner** - Endurance training
- **Climber** - Grip and pull strength
- **Strongman** - Functional strength
- **Functional** - General fitness
- **Swimmer** - Aquatic conditioning

Each archetype has multiple progression levels with specific muscle targets.

### Credit Economy

Users spend credits to complete workouts:
- 100 credits on registration
- 25 credits per workout
- Idempotent transactions prevent double-charging
- Optional subscription for unlimited workouts

### Plugin System

Plugins extend functionality without modifying core code:
- Drop files into `/plugins/<name>/`
- Provide `plugin.json` manifest
- Export route registration function

## Database

### PostgreSQL Connection Pool

The API uses `pg` library with optimized connection pooling:
- Configurable pool size (min/max connections)
- Statement timeout protection
- Automatic retry with exponential backoff for serialization failures
- Advisory locks for distributed locking

### Key Tables

**Users & Auth**
- `users` - User accounts with roles, subscription status, archetype
- `subscriptions` - Stripe subscription records

**Economy**
- `credit_balances` - Current credit balance per user
- `credit_ledger` - Transaction history (immutable)

**Fitness Data**
- `muscles` - Muscle catalog with bias weights (40+ muscles)
- `exercises` - Exercise catalog with equipment/location metadata (90+ exercises)
- `exercise_activations` - Muscle activation percentages per exercise
- `workouts` - Logged workouts with TU calculations

**Progression**
- `archetypes` - Training archetypes (10 types)
- `archetype_levels` - Progression levels per archetype
- `milestones` - Achievement definitions
- `user_milestone_progress` - User achievement progress

**Social**
- `competitions` - Challenges
- `competition_participants` - Leaderboard entries
- `conversations` / `messages` - Direct messaging
- `activity_events` - Community activity feed

**Contextual Guidance**
- `tips` - Contextual tips
- `insights` - User insights
- `user_tips_seen` - Tip dismissal tracking

### Migrations

Migrations are run automatically on server startup:

1. `001_add_trial_and_subscriptions.ts` - Trial periods & Stripe integration
2. `002_community_dashboard.ts` - Activity events & privacy settings
3. `003_messaging.ts` - Direct messaging tables
4. `004_exercise_equipment_locations.ts` - Equipment & location metadata
5. `005_tips_and_milestones.ts` - Contextual tips system
6. `006_performance_optimization.ts` - Database indexes

## API Endpoints

### Authentication (`/auth`)
- `POST /auth/register` - Create account
- `POST /auth/login` - Login
- `GET /auth/profile` - Get current user

### Exercises & Muscles (`/`)
- `GET /exercises` - List all exercises (filterable by location)
- `GET /exercises/:id/activations` - Get muscle activations
- `GET /muscles` - List all muscles with bias weights

### Prescription (`/prescription`)
- `POST /prescription/generate` - Generate personalized workout

### Workouts (`/workouts`)
- `POST /workouts` - Log completed workout
- `GET /workouts` - Get workout history
- `GET /workouts/:id` - Get workout details

### Journey (`/journey`)
- `GET /journey` - Get journey overview (archetype, level, stats)
- `GET /journey/progress` - Get weekly progress & muscle balance

### Archetypes (`/archetypes`)
- `GET /archetypes` - List all archetypes
- `POST /archetypes/select` - Select archetype
- `GET /archetypes/:id/levels` - Get archetype levels

### Economy (`/economy`)
- `GET /credits/balance` - Get credit balance
- `GET /credits/history` - Get transaction history
- `POST /credits/purchase` - Purchase credits

### Tips & Insights (`/tips`)
- `GET /tips/contextual` - Get contextual tips
- `POST /tips/:id/dismiss` - Dismiss a tip
- `GET /insights` - Get personalized insights
- `GET /milestones` - Get milestone progress

### Community
- `GET /progression/leaderboard` - Global leaderboard
- `GET /competitions` - List competitions
- `GET /competitions/:id` - Competition details

### Messaging (`/messages`)
- `GET /conversations` - List conversations
- `POST /conversations` - Start conversation
- `GET /conversations/:id/messages` - Get messages
- `POST /conversations/:id/messages` - Send message

## Error Handling

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "statusCode": 400
  }
}
```

The `@musclemap/shared` package provides `extractErrorMessage()` to safely extract error messages for display.

## Deployment

### Production Server

1. Build packages: `pnpm build`
2. Deploy to server via git pull
3. PM2 manages the API process
4. Nginx proxies requests to Fastify

### Environment Variables

Key configuration (validated with Zod):
- `DATABASE_URL` or `PG*` variables
- `JWT_SECRET` (min 32 chars)
- `STRIPE_SECRET_KEY` (optional)
- `REDIS_URL` (optional)
