# Passive QA Testing Plan

## Overview

**Goal:** You browse and use the site naturally on iPhone + Brave (Shields up) while comprehensive logging captures everything. At the end, Claude analyzes the accumulated logs and fixes bugs systematically.

## Quick Start

### 1. Deploy (Claude does this once)
```bash
pnpm build:intelligent && \
rsync -rvz --delete -e "ssh -p 2222" dist/ root@musclemap.me:/var/www/musclemap.me/dist/ && \
ssh -p 2222 root@musclemap.me "cd /var/www/musclemap.me && git pull && pnpm install && pnpm build:packages && pnpm build:api && cd apps/api && pnpm db:migrate && pm2 restart musclemap --silent"
```

### 2. Start Testing (You on iPhone/Brave)
- Open Brave browser with Shields UP
- Navigate to: **`https://musclemap.me?qa=start`**
- Browse naturally - use all features
- All errors, interactions, and issues are logged automatically via GraphQL

### 3. End Testing
- Navigate to: **`https://musclemap.me?qa=end`**
- Or just tell Claude "I'm done testing"

### 4. Analyze & Fix (Claude)
```bash
npx tsx scripts/qa-analyze-logs.ts
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    YOUR PHONE (Brave + Shields)                  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   MuscleMap Frontend                     │    │
│  │                                                          │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │           QA Session Logger (NEW)                │    │    │
│  │  │                                                  │    │    │
│  │  │  • Console errors (window.onerror)              │    │    │
│  │  │  • React ErrorBoundary catches                  │    │    │
│  │  │  • GraphQL errors (Apollo link)                 │    │    │
│  │  │  • Network failures (fetch interceptor)         │    │    │
│  │  │  • User interactions (clicks, navigation)       │    │    │
│  │  │  • Performance marks (slow loads)               │    │    │
│  │  │  • Feature usage                                │    │    │
│  │  │  • Animation failures (SafeMotion fallbacks)    │    │    │
│  │  │  • Missing images/assets                        │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              │ Batched every 5s via GraphQL      │
│                              ▼                                   │
└──────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Production Server                             │
│                                                                  │
│  GraphQL Mutation: logQAEvents(input: QALogInput!)               │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              qa_session_logs table                       │    │
│  │                                                          │    │
│  │  session_id | event_type | data | timestamp | user_id    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              PM2 Logs (pino logger)                      │    │
│  │                                                          │    │
│  │  All API requests, GraphQL operations, errors            │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

## Phase 1: Enable Enhanced Logging (Claude Does This)

### 1.1 Create QA Session Logger (Frontend)
```typescript
// src/services/qaSessionLogger.ts
- Captures all console.error/warn output
- Hooks into window.onerror for uncaught exceptions
- Hooks into unhandledrejection for promise rejections
- Intercepts Apollo Client errors via error link
- Tracks page navigations with timing
- Records user interactions (button clicks, form submits)
- Detects animation fallbacks (SafeMotion)
- Detects failed image loads
- Batches events and sends via sendBeacon every 5 seconds
```

### 1.2 Create QA Logging Endpoint (Backend)
```typescript
// POST /api/qa/session-log
- Accepts batched events from frontend
- Stores in qa_session_logs table
- No auth required (allows testing logged-out flows)
- Rate limited to prevent abuse
```

### 1.3 Database Table
```sql
CREATE TABLE qa_session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qa_session_logs_session ON qa_session_logs(session_id);
CREATE INDEX idx_qa_session_logs_created ON qa_session_logs(created_at);
CREATE INDEX idx_qa_session_logs_type ON qa_session_logs(event_type);
```

## Phase 2: You Test (Minimal Intervention)

### What You Do
1. **Start QA session** - Visit `https://musclemap.me?qa=start` on your iPhone
2. **Browse naturally** - Use every feature, click every button
3. **Test hostile environment** - Brave Shields up, offline/online toggle
4. **No need to note bugs** - Everything is logged automatically
5. **End session** - Visit `https://musclemap.me?qa=end` or just close

### Testing Checklist (Just Do These)
- [ ] Landing page
- [ ] Login/Register
- [ ] Onboarding flow
- [ ] Dashboard
- [ ] Start a workout
- [ ] Browse exercises
- [ ] View 3D muscle model
- [ ] Goals page
- [ ] Profile page
- [ ] Settings
- [ ] Communities/Social
- [ ] Messages
- [ ] Leaderboards
- [ ] Shop/Economy
- [ ] Log out
- [ ] Test as logged-out user

