# Feature: Field Log (Activity Recording)

*Specification v1.0 - January 8, 2026*

## Overview

**Original concept name:** "Field Log" (NOT "Activities" - too generic)

**User value:** Record outdoor activities like runs, rucks, swims, and climbs with GPS tracking and timing.

**MuscleMap advantage:**
- Job-specific activity types (ruck march, tactical swim, rope climb)
- Load/weight tracking for weighted activities
- Integration with strength data for total training load
- OPSEC-friendly with delayed posting and Safe Zones
- Offline recording for austere environments

**Target users:**
- Military members logging ruck marches
- Firefighters tracking conditioning runs
- Athletes recording cardio alongside strength work
- Anyone wanting complete fitness picture

---

## Activity Types

### Core Activity Types

| Type | Icon | Metrics | Equipment |
|------|------|---------|-----------|
| Run | 🏃 | Distance, pace, elevation, HR | Optional: GPS watch |
| Ruck | 🎒 | Distance, pace, elevation, load weight | Ruck, weight plates |
| Swim | 🏊 | Distance, laps, stroke count, time | Pool or open water |
| Bike | 🚴 | Distance, speed, elevation, HR | Bike |
| Row | 🚣 | Distance, stroke rate, split time | Erg or boat |
| Hike | 🥾 | Distance, elevation, time | Optional: trekking poles |
| Climb | 🧗 | Routes, grades, attempts, sends | Climbing gear |
| Walk | 🚶 | Distance, steps, time | None |

### Tactical Activity Types (MuscleMap-specific)

| Type | Icon | Metrics | Equipment |
|------|------|---------|-----------|
| Ruck March | 🎖️ | Distance, pace, load weight, terrain | Ruck, plates, boots |
| Combat Swim | 🤿 | Distance, time, surface/underwater splits | Fins, weight belt |
| Land Nav | 🧭 | Distance, checkpoints, time | Map, compass |
| Obstacle Course | 🏋️ | Course time, obstacles completed | Various |
| Sprint-Drag-Carry | ⚡ | Lane time, splits per segment | Sled, kettlebells |

---

## Data Model

### activities

```sql
CREATE TABLE activities (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                           -- "run", "ruck", "swim", etc.
  name TEXT,                                     -- User-defined name
  description TEXT,

  -- Timing
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_seconds INTEGER,
  moving_time_seconds INTEGER,                  -- Excluding stops

  -- Distance/Location
  distance_meters REAL,
  start_location JSONB,                         -- {lat, lng}
  end_location JSONB,
  route JSONB,                                  -- Array of {lat, lng, elevation, timestamp}
  elevation_gain_meters REAL,
  elevation_loss_meters REAL,

  -- Load (for weighted activities)
  load_kg REAL,
  load_description TEXT,                        -- "45lb ruck + 20lb plates"

  -- Performance
  average_pace_per_km REAL,                     -- seconds per km
  average_speed_mps REAL,                       -- meters per second
  max_speed_mps REAL,
  average_hr INTEGER,
  max_hr INTEGER,
  calories_estimated INTEGER,

  -- Environment
  weather JSONB,                                -- {temp_f, humidity, conditions}
  terrain TEXT,                                 -- "road", "trail", "sand", "water"

  -- Privacy
  visibility TEXT DEFAULT 'private',            -- "private", "followers", "public"
  location_obscured BOOLEAN DEFAULT false,      -- Safe Zone applied
  posting_delayed_until TEXT,                   -- Delayed visibility

  -- Metadata
  source TEXT DEFAULT 'musclemap',              -- "musclemap", "garmin", "apple_health"
  device TEXT,                                  -- Recording device
  photos TEXT[],                                -- Photo URLs
  notes TEXT,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_activities_user ON activities(user_id);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_started ON activities(started_at);
CREATE INDEX idx_activities_visibility ON activities(visibility);
```

### activity_laps

For structured activities (intervals, swim laps, etc.)

```sql
CREATE TABLE activity_laps (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  lap_number INTEGER NOT NULL,
  distance_meters REAL,
  duration_seconds REAL,
  average_pace_per_km REAL,
  average_hr INTEGER,
  notes TEXT,

  UNIQUE(activity_id, lap_number)
);

CREATE INDEX idx_laps_activity ON activity_laps(activity_id);
```

### activity_checkpoints

For Land Nav or route-based activities

```sql
CREATE TABLE activity_checkpoints (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  checkpoint_number INTEGER NOT NULL,
  name TEXT,
  location JSONB NOT NULL,                      -- {lat, lng}
  arrived_at TEXT,
  time_from_start_seconds INTEGER,
  notes TEXT,

  UNIQUE(activity_id, checkpoint_number)
);

CREATE INDEX idx_checkpoints_activity ON activity_checkpoints(activity_id);
```

