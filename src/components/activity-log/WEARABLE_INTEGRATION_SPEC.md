# Wearable Integration Specification

## Overview

This document specifies how MuscleMap integrates with wearable devices and health platforms to automatically sync workout data.

## Supported Platforms

### Tier 1 (Priority Integration)

1. **Apple Health / HealthKit** (iOS)
   - Requires native iOS app
   - Access: Workout samples, heart rate, active energy
   - Sync: Read workouts, write MuscleMap sessions

2. **Google Fit** (Android)
   - OAuth 2.0 authentication
   - Access: Sessions, activity segments
   - Sync: Bi-directional workout sync

3. **Garmin Connect**
   - OAuth 1.0a authentication
   - Access: Activities, wellness data
   - Sync: Import activities, heart rate zones

### Tier 2 (Secondary Integration)

4. **Fitbit**
   - OAuth 2.0 authentication
   - Access: Activity logs, exercise
   - Sync: Import logged exercises

5. **Strava**
   - OAuth 2.0 authentication
   - Access: Activities, athlete
   - Sync: Import strength training activities

6. **WHOOP**
   - OAuth 2.0 authentication
   - Access: Recovery, strain, sleep
   - Sync: Import strain data for workout suggestions

## Data Models

### Common Workout Structure

```typescript
interface WearableWorkout {
  // Source platform
  source: 'apple_health' | 'google_fit' | 'garmin' | 'fitbit' | 'strava' | 'whoop';
  sourceId: string; // Platform's workout ID

  // Timestamps
  startTime: Date;
  endTime: Date;

  // Workout metadata
  workoutType: string; // 'strength_training', 'functional', etc.
  title?: string;

  // Metrics
  duration: number; // seconds
  activeCalories?: number;
  totalCalories?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;

  // Exercise data (if available)
  exercises?: WearableExercise[];
}

interface WearableExercise {
  name: string;
  sets?: Array<{
    reps?: number;
    weight?: number; // kg
    duration?: number; // seconds for timed exercises
  }>;
}
```

## Sync Architecture

### 1. OAuth Flow

```
User initiates connection
  → Redirect to platform OAuth
  → User grants permissions
  → Receive authorization code
  → Exchange for access/refresh tokens
  → Store tokens securely (encrypted)
```

### 2. Token Storage

```typescript
interface PlatformConnection {
  userId: string;
  platform: string;
  accessToken: string; // encrypted
  refreshToken: string; // encrypted
  expiresAt: Date;
  scopes: string[];
  connectedAt: Date;
  lastSyncAt: Date;
}
```

### 3. Sync Strategy

**Pull-based Sync:**
- Manual refresh button
- Background sync every 15 minutes (native app)
- Webhook listeners where supported

**Conflict Resolution:**
- MuscleMap workouts take precedence over imported
- Duplicate detection via timestamp + duration matching
- User can manually resolve conflicts

### 4. Data Mapping

| Platform Field | MuscleMap Field |
|---------------|-----------------|
| workout_type | Based on activity mapping |
| start_time | session.startedAt |
| end_time | session.endedAt |
| active_calories | session.caloriesBurned |
| exercises | Matched to exercise database |

## API Endpoints

### GraphQL Schema

```graphql
type WearableConnection {
  id: ID!
  platform: WearablePlatform!
  status: ConnectionStatus!
  lastSyncAt: DateTime
  syncedWorkouts: Int!
}

enum WearablePlatform {
  APPLE_HEALTH
  GOOGLE_FIT
  GARMIN
  FITBIT
  STRAVA
  WHOOP
}

enum ConnectionStatus {
  CONNECTED
  DISCONNECTED
  TOKEN_EXPIRED
  ERROR
}

extend type Query {
  wearableConnections: [WearableConnection!]!
  wearableSyncStatus(platform: WearablePlatform!): SyncStatus
}

extend type Mutation {
  connectWearable(platform: WearablePlatform!, code: String!): WearableConnection
  disconnectWearable(platform: WearablePlatform!): Boolean!
  syncWearable(platform: WearablePlatform!): SyncResult!
}
```

## Security Considerations

1. **Token Encryption**: All tokens encrypted at rest with AES-256
2. **Minimal Scopes**: Request only necessary permissions
3. **Token Rotation**: Refresh tokens before expiry
4. **Audit Logging**: Log all sync operations
5. **User Control**: Easy disconnect and data deletion

## Implementation Phases

### Phase 1: Foundation
- [ ] OAuth flow infrastructure
- [ ] Token storage and encryption
- [ ] Connection management UI

### Phase 2: Apple Health (iOS)
- [ ] Native iOS module
- [ ] HealthKit permissions
- [ ] Workout read/write

### Phase 3: Google Fit
- [ ] Web OAuth flow
- [ ] Session import
- [ ] Activity mapping

### Phase 4: Garmin & Others
- [ ] Garmin Connect API
- [ ] Fitbit API
- [ ] Strava API

### Phase 5: Advanced Features
- [ ] Real-time sync (webhooks)
- [ ] Conflict resolution UI
- [ ] Sync analytics

## Error Handling

```typescript
type SyncError =
  | { type: 'TOKEN_EXPIRED'; platform: string }
  | { type: 'RATE_LIMITED'; retryAfter: number }
  | { type: 'API_ERROR'; message: string }
  | { type: 'MAPPING_FAILED'; workout: string };
```

## Metrics & Monitoring

Track these metrics for each platform:
- Connection success rate
- Sync success rate
- Average sync duration
- Workout mapping accuracy
- User retention after connection
