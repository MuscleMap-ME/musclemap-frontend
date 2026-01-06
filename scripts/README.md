# MuscleMap Scripts & Claude Developer Guide

## Hello, Claude!

Welcome to **MuscleMap** - a cross-platform fitness tracking application that visualizes muscle activation in real-time. You are the AI developer responsible for implementing features, fixing bugs, and deploying changes across our multi-environment infrastructure.

**Live Production Site:** https://musclemap.me/
**GitHub Repository:** https://github.com/jeanpaulniko/musclemap

---

## Your Mission

1. **Plan** features before implementing them (use TodoWrite tool)
2. **Implement** changes in git worktrees (isolated development environments)
3. **Merge** all worktree branches into main using `./scripts/merge-all.sh`
4. **Deploy** across all environments using `./deploy.sh`
5. **Verify** the deployment is working at https://musclemap.me/

---

## Project Vision & Architecture

### The MuscleMap Vision

MuscleMap is a **universal fitness platform** built on these core principles:

- **Single Source of Truth**: PostgreSQL database is the only source of truth
- **GraphQL Data Stream**: All data flows through a single GraphQL API endpoint over encrypted SSL
- **Cross-Platform via React**: One codebase serves web (React + Vite) and mobile (React Native + Expo) - works on any browser, any device
- **Clients Only Render**: Frontend apps are pure presentation layers - they receive state from the API and render it
- **No Docker, No SQLite, No Express, No Nginx**: We use Fastify for the API, PostgreSQL for data, and Caddy for reverse proxy
- **Extensible**: Plugin architecture for third-party fitness device integrations
- **Biometric Integration**: Apple Watch, HealthKit, Garmin, Fitbit data via the API

### Design Aesthetic

