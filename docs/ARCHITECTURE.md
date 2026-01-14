# MuscleMap Architecture

> Auto-generated on 2026-01-14

## Overview

MuscleMap is a cross-platform fitness tracking application with real-time muscle visualization. The architecture follows a modular, layered approach with clear separation of concerns.

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend Web** | React + Vite + TailwindCSS | Single-page application |
| **Frontend Mobile** | React Native + Expo | iOS & Android apps |
| **API Server** | Fastify + TypeScript | REST/GraphQL API |
| **Database** | PostgreSQL | Primary data store |
| **Cache** | Redis (optional) | Session/query caching |
| **Reverse Proxy** | Caddy | HTTPS termination |

## Directory Structure

```
musclemap.me/
├── apps/
│   ├── api/
│   └── mobile/
├── config/
│   ├── roadmap-overrides.yaml
│   └── route-atlas-overrides.yaml
├── data/
│   ├── reference/
│   ├── musclemap.db
│   ├── musclemap.db-shm
│   └── musclemap.db-wal
├── docs/
│   ├── analysis/
│   ├── business/
│   ├── images/
│   ├── latex/
│   ├── legacy-system/
│   ├── public/
│   ├── specs/
│   ├── API_REFERENCE.md
│   ├── ARCHITECTURE.md
│   ├── BIOMETRICS.md
│   ├── CONTRIBUTING.md
│   ├── CREDITS_ECONOMY.md
│   ├── DATA_FLOW.md
│   ├── DATA_MODEL.md
│   ├── EXTENSIBILITY.md
│   ├── FEATURES.md
│   ├── ICONS.md
│   ├── IMPLEMENTATION_PLAN_REMAINING.md
│   ├── IMPLEMENTATION_PLANS.md
│   ├── LOW-BANDWIDTH-OPTIMIZATION-PLAN.md
│   ├── mascot_system.md
│   ├── NATIVE_EXTENSIONS.md
│   ├── PLUGIN-DEVELOPMENT.md
│   ├── PLUGINS.md
│   ├── PRIVACY_POLICY.md
│   ├── RANKING_LEADERBOARD_SYSTEM_PLAN.md
│   ├── REFACTOR_PLAN.md
│   ├── SCALING-ARCHITECTURE-PLAN.md
│   ├── SECURITY.md
│   ├── SPA-UX-IMPROVEMENTS-PLAN.md
│   ├── STATE-MANAGEMENT.md
│   ├── TOUCHSCREEN_UX_AUDIT.md
│   ├── TOUCHSCREEN_UX_BEFORE_AFTER.md
│   ├── TOUCHSCREEN_UX_IMPLEMENTATION.md
│   ├── USER_GUIDE.md
│   └── VISUAL_ARCHITECTURE_MAPS.md
├── e2e/
│   └── login.spec.ts
├── markdown/
│   ├── FINAL_AUDIT_REPORT.md
│   ├── MONETIZATION.md
│   ├── README.md
│   └── ROADMAP.md
├── native/
│   ├── lib/
│   ├── src/
│   ├── index.js
│   ├── index.js.map
│   ├── index.ts
│   ├── Makefile
│   ├── package.json
│   └── tsconfig.json
├── packages/
│   ├── client/
│   ├── contracts/
│   ├── core/
│   ├── plugin-sdk/
│   ├── shared/
│   └── ui/
├── plugins/
│   ├── admin-tools/
│   ├── examples/
│   └── leaderboard/
├── public/
│   ├── atlases/
│   ├── docs/
│   ├── docs-files/
│   ├── illustrations/
│   ├── mascot/
│   ├── founding.html
│   ├── index.html
│   ├── logo-180.png
│   ├── logo-32.png
│   ├── logo-80.png
│   ├── logo-80.webp
│   ├── logo-optimized.png
│   ├── logo-original.png
│   ├── logo.png
│   ├── logo.svg
│   ├── logo.webp
│   ├── manifest.json
│   ├── MuscleMap-Landing-Page-Decal.svg
│   ├── offline.html
│   ├── privacy-policy.md
│   ├── robots.txt
│   ├── sitemap.xml
│   └── sw.js
├── script-runs/
├── scripts/
│   ├── lib/
│   ├── utils/
│   ├── backfill-ranks.ts
│   ├── deploy-branch.sh
│   ├── deploy.sh
│   ├── errors.sh
│   ├── generate-docs.cjs
│   ├── generate-icons.cjs
│   ├── logs.sh
│   ├── maintain.sh
│   ├── merge-all.sh
│   ├── prepare-app-store.cjs
│   ├── production-deploy.sh
│   ├── publish-app.sh
│   ├── README.md
│   ├── repo-cleanup.sh
│   ├── reset-devbox.sh
│   ├── split-repos.sh
│   ├── test.sh
│   └── tidy-root-js.sh
├── src/
│   ├── components/
│   ├── config/
│   ├── contexts/
│   ├── fixtures/
│   ├── graphql/
│   ├── hooks/
│   ├── lib/
│   ├── mocks/
│   ├── pages/
│   ├── plugins/
│   ├── store/
│   ├── styles/
│   ├── tests/
│   ├── utils/
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── audit_legacy_posix.sh
├── CLAUDE.md
├── cron-jobs.js
├── deploy.sh
├── ecosystem.config.cjs
├── eslint.config.js
├── index.html
├── JOURNEY_OVERHAUL_PLAN.md
├── LICENSE
├── lighthouserc.json
├── musclemap_exercises.json
├── new-path-exercises.json
├── package.json
├── PLAN.md
├── playwright.config.ts
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── postcss.config.js
├── README.md
├── tailwind.config.js
└── vite.config.js

```

