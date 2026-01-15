# MuscleMap API Reference

> Auto-generated on 2026-01-15

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


### Rehabilitation

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `DELETE` | `/:injuryId` | Yes |
| `POST` | `/advance-phase/:injuryId` | Yes |
| `GET` | `/body-regions` | Yes |
| `GET` | `/exercises/:injuryId` | Yes |
| `POST` | `/log` | Yes |
| `GET` | `/my-injuries` | Yes |
| `GET` | `/profiles` | Yes |
| `GET` | `/profiles/:id` | Yes |
| `GET` | `/progress/:injuryId` | Yes |
| `POST` | `/start` | Yes |


### One-rep-max

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/1rm` | Yes |
| `GET` | `/1rm/best` | Yes |
| `POST` | `/1rm/calculate` | Yes |
| `GET` | `/1rm/compound-total` | Yes |
| `GET` | `/1rm/exercise/:exerciseId` | Yes |
| `GET` | `/1rm/leaderboard/:exerciseId` | Yes |
| `GET` | `/1rm/progression/:exerciseId` | Yes |
| `GET` | `/1rm/summary` | Yes |


### Verifications

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/achievements/:id/can-verify` | Yes |
| `POST` | `/achievements/:id/verify` | Yes |
| `GET` | `/achievements/verification-required` | Yes |
| `GET` | `/me/verifications` | Yes |
| `GET` | `/me/witness-requests` | Yes |
| `POST` | `/verifications` | Yes |
| `GET` | `/verifications/:id` | Yes |
| `DELETE` | `/verifications/:id` | Yes |
| `POST` | `/verifications/:id/witness` | Yes |


### Achievements

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/achievements/categories` | Yes |
| `GET` | `/achievements/definitions` | Yes |
| `GET` | `/achievements/definitions/:key` | Yes |
| `GET` | `/hangouts/:id/achievements` | Yes |
| `GET` | `/me/achievements` | Yes |
| `GET` | `/me/achievements/summary` | Yes |
| `GET` | `/users/:id/achievements` | Yes |
| `GET` | `/users/:id/achievements/summary` | Yes |


### Community

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/admin-control/audit/credits` | Yes |
| `GET` | `/admin-control/users` | Yes |
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


### Admin-feedback

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/admin/feedback` | Yes |
| `GET` | `/admin/feedback/:id` | Yes |
| `PATCH` | `/admin/feedback/:id` | Yes |
| `POST` | `/admin/feedback/:id/cancel-autofix` | Yes |
| `POST` | `/admin/feedback/:id/confirm-bug` | Yes |
| `POST` | `/admin/feedback/:id/respond` | Yes |
| `GET` | `/admin/feedback/recent-activity` | Yes |
| `GET` | `/admin/feedback/stats` | Yes |


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


### Auth

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/auth/login` | No |
| `GET` | `/auth/me` | No |
| `GET` | `/auth/me/capabilities` | No |
| `POST` | `/auth/register` | No |
| `GET` | `/profile` | Yes |
| `PUT` | `/profile` | Yes |


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


### EconomyEnhanced

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/bonus-events/history` | Yes |
| `GET` | `/bonus-events/types` | Yes |
| `POST` | `/checkout/stripe` | Yes |
| `GET` | `/earn-events` | Yes |
| `POST` | `/earn-events/mark-seen` | Yes |
| `GET` | `/earn-events/recent` | Yes |
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


### Cohort-preferences

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/cohort-options` | Yes |
| `GET` | `/me/cohort-preferences` | Yes |
| `PATCH` | `/me/cohort-preferences` | Yes |
| `POST` | `/me/leaderboard-opt-in` | Yes |
| `POST` | `/me/leaderboard-opt-out` | Yes |


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


### Leaderboards

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/exercises/:id/metrics` | Yes |
| `GET` | `/hangouts/:id/leaderboard` | Yes |
| `GET` | `/leaderboards` | Yes |
| `GET` | `/leaderboards/global` | Yes |
| `GET` | `/leaderboards/metrics` | Yes |
| `GET` | `/me/rank` | Yes |
| `GET` | `/users/:id/rank` | Yes |
| `GET` | `/virtual-hangouts/:id/leaderboard` | Yes |


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


### Checkins

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/hangouts/:id/check-in` | Yes |
| `POST` | `/hangouts/:id/check-in/link-workout` | Yes |
| `GET` | `/hangouts/:id/check-ins/active` | Yes |
| `POST` | `/hangouts/:id/check-out` | Yes |
| `GET` | `/me/check-in` | Yes |
| `GET` | `/me/check-ins` | Yes |


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
| `GET` | `/martial-arts/disciplines` | Yes |
| `GET` | `/martial-arts/disciplines/:disciplineId` | Yes |
| `GET` | `/martial-arts/disciplines/:disciplineId/leaderboard` | Yes |
| `GET` | `/martial-arts/disciplines/:disciplineId/progress` | Yes |
| `GET` | `/martial-arts/disciplines/:disciplineId/techniques` | Yes |
| `GET` | `/martial-arts/history` | Yes |
| `POST` | `/martial-arts/master` | Yes |
| `POST` | `/martial-arts/practice` | Yes |
| `GET` | `/martial-arts/progress` | Yes |
| `GET` | `/martial-arts/techniques/:techniqueId` | Yes |
| `PUT` | `/martial-arts/techniques/:techniqueId/notes` | Yes |


