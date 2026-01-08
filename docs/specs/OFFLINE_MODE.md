# Feature: Offline Mode

*Specification v1.0 - January 8, 2026*

## Overview

**Original concept name:** "Offline Mode" / "Field Operations"

**User value:** Log workouts and activities without internet connection, sync when connectivity returns.

**MuscleMap advantage:**
- Critical for military in austere environments
- Essential for firefighters in remote wildland deployments
- Enables training in areas without cell service
- Multi-day offline support (up to 30 days)

**Target users:**
- Military members deployed overseas or in field exercises
- Wildland firefighters in remote locations
- Athletes training in mountains/wilderness
- Users with unreliable internet access
- International travelers

---

## Architecture

### Offline-First Design

```
┌─────────────────────────────────────────────────────────────┐
│                    OFFLINE-FIRST ARCHITECTURE                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    MOBILE APP                        │   │
│  │                                                      │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │              LOCAL DATABASE                    │  │   │
│  │  │                                               │  │   │
│  │  │  • Workouts (pending sync)                    │  │   │
│  │  │  • Activities (pending sync)                  │  │   │
│  │  │  • User profile (cached)                      │  │   │
│  │  │  • Exercise library (cached)                  │  │   │
│  │  │  • Prescriptions (cached)                     │  │   │
│  │  │  • Career standards (cached)                  │  │   │
│  │  │                                               │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  │                          │                          │   │
│  │                          │ Sync when online         │   │
│  │                          ▼                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                             │                               │
│                             │ HTTPS                         │
│                             ▼                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    SERVER                            │   │
│  │                                                      │   │
│  │  PostgreSQL ← Single source of truth                │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Categories

| Category | Offline Support | Sync Direction | Priority |
|----------|-----------------|----------------|----------|
| Workouts | Full create/read | Bi-directional | High |
| Activities | Full create/read | Bi-directional | High |
| Assessments | Full create/read | Bi-directional | High |
| User Profile | Read-only | Server → Client | Medium |
| Exercise Library | Read-only | Server → Client | Low |
| Career Standards | Read-only | Server → Client | Low |
| Prescriptions | Read-only | Server → Client | Medium |
| Community Feed | Not supported | N/A | N/A |
| Messaging | Not supported | N/A | N/A |
| Leaderboards | Not supported | N/A | N/A |

---

## Data Model

### Local Storage Schema

```typescript
// SQLite schema for local storage (React Native)
const localSchema = `
  -- Pending workouts
  CREATE TABLE IF NOT EXISTS pending_workouts (
    local_id TEXT PRIMARY KEY,
    server_id TEXT,
    data TEXT NOT NULL,                 -- JSON blob
    created_at TEXT NOT NULL,
    sync_status TEXT DEFAULT 'pending', -- pending, synced, conflict, failed
    sync_attempted_at TEXT,
    sync_error TEXT,
    version INTEGER DEFAULT 1
  );

  -- Pending activities
  CREATE TABLE IF NOT EXISTS pending_activities (
    local_id TEXT PRIMARY KEY,
    server_id TEXT,
    data TEXT NOT NULL,
    route_data TEXT,                    -- Large GPS data stored separately
    created_at TEXT NOT NULL,
    sync_status TEXT DEFAULT 'pending',
    sync_attempted_at TEXT,
    sync_error TEXT,
    version INTEGER DEFAULT 1
  );

  -- Pending assessments
  CREATE TABLE IF NOT EXISTS pending_assessments (
    local_id TEXT PRIMARY KEY,
    server_id TEXT,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    sync_status TEXT DEFAULT 'pending',
    sync_attempted_at TEXT,
    sync_error TEXT,
    version INTEGER DEFAULT 1
  );

  -- Cached data
  CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    cached_at TEXT NOT NULL,
    expires_at TEXT
  );

  -- Sync metadata
  CREATE TABLE IF NOT EXISTS sync_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;
```

### Sync Queue

