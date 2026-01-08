# Feature: Safety Features (Lifeline, Mayday, Safe Zones)

*Specification v1.0 - January 8, 2026*

## Overview

**Original concept names:**
- "Lifeline" (NOT "Beacon" - Strava trademark)
- "Mayday" (emergency alert)
- "Safe Zones" (NOT "Privacy Zones")
- "Conditions Alert" (weather/heat warnings)

**User value:** Users training alone in potentially dangerous situations can share their location with trusted contacts and call for help if needed.

**MuscleMap advantage:**
- OPSEC-friendly defaults for military/law enforcement
- Crew-based notifications (alert my partner, not random contacts)
- PPE-aware heat warnings
- Offline-capable emergency features

**Target users:**
- Solo trail runners
- Wildland firefighters in remote areas
- Military members training in austere environments
- Law enforcement in sensitive locations
- Anyone training alone in unfamiliar areas

---

## Feature 1: Safe Zones

### User Story
As a federal agent, I want my home and office locations automatically hidden so that I don't expose sensitive locations when logging activities.

### Data Model

```sql
CREATE TABLE safe_zones (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                           -- "Home", "Office", "Station"
  center_lat REAL NOT NULL,
  center_lng REAL NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 500,   -- Privacy radius
  type TEXT DEFAULT 'manual',                   -- "manual", "auto_detected"
  obscure_to TEXT DEFAULT 'city',               -- "city", "region", "hidden"
  active BOOLEAN DEFAULT true,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_safe_zones_user ON safe_zones(user_id);
```

### API Endpoints

```typescript
// GET /api/v1/safety/zones
// List user's safe zones
Response: {
  "zones": [
    {
      "id": "zone_123",
      "name": "Home",
      "center": { "lat": 41.8781, "lng": -87.6298 },
      "radius_meters": 500,
      "type": "manual",
      "obscure_to": "city",
      "active": true
    }
  ],
  "suggestions": [
    {
      "location": { "lat": 41.9000, "lng": -87.6500 },
      "frequency": 45,
      "suggested_name": "Frequent Location"
    }
  ]
}

// POST /api/v1/safety/zones
// Create safe zone
Request: {
  "name": "Home",
  "center": { "lat": 41.8781, "lng": -87.6298 },
  "radius_meters": 500,
  "obscure_to": "city"
}

// PUT /api/v1/safety/zones/:id
// Update safe zone

// DELETE /api/v1/safety/zones/:id
// Delete safe zone
```

### Location Obscuring Logic

```typescript
function obscureLocation(location: Location, zones: SafeZone[]): ObscuredLocation {
  for (const zone of zones) {
    const distance = haversineDistance(location, zone.center);

    if (distance <= zone.radius_meters) {
      switch (zone.obscure_to) {
        case 'city':
          return { display: 'Chicago, IL', exact: null };
        case 'region':
          return { display: 'Midwest USA', exact: null };
        case 'hidden':
          return { display: 'Private Location', exact: null };
      }
    }
  }

  return { display: null, exact: location };
}
```

### Auto-Detection

```typescript
// Background job: Analyze user's activity locations
async function detectFrequentLocations(userId: string) {
  // Get activities from last 90 days
  const activities = await getActivities(userId, { days: 90 });

  // Cluster start/end points
  const clusters = clusterLocations(
    activities.flatMap(a => [a.start_location, a.end_location])
  );

  // Suggest zones for clusters with 10+ occurrences
  const suggestions = clusters
    .filter(c => c.count >= 10)
    .map(c => ({
      location: c.centroid,
      frequency: c.count,
      suggested_name: classifyLocation(c.centroid) // "Home", "Work", etc.
    }));

  return suggestions;
}
```

---

## Feature 2: Lifeline (Location Sharing)

### User Story
As a trail runner, I want my spouse to see my location during my run so that they know I'm safe.

### Data Model

