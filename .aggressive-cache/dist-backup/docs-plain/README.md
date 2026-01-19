# MuscleMap Documentation

> **Plain-Text Documentation Repository**
> Lightweight, accessible documentation for all users and systems.

---

## Quick Links

| Section | Description |
|---------|-------------|
| [Quick Start](./QUICK-START.md) | Get started in 5 minutes |
| [User Guide](./user-guide/README.md) | Complete user documentation |
| [Features](./features/README.md) | All platform features explained |
| [Developer Guide](./developer-guide/README.md) | Architecture, setup, contributing |
| [API Reference](./api-reference/README.md) | Complete API documentation |
| [Concepts](./concepts/README.md) | Core concepts explained |
| [Checklists](./checklists/README.md) | Ready-to-use checklists |
| [Reference](./reference/README.md) | Quick reference materials |
| [Machine-Readable](./machine-readable/README.md) | OpenAPI, GraphQL, JSON formats |

---

## What is MuscleMap?

MuscleMap is a cross-platform fitness application that visualizes muscle activation in real-time. Unlike traditional fitness apps that just count reps, MuscleMap shows you exactly which muscles are firing during every exercise with beautiful 3D visualizations.

### Core Features

```
+------------------+     +------------------+     +------------------+
|   MUSCLE VIZ     |     |   GAMIFICATION   |     |    COMMUNITY     |
|------------------|     |------------------|     |------------------|
| 3D muscle model  |     | XP & leveling    |     | Leaderboards     |
| Real-time glow   |     | Achievements     |     | Rivalries        |
| Activation %     |     | Archetypes       |     | Crews & hangouts |
+------------------+     +------------------+     +------------------+

+------------------+     +------------------+     +------------------+
|   SMART WORKOUTS |     |   PROGRESSION    |     |   NUTRITION      |
|------------------|     |------------------|     |------------------|
| AI prescription  |     | Training Units   |     | Meal tracking    |
| Equipment-aware  |     | Personal records |     | Macro goals      |
| Recovery-based   |     | Skill trees      |     | Barcode scanner  |
+------------------+     +------------------+     +------------------+
```

### Supported Platforms

| Platform | Status | Notes |
|----------|--------|-------|
| Web | Available | Chrome, Safari, Firefox, Edge |
| iOS | Available | iPhone and iPad |
| Android | Available | Phones and tablets |
| Apple Watch | Available | Workout tracking |

---

## Documentation Structure

```
docs-plain/
|
+-- README.md                    <- You are here
+-- QUICK-START.md               <- 5-minute getting started
|
+-- user-guide/                  <- For end users
|   +-- README.md
|   +-- 01-getting-started.md
|   +-- 02-first-workout.md
|   +-- 03-tracking-progress.md
|   +-- 04-community.md
|   +-- 05-settings.md
|   +-- 06-faq.md
|
+-- features/                    <- Feature documentation
|   +-- README.md
|   +-- muscle-visualization.md
|   +-- training-units.md
|   +-- archetypes.md
|   +-- workout-generation.md
|   +-- gamification.md
|   +-- community.md
|   +-- nutrition.md
|   +-- career-standards.md
|   +-- companion.md
|
+-- developer-guide/             <- For developers
|   +-- README.md
|   +-- 01-architecture.md
|   +-- 02-local-setup.md
|   +-- 03-coding-standards.md
|   +-- 04-testing.md
|   +-- 05-deployment.md
|   +-- 06-contributing.md
|
+-- api-reference/               <- API documentation
|   +-- README.md
|   +-- authentication.md
|   +-- endpoints/
|   |   +-- workouts.md
|   |   +-- exercises.md
|   |   +-- users.md
|   |   +-- ... (one per module)
|   +-- graphql.md
|   +-- errors.md
|
+-- concepts/                    <- Core concepts
|   +-- README.md
|   +-- training-units.md
|   +-- muscle-activation.md
|   +-- credits-economy.md
|   +-- progression-system.md
|
+-- checklists/                  <- Ready-to-use checklists
|   +-- README.md
|   +-- deployment.md
|   +-- new-feature.md
|   +-- security.md
|   +-- code-review.md
|
+-- reference/                   <- Quick reference
|   +-- README.md
|   +-- database-schema.md
|   +-- environment-vars.md
|   +-- cli-commands.md
|   +-- glossary.md
|
+-- machine-readable/            <- For bots and agents
    +-- README.md
    +-- openapi.yaml
    +-- graphql-schema.graphql
    +-- features.json
    +-- endpoints.json
```

---

## For Different Audiences

### End Users
Start with the [User Guide](./user-guide/README.md) to learn how to use MuscleMap effectively.

### Developers
Check the [Developer Guide](./developer-guide/README.md) for architecture, setup, and contribution guidelines.

### API Integrators
See the [API Reference](./api-reference/README.md) for complete endpoint documentation with examples.

### AI Agents & Bots
Use the [Machine-Readable](./machine-readable/README.md) formats for structured data access.

---

## Getting Help

- **User Support**: Use in-app feedback or visit `/issues`
- **Bug Reports**: Submit at `/issues/new`
- **Feature Requests**: Vote on the roadmap at `/roadmap`
- **Developer Questions**: Check the developer guide or open a GitHub issue

---

## Links

- **Live Site**: https://musclemap.me
- **GitHub**: https://github.com/jeanpaulniko/musclemap
- **npm Packages**: https://www.npmjs.com/org/musclemap.me

---

*This is the plain-text documentation repository. For rich interactive documentation with visualizations, visit [docs.musclemap.me](https://musclemap.me/docs).*

*Last updated: 2026-01-15 | Auto-generated: Partially*