```typescript
interface SyncQueueItem {
  id: string;
  type: 'workout' | 'activity' | 'assessment';
  operation: 'create' | 'update' | 'delete';
  localId: string;
  serverId: string | null;
  data: any;
  createdAt: string;
  priority: number;           // 1 = high, 2 = medium, 3 = low
  attempts: number;
  lastAttempt: string | null;
  error: string | null;
}

class SyncQueue {
  private db: SQLiteDatabase;

  async enqueue(item: Omit<SyncQueueItem, 'id' | 'attempts' | 'lastAttempt' | 'error'>): Promise<void> {
    // Add to queue with generated ID
  }

  async dequeue(): Promise<SyncQueueItem | null> {
    // Get highest priority, oldest item
  }

  async markComplete(id: string, serverId: string): Promise<void> {
    // Remove from queue, update local record with serverId
  }

  async markFailed(id: string, error: string): Promise<void> {
    // Increment attempts, record error
  }

  async getPending(): Promise<SyncQueueItem[]> {
    // Get all pending items
  }

  async getStats(): Promise<SyncStats> {
    // Return queue statistics
  }
}
```

---

## Sync Engine

### Sync Process

```typescript
class SyncEngine {
  private queue: SyncQueue;
  private api: ApiClient;
  private isOnline: boolean = false;
  private isSyncing: boolean = false;

  constructor() {
    // Listen for network changes
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected;
      if (this.isOnline) {
        this.startSync();
      }
    });
  }

  async startSync(): Promise<SyncResult> {
    if (this.isSyncing || !this.isOnline) {
      return { status: 'skipped' };
    }

    this.isSyncing = true;
    const results: SyncResult = {
      status: 'in_progress',
      synced: 0,
      failed: 0,
      conflicts: 0
    };

    try {
      // 1. Pull latest from server (read-only data)
      await this.pullServerData();

      // 2. Push local changes
      const pending = await this.queue.getPending();

      for (const item of pending) {
        try {
          await this.syncItem(item);
          results.synced++;
        } catch (error) {
          if (error.code === 'CONFLICT') {
            results.conflicts++;
            await this.handleConflict(item, error.serverData);
          } else {
            results.failed++;
            await this.queue.markFailed(item.id, error.message);
          }
        }
      }

      results.status = 'complete';
    } finally {
      this.isSyncing = false;
    }

    return results;
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    switch (item.type) {
      case 'workout':
        await this.syncWorkout(item);
        break;
      case 'activity':
        await this.syncActivity(item);
        break;
      case 'assessment':
        await this.syncAssessment(item);
        break;
    }
  }

  private async syncWorkout(item: SyncQueueItem): Promise<void> {
    if (item.operation === 'create') {
      const response = await this.api.workouts.create(item.data);
      await this.queue.markComplete(item.id, response.id);
    } else if (item.operation === 'update') {
      // Check for conflicts first
      const serverVersion = await this.api.workouts.getVersion(item.serverId);
      if (serverVersion > item.data.version) {
        throw { code: 'CONFLICT', serverData: await this.api.workouts.get(item.serverId) };
      }
      await this.api.workouts.update(item.serverId, item.data);
      await this.queue.markComplete(item.id, item.serverId);
    } else if (item.operation === 'delete') {
      await this.api.workouts.delete(item.serverId);
      await this.queue.markComplete(item.id, item.serverId);
    }
  }

  private async pullServerData(): Promise<void> {
    const lastSync = await this.getLastSyncTime();

    // Pull user profile
    const profile = await this.api.users.me();
    await this.cache.set('user_profile', profile);

    // Pull exercise library (if stale)
    if (await this.isCacheStale('exercises', 24 * 60 * 60)) {
      const exercises = await this.api.exercises.list();
      await this.cache.set('exercises', exercises);
    }

    // Pull career standards (if stale)
    if (await this.isCacheStale('career_standards', 7 * 24 * 60 * 60)) {
      const standards = await this.api.careerStandards.list();
      await this.cache.set('career_standards', standards);
    }

    // Pull recent prescriptions
    const prescriptions = await this.api.prescriptions.recent({ since: lastSync });
    await this.cache.set('prescriptions', prescriptions);

    await this.setLastSyncTime(new Date().toISOString());
  }

  private async handleConflict(item: SyncQueueItem, serverData: any): Promise<void> {
    // Store both versions for user resolution
    await this.db.run(`
      UPDATE pending_${item.type}s
      SET sync_status = 'conflict',
          conflict_server_data = ?
      WHERE local_id = ?
    `, [JSON.stringify(serverData), item.localId]);

    // Notify user
    this.notifyConflict(item);
  }
}
```

