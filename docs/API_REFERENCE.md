# MuscleMap API Reference

> Auto-generated on 2026-01-19

## Base URL

- **Production**: `https://musclemap.me/api`
- **Development**: `http://localhost:3001`

## Authentication

Most endpoints require authentication via JWT token:

```
Authorization: Bearer <token>
```

## Endpoints


### Admin-beta-testers

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/` | Yes |
| `GET` | `/pending-feedback` | Yes |


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
| `GET` | `/exercises/:id/illustration` | Yes |
| `POST` | `/highfives/send` | Yes |
| `GET` | `/highfives/stats` | Yes |
| `GET` | `/highfives/users` | Yes |
| `GET` | `/i18n/languages` | Yes |
| `GET` | `/illustrations/bodies` | Yes |
| `GET` | `/locations/nearby` | Yes |
| `GET` | `/me/entitlements` | Yes |
| `GET` | `/muscles` | Yes |
| `GET` | `/muscles/:id` | Yes |
| `GET` | `/progress/stats` | Yes |
| `GET` | `/progression/achievements` | Yes |
| `GET` | `/progression/leaderboard` | Yes |
| `GET` | `/progression/mastery-levels` | Yes |
| `GET` | `/settings` | Yes |
| `PATCH` | `/settings` | Yes |
| `GET` | `/settings/themes` | Yes |
| `POST` | `/trace/frontend-log` | Yes |


### One-rep-max

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/1rm` | Yes |
| `DELETE` | `/1rm/:entryId` | Yes |
| `GET` | `/1rm/best` | Yes |
| `POST` | `/1rm/calculate` | Yes |
| `GET` | `/1rm/classification` | Yes |
| `GET` | `/1rm/compound-total` | Yes |
| `GET` | `/1rm/exercise/:exerciseId` | Yes |
| `GET` | `/1rm/exercise/:exerciseId/pr` | Yes |
| `GET` | `/1rm/formulas` | Yes |
| `GET` | `/1rm/leaderboard/:exerciseId` | Yes |
| `GET` | `/1rm/progression/:exerciseId` | Yes |
| `GET` | `/1rm/rep-table` | Yes |
| `POST` | `/1rm/reverse-calculate` | Yes |
| `POST` | `/1rm/scores` | Yes |
| `GET` | `/1rm/summary` | Yes |


### Achievements

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/achievements/categories` | Yes |
| `GET` | `/achievements/definitions` | Yes |
| `GET` | `/achievements/definitions/:key` | Yes |
| `GET` | `/me/achievements/summary` | Yes |


### Verifications

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/achievements/verification-required` | Yes |


### Admin-control

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/admin-control/audit` | Yes |
| `GET` | `/admin-control/audit/credits` | Yes |
| `POST` | `/admin-control/credits/adjust` | Yes |
| `POST` | `/admin-control/emergency/:action` | Yes |
| `GET` | `/admin-control/emergency/status` | Yes |
| `GET` | `/admin-control/groups` | Yes |
| `GET` | `/admin-control/pipelines` | Yes |
| `GET` | `/admin-control/scripts` | Yes |
| `GET` | `/admin-control/system-status` | Yes |
| `GET` | `/admin-control/users` | Yes |
| `POST` | `/admin-control/users/:userId/:action` | Yes |


### Credits

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/admin/abuse-check/:userId` | Yes |
| `POST` | `/admin/credits/adjust` | Yes |
| `GET` | `/admin/credits/audit` | Yes |
| `POST` | `/admin/credits/reverse` | Yes |
| `GET` | `/admin/disputes` | Yes |
| `POST` | `/admin/disputes/:disputeId/messages` | Yes |
| `POST` | `/admin/disputes/:disputeId/resolve` | Yes |
| `PATCH` | `/admin/disputes/:disputeId/status` | Yes |
| `GET` | `/admin/economy/metrics` | Yes |
| `GET` | `/admin/escrow` | Yes |
| `POST` | `/admin/escrow/:escrowId/refund` | Yes |
| `POST` | `/admin/escrow/:escrowId/release` | Yes |
| `GET` | `/admin/fraud-flags` | Yes |
| `POST` | `/admin/fraud-flags` | Yes |
| `POST` | `/admin/fraud-flags/:flagId/review` | Yes |
| `POST` | `/admin/leaderboard-rewards/trigger` | Yes |
| `GET` | `/admin/rate-limit-status/:userId` | Yes |
| `GET` | `/admin/rate-limits` | Yes |
| `PUT` | `/admin/rate-limits/:action` | Yes |
| `POST` | `/admin/store/grant` | Yes |
| `POST` | `/admin/store/revoke` | Yes |
| `GET` | `/admin/trust/:userId` | Yes |
| `POST` | `/admin/trust/:userId/override` | Yes |
| `DELETE` | `/admin/trust/:userId/override` | Yes |
| `GET` | `/admin/wallet/:userId` | Yes |
| `POST` | `/admin/wallet/freeze` | Yes |
| `POST` | `/admin/wallet/unfreeze` | Yes |
| `GET` | `/buddy` | Yes |
| `POST` | `/buddy` | Yes |
| `POST` | `/buddy/equip` | Yes |
| `GET` | `/buddy/evolution/:species` | Yes |
| `GET` | `/buddy/leaderboard` | Yes |
| `PUT` | `/buddy/nickname` | Yes |
| `PUT` | `/buddy/settings` | Yes |
| `PUT` | `/buddy/species` | Yes |
| `POST` | `/buddy/unequip` | Yes |
| `GET` | `/classes/browse` | Yes |
| `GET` | `/disputes` | Yes |
| `POST` | `/disputes` | Yes |
| `GET` | `/disputes/:disputeId` | Yes |
| `GET` | `/disputes/:disputeId/messages` | Yes |
| `POST` | `/disputes/:disputeId/messages` | Yes |
| `GET` | `/earning/rules` | Yes |
| `GET` | `/escrow` | Yes |
| `GET` | `/escrow/:escrowId` | Yes |
| `GET` | `/me/credits/summary` | Yes |
| `GET` | `/store/categories` | Yes |
| `GET` | `/store/featured` | Yes |
| `GET` | `/store/inventory` | Yes |
| `GET` | `/store/items` | Yes |
| `GET` | `/store/items/:sku` | Yes |
| `GET` | `/store/owns/:sku` | Yes |
| `POST` | `/store/purchase` | Yes |
| `GET` | `/trust` | Yes |
| `GET` | `/trust/tiers` | Yes |
| `GET` | `/wallet` | Yes |
| `GET` | `/wallet/earnings` | Yes |
| `GET` | `/wallet/transactions` | Yes |
| `POST` | `/wallet/transfer` | Yes |
| `GET` | `/wallet/transfers` | Yes |


### Admin-alerts

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/admin/alerts/channels` | Yes |
| `POST` | `/admin/alerts/channels` | Yes |
| `GET` | `/admin/alerts/history` | Yes |
| `GET` | `/admin/alerts/rules` | Yes |
| `POST` | `/admin/alerts/rules` | Yes |


### Admin-analytics

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/admin/analytics/cohorts` | Yes |
| `GET` | `/admin/analytics/dashboard` | Yes |
| `GET` | `/admin/analytics/features` | Yes |
| `POST` | `/admin/analytics/recalculate` | Yes |
| `GET` | `/admin/analytics/segments` | Yes |
| `GET` | `/admin/analytics/segments/:id/members` | Yes |
| `GET` | `/admin/analytics/users/:id` | Yes |
| `GET` | `/admin/analytics/users/:id/timeline` | Yes |
| `GET` | `/admin/analytics/users/new` | Yes |


