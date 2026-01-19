# Contributing to MuscleMap

## Getting Started

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Copy environment: `cp apps/api/.env.example apps/api/.env`
4. Start development: `pnpm dev`

## Development Commands
```bash
# Install dependencies
pnpm install

# Start all packages in dev mode
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint

# Type check
pnpm typecheck
```

## Project Structure

- `apps/api` - Express API server
- `packages/core` - Shared types and utilities
- `packages/plugin-sdk` - Plugin development kit
- `plugins/` - Drop-in plugins

## Code Style

- TypeScript strict mode
- Zod for runtime validation
- Pino for structured logging
- Express Router for endpoints

## Adding a New Module

1. Create `apps/api/src/modules/<name>/index.ts`
2. Export router and service
3. Mount in `apps/api/src/http/router.ts`
4. Add tests

## Adding a Plugin

1. Create `plugins/<name>/plugin.json`
2. Create `plugins/<name>/backend/index.js`
3. Export register function
4. Restart server

## Database Changes

1. Modify `apps/api/src/db/schema.ts`
2. Add seed data if needed
3. Test with fresh database

## Pull Request Process

1. Fork and create feature branch
2. Make changes with tests
3. Run `pnpm lint && pnpm test && pnpm build`
4. Submit PR with description

## Code of Conduct

Be respectful and constructive. We're all here to build something great.
