# Deployment Checklist

> Use this checklist before EVERY production deployment.

---

## Pre-Deployment

### Code Quality

- [ ] All tests pass (`pnpm test`)
- [ ] Type check passes (`pnpm typecheck`)
- [ ] Lint passes (`pnpm lint`)
- [ ] No console.log statements in production code
- [ ] No debugger statements
- [ ] No commented-out code blocks
- [ ] No hardcoded secrets or credentials
- [ ] Imports are clean (no unused imports)

### Database

- [ ] Migrations tested locally
- [ ] Migrations are reversible (or have rollback plan)
- [ ] New indexes added for new queries
- [ ] No breaking schema changes without migration path
- [ ] EXPLAIN ANALYZE run on new queries
- [ ] Keyset pagination used (not OFFSET)

### Documentation

- [ ] API changes documented
- [ ] New features have user docs
- [ ] CHANGELOG updated (if applicable)
- [ ] Version number bumped (if applicable)
- [ ] E2E test updated for new endpoints

---

## Deployment Steps

### Step 1: Merge Worktrees

```bash
./scripts/merge-all.sh
```

- [ ] All branches merged successfully
- [ ] No merge conflicts
- [ ] All changes committed

### Step 2: Run Full Test Suite

```bash
pnpm test:harness --verbose
```

- [ ] All test categories pass
- [ ] No performance regressions
- [ ] Core tests: PASS
- [ ] Security tests: PASS
- [ ] Edge case tests: PASS

### Step 3: Final Checks

```bash
pnpm typecheck
pnpm lint
```

- [ ] No type errors
- [ ] No lint errors

### Step 4: Deploy

```bash
./deploy.sh "Description of changes"
```

- [ ] Deploy script completes without errors
- [ ] Build succeeds
- [ ] Assets uploaded to server

### Step 5: Run Migrations (if needed)

```bash
ssh root@musclemap.me "cd /var/www/musclemap.me/apps/api && pnpm db:migrate"
```

- [ ] Migrations complete successfully
- [ ] No data loss
- [ ] Rollback plan ready

### Step 6: Restart Services (if needed)

```bash
ssh root@musclemap.me "pm2 restart musclemap-api"
```

- [ ] API restarts cleanly
- [ ] No error spike in logs

---

## Post-Deployment Verification

### Health Checks

- [ ] `curl https://musclemap.me/health` returns OK
- [ ] `curl https://musclemap.me/ready` returns OK
- [ ] `curl https://musclemap.me/metrics` accessible
- [ ] Frontend loads without errors

### Smoke Tests

- [ ] Can access landing page
- [ ] Can log in
- [ ] Can start a workout
- [ ] Can view dashboard
- [ ] Can view exercises
- [ ] New feature works as expected

### Monitoring

- [ ] No error spike in PM2 logs
- [ ] No unusual latency in metrics
- [ ] No failed requests in access log
- [ ] Database connections normal

```bash
# Check logs
ssh root@musclemap.me "pm2 logs musclemap-api --lines 50 --nostream"

# Check status
ssh root@musclemap.me "pm2 status"
```

---

## Rollback Plan

If issues are detected after deployment:

### Step 1: Assess Severity

| Severity | Action |
|----------|--------|
| Critical (site down) | Immediate rollback |
| High (feature broken) | Rollback or hotfix |
| Medium (minor bug) | Hotfix in place |
| Low (cosmetic) | Fix in next deploy |

### Step 2: Rollback Code

```bash
# Revert to previous commit
git revert HEAD
./deploy.sh "Rollback: <reason>"
```

### Step 3: Rollback Migration (if needed)

```bash
ssh root@musclemap.me "cd /var/www/musclemap.me/apps/api && pnpm db:rollback"
```

### Step 4: Restart Services

```bash
ssh root@musclemap.me "pm2 restart musclemap-api"
```

### Step 5: Verify Rollback

- [ ] Health check passes
- [ ] Feature working as before
- [ ] No new errors

### Step 6: Document

- [ ] Note what went wrong
- [ ] Create issue for fix
- [ ] Update deployment notes

---

## Quick Commands Reference

```bash
# Local preparation
pnpm test              # Run tests
pnpm typecheck         # Check types
pnpm lint              # Check lint
pnpm test:harness      # Full test suite

# Deployment
./scripts/merge-all.sh          # Merge branches
./deploy.sh "message"           # Deploy

# Remote verification
ssh root@musclemap.me "pm2 status"
ssh root@musclemap.me "pm2 logs musclemap-api --lines 50 --nostream"
curl https://musclemap.me/health

# Emergency rollback
git revert HEAD
./deploy.sh "Rollback"
ssh root@musclemap.me "pm2 restart musclemap-api"
```

---

## Deployment Schedule

| Day | Recommended |
|-----|-------------|
| Monday | Yes - full week to monitor |
| Tuesday | Yes |
| Wednesday | Yes |
| Thursday | Caution - limited fix time |
| Friday | Avoid unless critical |
| Weekend | Emergency only |

---

*Last updated: 2026-01-15*
