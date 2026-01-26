# Admin Empire Expansion Plan

## Executive Summary

The Empire Control Panel (`/empire`) is MuscleMap's master admin interface. Currently, **12 of 25 sections are stubs** that need implementation. This document provides detailed specifications for completing each panel.

---

## Current State Analysis

### Empire Panel Status

| Panel | Status | Priority | Complexity | Notes |
|-------|--------|----------|------------|-------|
| Overview | ✅ Complete | - | - | Dashboard with metrics |
| Server Control | 🔧 Stub | **P0** | Medium | PM2 commands, restart, logs |
| Database | 🔧 Stub | **P0** | Medium | Query runner, stats, vacuum |
| Security | 🔧 Stub | **P0** | High | Auth logs, ban management |
| Alerts | 🔧 Stub | **P1** | Medium | Error tracking, notifications |
| Feature Flags | 🔧 Stub | **P1** | Low | Toggle features |
| Log Analysis | 🔧 Stub | **P1** | Medium | Search & filter logs |
| Backup & Recovery | 🔧 Stub | **P1** | High | Backup triggers, restore |
| User Analytics | 🔧 Stub | **P2** | Medium | User stats, cohorts |
| Community Management | 🔧 Stub | **P2** | Medium | Moderation tools |
| Scheduler | 🔧 Stub | **P2** | Medium | Cron job management |
| Environment | 🔧 Stub | **P3** | Low | Env var display |
| Deployments | ✅ Link | - | - | Goes to `/empire/deploy` |
| BuildNet | 🔧 Stub | **P2** | Medium | Build system control |
| Command Center | ✅ Link | - | - | Goes to `/empire/commands` |
| Real-time Metrics | ⚠️ Partial | **P1** | Medium | Needs enhancement |
| Documentation | 🔧 Stub | **P3** | Low | Docs viewer |
| Feedback Queue | 🔧 Stub | **P2** | Medium | User feedback |
| Bug Tracker | ✅ Link | - | - | Goes to `/empire/bugs` |
| GA Analytics | 🔧 Stub | **P3** | Low | External link |
| System Metrics | 🔧 Stub | **P2** | Medium | CPU, Memory, Disk |
| Test Scorecard | ✅ Link | - | - | Goes to `/empire/scorecard` |
| Users | ⚠️ Partial | **P1** | Medium | Needs full management |
| Economy | ⚠️ Partial | **P1** | Medium | Needs transaction view |
| Messages | 🔧 Stub | **P2** | Medium | Admin messaging |
| My Avatar | 🔧 Stub | **P3** | Low | Owner settings |
| Slack | 🔧 Stub | **P2** | Medium | Integration |
| Settings | 🔧 Stub | **P2** | Low | System settings |

---

## P0: Critical Admin Panels (Week 1)

### 1. Server Control Panel

**Purpose:** Monitor and control the application server (PM2, Node.js processes).

#### Features

1. **Process List**
   - Show all PM2 processes with status
   - Memory usage per process
   - CPU usage per process
   - Uptime
   - Restart count

2. **Process Controls**
   - Restart individual process
   - Restart all processes
   - Stop process (with confirmation)
   - Reload process (zero-downtime)

3. **Real-time Logs**
   - Stream logs via WebSocket
   - Filter by log level (error, warn, info)
   - Search within logs
   - Download log file

4. **System Health**
   - Node.js version
   - Memory usage (heap, RSS)
   - Event loop lag
   - Active handles/requests

#### Implementation

