# MuscleMap Deployment Protection System

A comprehensive multi-layer defense system to prevent production breakages from code changes and feature additions.

## Overview

This system implements **8 layers of protection** from development to production monitoring:

```
Development → Pre-Commit → PR Validation → Build → Deploy → Validate → Monitor
```

## Quick Start

### Daily Development Workflow

```bash
# Before committing - hooks run automatically
git add .
git commit -m "your message"  # Pre-commit hooks validate

# Before pushing - hooks run automatically
git push  # Pre-push hooks run tests

# Deploy safely with all protections
pnpm deploy:safe

# Or use the standard deploy with validation
./scripts/deployment/deploy-safe.sh
```

### Manual Validation Commands

```bash
# Run all validations
pnpm validate:all

# Specific validations
pnpm validate:migrations        # Check migration safety
pnpm validate:migrations:safety # Detailed risk analysis
pnpm validate:graphql-contract  # Check for breaking changes

# Post-deploy validation
pnpm test:post-deploy:prod      # Validate production
pnpm deploy:validate            # Validate with fail-fast
```

## System Components

### 1. Pre-Commit Hooks (`.husky/`)

Runs automatically on every commit:

- **lint-staged**: Lints and formats modified files
- **Migration validation**: Checks for safe migration patterns
- **TypeScript check**: Cached for speed

```bash
# Bypass (not recommended)
git commit --no-verify
```

### 2. Pre-Push Hooks (`.husky/`)

Runs automatically before pushing:

- Full TypeScript check
- Unit tests
- GraphQL schema validation

### 3. Migration Validation (`scripts/deployment/validate-migrations.sh`)

Checks for:

- Duplicate migration numbers
- Destructive operations without acknowledgment
- NOT NULL without DEFAULT
- Missing down migrations
- SQL injection patterns

```bash
# Run manually
pnpm validate:migrations

# Mark destructive migration as acknowledged
# Add comment to migration file:
// DESTRUCTIVE: Dropping legacy column after data migration verified
```

### 4. Migration Safety Analysis (`scripts/deployment/migration-safety-check.ts`)

Analyzes risk levels:

| Risk Level | Examples |
|------------|----------|
| CRITICAL | DROP TABLE, TRUNCATE, DELETE without WHERE |
| HIGH | DROP COLUMN, ALTER TYPE, DROP INDEX |
| MEDIUM | NOT NULL without DEFAULT, RENAME COLUMN |
| LOW | CREATE INDEX (without CONCURRENTLY) |

```bash
# Run analysis
pnpm validate:migrations:safety

# Strict mode (fail on HIGH risk)
npx tsx scripts/deployment/migration-safety-check.ts --strict
```

### 5. GraphQL Contract Check (`scripts/deployment/graphql-contract-check.ts`)

Detects breaking changes to the GraphQL API:

- Field removals
- Type changes
- Argument changes
- Enum value changes

```bash
# Check for breaking changes
pnpm validate:graphql-contract

# Update baseline after intentional changes
pnpm validate:graphql-contract:update
```

### 6. Post-Deploy Validation (`scripts/deployment/post-deploy-validation.ts`)

Comprehensive checks after deployment:

- **API Health**: Health endpoint, GraphQL introspection
- **Pages**: Homepage, login, dashboard, etc.
- **Assets**: JS bundles, CSS files
- **Performance**: Response times
- **User Journeys**: Critical paths work
- **Security**: Required headers present

```bash
# Run against production
pnpm test:post-deploy:prod

# With verbose output
pnpm test:post-deploy:verbose

# Output JSON for CI
pnpm test:post-deploy -- --json
```

### 7. Deployment Tracking (`scripts/deployment/deployment-tracker.ts`)

Tracks all deployments for rollback support:

```bash
# List recent deployments
pnpm deploy:track:list

# View statistics
pnpm deploy:track:stats

# Get last successful deployment
npx tsx scripts/deployment/deployment-tracker.ts last-good

# Get rollback target
npx tsx scripts/deployment/deployment-tracker.ts rollback-to
```

### 8. Automated Rollback (`scripts/deployment/auto-rollback.sh`)

Automatically reverts to last known good deployment:

```bash
# Dry run (see what would happen)
pnpm deploy:rollback:dry

# Execute rollback
pnpm deploy:rollback

# With custom reason
./scripts/deployment/auto-rollback.sh --reason "API returning 500 errors"

# Rollback to specific commit
./scripts/deployment/auto-rollback.sh --commit abc1234
```

### 9. Uptime Monitoring (`scripts/deployment/uptime-monitor.ts`)

Continuous monitoring with alerts:

```bash
# Single check
pnpm monitor:uptime

# Run as daemon (continuous)
pnpm monitor:uptime:daemon

# With Slack alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/... pnpm monitor:uptime:daemon
```

