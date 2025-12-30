# Operations Scripts

This folder holds maintenance helpers for MuscleMap. Prefer running them from the repository root with `pnpm` installed.

## Deployment & Cron Helpers
- `cron-jobs.js` (repo root): `node cron-jobs.js hourly|daily|weekly|all [--dry-run] [--smoke-test] [--db=path]`
  - Uses shared logging/config utilities and exits non-zero on failures.
  - `--dry-run` lists the jobs that would run without mutating the database.
  - `--smoke-test` validates database connectivity and exits without running jobs (safe for CI/cron checks).
- `scripts/deploy.sh`: `./scripts/deploy.sh [--dry-run] [--root <path>] [--pm2 <name>] [--health <url>]`
  - Uses shared shell helpers for logging and command checks.
  - `--dry-run` prints the commands without executing them.

## Maintenance Scripts
- `scripts/maintain.sh`: interactive menu to install dependencies, build packages, run tests, and restart services.
- `scripts/repo-cleanup.sh`: safe/interactive cleanup for build artifacts and one-off scripts; supports `DRY_RUN=1`.
- `scripts/reset-devbox.sh`: reset local dev/test environment with options for wiping DBs and rebuilding.
- `scripts/tidy-root-js.sh`: archive stray root-level `.js` files while preserving critical entrypoints.

## Logs & Diagnostics
- `scripts/logs.sh`: quick views for frontend/backend logs, metrics, sessions, and summaries.
- `scripts/errors.sh`: tail PM2 error logs for the primary app.
- `scripts/test.sh`: legacy API smoke tests against a running backend.

## Removed
- `scripts/setup-db.js` was removed because it referenced a non-existent module and did not run. Use the API migrations instead.
