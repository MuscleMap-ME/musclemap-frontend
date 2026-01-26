# Distributed Tracing Debugging Guide

This guide explains how Claude instances and developers can use MuscleMap's distributed tracing system to track down problems quickly and efficiently.

## Quick Start: Finding Errors

### 1. Get Recent Errors

When debugging an issue, start by checking recent errors:

```bash
# SSH to production and run a quick query
ssh -p 2222 root@musclemap.me "cd /var/www/musclemap.me && node -e \"
const { getRecentErrors } = require('./apps/api/dist/lib/tracing');
const errors = getRecentErrors(10);
errors.forEach(e => console.log(\\\`[\${e.traceId}] \${e.operation}: \${e.errorMessage}\\\`));
\""
```

### 2. Search for Specific Error Pattern

```bash
# Find all traces matching a specific error
ssh -p 2222 root@musclemap.me "cd /var/www/musclemap.me && node -e \"
const { queryTracesByError } = require('./apps/api/dist/lib/tracing');
const traces = queryTracesByError('UNIQUE constraint', { limit: 5, includeSpans: true });
traces.forEach(t => {
  console.log(\\\`Trace: \${t.id}\\\`);
  console.log(\\\`  User: \${t.user_id}\\\`);
  console.log(\\\`  Operation: \${t.root_operation}\\\`);
  console.log(\\\`  Error: \${t.error_message}\\\`);
  console.log(\\\`  Spans: \${(t.spans || []).length}\\\`);
});
\""
```

### 3. Get Full Error Context

```bash
# Get complete trace context for a specific trace ID
ssh -p 2222 root@musclemap.me "cd /var/www/musclemap.me && node -e \"
const { getErrorContext } = require('./apps/api/dist/lib/tracing');
const ctx = getErrorContext('TRACE-ID-HERE');
if (ctx) {
  console.log('Trace:', JSON.stringify(ctx.trace, null, 2));
  console.log('Related traces in session:', ctx.relatedTraces.length);
}
\""
```

## Understanding Trace Structure

### Trace Hierarchy

```
Trace (root)
├── Span: graphql:GetUserProfile
│   ├── Span: db:SELECT FROM users
│   └── Span: db:SELECT FROM profiles
├── Span: graphql:GetWorkouts
│   ├── Span: db:SELECT FROM workouts
│   └── Span: cache:get workouts
└── Span: graphql:GetGoals
    └── Span: db:SELECT FROM goals
```

### Key Fields

| Field | Description |
|-------|-------------|
| `traceId` | Unique ID for the entire request journey |
| `spanId` | Unique ID for a specific operation within the trace |
| `parentSpanId` | ID of the parent span (for hierarchy) |
| `sessionId` | Browser session ID (persists across page reloads) |
| `userId` | Authenticated user ID (if logged in) |
| `operationName` | GraphQL operation or action name |
| `operationType` | Type: graphql, db, http, cache, navigation, interaction |
| `status` | in_progress, success, or error |
| `errorMessage` | Error message if status is error |
| `durationMs` | How long the operation took |

## Common Debugging Scenarios

### Scenario 1: User Reports "Something Broke"

1. Get the user's ID or email
2. Query traces for that user:

```bash
ssh -p 2222 root@musclemap.me "cd /var/www/musclemap.me && node -e \"
const { queryTraces } = require('./apps/api/dist/lib/tracing');
const result = queryTraces({ userId: 'USER-ID-HERE', status: 'error', limit: 10 });
result.traces.forEach(t => console.log(\\\`[\${new Date(t.started_at).toISOString()}] \${t.root_operation}: \${t.error_message}\\\`));
\""
```

### Scenario 2: Intermittent 500 Errors

1. Check error statistics to find patterns:

```bash
ssh -p 2222 root@musclemap.me "cd /var/www/musclemap.me && node -e \"
const { getErrorStats } = require('./apps/api/dist/lib/tracing');
const stats = getErrorStats(60 * 60 * 1000); // Last hour
stats.slice(0, 10).forEach(s => {
  console.log(\\\`\${s.count}x: \${s.pattern}\\\`);
  console.log(\\\`  Operations: \${s.operations.join(', ')}\\\`);
  console.log(\\\`  Affected users: \${s.affectedUsers}\\\`);
});
\""
```

### Scenario 3: Slow Performance

1. Find slow traces:

```bash
ssh -p 2222 root@musclemap.me "cd /var/www/musclemap.me && node -e \"
const { queryTraces, getTraceWithSpans } = require('./apps/api/dist/lib/tracing');
const result = queryTraces({ minDuration: 1000, limit: 5 }); // >1 second
result.traces.forEach(t => {
  console.log(\\\`[\${t.duration_ms}ms] \${t.root_operation}\\\`);
  const full = getTraceWithSpans(t.id);
  if (full && full.spans) {
    full.spans
      .filter(s => s.duration_ms && s.duration_ms > 100)
      .forEach(s => console.log(\\\`  - [\${s.duration_ms}ms] \${s.operation_name}\\\`));
  }
});
\""
```

