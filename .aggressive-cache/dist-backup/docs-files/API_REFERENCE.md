# MuscleMap API Reference

MuscleMap uses a REST API built on Fastify. All endpoints are prefixed with `/api` in production.

**Base URL:** `http://localhost:3001/api` (development) or `https://musclemap.me/api` (production)

**Documentation:** Swagger UI available at `/docs` when server is running.

---

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### Authentication Endpoints

#### POST /auth/register

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "myusername",
  "password": "securepassword123",
  "displayName": "My Name"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "username": "myusername",
    "displayName": "My Name",
    "roles": ["user"],
    "currentArchetypeId": null,
    "currentLevel": 1,
    "createdAt": "2026-01-04T12:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors:**
- `400` - Validation error (invalid email, username taken, etc.)
- `409` - Email or username already exists

---

#### POST /auth/login

Authenticate and receive a JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "username": "myusername",
    "displayName": "My Name",
    "roles": ["user"],
    "currentArchetypeId": "bodybuilder",
    "currentLevel": 3,
    "trialEndsAt": "2026-04-04T12:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors:**
- `401` - Invalid credentials

---

#### GET /auth/profile

Get the current authenticated user's profile.

**Headers:** `Authorization: Bearer <token>` (required)

**Response (200):**
```json
{
  "id": "user_abc123",
  "email": "user@example.com",
  "username": "myusername",
  "displayName": "My Name",
  "avatarUrl": "https://...",
  "roles": ["user"],
  "flags": {
    "verified": true,
    "banned": false,
    "suspended": false,
    "emailConfirmed": true
  },
  "currentArchetypeId": "bodybuilder",
  "currentLevel": 3,
  "trialStartedAt": "2026-01-04T12:00:00Z",
  "trialEndsAt": "2026-04-04T12:00:00Z",
  "createdAt": "2026-01-04T12:00:00Z"
}
```

---

## Exercises & Muscles

#### GET /muscles

Get all muscles with bias weights.

**Response (200):**
```json
[
  {
    "id": "glutes",
    "name": "Glutes",
    "anatomicalName": "Gluteus Maximus",
    "muscleGroup": "legs",
    "biasWeight": 22,
    "optimalWeeklyVolume": 16,
    "recoveryTime": 48
  }
]
```

---

#### GET /exercises

Get exercise catalog with optional filtering.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `location` | string | Filter by location (gym, home, outdoor) |
| `equipment` | string | Filter by equipment |
| `difficulty` | number | Filter by difficulty (1-5) |
| `search` | string | Search by name (fuzzy) |

**Response (200):**
```json
[
  {
    "id": "bench_press",
    "name": "Barbell Bench Press",
    "type": "strength",
    "difficulty": 3,
    "description": "Lie on a flat bench...",
    "cues": "Keep your back flat...",
    "primaryMuscles": ["pectoralis_major", "anterior_deltoid"],
    "equipmentRequired": ["barbell", "bench"],
    "equipmentOptional": ["spotter"],
    "locations": ["gym"],
    "isCompound": true,
    "estimatedSeconds": 45,
    "restSeconds": 90,
    "movementPattern": "horizontal_push"
  }
]
```

---

#### GET /exercises/:id/activations

Get muscle activation percentages for an exercise.

**Response (200):**
```json
{
  "exerciseId": "bench_press",
  "activations": [
    { "muscleId": "pectoralis_major", "activation": 85 },
    { "muscleId": "anterior_deltoid", "activation": 45 },
    { "muscleId": "triceps", "activation": 40 }
  ]
}
```

---

## Workouts

#### POST /workouts

Log a completed workout.

**Headers:** `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "date": "2026-01-04",
  "exercises": [
    {
      "exerciseId": "bench_press",
      "sets": 3,
      "reps": 10,
      "weight": 135,
      "notes": "Felt strong"
    },
    {
      "exerciseId": "incline_dumbbell_press",
      "sets": 3,
      "reps": 12,
      "weight": 50
    }
  ],
  "notes": "Great chest day!",
  "isPublic": true,
  "idempotencyKey": "workout_2026-01-04_abc123"
}
```