```sql
CREATE TABLE lifeline_sessions (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id TEXT REFERENCES activities(id),     -- Optional link to activity
  started_at TEXT NOT NULL,
  expected_end_at TEXT,                           -- Auto-end time
  ended_at TEXT,
  status TEXT DEFAULT 'active',                   -- "active", "ended", "emergency"
  last_location JSONB,                            -- Latest position
  last_updated_at TEXT,
  auto_end_on_activity_complete BOOLEAN DEFAULT true,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_lifeline_user ON lifeline_sessions(user_id);
CREATE INDEX idx_lifeline_status ON lifeline_sessions(status);

CREATE TABLE lifeline_contacts (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL,                     -- "user", "email", "phone"
  contact_value TEXT NOT NULL,                    -- User ID, email, or phone
  contact_name TEXT,                              -- Display name
  relationship TEXT,                              -- "spouse", "partner", "friend"
  notify_on_start BOOLEAN DEFAULT true,
  notify_on_end BOOLEAN DEFAULT true,
  notify_on_emergency BOOLEAN DEFAULT true,
  created_at TEXT DEFAULT (datetime('now')),

  UNIQUE(user_id, contact_type, contact_value)
);

CREATE TABLE lifeline_access (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  session_id TEXT NOT NULL REFERENCES lifeline_sessions(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL REFERENCES lifeline_contacts(id),
  access_token TEXT NOT NULL,                     -- For non-user contacts
  viewed_at TEXT,                                 -- Last viewed
  created_at TEXT DEFAULT (datetime('now')),

  UNIQUE(session_id, contact_id)
);
```

### API Endpoints

```typescript
// POST /api/v1/safety/lifeline/start
// Start a Lifeline session
Request: {
  "contacts": ["contact_123", "contact_456"],  // Contact IDs
  "expected_duration_minutes": 60,
  "activity_id": "activity_789",               // Optional
  "auto_end_on_activity_complete": true
}

Response: {
  "session_id": "session_123",
  "share_links": {
    "contact_123": "https://musclemap.me/lifeline/abc123",
    "contact_456": "https://musclemap.me/lifeline/def456"
  },
  "expected_end_at": "2026-01-08T16:30:00Z"
}

// PUT /api/v1/safety/lifeline/:sessionId/location
// Update location (called by client during activity)
Request: {
  "location": { "lat": 41.8781, "lng": -87.6298 },
  "battery_pct": 45,
  "signal_strength": "good"
}

// POST /api/v1/safety/lifeline/:sessionId/end
// End Lifeline session

// GET /api/v1/safety/lifeline/:sessionId
// Get session status (for contacts)
Query: ?token=abc123

Response: {
  "user": {
    "display_name": "J. Smith",
    "avatar_url": "..."
  },
  "activity": {
    "type": "run",
    "started_at": "2026-01-08T15:30:00Z"
  },
  "current_location": {
    "lat": 41.8800,
    "lng": -87.6350,
    "updated_at": "2026-01-08T15:45:00Z"
  },
  "route_so_far": [...],                        // Path points
  "status": "active",
  "battery_pct": 45
}
```

### Contact Management

```typescript
// GET /api/v1/safety/contacts
// List emergency contacts

// POST /api/v1/safety/contacts
// Add emergency contact
Request: {
  "contact_type": "email",
  "contact_value": "spouse@example.com",
  "contact_name": "Jane Doe",
  "relationship": "spouse"
}

// DELETE /api/v1/safety/contacts/:id
// Remove contact
```

### Notification Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Lifeline Notifications                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User starts Lifeline                                       │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ SMS/Email to contacts:                               │   │
│  │ "J. Smith started a run and is sharing their        │   │
│  │  location with you. Track them: [link]"             │   │
│  └─────────────────────────────────────────────────────┘   │
│         │                                                   │
│         ▼                                                   │
│  Contacts can view live map                                │
│         │                                                   │
│         ├──────────────────┐                               │
│         ▼                  ▼                               │
│  Activity ends         Lifeline times out                  │
│         │                  │                               │
│         ▼                  ▼                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ SMS/Email to contacts:                               │   │
│  │ "J. Smith completed their run safely."              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Feature 3: Mayday (Emergency Alert)

### User Story
As a firefighter training alone, I want an emergency button that alerts my crew if I'm in trouble.

### Data Model

```sql
CREATE TABLE mayday_alerts (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lifeline_session_id TEXT REFERENCES lifeline_sessions(id),
  triggered_at TEXT NOT NULL,
  trigger_type TEXT NOT NULL,                    -- "manual", "auto_no_movement", "auto_fall"
  location JSONB NOT NULL,
  status TEXT DEFAULT 'active',                  -- "active", "acknowledged", "cancelled", "resolved"
  cancelled_at TEXT,
  cancelled_reason TEXT,
  acknowledged_at TEXT,
  acknowledged_by TEXT,
  resolved_at TEXT,
  resolved_notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_mayday_user ON mayday_alerts(user_id);
CREATE INDEX idx_mayday_status ON mayday_alerts(status);

CREATE TABLE mayday_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  auto_detect_no_movement BOOLEAN DEFAULT false,
  no_movement_threshold_minutes INTEGER DEFAULT 15,
  auto_detect_fall BOOLEAN DEFAULT false,         -- Requires accelerometer
  include_emergency_services BOOLEAN DEFAULT false,
  crew_hangout_id TEXT REFERENCES hangouts(id),   -- Alert crew members
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### API Endpoints

```typescript
// POST /api/v1/safety/mayday
// Trigger Mayday alert
Request: {
  "location": { "lat": 41.8781, "lng": -87.6298 },
  "trigger_type": "manual",
  "message": "Twisted ankle on trail"           // Optional
}