---

## API Endpoints

### Activity CRUD

```typescript
// POST /api/v1/activities
// Create a new activity (after recording)
Request: {
  "type": "ruck",
  "name": "Morning Ruck",
  "started_at": "2026-01-08T06:00:00Z",
  "ended_at": "2026-01-08T07:30:00Z",
  "distance_meters": 8047,                      // 5 miles
  "route": [...],                               // GPS points
  "load_kg": 20.4,                              // 45 lbs
  "load_description": "45lb ruck",
  "terrain": "trail",
  "visibility": "followers",
  "notes": "Cold morning, good pace"
}

Response: {
  "id": "activity_123",
  "type": "ruck",
  "name": "Morning Ruck",
  "stats": {
    "distance_miles": 5.0,
    "duration_formatted": "1:30:00",
    "pace_per_mile": "18:00",
    "elevation_gain_ft": 450,
    "training_load": 125                        // Integrated with strength
  },
  "achievements_unlocked": [
    { "id": "first_ruck", "name": "First Ruck" }
  ]
}

// GET /api/v1/activities
// List user's activities
Query: ?type=ruck&start_date=2026-01-01&limit=20

// GET /api/v1/activities/:id
// Get activity details

// PUT /api/v1/activities/:id
// Update activity

// DELETE /api/v1/activities/:id
// Delete activity
```

### Live Recording

```typescript
// POST /api/v1/activities/start
// Start recording a new activity
Request: {
  "type": "run",
  "load_kg": null
}

Response: {
  "recording_id": "rec_123",
  "started_at": "2026-01-08T06:00:00Z",
  "sync_interval_ms": 5000                      // How often to sync location
}

// PUT /api/v1/activities/recording/:recordingId/location
// Send location update during recording
Request: {
  "location": { "lat": 41.8781, "lng": -87.6298, "elevation": 180 },
  "timestamp": "2026-01-08T06:05:00Z",
  "hr": 145,
  "speed_mps": 3.5
}

// POST /api/v1/activities/recording/:recordingId/lap
// Mark a lap during recording

// POST /api/v1/activities/recording/:recordingId/pause
// Pause recording

// POST /api/v1/activities/recording/:recordingId/resume
// Resume recording

// POST /api/v1/activities/recording/:recordingId/finish
// Finish and save activity
Request: {
  "name": "Morning Run",
  "notes": "Felt great",
  "visibility": "followers"
}
```

### Statistics

```typescript
// GET /api/v1/activities/stats
// Get activity statistics
Query: ?type=run&period=month

Response: {
  "period": "2026-01",
  "totals": {
    "activities": 12,
    "distance_km": 85.5,
    "duration_hours": 8.5,
    "elevation_gain_m": 1200
  },
  "averages": {
    "pace_per_km": 360,                         // 6:00 min/km
    "distance_per_activity": 7.1,
    "hr": 145
  },
  "trends": {
    "distance_change_pct": +15,
    "pace_change_pct": -3                       // Faster = negative
  },
  "personal_records": [
    { "metric": "fastest_5k", "value": 1500, "date": "2026-01-05" }
  ]
}
```

---

## Load Integration

MuscleMap's unique advantage: unified training load from strength + cardio.

### Training Load Calculation

```typescript
interface TrainingLoad {
  strength_tu: number;          // From workouts
  cardio_load: number;          // From activities
  total_load: number;           // Combined
  load_ratio: number;           // Strength vs cardio balance
}

function calculateCardioLoad(activity: Activity): number {
  // Base load from duration and intensity
  let load = activity.duration_seconds / 60 * activity.average_hr / 100;

  // Type multiplier
  const typeMultiplier = {
    'run': 1.0,
    'ruck': 1.3,                // Harder on body
    'swim': 0.9,                // Lower impact
    'bike': 0.8,
    'row': 1.1,
    'hike': 0.7
  };
  load *= typeMultiplier[activity.type] || 1.0;

  // Load weight multiplier
  if (activity.load_kg > 0) {
    load *= (1 + activity.load_kg / 50);        // 50kg doubles the load
  }

  // Elevation multiplier
  if (activity.elevation_gain_meters > 0) {
    load *= (1 + activity.elevation_gain_meters / 1000);
  }

  return Math.round(load);
}

async function getWeeklyTrainingLoad(userId: string): Promise<TrainingLoad> {
  const weekStart = getStartOfWeek();

  // Get strength workouts
  const workouts = await getWorkouts(userId, { since: weekStart });
  const strength_tu = workouts.reduce((sum, w) => sum + w.total_tu, 0);

  // Get cardio activities
  const activities = await getActivities(userId, { since: weekStart });
  const cardio_load = activities.reduce((sum, a) => sum + calculateCardioLoad(a), 0);

  return {
    strength_tu,
    cardio_load,
    total_load: strength_tu + cardio_load,
    load_ratio: strength_tu / (cardio_load || 1)
  };
}
```

