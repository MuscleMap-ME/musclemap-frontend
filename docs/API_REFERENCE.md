# MuscleMap API Reference

> Updated: 2026-01-09

## Base URL

- **Production**: `https://musclemap.me/api`
- **Development**: `http://localhost:3001`

## Authentication

Most endpoints require authentication via JWT token:

```
Authorization: Bearer <token>
```

## Endpoints


### Misc

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/__routes` | Yes |
| `GET` | `/alternatives/low-impact` | Yes |
| `GET` | `/alternatives/seated` | Yes |
| `GET` | `/competitions` | Yes |
| `GET` | `/competitions/:id` | Yes |
| `GET` | `/entitlements` | Yes |
| `GET` | `/exercises` | Yes |
| `GET` | `/exercises/:id/activations` | Yes |
| `POST` | `/highfives/send` | Yes |
| `GET` | `/highfives/stats` | Yes |
| `GET` | `/highfives/users` | Yes |
| `GET` | `/i18n/languages` | Yes |
| `GET` | `/locations/nearby` | Yes |
| `GET` | `/me/entitlements` | Yes |
| `GET` | `/muscles` | Yes |
| `GET` | `/progress/stats` | Yes |
| `GET` | `/progression/achievements` | Yes |
| `GET` | `/progression/leaderboard` | Yes |
| `GET` | `/progression/mastery-levels` | Yes |
| `GET` | `/settings` | Yes |
| `PATCH` | `/settings` | Yes |
| `GET` | `/settings/themes` | Yes |
| `POST` | `/trace/frontend-log` | Yes |


### Issues

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/admin/issues` | Yes |
| `POST` | `/admin/issues/bulk` | Yes |
| `GET` | `/issues` | Yes |
| `POST` | `/issues` | Yes |
| `GET` | `/issues/:id` | Yes |
| `PATCH` | `/issues/:id` | Yes |
| `GET` | `/issues/:id/comments` | Yes |
| `POST` | `/issues/:id/comments` | Yes |
| `POST` | `/issues/:id/subscribe` | Yes |
| `POST` | `/issues/:id/vote` | Yes |
| `POST` | `/issues/:issueId/comments/:commentId/solution` | Yes |
| `GET` | `/issues/labels` | Yes |
| `GET` | `/issues/stats` | Yes |
| `GET` | `/me/issues` | Yes |
| `GET` | `/roadmap` | Yes |
| `POST` | `/roadmap` | Yes |
| `POST` | `/roadmap/:id/vote` | Yes |
| `GET` | `/updates` | Yes |
| `POST` | `/updates` | Yes |


### Journey

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/archetypes` | Yes |
| `GET` | `/archetypes/:id/levels` | Yes |
| `POST` | `/archetypes/select` | Yes |
| `GET` | `/journey` | Yes |
| `GET` | `/journey/progress` | Yes |


### Auth

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/auth/login` | No |
| `GET` | `/auth/me` | No |
| `GET` | `/auth/me/capabilities` | No |
| `POST` | `/auth/register` | No |
| `GET` | `/profile` | Yes |
| `PUT` | `/profile` | Yes |


### Community

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/community/feed` | Yes |
| `GET` | `/community/monitor` | Yes |
| `GET` | `/community/percentile` | Yes |
| `GET` | `/community/presence` | Yes |
| `POST` | `/community/presence` | Yes |
| `GET` | `/community/stats` | Yes |
| `GET` | `/community/ws` | Yes |


### Economy

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/credits/balance` | Yes |
| `GET` | `/economy/actions` | Yes |
| `GET` | `/economy/balance` | Yes |
| `POST` | `/economy/charge` | Yes |
| `GET` | `/economy/history` | Yes |
| `GET` | `/economy/pricing` | Yes |
| `GET` | `/economy/transactions` | Yes |
| `GET` | `/economy/wallet` | Yes |


### Hangouts

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/hangouts` | Yes |
| `GET` | `/hangouts/:id` | Yes |
| `POST` | `/hangouts/:id/join` | Yes |
| `POST` | `/hangouts/:id/leave` | Yes |
| `GET` | `/hangouts/:id/members` | Yes |
| `POST` | `/hangouts/:id/posts` | Yes |
| `GET` | `/hangouts/:id/posts` | Yes |
| `GET` | `/hangouts/nearby` | Yes |
| `GET` | `/hangouts/stats` | Yes |
| `GET` | `/hangouts/types` | Yes |
| `GET` | `/me/hangouts` | Yes |


### Messaging

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/messaging/block/:userId` | Yes |
| `DELETE` | `/messaging/block/:userId` | Yes |
| `GET` | `/messaging/conversations` | Yes |
| `POST` | `/messaging/conversations` | Yes |
| `GET` | `/messaging/conversations/:id/messages` | Yes |
| `POST` | `/messaging/conversations/:id/messages` | Yes |
| `POST` | `/messaging/conversations/:id/read` | Yes |
| `DELETE` | `/messaging/messages/:id` | Yes |
| `GET` | `/messaging/ws` | Yes |


### Tips

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/milestones` | Yes |
| `POST` | `/milestones/:id/claim` | Yes |
| `POST` | `/milestones/:id/progress` | Yes |
| `GET` | `/tips` | Yes |
| `POST` | `/tips/:id/seen` | Yes |


### Prescription

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/prescription/:id` | Yes |
| `POST` | `/prescription/generate` | Yes |
| `POST` | `/v1/prescription/generate` | Yes |


### Stats

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/stats/history` | Yes |
| `GET` | `/stats/info` | Yes |
| `GET` | `/stats/leaderboards` | Yes |
| `GET` | `/stats/leaderboards/me` | Yes |
| `GET` | `/stats/me` | Yes |
| `GET` | `/stats/profile/extended` | Yes |
| `PUT` | `/stats/profile/extended` | Yes |
| `POST` | `/stats/recalculate` | Yes |
| `GET` | `/stats/user/:userId` | Yes |


### Workouts

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/workout/complete` | Yes |
| `POST` | `/workouts` | Yes |
| `GET` | `/workouts/:id` | Yes |
| `GET` | `/workouts/me` | Yes |
| `GET` | `/workouts/me/muscles` | Yes |
| `GET` | `/workouts/me/stats` | Yes |
| `POST` | `/workouts/preview` | Yes |


### Skills (Gymnastics/Calisthenics)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `GET` | `/skills/trees` | No | List all skill trees |
| `GET` | `/skills/trees/:id` | No | Get tree with all nodes |
| `GET` | `/skills/trees/:id/progress` | Yes | Get user progress for tree |
| `GET` | `/skills/nodes/:id` | No | Get specific skill node |
| `GET` | `/skills/nodes/:id/leaderboard` | No | Get skill leaderboard |
| `GET` | `/skills/progress` | Yes | Get user's overall skill summary |
| `POST` | `/skills/practice` | Yes | Log a practice session |
| `POST` | `/skills/achieve` | Yes | Mark skill as achieved |
| `GET` | `/skills/history` | Yes | Get practice history |
| `PUT` | `/skills/nodes/:id/notes` | Yes | Update notes for a skill |


## Common Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... }
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

## Rate Limiting

- **Authenticated**: 100 requests/minute
- **Unauthenticated**: 20 requests/minute

## Health Check

```bash
curl https://musclemap.me/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "redis": "connected"
}
```