### Admin-backup

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/admin/backup/create` | Yes |
| `GET` | `/admin/backup/list` | Yes |
| `GET` | `/admin/backup/schedule` | Yes |
| `PUT` | `/admin/backup/schedule` | Yes |
| `GET` | `/admin/backup/status` | Yes |


### Admin-bugs

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/admin/bugs` | Yes |
| `POST` | `/admin/bugs/auto-fix` | Yes |
| `POST` | `/admin/bugs/bulk` | Yes |
| `GET` | `/admin/bugs/queue-status` | Yes |
| `GET` | `/admin/bugs/stats` | Yes |
| `POST` | `/admin/bugs/sync` | Yes |
| `GET` | `/admin/bugs/timeline` | Yes |


### Admin-database

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/admin/database/connections` | Yes |
| `GET` | `/admin/database/health` | Yes |
| `GET` | `/admin/database/indexes` | Yes |
| `GET` | `/admin/database/locks` | Yes |
| `POST` | `/admin/database/query` | Yes |
| `GET` | `/admin/database/slow-queries` | Yes |
| `GET` | `/admin/database/stats` | Yes |
| `GET` | `/admin/database/tables` | Yes |
| `POST` | `/admin/database/vacuum` | Yes |


### Admin-deploy

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/admin/deploy/:deploymentId` | Yes |
| `GET` | `/admin/deploy/branches` | Yes |
| `POST` | `/admin/deploy/cancel/:deploymentId` | Yes |
| `GET` | `/admin/deploy/history` | Yes |
| `GET` | `/admin/deploy/preview/:branch` | Yes |
| `POST` | `/admin/deploy/rollback/:deploymentId` | Yes |
| `GET` | `/admin/deploy/status` | Yes |
| `GET` | `/admin/deploy/stream` | Yes |
| `POST` | `/admin/deploy/trigger` | Yes |


### Admin-docs

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/admin/docs/file` | Yes |
| `POST` | `/admin/docs/file` | Yes |
| `PUT` | `/admin/docs/file` | Yes |
| `DELETE` | `/admin/docs/file` | Yes |
| `POST` | `/admin/docs/folder` | Yes |
| `GET` | `/admin/docs/list` | Yes |
| `GET` | `/admin/docs/search` | Yes |
| `GET` | `/admin/docs/stats` | Yes |


### Admin-env

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/admin/env/audit` | Yes |
| `GET` | `/admin/env/compare` | Yes |
| `GET` | `/admin/env/export` | Yes |
| `POST` | `/admin/env/validate` | Yes |
| `GET` | `/admin/env/variables` | Yes |


### Admin-features

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/admin/features/flags` | Yes |
| `POST` | `/admin/features/flags` | Yes |


### Admin-feedback

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/admin/feedback` | Yes |
| `GET` | `/admin/feedback/recent-activity` | Yes |
| `GET` | `/admin/feedback/stats` | Yes |


### Admin-logs

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/admin/logs/aggregations` | Yes |
| `GET` | `/admin/logs/errors` | Yes |
| `POST` | `/admin/logs/export` | Yes |
| `GET` | `/admin/logs/patterns` | Yes |
| `GET` | `/admin/logs/search` | Yes |
| `GET` | `/admin/logs/stats` | Yes |
| `GET` | `/admin/logs/stream` | Yes |
| `GET` | `/admin/logs/tail` | Yes |


### Admin-metrics

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/admin/metrics/endpoints` | Yes |
| `GET` | `/admin/metrics/history` | Yes |
| `GET` | `/admin/metrics/realtime` | Yes |
| `POST` | `/admin/metrics/reset` | Yes |
| `GET` | `/admin/metrics/stream` | Yes |
| `GET` | `/admin/metrics/users` | Yes |
| `GET` | `/admin/metrics/websockets` | Yes |


### Admin-scheduler

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/admin/scheduler/commands` | Yes |
| `GET` | `/admin/scheduler/history` | Yes |
| `GET` | `/admin/scheduler/jobs` | Yes |
| `POST` | `/admin/scheduler/jobs` | Yes |
| `POST` | `/admin/scheduler/reload` | Yes |
| `POST` | `/admin/scheduler/start` | Yes |
| `GET` | `/admin/scheduler/stats` | Yes |
| `GET` | `/admin/scheduler/status` | Yes |
| `POST` | `/admin/scheduler/stop` | Yes |
| `POST` | `/admin/scheduler/validate-cron` | Yes |


### Admin-security

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/admin/security/audit-log` | Yes |
| `GET` | `/admin/security/blocklist` | Yes |
| `POST` | `/admin/security/blocklist` | Yes |
| `GET` | `/admin/security/login-attempts` | Yes |
| `GET` | `/admin/security/rate-limits` | Yes |
| `PUT` | `/admin/security/rate-limits` | Yes |
| `GET` | `/admin/security/scan` | Yes |
| `GET` | `/admin/security/sessions` | Yes |


### Admin-server

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/admin/server/git` | Yes |
| `POST` | `/admin/server/git/pull` | Yes |
| `GET` | `/admin/server/logs` | Yes |
| `GET` | `/admin/server/logs/stream` | Yes |
| `POST` | `/admin/server/process` | Yes |
| `POST` | `/admin/server/script` | Yes |
| `GET` | `/admin/server/scripts` | Yes |
| `GET` | `/admin/server/status` | Yes |


### Test-scorecard

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/admin/test-scorecard` | Yes |
| `POST` | `/admin/test-scorecard` | Yes |
| `DELETE` | `/admin/test-scorecard/:id` | Yes |
| `GET` | `/admin/test-scorecard/history` | Yes |


### Trainers

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `PUT` | `/admin/trainers/:userId/status` | Yes |
| `POST` | `/classes` | Yes |
| `GET` | `/classes` | Yes |
| `GET` | `/classes/:classId` | Yes |
| `PUT` | `/classes/:classId` | Yes |
| `POST` | `/classes/:classId/attendance` | Yes |
| `GET` | `/classes/:classId/attendance` | Yes |
| `POST` | `/classes/:classId/cancel` | Yes |
| `POST` | `/classes/:classId/enroll` | Yes |
| `GET` | `/classes/:classId/enrollments` | Yes |
| `POST` | `/classes/:classId/unenroll` | Yes |
| `GET` | `/me/enrollments` | Yes |
| `GET` | `/trainers` | Yes |
| `GET` | `/trainers/:userId` | Yes |
| `GET` | `/trainers/me` | Yes |
| `GET` | `/trainers/me/classes` | Yes |
| `PUT` | `/trainers/me/status` | Yes |
| `POST` | `/trainers/profile` | Yes |


### Admin-commands

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/api/admin/commands/cancel/:id` | Yes |
| `POST` | `/api/admin/commands/execute` | Yes |
| `GET` | `/api/admin/commands/execution/:id` | Yes |
| `GET` | `/api/admin/commands/hierarchy` | Yes |
| `GET` | `/api/admin/commands/history` | Yes |
| `GET` | `/api/admin/commands/search` | Yes |
| `GET` | `/api/admin/commands/stream/:id` | Yes |


### Archetype-communities

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/archetype/suggested-communities` | Yes |
| `GET` | `/archetypes/communities` | Yes |


### Journey

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/archetypes` | Yes |
| `GET` | `/archetypes/:id/levels` | Yes |
| `GET` | `/archetypes/by-category/:categoryId` | Yes |
| `GET` | `/archetypes/categories` | Yes |
| `POST` | `/archetypes/select` | Yes |
| `GET` | `/journey` | Yes |
| `GET` | `/journey/progress` | Yes |
| `POST` | `/journey/switch` | Yes |


### Auth

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/auth/login` | No |
| `GET` | `/auth/me` | No |
| `GET` | `/auth/me/capabilities` | No |
| `POST` | `/auth/register` | No |
| `GET` | `/profile` | Yes |
| `PUT` | `/profile` | Yes |


