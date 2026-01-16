# MuscleMap Script Restructure Plan

## Overview

This plan outlines a comprehensive restructure of the `scripts/` directory to achieve:
- **Ease of use** - Single entry point via interactive CLI
- **Speed** - Parallel execution, caching, incremental processing
- **User comprehension** - Clear naming, informative output, documentation
- **Maximal utility** - Full sysadmin capabilities from one tool
- **Robustness** - Error handling, validation, recovery

## Current State Analysis

### Scripts Inventory (41 total)

| Category | Count | Scripts |
|----------|-------|---------|
| Service Management | 2 | musclemap-start.sh, musclemap-stop.sh |
| Deployment | 3 | deploy.sh, deploy-api.sh, quick-deploy.sh |
| Git/Merge | 2 | merge-all.sh, sync-docs-plain.sh |
| Testing | 4 | e2e-user-journey.ts, test.sh + harness (13 files) |
| Documentation | 1 | generate-docs.cjs |
| Quality/Maintenance | 3 | pre-deploy-check.sh, warning-tracker.sh, cleanup.sh |
| Utilities | 4 | lib/perf-utils.sh, lib/test-utils.sh, lib/postgres-utils.sh, lib/redis-utils.sh |
| Orphaned/Stubs | 3 | errors.sh (stub), split-repos.sh (unused), competitive-analysis.sh (stub) |

### Issues Identified

1. **Deployment Redundancy**: 3 overlapping scripts (deploy.sh, deploy-api.sh, quick-deploy.sh)
2. **Orphaned Scripts**: split-repos.sh (never used), errors.sh (empty stub)
3. **Naming Inconsistency**: Mix of `musclemap-*`, `*-all`, and plain names
4. **Missing Integration**: No unified CLI to orchestrate all scripts
5. **Limited Feedback**: Most scripts lack progress indicators and capability documentation

---

## Phase 1: Cleanup & Archive

### Scripts to DELETE (move to archive/)

| Script | Reason |
|--------|--------|
| `errors.sh` | Empty stub, never implemented |
| `split-repos.sh` | Unused, outdated concept |
| `sync-docs-plain.sh` | Superseded by generate-docs.cjs |

### Scripts to CONSOLIDATE

| Keep | Absorb | Reason |
|------|--------|--------|
| `deploy.sh` | `deploy-api.sh`, `quick-deploy.sh` | Add flags: `--api-only`, `--quick` |
| `test.sh` | (none) | Keep as simple wrapper for `pnpm test` |

---

## Phase 2: Rename for Consistency

### Naming Convention

```
mm-{category}-{action}.sh
```

Categories:
- `svc` - Service management
- `deploy` - Deployment
- `test` - Testing
- `docs` - Documentation
- `qa` - Quality assurance
- `db` - Database operations

### Rename Map

| Current Name | New Name | Description |
|--------------|----------|-------------|
| `musclemap-start.sh` | `mm-svc-start.sh` | Start local services |
| `musclemap-stop.sh` | `mm-svc-stop.sh` | Stop local services |
| `deploy.sh` | `mm-deploy.sh` | Full deployment |
| `merge-all.sh` | `mm-git-merge.sh` | Merge worktrees |
| `generate-docs.cjs` | `mm-docs-generate.cjs` | Generate documentation |
| `pre-deploy-check.sh` | `mm-qa-check.sh` | Pre-deploy validation |
| `warning-tracker.sh` | `mm-qa-warnings.sh` | Track code warnings |
| `cleanup.sh` | `mm-qa-cleanup.sh` | Codebase cleanup |
| `e2e-user-journey.ts` | `mm-test-e2e.ts` | E2E user journey test |
| `test.sh` | `mm-test-run.sh` | Run test suite |
| `competitive-analysis.sh` | `mm-docs-competitive.sh` | Competitive analysis |

---

## Phase 3: Master CLI Script

### Design: `mm` (MuscleMap CLI)