### Conflict Resolution

```typescript
interface ConflictResolution {
  type: 'keep_local' | 'keep_server' | 'keep_both' | 'merge';
  mergedData?: any;
}

async function resolveConflict(
  type: 'workout' | 'activity' | 'assessment',
  localId: string,
  resolution: ConflictResolution
): Promise<void> {
  const local = await getLocalRecord(type, localId);
  const server = JSON.parse(local.conflict_server_data);

  switch (resolution.type) {
    case 'keep_local':
      // Force push local version
      await api.forceUpdate(type, local.server_id, local.data, { force: true });
      await markSynced(type, localId, local.server_id);
      break;

    case 'keep_server':
      // Discard local changes
      await deleteLocalRecord(type, localId);
      break;

    case 'keep_both':
      // Create duplicate
      const newId = await api.create(type, local.data);
      await markSynced(type, localId, newId);
      break;

    case 'merge':
      // User merged data
      await api.update(type, local.server_id, resolution.mergedData);
      await updateLocalRecord(type, localId, resolution.mergedData);
      await markSynced(type, localId, local.server_id);
      break;
  }
}
```

---

## Offline Capabilities

### What Works Offline

| Feature | Offline Support | Notes |
|---------|-----------------|-------|
| Log workout | Full | Syncs when online |
| View workout history | Full | Cached locally |
| Record activity (GPS) | Full | Syncs when online |
| View activity history | Full | Cached locally |
| Log assessment | Full | Syncs when online |
| View readiness | Partial | Based on cached assessments |
| Generate prescription | Partial | Uses cached exercise library |
| View exercises | Full | Cached locally |
| View career standards | Full | Cached locally |
| View profile | Full | Cached locally |
| Edit profile | No | Requires online |
| Community feed | No | Requires online |
| Messaging | No | Requires online |
| Leaderboards | No | Requires online |
| Achievements (new) | No | Syncs later |
| Lifeline/Mayday | No | Requires online |

### Offline Workout Logging

```typescript
async function logWorkoutOffline(workout: WorkoutInput): Promise<LocalWorkout> {
  const localId = generateUUID();

  const localWorkout = {
    local_id: localId,
    server_id: null,
    data: JSON.stringify({
      ...workout,
      created_at: new Date().toISOString(),
      version: 1
    }),
    created_at: new Date().toISOString(),
    sync_status: 'pending'
  };

  await db.run(`
    INSERT INTO pending_workouts (local_id, data, created_at, sync_status)
    VALUES (?, ?, ?, ?)
  `, [localWorkout.local_id, localWorkout.data, localWorkout.created_at, localWorkout.sync_status]);

  // Add to sync queue
  await syncQueue.enqueue({
    type: 'workout',
    operation: 'create',
    localId: localId,
    serverId: null,
    data: workout,
    createdAt: new Date().toISOString(),
    priority: 1
  });

  return localWorkout;
}
```

### Offline Activity Recording

```typescript
async function recordActivityOffline(activity: ActivityInput): Promise<LocalActivity> {
  const localId = generateUUID();

  // Store route data separately (can be large)
  const routeKey = `route_${localId}`;
  if (activity.route) {
    await storeRouteData(routeKey, activity.route);
  }

  const localActivity = {
    local_id: localId,
    server_id: null,
    data: JSON.stringify({
      ...activity,
      route: null,  // Reference only
      route_key: routeKey,
      created_at: new Date().toISOString(),
      version: 1
    }),
    route_data: routeKey,
    created_at: new Date().toISOString(),
    sync_status: 'pending'
  };

  await db.run(`
    INSERT INTO pending_activities (local_id, data, route_data, created_at, sync_status)
    VALUES (?, ?, ?, ?, ?)
  `, [localActivity.local_id, localActivity.data, localActivity.route_data, localActivity.created_at, localActivity.sync_status]);

  await syncQueue.enqueue({
    type: 'activity',
    operation: 'create',
    localId: localId,
    serverId: null,
    data: activity,
    createdAt: new Date().toISOString(),
    priority: 1
  });

  return localActivity;
}
```

---

## Caching Strategy