### Unified Dashboard

```typescript
// GET /api/v1/users/me/training-load
// Get combined training load
Response: {
  "period": "week",
  "strength": {
    "workouts": 4,
    "total_tu": 450,
    "muscle_coverage": 0.85
  },
  "cardio": {
    "activities": 3,
    "total_load": 180,
    "distance_km": 25.5
  },
  "combined": {
    "total_load": 630,
    "load_vs_last_week": +8,
    "load_ratio": "strength_heavy",             // 2.5:1 strength:cardio
    "recommendation": "Consider adding cardio to balance training"
  },
  "recovery": {
    "status": "moderate",
    "hours_since_last": 18,
    "recommendation": "Ready for moderate workout"
  }
}
```

---

## Offline Recording

Critical for military, firefighters, and remote training.

### Offline Architecture

```typescript
interface OfflineActivity {
  local_id: string;             // UUID generated locally
  server_id: string | null;     // Assigned after sync
  sync_status: 'pending' | 'synced' | 'conflict';
  recorded_at: string;          // When recorded offline
  synced_at: string | null;     // When synced to server
  data: Activity;               // Full activity data
}

// Mobile app stores activities locally
const offlineStore = new OfflineStore({
  maxActivities: 100,           // Keep 100 activities locally
  maxAgeDays: 30,               // Sync within 30 days
  syncWhenOnline: true
});

// Sync process
async function syncOfflineActivities() {
  const pending = await offlineStore.getPending();

  for (const activity of pending) {
    try {
      const result = await api.activities.create(activity.data);
      await offlineStore.markSynced(activity.local_id, result.id);
    } catch (error) {
      if (error.code === 'CONFLICT') {
        await offlineStore.markConflict(activity.local_id);
        // User resolves conflict manually
      }
    }
  }
}
```

### Conflict Resolution

```
┌─────────────────────────────────────────────────────────────┐
│                    Sync Conflict                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  This activity was recorded offline and modified on         │
│  another device.                                           │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │   This Device       │  │   Other Device      │          │
│  │                     │  │                     │          │
│  │   Morning Ruck      │  │   AM Ruck March     │          │
│  │   5.0 miles         │  │   5.0 miles         │          │
│  │   45lb load         │  │   50lb load         │          │
│  │   Notes: Cold...    │  │   Notes: Great...   │          │
│  └─────────────────────┘  └─────────────────────┘          │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Keep This Device                       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Keep Other Device                      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Keep Both (Duplicate)                  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## OPSEC Features

### Delayed Posting

```typescript
// When saving activity
Request: {
  ...activityData,
  "visibility": "followers",
  "delay_posting_hours": 24              // Don't show until tomorrow
}

// Activity is saved but visibility is delayed
{
  "id": "activity_123",
  "visibility": "followers",
  "visible_at": "2026-01-09T07:30:00Z"   // 24h from now
}
```

### Safe Zone Application

```typescript
function applyPrivacyToActivity(activity: Activity, zones: SafeZone[]): Activity {
  const obscured = { ...activity };

  // Check start location
  if (isInSafeZone(activity.start_location, zones)) {
    obscured.start_location = null;
    obscured.route = trimRouteStart(activity.route, zones);
    obscured.location_obscured = true;
  }

  // Check end location
  if (isInSafeZone(activity.end_location, zones)) {
    obscured.end_location = null;
    obscured.route = trimRouteEnd(activity.route, zones);
    obscured.location_obscured = true;
  }

  return obscured;
}
```

### Visibility Controls

| Setting | Description |
|---------|-------------|
| `private` | Only you can see |
| `followers` | People who follow you |
| `hangout` | Members of your hangouts |
| `public` | Anyone |

---

## UI Screens

### Screen 1: Activity Recording

```
┌────────────────────────────────────────────────────────────┐
│                      🏃 Running                             │
├────────────────────────────────────────────────────────────┤
│                                                            │
│                      25:32                                 │
│                     Duration                               │
│                                                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │   3.21     │  │   7:57     │  │   145      │           │
│  │   miles    │  │   /mile    │  │   bpm      │           │
│  └────────────┘  └────────────┘  └────────────┘           │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │                    [LIVE MAP]                        │  │
│  │                                                      │  │
│  │              ● Current position                      │  │
│  │              ─ Route so far                          │  │
│  │                                                      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  │ Split 1: 7:45 │ Split 2: 8:02 │ Split 3: 8:10... │   │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  ┌──────────┐          ┌──────────────────────────────┐   │
│  │  PAUSE   │          │           LAP                │   │
│  └──────────┘          └──────────────────────────────┘   │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │                     FINISH                          │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Screen 2: Activity Summary

