# MuscleMap Deployment Protection Plan

## Executive Summary

This plan addresses the need for a robust system to prevent feature additions and code changes from breaking the live site. The solution implements a **multi-layer defense strategy** with validation gates at every stage of the development-to-production pipeline.

## Current State Analysis

### What's Working Well
- GitHub Actions CI/CD with lint, typecheck, test, security scan
- Pre-commit hooks (Gitleaks, typecheck, lint)
- Comprehensive test harness (230+ tests)
- Frontend health check script
- Memory-safe build system
- PM2 process management

### Critical Gaps Identified
1. **No staging environment** - Code goes directly from local → production
2. **Minimal post-deploy validation** - Only HTTP 200 check after deploy
3. **No visual regression testing** - Can't detect CSS/layout breakages
4. **No canary deployments** - All traffic hits new code immediately
5. **No automated rollback** - Manual intervention required on failure
6. **Pre-commit tests are optional** - Developers can bypass with `--no-verify`
7. **No database migration validation** - Migrations can break production data
8. **No API contract testing** - GraphQL schema changes can break clients

---

## Architecture: Multi-Layer Defense System

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DEVELOPMENT PHASE                                │
├─────────────────────────────────────────────────────────────────────────┤
│  Layer 1: IDE/Editor (Real-time)                                        │
│    → TypeScript errors shown immediately                                │
│    → ESLint warnings as you type                                        │
│    → Prettier format on save                                            │
├─────────────────────────────────────────────────────────────────────────┤
│  Layer 2: Pre-Commit Hooks (Mandatory)                                  │
│    → Fast typecheck (cached)                                            │
│    → Lint modified files only                                           │
│    → Security scan (Gitleaks)                                           │
│    → Migration number validation                                        │
│    → GraphQL schema validation                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           CI/CD PHASE                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Layer 3: Pull Request Validation (Blocking)                            │
│    → Full typecheck across all packages                                 │
│    → Unit test suite with coverage threshold                            │
│    → Build verification (packages, API, frontend)                       │
│    → Bundle size budget enforcement                                     │
│    → Security audit (npm audit + secret scan)                           │
│    → GraphQL breaking change detection                                  │
│    → Database migration dry-run                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Layer 4: Preview Environment (Automatic)                               │
│    → Ephemeral deployment per PR                                        │
│    → Full stack with isolated database                                  │
│    → Visual regression tests (Playwright + Percy)                       │
│    → E2E test harness against preview                                   │
│    → Performance benchmarks (Lighthouse CI)                             │
│    → Accessibility audit (axe-core)                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DEPLOYMENT PHASE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  Layer 5: Pre-Production Gate (Final Check)                             │
│    → All PR checks must pass                                            │
│    → Required reviewer approval                                         │
│    → No pending migrations with data loss                               │
│    → API contract compatibility verified                                │
├─────────────────────────────────────────────────────────────────────────┤
│  Layer 6: Progressive Deployment (Canary)                               │
│    → Deploy to canary instance (10% traffic)                            │
│    → Monitor error rates for 5 minutes                                  │
│    → Automated rollback if error rate > 1%                              │
│    → Full rollout if canary passes                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  Layer 7: Post-Deploy Validation (Automated)                            │
│    → API health check (database, Redis, services)                       │
│    → Frontend health check (all critical pages)                         │
│    → GraphQL introspection verification                                 │
│    → Critical user journey smoke tests                                  │
│    → Performance baseline comparison                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         MONITORING PHASE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  Layer 8: Production Monitoring (Continuous)                            │
│    → Real-time error tracking (Sentry-like)                             │
│    → Performance anomaly detection                                      │
│    → Uptime monitoring with instant alerts                              │
│    → User experience metrics (Core Web Vitals)                          │
│    → Automated incident response                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Implementation Plan

### Phase 1: Enhanced Pre-Commit Validation (Week 1)

#### 1.1 Mandatory Pre-Commit Hooks

Create `.husky/pre-commit` with enforced checks:

```bash
#!/bin/bash
# Prevent bypassing with --no-verify in CI
if [ "$CI" = "true" ]; then
  exit 0
fi

# Fast fail on critical issues
set -e

echo "🔍 Running pre-commit validation..."

# 1. Staged files only lint (fast)
npx lint-staged

# 2. TypeScript check (cached)
./scripts/pre-deploy-check.sh --fast

# 3. Migration number validation
./scripts/validate-migrations.sh

# 4. GraphQL schema validation
pnpm validate:graphql

# 5. No secrets committed
npx gitleaks protect --staged --no-banner

echo "✅ Pre-commit checks passed"
```

