# API Reference

> Complete documentation for the MuscleMap API.

---

## Overview

MuscleMap provides both REST and GraphQL APIs for accessing fitness data.

### Base URLs

| Environment | URL |
|-------------|-----|
| Production | `https://musclemap.me/api` |
| Development | `http://localhost:3001` |

### Authentication

Most endpoints require authentication via JWT token:

```
Authorization: Bearer <token>
```

---

## Quick Links

| Section | Description |
|---------|-------------|
| [Authentication](./authentication.md) | Login, register, tokens |
| [Endpoints](./endpoints/) | All REST endpoints by module |
| [GraphQL](./graphql.md) | GraphQL schema and queries |
| [Errors](./errors.md) | Error codes and handling |

---

## Endpoint Categories

| Module | Endpoints | Description |
|--------|-----------|-------------|
| [Auth](./endpoints/auth.md) | 4 | Login, register, profile |
| [Workouts](./endpoints/workouts.md) | 10 | Workout tracking |
| [Exercises](./endpoints/exercises.md) | 8 | Exercise library |
| [Stats](./endpoints/stats.md) | 12 | Character stats, leaderboards |
| [Community](./endpoints/community.md) | 20+ | Social features |
| [Economy](./endpoints/economy.md) | 15+ | Credits, purchases |
| [Nutrition](./endpoints/nutrition.md) | 30+ | Meal tracking |
| [Career](./endpoints/career.md) | 12 | PT test standards |

---

## Common Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "...",
    "...": "..."
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": {
    "items": [...],
    "nextCursor": "abc123",
    "hasMore": true
  }
}
```

---

## Rate Limiting

| User Type | Limit |
|-----------|-------|
| Authenticated | 100 requests/minute |
| Unauthenticated | 20 requests/minute |

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

---

## Quick Examples

### Get Current User

```bash
curl https://musclemap.me/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "username": "fitwarrior",
    "email": "user@example.com",
    "archetype": "bodybuilder",
    "level": 4
  }
}
```

### Start a Workout

```bash
curl -X POST https://musclemap.me/api/workouts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"location": "gym"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "workout-uuid",
    "startedAt": "2026-01-15T10:30:00Z",
    "status": "in_progress"
  }
}
```

### Log a Set

```bash
curl -X POST https://musclemap.me/api/sets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workoutId": "workout-uuid",
    "exerciseId": "exercise-uuid",
    "reps": 12,
    "weight": 50,
    "rpe": 7
  }'
```

### Get Exercises

```bash
curl "https://musclemap.me/api/exercises?limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Health Check

```bash
curl https://musclemap.me/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-15T00:00:00.000Z",
  "database": "connected",
  "redis": "connected"
}
```

---

## SDKs

### JavaScript/TypeScript

```bash
npm install @musclemap.me/client
```

```javascript
import { MuscleMapClient } from '@musclemap.me/client';

const client = new MuscleMapClient({
  token: 'your-jwt-token'
});

const workouts = await client.workouts.list();
const exercises = await client.exercises.search('push-up');
```

### cURL

All examples in this documentation use cURL.

### Python

No official SDK yet. Use `requests`:

```python
import requests

headers = {'Authorization': f'Bearer {token}'}
response = requests.get(
    'https://musclemap.me/api/auth/me',
    headers=headers
)
data = response.json()
```

---

## Endpoint Count by Module

| Module | GET | POST | PUT | PATCH | DELETE | Total |
|--------|-----|------|-----|-------|--------|-------|
| Auth | 3 | 2 | 1 | 0 | 0 | 6 |
| Workouts | 5 | 2 | 0 | 0 | 0 | 7 |
| Exercises | 6 | 1 | 0 | 0 | 0 | 7 |
| Sets | 3 | 2 | 0 | 0 | 1 | 6 |
| Stats | 8 | 1 | 1 | 0 | 0 | 10 |
| Community | 15 | 8 | 3 | 2 | 0 | 28 |
| Economy | 12 | 5 | 2 | 1 | 0 | 20 |
| Nutrition | 20 | 12 | 6 | 2 | 5 | 45 |
| ... | ... | ... | ... | ... | ... | ... |
| **Total** | **350+** | **200+** | **100+** | **50+** | **50+** | **791** |

---

## Versioning

The API is currently unversioned. Breaking changes are rare and announced in advance.

Future versions will use URL versioning:
- `/api/v1/...`
- `/api/v2/...`

---

*Continue to: [Authentication →](./authentication.md)*
