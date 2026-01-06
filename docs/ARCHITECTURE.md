# MuscleMap Architecture

> Auto-generated on 2026-01-06

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
├── data/
│   ├── musclemap.db
│   ├── musclemap.db-shm
│   └── musclemap.db-wal
├── docs/
│   ├── latex/
│   ├── API_REFERENCE.md
│   ├── ARCHITECTURE.md
│   ├── BIOMETRICS.md
│   ├── CONTRIBUTING.md
│   ├── DATA_FLOW.md
│   ├── DATA_MODEL.md
│   ├── EXTENSIBILITY.md
│   ├── FEATURES.md
│   ├── ICONS.md
│   ├── NATIVE_EXTENSIONS.md
│   ├── PLUGINS.md
│   ├── PRIVACY_POLICY.md
│   ├── REFACTOR_PLAN.md
│   ├── SECURITY.md
│   ├── texput.log
│   └── USER_GUIDE.md
├── e2e/
│   └── login.spec.ts
├── markdown/
│   ├── FINAL_AUDIT_REPORT.md
│   ├── MONETIZATION.md
│   ├── README.md
│   └── ROADMAP.md
├── native/
│   ├── src/
│   ├── index.ts
│   ├── Makefile
│   ├── package.json
│   └── tsconfig.json
├── packages/
│   ├── client/
│   ├── core/
│   ├── plugin-sdk/
│   ├── shared/
│   └── ui/
├── plugins/
│   ├── admin-tools/
│   └── leaderboard/
├── public/
│   ├── docs/
│   ├── docs-files/
│   ├── founding.html
│   ├── index.html
│   ├── landing-decal-1024w.png
│   ├── landing-decal-1024w.webp
│   ├── landing-decal-1600w.png
│   ├── landing-decal-1600w.webp
│   ├── landing-decal-2400w.png
│   ├── landing-decal-2400w.webp
│   ├── landing-decal-640w.png
│   ├── landing-decal-640w.webp
│   ├── logo.png
│   ├── logo.svg
│   ├── manifest.json
│   ├── MuscleMap-Landing-Page-Decal.svg
│   └── privacy-policy.md
├── script-runs/
│   ├── cleanup-archive-20251230_053335/
│   └── cleanup-archive-20251230_135318/
├── scripts/
│   ├── lib/
│   ├── utils/
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
│   ├── test.sh
│   └── tidy-root-js.sh
├── src/
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   ├── pages/
│   ├── store/
│   ├── styles/
│   ├── tests/
│   ├── utils/
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── audit_legacy_posix.sh
├── cron-jobs.js
├── deploy.sh
├── ecosystem.config.cjs
├── eslint.config.js
├── index.html
├── LICENSE
├── musclemap_exercises.json
├── new-path-exercises.json
├── package.json
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
| `@musclemap/core` | Shared domain types and utilities for MuscleMap |
| `@musclemap/plugin-sdk` | SDK for building MuscleMap plugins |
| `@musclemap/shared` | Shared utilities and constants for MuscleMap apps |
| `@musclemap/ui` | Shared cross-platform UI components for MuscleMap |

## Frontend Pages (34 total)

| Page | Protected | Description |
|------|-----------|-------------|
| AdminControl | No | AdminControl page |
| AdminIssues | Yes | Admin Issues Page  Admin dashboard for managing issues: - View all issues (including private) - Change status, priority, assignee - Bulk actions - Create dev updates - Manage roadmap / |
| CommunityDashboard | Yes | CommunityDashboard Page  Comprehensive community dashboard with: - Real-time activity feed - Geographic map view - Statistics dashboard - Monitoring panel (for mods/admins) - Privacy settings / |
| Competitions | No | Competitions page |
| Credits | No | Credits page |
| Dashboard | Yes | Dashboard - MuscleMap Liquid Glass Design  A comprehensive, modern dashboard using the liquid glass design system inspired by visionOS and iOS 18 spatial computing aesthetics |
| Design | No | Design Page  Showcases MuscleMap's design system with links to the interactive design system page |
| DesignSystem | No | Design System Showcase  Demonstrates the MuscleMap Liquid Glass design system components |
| DevUpdates | No | Dev Updates Page  Development updates, announcements, and changelog: - Release notes - Bug fixes - Feature announcements / |
| Docs | No | Docs page |
| Exercises | No | Exercises page |
| Features | No | Features Page  Showcases MuscleMap features with VGA-style graphics, charts, and bars |
| HighFives | No | HighFives page |
| IssueDetail | Yes | Issue Detail Page  Single issue view with: - Full issue details - Comments thread - Voting and subscription - Status history / |
| Issues | Yes | Issues Page  Bug and issue tracker with: - Issue listing with filters - Search functionality - Voting system - Status badges / |
| Journey | Yes | Journey page |
| Landing | No | Landing page |
| Locations | No | Locations page |
| Login | Yes | Login page |
| Messages | No | Messages page |
| MyIssues | Yes | My Issues Page  User's submitted issues: - View status of reported issues - Track responses / |
| NewIssue | Yes | New Issue Page  Create a new bug report, feature request, or other issue: - Form with validation - Auto-capture browser/device info - Screenshot upload - Label selection / |
| Onboarding | Yes | Onboarding page |
| Privacy | No | Privacy Policy Page  Required for App Store submission |
| Profile | Yes | Profile page |
| Progression | No | Progression page |
| Roadmap | No | Roadmap Page  Public roadmap showing: - Planned features - In progress work - Completed features - Voting on priorities / |
| Science | No | Science Page  Explains the science behind MuscleMap's Training Units and muscle activation system |
| Settings | No | Settings page |
| Signup | Yes | Signup page |
| SkinsStore | No | SkinsStore page |
| Technology | No | Technology Stack Page  Showcases MuscleMap's technology architecture with VGA-style graphics |
| Wallet | No | Wallet page |
| Workout | No | Workout page |