### Billing

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/billing/checkout` | Yes |
| `POST` | `/billing/credits/checkout` | Yes |
| `POST` | `/billing/portal` | Yes |


### Body-measurements

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/body-measurements` | Yes |
| `POST` | `/body-measurements` | Yes |
| `GET` | `/body-measurements/:id` | Yes |
| `PUT` | `/body-measurements/:id` | Yes |
| `DELETE` | `/body-measurements/:id` | Yes |
| `GET` | `/body-measurements/comparison` | Yes |
| `GET` | `/body-measurements/history/:field` | Yes |
| `GET` | `/body-measurements/latest` | Yes |


### Rehabilitation

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/body-regions` | Yes |
| `GET` | `/my-injuries` | Yes |


### EconomyEnhanced

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/bonus-events/history` | Yes |
| `GET` | `/bonus-events/types` | Yes |
| `POST` | `/checkout/stripe` | Yes |
| `GET` | `/earn-events` | Yes |
| `POST` | `/earn-events/mark-seen` | Yes |
| `GET` | `/earn-events/recent` | Yes |
| `GET` | `/earn-events/stream` | Yes |
| `GET` | `/earn-events/today` | Yes |
| `GET` | `/earn-events/week` | Yes |
| `GET` | `/hangouts/geo/:hangoutId` | Yes |
| `GET` | `/hangouts/geo/:hangoutId/challenges` | Yes |
| `POST` | `/hangouts/geo/:hangoutId/challenges` | Yes |
| `GET` | `/hangouts/geo/:hangoutId/events` | Yes |
| `POST` | `/hangouts/geo/:hangoutId/events` | Yes |
| `GET` | `/hangouts/geo/:hangoutId/members` | Yes |
| `GET` | `/hangouts/geo/my` | Yes |
| `POST` | `/location` | Yes |
| `GET` | `/location` | Yes |
| `GET` | `/packages` | Yes |
| `GET` | `/packages/:packageId` | Yes |
| `GET` | `/packages/custom/:credits` | Yes |
| `GET` | `/purchases` | Yes |
| `POST` | `/social/boost` | Yes |
| `GET` | `/social/boost/check` | Yes |
| `GET` | `/social/boost/options` | Yes |
| `POST` | `/social/gift` | Yes |
| `POST` | `/social/gifts/:giftId/accept` | Yes |
| `POST` | `/social/gifts/:giftId/decline` | Yes |
| `GET` | `/social/gifts/pending` | Yes |
| `GET` | `/social/high-five/costs` | Yes |
| `POST` | `/social/high-five/super` | Yes |
| `GET` | `/social/high-fives/received` | Yes |
| `POST` | `/social/tip` | Yes |
| `GET` | `/social/tips/received` | Yes |
| `GET` | `/social/tips/sent` | Yes |
| `POST` | `/subscriptions/cancel` | Yes |
| `POST` | `/subscriptions/checkout` | Yes |
| `GET` | `/subscriptions/current` | Yes |
| `GET` | `/subscriptions/tiers` | Yes |
| `GET` | `/utility/streak-freeze` | Yes |
| `POST` | `/utility/streak-freeze/purchase` | Yes |
| `POST` | `/utility/streak-freeze/use` | Yes |
| `POST` | `/webhook/stripe` | Yes |


### Social

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/buddy/matches` | Yes |
| `GET` | `/buddy/pairs` | Yes |
| `GET` | `/buddy/preferences` | Yes |
| `PUT` | `/buddy/preferences` | Yes |
| `GET` | `/buddy/requests` | Yes |
| `GET` | `/friend-requests` | Yes |
| `GET` | `/friends` | Yes |


### Bulletin

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/bulletin/comments/:commentId/vote` | Yes |
| `GET` | `/bulletin/posts/:postId` | Yes |
| `GET` | `/bulletin/posts/:postId/comments` | Yes |
| `POST` | `/bulletin/posts/:postId/comments` | Yes |
| `POST` | `/bulletin/posts/:postId/hide` | Yes |
| `POST` | `/bulletin/posts/:postId/pin` | Yes |
| `POST` | `/bulletin/posts/:postId/unhide` | Yes |
| `POST` | `/bulletin/posts/:postId/unpin` | Yes |
| `POST` | `/bulletin/posts/:postId/vote` | Yes |


### Career

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/career/goals` | Yes |
| `POST` | `/career/goals` | Yes |
| `GET` | `/career/goals/:goalId/exercises` | Yes |
| `PUT` | `/career/goals/:id` | Yes |
| `DELETE` | `/career/goals/:id` | Yes |
| `GET` | `/career/readiness` | Yes |
| `GET` | `/career/readiness/:goalId` | Yes |
| `POST` | `/career/readiness/:goalId/refresh` | Yes |
| `GET` | `/career/recertifications` | Yes |
| `POST` | `/career/recertifications` | Yes |
| `GET` | `/career/standards` | Yes |
| `GET` | `/career/standards/:id` | Yes |
| `GET` | `/career/standards/categories` | Yes |
| `GET` | `/career/team/:hangoutId` | Yes |
| `POST` | `/career/team/:hangoutId/enable` | Yes |
| `POST` | `/career/team/:hangoutId/opt-in` | Yes |


### Challenges

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/challenges/daily` | Yes |
| `POST` | `/challenges/daily/claim/:id` | Yes |
| `GET` | `/challenges/history` | Yes |
| `POST` | `/challenges/progress` | Yes |
| `GET` | `/challenges/types` | Yes |
| `GET` | `/challenges/weekly` | Yes |
| `POST` | `/challenges/weekly/claim` | Yes |


### Cohort-preferences

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/cohort-options` | Yes |
| `GET` | `/me/cohort-preferences` | Yes |
| `POST` | `/me/leaderboard-opt-in` | Yes |
| `POST` | `/me/leaderboard-opt-out` | Yes |


### Marketplace

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/collection` | Yes |
| `GET` | `/collection/favorites` | Yes |
| `POST` | `/collection/items/:id/favorite` | Yes |
| `POST` | `/collection/items/:id/seen` | Yes |
| `GET` | `/collection/new-count` | Yes |
| `POST` | `/collection/seen-all` | Yes |
| `GET` | `/collection/sets` | Yes |
| `GET` | `/collection/sets/:id` | Yes |
| `POST` | `/collection/sets/:id/claim` | Yes |
| `PUT` | `/collection/showcase` | Yes |
| `GET` | `/collection/showcase/:userId` | Yes |
| `GET` | `/collection/stats` | Yes |
| `GET` | `/health-multiplier` | Yes |
| `POST` | `/health-multiplier/calculate` | Yes |
| `GET` | `/health-multiplier/history` | Yes |
| `GET` | `/health-multiplier/leaderboard` | Yes |
| `POST` | `/health-multiplier/metrics` | Yes |
| `GET` | `/health-multiplier/stats` | Yes |
| `GET` | `/health-multiplier/today` | Yes |
| `GET` | `/marketplace` | Yes |
| `POST` | `/marketplace/listings` | Yes |
| `GET` | `/marketplace/listings/:id` | Yes |
| `PATCH` | `/marketplace/listings/:id` | Yes |
| `DELETE` | `/marketplace/listings/:id` | Yes |
| `POST` | `/marketplace/listings/:id/buy` | Yes |
| `POST` | `/marketplace/listings/:id/offer` | Yes |
| `GET` | `/marketplace/listings/:id/offers` | Yes |
| `GET` | `/marketplace/my-listings` | Yes |
| `GET` | `/marketplace/my-offers` | Yes |
| `GET` | `/marketplace/my-stats` | Yes |
| `DELETE` | `/marketplace/offers/:id` | Yes |
| `POST` | `/marketplace/offers/:id/respond` | Yes |
| `GET` | `/marketplace/overview` | Yes |
| `GET` | `/marketplace/price-history/:cosmeticId` | Yes |
| `GET` | `/marketplace/price-suggestion/:cosmeticId` | Yes |
| `GET` | `/marketplace/watchlist` | Yes |
| `POST` | `/marketplace/watchlist` | Yes |
| `DELETE` | `/marketplace/watchlist/:listingId` | Yes |
| `GET` | `/mystery-boxes` | Yes |
| `GET` | `/mystery-boxes/:id` | Yes |
| `POST` | `/mystery-boxes/:id/open` | Yes |
| `GET` | `/mystery-boxes/history` | Yes |
| `GET` | `/mystery-boxes/pity` | Yes |
| `POST` | `/trades` | Yes |
| `GET` | `/trades/:id` | Yes |
| `DELETE` | `/trades/:id` | Yes |
| `POST` | `/trades/:id/accept` | Yes |
| `POST` | `/trades/:id/counter` | Yes |
| `POST` | `/trades/:id/decline` | Yes |
| `POST` | `/trades/estimate-value` | Yes |
| `GET` | `/trades/history` | Yes |
| `GET` | `/trades/incoming` | Yes |
| `GET` | `/trades/outgoing` | Yes |