### Scenario 4: Database Query Issues

Look for db spans with errors:

```bash
ssh -p 2222 root@musclemap.me "cd /var/www/musclemap.me && node -e \"
const { queryTracesByError } = require('./apps/api/dist/lib/tracing');
const traces = queryTracesByError('syntax error', { includeSpans: true });
traces.forEach(t => {
  const dbSpans = (t.spans || []).filter(s => s.operation_type === 'db' && s.error_message);
  dbSpans.forEach(s => console.log(\\\`[Trace: \${t.id}] \${s.error_message}\\\`));
});
\""
```

## Empire Control Panel

The TracingPanel in the Empire Control Panel (`/empire → Tracing`) provides:

1. **Real-time trace list** - See recent traces with filtering
2. **Trace detail view** - Click any trace to see all spans in a waterfall view
3. **Error filtering** - Toggle to show only error traces
4. **Time range selection** - Filter by last hour, day, week
5. **User filtering** - Filter traces by user ID
6. **Statistics** - View aggregate stats (error rate, avg duration)

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/traces` | GET | Admin | List traces with filters |
| `/api/admin/traces/stats` | GET | Admin | Get trace statistics |
| `/api/admin/traces/:traceId` | GET | Admin | Get single trace with spans |
| `/api/admin/traces/cleanup` | DELETE | Admin | Delete old traces |
| `/api/trace-log` | POST | None | Frontend submits spans |

### Query Parameters for `/api/admin/traces`

| Parameter | Type | Description |
|-----------|------|-------------|
| `startTime` | ISO date | Filter by start time |
| `endTime` | ISO date | Filter by end time |
| `userId` | string | Filter by user ID |
| `status` | string | Filter by status (error, success, in_progress) |
| `operationType` | string | Filter by operation type |
| `minDuration` | number | Minimum duration in ms |
| `limit` | number | Results per page (max 500) |
| `offset` | number | Pagination offset |

## Connecting Traces to PM2 Logs

When you find an error trace, correlate with PM2 logs:

```bash
# Get the timestamp from the trace, then search logs
ssh -p 2222 root@musclemap.me "pm2 logs musclemap --lines 500 --nostream | grep -A5 -B5 'TRACE-ID-HERE'"
```

Or search by error message:

```bash
ssh -p 2222 root@musclemap.me "pm2 logs musclemap --lines 1000 --nostream | grep -i 'error-pattern'"
```

## Trace Headers

The tracing system propagates these headers:

| Header | Description |
|--------|-------------|
| `X-Trace-ID` | Root trace identifier |
| `X-Span-ID` | Current span identifier |
| `X-Parent-Span-ID` | Parent span (for nested calls) |
| `X-Session-ID` | Browser session identifier |

These headers allow you to:
1. Search logs by trace ID
2. Correlate frontend actions with backend operations
3. Track a user's journey across multiple requests

## Retention and Cleanup

- Traces are retained for **7 days** by default
- Automatic cleanup can be triggered via DELETE `/api/admin/traces/cleanup?days=7`
- Database is stored at `apps/api/data/traces.db`

## Best Practices for Claude Instances

1. **Always check traces first** when debugging production issues
2. **Use error patterns** to find recurring issues (`getErrorStats`)
3. **Look at span durations** to identify performance bottlenecks
4. **Check related traces** in the same session for context
5. **Correlate with PM2 logs** using trace IDs
6. **Filter by user** when debugging user-reported issues

## Quick Reference Commands

```bash
# Get database stats
ssh -p 2222 root@musclemap.me "cd /var/www/musclemap.me && node -e \"
const { getDbStats } = require('./apps/api/dist/lib/tracing');
console.log(getDbStats());
\""

# Get trace statistics
ssh -p 2222 root@musclemap.me "cd /var/www/musclemap.me && node -e \"
const { getTraceStats } = require('./apps/api/dist/lib/tracing');
console.log(getTraceStats());
\""

# List recent errors (last 20)
ssh -p 2222 root@musclemap.me "cd /var/www/musclemap.me && node -e \"
const { getRecentErrors } = require('./apps/api/dist/lib/tracing');
getRecentErrors(20).forEach(e => console.log(JSON.stringify(e)));
\""

# Find traces by error pattern
ssh -p 2222 root@musclemap.me "cd /var/www/musclemap.me && node -e \"
const { queryTracesByError } = require('./apps/api/dist/lib/tracing');
console.log(JSON.stringify(queryTracesByError('YOUR-ERROR-PATTERN', { limit: 5 }), null, 2));
\""
```
