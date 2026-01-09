# MuscleMap API Reference

Developer documentation for integrating with MuscleMap.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Core Endpoints](#core-endpoints)
- [GraphQL API](#graphql-api)
- [WebSocket Events](#websocket-events)
- [Error Handling](#error-handling)
- [Rate Limits](#rate-limits)

---

## Overview

### Base URL

```
Production: https://musclemap.me/api
```

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT APPLICATIONS                       │
│         (Web, iOS, Android, Apple Watch, Vision Pro)         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    HTTPS / SSL
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      CADDY PROXY                             │
│              (TLS termination, routing)                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     FASTIFY API                              │
│              (REST + GraphQL endpoints)                      │
├─────────────────────────────────────────────────────────────┤
│  REST Routes           │  GraphQL Endpoint                  │
│  /api/auth/*          │  /api/graphql                      │
│  /api/workouts/*      │                                    │
│  /api/community/*     │  Single endpoint for              │
│  /api/stats/*         │  complex queries                   │
│  ...                  │                                    │
└─────────────┬─────────┴──────────────────┬──────────────────┘
              │                             │
┌─────────────▼─────────────┐  ┌───────────▼───────────────────┐
│      POSTGRESQL           │  │         REDIS                  │
│   (Primary Database)      │  │   (Cache, Sessions, PubSub)    │
│   - Single source of truth│  │   - Optional but recommended   │
└───────────────────────────┘  └────────────────────────────────┘
```

### Tech Stack

| Component | Technology |
|-----------|------------|
| Server | Fastify (NOT Express) |
| Database | PostgreSQL |
| Cache | Redis (optional) |
| Reverse Proxy | Caddy (NOT Nginx) |
| Real-time | WebSockets via Fastify |
| Query Language | GraphQL + REST |

---

## Authentication

### JWT-Based Auth

MuscleMap uses JWT tokens for authentication.

**Login Flow:**

```
1. POST /api/auth/login
   Body: { email, password }

2. Response: { accessToken, refreshToken, user }

3. Use accessToken in headers:
   Authorization: Bearer <accessToken>

4. When accessToken expires, refresh:
   POST /api/auth/refresh
   Body: { refreshToken }
```

### Token Lifecycle

```
Access Token:
├── Lifetime: 15 minutes
├── Contains: userId, email, roles
└── Use: API requests

Refresh Token:
├── Lifetime: 30 days
├── Contains: tokenId
├── Use: Get new access tokens
└── Stored: HTTP-only cookie or secure storage
```

### Auth Endpoints

```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "displayName": "FitnessUser"
}

Response 201:
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "FitnessUser",
    "createdAt": "2026-01-08T12:00:00Z"
  },
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}

Response 200:
{
  "user": { ... },
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbG..."
}

Response 200:
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

```http
POST /api/auth/logout
Authorization: Bearer <accessToken>

Response 200:
{
  "message": "Logged out successfully"
}
```

---

## Core Endpoints

### Workouts

**Create Workout:**
```http
POST /api/workouts
Authorization: Bearer <token>
Content-Type: application/json

{
  "exercises": [
    {
      "exerciseId": "uuid",
      "sets": [
        { "reps": 10, "weight": 135, "unit": "lbs" },
        { "reps": 10, "weight": 135, "unit": "lbs" },
        { "reps": 8, "weight": 145, "unit": "lbs" }
      ]
    }
  ],
  "notes": "Great session!",
  "startedAt": "2026-01-08T14:00:00Z",
  "completedAt": "2026-01-08T15:00:00Z"
}

Response 201:
{
  "workout": {
    "id": "uuid",
    "totalTU": 145,
    "muscleActivations": {
      "pectoralis_major": 0.8,
      "triceps": 0.5,
      "anterior_deltoid": 0.6
    },
    "exercises": [...],
    "createdAt": "2026-01-08T15:00:00Z"
  },
  "achievements": [
    { "type": "streak", "name": "7-Day Streak", "points": 50 }
  ],
  "xpEarned": 145
}
```

**Get Workouts:**
```http
GET /api/workouts?limit=10&offset=0&startDate=2026-01-01
Authorization: Bearer <token>

Response 200:
{
  "workouts": [...],
  "total": 89,
  "hasMore": true
}
```

**Get Single Workout:**
```http
GET /api/workouts/:id
Authorization: Bearer <token>

Response 200:
{
  "workout": {
    "id": "uuid",
    "totalTU": 145,
    "duration": 3600,
    "exercises": [...],
    "muscleActivations": {...},
    "notes": "...",
    "createdAt": "..."
  }
}
```

### Exercises

**List Exercises:**
```http
GET /api/exercises?muscle=chest&equipment=barbell&limit=20
Authorization: Bearer <token>

Response 200:
{
  "exercises": [
    {
      "id": "uuid",
      "name": "Barbell Bench Press",
      "primaryMuscles": ["pectoralis_major"],
      "secondaryMuscles": ["triceps", "anterior_deltoid"],
      "activations": {
        "pectoralis_major": 0.8,
        "triceps": 0.5,
        "anterior_deltoid": 0.6
      },
      "equipment": ["barbell", "bench"],
      "difficulty": "intermediate"
    }
  ],
  "total": 15
}
```

**Get Exercise Details:**
```http
GET /api/exercises/:id
Authorization: Bearer <token>

Response 200:
{
  "exercise": {
    "id": "uuid",
    "name": "Barbell Bench Press",
    "description": "Classic compound chest exercise...",
    "instructions": [
      "Lie on flat bench",
      "Grip barbell slightly wider than shoulders",
      ...
    ],
    "primaryMuscles": [...],
    "secondaryMuscles": [...],
    "activations": {...},
    "equipment": [...],
    "variations": [
      { "id": "uuid", "name": "Incline Bench Press" },
      { "id": "uuid", "name": "Close-Grip Bench Press" }
    ]
  }
}
```

### Stats

**Get User Stats:**
```http
GET /api/stats
Authorization: Bearer <token>

Response 200:
{
  "stats": {
    "totalTU": 12456,
    "totalWorkouts": 89,
    "currentStreak": 12,
    "longestStreak": 23,
    "weeklyTU": 456,
    "monthlyTU": 1892,
    "characterStats": {
      "strength": 67,
      "endurance": 54,
      "agility": 38,
      "flexibility": 42,
      "balance": 51,
      "mentalFocus": 59
    },
    "muscleBalance": {
      "chest": 0.89,
      "back": 0.78,
      "legs": 0.85,
      ...
    }
  }
}
```

**Get Leaderboard:**
```http
GET /api/stats/leaderboard?type=weekly&limit=100
Authorization: Bearer <token>

Response 200:
{
  "leaderboard": [
    {
      "rank": 1,
      "user": {
        "id": "uuid",
        "displayName": "IronKing",
        "level": 42,
        "archetype": "spartan"
      },
      "score": 1247
    },
    ...
  ],
  "userRank": {
    "rank": 127,
    "score": 456
  }
}
```

### Prescriptions

**Generate Prescription:**
```http
POST /api/prescription/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "focus": "upper",
  "duration": 45,
  "intensity": "moderate",
  "excludeExercises": ["uuid1", "uuid2"]
}

Response 200:
{
  "prescription": {
    "id": "uuid",
    "warmup": [...],
    "mainWorkout": [
      {
        "exercise": {...},
        "sets": 4,
        "reps": "8-10",
        "restSeconds": 90
      }
    ],
    "cooldown": [...],
    "estimatedTU": 145,
    "estimatedDuration": 45
  }
}
```

### Community

**Get Activity Feed:**
```http
GET /api/community/feed?hangoutId=uuid&limit=20
Authorization: Bearer <token>

Response 200:
{
  "activities": [
    {
      "id": "uuid",
      "type": "workout_completed",
      "user": {...},
      "data": {
        "workoutId": "uuid",
        "totalTU": 145
      },
      "createdAt": "..."
    }
  ],
  "hasMore": true
}
```

**Send High-Five:**
```http
POST /api/community/high-five
Authorization: Bearer <token>
Content-Type: application/json

{
  "activityId": "uuid"
}

Response 200:
{
  "message": "High-five sent!"
}
```

### Rivalries

**Create Rivalry:**
```http
POST /api/rivalries
Authorization: Bearer <token>
Content-Type: application/json

{
  "opponentId": "uuid",
  "metric": "total_tu",
  "durationDays": 7,
  "stakeCredits": 100
}

Response 201:
{
  "rivalry": {
    "id": "uuid",
    "challenger": {...},
    "opponent": {...},
    "metric": "total_tu",
    "status": "pending",
    "startsAt": null,
    "endsAt": null,
    "stake": 100
  }
}
```

**Accept/Decline Rivalry:**
```http
POST /api/rivalries/:id/respond
Authorization: Bearer <token>
Content-Type: application/json

{
  "accept": true
}

Response 200:
{
  "rivalry": {
    ...
    "status": "active",
    "startsAt": "2026-01-08T12:00:00Z",
    "endsAt": "2026-01-15T12:00:00Z"
  }
}
```

---

## GraphQL API

### Endpoint

```
POST /api/graphql
Authorization: Bearer <token>
Content-Type: application/json
```

### Example Queries

**Get Dashboard Data:**
```graphql
query GetDashboard {
  me {
    id
    displayName
    level
    archetype {
      id
      name
    }
    companion {
      stage
      xp
      upgrades
    }
    stats {
      totalTU
      weeklyTU
      currentStreak
      characterStats {
        strength
        endurance
        agility
        flexibility
        balance
        mentalFocus
      }
    }
  }
  recentWorkouts(limit: 5) {
    id
    totalTU
    createdAt
    exercises {
      name
    }
  }
  activeRivalries {
    id
    opponent {
      displayName
    }
    myScore
    opponentScore
    endsAt
  }
}
```

**Get Workout History with Muscle Data:**
```graphql
query GetWorkoutHistory($limit: Int!, $offset: Int!) {
  workouts(limit: $limit, offset: $offset) {
    edges {
      node {
        id
        totalTU
        duration
        createdAt
        muscleActivations {
          muscle {
            id
            name
            group
          }
          activation
        }
        exercises {
          exercise {
            name
          }
          sets {
            reps
            weight
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      totalCount
    }
  }
}
```

**Leaderboard Query:**
```graphql
query GetLeaderboard($type: LeaderboardType!, $limit: Int!) {
  leaderboard(type: $type, limit: $limit) {
    entries {
      rank
      user {
        id
        displayName
        level
        archetype {
          name
        }
      }
      score
    }
    myPosition {
      rank
      score
    }
  }
}
```

### Mutations

**Log Workout:**
```graphql
mutation LogWorkout($input: WorkoutInput!) {
  createWorkout(input: $input) {
    workout {
      id
      totalTU
      muscleActivations {
        muscle {
          name
        }
        activation
      }
    }
    achievementsUnlocked {
      id
      name
      rarity
      points
    }
    xpGained
    leveledUp
  }
}
```

**Update Profile:**
```graphql
mutation UpdateProfile($input: ProfileInput!) {
  updateProfile(input: $input) {
    user {
      id
      displayName
      bio
      archetype {
        id
        name
      }
    }
  }
}
```

---

## WebSocket Events

### Connection

```javascript
const ws = new WebSocket('wss://musclemap.me/ws');

ws.onopen = () => {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'auth',
    token: accessToken
  }));
};
```

### Event Types

**Incoming Events:**

```javascript
// Rivalry update
{
  "type": "rivalry_update",
  "rivalryId": "uuid",
  "scores": {
    "you": 456,
    "opponent": 423
  }
}

// New high-five
{
  "type": "high_five",
  "from": {
    "id": "uuid",
    "displayName": "FitFriend"
  },
  "activityId": "uuid"
}

// Achievement unlocked
{
  "type": "achievement",
  "achievement": {
    "id": "uuid",
    "name": "Iron Warrior",
    "rarity": "rare",
    "points": 100
  }
}

// Hangout activity
{
  "type": "hangout_activity",
  "hangoutId": "uuid",
  "activity": {
    "type": "workout_completed",
    "user": {...},
    "summary": "Completed Push Day - 145 TU"
  }
}
```

**Outgoing Events:**

```javascript
// Subscribe to hangout
{
  "type": "subscribe",
  "channel": "hangout:uuid"
}

// Unsubscribe
{
  "type": "unsubscribe",
  "channel": "hangout:uuid"
}

// Ping (keepalive)
{
  "type": "ping"
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Not allowed to access resource |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Common Errors

**Token Expired:**
```json
{
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Access token has expired"
  }
}
```
→ Use refresh token to get new access token

**Insufficient Credits:**
```json
{
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "Not enough credits for this action",
    "details": {
      "required": 100,
      "available": 45
    }
  }
}
```

---

## Rate Limits

### Default Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Auth endpoints | 10 | 1 minute |
| Read endpoints | 100 | 1 minute |
| Write endpoints | 30 | 1 minute |
| GraphQL | 60 | 1 minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704729600
```

### Handling Rate Limits

When rate limited (429 response):

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "retryAfter": 30
  }
}
```

Wait `retryAfter` seconds before retrying.

---

## SDK & Client Libraries

### Official Client Package

```bash
npm install @musclemap/client
```

```typescript
import { MuscleMapClient } from '@musclemap/client';

const client = new MuscleMapClient({
  baseUrl: 'https://musclemap.me/api'
});

// Login
await client.auth.login({
  email: 'user@example.com',
  password: 'password'
});

// Get stats
const stats = await client.stats.get();

// Log workout
const workout = await client.workouts.create({
  exercises: [...]
});

// Get leaderboard
const leaderboard = await client.stats.leaderboard({
  type: 'weekly',
  limit: 100
});
```

---

## Webhooks (Coming Soon)

Subscribe to events for integrations:

- Workout completed
- Achievement unlocked
- Rivalry started/ended
- Level up

---

*Questions? [Submit an issue](/issues) or [contact support](mailto:support@musclemap.me)*

[Back to Documentation](../index.md)