## Packages

| Package | Description |
|---------|-------------|
| `@musclemap/client` | Shared client-side business logic for MuscleMap |
| `@musclemap/contracts` | Shared GraphQL schema and types for MuscleMap |
| `@musclemap/core` | Shared domain types and utilities for MuscleMap |
| `@musclemap/plugin-sdk` | SDK for building MuscleMap plugins |
| `@musclemap/shared` | Shared utilities and constants for MuscleMap apps |
| `@musclemap/ui` | Shared cross-platform UI components for MuscleMap |

## Frontend Pages (60 total)

| Page | Protected | Description |
|------|-----------|-------------|
| Achievements | No | Achievements page |
| AchievementVerification | No | AchievementVerification page |
| AdminControl | No | AdminControl page |
| AdminFraud | No | AdminFraud page |
| AdminIssues | Yes | Admin Issues Page  Admin dashboard for managing issues: - View all issues (including private) - Change status, priority, assignee - Bulk actions - Create dev updates - Manage roadmap / |
| AdminMetrics | Yes | Admin Metrics Dashboard  Beautiful visual dashboard for Prometheus metrics with: - Real-time gauges for connections and health - Time-series charts for request latency - Status indicators with animations - Auto-refresh every 10 seconds / |
| AdminMonitoring | Yes | Admin Monitoring Dashboard  Comprehensive system monitoring with: - Live API test runner - User journey viewer - Error tracking - System health metrics / |
| Buddy | No | Buddy page |
| CommunityBulletinBoard | No | Community Bulletin Board  A central hub for community contributions, plugin showcases, code snippets, ideas, and collaboration |
| CommunityDashboard | Yes | CommunityDashboard Page  Comprehensive community dashboard with: - Real-time activity feed - Geographic map view - Statistics dashboard - Monitoring panel (for mods/admins) - Privacy settings / |
| Competitions | No | Competitions page |
| ContributeIdeas | No | Contribute Ideas Page  A page showcasing ways to contribute to MuscleMap, with project improvement ideas and suggestions |
| Credits | No | Credits page |
| Crews | Yes | Crews Page  Crew management and Crew Wars tournament system for web |
| Dashboard | Yes | Dashboard - MuscleMap Liquid Glass Design  A comprehensive, modern dashboard using the liquid glass design system inspired by visionOS and iOS 18 spatial computing aesthetics |
| Design | No | Design Page  Showcases MuscleMap's design system with links to the interactive design system page |
| DesignSystem | No | Design System Showcase  Demonstrates the MuscleMap Liquid Glass design system components |
| DevUpdates | No | Dev Updates Page  Development updates, announcements, and changelog: - Release notes - Bug fixes - Feature announcements / |
| Docs | No | Docs page |
| EmpireControl | Yes | Empire Control - Master Admin Panel  The ultimate control center for the MuscleMap empire, integrating: - System metrics and monitoring dashboards - Community management and messaging - Owner avatar with unlimited powers - User and resource management - Slack integration - Real-time activity feeds / |
| Exercises | No | Exercises page |
| Features | No | Features Page  Showcases MuscleMap features with VGA-style graphics, charts, and bars |
| Goals | Yes | Goals Page - MuscleMap Liquid Glass Design  Goal-based training with targets, progress tracking, and milestones |
| Health | Yes | Health Page  Wearables integration and health data dashboard for web |
| HighFives | No | HighFives page |
| IssueDetail | Yes | Issue Detail Page  Single issue view with: - Full issue details - Comments thread - Voting and subscription - Status history / |
| Issues | Yes | Issues Page  Bug and issue tracker with: - Issue listing with filters - Search functionality - Voting system - Status badges / |
| Journey | No | Journey page |
| Landing | No | Landing page |
| Leaderboard | No | Leaderboard page |
| Limitations | Yes | Limitations Page - MuscleMap Liquid Glass Design  Manage physical limitations, disabilities, and exercise modifications |
| Locations | No | Locations page |
| Login | Yes | Login page |
| MartialArts | No | MartialArts page |
| Messages | No | Messages page |
| MyIssues | Yes | My Issues Page  User's submitted issues: - View status of reported issues - Track responses / |
| MyVerifications | No | MyVerifications page |
| NewIssue | No | New Issue Page  Create a new bug report, feature request, or other issue: - Form with validation - Auto-capture browser/device info - Screenshot upload - Label selection / |
| Onboarding | Yes | Onboarding page |
| PluginGuide | No | Plugin Development Guide  A visual, step-by-step guide for creating MuscleMap plugins with interactive diagrams and code examples |
| PluginMarketplace | No | PluginMarketplace - Browse and install community plugins  Features: - Browse available plugins - Search and filter - Install/uninstall plugins - View plugin details / |
| PluginSettings | No | PluginSettings - Manage installed plugins  Features: - View installed plugins - Enable/disable plugins - Configure plugin settings - Uninstall plugins - View plugin permissions / |
| Privacy | No | Privacy Policy Page  Required for App Store submission |
| Profile | No | Profile page |
| Progression | No | Progression page |
| PTTests | Yes | PT Tests Page - MuscleMap Liquid Glass Design  Physical fitness tests for military, first responders, and occupational training |
| Rivals | Yes | Rivals Page  1v1 rivalry competition system for web |
| Roadmap | No | Roadmap Page  Public roadmap showing: - Planned features - In progress work - Completed features - Voting on priorities / |
| Science | No | Science Page  Explains the science behind MuscleMap's Training Units and muscle activation system |
| Settings | No | Settings page |
| Signup | Yes | Signup page |
| Skills | No | Skills page |
| SkinsStore | No | SkinsStore page |
| Stats | Yes | Stats Page  Character stats display with radar chart visualization and leaderboards |
| Store | No | Store page |
| Technology | No | Technology Stack Page  Showcases MuscleMap's technology architecture with VGA-style graphics |
| TrainerDashboard | No | TrainerDashboard page |
| Wallet | No | Wallet page |
| WitnessAttestation | No | WitnessAttestation page |
| Workout | No | Workout page |

