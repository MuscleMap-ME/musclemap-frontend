# Local Development Setup

> Get MuscleMap running on your machine.

---

## Prerequisites

### Required Software

```
REQUIRED
========

Node.js       v18+ (recommend v20 LTS)
pnpm          v8+ (package manager)
PostgreSQL    v14+ (database)
Redis         v7+ (cache, optional)
Git           Latest (version control)
```

### Recommended

```
RECOMMENDED
===========

VS Code          IDE with extensions
Homebrew         macOS package manager
pgAdmin/DBeaver  Database GUI
```

---

## Installation Steps

### Step 1: Clone Repository

```bash
git clone https://github.com/jeanpaulniko/musclemap.git
cd musclemap.me
```

### Step 2: Install Dependencies

```bash
# Install pnpm if needed
npm install -g pnpm

# Install all dependencies
pnpm install
```

### Step 3: Set Up Database

**macOS (Homebrew):**
```bash
# Install PostgreSQL
brew install postgresql@14
brew services start postgresql@14

# Create database
createdb musclemap
```

**Linux (apt):**
```bash
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb musclemap
```

### Step 4: Configure Environment

```bash
# Copy environment template
cp apps/api/.env.example apps/api/.env

# Edit with your values
nano apps/api/.env
```

### Step 5: Run Migrations

```bash
cd apps/api
pnpm db:migrate
pnpm db:seed  # Optional: seed sample data
```

### Step 6: Start Development

```bash
# From project root
pnpm dev
```

---

## Environment Variables

### Required Variables

```env
# apps/api/.env

# Server
NODE_ENV=development
PORT=3001

# Database (required)
DATABASE_URL=postgresql://user:pass@localhost:5432/musclemap

# Authentication (required)
JWT_SECRET=your-secret-key-minimum-32-characters-long
```

### Optional Variables

```env
# Redis (optional, falls back gracefully)
REDIS_URL=redis://localhost:6379

# Stripe (for payment features)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# External Services
OPENAI_API_KEY=sk-...  # For AI features
SENTRY_DSN=https://...  # Error tracking
```

---

## Service Management Scripts

### Starting Services

```bash
# Start only core services (PostgreSQL + Redis)
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

### Stopping Services

```bash
# Stop all services (frees ~500MB+ RAM)
./scripts/musclemap-stop.sh

# Stop without confirmation
./scripts/musclemap-stop.sh --quiet
```

### Service Resource Usage

| Service | Memory | Notes |
|---------|--------|-------|
| PostgreSQL | ~50-100MB | Required |
| Redis | ~10-50MB | Optional |
| API (PM2) | ~100-200MB | Required for API |
| Vite | ~100-300MB | Development only |
| Caddy | ~20MB | Production only |

---

## Common Commands

### Development

```bash
# Start dev server (frontend + API)
pnpm dev

# Start only frontend
pnpm dev:web

# Start only API
pnpm dev:api
```

### Building

```bash
# Build everything
pnpm build:all

# Build specific packages
pnpm -C packages/shared build
pnpm -C packages/core build
pnpm -C apps/api build
```

### Testing

```bash
# Run all tests
pnpm test

# Run specific tests
pnpm test:api        # API tests
pnpm test:e2e:api    # E2E journey test
pnpm test:harness    # Full test harness

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

### Database

```bash
# Run migrations
pnpm -C apps/api db:migrate

# Create new migration
pnpm -C apps/api db:migrate:make migration_name

# Rollback migration
pnpm -C apps/api db:rollback

# Seed database
pnpm -C apps/api db:seed
```

---

## Build Order

When rebuilding from scratch:

```
BUILD ORDER
===========

1. packages/shared    (types, utilities)
        │
        ▼
2. packages/core      (business logic)
        │
        ▼
3. packages/plugin-sdk (plugin system)
        │
        ▼
4. packages/client    (API client)
        │
        ▼
5. packages/ui        (shared components)
        │
        ▼
6. apps/api           (backend)
        │
        ▼
7. Frontend (Vite)    (web app)
```

Use `pnpm build:all` to build in correct order automatically.

---

## IDE Setup

### VS Code Extensions

```
RECOMMENDED EXTENSIONS
======================

Required:
├── ESLint
├── Prettier
├── TypeScript Vue Plugin (Volar)
└── EditorConfig

Helpful:
├── GitLens
├── Thunder Client (API testing)
├── PostgreSQL (database explorer)
└── Error Lens
```

### VS Code Settings

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find what's using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3002
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
pg_isready

# Check connection string
psql $DATABASE_URL

# Common fixes:
# 1. Start PostgreSQL service
brew services start postgresql@14

# 2. Create database if missing
createdb musclemap

# 3. Check user permissions
psql -c "ALTER USER $USER WITH SUPERUSER;"
```

### Node Version Issues

```bash
# Check version
node --version

# Use nvm to switch
nvm install 20
nvm use 20

# Or use volta
volta install node@20
```

### pnpm Install Fails

```bash
# Clear cache
pnpm store prune

# Delete node_modules
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules

# Fresh install
pnpm install
```

### Redis Not Required

Redis is optional. If not running, the app uses in-memory fallbacks:

```bash
# Check if Redis is available
redis-cli ping

# If not installed, that's OK
# API will warn and continue without cache
```

---

## Development Workflow

### Daily Workflow

```
MORNING
=======

1. Start services
   ./scripts/musclemap-start.sh --all

2. Pull latest changes
   git pull origin main

3. Install any new deps
   pnpm install

4. Run migrations if needed
   pnpm -C apps/api db:migrate


DEVELOPMENT
===========

1. Create feature branch
   git checkout -b feature/my-feature

2. Make changes

3. Run type checks frequently
   pnpm typecheck

4. Test your changes
   pnpm test


END OF DAY
==========

1. Commit changes
   git add . && git commit -m "description"

2. Push branch
   git push origin feature/my-feature

3. Stop services
   ./scripts/musclemap-stop.sh
```

### Before Committing

Always run:

```bash
pnpm typecheck  # Check types
pnpm lint       # Check style
pnpm test       # Run tests
```

---

## Next Steps

- [Architecture](./01-architecture.md) - Understand the codebase
- [Coding Standards](./03-coding-standards.md) - Style guide
- [Testing](./04-testing.md) - Test your code
- [Contributing](./06-contributing.md) - Submit changes

---

*Last updated: 2026-01-15*
