# MuscleMap Scripts & Claude Developer Guide

*Last Updated: January 2025*

## Hello, Claude!

Welcome to **MuscleMap** - a cross-platform fitness tracking application that visualizes muscle activation in real-time. You are the AI developer responsible for implementing features, fixing bugs, and deploying changes across our multi-environment infrastructure.

**Live Production Site:** https://musclemap.me/
**GitHub Repository:** https://github.com/jeanpaulniko/musclemap

---

## Quick Start: The `mm` CLI

**MuscleMap now has a unified interactive CLI for all system administration tasks.**

```bash
# Interactive mode - full menu system
./scripts/mm

# Quick commands
./scripts/mm start          # Start all services
./scripts/mm stop           # Stop all services
./scripts/mm status         # Full system status
./scripts/mm deploy         # Deploy to production
./scripts/mm test           # Run tests

# Submenus
./scripts/mm services       # Service management menu
./scripts/mm qa             # Quality assurance menu
./scripts/mm docs           # Documentation menu
./scripts/mm db             # Database operations
./scripts/mm git            # Git operations
./scripts/mm quick          # Quick actions (common task combos)
```

The `mm` CLI provides:
- **Interactive menus** with modal dialogs
- **Quick actions** for common task combinations
- **Category submenus** for detailed operations
- **Informative output** showing what's happening
- **Keyboard navigation** (arrow keys, vim keys)

---

## Your Mission

1. **Plan** features before implementing them (use TodoWrite tool)
2. **Implement** changes in git worktrees (isolated development environments)
3. **Merge** all worktree branches into main using `mm git` or `./scripts/merge-all.sh`
4. **Deploy** across all environments using `mm deploy` or `./deploy.sh`
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

- **LaTeX First**: We use LaTeX liberally for professional documentation, reports, and generated materials

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

### Script Directory Structure

```
scripts/
├── mm                           # Master CLI (interactive menus)
├── musclemap-start.sh          # Start local dev services
├── musclemap-stop.sh           # Stop local dev services
├── deploy.sh                   # Simple deployment helper
├── deploy-branch.sh            # Full PR-based deployment
├── production-deploy.sh        # Run on production server
├── merge-all.sh                # Merge worktree branches
├── pre-deploy-check.sh         # Pre-deploy validation
├── warning-tracker.sh          # Code quality scanner
├── generate-docs.cjs           # Documentation generator
├── test.sh                     # Test runner
├── maintain.sh                 # Maintenance menu
├── repo-cleanup.sh             # Clean build artifacts
├── competitive-analysis.sh     # Competitive analysis
├── lib/
│   ├── perf-utils.sh           # Performance utilities
│   ├── ui-utils.sh             # UI/menu utilities
│   ├── shell-utils.sh          # Shell utilities
│   ├── postgres-utils.sh       # PostgreSQL utilities
│   └── redis-utils.sh          # Redis utilities
├── test-harness/               # Comprehensive test suite
└── archive/                    # Old/superseded scripts
```

### Performance-Optimized Scripts

All scripts have been optimized for speed and performance:

| Script | Optimization | Speed Improvement |
|--------|-------------|-------------------|
| `merge-all.sh` | Parallel worktree scanning | ~4x faster with many worktrees |
| `pre-deploy-check.sh` | Parallel checks + caching | ~2-3x faster |
| `warning-tracker.sh` | Parallel grep + incremental mode | ~5x faster |
| `musclemap-start.sh` | Parallel service startup | ~2x faster |
| `musclemap-stop.sh` | Parallel service shutdown | ~2x faster |
| `generate-docs.cjs` | Caching + incremental mode | ~3x faster |

### Primary Scripts

#### `merge-all.sh` - Merge Worktree Branches
Collects all changes from git worktrees and merges them into main.
**OPTIMIZED:** Uses parallel worktree scanning with background jobs.