### Mascot

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/mascot/companion/cosmetics/equip` | Yes |
| `POST` | `/mascot/companion/events/mark-reacted` | Yes |
| `GET` | `/mascot/companion/events/recent` | Yes |
| `PATCH` | `/mascot/companion/nickname` | Yes |
| `PATCH` | `/mascot/companion/settings` | Yes |
| `GET` | `/mascot/companion/state` | Yes |
| `GET` | `/mascot/companion/tips/next` | Yes |
| `GET` | `/mascot/companion/upgrades` | Yes |
| `POST` | `/mascot/companion/upgrades/:upgradeId/purchase` | Yes |
| `GET` | `/mascot/global/config` | Yes |
| `GET` | `/mascot/global/placements` | Yes |


### Nutrition

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/me/nutrition` | Yes |
| `POST` | `/me/nutrition/disable` | Yes |
| `POST` | `/me/nutrition/enable` | Yes |
| `POST` | `/me/nutrition/foods/custom` | Yes |
| `GET` | `/me/nutrition/foods/custom` | Yes |
| `DELETE` | `/me/nutrition/foods/custom/:id` | Yes |
| `GET` | `/me/nutrition/foods/frequent` | Yes |
| `GET` | `/me/nutrition/foods/recent` | Yes |
| `GET` | `/me/nutrition/goals` | Yes |
| `POST` | `/me/nutrition/goals/calculate` | Yes |
| `POST` | `/me/nutrition/hydration` | Yes |
| `GET` | `/me/nutrition/hydration` | Yes |
| `POST` | `/me/nutrition/meals` | Yes |
| `GET` | `/me/nutrition/meals` | Yes |
| `GET` | `/me/nutrition/meals/:id` | Yes |
| `PUT` | `/me/nutrition/meals/:id` | Yes |
| `DELETE` | `/me/nutrition/meals/:id` | Yes |
| `POST` | `/me/nutrition/meals/copy` | Yes |
| `GET` | `/me/nutrition/plans` | Yes |
| `POST` | `/me/nutrition/plans` | Yes |
| `GET` | `/me/nutrition/plans/:id` | Yes |
| `PUT` | `/me/nutrition/plans/:id` | Yes |
| `DELETE` | `/me/nutrition/plans/:id` | Yes |
| `POST` | `/me/nutrition/plans/:id/activate` | Yes |
| `POST` | `/me/nutrition/plans/:id/items` | Yes |
| `GET` | `/me/nutrition/plans/:id/items` | Yes |
| `POST` | `/me/nutrition/plans/:id/shopping-list` | Yes |
| `GET` | `/me/nutrition/plans/active` | Yes |
| `POST` | `/me/nutrition/plans/generate` | Yes |
| `PUT` | `/me/nutrition/plans/items/:itemId` | Yes |
| `DELETE` | `/me/nutrition/plans/items/:itemId` | Yes |
| `GET` | `/me/nutrition/preferences` | Yes |
| `PATCH` | `/me/nutrition/preferences` | Yes |
| `POST` | `/me/nutrition/recipes` | Yes |
| `GET` | `/me/nutrition/recipes` | Yes |
| `PUT` | `/me/nutrition/recipes/:id` | Yes |
| `DELETE` | `/me/nutrition/recipes/:id` | Yes |
| `POST` | `/me/nutrition/recipes/:id/rate` | Yes |
| `POST` | `/me/nutrition/recipes/:id/save` | Yes |
| `DELETE` | `/me/nutrition/recipes/:id/save` | Yes |
| `GET` | `/me/nutrition/recipes/saved` | Yes |
| `GET` | `/me/nutrition/streaks` | Yes |
| `GET` | `/me/nutrition/summary` | Yes |
| `GET` | `/me/nutrition/summary/range` | Yes |
| `GET` | `/nutrition/archetypes` | Yes |
| `GET` | `/nutrition/archetypes/:archetype` | Yes |
| `GET` | `/nutrition/foods/:id` | Yes |
| `GET` | `/nutrition/foods/barcode/:barcode` | Yes |
| `GET` | `/nutrition/foods/search` | Yes |
| `GET` | `/nutrition/recipes` | Yes |
| `GET` | `/nutrition/recipes/:id` | Yes |
| `GET` | `/nutrition/recipes/:id/ratings` | Yes |
| `GET` | `/nutrition/recipes/archetype/:archetype` | Yes |
| `GET` | `/nutrition/recipes/popular` | Yes |
| `GET` | `/nutrition/recipes/trending` | Yes |


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
| `POST` | `/skills/achieve` | Yes |
| `GET` | `/skills/history` | Yes |
| `GET` | `/skills/nodes/:nodeId` | Yes |
| `GET` | `/skills/nodes/:nodeId/leaderboard` | Yes |
| `PUT` | `/skills/nodes/:nodeId/notes` | Yes |
| `POST` | `/skills/practice` | Yes |
| `GET` | `/skills/progress` | Yes |
| `GET` | `/skills/trees` | Yes |
| `GET` | `/skills/trees/:treeId` | Yes |
| `GET` | `/skills/trees/:treeId/progress` | Yes |


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