- **Colors:** Electric blue (#0066FF), deep blacks, white accents
- **Typography:** Bebas Neue (headings), Inter (body), JetBrains Mono (code)
- **UI Style:** Glassmorphism, subtle gradients, 3D muscle visualizations
- **Animations:** Smooth, physics-based, performance-optimized
- **Mobile:** Native feel with haptic feedback

### Technical Design

- **We are a LaTeX first shop. Use it liberally for our documentation and generation

### Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Frontend Web** | React + Vite + TailwindCSS + Three.js | Runs in any browser |
| **Mobile** | React Native + Expo | Same React codebase, native performance |
| **VisionOS** | SwiftUI + RealityKit | Spatial computing (planned) |
| **API Server** | Fastify (Node.js) + TypeScript | NOT Express |
| **Data Transport** | GraphQL over SSL | Single endpoint, efficient queries |
| **Database** | PostgreSQL | NOT SQLite - this is the only data store |
| **Cache** | Redis (optional) | For performance, not required |
| **Reverse Proxy** | Caddy | NOT Nginx - automatic HTTPS |
| **Hosting** | Linux VPS | No Docker, no containers |

**What We DON'T Use:**
- ❌ Express (we use Fastify)
- ❌ Nginx (we use Caddy)
- ❌ SQLite (we use PostgreSQL)
- ❌ Docker (direct deployment on VPS)

### Directory Structure

```
musclemap.me/
├── apps/
│   ├── api/           # Fastify API server (TypeScript)
│   └── mobile/        # React Native + Expo app
├── packages/
│   ├── client/        # API client SDK for all platforms
│   ├── core/          # Shared business logic
│   ├── shared/        # Types and utilities
│   ├── plugin-sdk/    # Plugin development kit
│   └── ui/            # Shared UI components (Tamagui)
├── native/            # C native modules (geohash, rate limiter)
├── scripts/           # Automation scripts (YOU ARE HERE)
├── docs/              # Architecture documentation
├── src/               # React web frontend
└── public/            # Static assets
```

---

## Development Workflow

### Step 1: Understand the Task

Read relevant documentation:
- `docs/ARCHITECTURE.md` - System architecture
- `docs/API_REFERENCE.md` - API endpoints
- `docs/DATA_MODEL.md` - Database schema
- `docs/PLUGINS.md` - Plugin system
- `docs/BIOMETRICS.md` - Health data integration

### Step 2: Work in a Worktree

Claude Code creates isolated git worktrees for each conversation:
```
~/.claude-worktrees/musclemap.me/<worktree-name>/
```

Your changes are isolated from main until you merge. This allows parallel development.

### Step 3: Make Changes

1. Use TodoWrite to track your progress
2. Edit code in the worktree
3. Run `pnpm typecheck` to verify no TypeScript errors
4. Commit your changes frequently

### Step 4: Regenerate Documentation

**IMPORTANT:** After any feature addition, technology change, or significant code modification, regenerate the documentation:

```bash
# Regenerate all docs (Markdown + LaTeX)
pnpm docs:generate

# Compile LaTeX to PDF
cd docs/latex && make all
```

This updates:
- `docs/ARCHITECTURE.md` - System architecture
- `docs/API_REFERENCE.md` - API endpoints
- `docs/FEATURES.md` - Feature documentation
- `README.md` - Project readme
- `docs/latex/*.pdf` - Professional PDF documentation

The documentation generator scans the codebase and auto-generates docs reflecting:
- All pages and routes
- API endpoints
- Package structure
- Available scripts

**When to regenerate:**
- After adding new pages/routes
- After adding new API endpoints
- After adding/removing packages
- After adding new scripts
- After any architectural changes
- Before major releases or deployments

### Step 5: Merge & Deploy

Use these scripts in order:

```bash
# 1. Merge all worktree branches into main
./scripts/merge-all.sh

# 2. Deploy everything to VPS
./deploy.sh "Your commit message"

# 3. Run database migrations if needed
ssh root@musclemap.me "cd /var/www/musclemap.me/apps/api && pnpm db:migrate"

# 4. Restart API if needed
ssh root@musclemap.me "pm2 restart musclemap-api"
```

---

## Scripts Reference

### Primary Scripts

#### `merge-all.sh` - Merge Worktree Branches
Collects all changes from git worktrees and merges them into main.

```bash
./scripts/merge-all.sh              # Interactive mode
./scripts/merge-all.sh --auto       # Auto-merge without prompts
./scripts/merge-all.sh --list       # List branches only
./scripts/merge-all.sh --dry-run    # Preview what would happen
```

#### `deploy.sh` (root) - Full Deployment
Commits, pushes, and deploys to VPS with full rebuild.

```bash
./deploy.sh "Commit message"
```

What it does:
1. Commits changes in current directory
2. Pushes to GitHub
3. Updates all worktrees
4. SSHs to VPS and pulls latest code
5. Rebuilds all packages and frontend

#### `production-deploy.sh` - VPS-Side Deployment
Run directly on the VPS for manual deployments:

```bash
./scripts/production-deploy.sh           # Full deployment
./scripts/production-deploy.sh --quick   # Skip tests
./scripts/production-deploy.sh --pull    # Just pull, no restart
```

### Utility Scripts

#### `deploy-branch.sh` - Branch-Based Deployment
```bash
./scripts/deploy-branch.sh                    # Standard deploy
./scripts/deploy-branch.sh --deploy --skip-tests  # Quick deploy
./scripts/deploy-branch.sh --auto-merge       # Auto-merge to main
```

#### `generate-icons.cjs` - App Icon Generation
```bash
node scripts/generate-icons.cjs
```

#### `generate-docs.cjs` - Documentation Generator
Regenerates all documentation from codebase analysis.
```bash
pnpm docs:generate          # Generate all (Markdown + LaTeX)
pnpm docs:md                # Markdown only
pnpm docs:latex             # LaTeX only

# Compile LaTeX to PDF
cd docs/latex && make all   # Build all PDFs
cd docs/latex && make clean # Remove temp files
```

#### `prepare-app-store.cjs` - App Store Assets
Generates icons, screenshots, and metadata for iOS/Android submission.
```bash
pnpm prepare:appstore
```

#### `publish-app.sh` - Mobile App Publishing
Build and submit to App Store / Play Store.
```bash
./scripts/publish-app.sh ios        # Submit to App Store
./scripts/publish-app.sh android    # Submit to Play Store
./scripts/publish-app.sh both       # Submit to both
./scripts/publish-app.sh build-only # Build without submitting
```

#### `maintain.sh` - Interactive Maintenance Menu
```bash
./scripts/maintain.sh
```

#### `repo-cleanup.sh` - Clean Build Artifacts
```bash
DRY_RUN=1 ./scripts/repo-cleanup.sh  # Preview
./scripts/repo-cleanup.sh            # Execute
```

---

## Remote Server Commands

### SSH to VPS
```bash
ssh root@musclemap.me
# Or with IP: ssh root@72.62.83.202
```

### Common Remote Commands

```bash
# Check API status
ssh root@musclemap.me "pm2 status"

# View API logs (last 50 lines)
ssh root@musclemap.me "pm2 logs musclemap-api --lines 50 --nostream"

# Follow API logs live
ssh root@musclemap.me "pm2 logs musclemap-api"

# Restart API
ssh root@musclemap.me "pm2 restart musclemap-api"

# Run database migration
ssh root@musclemap.me "cd /var/www/musclemap.me/apps/api && pnpm db:migrate"

# Rebuild API
ssh root@musclemap.me "cd /var/www/musclemap.me && pnpm build:api"

# Full rebuild
ssh root@musclemap.me "cd /var/www/musclemap.me && pnpm build:packages && pnpm build:api && pnpm build"

# Check disk space
ssh root@musclemap.me "df -h"

# Check memory
ssh root@musclemap.me "free -m"

# Check running processes
ssh root@musclemap.me "htop" # (interactive)
```

### Pattern for Remote Commands
```bash
ssh root@musclemap.me "cd /var/www/musclemap.me && <command>"
```

Chain multiple commands:
```bash
ssh root@musclemap.me "cd /var/www/musclemap.me && git pull && pnpm install && pnpm build"
```

---

## Common Issues & Solutions

### Issue: API won't start - "Cannot find module '../../../native'"

**Cause:** The native module path is incorrect or not built.

**Solution:**
```bash
# Build native module on VPS
ssh root@musclemap.me "cd /var/www/musclemap.me/native && pnpm add -D typescript @types/node && pnpm build"

# Rebuild API and restart
ssh root@musclemap.me "cd /var/www/musclemap.me && pnpm build:api && pm2 restart musclemap-api"
```

### Issue: TypeScript errors in hangouts/geo services

**Cause:** The hangouts feature has incomplete TypeScript types.

**Temporary Solution:** Comment out broken imports in `server.ts` or remove files:
```bash
ssh root@musclemap.me "cd /var/www/musclemap.me/apps/api/src && rm -f http/routes/hangouts.ts middleware/security.ts services/geo.service.ts services/hangout.service.ts"
```

### Issue: Database migration fails

**Cause:** Missing environment variables or database connection.

**Solution:**
1. Ensure `.env` file exists in `apps/api/`
2. Check DATABASE_URL or PG* variables are set
3. Run migration:
```bash
ssh root@musclemap.me "cd /var/www/musclemap.me/apps/api && pnpm db:migrate"
```

### Issue: PM2 process keeps crashing

**Check logs:**
```bash
ssh root@musclemap.me "pm2 logs musclemap-api --lines 100 --nostream"
```

**Common fixes:**
```bash
# Rebuild
ssh root@musclemap.me "cd /var/www/musclemap.me && pnpm build:api"

# Clean restart
ssh root@musclemap.me "pm2 delete musclemap-api; cd /var/www/musclemap.me/apps/api && pm2 start dist/index.js --name musclemap-api"
```

### Issue: Merge conflicts

**Solution:**
1. Resolve conflicts in the worktree
2. Commit the resolution
3. Re-run merge script

Or manually:
```bash
cd /Users/jeanpaulniko/Public/musclemap.me
git checkout main
git merge origin/<branch-name>
# Resolve conflicts in editor
git add .
git commit -m "Resolve merge conflicts"
```

### Issue: Redis connection errors (non-critical)

Redis is optional. The API works without it but with degraded caching.

**To ignore:** Set `REDIS_ENABLED=false` in `.env`

**To fix:**
```bash
ssh root@musclemap.me "apt install redis-server && systemctl start redis"
```

---

## Build Order

When rebuilding everything, follow this order:

```bash
# 1. Shared packages (dependencies for others)
pnpm -C packages/shared build

# 2. Core business logic
pnpm -C packages/core build

# 3. Plugin SDK
pnpm -C packages/plugin-sdk build

# 4. API client
pnpm -C packages/client build

# 5. UI components
pnpm -C packages/ui build

# 6. API server
pnpm -C apps/api build

# 7. Frontend (Vite)
pnpm build
```

Or use convenience scripts:
```bash
pnpm build:packages && pnpm build:api && pnpm build
# Or
pnpm build:all
```

---

## Database Operations

### Run Migrations
```bash
# Local
cd apps/api && pnpm db:migrate

# Production
ssh root@musclemap.me "cd /var/www/musclemap.me/apps/api && pnpm db:migrate"
```

### Seed Data
```bash
cd apps/api && pnpm db:seed
```

### Migration Files
Located in `apps/api/src/db/migrations/`. Naming convention:
```
001_initial_schema.ts
002_add_feature.ts
007_character_stats.ts
```

---

## Testing

```bash
# Run all tests
pnpm test

# API tests only
pnpm test:api

# Frontend tests
pnpm test:frontend

# E2E tests (Playwright)
pnpm test:e2e

# Type checking (ALWAYS run before committing)
pnpm typecheck
```

---

## API Endpoints Quick Reference

Base URL: `https://musclemap.me/api/`

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Health check (returns DB/Redis status) |
| `/auth/register` | POST | No | User registration |
| `/auth/login` | POST | No | User login (returns JWT) |
| `/stats/me` | GET | Yes | Character stats (RPG-style) |
| `/stats/leaderboards` | GET | Optional | Global/regional leaderboards |
| `/workouts` | GET/POST | Yes | Workout CRUD |
| `/prescriptions` | GET/POST | Yes | AI-generated workout plans |
| `/community/*` | Various | Yes | Social features |

Full documentation: `docs/API_REFERENCE.md`

---

## Environment Variables

Required in `apps/api/.env`:

```env
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/musclemap
# Or individual PG* variables:
PGHOST=localhost
PGPORT=5432
PGDATABASE=musclemap
PGUSER=postgres
PGPASSWORD=your-password

# Auth
JWT_SECRET=your-secret-key-minimum-32-characters

# Optional
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true
STRIPE_SECRET_KEY=sk_...
```

---

## Quick Start Checklist

When starting a new task:

- [ ] Read the task requirements carefully
- [ ] Check relevant docs in `docs/` directory
- [ ] Use TodoWrite to plan your approach
- [ ] Make changes in your worktree
- [ ] Run `pnpm typecheck` to verify TypeScript
- [ ] Commit changes frequently
- [ ] **Regenerate docs if needed:** `pnpm docs:generate && cd docs/latex && make all`
- [ ] Run `./scripts/merge-all.sh` to merge branches
- [ ] Run `./deploy.sh` to deploy to VPS
- [ ] Run migrations if you added any
- [ ] Verify at https://musclemap.me/
- [ ] Test API: `curl https://musclemap.me/health`

---

## Architectural Philosophy

### Modular & Hierarchical

Everything is built in layers:
1. **Database Layer**: PostgreSQL with well-defined schemas (single source of truth)
2. **Service Layer**: Business logic in TypeScript modules
3. **API Layer**: Fastify + GraphQL exposing services
4. **Client Layer**: SDK for consuming API (works on web and mobile)
5. **UI Layer**: React components that only render data

### Cross-Platform Strategy

We achieve cross-platform through the web stack:
- **React + Vite**: Runs in any modern browser on any device
- **React Native + Expo**: Native mobile apps sharing React code
- **Same API**: All platforms consume the same GraphQL endpoint
- **No native code required**: Everything works through the browser or Expo

### Plugin Architecture

Third-party integrations via plugins:
- Each plugin is isolated
- Standard SDK for development
- Hot-reloadable in development

### State Management

- **Server**: PostgreSQL is the ONLY source of truth
- **Client**: No local state - fetch what you need from the API
- **Real-time**: WebSocket for live updates

---

## Data Architecture & Cross-Platform Strategy

### How Cross-Platform Works

MuscleMap achieves cross-platform compatibility through a simple architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                     ANY DEVICE / BROWSER                     │
│  (Chrome, Safari, Firefox, iOS, Android, Desktop, Tablet)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS (SSL encrypted)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      CADDY REVERSE PROXY                     │
│              (Automatic HTTPS, HTTP/2, HTTP/3)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    FASTIFY API SERVER                        │
│                   GraphQL Endpoint /api                      │
│          (Single data stream for ALL clients)               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       POSTGRESQL                             │
│              (Single Source of Truth)                        │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Principles

1. **All state lives in PostgreSQL** - clients never store state locally
2. **GraphQL minimizes bandwidth** - clients request only the fields they need
3. **SSL encrypts everything** - bidirectional encrypted data stream
4. **Clients only render** - no business logic in frontend, just display data
5. **React everywhere** - same React code runs on web (Vite) and mobile (Expo)

### Optimization Strategies

- **GraphQL field selection**: Only fetch needed fields, reducing payload size
- **Query batching**: Multiple queries in single request
- **Response caching**: Redis caches frequent queries (optional)
- **CDN for static assets**: Images, fonts served from edge

---

## Server Infrastructure

- **VPS Provider:** Linux server at 72.62.83.202 (musclemap.me)
- **Reverse Proxy:** Caddy (automatic HTTPS, NOT Nginx)
- **API Framework:** Fastify (NOT Express)
- **Process Manager:** PM2
- **Database:** PostgreSQL (NOT SQLite)
- **Cache:** Redis (optional, for performance)
- **Deployment:** Git pull + pnpm build (no Docker)

---

## Contact & Resources:

- **GitHub:** https://github.com/jeanpaulniko/musclemap
- **Live Site:** https://musclemap.me/
- **API Health:** https://musclemap.me/health
- **VPS Access:** `ssh root@musclemap.me
- **Full test suite in /tests/ and we use Pino and Winston for thorough logging front and back to express themselves as data streams`

---

*This guide is for Claude AI developers working on MuscleMap. Keep it updated as the project evolves.*
