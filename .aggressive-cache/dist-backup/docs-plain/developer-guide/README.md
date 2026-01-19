# Developer Guide

> Technical documentation for MuscleMap developers and contributors.

---

## Table of Contents

| Chapter | Topic | Description |
|---------|-------|-------------|
| 1 | [Architecture](./01-architecture.md) | System design and tech stack |
| 2 | [Local Setup](./02-local-setup.md) | Get MuscleMap running locally |
| 3 | [Coding Standards](./03-coding-standards.md) | Style guide and best practices |
| 4 | [Testing](./04-testing.md) | Test strategy and execution |
| 5 | [Deployment](./05-deployment.md) | Production deployment process |
| 6 | [Contributing](./06-contributing.md) | How to contribute |

---

## Quick Reference

### Essential Commands

```bash
# Development
pnpm dev              # Start Vite dev server
pnpm build:all        # Build everything

# Testing
pnpm test             # Run all tests
pnpm typecheck        # TypeScript check
pnpm lint             # Run linter

# Database
pnpm -C apps/api db:migrate  # Run migrations
pnpm -C apps/api db:seed     # Seed database

# Documentation
pnpm docs:generate    # Regenerate docs
```

### Project Structure

```
musclemap.me/
├── apps/
│   ├── api/           # Fastify API server
│   └── mobile/        # React Native app
├── packages/
│   ├── shared/        # Shared utilities
│   ├── core/          # Business logic
│   ├── client/        # API client SDK
│   ├── ui/            # Shared components
│   └── plugin-sdk/    # Plugin development
├── src/               # Web frontend (React/Vite)
├── scripts/           # Automation scripts
├── docs/              # Documentation
└── docs-plain/        # Plain-text docs (you are here)
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend Web | React + Vite + TailwindCSS |
| Frontend Mobile | React Native + Expo |
| API Server | Fastify + TypeScript |
| Database | PostgreSQL |
| Cache | Redis (optional) |
| Reverse Proxy | Caddy |

---

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Caddy     │────▶│   Fastify   │
│  (React)    │◀────│   (HTTPS)   │◀────│   (API)     │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
                                        ┌─────────────┐
                                        │ PostgreSQL  │
                                        └─────────────┘
```

### Key Principles

1. **Single Source of Truth**: PostgreSQL only - no local state, no SQLite
2. **GraphQL Data Stream**: All data flows through GraphQL API
3. **Cross-Platform**: Web and mobile share code via packages
4. **Clients Only Render**: Frontend is pure presentation

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL 15+
- Redis (optional)

### Quick Start

```bash
# Clone repository
git clone https://github.com/jeanpaulniko/musclemap.git
cd musclemap.me

# Install dependencies
pnpm install

# Set up environment
cp apps/api/.env.example apps/api/.env
# Edit .env with your database credentials

# Start services
./scripts/musclemap-start.sh --all

# Access the app
open http://localhost:5173
```

[Full setup guide →](./02-local-setup.md)

---

## Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | AI agent instructions |
| `apps/api/src/index.ts` | API entry point |
| `apps/api/src/db/schema.ts` | Database schema |
| `src/App.jsx` | Frontend entry |
| `ecosystem.config.cjs` | PM2 configuration |
| `docs/CODING-STYLE-GUIDE.md` | Detailed style guide |

---

## API Modules

The API is organized into feature modules:

```
apps/api/src/modules/
├── achievements/      # Badges and milestones
├── career/            # PT test tracking
├── community/         # Social features
├── economy/           # Credits system
├── leaderboards/      # Rankings
├── nutrition/         # Meal tracking
├── prescription/      # Workout generation
├── skills/            # Skill trees
├── stats/             # Character stats
└── ... (30+ modules)
```

Each module contains:
- `schema.ts` - GraphQL schema
- `resolvers.ts` - GraphQL resolvers
- `service.ts` - Business logic

---

## npm Packages

Published to `@musclemap.me` scope:

| Package | Description | Install |
|---------|-------------|---------|
| `@musclemap.me/shared` | Utilities and constants | `npm i @musclemap.me/shared` |
| `@musclemap.me/core` | Domain types and logic | `npm i @musclemap.me/core` |
| `@musclemap.me/client` | API client SDK | `npm i @musclemap.me/client` |
| `@musclemap.me/plugin-sdk` | Plugin development | `npm i @musclemap.me/plugin-sdk` |
| `@musclemap.me/ui` | UI components | `npm i @musclemap.me/ui` |

---

## Development Workflow

### Making Changes

```
1. Create feature branch
   git checkout -b feature/my-feature

2. Make changes
   - Write code
   - Add tests
   - Update docs

3. Verify
   pnpm typecheck
   pnpm test
   pnpm lint

4. Commit
   git add .
   git commit -m "Description"

5. Push and PR
   git push -u origin feature/my-feature
   gh pr create
```

### Build Order

When rebuilding packages:

```
1. packages/shared
2. packages/core
3. packages/plugin-sdk
4. packages/client
5. packages/ui
6. apps/api
7. Frontend (src/)
```

Or simply: `pnpm build:all`

---

## Important Guidelines

### DO

- Run `pnpm typecheck` before committing
- Use Fastify (not Express)
- Use PostgreSQL (not SQLite)
- Use keyset pagination (not OFFSET)
- Add indexes for new queries
- Update E2E tests for new endpoints

### DON'T

- Use `any` type in TypeScript
- String interpolation in SQL queries
- Store secrets in code
- Skip the coding style guide
- Deploy without testing

---

## Getting Help

- **Style Guide**: `docs/CODING-STYLE-GUIDE.md`
- **Architecture**: `docs/ARCHITECTURE.md`
- **API Reference**: `docs/API_REFERENCE.md`
- **Issues**: GitHub Issues

---

*Continue to: [Architecture →](./01-architecture.md)*