```
┌────────────────────────────────────────────────────────────┐
│ ← Morning Ruck                                       Save  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  🎒 Ruck March                                             │
│  January 8, 2026 • 6:00 AM                                 │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │                    [ROUTE MAP]                       │  │
│  │                                                      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   5.0 mi    │  │  1:30:00    │  │  18:00/mi   │        │
│  │  Distance   │  │  Duration   │  │   Pace      │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   450 ft    │  │   45 lb     │  │   125       │        │
│  │  Elevation  │  │   Load      │  │  Load Score │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  Name: [Morning Ruck                          ]           │
│                                                            │
│  Notes:                                                    │
│  [Cold morning, maintained good pace throughout...]       │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  Visibility                                                │
│  ○ Private  ● Followers  ○ Hangouts  ○ Public             │
│                                                            │
│  ☐ Delay posting for [24] hours                           │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  🏆 Achievement Unlocked!                                  │
│     First 5-Mile Ruck                                      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Screen 3: Activity Feed

```
┌────────────────────────────────────────────────────────────┐
│ Activity Feed                                     Filter ▼ │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 👤 J. Smith                              2 hours ago │  │
│  │                                                      │  │
│  │ 🏃 Morning Run                                       │  │
│  │ 5.2 mi • 42:15 • 8:07/mi                            │  │
│  │                                                      │  │
│  │ [Small map preview]                                  │  │
│  │                                                      │  │
│  │ "Great conditions this morning!"                     │  │
│  │                                                      │  │
│  │ 👊 5 Props    💬 2 Comments                         │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 👤 M. Johnson                            4 hours ago │  │
│  │                                                      │  │
│  │ 🎒 Ruck March                                        │  │
│  │ 8.0 mi • 2:00:00 • 15:00/mi • 55lb load            │  │
│  │                                                      │  │
│  │ [Small map preview - partially obscured]             │  │
│  │                                                      │  │
│  │ 👊 12 Props    💬 5 Comments                        │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 👤 K. Davis                              Yesterday   │  │
│  │                                                      │  │
│  │ 🏊 Pool Swim                                         │  │
│  │ 2000m • 35:00 • 1:45/100m                           │  │
│  │                                                      │  │
│  │ "Working on flip turns"                              │  │
│  │                                                      │  │
│  │ 👊 8 Props    💬 1 Comment                          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Screen 4: Start Activity Selection

```
┌────────────────────────────────────────────────────────────┐
│ Start Activity                                          ✕  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Popular                                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │     🏃      │ │     🎒      │ │     🚴      │          │
│  │    Run      │ │    Ruck     │ │    Bike     │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                            │
│  All Activities                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 🏃 Run              │  🏊 Swim            │          │  │
│  │ 🎒 Ruck March       │  🚣 Row             │          │  │
│  │ 🚴 Bike             │  🥾 Hike            │          │  │
│  │ 🚶 Walk             │  🧗 Climb           │          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  Tactical                                                  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 🎖️ Combat Swim      │  🧭 Land Nav        │          │  │
│  │ ⚡ Sprint-Drag-Carry│  🏋️ Obstacle Course │          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  Recent: Run (2d ago), Ruck (5d ago)                      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Telemetry Events

| Event | Description | Properties |
|-------|-------------|------------|
| `activity.recording_started` | Started recording | type, has_load |
| `activity.recording_ended` | Finished recording | type, duration, distance |
| `activity.saved` | Activity saved | type, visibility |
| `activity.deleted` | Activity deleted | type |
| `activity.viewed` | Activity detail viewed | type, is_own |
| `activity.privacy_applied` | Safe Zone obscured location | zones_count |
| `activity.delayed_posting` | Posting delayed | delay_hours |
| `activity.synced_offline` | Offline activity synced | days_offline |

---

## Success Criteria

### Launch
- [ ] GPS recording works on iOS and Android
- [ ] 5+ activity types supported
- [ ] Offline recording functional
- [ ] Safe Zones obscure locations
- [ ] Activity feed shows activities

### Phase 2
- [ ] 1000+ activities recorded
- [ ] 95% sync success rate for offline
- [ ] Load weight tracking accurate
- [ ] Integration with Training Load dashboard

### Phase 3
- [ ] Device imports (Garmin, Apple Health)
- [ ] Checkpoints system for races
- [ ] Route sharing between users

---

*End of Field Log Specification*
