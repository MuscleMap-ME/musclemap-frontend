# MuscleMap Frontend/Backend Repository Split Plan

## Executive Summary

This document provides a comprehensive implementation plan to split the MuscleMap codebase into a public frontend repository and a private backend repository, enabling community contributions while protecting proprietary business logic.

---

## 1. TARGET ARCHITECTURE

### 1.1 Repository Strategy Decision

**Recommendation: Polyrepo with Shared Contracts Package**

The polyrepo approach (separate `musclemap-frontend` public + `musclemap-backend` private + `@musclemap/contracts` public) provides the cleanest separation of concerns and simplest mental model for contributors. It eliminates any risk of accidental backend exposure through submodule misconfiguration or selective mirroring failures. The shared contracts package published to npm creates a clear, versioned API boundary that both repositories consume independently.

#### Tradeoffs Table

| Approach | Pros | Cons | Best When |
|----------|------|------|-----------|
| **Polyrepo (Recommended)** | Cleanest separation; no risk of backend exposure; independent release cycles; familiar to OSS contributors | Coordination overhead for breaking changes; need to maintain contracts package; duplicate CI config | Security is paramount; large contributor community expected; clear API boundaries exist |
| Monorepo + Submodules | Single source of truth; atomic commits across boundaries; easier refactoring | Complex git workflows; submodule sync issues; contributors may accidentally see private structure | Small, trusted contributor pool; frequent cross-boundary changes |
| Monorepo + Selective Mirroring | True single source; simpler dev workflow internally | GitHub Actions complexity; risk of mirror misconfiguration exposing secrets; confusing for external contributors | Internal team only; public repo is read-only showcase |

### 1.2 Boundary Definitions

#### Table A: Public Frontend Repo Contents

| Directory/File | Purpose | Notes |
|----------------|---------|-------|
| `src/` | React web application source | All components, pages, hooks, stores |
| `src/components/` | Reusable UI components | Including 3D visualization, charts |
| `src/pages/` | Route-level page components | All user-facing screens |
| `src/hooks/` | Custom React hooks | State management, API integration |
| `src/store/` | Zustand stores | UI state, workout session, etc. |
| `src/contexts/` | React contexts | Theme, locale, auth context |
| `src/graphql/` | GraphQL queries/mutations | Generated types, operation documents |
| `src/styles/` | Global styles, themes | Tailwind config, CSS modules |
| `src/utils/` | Frontend utilities | Formatting, validation helpers |
| `src/mocks/` | MSW mock handlers | For contributor local development |
| `src/fixtures/` | Sample data | Static test/demo data |
| `src/assets/` | Static assets | Images, fonts, 3D models |
| `public/` | Public static files | favicon, manifest, etc. |
| `e2e/` | End-to-end tests | Playwright/Cypress tests |
| `packages/ui/` | Shared UI component library | Design system components |
| `.github/` | GitHub configuration | Actions, issue templates, CODEOWNERS |
| `docs/` | Public documentation | API usage, component docs |
| Configuration files | Build/dev config | vite.config, tsconfig, tailwind, etc. |

#### Table B: Private Backend Repo Contents

| Directory/File | Purpose | Why Private |
|----------------|---------|-------------|
| `apps/api/src/` | Fastify API server | Core business logic |
| `apps/api/src/db/` | Database layer | Schema reveals data architecture |
| `apps/api/src/db/migrations/` | Database migrations | Exposes schema evolution |
| `apps/api/src/db/schema.ts` | Drizzle schema definitions | Critical IP - table structure |
| `apps/api/src/modules/` | Feature modules | Proprietary algorithms |
| `apps/api/src/modules/physiology/` | Exercise physiology engine | Core IP - prescription algorithms |
| `apps/api/src/modules/biometrics/` | Biometrics ingestion | Provider API integrations |
| `apps/api/src/services/` | Business logic services | Calculation engines |
| `apps/api/src/http/routes/` | REST endpoints | Internal API structure |
| `apps/api/src/graphql/resolvers/` | GraphQL resolvers | Data fetching logic |
| `apps/api/src/jobs/` | Background jobs | Data processing pipelines |
| `apps/api/src/lib/redis/` | Redis integration | Cache patterns, keyspace |
| `packages/core/` | Core business logic | Shared proprietary code |
| `scripts/` | Deployment scripts | Infrastructure details |
| `native/` | C native modules | Performance-critical algorithms |
| `ecosystem.config.cjs` | PM2 configuration | Server infrastructure |
| `.env*` | Environment files | All secrets |

