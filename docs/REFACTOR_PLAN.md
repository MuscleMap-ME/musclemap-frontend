# Refactor Scope, Boundaries, and Quality Gates

## Module boundaries and ownership signals
| Area | Scope | Responsibilities | Integration & notes |
| --- | --- | --- | --- |
| `apps/api` | Fastify host with embedded Express compatibility layer | Bootstraps DB schema/seeds, loads plugins, mounts Express router, and handles lifecycle hooks | Depends on `@musclemap/core` and `@musclemap/plugin-sdk`; Fastify middleware stack wraps legacy Express routes while migration is in progress. |
| `packages/core` | Shared domain contracts | Exposes canonical types (users, economy, workouts), constants, and permission helpers for all runtimes | Acts as the single source of truth for typed models across API, plugins, and (future) frontend usage. |
| `packages/plugin-sdk` | Plugin authoring surface | Defines backend plugin manifests, hook interfaces, auth helpers, and frontend plugin contracts (routes, widgets, nav) | Relies on `@musclemap/core` for domain types; currently ships loose Express typings to avoid hard dependency. |
| `src/` | Frontend (Vite + React) | UI shell (`App.jsx`), page-level routes, global stores/contexts, and shared components/styles | Currently JavaScript-only; does not consume `@musclemap/core` types or shared validation yet. |
| `plugins/` | Runtime plugin drop-ins | Holds user-provided plugin manifests and entries loaded by the API | Lifecycle managed by `apps/api` plugin loader; SDK shapes live in `packages/plugin-sdk`. |

## Refactor goals
- **Reduce duplication and drift**: centralize domain models and permission logic through `@musclemap/core` to keep API, plugins, and UI aligned.
- **Improve typing and safety**: adopt TypeScript (or JSDoc typings) in frontend and plugin surfaces, replacing `any`-based helpers in the SDK backend layer.
- **Standardize API contracts**: codify request/response schemas (e.g., Zod) at the edge and reuse them across clients; ensure plugin hooks follow the same contracts as first-party routes.
- **Consolidate runtime guardrails**: share logger and error-handling patterns between Fastify and Express layers; surface consistent shutdown and request ID handling.

## Non-goals
- Database schema redesigns or new product features.
- Replacing Fastify/Express hosting strategy during the migration window.
- Introducing new plugin capabilities beyond aligning with existing SDK contracts.

## Code-quality gates and current gaps
| Gate | Required? | Current coverage | Gaps / actions |
| --- | --- | --- | --- |
| `pnpm lint` | Yes | Implemented per-package in `apps/api` and `packages/core`; missing at workspace/root and in `packages/plugin-sdk` | Add a root `lint` script that runs package lint tasks; introduce lint config + script for `packages/plugin-sdk` and the React app. |
| `pnpm test` | Yes | API (`apps/api`) and frontend (`test:frontend`) have isolated scripts; no workspace aggregator | Create a top-level `test` script to fan out to API, frontend, and package unit tests; add coverage reporting targets where absent. |
| Type checks (`pnpm typecheck`) | Yes | Available in `apps/api`, `packages/core`, and `packages/plugin-sdk`; absent for the React app and the workspace | Add a workspace `typecheck` that delegates to packages; migrate frontend to TS or add JSDoc + `tsc --allowJs` to enforce types. |
