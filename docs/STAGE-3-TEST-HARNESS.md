# Stage 3: Exhaustive Test Harness & Scripting System

**Generated:** 2026-01-14
**Status:** Complete

## Overview

This document defines a comprehensive testing harness with a domain-specific scripting language that enables exhaustive feature coverage testing across all user personas and scenarios.

---

## 1. Test Harness Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Test Orchestrator                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │   Script    │  │   Persona    │  │      Result             │ │
│  │   Parser    │  │   Manager    │  │      Collector          │ │
│  └─────────────┘  └──────────────┘  └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │   Action    │  │   Assertion  │  │      Scorecard          │ │
│  │   Executor  │  │   Engine     │  │      Generator          │ │
│  └─────────────┘  └──────────────┘  └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                    API Client Layer                              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │    REST     │  │   GraphQL    │  │      WebSocket          │ │
│  │   Client    │  │   Client     │  │      Client             │ │
│  └─────────────┘  └──────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
scripts/
├── test-harness/
│   ├── index.ts                 # Main entry point
│   ├── orchestrator.ts          # Test orchestration
│   ├── parser.ts                # Script parser
│   ├── executor.ts              # Action executor
│   ├── assertions.ts            # Assertion engine
│   ├── personas.ts              # Persona management
│   ├── scorecard.ts             # Result aggregation
│   ├── reporters/
│   │   ├── console.ts           # Console output
│   │   ├── json.ts              # JSON export
│   │   └── dashboard.ts         # Dashboard integration
│   ├── actions/
│   │   ├── auth.ts              # Authentication actions
│   │   ├── workout.ts           # Workout actions
│   │   ├── economy.ts           # Economy actions
│   │   ├── social.ts            # Social actions
│   │   └── admin.ts             # Admin actions
│   └── scripts/
│       ├── core-journeys.yaml   # Core user journeys
│       ├── edge-cases.yaml      # Edge case scenarios
│       ├── security.yaml        # Security tests
│       └── performance.yaml     # Performance tests
```

---

## 2. Test Script Language (TSL)

### Script Format (YAML)

```yaml
# Test Script Language v1.0
name: "Core User Journey"
description: "Tests complete user flow from registration to first workout"
version: "1.0.0"
tags: ["core", "critical", "user-journey"]

# Persona to use (or create new)
persona:
  use: "nova_fresh"  # Use predefined persona
  # OR create inline
  create:
    username: "test_{{timestamp}}"
    email: "test_{{timestamp}}@test.com"

# Environment requirements
requires:
  database: true
  redis: optional

# Global timeout (ms)
timeout: 60000

# Variables available throughout test
variables:
  workoutId: null
  creditsEarned: null

# Test steps
steps:
  - id: "register"
    action: "auth.register"
    params:
      email: "{{persona.email}}"
      password: "TestPass123!"
      username: "{{persona.username}}"
    expect:
      status: 200
      body:
        token: "{{isString}}"
        user.id: "{{isString}}"
    save:
      token: "body.token"
      userId: "body.user.id"

  - id: "verify_credits"
    action: "economy.getBalance"
    params:
      token: "{{token}}"
    expect:
      status: 200
      body.balance: 100  # Initial credits

  - id: "select_archetype"
    action: "journey.selectArchetype"
    params:
      token: "{{token}}"
      archetypeId: "bodybuilder"
    expect:
      status: 200

  - id: "complete_workout"
    action: "workout.complete"
    params:
      token: "{{token}}"
      exercises:
        - exerciseId: "bench_press"
          sets: 3
          reps: 10
          weight: 60
    expect:
      status: 200
      body.tuEarned: "{{isNumber}}"
      body.creditsEarned: "{{isNumber}}"
    save:
      workoutId: "body.workout.id"
      creditsEarned: "body.creditsEarned"

  - id: "verify_credits_increased"
    action: "economy.getBalance"
    params:
      token: "{{token}}"
    expect:
      status: 200
      body.balance: "{{greaterThan(100)}}"  # Should have earned credits