**Response (201):**
```json
{
  "id": "workout_xyz789",
  "userId": "user_abc123",
  "date": "2026-01-04",
  "totalTu": 245.5,
  "creditsUsed": 25,
  "exerciseData": [...],
  "muscleActivations": {
    "pectoralis_major": 85.5,
    "anterior_deltoid": 45.2,
    "triceps": 40.0
  },
  "notes": "Great chest day!",
  "isPublic": true,
  "createdAt": "2026-01-04T18:30:00Z"
}
```

**Notes:**
- `idempotencyKey` prevents duplicate charges
- Credits are only charged for free tier users
- Trial and subscription users have unlimited workouts

---

#### GET /workouts

Get workout history.

**Headers:** `Authorization: Bearer <token>` (required)

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | Max results (1-100) |
| `offset` | number | 0 | Pagination offset |
| `startDate` | string | - | Filter by start date |
| `endDate` | string | - | Filter by end date |

**Response (200):**
```json
{
  "workouts": [
    {
      "id": "workout_xyz789",
      "date": "2026-01-04",
      "totalTu": 245.5,
      "creditsUsed": 25,
      "exerciseData": [...],
      "muscleActivations": {...},
      "createdAt": "2026-01-04T18:30:00Z"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

#### GET /workouts/:id

Get a specific workout.

**Headers:** `Authorization: Bearer <token>` (required)

**Response (200):**
```json
{
  "id": "workout_xyz789",
  "userId": "user_abc123",
  "date": "2026-01-04",
  "totalTu": 245.5,
  "creditsUsed": 25,
  "notes": "Great chest day!",
  "isPublic": true,
  "exerciseData": [
    {
      "exerciseId": "bench_press",
      "sets": 3,
      "reps": 10,
      "weight": 135,
      "notes": "Felt strong"
    }
  ],
  "muscleActivations": {
    "pectoralis_major": 85.5,
    "anterior_deltoid": 45.2
  },
  "createdAt": "2026-01-04T18:30:00Z"
}
```

---

## Prescriptions

#### POST /prescription/generate

Generate an AI-powered workout plan.

**Headers:** `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "duration": 45,
  "location": "gym",
  "equipment": ["barbell", "dumbbell", "cable"],
  "muscleTargets": ["chest", "triceps"],
  "excludeExercises": ["dips"]
}
```

**Response (200):**
```json
{
  "id": "rx_abc123",
  "exercises": [
    {
      "exerciseId": "bench_press",
      "sets": 3,
      "reps": "8-10",
      "restSeconds": 90
    },
    {
      "exerciseId": "incline_dumbbell_press",
      "sets": 3,
      "reps": "10-12",
      "restSeconds": 60
    }
  ],
  "warmup": [
    { "exerciseId": "arm_circles", "duration": 60 }
  ],
  "cooldown": [
    { "exerciseId": "chest_stretch", "duration": 30 }
  ],
  "substitutions": {
    "bench_press": ["dumbbell_bench_press", "push_ups"]
  },
  "muscleCoverage": {
    "pectoralis_major": 95,
    "triceps": 75,
    "anterior_deltoid": 60
  },
  "estimatedDuration": 42,
  "creditCost": 1
}
```

---

## Economy

#### GET /economy/balance

Get current credit balance.

**Headers:** `Authorization: Bearer <token>` (required)

**Response (200):**
```json
{
  "balance": 75,
  "lifetimeEarned": 200,
  "lifetimeSpent": 125,
  "unlimited": false,
  "unlimitedReason": null
}
```

**Note:** If user has trial or active subscription, `unlimited` is `true`.

---

#### GET /credits/balance

Alias for `/economy/balance`.

---

#### GET /economy/history

Get credit transaction history.

**Headers:** `Authorization: Bearer <token>` (required)

**Query Parameters:**
| Parameter | Type | Default | Max |
|-----------|------|---------|-----|
| `limit` | number | 20 | 100 |
| `offset` | number | 0 | - |

**Response (200):**
```json
{
  "transactions": [
    {
      "id": "txn_abc123",
      "action": "workout",
      "amount": -25,
      "balanceAfter": 75,
      "metadata": { "workoutId": "workout_xyz789" },
      "createdAt": "2026-01-04T18:30:00Z"
    },
    {
      "id": "txn_def456",
      "action": "signup_bonus",
      "amount": 100,
      "balanceAfter": 100,
      "metadata": null,
      "createdAt": "2026-01-04T12:00:00Z"
    }
  ],
  "total": 2,
  "limit": 20,
  "offset": 0
}
```

---

#### GET /economy/pricing

Get credit purchase pricing tiers.

**Response (200):**
```json
{
  "tiers": [
    { "id": "starter", "credits": 100, "priceCents": 499, "popular": false },
    { "id": "standard", "credits": 500, "priceCents": 1999, "popular": true },
    { "id": "premium", "credits": 1500, "priceCents": 4999, "popular": false }
  ],
  "subscription": {
    "id": "unlimited",
    "priceCents": 999,
    "interval": "month",
    "features": ["Unlimited workouts", "Priority support"]
  }
}
```

---

#### POST /economy/charge

Charge credits for an action.

**Headers:** `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "action": "custom_action",
  "amount": 10,
  "idempotencyKey": "charge_abc123",
  "metadata": { "reason": "Premium feature" }
}
```

**Response (200):**
```json
{
  "success": true,
  "transactionId": "txn_xyz789",
  "newBalance": 65
}
```

**Errors:**
- `400` - Insufficient credits
- `409` - Idempotency key already used

---

## Journey & Archetypes

#### GET /archetypes

List all training archetypes.

**Response (200):**
```json
[
  {
    "id": "bodybuilder",
    "name": "Bodybuilder",
    "philosophy": "Aesthetic muscle building",
    "description": "Focus on hypertrophy and symmetry...",
    "focusAreas": ["chest", "back", "shoulders", "legs", "arms"],
    "iconUrl": "https://..."
  }
]
```

---

#### GET /archetypes/:id/levels

Get progression levels for an archetype.

**Response (200):**
```json
[
  {
    "level": 1,
    "name": "Novice",
    "totalTu": 0,
    "description": "Beginning your journey...",
    "muscleTargets": { "chest": 1.0, "back": 1.0 }
  },
  {
    "level": 2,
    "name": "Apprentice",
    "totalTu": 1000,
    "description": "Building a foundation...",
    "muscleTargets": { "chest": 1.2, "back": 1.2, "shoulders": 1.0 }
  }
]
```

---

#### GET /journey

Get user's current journey overview.

**Headers:** `Authorization: Bearer <token>` (required)

**Response (200):**
```json
{
  "archetype": {
    "id": "bodybuilder",
    "name": "Bodybuilder"
  },
  "level": 3,
  "levelName": "Intermediate",
  "totalTu": 2500,
  "tuToNextLevel": 500,
  "nextLevelTu": 3000,
  "progressPercent": 83
}
```

---

#### GET /journey/progress

Get weekly progress and muscle balance.

**Headers:** `Authorization: Bearer <token>` (required)

**Response (200):**
```json
{
  "weeklyProgress": {
    "workouts": 4,
    "totalTu": 450,
    "muscleActivations": {
      "chest": 120,
      "back": 95,
      "legs": 80
    }
  },
  "muscleBalance": {
    "overworked": ["chest"],
    "underworked": ["legs", "shoulders"],
    "balanced": ["back", "arms"]
  },
  "streak": 7
}
```

---

#### POST /journey/select-archetype

Select or change training archetype.

**Headers:** `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "archetypeId": "powerlifter"
}
```

**Response (200):**
```json
{
  "success": true,
  "archetype": {
    "id": "powerlifter",
    "name": "Powerlifter"
  },
  "level": 1,
  "levelName": "Novice"
}
```

---

## Community

#### GET /community/feed

Get community activity feed.

**Headers:** `Authorization: Bearer <token>` (optional)

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | Max results |
| `before` | string | - | Cursor for pagination |

**Response (200):**
```json
{
  "events": [
    {
      "id": "evt_abc123",
      "eventType": "workout_completed",
      "payload": {
        "userId": "user_xyz",
        "username": "stronglifter",
        "totalTu": 320,
        "topMuscles": ["chest", "triceps"]
      },
      "visibilityScope": "public_profile",
      "createdAt": "2026-01-04T18:30:00Z"
    }
  ],
  "nextCursor": "evt_def456"
}
```

---

#### GET /community/active-users

Get count of currently active users.

**Response (200):**
```json
{
  "count": 42,
  "lastUpdated": "2026-01-04T18:30:00Z"
}
```

---

#### GET /community/presence/geo

Get users by geographic region.

**Response (200):**
```json
{
  "buckets": {
    "na-west": 15,
    "na-east": 22,
    "eu-west": 8,
    "asia-pacific": 5
  }
}
```

---

#### GET /community/ws

WebSocket endpoint for real-time community updates.

**Protocol:** `wss://`