## Components (84 total)

Components are organized by feature:

### AdaptiveImage.jsx
- `AdaptiveImage`

### ErrorBoundary.jsx
- `ErrorBoundary`

### PrefetchLink.jsx
- `PrefetchLink`

### SEO.jsx
- `SEO`

### Toast
- `ToastProvider`

### atlas
- `AtlasCanvas`
- `AtlasControls`
- `AtlasLegend`
- `AtlasSearch`
- `AtlasTooltip`
- `RouteNode`
- `AtlasProvider`
- `ArchitectureAtlas`
- `DashboardAtlas`
- `DocsAtlas`
- `RoadmapAtlas`
- `RouteAtlas`

### community
- `ActivityFeed`
- `CommunityMap`
- `MonitorPanel`
- `PrivacySettings`
- `StatsDashboard`

### d3
- `D3Container`
- `BarChartD3`
- `ForceGraph`
- `MuscleMapD3`
- `ParticleField`
- `PieChartD3`
- `RadarChartD3`
- `RouteAtlasD3`
- `WorldMapD3`

### feedback
- `BugReportForm`
- `FeatureSuggestionForm`
- `FeedbackCenter`
- `GitHubStatsWidget`
- `OpenSourceBanner`
- `OpenSourceHero`

### glass
- `ActionCard`
- `GlassButton`
- `GlassNav`
- `GlassProgress`
- `GlassSurface`
- `MeshBackground`
- `MuscleActivationCard`
- `SwipeableCard`

### icons
- `Avatar`
- `FitnessIcons`
- `Icon`

### illustrations
- `BodyMuscleMap`
- `ExerciseIllustration`
- `MuscleDetailPopover`

### inputs
- `Stepper`

### landing
- `LiveCommunityStats`

### mascot
- `CompanionCharacter`
- `CompanionContext`
- `CompanionDock`
- `CompanionPanel`
- `CompanionProgress`
- `CompanionReaction`
- `GlobalMascot2D`
- `GlobalMascot3D`
- `GlobalMascotAbout`
- `GlobalMascotHero`
- `GlobalMascotLoader`

### messaging
- `ConversationList`
- `MessageThread`
- `NewConversation`

### ranks
- `RankBadge`
- `VeteranBadge`

### skeletons
- `AtlasSkeleton`
- `CardSkeleton`
- `ChartSkeleton`
- `JourneySkeleton`
- `ListSkeleton`
- `ProfileSkeleton`
- `TableSkeleton`
- `WorkoutSkeleton`

### tips
- `DailyTip`
- `ExerciseTip`
- `MilestoneCard`
- `MilestoneProgress`
- `TipCard`
- `WorkoutComplete`

### xr
- `XRButton`

## API Endpoints (467 total)