# Cleanup after test
cleanup:
  - action: "admin.deleteUser"
    params:
      userId: "{{userId}}"
```

### Action Registry

```typescript
interface Action {
  name: string;
  description: string;
  params: ParamDefinition[];
  returns: ReturnDefinition;
  execute: (ctx: ExecutionContext) => Promise<ActionResult>;
}

const ACTION_REGISTRY: Record<string, Action> = {
  // Authentication
  "auth.register": { ... },
  "auth.login": { ... },
  "auth.logout": { ... },
  "auth.refreshToken": { ... },
  "auth.getMe": { ... },

  // Profile
  "profile.get": { ... },
  "profile.update": { ... },
  "profile.getExtended": { ... },

  // Onboarding
  "onboarding.getStatus": { ... },
  "onboarding.updateProfile": { ... },
  "onboarding.setEquipment": { ... },
  "onboarding.complete": { ... },

  // Journey
  "journey.getArchetypes": { ... },
  "journey.selectArchetype": { ... },
  "journey.switchArchetype": { ... },
  "journey.getProgress": { ... },

  // Exercises
  "exercises.list": { ... },
  "exercises.get": { ... },
  "exercises.search": { ... },
  "exercises.getAlternatives": { ... },

  // Workouts
  "workout.generate": { ... },
  "workout.complete": { ... },
  "workout.getHistory": { ... },
  "workout.getStats": { ... },

  // Goals
  "goals.list": { ... },
  "goals.create": { ... },
  "goals.update": { ... },
  "goals.recordProgress": { ... },

  // Economy
  "economy.getBalance": { ... },
  "economy.getPricing": { ... },
  "economy.transfer": { ... },
  "economy.charge": { ... },
  "economy.getHistory": { ... },

  // Store
  "store.getItems": { ... },
  "store.purchase": { ... },
  "store.getInventory": { ... },
  "store.equip": { ... },

  // Stats
  "stats.get": { ... },
  "stats.getHistory": { ... },
  "stats.recalculate": { ... },

  // Leaderboards
  "leaderboard.get": { ... },
  "leaderboard.getPosition": { ... },

  // Community
  "community.getFeed": { ... },
  "community.createPost": { ... },
  "community.likePost": { ... },
  "community.comment": { ... },

  // Crews
  "crews.create": { ... },
  "crews.join": { ... },
  "crews.leave": { ... },
  "crews.invite": { ... },
  "crews.startWar": { ... },

  // Rivals
  "rivals.challenge": { ... },
  "rivals.accept": { ... },
  "rivals.decline": { ... },
  "rivals.end": { ... },

  // Messaging
  "messaging.getConversations": { ... },
  "messaging.sendMessage": { ... },
  "messaging.block": { ... },

  // Trainers
  "trainer.createProfile": { ... },
  "trainer.createClass": { ... },
  "trainer.enrollStudent": { ... },
  "trainer.markAttendance": { ... },

  // Privacy
  "privacy.getSettings": { ... },
  "privacy.update": { ... },
  "privacy.enableMinimalist": { ... },

  // Admin
  "admin.deleteUser": { ... },
  "admin.suspendUser": { ... },
  "admin.freezeWallet": { ... },
  "admin.reviewFraud": { ... },

  // Health
  "health.check": { ... },
  "health.getMetrics": { ... },
};
```

### Assertion Matchers

```typescript
const MATCHERS = {
  // Type matchers
  "{{isString}}": (val) => typeof val === "string",
  "{{isNumber}}": (val) => typeof val === "number",
  "{{isBoolean}}": (val) => typeof val === "boolean",
  "{{isArray}}": (val) => Array.isArray(val),
  "{{isObject}}": (val) => typeof val === "object" && val !== null,
  "{{isNull}}": (val) => val === null,
  "{{isUndefined}}": (val) => val === undefined,
  "{{exists}}": (val) => val !== undefined && val !== null,

  // Comparison matchers
  "{{greaterThan(n)}}": (val, n) => val > n,
  "{{lessThan(n)}}": (val, n) => val < n,
  "{{equals(v)}}": (val, v) => val === v,
  "{{contains(s)}}": (val, s) => val.includes(s),
  "{{matches(regex)}}": (val, regex) => new RegExp(regex).test(val),
  "{{length(n)}}": (val, n) => val.length === n,
  "{{minLength(n)}}": (val, n) => val.length >= n,
  "{{maxLength(n)}}": (val, n) => val.length <= n,

  // Array matchers
  "{{arrayContains(item)}}": (arr, item) => arr.includes(item),
  "{{arrayLength(n)}}": (arr, n) => arr.length === n,
  "{{isEmpty}}": (val) => val.length === 0,
  "{{isNotEmpty}}": (val) => val.length > 0,

  // Object matchers
  "{{hasKey(key)}}": (obj, key) => key in obj,
  "{{hasKeys(...keys)}}": (obj, ...keys) => keys.every(k => k in obj),

  // Custom matchers
  "{{isUUID}}": (val) => /^[0-9a-f-]{36}$/i.test(val),
  "{{isEmail}}": (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
  "{{isISO8601}}": (val) => !isNaN(Date.parse(val)),
  "{{isJWT}}": (val) => /^[\w-]+\.[\w-]+\.[\w-]+$/.test(val),
};
```

---

## 3. Test Categories

### 3.1 Core User Journeys (50 tests)

```yaml
# core-journeys.yaml
suites:
  - name: "Registration & Onboarding"
    tests:
      - "Fresh user registration"
      - "Onboarding completion"
      - "Archetype selection"
      - "First workout"
      - "Dashboard access"

  - name: "Workout Flow"
    tests:
      - "Generate prescription"
      - "Manual exercise selection"
      - "Complete workout with sets"
      - "Verify TU earned"
      - "Verify credits earned"
      - "Stats update verification"

  - name: "Economy Flow"
    tests:
      - "Check initial balance"
      - "Earn credits from workout"
      - "Transfer credits to user"
      - "Receive credits from user"
      - "Purchase store item"
      - "Equip cosmetic item"

  - name: "Social Flow"
    tests:
      - "Follow user"
      - "Create post"
      - "Like post"
      - "Comment on post"
      - "Join community"
      - "Direct message"

  - name: "Competition Flow"
    tests:
      - "Join crew"
      - "Crew war participation"
      - "Challenge rival"
      - "Accept rivalry"
      - "Track rivalry progress"

  - name: "Progression Flow"
    tests:
      - "Earn XP"
      - "Level up"
      - "Rank promotion"
      - "Unlock achievement"
      - "Claim milestone"
```

### 3.2 Edge Cases (100 tests)

```yaml
# edge-cases.yaml
suites:
  - name: "Economy Edge Cases"
    tests:
      - "Transfer zero credits"
      - "Transfer negative credits"
      - "Transfer more than balance"
      - "Transfer to self"
      - "Transfer to non-existent user"
      - "Transfer to suspended user"
      - "Rapid sequential transfers"
      - "Concurrent transfers (same sender)"
      - "Circular transfer detection"
      - "Maximum transfer amount"

  - name: "Authentication Edge Cases"
    tests:
      - "Login with wrong password"
      - "Login with non-existent email"
      - "Expired token usage"
      - "Revoked token usage"
      - "Concurrent logins"
      - "Password with special chars"
      - "Very long password"
      - "Unicode in username"

  - name: "Workout Edge Cases"
    tests:
      - "Workout with zero sets"
      - "Workout with 500 reps (max)"
      - "Workout with 501 reps (over max)"
      - "Negative weight value"
      - "Workout with invalid exercise ID"
      - "Duplicate idempotency key"
      - "Workout while suspended"

  - name: "Social Edge Cases"
    tests:
      - "Follow blocked user"
      - "Message blocked user"
      - "Join private community"
      - "Leave as only leader"
      - "Challenge already-rival user"
      - "Accept expired rivalry"
      - "Crew invite to crew member"

  - name: "Privacy Edge Cases"
    tests:
      - "Private user in leaderboard"
      - "Private user in search"
      - "Private user profile access"
      - "Minimalist mode data exposure"
```

### 3.3 Security Tests (50 tests)

```yaml
# security.yaml
suites:
  - name: "Authentication Security"
    tests:
      - "SQL injection in login"
      - "SQL injection in register"
      - "XSS in username"
      - "XSS in display name"
      - "Rate limiting on login"
      - "Brute force protection"
      - "Token tampering"
      - "JWT signature validation"

  - name: "Authorization Security"
    tests:
      - "Access other user's profile"
      - "Modify other user's workout"
      - "Admin endpoint as regular user"
      - "Suspended user API access"
      - "Banned user API access"

  - name: "Economy Security"
    tests:
      - "Negative amount injection"
      - "Integer overflow in credits"
      - "Race condition in transfer"
      - "Double-spend attempt"
      - "Fraud pattern triggers"

  - name: "Input Validation"
    tests:
      - "Oversized payload"
      - "Null byte injection"
      - "Path traversal attempt"
      - "JSON injection"
      - "GraphQL depth attack"
      - "GraphQL complexity attack"
```

### 3.4 Performance Tests (30 tests)

```yaml
# performance.yaml
suites:
  - name: "Latency Benchmarks"
    tests:
      - "Auth login p99"
      - "Profile fetch p99"
      - "Workout list p99"
      - "Exercise search p99"
      - "Leaderboard fetch p99"
      - "GraphQL query p99"

  - name: "Throughput Tests"
    tests:
      - "Concurrent workout submissions"
      - "Concurrent credit transfers"
      - "Concurrent leaderboard reads"
      - "Sustained API load (100 rps)"
      - "Burst API load (500 rps)"

  - name: "Database Performance"
    tests:
      - "Large workout history query"
      - "Leaderboard with 10k users"
      - "Community feed pagination"
      - "Search with many results"
```

---

## 4. Scorecard System

### Scorecard Data Model

```typescript
interface TestResult {
  testId: string;
  testName: string;
  suite: string;
  category: string;
  status: "passed" | "failed" | "skipped" | "error";
  duration: number;
  assertions: {
    total: number;
    passed: number;
    failed: number;
  };
  error?: {
    message: string;
    stack?: string;
    step?: string;
  };
  metadata?: Record<string, unknown>;
}

interface SuiteResult {
  suiteName: string;
  category: string;
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    passRate: number;
  };
}