**Events Received:**
```json
{
  "type": "activity",
  "data": {
    "eventType": "workout_completed",
    "userId": "user_xyz",
    "username": "stronglifter"
  }
}
```

---

## Messaging

#### GET /messaging/conversations

List user's conversations.

**Headers:** `Authorization: Bearer <token>` (required)

**Response (200):**
```json
{
  "conversations": [
    {
      "id": "conv_abc123",
      "type": "direct",
      "name": null,
      "participants": [
        { "userId": "user_xyz", "username": "friend1" }
      ],
      "lastMessage": {
        "content": "Hey, great workout!",
        "senderId": "user_xyz",
        "createdAt": "2026-01-04T18:30:00Z"
      },
      "unreadCount": 2,
      "lastMessageAt": "2026-01-04T18:30:00Z"
    }
  ]
}
```

---

#### POST /messaging/conversations

Create a new conversation.

**Headers:** `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "type": "direct",
  "participantIds": ["user_xyz"],
  "name": null
}
```

**Response (201):**
```json
{
  "id": "conv_abc123",
  "type": "direct",
  "participants": [...],
  "createdAt": "2026-01-04T18:30:00Z"
}
```

---

#### GET /messaging/conversations/:id/messages

Get messages in a conversation.

**Headers:** `Authorization: Bearer <token>` (required)

