# MuscleMap Architecture

## Overview

MuscleMap is a fitness visualization platform that transforms workout data into real-time muscle activation displays using a proprietary bias weight normalization system.

## Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: SQLite (better-sqlite3) with WAL mode
- **Validation**: Zod
- **Logging**: Pino
- **Auth**: JWT (PBKDF2 password hashing)

## Monorepo Structure
```
musclemap/
├── apps/
│   └── api/              # Express API server
├── packages/
│   ├── core/             # Shared types, constants, permissions
│   └── plugin-sdk/       # Plugin development SDK
├── plugins/              # Drop-in plugins
└── docs/                 # Documentation
```

## API Architecture
```
apps/api/src/
├── index.ts              # Entry point
├── config/               # Environment configuration
├── db/                   # Database client, schema, migrations
├── http/                 # Express server, router, middleware
│   ├── server.ts         # Express app configuration
│   ├── router.ts         # API route mounting
│   └── middleware/       # Request ID, rate limiting, errors
├── lib/                  # Shared utilities (logger, errors)
├── modules/              # Feature modules
│   ├── auth/             # Authentication & authorization
│   ├── economy/          # Credit system & transactions
│   ├── muscles/          # Muscle catalog with bias weights
│   ├── exercises/        # Exercise catalog with activations
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

## Database Schema

Key tables:
- `users` - User accounts with roles
- `credit_balances` - Current credit balance per user
- `credit_ledger` - Transaction history (immutable)
- `muscles` - Muscle catalog with bias weights
- `exercises` - Exercise catalog
- `exercise_activations` - Muscle activation percentages per exercise
- `workouts` - Logged workouts with TU calculations
- `archetypes` - Training archetypes
- `archetype_levels` - Progression levels
- `competitions` - Challenges
- `competition_participants` - Leaderboard entries