interface Scorecard {
  timestamp: string;
  environment: "local" | "staging" | "production";
  version: string;
  gitCommit: string;
  suites: SuiteResult[];
  overall: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    errors: number;
    passRate: number;
    duration: number;
  };
  categoryBreakdown: {
    core: { passed: number; total: number; rate: number };
    edge: { passed: number; total: number; rate: number };
    security: { passed: number; total: number; rate: number };
    performance: { passed: number; total: number; rate: number };
  };
  failedTests: TestResult[];
  recommendations: string[];
}
```

### Scorecard Generator

```typescript
function generateScorecard(results: TestResult[]): Scorecard {
  const suites = groupBy(results, "suite");
  const categories = groupBy(results, "category");

  const overall = {
    totalTests: results.length,
    passed: results.filter(r => r.status === "passed").length,
    failed: results.filter(r => r.status === "failed").length,
    skipped: results.filter(r => r.status === "skipped").length,
    errors: results.filter(r => r.status === "error").length,
    passRate: 0,
    duration: results.reduce((sum, r) => sum + r.duration, 0),
  };

  overall.passRate = (overall.passed / overall.totalTests) * 100;

  const categoryBreakdown = {
    core: calculateCategoryStats(categories.core || []),
    edge: calculateCategoryStats(categories.edge || []),
    security: calculateCategoryStats(categories.security || []),
    performance: calculateCategoryStats(categories.performance || []),
  };

  const recommendations = generateRecommendations(results, categoryBreakdown);

  return {
    timestamp: new Date().toISOString(),
    environment: process.env.TEST_ENV || "local",
    version: packageJson.version,
    gitCommit: getGitCommit(),
    suites: Object.entries(suites).map(([name, tests]) => ({
      suiteName: name,
      category: tests[0].category,
      tests,
      summary: calculateSuiteSummary(tests),
    })),
    overall,
    categoryBreakdown,
    failedTests: results.filter(r => r.status !== "passed"),
    recommendations,
  };
}