**Query Parameters:**
| Parameter | Type | Default |
|-----------|------|---------|
| `limit` | number | 50 |
| `before` | string | - |

**Response (200):**
```json
{
  "messages": [
    {
      "id": "msg_abc123",
      "senderId": "user_xyz",
      "content": "Hey!",
      "contentType": "text",
      "replyToId": null,
      "createdAt": "2026-01-04T18:30:00Z"
    }
  ],
  "nextCursor": "msg_def456"
}
```

---

#### POST /messaging/conversations/:id/messages

Send a message.

**Headers:** `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "content": "Hey, how's it going?",
  "contentType": "text",
  "replyToId": null
}
```

**Response (201):**
```json
{
  "id": "msg_xyz789",
  "senderId": "user_abc123",
  "content": "Hey, how's it going?",
  "contentType": "text",
  "createdAt": "2026-01-04T18:35:00Z"
}
```

---

#### GET /messaging/ws

WebSocket endpoint for real-time messaging.

**Protocol:** `wss://`

**Events Received:**
```json
{
  "type": "message",
  "data": {
    "conversationId": "conv_abc123",
    "message": {
      "id": "msg_xyz789",
      "senderId": "user_xyz",
      "content": "New message!"
    }
  }
}
```

---

## Tips & Insights

#### GET /tips/contextual

Get contextual tips based on user state.

**Headers:** `Authorization: Bearer <token>` (required)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `context` | string | Current page/context |

**Response (200):**
```json
{
  "tips": [
    {
      "id": "tip_abc123",
      "title": "Rest Day Reminder",
      "content": "You've trained 5 days in a row. Consider a rest day!",
      "category": "recovery",
      "priority": 1
    }
  ]
}
```