### 10. Visual Regression Testing (`e2e/visual/`)

Playwright-based screenshot comparison:

```bash
# Run visual tests
pnpm test:visual

# Update snapshots after intentional changes
pnpm test:visual:update
```

### 11. Error Tracking (`apps/api/src/lib/error-tracker.ts`)

Production error tracking with spike detection:

- Automatic error classification (critical/high/medium/low)
- Error spike detection (configurable threshold)
- Alert handlers (Slack, console, custom)
- Error statistics API

## Safe Deployment Script

The recommended way to deploy:

```bash
./scripts/deployment/deploy-safe.sh
```

This script:

1. Runs pre-flight checks (typecheck, lint, migrations)
2. Runs tests (optional with `--skip-tests`)
3. Builds the application
4. Records deployment in tracker
5. Pushes to git
6. Deploys to production via SSH
7. Runs post-deploy validation
8. Auto-rollbacks on critical failures (unless `--no-rollback`)

Options:

```bash
--skip-tests        # Skip test execution
--skip-validation   # Skip post-deploy validation
--no-rollback       # Disable automatic rollback
--dry-run           # Show what would happen
--force             # Skip confirmations
--verbose           # Detailed output
```

## GitHub Actions CI/CD

Enhanced pipeline in `.github/workflows/ci-enhanced.yml`:

### Stages

1. **Quick Checks** (2 min): Lint, typecheck, GraphQL, migrations
2. **Security** (parallel): npm audit, Gitleaks, migration safety
3. **Unit Tests** (parallel): Frontend tests with coverage
4. **API Tests** (parallel): With real PostgreSQL and Redis
5. **Build**: Full build with bundle size check
6. **E2E Tests** (PR only): Playwright tests
7. **Visual Regression** (PR only): Screenshot comparison
8. **Deploy** (main only): With validation and auto-rollback
9. **PR Comment**: Status summary on PRs

## Configuration

### Environment Variables

```bash
# Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# Deployment timeout
DEPLOY_TIMEOUT=600

# API URL for validation
BASE_URL=https://musclemap.me
```

### Thresholds

Edit in respective scripts:

| Metric | Default | File |
|--------|---------|------|
| Error spike | 10/min | error-tracker.ts |
| API timeout | 500ms | post-deploy-validation.ts |
| Page timeout | 2000ms | post-deploy-validation.ts |
| Bundle budget | 500KB | ci-enhanced.yml |

## Directory Structure

```
scripts/deployment/
├── README.md                    # This file
├── validate-migrations.sh       # Migration validation
├── migration-safety-check.ts    # Migration risk analysis
├── graphql-contract-check.ts    # Breaking change detection
├── post-deploy-validation.ts    # Post-deploy checks
├── deployment-tracker.ts        # Deployment history
├── auto-rollback.sh            # Automated rollback
├── deploy-safe.sh              # Safe deployment wrapper
├── deploy-preview.sh           # Preview environments
└── uptime-monitor.ts           # Continuous monitoring

.husky/
├── pre-commit                   # Pre-commit hooks
└── pre-push                     # Pre-push hooks

.github/workflows/
└── ci-enhanced.yml              # Enhanced CI/CD pipeline

e2e/visual/
└── critical-pages.spec.ts       # Visual regression tests

apps/api/src/lib/
└── error-tracker.ts             # Production error tracking

playwright.visual.config.ts      # Visual testing config
```

## Troubleshooting

### Pre-commit hook failing

```bash
# Check what's failing
./scripts/deployment/validate-migrations.sh

# Fix lint issues
pnpm lint --fix

# Bypass (not recommended)
git commit --no-verify
```

### Deployment validation failing

```bash
# Check specific validation
pnpm test:post-deploy:verbose

# Check server logs
ssh -p 2222 root@musclemap.me "pm2 logs musclemap --lines 50"

# Check API health
curl https://musclemap.me/health
```

### Need to rollback

```bash
# See current state
pnpm deploy:track:list

# Dry run rollback
pnpm deploy:rollback:dry

# Execute rollback
pnpm deploy:rollback
```

### Visual tests failing

```bash
# View report
open playwright-report/visual/index.html

# Update snapshots if intentional
pnpm test:visual:update
```

## Best Practices

1. **Never bypass pre-commit hooks** without a good reason
2. **Always check deployment status** after deploying
3. **Use `--dry-run`** for unfamiliar commands
4. **Review migration warnings** even if they don't fail
5. **Update visual snapshots** when UI changes are intentional
6. **Monitor uptime** after major deployments
7. **Test in preview environment** for risky changes

## Contributing

When adding new validation:

1. Add script to `scripts/deployment/`
2. Add npm script to `package.json`
3. Add to CI pipeline if appropriate
4. Document in this README
5. Add to pre-commit/pre-push if fast enough