function generateRecommendations(results: TestResult[], categories: CategoryBreakdown): string[] {
  const recommendations: string[] = [];

  if (categories.security.rate < 100) {
    recommendations.push("CRITICAL: Security tests failing - address immediately");
  }

  if (categories.core.rate < 95) {
    recommendations.push("HIGH: Core journey tests below 95% - check critical paths");
  }

  if (categories.edge.rate < 80) {
    recommendations.push("MEDIUM: Edge case coverage below 80% - improve validation");
  }

  if (categories.performance.rate < 90) {
    recommendations.push("MEDIUM: Performance tests failing - review slow queries");
  }

  // Identify patterns in failures
  const failedByArea = groupBy(
    results.filter(r => r.status === "failed"),
    r => r.testName.split(".")[0]
  );

  for (const [area, failures] of Object.entries(failedByArea)) {
    if (failures.length >= 3) {
      recommendations.push(`Pattern: Multiple failures in ${area} area (${failures.length} tests)`);
    }
  }

  return recommendations;
}
```

### Visual Scorecard Component

```typescript
// For Empire Dashboard integration
interface ScorecardDisplay {
  overallScore: number;  // 0-100
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  categories: {
    name: string;
    score: number;
    trend: "up" | "down" | "stable";
    tests: {
      name: string;
      status: "pass" | "fail" | "skip";
    }[];
  }[];
  history: {
    date: string;
    score: number;
  }[];
}