A single interactive command-line tool that provides access to ALL system capabilities.

```bash
# Quick commands
mm start              # Start all services
mm stop               # Stop all services
mm deploy             # Full deployment
mm test               # Run tests
mm status             # Show system status

# Interactive mode
mm                    # Launch interactive menu
mm --interactive      # Same as above

# Category menus
mm services           # Service management menu
mm deploy             # Deployment options menu
mm test               # Testing options menu
mm qa                 # Quality assurance menu
mm docs               # Documentation menu
mm db                 # Database operations menu
```

### Interactive Menu Structure

```
╔══════════════════════════════════════════════════════════════╗
║                    MUSCLEMAP CLI v2.0                        ║
║            Unified System Administration Tool                ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  [1] 🚀 Services        Start/stop/status local services     ║
║  [2] 📦 Deploy          Deploy to production                 ║
║  [3] 🧪 Testing         Run tests and E2E journeys           ║
║  [4] 🔍 Quality         Pre-deploy checks, warnings, cleanup ║
║  [5] 📚 Documentation   Generate and update docs             ║
║  [6] 🗄️  Database        Migrations, backups, queries         ║
║  [7] 🔧 Git Operations  Merge worktrees, sync branches       ║
║  [8] 📊 Status          Full system status report            ║
║                                                              ║
║  [h] Help  [q] Quit  [0] Quick Actions                       ║
╚══════════════════════════════════════════════════════════════╝
```

### Quick Actions Menu

```
╔══════════════════════════════════════════════════════════════╗
║                      QUICK ACTIONS                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  [1] Full Deploy Cycle    (check → build → deploy → verify)  ║
║  [2] Dev Environment      (start services → run dev server)  ║
║  [3] Pre-Commit Check     (typecheck → lint → test)          ║
║  [4] Morning Startup      (pull → start → status)            ║
║  [5] End of Day           (commit → stop services)           ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### Features

1. **Modal Dialogues** - Confirmation prompts for destructive actions
2. **Progress Indicators** - Spinners, progress bars, ETA
3. **Multi-select** - Choose multiple scripts to run in sequence
4. **Dry-run Mode** - Preview what will happen without executing
5. **Verbose Mode** - Detailed output for debugging
6. **History** - Track recent commands and their outcomes
7. **Presets** - Save common command combinations

---

## Phase 4: Robustness Enhancements

### Error Handling Standards

Every script must implement:

```bash
# 1. Strict mode
set -euo pipefail

# 2. Error trap
trap 'error_handler $? $LINENO' ERR

# 3. Cleanup trap
trap cleanup EXIT

# 4. Timeout handling
timeout 300 long_running_command || handle_timeout

# 5. Retry logic for network operations
retry_with_backoff 3 curl_command
```

### Validation Standards

```bash
# 1. Dependency checks
check_dependencies git node pnpm pm2

# 2. Environment validation
validate_env DATABASE_URL JWT_SECRET

# 3. Permission checks
require_write_permission "$PROJECT_DIR"

# 4. State validation
ensure_clean_git_state
```

### Recovery Features

```bash
# 1. Automatic rollback on failure
with_rollback deploy_function rollback_function

# 2. State checkpoints
checkpoint "pre-migration"
# ... do work ...
checkpoint "post-migration"

# 3. Resume capability
if [ -f "$CHECKPOINT_FILE" ]; then
  resume_from_checkpoint
fi
```

---

## Phase 5: Informative Output

### Output Standards

Every script must provide:

1. **Banner** - Script name, version, purpose
2. **Prerequisites** - What's needed before running
3. **Progress** - Step-by-step status updates
4. **Summary** - What was done, what changed
5. **Next Steps** - Suggested follow-up actions

### Example Output

```
╔══════════════════════════════════════════════════════════════╗
║  mm-deploy.sh v2.0 - Production Deployment                   ║
╠══════════════════════════════════════════════════════════════╣
║  Purpose: Deploy MuscleMap to production server              ║
║  Target:  musclemap.me (root@167.71.xxx.xxx)                ║
╚══════════════════════════════════════════════════════════════╝

