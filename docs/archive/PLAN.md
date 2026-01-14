# Real-Time Activity Visualization System

## Overview

Create an interactive, real-time activity monitoring system that shows granular user activity with drill-down capabilities from global aggregate views down to regional breakdowns. **Privacy is absolute** - users who opt out are never tracked or displayed, not even to admins.

## Privacy-First Architecture

**Core Principle**: If a user has opted out of data collection or community features, their activity is NEVER logged to the activity system. This is not a filter on display - it's a gate on collection.

### Privacy Enforcement (Absolute)

| Setting | Effect |
|---------|--------|
| `minimalist_mode` | User completely invisible - activity never logged |
| `opt_out_community_feed` | Not in activity feed - activity never logged |
| `exclude_from_activity_feed` | Activity never logged |
| `exclude_from_location_features` | Location data never attached to activity |

**There is no admin bypass.** Privacy choices are respected absolutely.

### What IS Shown

- **Aggregated counts**: "47 workouts completed in the last hour"
- **Anonymous geographic data**: "12 activities in California" (only from users who opted IN)
- **Exercise/muscle trends**: "Chest exercises are trending" (aggregated, anonymous)
- **Heat maps**: Based only on opted-in users' locations

### What is NOT Shown

- Individual user activity for opted-out users (never even collected)
- Specific user locations, usernames, or identifiable information
- Any way to trace activity back to specific users

---

## Key Features

1. **Interactive Map** - Clustering, heatmaps, click-to-zoom (anonymous aggregates only)
2. **Hierarchical Drill-Down** - Global → Country → City (counts, not individuals)
3. **Multiple View Modes** - Map, List (by region), Table (by time)
4. **Real-Time Updates** - WebSocket for live activity pulse
5. **Time-Based Filtering** - 5m, 15m, 1h, 24h windows
6. **Exercise/Muscle Grouping** - See what exercises are popular now

---

## Implementation Plan

### Phase 1: Database & Activity Logging

#### 1.1 Create Migration `052_live_activity_system.ts`

```sql
-- Lightweight activity events for real-time monitoring
-- ONLY stores opted-in user activity (privacy checked at insert time)
CREATE TABLE IF NOT EXISTS live_activity_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'workout.completed', 'exercise.completed'
  exercise_id TEXT,
  exercise_name TEXT,
  muscle_group TEXT,
  country_code TEXT,
  region TEXT,           -- State/province level
  city TEXT,
  geo_bucket TEXT,       -- Hash for clustering (no exact coordinates stored)
  created_at TIMESTAMP DEFAULT NOW(),

  -- NO user_id column - events are anonymous by design
  -- NO latitude/longitude - only geo_bucket for clustering
);

-- Geographic hierarchy for drill-down
CREATE TABLE IF NOT EXISTS geo_regions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'continent', 'country', 'region', 'city'
  parent_id TEXT REFERENCES geo_regions(id),
  bounds JSONB,        -- Bounding box for map display
  center_lat REAL,
  center_lng REAL
);

-- Indexes for time-series queries
CREATE INDEX idx_live_activity_time ON live_activity_events(created_at DESC);
CREATE INDEX idx_live_activity_geo ON live_activity_events(country_code, region, city);
CREATE INDEX idx_live_activity_exercise ON live_activity_events(muscle_group, exercise_id);
CREATE INDEX idx_live_activity_bucket ON live_activity_events(geo_bucket);

-- Auto-cleanup: Events older than 24h are deleted (no long-term storage)
-- This is handled by a scheduled job, not a DB trigger
```

#### 1.2 Activity Logger Service

**File**: `/apps/api/src/services/live-activity-logger.ts`

```typescript
// Pseudocode for key logic

async function logActivityEvent(userId: string, event: ActivityEvent) {
  // CRITICAL: Check privacy settings BEFORE any logging
  const privacySettings = await getPrivacySettings(userId);

  if (
    privacySettings.minimalist_mode ||
    privacySettings.opt_out_community_feed ||
    privacySettings.exclude_from_activity_feed
  ) {
    // User opted out - DO NOT LOG ANYTHING
    return;
  }

  // Build anonymous event (no user ID stored)
  const anonymousEvent = {
    id: generateId(),
    event_type: event.type,
    exercise_id: event.exerciseId,
    exercise_name: event.exerciseName,
    muscle_group: event.muscleGroup,
    created_at: new Date(),
  };

  // Only add location if user allows it
  if (!privacySettings.exclude_from_location_features && event.location) {
    anonymousEvent.country_code = event.location.countryCode;
    anonymousEvent.region = event.location.region;
    anonymousEvent.city = event.location.city;
    anonymousEvent.geo_bucket = hashLocation(event.location.lat, event.location.lng);
  }

  // Insert anonymous event
  await db.insert(live_activity_events).values(anonymousEvent);

  // Publish to real-time channel (also anonymous)
  await pubsub.publish(CHANNELS.LIVE_ACTIVITY, {
    type: event.type,
    exerciseName: event.exerciseName,
    muscleGroup: event.muscleGroup,
    geoBucket: anonymousEvent.geo_bucket,
    city: anonymousEvent.city,
    country: anonymousEvent.country_code,
    timestamp: anonymousEvent.created_at,
  });
}
```

#### 1.3 Integration Points

**File**: `/apps/api/src/http/routes/workouts.ts`

After workout completion (around line 220), add:

```typescript
// Log anonymous activity if user allows it
await logActivityEvent(userId, {
  type: 'workout.completed',
  exerciseId: workout.exercises[0]?.exerciseId,
  exerciseName: workout.exercises[0]?.name,
  muscleGroup: workout.primaryMuscleGroup,
  location: userLocation, // From request headers/profile
});
```

---