#### Table C: Shared Contracts Package Contents

| Item | Format | Publishing Strategy |
|------|--------|---------------------|
| GraphQL Schema | `.graphql` SDL files | npm package `@musclemap/contracts` |
| TypeScript Types | Generated `.d.ts` | Included in npm package |
| GraphQL Operations | `.graphql` query/mutation files | Included in npm package |
| Generated Hooks | TypeScript | Optional codegen output |
| API Response Types | TypeScript interfaces | Exported from package |
| Shared Enums | TypeScript enums | Exported from package |
| Validation Schemas | Zod schemas | For shared client/server validation |

### 1.3 Folder Structure (Tree View)

#### musclemap-frontend/ (Public)

```
musclemap-frontend/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   ├── crash_report.md
│   │   └── config.yml
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── preview.yml
│   │   └── schema-check.yml
│   ├── CODEOWNERS
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── FUNDING.yml
├── docs/
│   ├── ARCHITECTURE.md
│   ├── COMPONENT_GUIDE.md
│   └── CONTRIBUTING.md
├── e2e/
│   ├── fixtures/
│   ├── pages/
│   └── *.spec.ts
├── packages/
│   └── ui/
│       ├── src/
│       │   ├── components/
│       │   ├── hooks/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── public/
│   ├── favicon.ico
│   ├── manifest.json
│   └── assets/
│       └── models/
├── src/
│   ├── assets/
│   │   ├── images/
│   │   ├── fonts/
│   │   └── models/
│   ├── components/
│   │   ├── common/
│   │   ├── feedback/
│   │   │   ├── FeedbackCenter.tsx
│   │   │   ├── BugReportForm.tsx
│   │   │   ├── FeatureSuggestionForm.tsx
│   │   │   └── OpenSourceBanner.tsx
│   │   ├── layout/
│   │   ├── visualization/
│   │   └── homepage/
│   │       ├── OpenSourceHero.tsx
│   │       └── GitHubStatsWidget.tsx
│   ├── contexts/
│   ├── fixtures/
│   ├── graphql/
│   ├── hooks/
│   ├── mocks/
│   ├── pages/
│   ├── store/
│   ├── styles/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
├── .env.example
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
├── README.md
├── SECURITY.md
├── codegen.ts
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

#### musclemap-backend/ (Private)

```
musclemap-backend/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── migrations/
│   │   │   │   ├── schema.ts
│   │   │   │   └── connection.ts
│   │   │   ├── graphql/
│   │   │   ├── http/
│   │   │   ├── jobs/
│   │   │   ├── lib/
│   │   │   ├── modules/
│   │   │   ├── services/
│   │   │   └── index.ts
│   │   └── package.json
│   └── mobile/
├── packages/
│   ├── core/
│   ├── client/
│   ├── plugin-sdk/
│   └── shared/
├── native/
├── scripts/
├── .github/
├── ecosystem.config.cjs
├── package.json
└── pnpm-workspace.yaml
```

#### @musclemap/contracts/ (Public npm Package)

```
musclemap-contracts/
├── src/
│   ├── schema/
│   │   ├── schema.graphql
│   │   ├── types/
│   │   ├── queries/
│   │   └── mutations/
│   ├── types/
│   ├── validation/
│   └── index.ts
├── dist/
├── .github/
│   └── workflows/
│       └── publish.yml
├── CHANGELOG.md
├── LICENSE
├── README.md
├── package.json
└── tsup.config.ts
```

### 1.4 GraphQL Schema Sharing Strategy

#### Canonical Schema Location

The canonical GraphQL schema lives in the `@musclemap/contracts` package. This package is the single source of truth for all API type definitions.

#### Publishing Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Schema Publishing Flow                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Backend team updates schema in contracts repo                   │
│                         ↓                                           │
│  2. PR triggers schema validation CI                                │
│                         ↓                                           │
│  3. On merge, GitHub Action publishes to npm                        │
│                         ↓                                           │
│  4. Both repos receive Dependabot PR for update                     │
│                         ↓                                           │
│  5. Frontend runs codegen on update                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Versioning Approach

- **Semantic Versioning**: `@musclemap/contracts` follows semver strictly
- **Major**: Breaking changes (field removals, type changes)
- **Minor**: Additive changes (new fields, new types)
- **Patch**: Documentation, deprecation notices

---

## 2. MIGRATION PLAN (Phased)

### Phase 0: Pre-Work (Inventory & Preparation)

#### Checklist

```markdown
## Pre-Migration Checklist

