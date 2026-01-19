# Deployment Guide

> Ship your changes to production.

---

## Deployment Overview

```
DEPLOYMENT FLOW
===============

Local Development
      │
      ▼
Merge to Main
      │
      ▼
Run Tests
      │
      ▼
Build All Packages
      │
      ▼
Deploy to VPS
      │
      ▼
Run Migrations (if any)
      │
      ▼
Verify on Live Site
```

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

### Standard Deployment

```bash
# 1. Merge all worktree branches
./scripts/merge-all.sh

# 2. Deploy to production
./deploy.sh "description of changes"

# 3. Run migrations (if any)
ssh root@musclemap.me "cd /var/www/musclemap.me/apps/api && pnpm db:migrate"

# 4. Verify deployment
curl https://musclemap.me/health
```

### What deploy.sh Does

```bash
# deploy.sh performs these steps:

1. Runs pnpm typecheck
2. Runs pnpm lint
3. Regenerates documentation
4. Builds all packages
5. Commits and pushes to git
6. SSHs to VPS
7. Pulls latest code
8. Installs dependencies
9. Rebuilds on server
10. Restarts PM2 processes
11. Publishes npm packages (if versions changed)
```

---

## VPS Server Details

### Server Access

```bash
# SSH to server
ssh root@musclemap.me

# Or with key file
ssh -i ~/.ssh/musclemap root@musclemap.me
```

### Directory Structure

```
/var/www/musclemap.me/
├── apps/
│   └── api/              # API server
├── packages/             # Shared packages
├── src/                  # Frontend source
├── dist/                 # Built frontend
├── node_modules/         # Dependencies
└── ecosystem.config.cjs  # PM2 config
```

### Server Commands

```bash
# Check API status
pm2 status

# View logs
pm2 logs musclemap-api --lines 50 --nostream

# Restart API
pm2 restart musclemap-api

# Reload (zero-downtime)
pm2 reload musclemap-api
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

# Production
ssh root@musclemap.me "cd /var/www/musclemap.me/apps/api && pnpm db:migrate"

# Rollback (careful!)
ssh root@musclemap.me "cd /var/www/musclemap.me/apps/api && pnpm db:rollback"
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
  "status": "healthy",
  "timestamp": "2026-01-15T12:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "api": "running"
  },
  "version": "1.2.3"
}
```

### Viewing Logs

```bash
# Live logs
ssh root@musclemap.me "pm2 logs musclemap-api"

# Recent logs
ssh root@musclemap.me "pm2 logs musclemap-api --lines 100 --nostream"

# Error logs only
ssh root@musclemap.me "pm2 logs musclemap-api --err"
```

---

## Rollback Procedures

### Quick Rollback

```bash
# Revert to previous commit
ssh root@musclemap.me "cd /var/www/musclemap.me && git revert HEAD && pm2 restart musclemap-api"
```

### Full Rollback

```bash
# 1. SSH to server
ssh root@musclemap.me

# 2. Check git history
cd /var/www/musclemap.me
git log --oneline -10

# 3. Reset to specific commit
git reset --hard <commit-sha>

# 4. Rebuild
pnpm install
pnpm build:all

# 5. Restart
pm2 restart musclemap-api

# 6. Rollback migrations if needed
cd apps/api
pnpm db:rollback
```

### Database Rollback

```bash
# Rollback last migration
ssh root@musclemap.me "cd /var/www/musclemap.me/apps/api && pnpm db:rollback"

# Rollback multiple migrations
ssh root@musclemap.me "cd /var/www/musclemap.me/apps/api && pnpm db:rollback --step 3"
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
ssh root@musclemap.me "nano /var/www/musclemap.me/apps/api/.env"

# Restart to apply
ssh root@musclemap.me "pm2 restart musclemap-api"
```

---

## Troubleshooting

### Deployment Failed

```bash
# Check server logs
ssh root@musclemap.me "pm2 logs musclemap-api --err --lines 50"

# Check build output
ssh root@musclemap.me "cd /var/www/musclemap.me && pnpm build:all"

# Check disk space
ssh root@musclemap.me "df -h"
```

### API Not Responding

```bash
# Check PM2 status
ssh root@musclemap.me "pm2 status"

# Restart PM2
ssh root@musclemap.me "pm2 restart all"

# Check Caddy
ssh root@musclemap.me "systemctl status caddy"
```

### Database Issues

```bash
# Check PostgreSQL
ssh root@musclemap.me "systemctl status postgresql"

# Check connections
ssh root@musclemap.me "psql -c 'SELECT count(*) FROM pg_stat_activity'"

# Restart PostgreSQL (careful!)
ssh root@musclemap.me "systemctl restart postgresql"
```

---

## Post-Deployment Verification

### Verify Checklist

```bash
# 1. Health check
curl https://musclemap.me/health

# 2. Test GraphQL
curl -X POST https://musclemap.me/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'

# 3. Test frontend
curl -I https://musclemap.me/

# 4. Check metrics
curl https://musclemap.me/metrics | head -20

# 5. Test specific feature
curl https://musclemap.me/api/exercises | head
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

*Last updated: 2026-01-15*