```tsx
// src/pages/Empire/panels/ServerControlPanel.tsx

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Card, Button, Badge, Table, ScrollArea } from '@/components/ui';

interface PM2Process {
  name: string;
  pm_id: number;
  status: 'online' | 'stopped' | 'errored';
  memory: number;
  cpu: number;
  uptime: number;
  restarts: number;
}

export function ServerControlPanel() {
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);

  // GraphQL queries
  const { data: processData, refetch } = useQuery(PM2_PROCESSES_QUERY, {
    pollInterval: 5000, // Refresh every 5 seconds
  });

  const [restartProcess] = useMutation(RESTART_PROCESS_MUTATION);
  const [reloadProcess] = useMutation(RELOAD_PROCESS_MUTATION);

  // WebSocket for real-time logs
  useEffect(() => {
    const ws = new WebSocket(`wss://${window.location.host}/api/admin/logs`);
    ws.onmessage = (event) => {
      setLogs(prev => [...prev.slice(-500), event.data]);
    };
    return () => ws.close();
  }, []);

  return (
    <div className="space-y-6">
      {/* Process List */}
      <Card>
        <Card.Header>
          <Card.Title>PM2 Processes</Card.Title>
          <Button onClick={() => refetch()} size="sm">Refresh</Button>
        </Card.Header>
        <Card.Content>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>Name</Table.Head>
                <Table.Head>Status</Table.Head>
                <Table.Head>Memory</Table.Head>
                <Table.Head>CPU</Table.Head>
                <Table.Head>Uptime</Table.Head>
                <Table.Head>Restarts</Table.Head>
                <Table.Head>Actions</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {processData?.pm2Processes.map((proc: PM2Process) => (
                <Table.Row key={proc.pm_id}>
                  <Table.Cell>{proc.name}</Table.Cell>
                  <Table.Cell>
                    <Badge variant={proc.status === 'online' ? 'success' : 'error'}>
                      {proc.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{formatBytes(proc.memory)}</Table.Cell>
                  <Table.Cell>{proc.cpu}%</Table.Cell>
                  <Table.Cell>{formatUptime(proc.uptime)}</Table.Cell>
                  <Table.Cell>{proc.restarts}</Table.Cell>
                  <Table.Cell>
                    <Button
                      size="xs"
                      onClick={() => restartProcess({ variables: { name: proc.name } })}
                    >
                      Restart
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => reloadProcess({ variables: { name: proc.name } })}
                    >
                      Reload
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card.Content>
      </Card>

      {/* Real-time Logs */}
      <Card>
        <Card.Header>
          <Card.Title>Live Logs</Card.Title>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setLogs([])}>
              Clear
            </Button>
            <Button size="sm" variant="outline" onClick={downloadLogs}>
              Download
            </Button>
          </div>
        </Card.Header>
        <Card.Content>
          <ScrollArea className="h-96 bg-black rounded-lg p-4 font-mono text-sm">
            {logs.map((log, i) => (
              <div key={i} className={getLogColor(log)}>
                {log}
              </div>
            ))}
          </ScrollArea>
        </Card.Content>
      </Card>
    </div>
  );
}
```

#### Backend API Needed

```typescript
// apps/api/src/http/routes/admin/server.ts

import pm2 from 'pm2';

fastify.get('/admin/pm2/processes', async (request, reply) => {
  return new Promise((resolve, reject) => {
    pm2.list((err, list) => {
      if (err) reject(err);
      resolve(list.map(proc => ({
        name: proc.name,
        pm_id: proc.pm_id,
        status: proc.pm2_env?.status,
        memory: proc.monit?.memory,
        cpu: proc.monit?.cpu,
        uptime: proc.pm2_env?.pm_uptime,
        restarts: proc.pm2_env?.restart_time,
      })));
    });
  });
});

fastify.post('/admin/pm2/restart/:name', async (request, reply) => {
  const { name } = request.params;
  return new Promise((resolve, reject) => {
    pm2.restart(name, (err) => {
      if (err) reject(err);
      resolve({ success: true, message: `Process ${name} restarted` });
    });
  });
});

fastify.post('/admin/pm2/reload/:name', async (request, reply) => {
  const { name } = request.params;
  return new Promise((resolve, reject) => {
    pm2.reload(name, (err) => {
      if (err) reject(err);
      resolve({ success: true, message: `Process ${name} reloaded` });
    });
  });
});

// WebSocket for real-time logs
fastify.get('/admin/logs', { websocket: true }, (connection, request) => {
  const logStream = createLogStream(); // Tail the PM2 logs
  logStream.on('data', (chunk) => {
    connection.socket.send(chunk.toString());
  });
  connection.socket.on('close', () => {
    logStream.destroy();
  });
});
```

---

### 2. Database Panel

**Purpose:** Monitor database health and run administrative queries.

#### Features

1. **Connection Stats**
   - Active connections
   - Idle connections
   - Waiting connections
   - Max connections

2. **Query Runner**
   - Execute read-only queries (by default)
   - Syntax highlighting
   - Query history
   - Export results to CSV/JSON

3. **Table Stats**
   - Table sizes
   - Row counts
   - Index usage
   - Dead tuples

4. **Maintenance**
   - VACUUM trigger
   - ANALYZE trigger
   - Reindex trigger
   - Connection termination

5. **Slow Query Log**
   - Queries > 1 second
   - Query plans
   - Frequency analysis

#### Implementation

```tsx
// src/pages/Empire/panels/DatabasePanel.tsx

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Card, Button, Table, Textarea, Select } from '@/components/ui';
import { CodeEditor } from '@/components/CodeEditor';

