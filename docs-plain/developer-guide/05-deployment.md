# Deployment Guide

> Ship your changes to production.

---

## Deployment Overview

```
DEPLOYMENT FLOW (Build Locally, Deploy via Rsync)
=================================================

Local Development
      │
      ▼
Merge to Main
      │
      ▼
Run Tests & Typecheck
      │
      ▼
Build Locally (pnpm build:intelligent)
      │
      ▼
Rsync dist/ to Server
      │
      ▼
Update Server (packages + API only)
      │
      ▼
Restart PM2
      │
      ▼
Run Migrations (if any)
      │
      ▼
Verify on Live Site
```

**IMPORTANT:** The production server has limited RAM (8GB). Vite frontend builds cause OOM errors.
**ALWAYS build locally and rsync the dist folder to the server.**

---

## Pre-Deployment Checklist

### Before Deploying

```
CHECKLIST
=========

[ ] All changes committed
[ ] pnpm typecheck passes
[ ] pnpm lint passes
[ ] pnpm test passes
[ ] Documentation updated (if needed)
[ ] Migrations tested locally
[ ] No console.logs or debug code
[ ] Feature tested locally
```

### Run Quality Checks

```bash
# Type check
pnpm typecheck

# Lint
pnpm lint

# Test
pnpm test

# E2E test (optional but recommended)
pnpm test:e2e:api
```

---

## Deployment Commands

### Standard Deployment (Recommended)

```bash
# 1. Merge all worktree branches
./scripts/merge-all.sh

# 2. Deploy to production (builds locally, rsyncs to server)
./deploy.sh "description of changes"

# 3. Run migrations (if any)
ssh -p 2222 root@musclemap.me "cd /var/www/musclemap.me/apps/api && pnpm db:migrate"

# 4. Verify deployment
curl https://musclemap.me/health
```

### What deploy.sh Does

```bash
# deploy.sh performs these steps:

1. Runs pnpm typecheck
2. Runs pnpm lint
3. Regenerates documentation
4. Builds ALL packages LOCALLY (including frontend via pnpm build:intelligent)
5. Commits and pushes to git
6. Rsyncs dist/ folder to server (avoids OOM on server)
7. SSHs to VPS (port 2222)
8. Pulls latest code
9. Installs dependencies
10. Rebuilds packages and API only (NOT frontend)
11. Restarts PM2 processes
12. Publishes npm packages (if versions changed)
```

### Manual Deployment (Step by Step)

```bash
# 1. Build locally
pnpm build:intelligent

# 2. Rsync dist to server (delta transfer - only sends changed bytes)
rsync -rvz --delete -e "ssh -p 2222" dist/ root@musclemap.me:/var/www/musclemap.me/dist/

# 3. Update server (packages + API only)
ssh -p 2222 root@musclemap.me "cd /var/www/musclemap.me && git pull && pnpm install && pnpm build:packages && pnpm build:api && pm2 restart musclemap --silent"

# 4. Verify
curl https://musclemap.me/health
```

### Frontend-Only Deployment (Fastest)

When only frontend files changed:

```bash
pnpm build:intelligent && \
rsync -rvz --delete -e "ssh -p 2222" dist/ root@musclemap.me:/var/www/musclemap.me/dist/ && \
ssh -p 2222 root@musclemap.me "pm2 restart musclemap --silent"
```

---

## VPS Server Details

### Server Access

**IMPORTANT: Always use port 2222 (port 22 is blocked)**

```bash
# SSH to server
ssh -p 2222 root@musclemap.me

# Or with key file
ssh -p 2222 -i ~/.ssh/musclemap root@musclemap.me
```

### Directory Structure

```
/var/www/musclemap.me/
├── apps/
│   └── api/              # API server
├── packages/             # Shared packages
├── src/                  # Frontend source
├── dist/                 # Built frontend (rsync target)
├── node_modules/         # Dependencies
└── ecosystem.config.cjs  # PM2 config
```

### Server Commands

```bash
# Check API status
ssh -p 2222 root@musclemap.me "pm2 status"

# View logs
ssh -p 2222 root@musclemap.me "pm2 logs musclemap --lines 50 --nostream"

# Restart API
ssh -p 2222 root@musclemap.me "pm2 restart musclemap --silent"

# Reload (zero-downtime)
ssh -p 2222 root@musclemap.me "pm2 reload musclemap"
```

---

## Database Migrations

### Creating Migrations

```bash
# Create new migration
cd apps/api
pnpm db:migrate:make add_new_feature
```

### Migration File Structure

```typescript
// apps/api/src/db/migrations/045_add_new_feature.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('new_table', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('users.id').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.timestamps(true, true);

    // Add indexes
    table.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('new_table');
}
```

### Running Migrations

```bash
# Local
pnpm -C apps/api db:migrate

# Production (use port 2222)
ssh -p 2222 root@musclemap.me "cd /var/www/musclemap.me/apps/api && pnpm db:migrate"

# Rollback (careful!)
ssh -p 2222 root@musclemap.me "cd /var/www/musclemap.me/apps/api && pnpm db:rollback"
```

---

## Monitoring

### Health Endpoints

```bash
# Basic health check
curl https://musclemap.me/health

# Readiness probe
curl https://musclemap.me/ready

# Metrics (Prometheus format)
curl https://musclemap.me/metrics
```

