# Known Bugs

> Last updated: 2026-01-19T20:44:00.000Z
> Status: All bugs resolved

## Overview

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |

## Active Bugs

_No active bugs._

## Recently Fixed

### 2026-01-19: Missing /journey/milestones endpoint (Mobile App)

- **Severity:** Low
- **Status:** ✅ FIXED & DEPLOYED
- **Commit:** e15c275
- **Description:** The mobile app's Journey screen was calling `/journey/milestones` endpoint which did not exist, causing a network error.
- **Root Cause:** The endpoint was never implemented when the mobile journey screen was created.
- **Fix:** Added `GET /journey/milestones` endpoint to `apps/api/src/http/routes/journeys.ts` that returns milestones from user's active journeys in the format expected by the mobile app.
- **Files Modified:** `apps/api/src/http/routes/journeys.ts`
- **Deployment:** Production deployment completed at 2026-01-19T20:43:58Z

### 2026-01-19: DatabasePanel API response mapping

- **Severity:** Low
- **Status:** ✅ FIXED & DEPLOYED
- **Commit:** e15c275
- **Description:** The admin DatabasePanel component wasn't correctly mapping API responses from the backend.
- **Root Cause:** Backend API response format changed but frontend wasn't updated.
- **Fix:** Updated `fetchTables` to try `/admin/database/stats` first (which has size info), then fall back to `/admin/database/tables`. Updated `fetchPoolStats` to use `/admin/database/connections` endpoint with proper field mapping.
- **Files Modified:** `src/components/admin/DatabasePanel.tsx`

### 2026-01-19: Bug tracker cleanup (Test Artifacts)

- **Severity:** N/A (Maintenance)
- **Status:** ✅ COMPLETED
- **Description:** The bug tracker was polluted with 1201 false-positive "High Priority" bugs that were actually Playwright test failures from a prematurely closed browser context (`page.goto: Target page, context or browser has been closed`).
- **Root Cause:** Automated bug hunter ran against localhost:5173 but the browser was closed before tests could complete.
- **Fix:** Cleared all test artifacts and reset bug tracker to clean state.
- **Files Modified:** `docs/KNOWN-BUGS.md`

## Bug Reporting

To report a new bug:
1. Run the bug hunter: `pnpm test:bug-hunt`
2. Or manually add to this file with:
   - Severity (Critical/High/Medium/Low)
   - URL where the bug occurs
   - Steps to reproduce
   - Expected vs actual behavior
   - File path if known

## Resolved Bugs Archive

_See git history for previously resolved bugs._