### Communities

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/communities` | Yes |
| `GET` | `/communities` | Yes |
| `POST` | `/communities/:id/events` | Yes |
| `GET` | `/communities/:id/events` | Yes |
| `POST` | `/communities/:id/join` | Yes |
| `POST` | `/communities/:id/leave` | Yes |
| `GET` | `/communities/:id/members` | Yes |
| `POST` | `/communities/:id/members/:userId/approve` | Yes |
| `POST` | `/communities/:id/members/:userId/reject` | Yes |
| `PATCH` | `/communities/:id/members/:userId/role` | Yes |
| `GET` | `/communities/:id/posts` | Yes |
| `POST` | `/communities/:id/posts` | Yes |
| `GET` | `/communities/:idOrSlug` | Yes |
| `GET` | `/communities/my` | Yes |


### Community

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/community/feed` | Yes |
| `GET` | `/community/monitor` | Yes |
| `GET` | `/community/now` | Yes |
| `GET` | `/community/percentile` | Yes |
| `GET` | `/community/presence` | Yes |
| `POST` | `/community/presence` | Yes |
| `GET` | `/community/stats` | Yes |
| `GET` | `/community/stats/archetypes` | Yes |
| `GET` | `/community/stats/credits` | Yes |
| `GET` | `/community/stats/exercises` | Yes |
| `GET` | `/community/stats/funnel` | Yes |
| `GET` | `/community/stats/geographic` | Yes |
| `GET` | `/community/stats/public` | Yes |
| `GET` | `/community/stats/summary` | Yes |
| `GET` | `/community/ws` | Yes |
| `GET` | `/community/ws/public` | Yes |


### Competition

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/competition/categories` | Yes |
| `GET` | `/competition/categories/:id` | Yes |
| `GET` | `/competition/categories/grouped` | Yes |
| `GET` | `/competition/me` | Yes |
| `POST` | `/competition/me` | Yes |
| `DELETE` | `/competition/me` | Yes |
| `GET` | `/competition/me/countdown` | Yes |
| `PUT` | `/competition/me/phase` | Yes |
| `POST` | `/competition/me/show-complete` | Yes |
| `POST` | `/competition/me/weigh-in` | Yes |
| `GET` | `/competition/me/weigh-ins` | Yes |
| `GET` | `/competition/weak-points` | Yes |


### Daily-login

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/daily-login/calendar` | Yes |
| `POST` | `/daily-login/claim` | Yes |
| `POST` | `/daily-login/purchase-freeze` | Yes |
| `GET` | `/daily-login/rewards` | Yes |
| `GET` | `/daily-login/status` | Yes |
| `POST` | `/daily-login/use-freeze` | Yes |


### Deployment

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/deploy/cancel/:id` | Yes |
| `GET` | `/deploy/commands` | Yes |
| `POST` | `/deploy/execute` | Yes |
| `GET` | `/deploy/logs` | Yes |
| `GET` | `/deploy/logs/:id` | Yes |
| `GET` | `/deploy/status` | Yes |
| `GET` | `/deploy/stream/:id` | Yes |


### Economy

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/economy/actions` | Yes |
| `GET` | `/economy/balance` | Yes |
| `POST` | `/economy/charge` | Yes |
| `GET` | `/economy/history` | Yes |
| `GET` | `/economy/pricing` | Yes |
| `GET` | `/economy/transactions` | Yes |
| `GET` | `/economy/wallet` | Yes |


### Engagement-recovery

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/engagement/recovery/activities` | Yes |
| `GET` | `/engagement/recovery/activity-types` | Yes |
| `GET` | `/engagement/recovery/history` | Yes |
| `POST` | `/engagement/recovery/log-activity` | Yes |
| `GET` | `/engagement/recovery/muscles` | Yes |
| `GET` | `/engagement/recovery/today` | Yes |


### Engagement-summary

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/engagement/seed-events` | Yes |
| `GET` | `/engagement/stats` | Yes |
| `GET` | `/engagement/summary` | Yes |


### Equipment

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/equipment/categories` | Yes |
| `GET` | `/equipment/home` | Yes |
| `PUT` | `/equipment/home` | Yes |
| `POST` | `/equipment/home` | Yes |
| `DELETE` | `/equipment/home/:equipmentId` | Yes |
| `GET` | `/equipment/home/ids` | Yes |
| `GET` | `/equipment/types` | Yes |
| `GET` | `/equipment/types/:category` | Yes |
| `GET` | `/locations/:id/equipment` | Yes |
| `POST` | `/locations/:id/equipment` | Yes |
| `GET` | `/locations/:id/equipment/my-reports` | Yes |
| `GET` | `/locations/:id/equipment/verified` | Yes |


### Errors

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/errors/:id/convert-to-bug` | Yes |
| `POST` | `/errors/:id/resolve` | Yes |
| `GET` | `/errors/admin-stats` | Yes |
| `GET` | `/errors/list` | Yes |
| `POST` | `/errors/report` | Yes |
| `POST` | `/errors/report/batch` | Yes |
| `GET` | `/errors/stats` | Yes |
| `POST` | `/errors/sync-to-bugs` | Yes |


### Events

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/events` | Yes |
| `GET` | `/events/:id` | Yes |
| `DELETE` | `/events/:id` | Yes |
| `POST` | `/events/:id/join` | Yes |
| `GET` | `/events/:id/participation` | Yes |
| `POST` | `/events/:id/progress` | Yes |
| `GET` | `/events/active` | Yes |
| `GET` | `/events/history` | Yes |
| `GET` | `/events/multipliers` | Yes |
| `GET` | `/events/upcoming` | Yes |


### Exercise-groups

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/exercise-group-presets` | Yes |
| `POST` | `/exercise-group-presets` | Yes |
| `DELETE` | `/exercise-group-presets/:presetId` | Yes |
| `POST` | `/exercise-group-presets/:presetId/apply` | Yes |
| `POST` | `/exercise-groups` | Yes |
| `GET` | `/exercise-groups/:groupId` | Yes |
| `PUT` | `/exercise-groups/:groupId` | Yes |
| `DELETE` | `/exercise-groups/:groupId` | Yes |
| `POST` | `/exercise-groups/:groupId/exercises` | Yes |
| `DELETE` | `/exercise-groups/:groupId/exercises/:exerciseId` | Yes |
| `PUT` | `/exercise-groups/:groupId/reorder` | Yes |
| `GET` | `/exercise-groups/types` | Yes |
| `GET` | `/workouts/:workoutId/groups` | Yes |
| `POST` | `/workouts/:workoutId/groups/:groupId/sets` | Yes |
| `GET` | `/workouts/:workoutId/groups/:groupId/sets` | Yes |


