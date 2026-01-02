# MuscleMap Architecture

## Overview

MuscleMap is a fitness visualization platform that transforms workout data into real-time muscle activation displays using a proprietary bias weight normalization system.

## Tech Stack

- **Runtime**: Node.js 25+
- **Language**: TypeScript
- **Framework**: Fastify (with Express compatibility layer)
- **Database**: PostgreSQL 16+ with connection pooling
- **Cache/Realtime**: Redis (optional, for pub/sub and presence)
- **Validation**: Zod
- **Logging**: Pino
- **Auth**: JWT (bcrypt password hashing)

## Monorepo Structure
```
musclemap/
├── apps/
│   └── api/              # Fastify API server
├── packages/
│   ├── core/             # Shared types, constants, permissions
│   ├── shared/           # Shared utilities for frontend
│   └── plugin-sdk/       # Plugin development SDK
├── plugins/              # Drop-in plugins
├── src/                  # Frontend (Vite + React)
└── docs/                 # Documentation
```

## API Architecture
```
apps/api/src/
├── index.ts              # Entry point
├── config/               # Environment configuration
├── db/                   # Database client, schema, migrations
│   ├── client.ts         # PostgreSQL pool with connection management
│   ├── schema.ts         # Core table definitions
│   └── migrations/       # Incremental schema migrations
├── http/                 # Fastify server, router, middleware
│   ├── server.ts         # Fastify app configuration
│   ├── router.ts         # API route mounting
│   └── middleware/       # Request ID, rate limiting, errors
├── lib/                  # Shared utilities (logger, errors, redis)
├── modules/              # Feature modules
│   ├── auth/             # Authentication & authorization
│   ├── billing/          # Stripe integration & subscriptions
│   ├── community/        # Activity feed & presence
│   ├── economy/          # Credit system & transactions
│   ├── entitlements/     # Feature flags & access control
│   ├── exercises/        # Exercise catalog with activations
│   ├── journey/          # User progress tracking
│   ├── messaging/        # Direct messaging & WebSocket
│   ├── muscles/          # Muscle catalog with bias weights
│   ├── prescription/     # AI workout generation
│   ├── tips/             # Contextual tips & milestones
│   ├── workouts/         # Workout logging & TU calculation
│   ├── archetypes/       # Training archetypes & progression
│   └── competitions/     # Challenges & leaderboards
└── plugins/              # Plugin loader & registry
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

### Credit Economy

Users spend credits to complete workouts:
- 100 credits on registration
- 25 credits per workout
- Idempotent transactions prevent double-charging

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
- `users` - User accounts with roles and subscription status
- `credit_balances` - Current credit balance per user
- `credit_ledger` - Transaction history (immutable)
- `muscles` - Muscle catalog with bias weights
- `exercises` - Exercise catalog with equipment/location metadata
- `exercise_activations` - Muscle activation percentages per exercise
- `workouts` - Logged workouts with TU calculations
- `archetypes` - Training archetypes
- `archetype_levels` - Progression levels
- `competitions` - Challenges
- `competition_participants` - Leaderboard entries
- `conversations` / `messages` - Direct messaging
- `activity_events` - Community activity feed
- `tips` / `milestones` - Contextual guidance system

### Migrations

Migrations are run automatically on server startup:
1. `001_add_trial_and_subscriptions.ts` - Trial periods & Stripe integration
2. `002_community_dashboard.ts` - Activity events & privacy settings
3. `003_messaging.ts` - Direct messaging tables
4. `004_exercise_equipment_locations.ts` - Equipment & location metadata
5. `005_tips_and_milestones.ts` - Contextual tips system
6. `006_performance_optimization.ts` - Database indexes

## WebSocket Endpoints

- `/ws/community` - Public activity feed (anonymized events)
- `/ws/monitor` - Moderator/admin monitoring feed
- `/ws/messages` - Direct messaging real-time updates