function calculateGrade(passRate: number): string {
  if (passRate >= 98) return "A+";
  if (passRate >= 95) return "A";
  if (passRate >= 90) return "B";
  if (passRate >= 80) return "C";
  if (passRate >= 70) return "D";
  return "F";
}
```

---

## 5. Running Tests

### CLI Commands

```bash
# Run all tests
pnpm test:harness

# Run specific category
pnpm test:harness --category core
pnpm test:harness --category edge
pnpm test:harness --category security
pnpm test:harness --category performance

# Run specific suite
pnpm test:harness --suite "Economy Edge Cases"

# Run with persona
pnpm test:harness --persona elite_eve

# Run against environment
pnpm test:harness --env local
pnpm test:harness --env staging
pnpm test:harness --env production

# Generate scorecard only
pnpm test:harness --scorecard-only

# Export results
pnpm test:harness --output json --file results.json
pnpm test:harness --output dashboard  # Push to Empire dashboard

# Verbose mode
pnpm test:harness --verbose

# Watch mode (re-run on file changes)
pnpm test:harness --watch
```

### Integration with Existing Tests

```typescript
// Add to package.json scripts
{
  "scripts": {
    "test": "vitest",
    "test:api": "vitest --project api",
    "test:e2e:api": "tsx scripts/e2e-user-journey.ts",
    "test:harness": "tsx scripts/test-harness/index.ts",
    "test:harness:core": "tsx scripts/test-harness/index.ts --category core",
    "test:harness:edge": "tsx scripts/test-harness/index.ts --category edge",
    "test:harness:security": "tsx scripts/test-harness/index.ts --category security",
    "test:harness:performance": "tsx scripts/test-harness/index.ts --category performance",
    "test:all": "pnpm test && pnpm test:e2e:api && pnpm test:harness"
  }
}
```

---

## 6. Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test-harness.yml
name: Test Harness

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM

jobs:
  test-harness:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: musclemap_test
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install

      - run: pnpm build:all

      - name: Run test harness
        run: pnpm test:harness --output json --file results.json
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/musclemap_test

      - name: Upload scorecard
        uses: actions/upload-artifact@v3
        with:
          name: test-scorecard
          path: results.json

      - name: Post scorecard to dashboard
        if: github.ref == 'refs/heads/main'
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.DASHBOARD_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d @results.json \
            https://musclemap.me/api/admin/test-scorecard
```