### Dependency Analysis
- [ ] Generate dependency graph
  ```bash
  npx depcruise --include-only "^src|^packages|^apps" --output-type dot . | dot -T svg > dependency-graph.svg
  ```
- [ ] Identify circular dependencies between frontend/backend
  ```bash
  npx madge --circular --extensions ts,tsx src/ apps/ packages/
  ```

### Secret Audit
- [ ] Scan for secrets in git history
  ```bash
  # Install gitleaks
  brew install gitleaks

  # Scan entire history
  gitleaks detect --source . --verbose --report-path secrets-report.json
  ```
- [ ] Document all found secrets for rotation
- [ ] Create secret rotation plan

### Component Audit
- [ ] Identify backend-coupled UI components
- [ ] Document API dependencies for each component
- [ ] Create mock requirements list

### Documentation
- [ ] Write Architecture Decision Record (ADR) for split
- [ ] Document all public/private boundaries
- [ ] Create contributor onboarding guide draft

### Branch Preparation
- [ ] Create `migration/repo-split` branch
- [ ] Set up CI to run on migration branch
- [ ] Create backup of current repository state
```

### Phase 1: Repository Extraction

#### git filter-repo Approach (Recommended)

```bash
#!/bin/bash
# repo-split.sh

set -euo pipefail

ORIGINAL_REPO="/Users/jeanpaulniko/Public/musclemap.me"
WORK_DIR="/tmp/musclemap-split-$(date +%s)"
FRONTEND_REPO="$WORK_DIR/musclemap-frontend"

echo "=== Creating Frontend Repository ==="

# Clone for frontend extraction
git clone "$ORIGINAL_REPO" "$FRONTEND_REPO"
cd "$FRONTEND_REPO"
git remote remove origin

# Remove backend files
git filter-repo \
    --path apps/api --invert-paths \
    --path apps/mobile --invert-paths \
    --path packages/core --invert-paths \
    --path packages/client --invert-paths \
    --path packages/plugin-sdk --invert-paths \
    --path native --invert-paths \
    --path scripts/deploy.sh --invert-paths \
    --path ecosystem.config.cjs --invert-paths \
    --path-glob '*.env*' --invert-paths \
    --force

# Remove any .env files that slipped through
find . -name ".env*" ! -name ".env.example" -delete 2>/dev/null || true

echo "Frontend repository created at: $FRONTEND_REPO"

# Secret scan
gitleaks detect --source . --verbose
```

### Phase 2: Shared Contracts Package

#### package.json

```json
{
  "name": "@musclemap/contracts",
  "version": "1.0.0",
  "description": "Shared GraphQL schema and types for MuscleMap",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./schema": {
      "import": "./dist/schema/index.js",
      "types": "./dist/schema/index.d.ts"
    },
    "./schema.graphql": "./dist/schema.graphql"
  },
  "files": [
    "dist",
    "src/schema/**/*.graphql"
  ],
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --clean && pnpm build:schema",
    "build:schema": "graphql-codegen && cp src/schema/schema.graphql dist/",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "pnpm build"
  },
  "dependencies": {
    "graphql": "^16.8.1",
    "zod": "^3.22.4"
  },
  "publishConfig": {
    "access": "public"
  },
  "license": "MIT"
}
```

### Phase 3: Contributor-Friendly Local Development

#### MSW Mock Handlers

```typescript
// src/mocks/handlers.ts
import { graphql, HttpResponse } from 'msw';
import { exercises } from '../fixtures/exercises';
import { workouts } from '../fixtures/workouts';
import { currentUser } from '../fixtures/users';

