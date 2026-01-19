# CLI Commands Reference

> Common commands for MuscleMap development.

---

## Development

### Start Services

```bash
# Start core services (PostgreSQL + Redis)
./scripts/musclemap-start.sh

# Start with API server
./scripts/musclemap-start.sh --api

# Start with frontend dev server
./scripts/musclemap-start.sh --dev

# Start everything
./scripts/musclemap-start.sh --all

# Check status
./scripts/musclemap-start.sh --status
```

### Stop Services

```bash
# Stop all services
./scripts/musclemap-stop.sh

# Stop without confirmation
./scripts/musclemap-stop.sh --quiet
```

### Run Development Server

```bash
# Full dev server (frontend + API)
pnpm dev

# Frontend only
pnpm dev:web

# API only
pnpm dev:api
```

---

## Building

```bash
# Build all packages (in correct order)
pnpm build:all

# Build specific package
pnpm -C packages/shared build
pnpm -C packages/core build
pnpm -C packages/client build
pnpm -C apps/api build

# Build frontend
pnpm build
```

---

## Testing

### Unit/Integration Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test:watch

# Run specific tests
pnpm test -- --grep "workout"
```

### E2E Tests

```bash
# E2E user journey (local)
pnpm test:e2e:api

# E2E against production
pnpm test:e2e:api:prod

# With options
npx tsx scripts/e2e-user-journey.ts --verbose
npx tsx scripts/e2e-user-journey.ts --keep-user
```

### Test Harness

```bash
# Full test harness
pnpm test:harness

# By category
pnpm test:harness --category core
pnpm test:harness --category security
pnpm test:harness --category edge
pnpm test:harness --category performance

# By persona
pnpm test:harness --persona elite_eve

# Export results
pnpm test:harness --format json -o results.json
```

---

## Quality Checks

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Fix lint issues
pnpm lint:fix

# All checks (pre-commit)
pnpm typecheck && pnpm lint && pnpm test
```

---

## Database

### Migrations

```bash
# Run migrations
pnpm -C apps/api db:migrate

# Create new migration
pnpm -C apps/api db:migrate:make migration_name

# Rollback last migration
pnpm -C apps/api db:rollback

# Rollback multiple
pnpm -C apps/api db:rollback --step 3

# Migration status
pnpm -C apps/api db:migrate:status
```

### Seeding

```bash
# Seed database
pnpm -C apps/api db:seed

# Seed specific
pnpm -C apps/api db:seed:run --specific=users
```

---

## Documentation

```bash
# Regenerate all docs
pnpm docs:generate

# View generated docs
open docs/FEATURES.md
open docs/API_REFERENCE.md
```

---

## Deployment

### Local to Production

```bash
# Merge all worktree branches
./scripts/merge-all.sh

# Deploy to production
./deploy.sh "commit message"

# Run migrations on production
ssh root@musclemap.me "cd /var/www/musclemap.me/apps/api && pnpm db:migrate"
```

### Server Commands

```bash
# SSH to server
ssh root@musclemap.me

# Check PM2 status
ssh root@musclemap.me "pm2 status"

# View logs
ssh root@musclemap.me "pm2 logs musclemap-api --lines 50 --nostream"

# Restart API
ssh root@musclemap.me "pm2 restart musclemap-api"

# Reload (zero-downtime)
ssh root@musclemap.me "pm2 reload musclemap-api"
```

### Health Checks

```bash
# Health check
curl https://musclemap.me/health

# Readiness
curl https://musclemap.me/ready

# Metrics
curl https://musclemap.me/metrics
```

---

## npm Packages

### Publishing

```bash
# Publish single package
cd packages/shared && npm publish --access public

# Publish all (in order)
for pkg in shared core client plugin-sdk ui contracts; do
  cd /Users/jeanpaulniko/Public/musclemap.me/packages/$pkg
  npm publish --access public
done
```

### Versions

```bash
# Check package versions
npm view @musclemap.me/shared version
npm view @musclemap.me/core version
npm view @musclemap.me/client version
```

---

## Git Operations

### Branch Management

```bash
# Create feature branch
git checkout -b feature/your-feature

# Sync with upstream
git fetch upstream
git merge upstream/main

# Rebase branch
git rebase main
```

### Merge Worktrees

```bash
# Merge all worktree branches
./scripts/merge-all.sh
```

---

## Cleanup

```bash
# Clear node_modules
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules

# Clear pnpm cache
pnpm store prune

# Fresh install
pnpm install

# Clear build artifacts
rm -rf dist
rm -rf apps/*/dist
rm -rf packages/*/dist
```

---

## Troubleshooting

### Port in Use

```bash
# Find what's using a port
lsof -i :3001

# Kill process
kill -9 <PID>
```

### Database Connection

```bash
# Check PostgreSQL
pg_isready

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Start PostgreSQL
brew services start postgresql@14
```

### Node Version

```bash
# Check version
node --version

# Switch with nvm
nvm use 20

# Switch with volta
volta pin node@20
```

---

*Last updated: 2026-01-15*
