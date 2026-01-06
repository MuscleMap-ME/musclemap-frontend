# MuscleMap

> Visual Workout Tracking - See your muscles in action

[![Live Site](https://img.shields.io/badge/Live-musclemap.me-blue)](https://musclemap.me)
[![API Status](https://img.shields.io/badge/API-Online-green)](https://musclemap.me/health)

## What is MuscleMap?

MuscleMap is a cross-platform fitness application that visualizes muscle activation in real-time. Track your workouts, see which muscles you're targeting, and optimize your training.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/jeanpaulniko/musclemap.git
cd musclemap.me

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## Tech Stack

- **Frontend**: React, Vite, TailwindCSS, Three.js
- **Mobile**: React Native, Expo
- **Backend**: Fastify, PostgreSQL
- **Deployment**: Caddy, PM2

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `src/` | Web frontend (React) |
| `apps/api/` | API server (Fastify) |
| `apps/mobile/` | Mobile app (Expo) |
| `packages/` | Shared packages |
| `scripts/` | Automation scripts |
| `docs/` | Documentation |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and structure
- [API Reference](docs/API_REFERENCE.md) - API endpoints
- [Features](docs/FEATURES.md) - Feature list
- [Icons](docs/ICONS.md) - Icon system
- [Scripts README](scripts/README.md) - Development workflow

## Scripts

```bash
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm build:all        # Build everything
pnpm typecheck        # Type check all packages
pnpm test             # Run tests
pnpm deploy           # Deploy to production
pnpm prepare:appstore # Generate App Store assets
pnpm docs:generate    # Regenerate documentation
```

## Deployment

```bash
./deploy.sh "commit message"
```

## Contributing

1. Create a feature branch
2. Make changes
3. Run `pnpm typecheck` and `pnpm test`
4. Submit PR

## License

AGPL-3.0 - See [LICENSE](LICENSE) for details.

---

Built with care by Jean-Paul Niko