### Cache Tiers

| Tier | Data Type | TTL | Size Limit |
|------|-----------|-----|------------|
| Hot | User profile, recent workouts | 1 hour | 1 MB |
| Warm | Exercise library, standards | 24 hours | 10 MB |
| Cold | Old workouts, assessments | 30 days | 50 MB |
| Persistent | Pending sync items | Never | 100 MB |

### Cache Management

```typescript
class CacheManager {
  private maxSize = 100 * 1024 * 1024; // 100 MB total

  async set(key: string, data: any, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(data);
    const size = new Blob([serialized]).size;

    // Check if we need to evict
    const currentSize = await this.getCurrentSize();
    if (currentSize + size > this.maxSize) {
      await this.evict(size);
    }

    const expiresAt = ttl ? new Date(Date.now() + ttl * 1000).toISOString() : null;

    await db.run(`
      INSERT OR REPLACE INTO cache (key, data, cached_at, expires_at)
      VALUES (?, ?, ?, ?)
    `, [key, serialized, new Date().toISOString(), expiresAt]);
  }

  async get<T>(key: string): Promise<T | null> {
    const row = await db.get(`
      SELECT data, expires_at FROM cache WHERE key = ?
    `, [key]);

    if (!row) return null;

    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      await this.delete(key);
      return null;
    }

    return JSON.parse(row.data);
  }

  private async evict(neededSize: number): Promise<void> {
    // Evict expired first
    await db.run(`
      DELETE FROM cache WHERE expires_at < datetime('now')
    `);

    // Then evict oldest by tier
    const tiers = ['cold', 'warm', 'hot'];
    for (const tier of tiers) {
      if (await this.getCurrentSize() + neededSize <= this.maxSize) {
        break;
      }
      await this.evictTier(tier);
    }
  }
}
```

### Pre-Loading for Offline

```typescript
async function prepareForOffline(): Promise<void> {
  // Check for upcoming offline period (e.g., before deployment)
  const { exercises, standards, prescriptions } = await api.bulk.downloadForOffline();

  await cache.set('exercises', exercises, 30 * 24 * 60 * 60);  // 30 days
  await cache.set('career_standards', standards, 30 * 24 * 60 * 60);
  await cache.set('prescriptions', prescriptions, 30 * 24 * 60 * 60);

  // Download recent workouts and activities
  const workouts = await api.workouts.list({ limit: 100 });
  const activities = await api.activities.list({ limit: 100 });

  await cache.set('workouts', workouts, 30 * 24 * 60 * 60);
  await cache.set('activities', activities, 30 * 24 * 60 * 60);
}
```

---

## UI Components

### Offline Indicator

```
┌────────────────────────────────────────────────────────────┐
│ MuscleMap                                    ⚡ OFFLINE    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  [Rest of app UI]                                          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Sync Status Banner

```
┌────────────────────────────────────────────────────────────┐
│ ████████░░░░░░░░░░░░░░░░░░░░ Syncing 3 of 12 items...    │
└────────────────────────────────────────────────────────────┘
```

### Pending Items Indicator

```
┌────────────────────────────────────────────────────────────┐
│ Workout History                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ⏳ Morning Workout                        Pending    │  │
│  │    45 min • 12 exercises • 350 TU                   │  │
│  │    Today, 6:00 AM                                   │  │
│  │    Will sync when online                            │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ✓ Evening Run                             Synced     │  │
│  │    5.2 mi • 42:15                                   │  │
│  │    Yesterday, 6:00 PM                               │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Conflict Resolution Screen