#### 1.2 lint-staged Configuration

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix --max-warnings=0",
      "prettier --write"
    ],
    "*.{js,jsx}": [
      "eslint --fix --max-warnings=0",
      "prettier --write"
    ],
    "apps/api/src/db/migrations/*.ts": [
      "./scripts/validate-migrations.sh"
    ],
    "*.graphql": [
      "pnpm validate:graphql"
    ]
  }
}
```

#### 1.3 New Validation Scripts

**scripts/validate-migrations.sh:**
```bash
#!/bin/bash
# Validates migration files for safety

MIGRATIONS_DIR="apps/api/src/db/migrations"

# Check for duplicate migration numbers
DUPES=$(ls "$MIGRATIONS_DIR"/*.ts 2>/dev/null | xargs -I {} basename {} | \
  sed 's/_.*//' | sort | uniq -d)

if [ -n "$DUPES" ]; then
  echo "❌ Duplicate migration numbers found: $DUPES"
  exit 1
fi

# Check for destructive operations without confirmation
for file in "$MIGRATIONS_DIR"/*.ts; do
  if grep -qE "(DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM)" "$file"; then
    if ! grep -q "DESTRUCTIVE" "$file"; then
      echo "❌ Destructive migration without DESTRUCTIVE marker: $(basename $file)"
      echo "   Add '// DESTRUCTIVE: <reason>' comment to acknowledge"
      exit 1
    fi
  fi
done

echo "✅ Migration validation passed"
```

---

### Phase 2: Preview/Staging Environment (Week 2)

#### 2.1 Vercel-Style Preview Deployments

Since we're on a single VPS, implement lightweight preview deployments:

**Option A: Docker-based Preview (Recommended for VPS)**

```yaml
# docker-compose.preview.yml
version: '3.8'
services:
  preview-${PR_NUMBER}:
    build: .
    environment:
      - DATABASE_URL=postgresql://musclemap:${DB_PASS}@postgres:5432/preview_${PR_NUMBER}
      - NODE_ENV=preview
      - PORT=300${PR_NUMBER}
    ports:
      - "300${PR_NUMBER}:3001"
    depends_on:
      - postgres
```

**Option B: Subdomain-based Preview (Simpler)**

Add to Caddy configuration:
```
pr-{$PR_NUMBER}.preview.musclemap.me {
    reverse_proxy localhost:300{$PR_NUMBER}
}
```

#### 2.2 GitHub Actions Preview Workflow

**.github/workflows/preview.yml:**
```yaml
name: Preview Deployment

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    environment:
      name: preview-${{ github.event.pull_request.number }}
      url: https://pr-${{ github.event.pull_request.number }}.preview.musclemap.me

    steps:
      - uses: actions/checkout@v4

      - name: Deploy Preview
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: root
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          port: 2222
          script: |
            cd /var/www/musclemap.me
            ./scripts/deploy-preview.sh ${{ github.event.pull_request.number }}

      - name: Run E2E Tests Against Preview
        run: |
          pnpm test:e2e:api --base-url https://pr-${{ github.event.pull_request.number }}.preview.musclemap.me

      - name: Visual Regression Tests
        run: |
          pnpm test:visual --base-url https://pr-${{ github.event.pull_request.number }}.preview.musclemap.me

      - name: Comment Preview URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Preview deployed: https://pr-${{ github.event.pull_request.number }}.preview.musclemap.me'
            })
```

---

### Phase 3: Visual Regression Testing (Week 2-3)

#### 3.1 Playwright Visual Testing Setup

**playwright.visual.config.ts:**
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/visual',
  snapshotPathTemplate: '{testDir}/__snapshots__/{projectName}/{testFilePath}/{arg}{ext}',

  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01, // 1% difference allowed
      threshold: 0.2,
    },
  },

  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        viewport: { width: 1280, height: 720 },
        browserName: 'chromium',
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        viewport: { width: 375, height: 667 },
        browserName: 'webkit',
        isMobile: true,
      },
    },
  ],
});
```

**e2e/visual/critical-pages.spec.ts:**
```typescript
import { test, expect } from '@playwright/test';

const CRITICAL_PAGES = [
  { name: 'homepage', path: '/' },
  { name: 'login', path: '/login' },
  { name: 'dashboard', path: '/dashboard' },
  { name: 'profile', path: '/profile' },
  { name: 'workout', path: '/workout' },
  { name: 'journey', path: '/journey' },
];

for (const page of CRITICAL_PAGES) {
  test(`visual regression: ${page.name}`, async ({ page: browserPage }) => {
    await browserPage.goto(page.path);
    await browserPage.waitForLoadState('networkidle');

    // Wait for React hydration
    await browserPage.waitForSelector('#root:not(:empty)', { timeout: 10000 });

    // Take full page screenshot
    await expect(browserPage).toHaveScreenshot(`${page.name}.png`, {
      fullPage: true,
      animations: 'disabled',
    });
  });
}
```

#### 3.2 Component Visual Testing

**e2e/visual/components.spec.ts:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Critical Components', () => {
  test('muscle visualization renders correctly', async ({ page }) => {
    await page.goto('/workout');
    await page.waitForSelector('.muscle-visualization', { timeout: 10000 });

    const visualization = page.locator('.muscle-visualization');
    await expect(visualization).toHaveScreenshot('muscle-viz.png');
  });

  test('navigation renders correctly', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    await expect(nav).toHaveScreenshot('navigation.png');
  });

  test('workout card renders correctly', async ({ page }) => {
    await page.goto('/dashboard');
    const card = page.locator('.workout-card').first();
    await expect(card).toHaveScreenshot('workout-card.png');
  });
});
```

---

### Phase 4: API Contract Testing (Week 3)

#### 4.1 GraphQL Schema Change Detection

**scripts/graphql-contract-check.ts:**
```typescript
#!/usr/bin/env npx tsx
import { buildSchema, findBreakingChanges, findDangerousChanges } from 'graphql';
import { readFileSync, existsSync } from 'fs';

const BASELINE_SCHEMA_PATH = '.graphql-baseline/schema.graphql';
const CURRENT_SCHEMA_PATH = 'apps/api/src/graphql/schema.graphql';

async function main() {
  // Get current schema
  const currentSchema = buildSchema(readFileSync(CURRENT_SCHEMA_PATH, 'utf-8'));

  // Get baseline schema (from main branch)
  if (!existsSync(BASELINE_SCHEMA_PATH)) {
    console.log('No baseline schema found. Creating baseline...');
    // First run - create baseline
    return;
  }

  const baselineSchema = buildSchema(readFileSync(BASELINE_SCHEMA_PATH, 'utf-8'));

  // Find breaking changes
  const breakingChanges = findBreakingChanges(baselineSchema, currentSchema);
  const dangerousChanges = findDangerousChanges(baselineSchema, currentSchema);

  if (breakingChanges.length > 0) {
    console.log('❌ BREAKING CHANGES DETECTED:');
    breakingChanges.forEach(change => {
      console.log(`  - ${change.type}: ${change.description}`);
    });
    process.exit(1);
  }

  if (dangerousChanges.length > 0) {
    console.log('⚠️  DANGEROUS CHANGES DETECTED (review required):');
    dangerousChanges.forEach(change => {
      console.log(`  - ${change.type}: ${change.description}`);
    });
    // Don't fail, but warn
  }

  console.log('✅ No breaking GraphQL changes detected');
}

main();
```

#### 4.2 Database Migration Safety Check

**scripts/migration-safety-check.ts:**
```typescript
#!/usr/bin/env npx tsx
import { execSync } from 'child_process';
import { readFileSync, readdirSync } from 'fs';

interface MigrationRisk {
  file: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasons: string[];
}

const DESTRUCTIVE_PATTERNS = [
  { pattern: /DROP\s+TABLE/i, risk: 'CRITICAL', reason: 'Drops entire table' },
  { pattern: /DROP\s+COLUMN/i, risk: 'HIGH', reason: 'Drops column (data loss)' },
  { pattern: /ALTER.*TYPE/i, risk: 'HIGH', reason: 'Changes column type (possible data loss)' },
  { pattern: /TRUNCATE/i, risk: 'CRITICAL', reason: 'Truncates table (data loss)' },
  { pattern: /DELETE\s+FROM(?!.*WHERE)/i, risk: 'CRITICAL', reason: 'Deletes all rows' },
  { pattern: /NOT\s+NULL(?!.*DEFAULT)/i, risk: 'MEDIUM', reason: 'Adds NOT NULL without default' },
  { pattern: /RENAME\s+COLUMN/i, risk: 'MEDIUM', reason: 'Renames column (may break queries)' },
];

async function analyzeMigrations(): Promise<MigrationRisk[]> {
  const migrationsDir = 'apps/api/src/db/migrations';
  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.ts'));

  // Find new migrations (not in main branch)
  const mainFiles = execSync('git ls-tree -r origin/main --name-only apps/api/src/db/migrations')
    .toString()
    .split('\n')
    .filter(Boolean)
    .map(f => f.split('/').pop());

  const newMigrations = files.filter(f => !mainFiles.includes(f));

  const risks: MigrationRisk[] = [];

  for (const file of newMigrations) {
    const content = readFileSync(`${migrationsDir}/${file}`, 'utf-8');
    const fileRisks: string[] = [];
    let maxRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

    for (const { pattern, risk, reason } of DESTRUCTIVE_PATTERNS) {
      if (pattern.test(content)) {
        fileRisks.push(reason);
        if (risk === 'CRITICAL' || (risk === 'HIGH' && maxRisk !== 'CRITICAL')) {
          maxRisk = risk;
        } else if (risk === 'MEDIUM' && maxRisk === 'LOW') {
          maxRisk = risk;
        }
      }
    }

    if (fileRisks.length > 0) {
      risks.push({ file, risk: maxRisk, reasons: fileRisks });
    }
  }

  return risks;
}

async function main() {
  const risks = await analyzeMigrations();

  if (risks.length === 0) {
    console.log('✅ No risky migrations detected');
    return;
  }

  console.log('⚠️  MIGRATION RISK ASSESSMENT:\n');

  for (const { file, risk, reasons } of risks) {
    const icon = risk === 'CRITICAL' ? '🚨' : risk === 'HIGH' ? '⚠️' : '📝';
    console.log(`${icon} ${file} [${risk}]`);
    reasons.forEach(r => console.log(`   - ${r}`));
  }

  const criticalCount = risks.filter(r => r.risk === 'CRITICAL').length;
  if (criticalCount > 0) {
    console.log(`\n❌ ${criticalCount} CRITICAL migration(s) require manual review`);
    process.exit(1);
  }
}

main();
```

---

### Phase 5: Post-Deploy Validation Suite (Week 3-4)

#### 5.1 Comprehensive Post-Deploy Checks

**scripts/post-deploy-validation.ts:**
```typescript
#!/usr/bin/env npx tsx
/**
 * Comprehensive post-deploy validation suite
 * Runs automatically after every production deployment
 */

interface ValidationResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  critical: boolean;
}