export const handlers = [
  // Authentication
  graphql.query('CurrentUser', () => {
    return HttpResponse.json({
      data: { currentUser },
    });
  }),

  graphql.mutation('Login', ({ variables }) => {
    const { email, password } = variables;
    if (email === 'demo@musclemap.me' && password === 'demo123') {
      return HttpResponse.json({
        data: {
          login: {
            token: 'mock-jwt-token-for-development',
            user: currentUser,
          },
        },
      });
    }
    return HttpResponse.json({
      errors: [{ message: 'Invalid credentials' }],
    });
  }),

  // Exercises
  graphql.query('Exercises', ({ variables }) => {
    const { limit = 20, offset = 0, muscleGroup } = variables;
    let filtered = exercises;
    if (muscleGroup) {
      filtered = exercises.filter(e =>
        e.primaryMuscles.some(m => m.group === muscleGroup)
      );
    }
    return HttpResponse.json({
      data: {
        exercises: {
          nodes: filtered.slice(offset, offset + limit),
          totalCount: filtered.length,
        },
      },
    });
  }),

  // Workouts
  graphql.query('Workouts', ({ variables }) => {
    const { limit = 10, offset = 0 } = variables;
    return HttpResponse.json({
      data: {
        workouts: {
          nodes: workouts.slice(offset, offset + limit),
          totalCount: workouts.length,
        },
      },
    });
  }),

  graphql.mutation('CreateWorkout', ({ variables }) => {
    const newWorkout = {
      id: `workout-${Date.now()}`,
      ...variables.input,
      createdAt: new Date().toISOString(),
    };
    return HttpResponse.json({
      data: { createWorkout: newWorkout },
    });
  }),
];
```

#### Local Dev Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "dev:mocked": "VITE_API_MODE=mocked vite",
    "dev:staging": "VITE_API_MODE=staging VITE_API_URL=https://staging-api.musclemap.me/graphql vite",
    "dev:local-backend": "VITE_API_MODE=local VITE_API_URL=http://localhost:3001/graphql vite"
  }
}
```

### Phase 4: CI/CD for Public Repository

#### Main CI Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm codegen
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test -- --coverage

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm codegen
      - run: pnpm build
```

---

## 3. SECURITY & GOVERNANCE

### 3.1 Do-Not-Leak Inventory

| Category | Specific Items | Risk Level | Mitigation |
|----------|---------------|------------|------------|
| **Database** | Schema definitions, table names, indexes, sharding keys, migrations | CRITICAL | Never in public repo |
| **Redis** | Keyspace patterns, cache invalidation logic, TTL strategies | HIGH | Abstract behind API |
| **Auth** | JWT signing keys, OAuth secrets, provider API keys | CRITICAL | Environment variables only |
| **Business Logic** | Exercise physiology algorithms, prescription engine | HIGH | Keep in private `packages/core/` |
| **Infrastructure** | Server IPs, deployment scripts, PM2 config | MEDIUM | Private repo only |
| **User Data** | Any real user data, emails, PII | CRITICAL | Never in fixtures |
| **Provider Integrations** | Oura/Fitbit/Garmin API details, webhooks | HIGH | Private `modules/biometrics/` |

### 3.2 Secret Scanning Setup

#### Pre-commit Configuration

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.1
    hooks:
      - id: gitleaks
        name: Detect secrets with gitleaks
        entry: gitleaks protect --staged --verbose
        language: system
        pass_filenames: false

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: detect-private-key
      - id: check-added-large-files
        args: ['--maxkb=1000']
```

#### Gitleaks Configuration

```toml
# .gitleaks.toml
title = "MuscleMap Gitleaks Configuration"

[extend]
useDefault = true

[[rules]]
id = "musclemap-jwt-secret"
description = "MuscleMap JWT Secret"
regex = '''JWT_SECRET\s*=\s*['"]?([A-Za-z0-9+/=]{32,})['"]?'''
secretGroup = 1
tags = ["jwt", "secret"]

[[rules]]
id = "musclemap-database-url"
description = "PostgreSQL Connection String"
regex = '''postgres(ql)?://[^:]+:[^@]+@[^/]+/\w+'''
tags = ["database", "credentials"]

[allowlist]
paths = [
  '''\.env\.example$''',
  '''docs/.*\.md$''',
]
```