| Method | Path | Handler |
|--------|------|---------|
| GET | `/__routes` | misc |
| GET | `/achievements/:id/can-verify` | verifications |
| POST | `/achievements/:id/verify` | verifications |
| GET | `/achievements/categories` | achievements |
| GET | `/achievements/definitions` | achievements |
| GET | `/achievements/definitions/:key` | achievements |
| GET | `/achievements/verification-required` | verifications |
| POST | `/admin/abuse-check/:userId` | credits |
| POST | `/admin/credits/adjust` | credits |
| GET | `/admin/credits/audit` | credits |
| POST | `/admin/credits/reverse` | credits |
| GET | `/admin/disputes` | credits |
| POST | `/admin/disputes/:disputeId/messages` | credits |
| POST | `/admin/disputes/:disputeId/resolve` | credits |
| PATCH | `/admin/disputes/:disputeId/status` | credits |
| GET | `/admin/economy/metrics` | credits |
| GET | `/admin/escrow` | credits |
| POST | `/admin/escrow/:escrowId/refund` | credits |
| POST | `/admin/escrow/:escrowId/release` | credits |
| GET | `/admin/fraud-flags` | credits |
| POST | `/admin/fraud-flags` | credits |
| POST | `/admin/fraud-flags/:flagId/review` | credits |
| GET | `/admin/issues` | issues |
| POST | `/admin/issues/bulk` | issues |
| POST | `/admin/leaderboard-rewards/trigger` | credits |
| GET | `/admin/rate-limit-status/:userId` | credits |
| GET | `/admin/rate-limits` | credits |
| PUT | `/admin/rate-limits/:action` | credits |
| POST | `/admin/store/grant` | credits |
| POST | `/admin/store/revoke` | credits |
| PUT | `/admin/trainers/:userId/status` | trainers |
| GET | `/admin/trust/:userId` | credits |
| POST | `/admin/trust/:userId/override` | credits |
| DELETE | `/admin/trust/:userId/override` | credits |
| GET | `/admin/wallet/:userId` | credits |
| POST | `/admin/wallet/freeze` | credits |
| POST | `/admin/wallet/unfreeze` | credits |
| GET | `/alternatives/low-impact` | misc |
| GET | `/alternatives/seated` | misc |
| GET | `/archetype/suggested-communities` | archetype-communities |
| GET | `/archetypes` | journey |
| GET | `/archetypes/:id/levels` | journey |
| GET | `/archetypes/by-category/:categoryId` | pt-tests |
| GET | `/archetypes/categories` | pt-tests |
| GET | `/archetypes/communities` | archetype-communities |
| POST | `/archetypes/select` | journey |
| POST | `/auth/login` | auth |
| GET | `/auth/me` | auth |
| GET | `/auth/me/capabilities` | auth |
| POST | `/auth/register` | auth |
| GET | `/buddy` | credits |
| POST | `/buddy` | credits |
| POST | `/buddy/equip` | credits |
| GET | `/buddy/evolution/:species` | credits |
| GET | `/buddy/leaderboard` | credits |
| GET | `/buddy/matches` | social |
| PUT | `/buddy/nickname` | credits |
| GET | `/buddy/pairs` | social |
| GET | `/buddy/preferences` | social |
| PUT | `/buddy/preferences` | social |
| GET | `/buddy/requests` | social |
| PUT | `/buddy/settings` | credits |
| PUT | `/buddy/species` | credits |
| POST | `/buddy/unequip` | credits |
| POST | `/bulletin/comments/:commentId/vote` | bulletin |
| GET | `/bulletin/posts/:postId` | bulletin |
| GET | `/bulletin/posts/:postId/comments` | bulletin |
| POST | `/bulletin/posts/:postId/comments` | bulletin |
| POST | `/bulletin/posts/:postId/hide` | bulletin |
| POST | `/bulletin/posts/:postId/pin` | bulletin |
| POST | `/bulletin/posts/:postId/unhide` | bulletin |
| POST | `/bulletin/posts/:postId/unpin` | bulletin |
| POST | `/bulletin/posts/:postId/vote` | bulletin |
| GET | `/career/goals` | career |
| POST | `/career/goals` | career |
| GET | `/career/goals/:goalId/exercises` | career |
| PUT | `/career/goals/:id` | career |
| DELETE | `/career/goals/:id` | career |
| GET | `/career/readiness` | career |
| GET | `/career/readiness/:goalId` | career |
| POST | `/career/readiness/:goalId/refresh` | career |
| GET | `/career/recertifications` | career |
| POST | `/career/recertifications` | career |
| GET | `/career/standards` | career |
| GET | `/career/standards/:id` | career |
| GET | `/career/standards/categories` | career |
| GET | `/career/team/:hangoutId` | career |
| POST | `/career/team/:hangoutId/enable` | career |
| POST | `/career/team/:hangoutId/opt-in` | career |
| POST | `/classes` | trainers |
| GET | `/classes` | trainers |
| GET | `/classes/:classId` | trainers |
| PUT | `/classes/:classId` | trainers |
| POST | `/classes/:classId/attendance` | trainers |
| GET | `/classes/:classId/attendance` | trainers |
| POST | `/classes/:classId/cancel` | trainers |
| POST | `/classes/:classId/enroll` | trainers |
| GET | `/classes/:classId/enrollments` | trainers |
| POST | `/classes/:classId/unenroll` | trainers |
| GET | `/classes/browse` | credits |
| GET | `/cohort-options` | cohort-preferences |
| POST | `/communities` | communities |
| GET | `/communities` | communities |
| POST | `/communities/:id/events` | communities |
| GET | `/communities/:id/events` | communities |
| POST | `/communities/:id/join` | communities |
| POST | `/communities/:id/leave` | communities |
| GET | `/communities/:id/members` | communities |
| POST | `/communities/:id/members/:userId/approve` | communities |
| POST | `/communities/:id/members/:userId/reject` | communities |
| PATCH | `/communities/:id/members/:userId/role` | communities |
| GET | `/communities/:id/posts` | communities |
| POST | `/communities/:id/posts` | communities |
| GET | `/communities/:idOrSlug` | communities |
| GET | `/communities/my` | communities |
| GET | `/community/feed` | community |
| GET | `/community/monitor` | community |
| GET | `/community/percentile` | community |
| GET | `/community/presence` | community |
| POST | `/community/presence` | community |
| GET | `/community/stats` | community |
| GET | `/community/stats/public` | community |
| GET | `/community/ws` | community |
| GET | `/community/ws/public` | community |
| GET | `/competition/categories` | competition |
| GET | `/competition/categories/:id` | competition |
| GET | `/competition/categories/grouped` | competition |
| GET | `/competition/me` | competition |
| POST | `/competition/me` | competition |
| DELETE | `/competition/me` | competition |
| GET | `/competition/me/countdown` | competition |
| PUT | `/competition/me/phase` | competition |
| POST | `/competition/me/show-complete` | competition |
| POST | `/competition/me/weigh-in` | competition |
| GET | `/competition/me/weigh-ins` | competition |
| GET | `/competition/weak-points` | competition |
| GET | `/competitions` | misc |
| GET | `/competitions/:id` | misc |
| GET | `/credits/balance` | economy |
| GET | `/disputes` | credits |
| POST | `/disputes` | credits |
| GET | `/disputes/:disputeId` | credits |
| GET | `/disputes/:disputeId/messages` | credits |
| POST | `/disputes/:disputeId/messages` | credits |
| GET | `/earning/rules` | credits |
| GET | `/economy/actions` | economy |
| GET | `/economy/balance` | economy |
| POST | `/economy/charge` | economy |
| GET | `/economy/history` | economy |
| GET | `/economy/pricing` | economy |
| GET | `/economy/transactions` | economy |
| GET | `/economy/wallet` | economy |
| GET | `/entitlements` | misc |
| GET | `/equipment/categories` | equipment |
| GET | `/equipment/home` | equipment |
| PUT | `/equipment/home` | equipment |
| POST | `/equipment/home` | equipment |
| DELETE | `/equipment/home/:equipmentId` | equipment |
| GET | `/equipment/home/ids` | equipment |
| GET | `/equipment/types` | equipment |
| GET | `/equipment/types/:category` | equipment |
| GET | `/escrow` | credits |
| GET | `/escrow/:escrowId` | credits |
| GET | `/exercises` | misc |
| GET | `/exercises/:id/activations` | misc |
| GET | `/exercises/:id/illustration` | misc |
| GET | `/exercises/:id/metrics` | leaderboards |
| GET | `/friend-requests` | social |
| GET | `/friends` | social |
| GET | `/goals` | goals |
| POST | `/goals` | goals |
| GET | `/goals/:id` | goals |
| PUT | `/goals/:id` | goals |
| DELETE | `/goals/:id` | goals |
| POST | `/goals/:id/milestones` | goals |
| POST | `/goals/:id/progress` | goals |
| GET | `/goals/suggestions` | goals |
| POST | `/hangouts` | hangouts |
| GET | `/hangouts/:id` | hangouts |
| GET | `/hangouts/:id/achievements` | achievements |
| POST | `/hangouts/:id/check-in` | checkins |
| POST | `/hangouts/:id/check-in/link-workout` | checkins |
| GET | `/hangouts/:id/check-ins/active` | checkins |
| POST | `/hangouts/:id/check-out` | checkins |
| POST | `/hangouts/:id/join` | hangouts |
| GET | `/hangouts/:id/leaderboard` | leaderboards |
| POST | `/hangouts/:id/leave` | hangouts |
| GET | `/hangouts/:id/members` | hangouts |
| POST | `/hangouts/:id/posts` | hangouts |
| GET | `/hangouts/:id/posts` | hangouts |
| GET | `/hangouts/nearby` | hangouts |
| GET | `/hangouts/stats` | hangouts |
| GET | `/hangouts/types` | hangouts |
| GET | `/health` | health |
| GET | `/health/detailed` | health |
| GET | `/health/live` | health |
| GET | `/health/ready` | health |
| POST | `/highfives/send` | misc |
| GET | `/highfives/stats` | misc |
| GET | `/highfives/users` | misc |
| GET | `/i18n/languages` | misc |
| GET | `/identities` | identities |
| GET | `/identities/all-with-communities` | identities |
| GET | `/identities/categories` | identities |
| GET | `/identities/me` | identities |
| GET | `/identities/suggested-communities` | identities |
| GET | `/illustrations/bodies` | misc |
| GET | `/issues` | issues |
| POST | `/issues` | issues |
| GET | `/issues/:id` | issues |
| PATCH | `/issues/:id` | issues |
| GET | `/issues/:id/comments` | issues |
| POST | `/issues/:id/comments` | issues |
| POST | `/issues/:id/subscribe` | issues |
| POST | `/issues/:id/vote` | issues |
| POST | `/issues/:issueId/comments/:commentId/solution` | issues |
| GET | `/issues/labels` | issues |
| GET | `/issues/stats` | issues |
| GET | `/journey` | journey |
| GET | `/journey/progress` | journey |
| GET | `/journeys` | journeys |
| POST | `/journeys` | journeys |
| GET | `/journeys/:id` | journeys |
| PUT | `/journeys/:id` | journeys |
| DELETE | `/journeys/:id` | journeys |
| POST | `/journeys/:id/milestones` | journeys |
| POST | `/journeys/:id/progress` | journeys |
| GET | `/journeys/categories` | journeys |
| GET | `/journeys/categories/:categoryId` | journeys |
| GET | `/journeys/featured` | journeys |
| POST | `/journeys/start` | journeys |
| GET | `/journeys/suggestions` | journeys |
| GET | `/journeys/templates` | journeys |
| GET | `/journeys/templates/:templateId` | journeys |
| GET | `/leaderboards` | leaderboards |
| GET | `/leaderboards/global` | leaderboards |
| GET | `/leaderboards/metrics` | leaderboards |
| GET | `/limitations` | limitations |
| POST | `/limitations` | limitations |
| PUT | `/limitations/:id` | limitations |
| DELETE | `/limitations/:id` | limitations |
| GET | `/limitations/body-regions` | limitations |
| POST | `/limitations/check-workout` | limitations |
| GET | `/limitations/substitutions/:exerciseId` | limitations |
| GET | `/locations/:id/equipment` | equipment |
| POST | `/locations/:id/equipment` | equipment |
| GET | `/locations/:id/equipment/my-reports` | equipment |
| GET | `/locations/:id/equipment/verified` | equipment |
| GET | `/locations/nearby` | misc |
| GET | `/martial-arts/disciplines` | martial-arts |
| GET | `/martial-arts/disciplines/:disciplineId` | martial-arts |
| GET | `/martial-arts/disciplines/:disciplineId/leaderboard` | martial-arts |
| GET | `/martial-arts/disciplines/:disciplineId/progress` | martial-arts |
| GET | `/martial-arts/disciplines/:disciplineId/techniques` | martial-arts |
| GET | `/martial-arts/history` | martial-arts |
| POST | `/martial-arts/master` | martial-arts |
| POST | `/martial-arts/practice` | martial-arts |
| GET | `/martial-arts/progress` | martial-arts |
| GET | `/martial-arts/techniques/:techniqueId` | martial-arts |
| PUT | `/martial-arts/techniques/:techniqueId/notes` | martial-arts |
| POST | `/mascot/companion/cosmetics/equip` | mascot |
| POST | `/mascot/companion/events/mark-reacted` | mascot |
| GET | `/mascot/companion/events/recent` | mascot |
| PATCH | `/mascot/companion/nickname` | mascot |
| PATCH | `/mascot/companion/settings` | mascot |
| GET | `/mascot/companion/state` | mascot |
| GET | `/mascot/companion/tips/next` | mascot |
| GET | `/mascot/companion/upgrades` | mascot |
| POST | `/mascot/companion/upgrades/:upgradeId/purchase` | mascot |
| GET | `/mascot/global/config` | mascot |
| GET | `/mascot/global/placements` | mascot |
| GET | `/me/achievements` | achievements |
| GET | `/me/achievements/summary` | achievements |
| GET | `/me/check-in` | checkins |
| GET | `/me/check-ins` | checkins |
| GET | `/me/cohort-preferences` | cohort-preferences |
| PATCH | `/me/cohort-preferences` | cohort-preferences |
| GET | `/me/enrollments` | trainers |
| GET | `/me/entitlements` | misc |
| GET | `/me/hangouts` | hangouts |
| GET | `/me/issues` | issues |
| POST | `/me/leaderboard-opt-in` | cohort-preferences |
| POST | `/me/leaderboard-opt-out` | cohort-preferences |
| GET | `/me/rank` | leaderboards |
| GET | `/me/verifications` | verifications |
| GET | `/me/witness-requests` | verifications |
| PUT | `/mentor/profile` | mentorship |
| GET | `/mentors` | mentorship |
| GET | `/mentorship/requests` | mentorship |
| GET | `/mentorships/active` | mentorship |
| GET | `/mentorships/history` | mentorship |
| POST | `/messaging/block/:userId` | messaging |
| DELETE | `/messaging/block/:userId` | messaging |
| GET | `/messaging/conversations` | messaging |
| POST | `/messaging/conversations` | messaging |
| GET | `/messaging/conversations/:id/messages` | messaging |
| POST | `/messaging/conversations/:id/messages` | messaging |
| POST | `/messaging/conversations/:id/read` | messaging |
| DELETE | `/messaging/messages/:id` | messaging |
| GET | `/messaging/ws` | messaging |
| GET | `/milestones` | tips |
| POST | `/milestones/:id/claim` | tips |
| POST | `/milestones/:id/progress` | tips |
| GET | `/modules` | modules |
| GET | `/modules/:id` | modules |
| POST | `/modules/:id/waitlist` | modules |
| DELETE | `/modules/:id/waitlist` | modules |
| GET | `/modules/coming-soon` | modules |
| GET | `/modules/waitlist/me` | modules |
| GET | `/monitoring/dashboard` | monitoring |
| GET | `/monitoring/errors` | monitoring |
| POST | `/monitoring/errors/:id/resolve` | monitoring |
| POST | `/monitoring/errors/track` | monitoring |
| GET | `/monitoring/health` | monitoring |
| POST | `/monitoring/journey/end` | monitoring |
| POST | `/monitoring/journey/error` | monitoring |
| POST | `/monitoring/journey/start` | monitoring |
| POST | `/monitoring/journey/step` | monitoring |
| GET | `/monitoring/journeys` | monitoring |
| GET | `/monitoring/ping` | monitoring |
| GET | `/monitoring/tests/definitions` | monitoring |
| GET | `/monitoring/tests/history` | monitoring |
| POST | `/monitoring/tests/run` | monitoring |
| GET | `/muscles` | misc |
| GET | `/muscles/:id` | misc |
| POST | `/onboarding/back` | onboarding |
| POST | `/onboarding/complete` | onboarding |
| POST | `/onboarding/home-equipment` | onboarding |
| GET | `/onboarding/injury-regions` | onboarding |
| GET | `/onboarding/intents` | onboarding |
| GET | `/onboarding/profile` | onboarding |
| POST | `/onboarding/profile` | onboarding |
| POST | `/onboarding/skip` | onboarding |
| POST | `/onboarding/start` | onboarding |
| GET | `/onboarding/state` | onboarding |
| DELETE | `/onboarding/state` | onboarding |
| GET | `/onboarding/status` | onboarding |
| POST | `/onboarding/step` | onboarding |
| GET | `/onboarding/steps` | onboarding |
| GET | `/personalization/context` | personalization |
| POST | `/personalization/exercise-check` | personalization |
| GET | `/personalization/plan` | personalization |
| GET | `/personalization/recommendations` | personalization |
| GET | `/personalization/summary` | personalization |
| GET | `/prescription/:id` | prescription |
| POST | `/prescription/generate` | prescription |
| GET | `/privacy` | privacy |
| PUT | `/privacy` | privacy |
| POST | `/privacy/disable-minimalist` | privacy |
| POST | `/privacy/enable-minimalist` | privacy |
| GET | `/privacy/summary` | privacy |
| GET | `/profile` | auth |
| PUT | `/profile` | auth |
| GET | `/progress/stats` | misc |
| GET | `/progression/achievements` | misc |
| GET | `/progression/leaderboard` | misc |
| GET | `/progression/mastery-levels` | misc |
| GET | `/pt-tests` | pt-tests |
| GET | `/pt-tests/:id` | pt-tests |
| GET | `/pt-tests/leaderboard/:testId` | pt-tests |
| GET | `/pt-tests/my-archetype` | pt-tests |
| POST | `/pt-tests/results` | pt-tests |
| GET | `/pt-tests/results` | pt-tests |
| GET | `/pt-tests/results/:id` | pt-tests |
| GET | `/ranks/definitions` | ranks |
| GET | `/ranks/history` | ranks |
| GET | `/ranks/leaderboard` | ranks |
| GET | `/ranks/me` | ranks |
| POST | `/ranks/refresh` | ranks |
| POST | `/ranks/update-veterans` | ranks |
| GET | `/ranks/user/:userId` | ranks |
| GET | `/ranks/veteran-badge` | ranks |
| GET | `/reports` | content-reports |
| GET | `/reports/my` | content-reports |
| GET | `/reports/stats` | content-reports |
| GET | `/resources/most-helpful` | community-resources |
| GET | `/roadmap` | issues |
| POST | `/roadmap` | issues |
| POST | `/roadmap/:id/vote` | issues |
| GET | `/settings` | misc |
| PATCH | `/settings` | misc |
| GET | `/settings/themes` | misc |
| GET | `/skill-milestones` | milestones |
| GET | `/skill-milestones/:id` | milestones |
| GET | `/skill-milestones/categories` | milestones |
| GET | `/skill-milestones/categories/:category` | milestones |
| GET | `/skill-milestones/featured` | milestones |
| GET | `/skill-milestones/me` | milestones |
| DELETE | `/skill-milestones/me/:userMilestoneId` | milestones |
| GET | `/skill-milestones/me/:userMilestoneId/attempts` | milestones |
| POST | `/skill-milestones/me/:userMilestoneId/log` | milestones |
| PUT | `/skill-milestones/me/:userMilestoneId/pause` | milestones |
| PUT | `/skill-milestones/me/:userMilestoneId/progress` | milestones |
| POST | `/skill-milestones/start` | milestones |
| POST | `/skills/achieve` | skills |
| GET | `/skills/history` | skills |
| GET | `/skills/nodes/:nodeId` | skills |
| GET | `/skills/nodes/:nodeId/leaderboard` | skills |
| PUT | `/skills/nodes/:nodeId/notes` | skills |
| POST | `/skills/practice` | skills |
| GET | `/skills/progress` | skills |
| GET | `/skills/trees` | skills |
| GET | `/skills/trees/:treeId` | skills |
| GET | `/skills/trees/:treeId/progress` | skills |
| GET | `/stats/history` | stats |
| GET | `/stats/info` | stats |
| GET | `/stats/leaderboards` | stats |
| GET | `/stats/leaderboards/me` | stats |
| GET | `/stats/me` | stats |
| GET | `/stats/profile/extended` | stats |
| PUT | `/stats/profile/extended` | stats |
| POST | `/stats/recalculate` | stats |
| GET | `/stats/user/:userId` | stats |
| GET | `/store/categories` | credits |
| GET | `/store/featured` | credits |
| GET | `/store/inventory` | credits |
| GET | `/store/items` | credits |
| GET | `/store/items/:sku` | credits |
| GET | `/store/owns/:sku` | credits |
| POST | `/store/purchase` | credits |
| GET | `/tips` | tips |
| POST | `/tips/:id/seen` | tips |
| POST | `/trace/frontend-log` | misc |
| GET | `/trainers` | trainers |
| GET | `/trainers/:userId` | trainers |
| GET | `/trainers/me` | trainers |
| GET | `/trainers/me/classes` | trainers |
| PUT | `/trainers/me/status` | trainers |
| POST | `/trainers/profile` | trainers |
| GET | `/trust` | credits |
| GET | `/trust/tiers` | credits |
| GET | `/updates` | issues |
| POST | `/updates` | issues |
| GET | `/users/:id/achievements` | achievements |
| GET | `/users/:id/achievements/summary` | achievements |
| GET | `/users/:id/rank` | leaderboards |
| POST | `/v1/prescription/generate` | prescription |
| POST | `/verifications` | verifications |
| GET | `/verifications/:id` | verifications |
| DELETE | `/verifications/:id` | verifications |
| POST | `/verifications/:id/witness` | verifications |
| GET | `/virtual-hangouts` | virtual-hangouts |
| GET | `/virtual-hangouts/:id` | virtual-hangouts |
| GET | `/virtual-hangouts/:id/activity` | virtual-hangouts |
| POST | `/virtual-hangouts/:id/heartbeat` | virtual-hangouts |
| POST | `/virtual-hangouts/:id/join` | virtual-hangouts |
| GET | `/virtual-hangouts/:id/leaderboard` | leaderboards |
| POST | `/virtual-hangouts/:id/leave` | virtual-hangouts |
| GET | `/virtual-hangouts/:id/members` | virtual-hangouts |
| PATCH | `/virtual-hangouts/:id/membership` | virtual-hangouts |
| GET | `/virtual-hangouts/:id/posts` | virtual-hangouts |
| POST | `/virtual-hangouts/:id/posts` | virtual-hangouts |
| POST | `/virtual-hangouts/:id/share-workout` | virtual-hangouts |
| GET | `/virtual-hangouts/my` | virtual-hangouts |
| GET | `/virtual-hangouts/recommended` | virtual-hangouts |
| GET | `/virtual-hangouts/themes` | virtual-hangouts |
| GET | `/wallet` | credits |
| GET | `/wallet/earnings` | credits |
| GET | `/wallet/transactions` | credits |
| POST | `/wallet/transfer` | credits |
| GET | `/wallet/transfers` | credits |
| POST | `/workouts` | workouts |
| GET | `/workouts/:id` | workouts |
| GET | `/workouts/me` | workouts |
| GET | `/workouts/me/muscles` | workouts |
| GET | `/workouts/me/stats` | workouts |
| POST | `/workouts/preview` | workouts |