const BASE_URL = process.env.BASE_URL || 'https://musclemap.me';
const results: ValidationResult[] = [];

// ============================================
// VALIDATION FUNCTIONS
// ============================================

async function validateApiHealth(): Promise<ValidationResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();

    const dbOk = data.database === 'connected' || data.database === true;
    const redisOk = data.redis === 'connected' || data.redis === true || data.redis === undefined;

    return {
      name: 'API Health',
      passed: res.ok && dbOk && redisOk,
      duration: Date.now() - start,
      error: !dbOk ? 'Database unhealthy' : !redisOk ? 'Redis unhealthy' : undefined,
      critical: true,
    };
  } catch (e) {
    return {
      name: 'API Health',
      passed: false,
      duration: Date.now() - start,
      error: String(e),
      critical: true,
    };
  }
}

async function validateGraphQL(): Promise<ValidationResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: '{ __schema { types { name } } }',
      }),
    });
    const data = await res.json();

    return {
      name: 'GraphQL Introspection',
      passed: res.ok && data.data?.__schema?.types?.length > 0,
      duration: Date.now() - start,
      error: data.errors?.[0]?.message,
      critical: true,
    };
  } catch (e) {
    return {
      name: 'GraphQL Introspection',
      passed: false,
      duration: Date.now() - start,
      error: String(e),
      critical: true,
    };
  }
}