Response: {
  "alert_id": "alert_123",
  "status": "active",
  "notified": {
    "contacts": 3,
    "crew_members": 5,
    "emergency_services": false
  },
  "cancel_window_seconds": 30
}

// POST /api/v1/safety/mayday/:alertId/cancel
// Cancel within 30-second window
Request: {
  "reason": "false_alarm"
}

// POST /api/v1/safety/mayday/:alertId/acknowledge
// Contact acknowledges alert
Request: {
  "action": "on_my_way"                         // "on_my_way", "called_911", "checking_in"
}

// POST /api/v1/safety/mayday/:alertId/resolve
// Mark alert as resolved
Request: {
  "notes": "User safe, minor injury"
}

// GET /api/v1/safety/mayday/settings
// Get Mayday settings

// PUT /api/v1/safety/mayday/settings
// Update Mayday settings
Request: {
  "auto_detect_no_movement": true,
  "no_movement_threshold_minutes": 10,
  "include_emergency_services": false,
  "crew_hangout_id": "hangout_123"
}
```

### Alert Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      Mayday Alert Flow                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User triggers Mayday (or auto-detected)                    │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              30-SECOND CANCEL WINDOW                 │   │
│  │                                                      │   │
│  │  "MAYDAY TRIGGERED"                                 │   │
│  │                                                      │   │
│  │  [███████████████░░░░░] 15 seconds remaining       │   │
│  │                                                      │   │
│  │  ┌────────────────────────────────────────────┐     │   │
│  │  │           CANCEL - FALSE ALARM              │     │   │
│  │  └────────────────────────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────┘   │
│         │                                                   │
│         ├──── User cancels ──── Alert cancelled            │
│         │                                                   │
│         ▼ (30 seconds pass)                                │
│                                                             │
│  Alert sent to:                                            │
│  1. Emergency contacts (SMS, push)                         │
│  2. Crew members (if configured)                           │
│  3. 911 (if enabled, via API)                              │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ MAYDAY ALERT                                         │   │
│  │                                                      │   │
│  │ J. Smith has triggered an emergency alert.          │   │
│  │                                                      │   │
│  │ Location: [Map showing last known position]         │   │
│  │ Activity: Trail run, started 45 min ago             │   │
│  │ Last movement: 2 minutes ago                        │   │
│  │ Battery: 45%                                        │   │
│  │                                                      │   │
│  │ ┌──────────────┐ ┌──────────────┐ ┌───────────┐    │   │
│  │ │ I'm on my way│ │ Called 911   │ │ Check in  │    │   │
│  │ └──────────────┘ └──────────────┘ └───────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
│         │                                                   │
│         ▼                                                   │
│  Contact acknowledges → User notified                      │
│         │                                                   │
│         ▼                                                   │
│  Situation resolved → Alert closed                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Auto-Detection

```typescript
// Called periodically during activity
async function checkForEmergency(session: LifelineSession) {
  const settings = await getMaydaySettings(session.user_id);

  // No movement detection
  if (settings.auto_detect_no_movement) {
    const lastMovement = await getLastMovementTime(session.id);
    const minutesSinceMovement = (Date.now() - lastMovement) / 60000;

    if (minutesSinceMovement >= settings.no_movement_threshold_minutes) {
      // Check if user is responsive
      const responded = await sendCheckInPrompt(session.user_id);

      if (!responded) {
        await triggerMayday(session.user_id, {
          trigger_type: 'auto_no_movement',
          location: session.last_location
        });
      }
    }
  }

  // Fall detection (requires accelerometer data)
  if (settings.auto_detect_fall) {
    const fallDetected = await checkAccelerometerForFall(session.id);

    if (fallDetected) {
      const responded = await sendCheckInPrompt(session.user_id);

      if (!responded) {
        await triggerMayday(session.user_id, {
          trigger_type: 'auto_fall',
          location: session.last_location
        });
      }
    }
  }
}
```

---

## Feature 4: Conditions Alert

### User Story
As a construction worker, I want heat warnings during summer workouts so that I don't overheat.

### Data Model

```sql
CREATE TABLE conditions_alerts (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id TEXT REFERENCES activities(id),
  alert_type TEXT NOT NULL,                      -- "heat", "cold", "lightning", "air_quality"
  severity TEXT NOT NULL,                        -- "caution", "warning", "danger"
  conditions JSONB NOT NULL,                     -- Weather data
  ppe_modifier REAL,                             -- PPE load adjustment
  effective_temp REAL,                           -- Adjusted temperature
  user_action TEXT,                              -- "continued", "modified", "stopped"
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE user_ppe_profile (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  typical_ppe TEXT[],                            -- "turnout_gear", "plate_carrier", "ruck"
  ppe_weight_lbs INTEGER,
  heat_tolerance TEXT DEFAULT 'normal',          -- "low", "normal", "high"
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### Heat Index Calculation

```typescript
interface WeatherConditions {
  temperature_f: number;
  humidity_pct: number;
  wind_mph: number;
}

interface PPEProfile {
  typical_ppe: string[];
  ppe_weight_lbs: number;
  heat_tolerance: 'low' | 'normal' | 'high';
}

function calculateEffectiveHeatIndex(
  conditions: WeatherConditions,
  ppe: PPEProfile
): { index: number; severity: string } {
  // Base heat index calculation (NWS formula)
  let heatIndex = calculateBaseHeatIndex(conditions.temperature_f, conditions.humidity_pct);

  // PPE modifiers
  const ppeModifier = {
    'turnout_gear': 15,      // Full firefighter gear adds 15F
    'plate_carrier': 10,     // Body armor adds 10F
    'ruck': 5,               // Ruck adds 5F
    'weighted_vest': 5,
  };

  for (const item of ppe.typical_ppe) {
    heatIndex += ppeModifier[item] || 0;
  }

  // Tolerance adjustment
  const toleranceModifier = {
    'low': 5,
    'normal': 0,
    'high': -5
  };
  heatIndex += toleranceModifier[ppe.heat_tolerance];

  // Severity classification
  let severity: string;
  if (heatIndex >= 130) severity = 'danger';
  else if (heatIndex >= 105) severity = 'warning';
  else if (heatIndex >= 90) severity = 'caution';
  else severity = 'safe';

  return { index: heatIndex, severity };
}
```

### API Endpoints

```typescript
// GET /api/v1/safety/conditions
// Get current conditions for location
Query: ?lat=41.8781&lng=-87.6298

Response: {
  "weather": {
    "temperature_f": 85,
    "humidity_pct": 70,
    "wind_mph": 5,
    "conditions": "Partly Cloudy"
  },
  "effective_heat_index": 102,
  "ppe_adjustment": +10,
  "severity": "warning",
  "recommendation": "Reduce intensity, hydrate frequently, take breaks in shade",
  "alerts": [
    {
      "type": "heat",
      "severity": "warning",
      "message": "High heat index with your gear. Consider shorter workout."
    }
  ]
}

// PUT /api/v1/safety/ppe-profile
// Update PPE profile
Request: {
  "typical_ppe": ["plate_carrier", "ruck"],
  "ppe_weight_lbs": 45,
  "heat_tolerance": "normal"
}
```

---

## UI Screens

### Screen 1: Safety Settings Hub

```
┌────────────────────────────────────────────────────────────┐
│ Safety Settings                                         ⚙️ │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Emergency Contacts                                        │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 👤 Jane Doe (Spouse)                        ✏️ 🗑️  │  │
│  │    jane@example.com                                 │  │
│  │ 👤 Station 5                                ✏️ 🗑️  │  │
│  │    Crew members (8 people)                          │  │
│  │                                                      │  │
│  │ ┌────────────────────────────────────────────────┐  │  │
│  │ │            + Add Contact                       │  │  │
│  │ └────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  Safe Zones                                                │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 🏠 Home                           500m    ✏️ 🗑️    │  │
│  │ 🏢 Station 5                      300m    ✏️ 🗑️    │  │
│  │                                                      │  │
│  │ ┌────────────────────────────────────────────────┐  │  │
│  │ │            + Add Safe Zone                     │  │  │
│  │ └────────────────────────────────────────────────┘  │  │
│  │                                                      │  │
│  │ 💡 2 locations detected frequently. Add them?       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  Mayday Auto-Detection                                     │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ☐ Alert if no movement for [15] minutes            │  │
│  │ ☐ Alert if fall detected (requires accelerometer)  │  │
│  │ ☐ Include 911 in emergency alerts                  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  PPE Profile (for heat warnings)                          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Typical gear: Plate carrier, Ruck                   │  │
│  │ Weight: 45 lbs                                      │  │
│  │ Heat tolerance: Normal                      [Edit]  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Screen 2: Lifeline Start

```
┌────────────────────────────────────────────────────────────┐
│ Start Lifeline                                          ✕  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Share your live location during this activity.           │
│                                                            │
│  Select contacts to share with:                           │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ☑️ Jane Doe (Spouse)                                 │  │
│  │ ☑️ Station 5 (8 crew members)                        │  │
│  │ ☐ John Smith (Training Partner)                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  Expected duration:                                        │
│  [ 1 hour                                        ▼]       │
│                                                            │
│  ☑️ End Lifeline when I finish my activity                │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  Your contacts will receive:                              │
│  • Notification when you start                            │
│  • Link to view your live location                        │
│  • Notification when you finish safely                    │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │              Start Lifeline                         │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Screen 3: Contact View (Live Map)

```
┌────────────────────────────────────────────────────────────┐
│ J. Smith's Activity                              🔴 LIVE   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │                    [MAP VIEW]                        │  │
│  │                                                      │  │
│  │         ● Current location                          │  │
│  │         ─ Route so far                              │  │
│  │         ○ Start point                               │  │
│  │                                                      │  │
│  │                                                      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  Activity: Trail Run                                       │
│  Started: 45 minutes ago                                   │
│  Distance: 4.2 miles                                       │
│  Last update: 30 seconds ago                              │
│  Battery: 45%                                              │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │              🚨 Something Wrong?                    │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Screen 4: Mayday Trigger

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                                                            │
│                       🚨 MAYDAY 🚨                         │
│                                                            │
│                   ALERT TRIGGERED                          │
│                                                            │
│           ┌─────────────────────────────┐                 │
│           │  ████████████░░░░░░░░░░░░  │                 │
│           │                             │                 │
│           │    18 seconds to cancel     │                 │
│           │                             │                 │
│           └─────────────────────────────┘                 │
│                                                            │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │                                                      │   │
│  │             CANCEL - FALSE ALARM                     │   │
│  │                                                      │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│                                                            │
│  If you don't cancel, these people will be alerted:       │
│                                                            │
│  • Jane Doe (Spouse)                                       │
│  • Station 5 crew (8 people)                              │
│                                                            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Screen 5: Conditions Alert

```
┌────────────────────────────────────────────────────────────┐
│ ⚠️ Heat Warning                                         ✕  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│         🌡️ 102°F                                          │
│         Effective Heat Index                               │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  Current: 85°F, 70% humidity                              │
│  Your gear: +10°F (plate carrier)                         │
│  Effective: 102°F (WARNING)                               │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  Recommendations:                                          │
│                                                            │
│  • Reduce workout intensity                               │
│  • Hydrate every 15 minutes                               │
│  • Take breaks in shade                                   │
│  • Watch for signs of heat exhaustion                     │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │        Continue with Caution                        │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │        Modify My Workout                            │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │        Skip Today                                   │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Privacy Defaults

| Feature | Default | Notes |
|---------|---------|-------|
| Safe Zones | None created | User must add manually |
| Lifeline | Off | Must be started per-activity |
| Mayday auto-detect | Off | Opt-in per user |
| Location data retention | Deleted after session | Not stored long-term |
| Emergency contacts | None | User must add |
| 911 integration | Off | Explicit opt-in |

---

## Telemetry Events

| Event | Description | Properties |
|-------|-------------|------------|
| `safety.zone_created` | Safe zone created | zone_id, type |
| `safety.lifeline_started` | Lifeline session started | contacts_count, duration |
| `safety.lifeline_ended` | Lifeline session ended | duration, reason |
| `safety.mayday_triggered` | Mayday alert triggered | trigger_type |
| `safety.mayday_cancelled` | Mayday cancelled | seconds_before_send |
| `safety.mayday_acknowledged` | Contact acknowledged | action |
| `safety.conditions_alert_shown` | Heat/cold alert shown | severity, effective_temp |
| `safety.conditions_action` | User response to alert | action |

---

## Success Criteria

### Launch
- [ ] Safe Zones working with location obscuring
- [ ] Lifeline start/end flow complete
- [ ] Mayday trigger with 30-second cancel window
- [ ] Notifications sent to contacts

### Phase 2
- [ ] 500+ Safe Zones created
- [ ] 100+ Lifeline sessions completed
- [ ] 0 missed Mayday alerts
- [ ] Conditions alerts integrated

### Phase 3
- [ ] Fall detection via accelerometer
- [ ] Integration with local 911 APIs
- [ ] Offline Mayday capability

---

*End of Safety Features Specification*