```bash
./scripts/merge-all.sh              # Interactive mode
./scripts/merge-all.sh --auto       # Auto-merge without prompts
./scripts/merge-all.sh --list       # List branches only
./scripts/merge-all.sh --dry-run    # Preview what would happen
./scripts/merge-all.sh --parallel 8 # Use 8 parallel jobs (default: 4)
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

#### `pre-deploy-check.sh` - Pre-Deployment Validation
**OPTIMIZED:** Runs 6+ checks in parallel with result caching.

```bash
./scripts/pre-deploy-check.sh           # Run all checks
./scripts/pre-deploy-check.sh --fast    # Skip typecheck if recently cached
./scripts/pre-deploy-check.sh --no-cache # Force fresh checks (ignore cache)
```

#### `warning-tracker.sh` - Code Quality Scanner
**OPTIMIZED:** Parallel grep scans with incremental mode support.

```bash
./scripts/warning-tracker.sh scan              # Full scan
./scripts/warning-tracker.sh scan --incremental # Only scan changed files
./scripts/warning-tracker.sh scan --fast       # Skip typecheck entirely
./scripts/warning-tracker.sh fix               # Auto-fix fixable issues
./scripts/warning-tracker.sh status            # Show current status
```

### Service Management (Local Dev)

#### `musclemap-start.sh` - Start Dev Services
**OPTIMIZED:** Parallel service startup with fast process detection.

```bash
./scripts/musclemap-start.sh              # Start PostgreSQL + Redis
./scripts/musclemap-start.sh --api        # Also start API server
./scripts/musclemap-start.sh --dev        # Also start Vite
./scripts/musclemap-start.sh --all        # Start everything
./scripts/musclemap-start.sh --status     # Just show status (fast check)
./scripts/musclemap-start.sh --fast       # Skip wait-for-ready checks
```

#### `musclemap-stop.sh` - Stop Dev Services
**OPTIMIZED:** Parallel service shutdown in two phases (app → infra).

```bash
./scripts/musclemap-stop.sh              # Stop all (with confirmation)
./scripts/musclemap-stop.sh --quiet      # Stop without confirmation
./scripts/musclemap-stop.sh --fast       # Force stop without waiting
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
**OPTIMIZED:** Caching + incremental mode for faster regeneration.

```bash
pnpm docs:generate          # Generate all (Markdown + LaTeX)
pnpm docs:md                # Markdown only
pnpm docs:latex             # LaTeX only

# Performance options
node scripts/generate-docs.cjs --fast        # Use cached analysis (5-min TTL)
node scripts/generate-docs.cjs --incremental # Skip if sources unchanged

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

#### `competitive-analysis.sh` - Competitive Feature Analysis
Assists with monthly competitive analysis to identify feature gaps.
```bash
./scripts/competitive-analysis.sh           # Full analysis workflow
./scripts/competitive-analysis.sh --check   # Check last update times
./scripts/competitive-analysis.sh --gaps-only  # Update gaps only
./scripts/competitive-analysis.sh --help    # Show help

# Or via pnpm
pnpm competitive-analysis              # Full analysis
pnpm competitive-analysis:check        # Check dates
```

**Documents Updated:**
- `docs/COMPETITOR-FEATURE-ANALYSIS.md` - Raw competitor feature data
- `docs/FEATURE-GAP-ANALYSIS.md` - Prioritized gap analysis with implementation plan

**Recommended Frequency:** Monthly

#### `run-approved-command.sh` - Approved Commands Runner
Executes commands from a pre-approved list, enabling Claude to run common server commands without repeated approval prompts.

```bash
./scripts/run-approved-command.sh              # Interactive menu
./scripts/run-approved-command.sh --list       # List all approved commands
./scripts/run-approved-command.sh --search "pm2"  # Search commands
./scripts/run-approved-command.sh --execute "exact command"  # Execute specific
./scripts/run-approved-command.sh --add "new command"  # Add new approved command
```

**Key Files:**
- `scripts/approved-commands.txt` - List of approved commands (one per line)
- `scripts/approved-commands.log` - Execution audit log

**Usage with Claude:**
1. Claude logs commands requiring approval to `approved-commands.txt`
2. User approves the `run-approved-command.sh` script once
3. Claude can then execute any pre-approved command via the script

**Security:**
- Commands must exactly match lines in `approved-commands.txt`
- All executions are logged with timestamps
- Review `approved-commands.txt` periodically

### Performance Utilities Library

The `lib/perf-utils.sh` library provides shared utilities for script performance:

```bash
# Source in your script
source "$(dirname "$0")/lib/perf-utils.sh"

# Timing
timer_start "my_operation"
# ... do work ...
elapsed=$(timer_elapsed "my_operation")
echo "Took ${elapsed}s"

# Parallel execution (max 4 jobs)
parallel_run 4 "command1" "command2" "command3"
parallel_foreach 4 "my_func" item1 item2 item3

# Caching (5-minute TTL by default)
if cache_valid "my_key" 300; then
    value=$(cache_get "my_key")
else
    value=$(expensive_operation)
    cache_set "my_key" "$value"
fi

# Fast service checks
pg_running && echo "PostgreSQL is up"
redis_running && echo "Redis is up"
pm2_musclemap_running && echo "API is up"
vite_running && echo "Vite is up"
port_in_use 3001 && echo "Port 3001 in use"

# Wait with exponential backoff
wait_with_backoff "pg_isready -q" 10 0.2 2

# Colored output
print_success "Operation completed"
print_warning "Something to note"
print_error "Something failed"
print_info "FYI..."
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

## Contact & Resources

- **GitHub:** https://github.com/jeanpaulniko/musclemap
- **Live Site:** https://musclemap.me/
- **API Health:** https://musclemap.me/health
- **VPS Access:** `ssh root@musclemap.me`
- **Test Suite:** Located in `/tests/`
- **Logging:** Pino (backend) and Winston (frontend) for structured logging as data streams

---

*This guide is for Claude AI developers working on MuscleMap. Keep it updated as the project evolves.*