### Exercise-videos

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/exercises/:id/videos` | Yes |
| `POST` | `/exercises/:id/videos` | Yes |
| `GET` | `/exercises/:id/videos/:videoId` | Yes |
| `PATCH` | `/exercises/:id/videos/:videoId` | Yes |
| `DELETE` | `/exercises/:id/videos/:videoId` | Yes |
| `GET` | `/me/video-favorites` | Yes |
| `GET` | `/me/video-history` | Yes |
| `POST` | `/videos/:videoId/favorite` | Yes |
| `POST` | `/videos/:videoId/watch` | Yes |


### Feedback

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/faq` | Yes |
| `GET` | `/faq/:id` | Yes |
| `POST` | `/faq/:id/helpful` | Yes |
| `GET` | `/faq/categories` | Yes |
| `POST` | `/feedback` | Yes |
| `GET` | `/feedback` | Yes |
| `GET` | `/feedback/:id` | Yes |
| `POST` | `/feedback/:id/respond` | Yes |
| `POST` | `/feedback/:id/upvote` | Yes |
| `DELETE` | `/feedback/:id/upvote` | Yes |
| `GET` | `/feedback/features/popular` | Yes |
| `GET` | `/feedback/search` | Yes |


### Goals

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/goals` | Yes |
| `POST` | `/goals` | Yes |
| `GET` | `/goals/:id` | Yes |
| `PUT` | `/goals/:id` | Yes |
| `DELETE` | `/goals/:id` | Yes |
| `POST` | `/goals/:id/milestones` | Yes |
| `POST` | `/goals/:id/progress` | Yes |
| `GET` | `/goals/suggestions` | Yes |


### Checkins

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/hangouts/:id/check-ins/active` | Yes |
| `GET` | `/me/check-in` | Yes |


### Hangouts

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/hangouts/types` | Yes |


### Health

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/health` | Yes |
| `GET` | `/health/detailed` | Yes |
| `GET` | `/health/live` | Yes |
| `GET` | `/health/ready` | Yes |


### Identities

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/identities` | Yes |
| `GET` | `/identities/all-with-communities` | Yes |
| `GET` | `/identities/categories` | Yes |
| `GET` | `/identities/me` | Yes |
| `GET` | `/identities/suggested-communities` | Yes |


### Issues

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/issues/labels` | Yes |
| `GET` | `/issues/stats` | Yes |


### Beta-tester

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/journal` | Yes |
| `GET` | `/snapshots` | Yes |
| `GET` | `/status` | Yes |


### Journey-management

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/journey/fresh-start` | Yes |
| `POST` | `/journey/restart-onboarding` | Yes |
| `GET` | `/journey/restore-history` | Yes |
| `GET` | `/journey/settings` | Yes |
| `PUT` | `/journey/settings` | Yes |
| `GET` | `/journey/snapshots` | Yes |
| `POST` | `/journey/snapshots` | Yes |
| `GET` | `/journey/snapshots/:id` | Yes |
| `DELETE` | `/journey/snapshots/:id` | Yes |
| `POST` | `/journey/snapshots/:id/restore` | Yes |


### Journeys

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/journeys` | Yes |
| `POST` | `/journeys` | Yes |
| `GET` | `/journeys/:id` | Yes |
| `PUT` | `/journeys/:id` | Yes |
| `DELETE` | `/journeys/:id` | Yes |
| `POST` | `/journeys/:id/milestones` | Yes |
| `POST` | `/journeys/:id/progress` | Yes |
| `GET` | `/journeys/categories` | Yes |
| `GET` | `/journeys/categories/:categoryId` | Yes |
| `GET` | `/journeys/featured` | Yes |
| `POST` | `/journeys/start` | Yes |
| `GET` | `/journeys/suggestions` | Yes |
| `GET` | `/journeys/templates` | Yes |
| `GET` | `/journeys/templates/:templateId` | Yes |


### Leaderboards

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/leaderboards/simple` | Yes |
| `GET` | `/leaderboards/user-rank` | Yes |


### Limitations

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/limitations` | Yes |
| `POST` | `/limitations` | Yes |
| `PUT` | `/limitations/:id` | Yes |
| `DELETE` | `/limitations/:id` | Yes |
| `GET` | `/limitations/body-regions` | Yes |
| `POST` | `/limitations/check-workout` | Yes |
| `GET` | `/limitations/substitutions/:exerciseId` | Yes |


### Live-activity

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/live/cleanup` | Yes |
| `GET` | `/live/feed` | Yes |
| `GET` | `/live/filters` | Yes |
| `GET` | `/live/hierarchy/:level` | Yes |
| `GET` | `/live/map` | Yes |
| `GET` | `/live/stats` | Yes |
| `GET` | `/live/stream` | Yes |
| `GET` | `/live/trending` | Yes |


### Martial-arts

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/martial-arts/progress` | Yes |


### Mascot

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/mascot/companion/active-program` | Yes |
| `GET` | `/mascot/companion/assist/abilities` | Yes |
| `GET` | `/mascot/companion/assist/history` | Yes |
| `GET` | `/mascot/companion/assist/state` | Yes |
| `POST` | `/mascot/companion/assist/use` | Yes |
| `GET` | `/mascot/companion/bonus` | Yes |
| `POST` | `/mascot/companion/check-overtraining` | Yes |
| `POST` | `/mascot/companion/cosmetics/equip` | Yes |
| `GET` | `/mascot/companion/credit-alerts` | Yes |
| `POST` | `/mascot/companion/credit-alerts/:alertId/dismiss` | Yes |
| `POST` | `/mascot/companion/crew-coordination` | Yes |
| `GET` | `/mascot/companion/crew-suggestions` | Yes |
| `GET` | `/mascot/companion/data-alerts` | Yes |
| `GET` | `/mascot/companion/energy` | Yes |
| `POST` | `/mascot/companion/events/mark-reacted` | Yes |
| `GET` | `/mascot/companion/events/recent` | Yes |
| `GET` | `/mascot/companion/exercise-alternatives/:exerciseId` | Yes |
| `POST` | `/mascot/companion/exercise-avoidance` | Yes |
| `GET` | `/mascot/companion/exercise-avoidances` | Yes |
| `POST` | `/mascot/companion/generate-program` | Yes |
| `GET` | `/mascot/companion/highfive-prefs` | Yes |
| `PUT` | `/mascot/companion/highfive-prefs` | Yes |
| `GET` | `/mascot/companion/loan` | Yes |
| `POST` | `/mascot/companion/loan/repay` | Yes |
| `POST` | `/mascot/companion/loan/take` | Yes |
| `GET` | `/mascot/companion/master-abilities` | Yes |
| `POST` | `/mascot/companion/master-abilities/:abilityKey/unlock` | Yes |
| `GET` | `/mascot/companion/milestones` | Yes |
| `GET` | `/mascot/companion/negotiated-rate` | Yes |
| `PATCH` | `/mascot/companion/nickname` | Yes |
| `GET` | `/mascot/companion/nutrition-hint` | Yes |
| `GET` | `/mascot/companion/overtraining-alerts` | Yes |
| `GET` | `/mascot/companion/powers` | Yes |
| `GET` | `/mascot/companion/powers/all` | Yes |
| `GET` | `/mascot/companion/programs` | Yes |
| `GET` | `/mascot/companion/recovered-muscles` | Yes |
| `GET` | `/mascot/companion/rivalry-alerts` | Yes |
| `POST` | `/mascot/companion/rivalry-alerts/:alertId/seen` | Yes |
| `PATCH` | `/mascot/companion/settings` | Yes |
| `GET` | `/mascot/companion/social-actions` | Yes |
| `GET` | `/mascot/companion/state` | Yes |
| `GET` | `/mascot/companion/streak-saver` | Yes |
| `POST` | `/mascot/companion/streak-saver/use` | Yes |
| `GET` | `/mascot/companion/tips/next` | Yes |
| `GET` | `/mascot/companion/trash-talk` | Yes |
| `GET` | `/mascot/companion/tutorial` | Yes |
| `GET` | `/mascot/companion/upgrades` | Yes |
| `POST` | `/mascot/companion/upgrades/:upgradeId/purchase` | Yes |
| `GET` | `/mascot/companion/volume-stats` | Yes |
| `GET` | `/mascot/companion/wardrobe/appearance` | Yes |
| `GET` | `/mascot/companion/wardrobe/catalog` | Yes |
| `GET` | `/mascot/companion/wardrobe/collection` | Yes |
| `GET` | `/mascot/companion/wardrobe/cosmetic/:idOrKey` | Yes |
| `POST` | `/mascot/companion/wardrobe/favorite/:cosmeticId` | Yes |
| `POST` | `/mascot/companion/wardrobe/gift` | Yes |
| `GET` | `/mascot/companion/wardrobe/loadout` | Yes |
| `PUT` | `/mascot/companion/wardrobe/loadout` | Yes |
| `POST` | `/mascot/companion/wardrobe/mark-seen` | Yes |
| `GET` | `/mascot/companion/wardrobe/presets` | Yes |
| `POST` | `/mascot/companion/wardrobe/presets` | Yes |
| `PATCH` | `/mascot/companion/wardrobe/presets/:presetId` | Yes |
| `DELETE` | `/mascot/companion/wardrobe/presets/:presetId` | Yes |
| `POST` | `/mascot/companion/wardrobe/presets/:presetId/load` | Yes |
| `POST` | `/mascot/companion/wardrobe/purchase/:cosmeticId` | Yes |
| `GET` | `/mascot/companion/wardrobe/shop` | Yes |
| `GET` | `/mascot/companion/workout-suggestion` | Yes |
| `GET` | `/mascot/global/config` | Yes |
| `GET` | `/mascot/global/placements` | Yes |