async function validateCriticalPages(): Promise<ValidationResult[]> {
  const pages = ['/', '/login', '/dashboard', '/profile', '/workout'];
  const results: ValidationResult[] = [];

  for (const page of pages) {
    const start = Date.now();
    try {
      const res = await fetch(`${BASE_URL}${page}`);
      const html = await res.text();

      const hasRoot = html.includes('id="root"');
      const hasJs = html.includes('.js');
      const notBlank = html.length > 1000;

      results.push({
        name: `Page: ${page}`,
        passed: res.ok && hasRoot && hasJs && notBlank,
        duration: Date.now() - start,
        error: !hasRoot ? 'Missing React root' : !hasJs ? 'Missing JS bundle' : !notBlank ? 'Page too short' : undefined,
        critical: page === '/' || page === '/login',
      });
    } catch (e) {
      results.push({
        name: `Page: ${page}`,
        passed: false,
        duration: Date.now() - start,
        error: String(e),
        critical: page === '/' || page === '/login',
      });
    }
  }

  return results;
}

async function validateCriticalUserJourney(): Promise<ValidationResult> {
  const start = Date.now();
  try {
    // Test: Can fetch exercises (public endpoint)
    const exercisesRes = await fetch(`${BASE_URL}/api/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: '{ exercises(limit: 1) { id name } }',
      }),
    });
    const exercisesData = await exercisesRes.json();

    if (!exercisesData.data?.exercises?.length) {
      return {
        name: 'Critical User Journey',
        passed: false,
        duration: Date.now() - start,
        error: 'Cannot fetch exercises',
        critical: true,
      };
    }

    return {
      name: 'Critical User Journey',
      passed: true,
      duration: Date.now() - start,
      critical: true,
    };
  } catch (e) {
    return {
      name: 'Critical User Journey',
      passed: false,
      duration: Date.now() - start,
      error: String(e),
      critical: true,
    };
  }
}

async function validatePerformance(): Promise<ValidationResult> {
  const start = Date.now();
  try {
    // Measure API response time
    const apiStart = Date.now();
    await fetch(`${BASE_URL}/health`);
    const apiTime = Date.now() - apiStart;

    // Measure page load time
    const pageStart = Date.now();
    await fetch(`${BASE_URL}/`);
    const pageTime = Date.now() - pageStart;

    const passed = apiTime < 500 && pageTime < 2000;

    return {
      name: 'Performance Baseline',
      passed,
      duration: Date.now() - start,
      error: !passed ? `API: ${apiTime}ms, Page: ${pageTime}ms (too slow)` : undefined,
      critical: false,
    };
  } catch (e) {
    return {
      name: 'Performance Baseline',
      passed: false,
      duration: Date.now() - start,
      error: String(e),
      critical: false,
    };
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('🔍 Running post-deploy validation...\n');
  console.log(`Target: ${BASE_URL}\n`);

  // Run all validations
  results.push(await validateApiHealth());
  results.push(await validateGraphQL());
  results.push(...await validateCriticalPages());
  results.push(await validateCriticalUserJourney());
  results.push(await validatePerformance());

  // Report results
  console.log('Results:');
  console.log('─'.repeat(60));

  for (const result of results) {
    const icon = result.passed ? '✅' : result.critical ? '❌' : '⚠️';
    const time = `(${result.duration}ms)`;
    console.log(`${icon} ${result.name} ${time}`);
    if (result.error) {
      console.log(`   └─ ${result.error}`);
    }
  }

  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed);
  const criticalFailed = failed.filter(r => r.critical);

  console.log('\n' + '═'.repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed.length}`);

  if (criticalFailed.length > 0) {
    console.log(`\n🚨 ${criticalFailed.length} CRITICAL FAILURE(S) - ROLLBACK RECOMMENDED`);
    process.exit(1);
  } else if (failed.length > 0) {
    console.log(`\n⚠️  ${failed.length} non-critical failure(s) - monitor closely`);
    process.exit(0);
  } else {
    console.log('\n✅ ALL VALIDATIONS PASSED');
    process.exit(0);
  }
}

main();
```

---

### Phase 6: Automated Rollback System (Week 4)

#### 6.1 Deployment Tracking

**scripts/deployment-tracker.ts:**
```typescript
#!/usr/bin/env npx tsx
import { readFileSync, writeFileSync, existsSync } from 'fs';

interface Deployment {
  id: string;
  timestamp: string;
  commitHash: string;
  commitMessage: string;
  deployer: string;
  status: 'pending' | 'success' | 'failed' | 'rolled_back';
  validationResults?: {
    passed: number;
    failed: number;
    criticalFailed: number;
  };
}

const DEPLOYMENTS_FILE = '/var/www/musclemap.me/.deployments.json';

export function recordDeployment(deployment: Partial<Deployment>): string {
  const deployments = getDeployments();
  const id = `deploy-${Date.now()}`;

  const newDeployment: Deployment = {
    id,
    timestamp: new Date().toISOString(),
    commitHash: deployment.commitHash || 'unknown',
    commitMessage: deployment.commitMessage || '',
    deployer: deployment.deployer || 'system',
    status: 'pending',
  };

  deployments.unshift(newDeployment);

  // Keep only last 50 deployments
  const trimmed = deployments.slice(0, 50);
  writeFileSync(DEPLOYMENTS_FILE, JSON.stringify(trimmed, null, 2));

  return id;
}

export function updateDeploymentStatus(id: string, status: Deployment['status'], validationResults?: Deployment['validationResults']) {
  const deployments = getDeployments();
  const deployment = deployments.find(d => d.id === id);

  if (deployment) {
    deployment.status = status;
    if (validationResults) {
      deployment.validationResults = validationResults;
    }
    writeFileSync(DEPLOYMENTS_FILE, JSON.stringify(deployments, null, 2));
  }
}

export function getLastSuccessfulDeployment(): Deployment | null {
  const deployments = getDeployments();
  return deployments.find(d => d.status === 'success') || null;
}

function getDeployments(): Deployment[] {
  if (!existsSync(DEPLOYMENTS_FILE)) {
    return [];
  }
  return JSON.parse(readFileSync(DEPLOYMENTS_FILE, 'utf-8'));
}
```

#### 6.2 Automated Rollback Script

**scripts/auto-rollback.sh:**
```bash
#!/bin/bash
# Automated rollback to last known good deployment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENTS_FILE="/var/www/musclemap.me/.deployments.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔄 INITIATING AUTOMATED ROLLBACK${NC}"
echo "=================================="

# Get last successful deployment
LAST_GOOD_COMMIT=$(cat "$DEPLOYMENTS_FILE" | jq -r '[.[] | select(.status == "success")][0].commitHash // empty')

if [ -z "$LAST_GOOD_COMMIT" ]; then
    echo -e "${RED}❌ No successful deployment found to roll back to${NC}"
    exit 1
fi

echo -e "Rolling back to: ${GREEN}$LAST_GOOD_COMMIT${NC}"

# Stop API to prevent serving broken requests
echo "Stopping API..."
pm2 stop musclemap 2>/dev/null || true

# Reset to last good commit
echo "Resetting to last good commit..."
cd /var/www/musclemap.me
git fetch origin
git reset --hard "$LAST_GOOD_COMMIT"

# Reinstall dependencies (in case they changed)
echo "Reinstalling dependencies..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# Rebuild
echo "Rebuilding..."
pnpm build:all

# Start API
echo "Starting API..."
pm2 start musclemap

# Verify rollback
echo "Verifying rollback..."
sleep 5
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://musclemap.me/health)

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Rollback successful - site is live${NC}"

    # Update deployment tracker
    npx tsx "$SCRIPT_DIR/deployment-tracker.ts" mark-rolled-back
else
    echo -e "${RED}❌ Rollback verification failed (HTTP $HTTP_STATUS)${NC}"
    echo "Manual intervention required"
    exit 1
fi
```

---

### Phase 7: Enhanced GitHub Actions Workflow (Week 4-5)

#### 7.1 Comprehensive CI/CD Pipeline

**.github/workflows/ci-enhanced.yml:**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '9'

jobs:
  # ==========================================
  # STAGE 1: QUICK CHECKS (< 2 min)
  # ==========================================
  quick-checks:
    name: Quick Checks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: TypeScript Check
        run: pnpm typecheck

      - name: GraphQL Validation
        run: pnpm validate:graphql

      - name: Migration Validation
        run: ./scripts/validate-migrations.sh

  # ==========================================
  # STAGE 2: TESTS (Parallel)
  # ==========================================
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: quick-checks
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm test -- --coverage
        env:
          JWT_SECRET: test-secret-for-ci-only-32-chars!

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          fail_ci_if_error: false

  api-tests:
    name: API Tests
    runs-on: ubuntu-latest
    needs: quick-checks
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: musclemap_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm build:packages
      - run: pnpm -C apps/api build

      - name: Run migrations
        run: pnpm -C apps/api db:migrate
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/musclemap_test

      - name: Run API tests
        run: pnpm test:api
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/musclemap_test
          JWT_SECRET: test-secret-for-ci-only-32-chars!

  # ==========================================
  # STAGE 3: BUILD & BUNDLE ANALYSIS
  # ==========================================
  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [unit-tests, api-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm build:all

      - name: Bundle Size Check
        run: |
          MAIN_SIZE=$(stat -f%z dist/assets/index-*.js 2>/dev/null || stat -c%s dist/assets/index-*.js)
          MAIN_SIZE_KB=$((MAIN_SIZE / 1024))
          echo "Main bundle: ${MAIN_SIZE_KB}KB"

          if [ $MAIN_SIZE_KB -gt 500 ]; then
            echo "❌ Bundle too large: ${MAIN_SIZE_KB}KB > 500KB"
            exit 1
          fi

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: |
            dist/
            apps/api/dist/
          retention-days: 7

  # ==========================================
  # STAGE 4: SECURITY SCAN
  # ==========================================
  security:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: quick-checks
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: NPM Audit
        run: pnpm audit --audit-level=high
        continue-on-error: true

      - name: Gitleaks Secret Scan
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  # ==========================================
  # STAGE 5: E2E TESTS (on PR only)
  # ==========================================
  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: build

      - name: Start server
        run: |
          pnpm preview &
          sleep 5

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Run Visual Regression
        run: pnpm test:visual

  # ==========================================
  # STAGE 6: DEPLOY (main branch only)
  # ==========================================
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [build, security]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment:
      name: production
      url: https://musclemap.me

    steps:
      - uses: actions/checkout@v4

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: root
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          port: 2222
          script: |
            set -e
            cd /var/www/musclemap.me

            # Record deployment start
            DEPLOY_ID=$(date +%s)
            echo "{\"id\": \"$DEPLOY_ID\", \"status\": \"in_progress\", \"commit\": \"${{ github.sha }}\"}" > /tmp/current-deploy.json

            # Deploy
            git fetch origin main
            git reset --hard origin/main
            pnpm install --frozen-lockfile 2>/dev/null || pnpm install
            pnpm build:safe

            echo "Deployment complete, validating..."

      - name: Post-Deploy Validation
        run: |
          sleep 10
          npx tsx scripts/post-deploy-validation.ts
        env:
          BASE_URL: https://musclemap.me

      - name: Run Smoke Tests
        run: |
          pnpm test:harness --category core --fail-fast
        env:
          BASE_URL: https://musclemap.me

      - name: Auto-Rollback on Failure
        if: failure()
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: root
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          port: 2222
          script: |
            cd /var/www/musclemap.me
            ./scripts/auto-rollback.sh
```

---

### Phase 8: Monitoring & Alerting (Week 5)

#### 8.1 Production Error Tracking

**apps/api/src/lib/error-tracker.ts:**
```typescript
import { FastifyRequest, FastifyReply } from 'fastify';

interface ErrorEvent {
  timestamp: string;
  type: string;
  message: string;
  stack?: string;
  url?: string;
  method?: string;
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const recentErrors: ErrorEvent[] = [];
const ERROR_THRESHOLD = 10; // errors per minute
const ALERT_COOLDOWN = 5 * 60 * 1000; // 5 minutes

let lastAlertTime = 0;

export function trackError(error: Error, request?: FastifyRequest) {
  const event: ErrorEvent = {
    timestamp: new Date().toISOString(),
    type: error.name,
    message: error.message,
    stack: error.stack,
    url: request?.url,
    method: request?.method,
    userId: (request as any)?.user?.id,
    severity: classifyError(error),
  };

  recentErrors.push(event);

  // Keep only last 100 errors
  if (recentErrors.length > 100) {
    recentErrors.shift();
  }

  // Check for error spike
  checkErrorRate();

  return event;
}

function classifyError(error: Error): ErrorEvent['severity'] {
  const message = error.message.toLowerCase();

  if (message.includes('database') || message.includes('connection')) {
    return 'critical';
  }
  if (message.includes('auth') || message.includes('unauthorized')) {
    return 'high';
  }
  if (message.includes('validation') || message.includes('not found')) {
    return 'low';
  }
  return 'medium';
}

function checkErrorRate() {
  const oneMinuteAgo = Date.now() - 60 * 1000;
  const recentCount = recentErrors.filter(
    e => new Date(e.timestamp).getTime() > oneMinuteAgo
  ).length;

  if (recentCount >= ERROR_THRESHOLD && Date.now() - lastAlertTime > ALERT_COOLDOWN) {
    lastAlertTime = Date.now();
    triggerAlert(recentCount);
  }
}

async function triggerAlert(errorCount: number) {
  console.error(`🚨 ERROR SPIKE DETECTED: ${errorCount} errors in the last minute`);

  // Could integrate with:
  // - Slack webhook
  // - PagerDuty
  // - Email notification
  // - Discord webhook
}

export function getErrorStats() {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const hourlyErrors = recentErrors.filter(
    e => new Date(e.timestamp).getTime() > oneHourAgo
  );

  return {
    total: recentErrors.length,
    lastHour: hourlyErrors.length,
    bySeverity: {
      critical: hourlyErrors.filter(e => e.severity === 'critical').length,
      high: hourlyErrors.filter(e => e.severity === 'high').length,
      medium: hourlyErrors.filter(e => e.severity === 'medium').length,
      low: hourlyErrors.filter(e => e.severity === 'low').length,
    },
  };
}
```

#### 8.2 Uptime Monitoring Script

**scripts/uptime-monitor.ts:**
```typescript
#!/usr/bin/env npx tsx
/**
 * Simple uptime monitor that runs as a cron job
 * Alerts if site goes down
 */

const ENDPOINTS = [
  { url: 'https://musclemap.me/health', name: 'API Health' },
  { url: 'https://musclemap.me/', name: 'Homepage' },
  { url: 'https://musclemap.me/api/graphql', name: 'GraphQL', method: 'POST', body: '{"query":"{ __typename }"}' },
];

const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;
const STATUS_FILE = '/tmp/musclemap-uptime.json';

interface StatusEntry {
  url: string;
  lastCheck: string;
  status: 'up' | 'down';
  downSince?: string;
  lastError?: string;
}

async function checkEndpoint(endpoint: typeof ENDPOINTS[0]): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(endpoint.url, {
      method: endpoint.method || 'GET',
      headers: endpoint.body ? { 'Content-Type': 'application/json' } : {},
      body: endpoint.body,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    return { ok: response.ok, error: response.ok ? undefined : `HTTP ${response.status}` };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function sendAlert(message: string) {
  console.log(`ALERT: ${message}`);

  if (SLACK_WEBHOOK) {
    await fetch(SLACK_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
  }
}

async function main() {
  const results: StatusEntry[] = [];

  for (const endpoint of ENDPOINTS) {
    const result = await checkEndpoint(endpoint);
    const entry: StatusEntry = {
      url: endpoint.url,
      lastCheck: new Date().toISOString(),
      status: result.ok ? 'up' : 'down',
      lastError: result.error,
    };

    if (!result.ok) {
      entry.downSince = new Date().toISOString();
      await sendAlert(`🚨 ${endpoint.name} is DOWN: ${result.error}`);
    }

    results.push(entry);
  }

  // Write status file for dashboard
  const fs = await import('fs');
  fs.writeFileSync(STATUS_FILE, JSON.stringify(results, null, 2));

  // Exit with error if any endpoint is down
  const anyDown = results.some(r => r.status === 'down');
  process.exit(anyDown ? 1 : 0);
}

main();
```

---

## Implementation Timeline

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Pre-Commit Enhancement | Mandatory hooks, lint-staged, migration validation |
| 2 | Preview Environment | Docker/subdomain preview, GitHub workflow |
| 2-3 | Visual Regression | Playwright visual tests, component snapshots |
| 3 | API Contract Testing | GraphQL breaking change detection, migration safety |
| 3-4 | Post-Deploy Validation | Comprehensive validation suite, smoke tests |
| 4 | Automated Rollback | Deployment tracking, auto-rollback script |
| 4-5 | Enhanced CI/CD | Multi-stage pipeline, parallel jobs |
| 5 | Monitoring & Alerting | Error tracking, uptime monitoring, alerts |

---

## Success Metrics

After implementation, measure:

| Metric | Target | Measurement |
|--------|--------|-------------|
| Deployment success rate | >99% | Successful deploys / Total deploys |
| Time to rollback | <2 min | Time from failure detection to rollback |
| Production incidents | <1/month | Incidents requiring manual intervention |
| Mean time to recovery | <5 min | Time from incident to resolution |
| Test coverage | >80% | Lines covered / Total lines |
| Build time | <5 min | CI pipeline duration |
| Preview deployment time | <3 min | PR → Preview URL available |

---

## Quick Wins (Implement First)

1. **Add mandatory lint-staged** (30 min)
2. **Add migration validation to pre-commit** (1 hour)
3. **Create post-deploy validation script** (2 hours)
4. **Add smoke tests to deploy workflow** (1 hour)
5. **Create auto-rollback script** (2 hours)

These 5 items alone will catch most production-breaking changes.

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Preview env database conflicts | Use isolated database per PR |
| Visual regression false positives | Set appropriate diff thresholds |
| Slow CI pipeline | Parallelize tests, cache dependencies |
| Rollback breaks data | Use backward-compatible migrations only |
| Alert fatigue | Tune thresholds, aggregate similar errors |

---

## Maintenance

- **Weekly**: Review failed deployments, tune thresholds
- **Monthly**: Update visual regression baselines
- **Quarterly**: Review and update test coverage targets
- **Yearly**: Evaluate tooling, consider alternatives

---

## Appendix: Files to Create

```
scripts/
├── validate-migrations.sh          # Migration safety checks
├── graphql-contract-check.ts       # GraphQL breaking change detection
├── migration-safety-check.ts       # Migration risk assessment
├── post-deploy-validation.ts       # Comprehensive post-deploy checks
├── deployment-tracker.ts           # Track deployment history
├── auto-rollback.sh                # Automated rollback
├── uptime-monitor.ts               # Continuous uptime monitoring
└── deploy-preview.sh               # Preview environment deployment

.github/workflows/
├── ci-enhanced.yml                 # Multi-stage CI/CD pipeline
└── preview.yml                     # Preview deployment workflow

e2e/
└── visual/
    ├── critical-pages.spec.ts      # Visual regression tests
    └── components.spec.ts          # Component visual tests

apps/api/src/lib/
└── error-tracker.ts                # Production error tracking

.husky/
└── pre-commit                      # Enhanced pre-commit hooks

playwright.visual.config.ts         # Visual testing configuration
```

This plan provides a comprehensive, multi-layered defense system against production breakages while remaining practical for a single-server deployment.