### 3.3 Security Policy

```markdown
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

1. **DO NOT** create a public GitHub issue for security vulnerabilities
2. Email security@musclemap.me with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
3. You will receive acknowledgment within 48 hours
4. We will work with you to understand and resolve the issue

### Response Times
- Critical: 24-72 hours
- High: 1 week
- Medium: 2 weeks
- Low: Next release cycle
```

### 3.4 Licensing & Contribution

**Recommendation: MIT License with DCO**

The MIT License provides maximum flexibility for community adoption. DCO (Developer Certificate of Origin) is less burdensome than a CLA - contributors simply sign off commits with `git commit -s`.

---

## 4. DEVELOPER EXPERIENCE

### 4.1 Zero-to-Running Workflow

```bash
# Clone the repository
git clone https://github.com/musclemap/musclemap-frontend.git
cd musclemap-frontend

# Install dependencies
pnpm install

# Run in mocked mode (default - no backend needed)
pnpm dev

# Open browser at http://localhost:5173
# Login with: demo@musclemap.me / demo123
```

### 4.2 API Access Modes

| Mode | Use Case | Setup Steps | Limitations |
|------|----------|-------------|-------------|
| **Mocked (default)** | UI development, bug fixes | None - just `pnpm dev` | Static data; no persistence |
| **Staging API** | Integration testing | Request access token; set `VITE_API_MODE=staging` | Read-only; rate limited |
| **Local Backend** | Core contributors | Clone private repo; run docker-compose | Requires backend access |

### 4.3 GraphQL Codegen Configuration

```typescript
// codegen.ts
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './node_modules/@musclemap/contracts/dist/schema.graphql',
  documents: ['src/**/*.tsx', 'src/**/*.ts'],
  generates: {
    './src/graphql/generated/graphql.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-apollo',
      ],
      config: {
        withHooks: true,
        withHOC: false,
        withComponent: false,
      },
    },
  },
};

export default config;
```

---

## 5. USER-FACING FEEDBACK & OPEN SOURCE INTEGRATION

### 5.1 In-App Feedback Center

Create a `FeedbackCenter` component in Settings that includes:
- Bug report form with auto-detected device info
- Feature suggestion form
- Direct links to GitHub Issues
- "Good First Issues" section for contributors

### 5.2 Homepage Open Source Section

Add an `OpenSourceHero` section with:
- "Built in the Open" headline
- Explanation of open frontend / proprietary backend split
- GitHub stats widget (stars, forks, contributors)
- CTAs: "Explore Code", "Report Bug", "Request Feature"

### 5.3 GitHub Issue Templates

#### Bug Report Template

```markdown
---
name: Bug Report
about: Report something that isn't working correctly
title: '[Bug] '
labels: bug, needs-triage
---

## Bug Description
A clear description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should have happened.

## Environment
- **Browser:**
- **OS:**
- **Screen Size:**

## Severity
- [ ] Critical - App unusable
- [ ] High - Major feature broken
- [ ] Medium - Feature impaired
- [ ] Low - Minor issue
```

---

## 6. RELEASE & VERSION STRATEGY

### 6.1 Version Pinning

```json
{
  "dependencies": {
    "@musclemap/contracts": "^1.2.0"
  }
}
```

Use caret (`^`) for minor version flexibility while preventing breaking changes.

### 6.2 Breaking Changes Policy

| Phase | Duration | Action |
|-------|----------|--------|
| Announcement | Day 0 | Schema field marked `@deprecated` |
| Soft Deprecation | 2 weeks | Warning in console |
| Hard Deprecation | 4 weeks | Field returns null |
| Removal | 6 weeks+ | Field removed in major version |

---

## 7. CHECKLISTS & DELIVERABLES

### 7.1 PR Sequence