### Venues

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/me/checkin` | Yes |
| `GET` | `/me/checkins` | Yes |
| `GET` | `/me/current-records` | Yes |
| `GET` | `/me/venue-records` | Yes |
| `GET` | `/record-types` | Yes |
| `GET` | `/venue-records/:id` | Yes |
| `DELETE` | `/venue-records/:id` | Yes |
| `POST` | `/venue-records/:id/attest` | Yes |
| `POST` | `/venue-records/:id/video` | Yes |
| `POST` | `/venue-records/:id/witness` | Yes |
| `GET` | `/venues` | Yes |
| `POST` | `/venues` | Yes |
| `GET` | `/venues/:id` | Yes |
| `POST` | `/venues/:id/checkin` | Yes |
| `POST` | `/venues/:id/checkout` | Yes |
| `POST` | `/venues/:id/join` | Yes |
| `GET` | `/venues/:id/leaderboard` | Yes |
| `POST` | `/venues/:id/leave` | Yes |
| `GET` | `/venues/:id/members` | Yes |
| `GET` | `/venues/:id/present` | Yes |
| `GET` | `/venues/:id/record-types` | Yes |
| `POST` | `/venues/:id/records/claim` | Yes |
| `GET` | `/venues/nearby` | Yes |
| `GET` | `/venues/slug/:slug` | Yes |


### Preferences

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/me/dashboard/widgets` | Yes |
| `GET` | `/me/devices` | Yes |
| `POST` | `/me/devices/register` | Yes |
| `POST` | `/me/hydration/log` | Yes |
| `GET` | `/me/hydration/today` | Yes |
| `GET` | `/me/preferences` | Yes |
| `PATCH` | `/me/preferences` | Yes |
| `GET` | `/me/preferences/effective` | Yes |
| `GET` | `/me/preferences/profiles` | Yes |
| `POST` | `/me/preferences/profiles` | Yes |
| `POST` | `/me/preferences/profiles/deactivate` | Yes |
| `PUT` | `/me/preferences/reset` | Yes |
| `GET` | `/me/sounds/packs` | Yes |
| `POST` | `/me/sounds/packs` | Yes |


### Nutrition

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/me/nutrition` | Yes |
| `POST` | `/me/nutrition/enable` | Yes |
| `GET` | `/me/nutrition/goals` | Yes |
| `GET` | `/me/nutrition/plans/active` | Yes |
| `GET` | `/me/nutrition/preferences` | Yes |
| `GET` | `/me/nutrition/streaks` | Yes |
| `GET` | `/nutrition/archetypes` | Yes |


### Mentorship

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `PUT` | `/mentor/profile` | Yes |
| `GET` | `/mentors` | Yes |
| `GET` | `/mentorship/requests` | Yes |
| `GET` | `/mentorships/active` | Yes |
| `GET` | `/mentorships/history` | Yes |


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
| `GET` | `/messaging/unread-count` | Yes |
| `GET` | `/messaging/ws` | Yes |


### Tips

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/milestones` | Yes |
| `POST` | `/milestones/:id/claim` | Yes |
| `POST` | `/milestones/:id/progress` | Yes |
| `GET` | `/tips` | Yes |
| `POST` | `/tips/:id/seen` | Yes |


### Modules

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/modules` | Yes |
| `GET` | `/modules/:id` | Yes |
| `POST` | `/modules/:id/waitlist` | Yes |
| `DELETE` | `/modules/:id/waitlist` | Yes |
| `GET` | `/modules/coming-soon` | Yes |
| `GET` | `/modules/waitlist/me` | Yes |


### Monitoring

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/monitoring/dashboard` | Yes |
| `GET` | `/monitoring/errors` | Yes |
| `POST` | `/monitoring/errors/:id/resolve` | Yes |
| `POST` | `/monitoring/errors/track` | Yes |
| `GET` | `/monitoring/health` | Yes |
| `POST` | `/monitoring/journey/end` | Yes |
| `POST` | `/monitoring/journey/error` | Yes |
| `POST` | `/monitoring/journey/start` | Yes |
| `POST` | `/monitoring/journey/step` | Yes |
| `GET` | `/monitoring/journeys` | Yes |
| `GET` | `/monitoring/ping` | Yes |
| `GET` | `/monitoring/tests/definitions` | Yes |
| `GET` | `/monitoring/tests/history` | Yes |
| `POST` | `/monitoring/tests/run` | Yes |


### Notifications

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/notifications` | Yes |
| `DELETE` | `/notifications/:id` | Yes |
| `POST` | `/notifications/mark-all-read` | Yes |
| `POST` | `/notifications/mark-read` | Yes |
| `GET` | `/notifications/preferences` | Yes |
| `GET` | `/notifications/preferences/:category` | Yes |
| `PUT` | `/notifications/preferences/:category` | Yes |
| `GET` | `/notifications/unread-count` | Yes |


### Onboarding

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/onboarding/back` | Yes |
| `POST` | `/onboarding/complete` | Yes |
| `POST` | `/onboarding/home-equipment` | Yes |
| `GET` | `/onboarding/injury-regions` | Yes |
| `GET` | `/onboarding/intents` | Yes |
| `GET` | `/onboarding/profile` | Yes |
| `POST` | `/onboarding/profile` | Yes |
| `POST` | `/onboarding/skip` | Yes |
| `POST` | `/onboarding/start` | Yes |
| `GET` | `/onboarding/state` | Yes |
| `DELETE` | `/onboarding/state` | Yes |
| `GET` | `/onboarding/status` | Yes |
| `POST` | `/onboarding/step` | Yes |
| `GET` | `/onboarding/steps` | Yes |