```
┌────────────────────────────────────────────────────────────┐
│ Sync Conflict                                           ✕  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  This workout was edited on another device while you       │
│  were offline.                                             │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                  YOUR VERSION                        │  │
│  │  ─────────────────────────────────────────────────  │  │
│  │  Name: Morning Workout                              │  │
│  │  Duration: 45 minutes                               │  │
│  │  Exercises: 12                                      │  │
│  │  TU: 350                                            │  │
│  │  Notes: "Felt good today"                           │  │
│  │                                                      │  │
│  │  Recorded: Jan 8, 6:00 AM (offline)                 │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                 SERVER VERSION                       │  │
│  │  ─────────────────────────────────────────────────  │  │
│  │  Name: AM Workout                                   │  │
│  │  Duration: 50 minutes                               │  │
│  │  Exercises: 14                                      │  │
│  │  TU: 380                                            │  │
│  │  Notes: "Added extra exercises"                     │  │
│  │                                                      │  │
│  │  Modified: Jan 8, 7:30 AM (from web)                │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │           Keep My Version                           │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │           Keep Server Version                       │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │           Keep Both (Create Duplicate)              │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Offline Preparation Screen

```
┌────────────────────────────────────────────────────────────┐
│ Prepare for Offline                                     ✕  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Download data for offline use. Recommended before         │
│  deployments or trips to areas without connectivity.       │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  Data to Download                                          │
│                                                            │
│  ☑️ Exercise Library (65 exercises)           2.3 MB      │
│  ☑️ Career Standards (15 standards)           0.8 MB      │
│  ☑️ Recent Workouts (100 workouts)            1.2 MB      │
│  ☑️ Recent Activities (50 activities)         5.1 MB      │
│  ☑️ Saved Prescriptions (10 prescriptions)    0.3 MB      │
│  ☐ Profile Photos                             12.0 MB     │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  Total: 9.7 MB                                             │
│  Available storage: 2.1 GB                                 │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  Offline Duration: 30 days                                 │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │              Download for Offline                   │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Sync Endpoints

```typescript
// POST /api/v1/sync/push
// Push local changes to server
Request: {
  "items": [
    {
      "type": "workout",
      "operation": "create",
      "localId": "local_123",
      "data": {...}
    },
    {
      "type": "activity",
      "operation": "create",
      "localId": "local_456",
      "data": {...}
    }
  ]
}

Response: {
  "results": [
    {
      "localId": "local_123",
      "status": "success",
      "serverId": "server_abc"
    },
    {
      "localId": "local_456",
      "status": "conflict",
      "serverId": "server_def",
      "serverData": {...}
    }
  ]
}

// GET /api/v1/sync/pull
// Pull changes from server since last sync
Query: ?since=2026-01-01T00:00:00Z

Response: {
  "workouts": [...],
  "activities": [...],
  "profile": {...},
  "sync_token": "token_xyz"
}

// POST /api/v1/sync/prepare-offline
// Download bulk data for offline use
Request: {
  "include": ["exercises", "standards", "prescriptions", "workouts", "activities"],
  "workouts_limit": 100,
  "activities_limit": 50
}

Response: {
  "exercises": [...],
  "career_standards": [...],
  "prescriptions": [...],
  "workouts": [...],
  "activities": [...],
  "downloaded_at": "2026-01-08T00:00:00Z",
  "valid_until": "2026-02-07T00:00:00Z"
}
```

### Conflict Resolution

```typescript
// POST /api/v1/sync/resolve-conflict
// Resolve a sync conflict
Request: {
  "type": "workout",
  "localId": "local_123",
  "serverId": "server_abc",
  "resolution": "keep_local",
  "mergedData": null  // Only for "merge" resolution
}

Response: {
  "status": "resolved",
  "finalServerId": "server_abc"
}
```

---

## Telemetry Events

| Event | Description | Properties |
|-------|-------------|------------|
| `offline.entered` | Device went offline | pending_count |
| `offline.exited` | Device came online | offline_duration_minutes |
| `offline.sync_started` | Sync process started | pending_count |
| `offline.sync_completed` | Sync process finished | synced, failed, conflicts |
| `offline.conflict_detected` | Conflict found during sync | type |
| `offline.conflict_resolved` | User resolved conflict | type, resolution |
| `offline.prepare_started` | User started offline prep | |
| `offline.prepare_completed` | Offline prep finished | size_mb |

---

## Success Criteria

### Launch
- [ ] Workouts can be logged offline
- [ ] Activities can be recorded offline
- [ ] Sync happens automatically when online
- [ ] Conflict resolution UI works

### Phase 2
- [ ] 30-day offline support
- [ ] 95% sync success rate
- [ ] <5% conflict rate
- [ ] Offline prep before deployment

### Phase 3
- [ ] Multi-device conflict handling
- [ ] Selective sync (choose what to sync)
- [ ] Bandwidth-efficient delta sync

---

*End of Offline Mode Specification*