### What Gets Captured Automatically
| Event Type | What It Captures |
|------------|------------------|
| `js_error` | Uncaught exceptions with stack traces |
| `promise_rejection` | Unhandled promise rejections |
| `console_error` | Any console.error() calls |
| `console_warn` | Any console.warn() calls |
| `graphql_error` | GraphQL operation failures |
| `network_error` | Failed fetch requests |
| `navigation` | Page changes with load times |
| `interaction` | Button clicks, form submits |
| `animation_fallback` | SafeMotion fallbacks triggered |
| `image_error` | Failed image loads |
| `performance` | Slow page loads (>2s) |
| `feature_blocked` | Brave Shields blocking something |

## Phase 3: Claude Analyzes and Fixes

### 3.1 Extract Session Data
```bash
# Get all QA logs from the session
ssh -p 2222 root@musclemap.me "psql -U musclemap -d musclemap -c \"
  SELECT event_type, COUNT(*),
         jsonb_agg(DISTINCT event_data->'message') as messages
  FROM qa_session_logs
  WHERE session_id = 'YOUR_SESSION_ID'
  GROUP BY event_type
  ORDER BY COUNT(*) DESC
\""
```

### 3.2 Analyze PM2 Logs
```bash
# Get server-side errors during testing
ssh -p 2222 root@musclemap.me "pm2 logs musclemap --lines 500 --nostream | grep -E 'error|Error|ERR'"
```

### 3.3 Bug Extraction Process
1. **Group by error type** - Categorize all captured events
2. **Deduplicate** - Same error on different pages = 1 bug
3. **Prioritize** - Errors > Warnings > Performance issues
4. **Create fix list** - Actionable bug tickets
5. **Fix systematically** - One by one, verify each fix

### 3.4 Fix & Deploy Cycle
```
For each bug:
  1. Identify root cause from logs
  2. Write fix
  3. Verify locally
  4. Deploy to production
  5. Mark as fixed in tracker
```

## Event Schema Reference

### JS Error Event
```json
{
  "event_type": "js_error",
  "event_data": {
    "message": "Cannot read property 'x' of undefined",
    "stack": "Error: Cannot read...\n    at Component.tsx:42",
    "source": "https://musclemap.me/assets/index.js",
    "lineno": 1234,
    "colno": 56
  }
}
```

### GraphQL Error Event
```json
{
  "event_type": "graphql_error",
  "event_data": {
    "operation": "GetProfile",
    "operationType": "query",
    "message": "User not found",
    "path": ["profile", "user"],
    "extensions": { "code": "NOT_FOUND" }
  }
}
```

### Navigation Event
```json
{
  "event_type": "navigation",
  "event_data": {
    "from": "/dashboard",
    "to": "/workouts",
    "loadTime": 1234,
    "method": "push"
  }
}
```

### Interaction Event
```json
{
  "event_type": "interaction",
  "event_data": {
    "element": "button",
    "text": "Start Workout",
    "id": "start-workout-btn",
    "className": "btn-primary"
  }
}
```

## Quick Commands Reference

### Start/End QA Mode
```
Start: https://musclemap.me?qa=start
End:   https://musclemap.me?qa=end
```

### View Live Logs (Claude)
```bash
# Watch logs in real-time during testing
ssh -p 2222 root@musclemap.me "pm2 logs musclemap --lines 0"

# Get QA session summary
ssh -p 2222 root@musclemap.me "psql -U musclemap -d musclemap -c \"
  SELECT event_type, COUNT(*)
  FROM qa_session_logs
  WHERE created_at > NOW() - INTERVAL '1 hour'
  GROUP BY event_type
\""
```

### Export Full Session
```bash
# Export all events from a session to JSON
ssh -p 2222 root@musclemap.me "psql -U musclemap -d musclemap -c \"
  COPY (
    SELECT * FROM qa_session_logs
    WHERE session_id = 'SESSION_ID'
    ORDER BY created_at
  ) TO STDOUT WITH CSV HEADER
\" > qa_session.csv"
```

## Summary

1. **Claude deploys enhanced logging** (one-time setup)
2. **You browse the site normally** on iPhone + Brave
3. **Everything is logged automatically** to database
4. **You tell Claude "I'm done testing"**
5. **Claude analyzes logs and fixes all bugs**
6. **Repeat if needed**

This minimizes your intervention to just using the site naturally while maximizing bug discovery through comprehensive logging.