### Organizations

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/organizations` | Yes |
| `GET` | `/organizations/:orgId` | Yes |
| `PUT` | `/organizations/:orgId` | Yes |
| `DELETE` | `/organizations/:orgId` | Yes |
| `GET` | `/organizations/:orgId/audit` | Yes |
| `POST` | `/organizations/:orgId/invite` | Yes |
| `POST` | `/organizations/:orgId/invite/bulk` | Yes |
| `GET` | `/organizations/:orgId/members` | Yes |
| `PUT` | `/organizations/:orgId/members/:memberId` | Yes |
| `DELETE` | `/organizations/:orgId/members/:memberId` | Yes |
| `PUT` | `/organizations/:orgId/members/bulk` | Yes |
| `GET` | `/organizations/:orgId/readiness` | Yes |
| `POST` | `/organizations/:orgId/readiness/export` | Yes |
| `GET` | `/organizations/:orgId/readiness/history` | Yes |
| `POST` | `/organizations/:orgId/readiness/refresh` | Yes |
| `GET` | `/organizations/:orgId/settings` | Yes |
| `PUT` | `/organizations/:orgId/settings` | Yes |
| `GET` | `/organizations/:orgId/units` | Yes |
| `POST` | `/organizations/:orgId/units` | Yes |
| `PUT` | `/organizations/:orgId/units/:unitId` | Yes |
| `DELETE` | `/organizations/:orgId/units/:unitId` | Yes |
| `GET` | `/organizations/:orgId/units/:unitId/readiness` | Yes |
| `GET` | `/organizations/:orgId/units/tree` | Yes |
| `GET` | `/organizations/by-slug/:slug` | Yes |
| `POST` | `/organizations/invites/:token/accept` | Yes |


### Personalization

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/personalization/context` | Yes |
| `POST` | `/personalization/exercise-check` | Yes |
| `GET` | `/personalization/plan` | Yes |
| `GET` | `/personalization/recommendations` | Yes |
| `GET` | `/personalization/summary` | Yes |


### Plugins

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/plugins` | Yes |
| `GET` | `/plugins/:pluginId` | Yes |
| `POST` | `/plugins/:pluginId/disable` | Yes |
| `POST` | `/plugins/:pluginId/enable` | Yes |
| `GET` | `/plugins/:pluginId/settings` | Yes |
| `PUT` | `/plugins/:pluginId/settings` | Yes |
| `DELETE` | `/plugins/:pluginId/settings` | Yes |
| `PUT` | `/plugins/settings/bulk` | Yes |


### Prescription

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/prescription/:id` | Yes |
| `POST` | `/prescription/generate` | Yes |
| `POST` | `/v1/prescription/generate` | Yes |


### Privacy

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/privacy` | Yes |
| `PUT` | `/privacy` | Yes |
| `POST` | `/privacy/disable-minimalist` | Yes |
| `POST` | `/privacy/enable-minimalist` | Yes |
| `GET` | `/privacy/summary` | Yes |


### Programs

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/programs` | Yes |
| `GET` | `/programs` | Yes |
| `GET` | `/programs/:id` | Yes |
| `PUT` | `/programs/:id` | Yes |
| `DELETE` | `/programs/:id` | Yes |
| `POST` | `/programs/:id/duplicate` | Yes |
| `POST` | `/programs/:id/enroll` | Yes |
| `POST` | `/programs/:id/rate` | Yes |
| `POST` | `/programs/:id/record-workout` | Yes |
| `GET` | `/programs/active-enrollment` | Yes |
| `GET` | `/programs/enrollments/:enrollmentId` | Yes |
| `POST` | `/programs/enrollments/:enrollmentId/drop` | Yes |
| `POST` | `/programs/enrollments/:enrollmentId/pause` | Yes |
| `POST` | `/programs/enrollments/:enrollmentId/progress` | Yes |
| `POST` | `/programs/enrollments/:enrollmentId/resume` | Yes |
| `GET` | `/programs/featured` | Yes |
| `GET` | `/programs/me` | Yes |
| `GET` | `/programs/my-enrollments` | Yes |
| `GET` | `/programs/official` | Yes |
| `GET` | `/programs/todays-workout` | Yes |


### Progress-photos

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/progress-photos` | Yes |
| `POST` | `/progress-photos` | Yes |
| `GET` | `/progress-photos/:id` | Yes |
| `PUT` | `/progress-photos/:id` | Yes |
| `DELETE` | `/progress-photos/:id` | Yes |
| `GET` | `/progress-photos/compare` | Yes |
| `GET` | `/progress-photos/stats` | Yes |
| `GET` | `/progress-photos/timeline` | Yes |


### Progression

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/progression/recommendations` | Yes |
| `GET` | `/progression/recommendations/:exerciseId` | Yes |
| `GET` | `/progression/records` | Yes |
| `GET` | `/progression/records/:exerciseId` | Yes |
| `GET` | `/progression/stats/:exerciseId` | Yes |
| `GET` | `/progression/targets` | Yes |
| `POST` | `/progression/targets` | Yes |
| `PUT` | `/progression/targets/:id` | Yes |


### Pt-tests

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/pt-tests` | Yes |
| `GET` | `/pt-tests/:id` | Yes |
| `GET` | `/pt-tests/leaderboard/:testId` | Yes |
| `GET` | `/pt-tests/my-archetype` | Yes |
| `POST` | `/pt-tests/results` | Yes |
| `GET` | `/pt-tests/results` | Yes |
| `GET` | `/pt-tests/results/:id` | Yes |


### Push-notifications

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/push/history` | Yes |
| `POST` | `/push/mark-sent/:id` | Yes |
| `GET` | `/push/pending` | Yes |
| `POST` | `/push/register` | Yes |
| `POST` | `/push/schedule` | Yes |
| `DELETE` | `/push/schedule/:id` | Yes |
| `GET` | `/push/tokens` | Yes |
| `DELETE` | `/push/unregister` | Yes |