Prerequisites:
  ✓ Git repository clean
  ✓ All tests passing
  ✓ SSH key configured
  ✓ PM2 installed on server

Progress:
  [1/6] Running pre-deploy checks...     ✓ (2.3s)
  [2/6] Building packages...             ✓ (15.1s)
  [3/6] Pushing to GitHub...             ✓ (3.2s)
  [4/6] Pulling on server...             ✓ (4.5s)
  [5/6] Running migrations...            ✓ (1.2s)
  [6/6] Restarting services...           ✓ (2.1s)

════════════════════════════════════════════════════════════════
                      DEPLOYMENT COMPLETE
════════════════════════════════════════════════════════════════

Summary:
  • Commit: abc123f "Add new feature"
  • Duration: 28.4 seconds
  • Migrations: 1 applied (045_add_feature.ts)
  • Services: musclemap-api restarted

Next Steps:
  • Verify at https://musclemap.me/health
  • Check logs: ssh root@musclemap.me "pm2 logs musclemap --lines 50"
  • Run E2E: mm test --e2e --production
```

---

## Phase 6: Documentation Updates

### Files to Update

1. **`scripts/README.md`** - Complete rewrite with new structure
2. **`CLAUDE.md`** - Update script commands and workflows
3. **`docs/SCRIPTS-REFERENCE.md`** - New detailed reference guide

### New Documentation Structure

```
scripts/
├── README.md              # Quick reference and usage
├── MIGRATION-GUIDE.md     # Old → new script mapping
└── lib/
    └── README.md          # Library documentation
```

---

## Implementation Timeline

| Phase | Tasks | Priority |
|-------|-------|----------|
| 1 | Archive old scripts | High |
| 2 | Rename scripts | High |
| 3 | Create mm CLI | Critical |
| 4 | Add robustness | Medium |
| 5 | Improve output | Medium |
| 6 | Update docs | High |

---

## File Structure After Restructure

```
scripts/
├── mm                           # Master CLI entry point (symlink to mm.sh)
├── mm.sh                        # Master CLI implementation
├── mm-svc-start.sh             # Start services
├── mm-svc-stop.sh              # Stop services
├── mm-deploy.sh                # Production deployment
├── mm-git-merge.sh             # Merge worktrees
├── mm-docs-generate.cjs        # Generate documentation
├── mm-qa-check.sh              # Pre-deploy checks
├── mm-qa-warnings.sh           # Warning tracker
├── mm-qa-cleanup.sh            # Codebase cleanup
├── mm-test-run.sh              # Run tests
├── mm-test-e2e.ts              # E2E user journey
├── mm-docs-competitive.sh      # Competitive analysis
├── lib/
│   ├── perf-utils.sh           # Performance utilities
│   ├── ui-utils.sh             # NEW: UI/menu utilities
│   ├── validation-utils.sh     # NEW: Validation utilities
│   ├── postgres-utils.sh       # PostgreSQL utilities
│   ├── redis-utils.sh          # Redis utilities
│   └── test-utils.ts           # Test utilities
├── test-harness/               # Test harness files (unchanged)
├── archive/                    # OLD: Archived scripts
│   ├── errors.sh
│   ├── split-repos.sh
│   ├── sync-docs-plain.sh
│   ├── deploy-api.sh
│   └── quick-deploy.sh
└── README.md                   # Updated documentation
```

---

## Backwards Compatibility

To prevent breaking existing workflows, create wrapper scripts:

```bash
# scripts/musclemap-start.sh (wrapper)
#!/bin/bash
echo "⚠️  This script has been renamed to mm-svc-start.sh"
echo "    Running mm-svc-start.sh for you..."
exec "$(dirname "$0")/mm-svc-start.sh" "$@"
```

These wrappers will be removed after 30 days.