---

#### POST /tips/:id/dismiss

Dismiss a tip.

**Headers:** `Authorization: Bearer <token>` (required)

**Response (200):**
```json
{
  "success": true
}
```

---

#### GET /insights

Get personalized insights.

**Headers:** `Authorization: Bearer <token>` (required)

**Response (200):**
```json
{
  "insights": [
    {
      "type": "muscle_imbalance",
      "title": "Leg Day Neglected",
      "message": "Your legs are 30% behind your upper body.",
      "severity": "warning",
      "suggestion": "Add 2 leg-focused workouts this week."
    }
  ]
}
```

---

#### GET /milestones

Get milestone progress.

**Headers:** `Authorization: Bearer <token>` (required)

**Response (200):**
```json
{
  "milestones": [
    {
      "id": "ms_first_workout",
      "name": "First Steps",
      "description": "Complete your first workout",
      "progress": 1,
      "target": 1,
      "completed": true,
      "completedAt": "2026-01-04T18:30:00Z",
      "rewardCredits": 10,
      "rewardClaimed": true
    },
    {
      "id": "ms_week_streak",
      "name": "Week Warrior",
      "description": "Workout 7 days in a row",
      "progress": 4,
      "target": 7,
      "completed": false,
      "rewardCredits": 50
    }
  ]
}
```

---

## Leaderboards & Competitions

#### GET /progression/leaderboard

Get global leaderboard.

**Query Parameters:**
| Parameter | Type | Default | Max |
|-----------|------|---------|-----|
| `limit` | number | 100 | 100 |

**Response (200):**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "userId": "user_abc123",
      "username": "toplifter",
      "displayName": "Top Lifter",
      "avatarUrl": "https://...",
      "archetypeId": "powerlifter",
      "level": 15,
      "totalTu": 125000,
      "workoutCount": 500
    }
  ]
}
```

---

#### POST /highfives/send

Send a high-five recognition.

**Headers:** `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "recipientId": "user_xyz",
  "reason": "Great workout streak!"
}
```

**Response (200):**
```json
{
  "success": true
}
```

---

## Settings

#### GET /settings

Get user settings.

**Headers:** `Authorization: Bearer <token>` (required)

**Response (200):**
```json
{
  "notifications": {
    "email": true,
    "push": true,
    "workoutReminders": true
  },
  "privacy": {
    "shareLocation": false,
    "showInFeed": true,
    "publicProfile": true
  },
  "preferences": {
    "weightUnit": "lbs",
    "theme": "dark"
  }
}
```

---

#### PATCH /settings

Update user settings.

**Headers:** `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "privacy": {
    "publicProfile": false
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "settings": {...}
}
```

---

## Locations

#### GET /locations/nearby

Get nearby workout locations.

**Query Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| `lat` | number | Yes |
| `lng` | number | Yes |
| `radius` | number | No (default: 10km) |

**Response (200):**
```json
{
  "locations": [
    {
      "id": "loc_abc123",
      "name": "Downtown Gym",
      "type": "gym",
      "address": "123 Main St",
      "lat": 40.7128,
      "lng": -74.0060,
      "distance": 0.5
    }
  ]
}
```

---

## Health Endpoints

#### GET /health

Full health check.

**Response (200):**
```json
{
  "status": "healthy",
  "version": "2.1.0",
  "database": "connected",
  "redis": "connected",
  "poolStats": {
    "total": 10,
    "idle": 8,
    "waiting": 0
  }
}
```

---

#### GET /ready

Kubernetes readiness probe.

**Response (200):**
```json
{
  "ready": true
}
```

---

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "statusCode": 400
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate resource |
| `INSUFFICIENT_CREDITS` | 400 | Not enough credits |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

Default: 100 requests per minute per IP.

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704384000
```

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
- [DATA_MODEL.md](./DATA_MODEL.md) - Database schema
- [DATA_FLOW.md](./DATA_FLOW.md) - Request lifecycle