---

## 7. Pseudocode Implementation

### Main Orchestrator

```typescript
// scripts/test-harness/index.ts
async function main() {
  const config = parseArgs(process.argv);

  // Initialize
  const db = await initDatabase(config.env);
  const api = new APIClient(config.baseUrl);
  const personas = await loadPersonas(db);

  // Load test scripts
  const scripts = await loadScripts(config.category, config.suite);

  // Execute tests
  const results: TestResult[] = [];

  for (const script of scripts) {
    const persona = config.persona
      ? personas[config.persona]
      : personas[script.persona?.use || "nova_fresh"];

    const ctx = new ExecutionContext(api, db, persona);

    for (const step of script.steps) {
      const result = await executeStep(ctx, step);
      results.push(result);

      if (config.verbose) {
        console.log(`${result.status} - ${result.testName}`);
      }

      if (result.status === "failed" && script.failFast) {
        break;
      }
    }

    // Cleanup
    if (script.cleanup) {
      await executeCleanup(ctx, script.cleanup);
    }
  }

  // Generate scorecard
  const scorecard = generateScorecard(results);

  // Output results
  await outputResults(scorecard, config.output, config.file);

  // Exit with appropriate code
  process.exit(scorecard.overall.failed > 0 ? 1 : 0);
}

async function executeStep(ctx: ExecutionContext, step: TestStep): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // Resolve variables
    const params = resolveVariables(step.params, ctx.variables);

    // Execute action
    const action = ACTION_REGISTRY[step.action];
    if (!action) {
      throw new Error(`Unknown action: ${step.action}`);
    }

    const response = await action.execute(ctx, params);

    // Run assertions
    const assertions = runAssertions(response, step.expect);

    // Save variables
    if (step.save) {
      for (const [key, path] of Object.entries(step.save)) {
        ctx.variables[key] = getPath(response, path);
      }
    }

    return {
      testId: step.id,
      testName: `${step.action} - ${step.id}`,
      suite: ctx.currentSuite,
      category: ctx.currentCategory,
      status: assertions.allPassed ? "passed" : "failed",
      duration: Date.now() - startTime,
      assertions: {
        total: assertions.total,
        passed: assertions.passed,
        failed: assertions.failed,
      },
      error: assertions.allPassed ? undefined : {
        message: assertions.failures.join("; "),
        step: step.id,
      },
    };
  } catch (error) {
    return {
      testId: step.id,
      testName: `${step.action} - ${step.id}`,
      suite: ctx.currentSuite,
      category: ctx.currentCategory,
      status: "error",
      duration: Date.now() - startTime,
      assertions: { total: 0, passed: 0, failed: 0 },
      error: {
        message: error.message,
        stack: error.stack,
        step: step.id,
      },
    };
  }
}
```

---

## Next Steps

1. **Stage 4:** Run simulations with all personas
2. **Stage 5:** Analyze results and identify gaps
3. **Stage 6:** Create implementation plan

---

*This test harness provides comprehensive coverage with 230+ test scenarios across all feature categories.*