## Scripts

| Script | Description |
|--------|-------------|
| `deploy-branch.sh` | # deploy-branch.sh - Full deployment: commit, push, PR, merge, and deploy to production |
| `deploy.sh` | Deployment helper for MuscleMap |
| `errors.sh` | errors.sh |
| `generate-docs.cjs` | MuscleMap Documentation Generator  Analyzes the codebase and regenerates all documentation to reflect the current state of the project.  Outputs: - Markdown files (for GitHub/web) - LaTeX files (for professional documentation/PDFs)  Usage: node scripts/generate-docs.cjs           # Generate all docs node scripts/generate-docs.cjs --latex   # LaTeX only node scripts/generate-docs.cjs --md      # Markdown only pnpm docs:generate  What it does: 1. Scans the codebase structure 2. Extracts API endpoints from route files 3. Identifies features from page components 4. Updates all documentation files (MD + LaTeX) / |
| `generate-icons.cjs` | App Icon Generator for MuscleMap Mobile App  Generates all required app icons for iOS and Android from a source image. Uses sharp for image processing (cross-platform, fast).  Usage: pnpm generate:icons [source-image]  If no source image is provided, uses apps/mobile/assets/icon-source.png or falls back to apps/mobile/assets/icon.png  Requirements: - Source image should be at least 1024x1024 pixels - PNG format recommended for best quality / |
| `logs.sh` | Unified Log Viewer for MuscleMap |
| `maintain.sh` | --- preflight --- |
| `merge-all.sh` | # merge-all.sh - Merge all worktree branches into main |
| `prepare-app-store.cjs` | MuscleMap App Store Preparation Script  Automates everything needed for App Store submission: - Generates all app icons (iOS + Android) - Creates App Store metadata JSON - Generates screenshot templates - Creates store listing text  Usage: node scripts/prepare-app-store.cjs pnpm prepare:appstore / |
| `production-deploy.sh` | # production-deploy.sh - Deploy script for MuscleMap production server |
| `publish-app.sh` | # MuscleMap App Publishing Script |
| `repo-cleanup.sh` | If caller sets DRY_RUN/APPLY explicitly, we do not prompt. |
| `reset-devbox.sh` | ---- toggles (set by menu) ---- |
| `split-repos.sh` | ============================================================================= |
| `test.sh` | Create a competition to get an ID (avoid hardcoded /1) |
| `tidy-root-js.sh` | Collect file basenames referenced by systemd units + pm2 dump |

## Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Caddy     │────▶│   Fastify   │
│  (React)    │◀────│   (HTTPS)   │◀────│   (API)     │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
                                        ┌─────────────┐
                                        │ PostgreSQL  │
                                        │  (Data)     │
                                        └─────────────┘
```

## Key Architectural Decisions

1. **Single Source of Truth**: PostgreSQL is the only data store
2. **Fastify over Express**: Better performance and TypeScript support
3. **Caddy over Nginx**: Automatic HTTPS, simpler configuration
4. **No Docker**: Direct deployment on VPS for simplicity
5. **Monorepo**: All packages in one repository with pnpm workspaces

## Build Order

```bash
pnpm build:packages  # shared → core → plugin-sdk → client → ui
pnpm build:api       # API server
pnpm build           # Frontend (Vite)
```

## Deployment

```bash
./deploy.sh "commit message"  # Full deployment to VPS
```

See `scripts/README.md` for detailed deployment instructions.