export function DatabasePanel() {
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [isWriteMode, setIsWriteMode] = useState(false);

  const { data: stats } = useQuery(DATABASE_STATS_QUERY, {
    pollInterval: 10000,
  });

  const { data: tableStats } = useQuery(TABLE_STATS_QUERY);

  const [executeQuery, { loading: executing }] = useMutation(EXECUTE_QUERY_MUTATION);
  const [runVacuum] = useMutation(RUN_VACUUM_MUTATION);
  const [runAnalyze] = useMutation(RUN_ANALYZE_MUTATION);

  const handleExecute = async () => {
    try {
      const result = await executeQuery({
        variables: { query, readOnly: !isWriteMode },
      });
      setQueryResult(result.data.executeQuery);
    } catch (err) {
      setQueryResult({ error: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Active"
          value={stats?.dbStats.active}
          color="green"
        />
        <StatCard
          title="Idle"
          value={stats?.dbStats.idle}
          color="blue"
        />
        <StatCard
          title="Waiting"
          value={stats?.dbStats.waiting}
          color="yellow"
        />
        <StatCard
          title="Max"
          value={stats?.dbStats.max}
          color="gray"
        />
      </div>

      {/* Query Runner */}
      <Card>
        <Card.Header>
          <Card.Title>Query Runner</Card.Title>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isWriteMode}
                onChange={(e) => setIsWriteMode(e.target.checked)}
              />
              <span className="text-sm">Enable writes (dangerous)</span>
            </label>
          </div>
        </Card.Header>
        <Card.Content>
          <CodeEditor
            value={query}
            onChange={setQuery}
            language="sql"
            className="h-32"
          />
          <div className="flex justify-between mt-4">
            <Button onClick={handleExecute} loading={executing}>
              Execute
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => exportCSV(queryResult)}>
                Export CSV
              </Button>
              <Button variant="outline" onClick={() => exportJSON(queryResult)}>
                Export JSON
              </Button>
            </div>
          </div>

          {queryResult && (
            <div className="mt-4">
              {queryResult.error ? (
                <div className="text-red-500">{queryResult.error}</div>
              ) : (
                <Table>
                  <Table.Header>
                    <Table.Row>
                      {queryResult.columns?.map((col: string) => (
                        <Table.Head key={col}>{col}</Table.Head>
                      ))}
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {queryResult.rows?.map((row: any, i: number) => (
                      <Table.Row key={i}>
                        {queryResult.columns?.map((col: string) => (
                          <Table.Cell key={col}>{JSON.stringify(row[col])}</Table.Cell>
                        ))}
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              )}
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Table Stats */}
      <Card>
        <Card.Header>
          <Card.Title>Table Statistics</Card.Title>
        </Card.Header>
        <Card.Content>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>Table</Table.Head>
                <Table.Head>Rows</Table.Head>
                <Table.Head>Size</Table.Head>
                <Table.Head>Index Usage</Table.Head>
                <Table.Head>Dead Tuples</Table.Head>
                <Table.Head>Last Vacuum</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {tableStats?.tableStats.map((table: any) => (
                <Table.Row key={table.name}>
                  <Table.Cell>{table.name}</Table.Cell>
                  <Table.Cell>{formatNumber(table.rowCount)}</Table.Cell>
                  <Table.Cell>{formatBytes(table.size)}</Table.Cell>
                  <Table.Cell>{table.indexUsage}%</Table.Cell>
                  <Table.Cell>{formatNumber(table.deadTuples)}</Table.Cell>
                  <Table.Cell>{formatDate(table.lastVacuum)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card.Content>
      </Card>

      {/* Maintenance */}
      <Card>
        <Card.Header>
          <Card.Title>Maintenance</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => runVacuum()}
            >
              Run VACUUM
            </Button>
            <Button
              variant="outline"
              onClick={() => runAnalyze()}
            >
              Run ANALYZE
            </Button>
            <Button
              variant="destructive"
              onClick={() => {/* terminate idle connections */}}
            >
              Kill Idle Connections
            </Button>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
```

#### Backend API Needed

```typescript
// apps/api/src/http/routes/admin/database.ts

fastify.get('/admin/db/stats', async () => {
  const result = await query(`
    SELECT
      (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active,
      (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle,
      (SELECT count(*) FROM pg_stat_activity WHERE wait_event IS NOT NULL) as waiting,
      (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max
  `);
  return result.rows[0];
});

fastify.get('/admin/db/tables', async () => {
  const result = await query(`
    SELECT
      schemaname || '.' || relname as name,
      n_live_tup as row_count,
      pg_total_relation_size(relid) as size,
      CASE WHEN idx_scan + seq_scan > 0
        THEN round(100.0 * idx_scan / (idx_scan + seq_scan), 2)
        ELSE 0 END as index_usage,
      n_dead_tup as dead_tuples,
      last_vacuum
    FROM pg_stat_user_tables
    ORDER BY pg_total_relation_size(relid) DESC
  `);
  return result.rows;
});

fastify.post('/admin/db/query', async (request) => {
  const { query: sql, readOnly } = request.body;

  // Safety checks
  if (readOnly) {
    const forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER'];
    const upperSql = sql.toUpperCase();
    if (forbidden.some(word => upperSql.includes(word))) {
      throw new Error('Write operations not allowed in read-only mode');
    }
  }

  // Set statement timeout
  await query('SET statement_timeout = 30000'); // 30 seconds

  try {
    const result = await query(sql);
    return {
      columns: result.fields?.map(f => f.name),
      rows: result.rows,
      rowCount: result.rowCount,
    };
  } finally {
    await query('RESET statement_timeout');
  }
});

fastify.post('/admin/db/vacuum', async () => {
  await query('VACUUM ANALYZE');
  return { success: true };
});
```

---

### 3. Security Panel

**Purpose:** Monitor security events and manage user access.

#### Features

1. **Authentication Log**
   - Recent login attempts
   - Failed login tracking
   - IP-based analysis
   - Geo-location display

2. **Active Sessions**
   - All active user sessions
   - Device information
   - Session age
   - Force logout capability

3. **IP Management**
   - Ban IP addresses
   - Whitelist IPs
   - Temporary bans
   - Ban history

4. **Suspicious Activity**
   - Brute force attempts
   - Rate limit violations
   - Unusual patterns
   - Automated alerts

5. **User Bans**
   - Active bans
   - Ban reasons
   - Ban duration
   - Unban capability

#### Implementation

```tsx
// src/pages/Empire/panels/SecurityPanel.tsx

export function SecurityPanel() {
  const { data: authLogs } = useQuery(AUTH_LOGS_QUERY, {
    variables: { limit: 100 },
  });

  const { data: sessions } = useQuery(ACTIVE_SESSIONS_QUERY);
  const { data: bannedIPs } = useQuery(BANNED_IPS_QUERY);
  const { data: bannedUsers } = useQuery(BANNED_USERS_QUERY);

  const [banIP] = useMutation(BAN_IP_MUTATION);
  const [unbanIP] = useMutation(UNBAN_IP_MUTATION);
  const [terminateSession] = useMutation(TERMINATE_SESSION_MUTATION);

  return (
    <div className="space-y-6">
      {/* Authentication Log */}
      <Card>
        <Card.Header>
          <Card.Title>Recent Authentication Events</Card.Title>
        </Card.Header>
        <Card.Content>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>Time</Table.Head>
                <Table.Head>User</Table.Head>
                <Table.Head>Action</Table.Head>
                <Table.Head>IP</Table.Head>
                <Table.Head>Location</Table.Head>
                <Table.Head>Status</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {authLogs?.authenticationLogs.map((log: any) => (
                <Table.Row key={log.id}>
                  <Table.Cell>{formatDateTime(log.timestamp)}</Table.Cell>
                  <Table.Cell>{log.username || log.email}</Table.Cell>
                  <Table.Cell>{log.action}</Table.Cell>
                  <Table.Cell>
                    <span className="font-mono">{log.ip}</span>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => banIP({ variables: { ip: log.ip } })}
                    >
                      Ban
                    </Button>
                  </Table.Cell>
                  <Table.Cell>{log.location}</Table.Cell>
                  <Table.Cell>
                    <Badge variant={log.success ? 'success' : 'error'}>
                      {log.success ? 'Success' : 'Failed'}
                    </Badge>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card.Content>
      </Card>

      {/* Active Sessions */}
      <Card>
        <Card.Header>
          <Card.Title>Active Sessions ({sessions?.activeSessions.length})</Card.Title>
        </Card.Header>
        <Card.Content>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>User</Table.Head>
                <Table.Head>Device</Table.Head>
                <Table.Head>IP</Table.Head>
                <Table.Head>Started</Table.Head>
                <Table.Head>Last Active</Table.Head>
                <Table.Head>Actions</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sessions?.activeSessions.map((session: any) => (
                <Table.Row key={session.id}>
                  <Table.Cell>{session.username}</Table.Cell>
                  <Table.Cell>{session.deviceInfo}</Table.Cell>
                  <Table.Cell>{session.ip}</Table.Cell>
                  <Table.Cell>{formatDateTime(session.createdAt)}</Table.Cell>
                  <Table.Cell>{formatDateTime(session.lastActive)}</Table.Cell>
                  <Table.Cell>
                    <Button
                      size="xs"
                      variant="destructive"
                      onClick={() => terminateSession({ variables: { id: session.id } })}
                    >
                      Terminate
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card.Content>
      </Card>

      {/* Banned IPs */}
      <Card>
        <Card.Header>
          <Card.Title>Banned IPs</Card.Title>
          <Button size="sm" onClick={() => setShowBanModal(true)}>
            Add Ban
          </Button>
        </Card.Header>
        <Card.Content>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>IP</Table.Head>
                <Table.Head>Reason</Table.Head>
                <Table.Head>Banned At</Table.Head>
                <Table.Head>Expires</Table.Head>
                <Table.Head>Actions</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {bannedIPs?.bannedIPs.map((ban: any) => (
                <Table.Row key={ban.ip}>
                  <Table.Cell className="font-mono">{ban.ip}</Table.Cell>
                  <Table.Cell>{ban.reason}</Table.Cell>
                  <Table.Cell>{formatDateTime(ban.bannedAt)}</Table.Cell>
                  <Table.Cell>
                    {ban.expiresAt ? formatDateTime(ban.expiresAt) : 'Permanent'}
                  </Table.Cell>
                  <Table.Cell>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => unbanIP({ variables: { ip: ban.ip } })}
                    >
                      Unban
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card.Content>
      </Card>

      {/* Suspicious Activity */}
      <Card>
        <Card.Header>
          <Card.Title>Suspicious Activity Alerts</Card.Title>
        </Card.Header>
        <Card.Content>
          <SuspiciousActivityList />
        </Card.Content>
      </Card>
    </div>
  );
}
```

---

## P1: High Priority Panels (Week 2-3)

### 4. Feature Flags Panel

**Purpose:** Toggle features on/off without deployment.

#### Features

1. **Flag List**
   - All feature flags with status
   - Quick toggle
   - Percentage rollout slider

2. **Flag Details**
   - Description
   - Created/updated dates
   - Usage statistics

3. **User Overrides**
   - Enable for specific users
   - Disable for specific users
   - Group overrides

4. **Audit Log**
   - All flag changes
   - Who changed what
   - When

#### Database Migration

```sql
-- Migration: XXX_feature_flags.ts
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false,
  percentage INT DEFAULT 100 CHECK (percentage >= 0 AND percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT REFERENCES users(id)
);

CREATE TABLE feature_flag_overrides (
  flag_id UUID REFERENCES feature_flags(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (flag_id, user_id)
);

CREATE TABLE feature_flag_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID REFERENCES feature_flags(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted'
  old_value JSONB,
  new_value JSONB,
  changed_by TEXT REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_feature_flags_key ON feature_flags(key);
CREATE INDEX idx_feature_flag_overrides_user ON feature_flag_overrides(user_id);
CREATE INDEX idx_feature_flag_audit_flag ON feature_flag_audit(flag_id);
```

#### Implementation

```tsx
// src/pages/Empire/panels/FeatureFlagsPanel.tsx

export function FeatureFlagsPanel() {
  const { data: flags, refetch } = useQuery(FEATURE_FLAGS_QUERY);
  const [toggleFlag] = useMutation(TOGGLE_FEATURE_FLAG_MUTATION);
  const [updatePercentage] = useMutation(UPDATE_FLAG_PERCENTAGE_MUTATION);

  return (
    <div className="space-y-6">
      <Card>
        <Card.Header>
          <Card.Title>Feature Flags</Card.Title>
          <Button onClick={() => setShowCreateModal(true)}>
            Create Flag
          </Button>
        </Card.Header>
        <Card.Content>
          <div className="space-y-4">
            {flags?.featureFlags.map((flag: any) => (
              <div
                key={flag.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <div className="font-semibold">{flag.name}</div>
                  <div className="text-sm text-gray-500">{flag.key}</div>
                  <div className="text-sm text-gray-400">{flag.description}</div>
                </div>
                <div className="flex items-center gap-4">
                  {/* Percentage Rollout */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{flag.percentage}%</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={flag.percentage}
                      onChange={(e) => updatePercentage({
                        variables: { id: flag.id, percentage: parseInt(e.target.value) }
                      })}
                      className="w-24"
                    />
                  </div>

                  {/* Toggle */}
                  <Switch
                    checked={flag.enabled}
                    onChange={() => toggleFlag({ variables: { id: flag.id } })}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card.Content>
      </Card>

      {/* Audit Log */}
      <Card>
        <Card.Header>
          <Card.Title>Recent Changes</Card.Title>
        </Card.Header>
        <Card.Content>
          <FeatureFlagAuditLog />
        </Card.Content>
      </Card>
    </div>
  );
}
```

---

### 5. Alerts Panel

**Purpose:** Monitor system health and receive alerts.

#### Features

1. **Alert Rules**
   - Error rate thresholds
   - Response time alerts
   - Memory/CPU alerts
   - Custom metric alerts

2. **Alert History**
   - All triggered alerts
   - Resolution status
   - Acknowledgement

3. **Notification Channels**
   - Email configuration
   - Slack webhook
   - Discord webhook
   - PagerDuty integration

4. **Real-time Dashboard**
   - Current alert status
   - System health overview
   - Quick actions

#### Database Migration

```sql
-- Migration: XXX_alert_system.ts
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  metric TEXT NOT NULL, -- 'error_rate', 'latency_p99', 'memory', 'cpu', 'custom'
  condition TEXT NOT NULL, -- 'gt', 'lt', 'eq', 'gte', 'lte'
  threshold NUMERIC NOT NULL,
  window_minutes INT DEFAULT 5,
  severity TEXT DEFAULT 'warning', -- 'info', 'warning', 'critical'
  enabled BOOLEAN DEFAULT true,
  channels JSONB DEFAULT '[]', -- ['slack', 'email', 'pagerduty']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alert_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES alert_rules(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'firing', -- 'firing', 'acknowledged', 'resolved'
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  triggered_value NUMERIC NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

CREATE TABLE alert_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES alert_incidents(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL, -- 'sent', 'failed'
  error_message TEXT
);

CREATE TABLE notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'slack', 'email', 'discord', 'pagerduty'
  name TEXT NOT NULL,
  config JSONB NOT NULL, -- webhook URL, email, etc.
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_alert_incidents_status ON alert_incidents(status) WHERE status = 'firing';
CREATE INDEX idx_alert_incidents_rule ON alert_incidents(rule_id);
```

#### Implementation

```tsx
// src/pages/Empire/panels/AlertsPanel.tsx

export function AlertsPanel() {
  const { data: activeIncidents } = useQuery(ACTIVE_INCIDENTS_QUERY, {
    pollInterval: 10000,
  });

  const { data: rules } = useQuery(ALERT_RULES_QUERY);
  const { data: channels } = useQuery(NOTIFICATION_CHANNELS_QUERY);

  const [acknowledgeIncident] = useMutation(ACKNOWLEDGE_INCIDENT_MUTATION);
  const [resolveIncident] = useMutation(RESOLVE_INCIDENT_MUTATION);

  return (
    <div className="space-y-6">
      {/* Active Incidents */}
      {activeIncidents?.activeIncidents.length > 0 && (
        <Card className="border-red-500">
          <Card.Header>
            <Card.Title className="text-red-500">
              Active Alerts ({activeIncidents.activeIncidents.length})
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-4">
              {activeIncidents.activeIncidents.map((incident: any) => (
                <div
                  key={incident.id}
                  className="p-4 border-l-4 border-red-500 bg-red-50 rounded"
                >
                  <div className="flex justify-between">
                    <div>
                      <div className="font-semibold">{incident.rule.name}</div>
                      <div className="text-sm">
                        {incident.rule.metric} is {incident.triggeredValue}
                        (threshold: {incident.rule.threshold})
                      </div>
                      <div className="text-xs text-gray-500">
                        Since {formatDateTime(incident.triggeredAt)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => acknowledgeIncident({ variables: { id: incident.id } })}
                      >
                        Acknowledge
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveIncident({ variables: { id: incident.id } })}
                      >
                        Resolve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Alert Rules */}
      <Card>
        <Card.Header>
          <Card.Title>Alert Rules</Card.Title>
          <Button onClick={() => setShowCreateRule(true)}>Create Rule</Button>
        </Card.Header>
        <Card.Content>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>Name</Table.Head>
                <Table.Head>Metric</Table.Head>
                <Table.Head>Condition</Table.Head>
                <Table.Head>Severity</Table.Head>
                <Table.Head>Status</Table.Head>
                <Table.Head>Actions</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rules?.alertRules.map((rule: any) => (
                <Table.Row key={rule.id}>
                  <Table.Cell>{rule.name}</Table.Cell>
                  <Table.Cell>{rule.metric}</Table.Cell>
                  <Table.Cell>{rule.condition} {rule.threshold}</Table.Cell>
                  <Table.Cell>
                    <Badge variant={getSeverityVariant(rule.severity)}>
                      {rule.severity}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Switch checked={rule.enabled} />
                  </Table.Cell>
                  <Table.Cell>
                    <Button size="xs" variant="ghost">Edit</Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card.Content>
      </Card>

      {/* Notification Channels */}
      <Card>
        <Card.Header>
          <Card.Title>Notification Channels</Card.Title>
          <Button size="sm" onClick={() => setShowAddChannel(true)}>
            Add Channel
          </Button>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-2 gap-4">
            {channels?.notificationChannels.map((channel: any) => (
              <div key={channel.id} className="p-4 border rounded-lg">
                <div className="flex items-center gap-2">
                  {getChannelIcon(channel.type)}
                  <span className="font-semibold">{channel.name}</span>
                </div>
                <div className="text-sm text-gray-500">{channel.type}</div>
                <div className="mt-2">
                  <Badge variant={channel.enabled ? 'success' : 'default'}>
                    {channel.enabled ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
```

---

### 6. User Analytics Panel

**Purpose:** Understand user behavior and engagement.

#### Features

1. **Growth Metrics**
   - New users over time
   - Total users
   - Growth rate

2. **Engagement Metrics**
   - DAU/WAU/MAU
   - Session duration
   - Pages per session
   - Feature adoption

3. **Retention Cohorts**
   - Weekly cohort analysis
   - Retention by archetype
   - Churn prediction

4. **User Segments**
   - Power users
   - At-risk users
   - New users
   - Churned users

#### Implementation

```tsx
// src/pages/Empire/panels/UserAnalyticsPanel.tsx

export function UserAnalyticsPanel() {
  const [timeRange, setTimeRange] = useState('30d');

  const { data: growth } = useQuery(USER_GROWTH_QUERY, {
    variables: { range: timeRange },
  });

  const { data: engagement } = useQuery(ENGAGEMENT_METRICS_QUERY, {
    variables: { range: timeRange },
  });

  const { data: cohorts } = useQuery(RETENTION_COHORTS_QUERY);
  const { data: segments } = useQuery(USER_SEGMENTS_QUERY);

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-end">
        <Select value={timeRange} onChange={setTimeRange}>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </Select>
      </div>

      {/* Growth Overview */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Total Users"
          value={growth?.totalUsers}
          change={growth?.userGrowthRate}
        />
        <MetricCard
          title="New Users"
          value={growth?.newUsers}
          subtitle={`Last ${timeRange}`}
        />
        <MetricCard
          title="DAU"
          value={engagement?.dau}
          change={engagement?.dauChange}
        />
        <MetricCard
          title="WAU"
          value={engagement?.wau}
          change={engagement?.wauChange}
        />
      </div>

      {/* User Growth Chart */}
      <Card>
        <Card.Header>
          <Card.Title>User Growth</Card.Title>
        </Card.Header>
        <Card.Content>
          <LineChart
            data={growth?.dailySignups}
            xKey="date"
            yKey="count"
            height={300}
          />
        </Card.Content>
      </Card>

      {/* Retention Cohorts */}
      <Card>
        <Card.Header>
          <Card.Title>Retention Cohorts</Card.Title>
        </Card.Header>
        <Card.Content>
          <RetentionHeatmap data={cohorts?.retentionCohorts} />
        </Card.Content>
      </Card>

      {/* User Segments */}
      <Card>
        <Card.Header>
          <Card.Title>User Segments</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-4 gap-4">
            <SegmentCard
              title="Power Users"
              count={segments?.powerUsers}
              description="5+ workouts/week"
              color="green"
            />
            <SegmentCard
              title="Active Users"
              count={segments?.activeUsers}
              description="1-4 workouts/week"
              color="blue"
            />
            <SegmentCard
              title="At Risk"
              count={segments?.atRiskUsers}
              description="No activity in 7 days"
              color="yellow"
            />
            <SegmentCard
              title="Churned"
              count={segments?.churnedUsers}
              description="No activity in 30 days"
              color="red"
            />
          </div>
        </Card.Content>
      </Card>

      {/* Feature Adoption */}
      <Card>
        <Card.Header>
          <Card.Title>Feature Adoption</Card.Title>
        </Card.Header>
        <Card.Content>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>Feature</Table.Head>
                <Table.Head>Users</Table.Head>
                <Table.Head>Adoption Rate</Table.Head>
                <Table.Head>Trend</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {engagement?.featureAdoption.map((feature: any) => (
                <Table.Row key={feature.name}>
                  <Table.Cell>{feature.name}</Table.Cell>
                  <Table.Cell>{formatNumber(feature.users)}</Table.Cell>
                  <Table.Cell>
                    <ProgressBar value={feature.adoptionRate} />
                  </Table.Cell>
                  <Table.Cell>
                    <TrendIndicator value={feature.trend} />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card.Content>
      </Card>
    </div>
  );
}
```

---

## P2: Medium Priority Panels (Week 4-5)

### 7. Backup & Recovery Panel

#### Features
- Manual backup trigger
- Backup schedule view
- Backup history with sizes
- Point-in-time recovery
- Download backups

### 8. Community Management Panel

#### Features
- Content moderation queue
- Reported content
- User flags
- Community statistics
- Moderation actions

### 9. Scheduler Panel

#### Features
- Cron job list
- Job history
- Manual trigger
- Job configuration
- Failure alerts

### 10. BuildNet Panel

#### Features
- Build status
- Build history
- Cache statistics
- Trigger builds
- View build logs

---

## P3: Lower Priority Panels (Week 6+)

### 11. Environment Panel
- Environment variables (masked)
- Configuration overview
- Deployment environment

### 12. Documentation Panel
- Inline documentation viewer
- API documentation
- Architecture diagrams

### 13. Slack Integration Panel
- Webhook configuration
- Channel mapping
- Test notifications

---

## Implementation Timeline

| Week | Panels | Effort |
|------|--------|--------|
| Week 1 | Server Control, Database, Security | 40 hours |
| Week 2 | Feature Flags, Alerts | 30 hours |
| Week 3 | User Analytics, Users (enhanced) | 30 hours |
| Week 4 | Backup & Recovery, Community Management | 30 hours |
| Week 5 | Scheduler, BuildNet | 25 hours |
| Week 6 | Environment, Documentation, Slack | 20 hours |

**Total Estimated Effort:** ~175 hours (4-5 weeks)

---

## GraphQL Schema Additions

```graphql
# Add to apps/api/src/graphql/schema.ts

# Server Control
type PM2Process {
  name: String!
  pm_id: Int!
  status: String!
  memory: Int!
  cpu: Float!
  uptime: Int!
  restarts: Int!
}

type Query {
  # Existing queries...

  # Admin: Server Control
  pm2Processes: [PM2Process!]!
  serverHealth: ServerHealth!

  # Admin: Database
  databaseStats: DatabaseStats!
  tableStats: [TableStats!]!
  slowQueries(limit: Int): [SlowQuery!]!

  # Admin: Security
  authenticationLogs(limit: Int): [AuthLog!]!
  activeSessions: [Session!]!
  bannedIPs: [IPBan!]!
  bannedUsers: [UserBan!]!
  suspiciousActivity(limit: Int): [SuspiciousActivity!]!

  # Admin: Feature Flags
  featureFlags: [FeatureFlag!]!
  featureFlag(key: String!): FeatureFlag
  featureFlagAudit(flagId: ID!, limit: Int): [FeatureFlagAudit!]!

  # Admin: Alerts
  alertRules: [AlertRule!]!
  activeIncidents: [AlertIncident!]!
  alertHistory(limit: Int): [AlertIncident!]!
  notificationChannels: [NotificationChannel!]!

  # Admin: User Analytics
  userGrowthStats(range: String!): UserGrowthStats!
  engagementMetrics(range: String!): EngagementMetrics!
  retentionCohorts: [RetentionCohort!]!
  userSegments: UserSegments!
  featureAdoption: [FeatureAdoption!]!
}

type Mutation {
  # Existing mutations...

  # Admin: Server Control
  restartProcess(name: String!): ProcessActionResult!
  reloadProcess(name: String!): ProcessActionResult!

  # Admin: Database
  executeQuery(query: String!, readOnly: Boolean): QueryResult!
  runVacuum: MaintenanceResult!
  runAnalyze: MaintenanceResult!
  killIdleConnections: MaintenanceResult!

  # Admin: Security
  banIP(ip: String!, reason: String!, duration: Int): IPBan!
  unbanIP(ip: String!): Boolean!
  terminateSession(id: ID!): Boolean!
  terminateAllUserSessions(userId: ID!): Boolean!

  # Admin: Feature Flags
  createFeatureFlag(input: FeatureFlagInput!): FeatureFlag!
  updateFeatureFlag(id: ID!, input: FeatureFlagInput!): FeatureFlag!
  toggleFeatureFlag(id: ID!): FeatureFlag!
  updateFlagPercentage(id: ID!, percentage: Int!): FeatureFlag!
  setFlagOverride(flagId: ID!, userId: ID!, enabled: Boolean!): FeatureFlagOverride!
  deleteFlagOverride(flagId: ID!, userId: ID!): Boolean!

  # Admin: Alerts
  createAlertRule(input: AlertRuleInput!): AlertRule!
  updateAlertRule(id: ID!, input: AlertRuleInput!): AlertRule!
  deleteAlertRule(id: ID!): Boolean!
  toggleAlertRule(id: ID!): AlertRule!
  acknowledgeIncident(id: ID!): AlertIncident!
  resolveIncident(id: ID!, notes: String): AlertIncident!
  createNotificationChannel(input: NotificationChannelInput!): NotificationChannel!
  testNotificationChannel(id: ID!): TestNotificationResult!
}
```

---

## Security Considerations

### Access Control

All admin endpoints must:
1. Verify admin/owner role
2. Log all actions to audit table
3. Rate limit sensitive operations
4. Require re-authentication for destructive actions

### Sensitive Data

1. **Database Panel**
   - Query whitelist for production
   - No access to password columns
   - Statement timeout enforcement

2. **Security Panel**
   - Mask full IPs in some contexts
   - Limit session data exposure

3. **Environment Panel**
   - Mask all secret values
   - Read-only display

---

## Testing Requirements

1. **Unit Tests**
   - All GraphQL resolvers
   - Permission checks
   - Input validation

2. **Integration Tests**
   - Database operations
   - PM2 interactions
   - Alert triggering

3. **E2E Tests**
   - Admin workflows
   - Permission boundaries
   - Audit logging

---

## Monitoring

After deployment, monitor:
- Admin panel usage
- Query performance
- Error rates
- Security events