### Ranks

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/ranks/definitions` | Yes |
| `GET` | `/ranks/history` | Yes |
| `GET` | `/ranks/leaderboard` | Yes |
| `GET` | `/ranks/me` | Yes |
| `POST` | `/ranks/refresh` | Yes |
| `POST` | `/ranks/update-veterans` | Yes |
| `GET` | `/ranks/user/:userId` | Yes |
| `GET` | `/ranks/veteran-badge` | Yes |


### Recovery

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/recovery/history` | Yes |
| `GET` | `/recovery/recommendations` | Yes |
| `POST` | `/recovery/recommendations/:id/acknowledge` | Yes |
| `POST` | `/recovery/recommendations/generate` | Yes |
| `GET` | `/recovery/score` | Yes |
| `GET` | `/recovery/status` | Yes |
| `GET` | `/sleep-hygiene` | Yes |
| `GET` | `/sleep-hygiene/assessments` | Yes |
| `POST` | `/sleep-hygiene/assessments` | Yes |
| `PATCH` | `/sleep-hygiene/assessments/:date` | Yes |
| `GET` | `/sleep-hygiene/assessments/today` | Yes |
| `GET` | `/sleep-hygiene/credits` | Yes |
| `GET` | `/sleep-hygiene/credits/total` | Yes |
| `POST` | `/sleep-hygiene/disable` | Yes |
| `POST` | `/sleep-hygiene/enable` | Yes |
| `GET` | `/sleep-hygiene/preferences` | Yes |
| `PATCH` | `/sleep-hygiene/preferences` | Yes |
| `GET` | `/sleep-hygiene/streaks` | Yes |
| `GET` | `/sleep-hygiene/tips` | Yes |
| `POST` | `/sleep-hygiene/tips/:tipId/bookmark` | Yes |
| `DELETE` | `/sleep-hygiene/tips/:tipId/bookmark` | Yes |
| `POST` | `/sleep-hygiene/tips/:tipId/dismiss` | Yes |
| `POST` | `/sleep-hygiene/tips/:tipId/follow` | Yes |
| `DELETE` | `/sleep-hygiene/tips/:tipId/follow` | Yes |
| `POST` | `/sleep-hygiene/tips/:tipId/helpful` | Yes |
| `GET` | `/sleep-hygiene/tips/bookmarked` | Yes |
| `GET` | `/sleep/:id` | Yes |
| `PATCH` | `/sleep/:id` | Yes |
| `DELETE` | `/sleep/:id` | Yes |
| `GET` | `/sleep/goal` | Yes |
| `POST` | `/sleep/goal` | Yes |
| `DELETE` | `/sleep/goal/:id` | Yes |
| `GET` | `/sleep/history` | Yes |
| `GET` | `/sleep/last` | Yes |
| `POST` | `/sleep/log` | Yes |
| `GET` | `/sleep/stats` | Yes |
| `GET` | `/sleep/weekly-stats` | Yes |


### Content-reports

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/reports` | Yes |
| `GET` | `/reports/my` | Yes |
| `GET` | `/reports/stats` | Yes |


### Community-resources

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/resources/most-helpful` | Yes |


### Rivals

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/rivals` | Yes |
| `GET` | `/rivals/:id` | Yes |
| `POST` | `/rivals/:id/accept` | Yes |
| `POST` | `/rivals/:id/decline` | Yes |
| `POST` | `/rivals/:id/end` | Yes |
| `POST` | `/rivals/challenge` | Yes |
| `GET` | `/rivals/pending` | Yes |
| `GET` | `/rivals/search` | Yes |
| `GET` | `/rivals/stats` | Yes |


### Rpe

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/rpe/autoregulate` | Yes |
| `GET` | `/rpe/fatigue` | Yes |
| `GET` | `/rpe/scale` | Yes |
| `POST` | `/rpe/snapshot` | Yes |
| `GET` | `/rpe/snapshots` | Yes |
| `GET` | `/rpe/target/:exerciseId` | Yes |
| `PUT` | `/rpe/target/:exerciseId` | Yes |
| `GET` | `/rpe/trends/:exerciseId` | Yes |
| `GET` | `/rpe/weekly/:exerciseId` | Yes |


### Workout-sessions

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/sessions` | Yes |
| `GET` | `/sessions/active` | Yes |
| `DELETE` | `/sessions/active` | Yes |
| `GET` | `/sessions/archived` | Yes |
| `POST` | `/sessions/archived/:id/recover` | Yes |
| `GET` | `/sessions/status` | Yes |


### Workout-sets

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/sets` | Yes |
| `DELETE` | `/sets/:setId` | Yes |
| `POST` | `/sets/bulk` | Yes |
| `GET` | `/sets/exercise/:exerciseId` | Yes |
| `GET` | `/sets/workout/:workoutId` | Yes |


### Milestones

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/skill-milestones` | Yes |
| `GET` | `/skill-milestones/:id` | Yes |
| `GET` | `/skill-milestones/categories` | Yes |
| `GET` | `/skill-milestones/categories/:category` | Yes |
| `GET` | `/skill-milestones/featured` | Yes |
| `GET` | `/skill-milestones/me` | Yes |
| `DELETE` | `/skill-milestones/me/:userMilestoneId` | Yes |
| `GET` | `/skill-milestones/me/:userMilestoneId/attempts` | Yes |
| `POST` | `/skill-milestones/me/:userMilestoneId/log` | Yes |
| `PUT` | `/skill-milestones/me/:userMilestoneId/pause` | Yes |
| `PUT` | `/skill-milestones/me/:userMilestoneId/progress` | Yes |
| `POST` | `/skill-milestones/start` | Yes |


### Skills

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/skills/progress` | Yes |
| `GET` | `/skills/trees` | Yes |


### Skins

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/skins` | Yes |
| `POST` | `/skins/:skinId/equip` | Yes |
| `POST` | `/skins/:skinId/purchase` | Yes |
| `POST` | `/skins/:skinId/unequip` | Yes |
| `GET` | `/skins/equipped` | Yes |
| `GET` | `/skins/owned` | Yes |
| `GET` | `/skins/unlockable` | Yes |


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


### Streaks

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/streaks` | Yes |
| `GET` | `/streaks/:type` | Yes |
| `POST` | `/streaks/:type/claim` | Yes |
| `GET` | `/streaks/:type/leaderboard` | Yes |
| `GET` | `/streaks/:type/milestones` | Yes |
| `POST` | `/streaks/:type/record` | Yes |


### Templates

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/templates` | Yes |
| `GET` | `/templates` | Yes |
| `GET` | `/templates/:id` | Yes |
| `PUT` | `/templates/:id` | Yes |
| `DELETE` | `/templates/:id` | Yes |
| `POST` | `/templates/:id/clone` | Yes |
| `POST` | `/templates/:id/rate` | Yes |
| `POST` | `/templates/:id/save` | Yes |
| `DELETE` | `/templates/:id/save` | Yes |
| `GET` | `/templates/featured` | Yes |
| `GET` | `/templates/me` | Yes |
| `GET` | `/templates/saved` | Yes |


### Virtual-hangouts

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/virtual-hangouts` | Yes |
| `GET` | `/virtual-hangouts/:id` | Yes |
| `GET` | `/virtual-hangouts/:id/activity` | Yes |
| `POST` | `/virtual-hangouts/:id/heartbeat` | Yes |
| `POST` | `/virtual-hangouts/:id/join` | Yes |
| `POST` | `/virtual-hangouts/:id/leave` | Yes |
| `GET` | `/virtual-hangouts/:id/members` | Yes |
| `PATCH` | `/virtual-hangouts/:id/membership` | Yes |
| `GET` | `/virtual-hangouts/:id/posts` | Yes |
| `POST` | `/virtual-hangouts/:id/posts` | Yes |
| `POST` | `/virtual-hangouts/:id/share-workout` | Yes |
| `GET` | `/virtual-hangouts/my` | Yes |
| `GET` | `/virtual-hangouts/recommended` | Yes |
| `GET` | `/virtual-hangouts/themes` | Yes |


### Volume-stats

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/volume/1rm/:exerciseId` | Yes |
| `GET` | `/volume/daily` | Yes |
| `GET` | `/volume/exercise/:exerciseId` | Yes |
| `GET` | `/volume/muscles` | Yes |
| `GET` | `/volume/muscles/weekly` | Yes |
| `GET` | `/volume/prs` | Yes |
| `GET` | `/volume/summary` | Yes |
| `GET` | `/volume/weekly` | Yes |


### Watch

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/watch/exercises` | Yes |
| `GET` | `/watch/quick-start` | Yes |
| `POST` | `/watch/state` | Yes |
| `POST` | `/watch/sync` | Yes |
| `GET` | `/watch/workout-state` | Yes |


### Workouts

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/workouts` | Yes |
| `GET` | `/workouts/:id` | Yes |
| `GET` | `/workouts/me` | Yes |
| `GET` | `/workouts/me/muscles` | Yes |
| `GET` | `/workouts/me/stats` | Yes |
| `POST` | `/workouts/preview` | Yes |


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