## Components (25 total)

Components are organized by feature:

### ErrorBoundary.jsx
- `ErrorBoundary`

### community
- `ActivityFeed`
- `CommunityMap`
- `MonitorPanel`
- `PrivacySettings`
- `StatsDashboard`

### glass
- `GlassButton`
- `GlassNav`
- `GlassProgress`
- `GlassSurface`
- `MeshBackground`
- `MuscleActivationCard`

### icons
- `Avatar`
- `FitnessIcons`
- `Icon`

### messaging
- `ConversationList`
- `MessageThread`
- `NewConversation`

### tips
- `DailyTip`
- `ExerciseTip`
- `MilestoneCard`
- `MilestoneProgress`
- `TipCard`
- `WorkoutComplete`

### xr
- `XRButton`

## API Endpoints (112 total)

| Method | Path | Handler |
|--------|------|---------|
| GET | `/__routes` | misc |
| GET | `/admin/issues` | issues |
| POST | `/admin/issues/bulk` | issues |
| GET | `/alternatives/low-impact` | misc |
| GET | `/alternatives/seated` | misc |
| GET | `/archetypes` | journey |
| GET | `/archetypes/:id/levels` | journey |
| POST | `/archetypes/select` | journey |
| POST | `/auth/login` | auth |
| GET | `/auth/me` | auth |
| GET | `/auth/me/capabilities` | auth |
| POST | `/auth/register` | auth |
| GET | `/community/feed` | community |
| GET | `/community/monitor` | community |
| GET | `/community/percentile` | community |
| GET | `/community/presence` | community |
| POST | `/community/presence` | community |
| GET | `/community/stats` | community |
| GET | `/community/ws` | community |
| GET | `/competitions` | misc |
| GET | `/competitions/:id` | misc |
| GET | `/credits/balance` | economy |
| GET | `/economy/actions` | economy |
| GET | `/economy/balance` | economy |
| POST | `/economy/charge` | economy |
| GET | `/economy/history` | economy |
| GET | `/economy/pricing` | economy |
| GET | `/economy/transactions` | economy |
| GET | `/economy/wallet` | economy |
| GET | `/entitlements` | misc |
| GET | `/exercises` | misc |
| GET | `/exercises/:id/activations` | misc |
| POST | `/hangouts` | hangouts |
| GET | `/hangouts/:id` | hangouts |
| POST | `/hangouts/:id/join` | hangouts |
| POST | `/hangouts/:id/leave` | hangouts |
| GET | `/hangouts/:id/members` | hangouts |
| POST | `/hangouts/:id/posts` | hangouts |
| GET | `/hangouts/:id/posts` | hangouts |
| GET | `/hangouts/nearby` | hangouts |
| GET | `/hangouts/stats` | hangouts |
| GET | `/hangouts/types` | hangouts |
| POST | `/highfives/send` | misc |
| GET | `/highfives/stats` | misc |
| GET | `/highfives/users` | misc |
| GET | `/i18n/languages` | misc |
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
| GET | `/locations/nearby` | misc |
| GET | `/me/entitlements` | misc |
| GET | `/me/hangouts` | hangouts |
| GET | `/me/issues` | issues |
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
| GET | `/muscles` | misc |
| GET | `/prescription/:id` | prescription |
| POST | `/prescription/generate` | prescription |
| GET | `/profile` | auth |
| PUT | `/profile` | auth |
| GET | `/progress/stats` | misc |
| GET | `/progression/achievements` | misc |
| GET | `/progression/leaderboard` | misc |
| GET | `/progression/mastery-levels` | misc |
| GET | `/roadmap` | issues |
| POST | `/roadmap` | issues |
| POST | `/roadmap/:id/vote` | issues |
| GET | `/settings` | misc |
| PATCH | `/settings` | misc |
| GET | `/settings/themes` | misc |
| GET | `/stats/history` | stats |
| GET | `/stats/info` | stats |
| GET | `/stats/leaderboards` | stats |
| GET | `/stats/leaderboards/me` | stats |
| GET | `/stats/me` | stats |
| GET | `/stats/profile/extended` | stats |
| PUT | `/stats/profile/extended` | stats |
| POST | `/stats/recalculate` | stats |
| GET | `/stats/user/:userId` | stats |
| GET | `/tips` | tips |
| POST | `/tips/:id/seen` | tips |
| POST | `/trace/frontend-log` | misc |
| GET | `/updates` | issues |
| POST | `/updates` | issues |
| POST | `/v1/prescription/generate` | prescription |
| POST | `/workout/complete` | workouts |
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