### Phase 2: API Endpoints

**File**: `/apps/api/src/http/routes/live-activity.ts`

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `GET /api/live/stats` | Global aggregates | `{ total: 47, byMuscle: {...}, byCountry: {...} }` |
| `GET /api/live/map` | Geo-clustered data | `[{ geoBucket, count, city?, country }]` |
| `GET /api/live/hierarchy/:level` | Drill-down counts | `{ level: 'country', children: [{ name, count }] }` |
| `GET /api/live/trending` | Trending exercises | `[{ exerciseName, count, change }]` |
| `WS /api/live/stream` | Real-time events | Stream of anonymous events |

All endpoints return **aggregated, anonymous data only**.

---

### Phase 3: WebSocket Real-Time Updates

**Extend**: `/apps/api/src/lib/pubsub.ts`

```typescript
PUBSUB_CHANNELS = {
  // ... existing
  LIVE_ACTIVITY: 'pubsub:live:activity',  // Public anonymous events
}
```

**Event Structure**:

```typescript
interface LiveActivityEvent {
  type: 'workout.completed' | 'exercise.completed';
  timestamp: string;

  // Optional - only if user allows location
  geoBucket?: string;
  city?: string;
  country?: string;

  // Exercise info (not user info)
  exerciseName?: string;
  muscleGroup?: string;
}
```

**No user identifiers are ever included in events.**

---

### Phase 4: Frontend Components

#### 4.1 New Page: `/src/pages/LiveActivityMonitor.jsx`

**Layout**:

```
+------------------+------------------------+------------------+
|   Filter Panel   |     Map / List View    |   Stats Panel    |
|   (time, muscle) |   (anonymous markers)  |   (aggregates)   |
+------------------+------------------------+------------------+
|              Live Activity Feed (anonymous events)           |
+--------------------------------------------------------------+
```

#### 4.2 Component List

| Component | Purpose |
|-----------|---------|
| `ActivityMapAnonymous.jsx` | Clustered markers showing activity density |
| `HierarchyNavigator.jsx` | Breadcrumb: Global > USA > California (counts only) |
| `FilterPanel.jsx` | Time window, exercise type, muscle group filters |
| `StatsPanel.jsx` | Real-time aggregate statistics |
| `LiveActivityFeed.jsx` | Scrolling feed of anonymous events |
| `TrendingExercises.jsx` | What's popular right now |

#### 4.3 Map Implementation

**File**: `/src/components/live/ActivityMapAnonymous.jsx`

Features:
- Cluster markers using `leaflet.markercluster`
- Click cluster to zoom in
- Heat map overlay option
- Markers show count, not individuals
- No popups with user info (there is none to show)

```jsx
// Marker shows aggregate, not individual
<Marker position={geoBucketCenter}>
  <Popup>
    <strong>{count} workouts</strong>
    <span>{city}, {country}</span>
    <span>Last activity: {relativeTime}</span>
  </Popup>
</Marker>
```

#### 4.4 Live Feed

**File**: `/src/components/live/LiveActivityFeed.jsx`

Shows anonymous events:
- "Chest workout completed in California" (no username)
- "Bicep curl logged in Tokyo" (no username)
- Grouped by time: "Just now", "1m ago", etc.

---

### Phase 5: Route & Navigation

**Add to** `/src/App.jsx`:

```jsx
<Route path="/live" element={<LiveActivityMonitor />} />
```

**Navigation**: Add link in dashboard or community section (not owner-only since data is anonymous).

---

## Files to Create

1. `/apps/api/src/db/migrations/052_live_activity_system.ts`
2. `/apps/api/src/services/live-activity-logger.ts`
3. `/apps/api/src/http/routes/live-activity.ts`
4. `/src/pages/LiveActivityMonitor.jsx`
5. `/src/components/live/ActivityMapAnonymous.jsx`
6. `/src/components/live/HierarchyNavigator.jsx`
7. `/src/components/live/FilterPanel.jsx`
8. `/src/components/live/StatsPanel.jsx`
9. `/src/components/live/LiveActivityFeed.jsx`
10. `/src/components/live/TrendingExercises.jsx`
11. `/src/hooks/useLiveActivity.js`

## Files to Modify

1. `/apps/api/src/http/routes/workouts.ts` - Add activity logging call
2. `/apps/api/src/lib/pubsub.ts` - Add LIVE_ACTIVITY channel
3. `/apps/api/src/http/server.ts` - Register live-activity routes
4. `/src/App.jsx` - Add /live route

## Dependencies to Add

```bash
pnpm add leaflet.markercluster @types/leaflet.markercluster
```

---

## Data Retention

- Live activity events are **ephemeral** - automatically deleted after 24 hours
- No long-term storage of activity data
- This is a real-time pulse, not historical analytics

---

## Verification Checklist

1. **Privacy Gate**: Complete a workout with opted-out user → verify NO record in `live_activity_events`
2. **Anonymous Data**: Check that `live_activity_events` has NO `user_id` column
3. **API Aggregates**: `curl /api/live/stats` returns counts, not user lists
4. **WebSocket**: Connect to `/api/live/stream`, verify events have no user identifiers
5. **Map Display**: Verify markers show counts, not usernames
6. **Location Privacy**: User with `exclude_from_location_features` → verify no geo data in their events
7. **24h Cleanup**: Verify old events are deleted

---

## Summary

This system provides real-time visibility into MuscleMap activity while **absolutely respecting user privacy**:

- Users who opt out are **never tracked** (not filtered, not logged at all)
- All displayed data is **aggregated and anonymous**
- No admin bypass - privacy is a right, not a preference
- Events are ephemeral (24h retention) - this is a live pulse, not surveillance

---

*Plan created: 2026-01-14*
*Status: Ready for implementation*