| # | PR Title | Target Repo | Dependencies |
|---|----------|-------------|--------------|
| 1 | Extract shared types to contracts package | private | None |
| 2 | Publish @musclemap/contracts to npm | contracts | PR #1 |
| 3 | Set up MSW mock infrastructure | frontend | PR #2 |
| 4 | Configure GraphQL codegen | frontend | PR #2 |
| 5 | Add FeedbackCenter component | frontend | PR #3 |
| 6 | Add BugReportForm with GitHub integration | frontend | PR #5 |
| 7 | Add FeatureSuggestionForm | frontend | PR #5 |
| 8 | Add OpenSourceHero homepage section | frontend | PR #3 |
| 9 | Add GitHubStatsWidget | frontend | PR #8 |
| 10 | Add GitHub issue templates | frontend | None |
| 11 | Configure CI workflows | frontend | PR #3 |
| 12 | Add preview deployment workflow | frontend | PR #11 |
| 13 | Configure pre-commit hooks | frontend | None |
| 14 | Add CONTRIBUTING.md and CODE_OF_CONDUCT.md | frontend | None |
| 15 | Add SECURITY.md | frontend | None |
| 16 | Add Contributors page | frontend | PR #9 |
| 17 | Final repository split | both | All above |

### 7.2 Repository Setup Checklist

```markdown
## musclemap-frontend Setup

### Repository Settings
- [ ] Description: "Open source frontend for MuscleMap"
- [ ] Website: https://musclemap.me
- [ ] Topics: react, typescript, fitness, threejs, open-source
- [ ] Enable Discussions
- [ ] Enable Issues

### Branch Protection (main)
- [ ] Require pull request before merging
- [ ] Require approvals: 1
- [ ] Require status checks: lint, typecheck, test, build

### Security
- [ ] Enable Dependabot alerts
- [ ] Enable Secret scanning
- [ ] Enable Push protection
- [ ] Add SECURITY.md

### Labels
- [ ] bug, enhancement, documentation
- [ ] good first issue, help wanted
- [ ] severity:critical, severity:high, severity:medium, severity:low
- [ ] category:visualization, category:workout, category:ui
```

---

## 8. RISK ANALYSIS

### 8.1 Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Secret leakage in git history | Medium | Critical | git filter-repo audit; pre-commit hooks; secret scanning |
| Schema drift between repos | High | Medium | Automated CI schema checks; Dependabot PRs |
| Contributor friction | Medium | Medium | MSW mocks; comprehensive docs; setup script |
| Mobile build complexity | High | High | Keep mobile private initially |
| Spam GitHub issues | Medium | Low | Issue templates; triage automation |

### 8.2 Critical Risk Mitigations

#### Secret Leakage

1. Run `git filter-repo` with explicit path removal before first public commit
2. Use `gitleaks` to scan entire history before publishing
3. Configure pre-commit hooks to block secrets
4. Enable GitHub push protection

#### Schema Drift

1. Contracts package is single source of truth
2. CI workflow validates schema compatibility on every PR
3. Dependabot configured for automatic contract updates
4. Deploy frontend after backend (never before)

---

## Quick Reference

```
┌─────────────────────────────────────────────────────────────────────┐
│                 MuscleMap Repository Split                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PUBLIC FRONTEND                    PRIVATE BACKEND                  │
│  github.com/musclemap/frontend      github.com/jeanpaulniko/backend │
│                                                                      │
│  ├── src/                           ├── apps/api/                    │
│  ├── packages/ui/                   ├── packages/core/               │
│  ├── e2e/                           ├── native/                      │
│  └── public/                        └── scripts/                     │
│                                                                      │
│  SHARED: npm @musclemap/contracts                                   │
│  └── GraphQL schema, types, validation                              │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  NEVER IN PUBLIC REPO                                                │
│                                                                      │
│  ❌ Database schema/migrations                                       │
│  ❌ Redis keyspace patterns                                          │
│  ❌ JWT secrets, API keys                                            │
│  ❌ Exercise physiology algorithms                                   │
│  ❌ Provider integrations (Oura, Fitbit)                             │
│  ❌ .env files (except .env.example)                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

*Plan generated: 2026-01-11*
*Status: Ready for implementation*
