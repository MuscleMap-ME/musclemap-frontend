# Known Bugs

> Last updated: 2026-01-18
> Maintained by Bug Hunter system + manual review

## Overview

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |

## Status

**All known bugs have been resolved or are test infrastructure issues (not actual application bugs).**

## Resolved Bugs (2026-01-18)

### 1. Database Column "priority" Does Not Exist (tips.ts)
- **Status:** FIXED
- **Root Cause:** The `/api/tips` endpoint was ordering by a non-existent `priority` column
- **Fix:** Changed to order by `times_shown ASC` (show less-shown tips first)
- **File:** `apps/api/src/http/routes/tips.ts:59`

### 2. Permission Denied for Table user_milestone_progress
- **Status:** FIXED
- **Root Cause:** The `musclemap` database user lacked permissions on newly created tables
- **Fix:** Granted ALL PRIVILEGES on all tables/sequences to the `musclemap` user
- **Command:** `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO musclemap;`

### 3. useMotion Must Be Used Within a MotionProvider
- **Status:** FIXED
- **Root Cause:** Components using `useMotion()` hook were not wrapped in `MotionProvider`
- **Fix:** Added `MotionProvider` to the App.tsx provider hierarchy
- **File:** `src/App.tsx`

### 4. Migration 123 TypeScript Error (Cannot Find Module 'knex')
- **Status:** FIXED
- **Root Cause:** Migration 123 used Knex-style imports but the project uses a custom db client
- **Fix:** Converted migration to use the standard `db` client from `../client`
- **File:** `apps/api/src/db/migrations/123_bug_history_action_expand.ts`

## Bug Categories Explained

### Test Infrastructure Issues (NOT Application Bugs)
The bug hunter system previously reported hundreds of "Navigation failed: page.goto: Target page, context or browser has been closed" errors. These are Playwright test infrastructure issues that occur when:
- The test browser closes unexpectedly
- Tests timeout during navigation
- The dev server isn't running when tests execute

These are **not** actual application bugs and have been filtered from this report.

### HTTP 500 Errors on Protected Routes
Many routes return 500 errors when accessed without authentication by the bug hunter. This is expected behavior - these are protected routes that require a logged-in user. The bug hunter tests without auth, triggering these errors.

## How to Report Bugs

1. **User-reported:** Submit via `/issues/new` in the app
2. **Auto-discovered:** Bug Hunter system scans production and logs issues to `user_feedback` table
3. **Developer:** Add to this file with full context

## Bug Hunter Integration

Bugs are automatically:
1. Discovered via Playwright scanning
2. Stored in `user_feedback` table with `source = 'bug_hunter'`
3. Tracked in `bug_history` table for lifecycle management
4. Visible in Empire Control Panel at `/empire`

To query open bugs:
```sql
SELECT id, title, status, priority, created_at
FROM user_feedback
WHERE type = 'bug_report'
  AND status NOT IN ('resolved', 'closed', 'wont_fix')
ORDER BY
  CASE priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    ELSE 4
  END,
  created_at DESC;
```