### Health Response

```json
{
  "status": "ok",
  "timestamp": "2026-01-24T12:00:00Z",
  "version": "2.0.0",
  "database": {
    "connected": true
  },
  "redis": {
    "enabled": true,
    "connected": true
  }
}
```

### Viewing Logs

```bash
# Live logs
ssh -p 2222 root@musclemap.me "pm2 logs musclemap"

# Recent logs
ssh -p 2222 root@musclemap.me "pm2 logs musclemap --lines 100 --nostream"

# Error logs only
ssh -p 2222 root@musclemap.me "pm2 logs musclemap --err"
```

---

## Rollback Procedures

### Quick Rollback

```bash
# Revert to previous commit
ssh -p 2222 root@musclemap.me "cd /var/www/musclemap.me && git revert HEAD && pm2 restart musclemap --silent"
```

### Full Rollback

```bash
# 1. SSH to server
ssh -p 2222 root@musclemap.me

# 2. Check git history
cd /var/www/musclemap.me
git log --oneline -10

# 3. Reset to specific commit
git reset --hard <commit-sha>

# 4. Rebuild packages and API (NOT frontend - rsync from local if needed)
pnpm install
pnpm build:packages
pnpm build:api

# 5. Restart
pm2 restart musclemap --silent

# 6. Rollback migrations if needed
cd apps/api
pnpm db:rollback
```

### Database Rollback

```bash
# Rollback last migration
ssh -p 2222 root@musclemap.me "cd /var/www/musclemap.me/apps/api && pnpm db:rollback"

# Rollback multiple migrations
ssh -p 2222 root@musclemap.me "cd /var/www/musclemap.me/apps/api && pnpm db:rollback --step 3"
```

---

## npm Package Publishing

### Automatic Publishing

`deploy.sh` automatically publishes packages if versions changed.

### Manual Publishing

```bash
# Bump version in package.json first

# Publish single package
cd packages/shared && npm publish --access public

# Publish all (in order)
for pkg in shared core client plugin-sdk ui contracts; do
  cd /Users/jeanpaulniko/Public/musclemap.me/packages/$pkg
  npm publish --access public
done
```

### Package Versions

All packages under `@musclemap.me` scope:

| Package | Description |
|---------|-------------|
| `@musclemap.me/shared` | Types, utilities |
| `@musclemap.me/core` | Business logic |
| `@musclemap.me/client` | API client SDK |
| `@musclemap.me/plugin-sdk` | Plugin development |
| `@musclemap.me/ui` | UI components |
| `@musclemap.me/contracts` | GraphQL schema |

---

## Environment Management

### Production Environment

```env
# /var/www/musclemap.me/apps/api/.env

NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...
JWT_SECRET=...
REDIS_URL=redis://...
STRIPE_SECRET_KEY=sk_live_...
```

### Updating Environment

```bash
# Edit production env
ssh -p 2222 root@musclemap.me "nano /var/www/musclemap.me/apps/api/.env"

# Restart to apply
ssh -p 2222 root@musclemap.me "pm2 restart musclemap --silent"
```

---

## Troubleshooting

### Deployment Failed - Build OOM on Server

**This is why we build locally and rsync!**

```bash
# NEVER do this - will OOM:
ssh -p 2222 root@musclemap.me "cd /var/www/musclemap.me && pnpm build"

# ALWAYS do this instead:
pnpm build:intelligent  # Build locally
rsync -rvz --delete -e "ssh -p 2222" dist/ root@musclemap.me:/var/www/musclemap.me/dist/
ssh -p 2222 root@musclemap.me "pm2 restart musclemap --silent"
```

### API Not Responding

```bash
# Check PM2 status
ssh -p 2222 root@musclemap.me "pm2 status"

# Check logs
ssh -p 2222 root@musclemap.me "pm2 logs musclemap --err --lines 50"

# Restart PM2
ssh -p 2222 root@musclemap.me "pm2 restart musclemap --silent"

# Check Caddy
ssh -p 2222 root@musclemap.me "systemctl status caddy"
```

### Database Issues

```bash
# Check PostgreSQL
ssh -p 2222 root@musclemap.me "systemctl status postgresql"

# Check connections
ssh -p 2222 root@musclemap.me "psql -U musclemap -d musclemap -c 'SELECT count(*) FROM pg_stat_activity'"

# Restart PostgreSQL (careful!)
ssh -p 2222 root@musclemap.me "systemctl restart postgresql"
```

---

## Post-Deployment Verification

### Verify Checklist

```bash
# 1. Health check
curl https://musclemap.me/health

# 2. Test GraphQL
curl -X POST https://musclemap.me/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'

# 3. Test frontend
curl -I https://musclemap.me/

# 4. Check metrics
curl https://musclemap.me/metrics | head -20
```

### Smoke Tests

After deployment, manually verify:

1. Homepage loads
2. Login works
3. Can create workout
4. Data persists
5. No console errors

---

## See Also

- [Local Setup](./02-local-setup.md)
- [Testing](./04-testing.md)
- Deploy script: `deploy.sh`
- PM2 config: `ecosystem.config.cjs`

---

*Last updated: 2026-01-24*
