# Apple Watch Implementation Guide

This document provides comprehensive guidance for implementing and building the MuscleMap Apple Watch companion app.

## Overview

MuscleMap's Apple Watch app is a standalone companion application that enables:

- **Standalone Workout Tracking**: Log workouts directly from your wrist
- **Rest Timer with Haptics**: Customizable rest timer with haptic feedback
- **Rep Logging via Digital Crown**: Quickly adjust reps using the Digital Crown
- **Heart Rate Monitoring**: Real-time heart rate display during workouts
- **Workout Quick-Start Complication**: Launch workouts from your watch face
- **Phone App Sync**: Bidirectional synchronization with the phone app

## Architecture

```
apps/mobile/
├── targets/
│   └── watch-app/
│       ├── target.config.json       # expo-apple-targets configuration
│       ├── Sources/
│       │   ├── MuscleMapWatchApp.swift      # Main app entry point
│       │   ├── WatchConnectivityManager.swift # Phone communication
│       │   ├── HealthKitManager.swift       # HealthKit integration
│       │   ├── WorkoutManager.swift         # Workout state management
│       │   └── Complications.swift          # Watch face complications
│       └── Assets.xcassets/
│           └── AppIcon.appiconset/          # Watch app icons
├── src/native/
│   └── WatchConnectivity.ts         # React Native bridge
└── ios/MuscleMap/WatchConnectivity/
    ├── WatchConnectivityModule.swift    # Native Swift module
    └── WatchConnectivityModule.m        # Obj-C bridge
```

## Expo Compatibility

### Current Approach: expo-apple-targets

MuscleMap uses `expo-apple-targets` to integrate the watch app while maintaining Expo's Continuous Native Generation benefits.

**Key Benefits:**
- Watch app code lives in `/targets` directory (not `/ios`)
- Survives `expo prebuild` clean builds
- Full SwiftUI support for watch-optimized UI
- Native WatchConnectivity for phone communication

**Requirements:**
- Expo SDK 52+ (current: 52.0.0)
- CocoaPods 1.16.2+
- Xcode 16+ (macOS Sequoia)
- watchOS deployment target: 9.6+

### Installation

```bash
# Install expo-apple-targets
npm install @bacons/apple-targets

# Add to app.json plugins
# (see Configuration section below)
```

### Alternative: react-native-watch-connectivity

For simpler bidirectional communication without a full watch app:

```bash
npm install react-native-watch-connectivity
```

This approach requires:
- EAS Build (development client)
- Bare workflow or ejected Expo app
- Manual Xcode project configuration

## Configuration

### app.json Updates

Add the following to `apps/mobile/app.json`:

```json
{
  "expo": {
    "plugins": [
      "@bacons/apple-targets"
    ],
    "ios": {
      "entitlements": {
        "com.apple.developer.healthkit": true,
        "com.apple.developer.healthkit.background-delivery": true,
        "com.apple.security.application-groups": [
          "group.com.musclemap.app"
        ]
      }
    }
  }
}
```

### target.config.json

The watch app target is configured in `targets/watch-app/target.config.json`:

```json
{
  "$schema": "https://raw.githubusercontent.com/EvanBacon/expo-apple-targets/main/schema.json",
  "type": "watch",
  "name": "MuscleMap Watch",
  "bundleIdentifier": ".watch",
  "deploymentTarget": "9.6",
  "colors": {
    "$accent": "#0066FF"
  },
  "entitlements": {
    "com.apple.developer.healthkit": true,
    "com.apple.developer.healthkit.background-delivery": true,
    "com.apple.security.application-groups": [
      "group.com.musclemap.app"
    ]
  },
  "frameworks": [
    "HealthKit",
    "WatchConnectivity",
    "SwiftUI",
    "WatchKit"
  ]
}
```

## Building the Watch App

### Development Build

```bash
# Generate native project files
npx expo prebuild

# Open in Xcode
open apps/mobile/ios/MuscleMap.xcworkspace

# Select watch app scheme and build
```

### EAS Build

```bash
# Configure eas.json for watch builds
# Build with EAS
eas build --platform ios --profile production
```

### Local Build (Xcode)

1. Open `MuscleMap.xcworkspace` in Xcode
2. Select "MuscleMap Watch" scheme
3. Select a paired Apple Watch simulator or device
4. Build and run (Cmd+R)

## Watch App Features

### 1. Home Screen

The home screen displays:
- Quick start workout button
- Today's stats (TU earned, workouts completed)
- Connection status indicator

### 2. Active Workout View

A tabbed interface during workouts:

**Tab 1: Current Exercise**
- Exercise name display
- Set counter (current/target)
- Digital Crown rep input
- Weight input (for applicable exercises)
- "Log Set" button

**Tab 2: Rest Timer**
- Large countdown display
- Play/pause controls
- +/- 15 second adjustments
- Quick presets (60s, 90s, 120s)

**Tab 3: Workout Controls**
- Duration display
- Heart rate monitor
- Calories burned
- End workout button

### 3. Complications

Available complication families:
- Circular Small
- Modular Small/Large
- Utilitarian Small/Large
- Graphic Corner/Circular/Rectangular/Extra Large

Displays:
- Quick workout launch
- Today's TU count
- Workout count
- Progress gauge

## API Endpoints

The watch app communicates with these REST endpoints:

### POST /api/watch/sync

Sync a completed workout from the watch.

**Request:**
```json
{
  "id": "workout_uuid",
  "startTime": 1704067200000,
  "endTime": 1704070800000,
  "exercises": [
    {
      "exerciseId": "exercise_id",
      "setNumber": 1,
      "reps": 10,
      "weight": 135
    }
  ],
  "totalSets": 12,
  "totalReps": 120,
  "heartRateSamples": [120, 125, 130, ...],
  "caloriesBurned": 250
}
```

**Response:**
```json
{
  "data": {
    "synced": true,
    "workoutId": "watch_workout_uuid",
    "totalTU": 45.5,
    "exerciseCount": 4,
    "setCount": 12,
    "repCount": 120
  }
}
```

### GET /api/watch/workout-state

Get current workout state for watch initialization.

**Response:**
```json
{
  "data": {
    "isActive": false,
    "workoutId": null,
    "currentExercise": {...},
    "currentSet": 1,
    "targetSets": 3,
    "exercises": [...],
    "restTimer": {
      "isActive": false,
      "remainingSeconds": 90,
      "defaultSeconds": 90
    },
    "stats": {
      "todayTU": 45,
      "todayWorkouts": 2,
      "streakDays": 7
    }
  }
}
```

### GET /api/watch/quick-start

Get a personalized quick-start workout.

**Response:**
```json
{
  "data": {
    "name": "Quick Start Workout",
    "exercises": [...],
    "estimatedDuration": 30,
    "targetTU": 45
  }
}
```

### GET /api/watch/exercises

Get exercises optimized for watch display.

**Query Parameters:**
- `muscleGroup` (optional): Filter by muscle group
- `limit` (optional): Max results (default: 20, max: 50)

## React Native Integration

### Using the WatchConnectivity Hook

```typescript
import { useWatchConnectivity } from '@/native/WatchConnectivity';

function WorkoutScreen() {
  const {
    isSupported,
    isPaired,
    isReachable,
    lastWorkoutFromWatch,
    sendWorkout,
    sendUserData,
    syncRestTimer,
  } = useWatchConnectivity();

  // Send workout prescription to watch
  const handleSendToWatch = async () => {
    await sendWorkout({
      exercises: [
        {
          id: 'bench_press',
          name: 'Bench Press',
          muscleGroup: 'chest',
          usesWeight: true,
          defaultSets: 4,
          defaultReps: 8,
          defaultRestSeconds: 120,
        },
      ],
    });
  };

  // Sync rest timer state
  const handleRestTimerSync = async () => {
    await syncRestTimer({
      isActive: true,
      remainingSeconds: 90,
      defaultSeconds: 90,
    });
  };

  // Listen for workout completions
  useEffect(() => {
    if (lastWorkoutFromWatch) {
      // Process completed workout from watch
      console.log('Workout from watch:', lastWorkoutFromWatch);
    }
  }, [lastWorkoutFromWatch]);

  return (
    <View>
      {!isSupported && <Text>Watch not supported</Text>}
      {isSupported && !isPaired && <Text>No watch paired</Text>}
      {isPaired && !isReachable && <Text>Watch not reachable</Text>}
      {isReachable && (
        <Button onPress={handleSendToWatch} title="Send to Watch" />
      )}
    </View>
  );
}
```

### Direct Module Usage

```typescript
import { watchConnectivity } from '@/native/WatchConnectivity';

// Check connection status
const status = await watchConnectivity.getConnectionStatus();

// Send message to watch
await watchConnectivity.sendMessage('workout_prescription', {
  exercises: [...],
});

// Subscribe to events
const unsubscribe = watchConnectivity.onWorkoutCompleted((data) => {
  console.log('Workout completed:', data);
});

// Cleanup
unsubscribe();
```

## WatchConnectivity Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| `workout_started` | Watch -> Phone | Workout began on watch |
| `workout_ended` | Watch -> Phone | Workout completed with data |
| `set_logged` | Watch -> Phone | Single set was logged |
| `rest_timer_started` | Bidirectional | Rest timer activated |
| `rest_timer_stopped` | Bidirectional | Rest timer stopped |
| `exercise_changed` | Bidirectional | Current exercise changed |
| `sync_request` | Phone -> Watch | Request current state |
| `sync_response` | Watch -> Phone | Current state data |
| `user_data_update` | Phone -> Watch | Stats/profile update |
| `workout_prescription` | Phone -> Watch | Exercises to perform |

## HealthKit Integration

The watch app tracks and syncs:

- **During Workout:**
  - Heart rate (real-time samples)
  - Active calories burned
  - Workout duration

- **After Workout:**
  - Complete HKWorkout record
  - Heart rate statistics (avg, min, max)
  - Total energy burned

### Permissions Required

Add to Info.plist:

```xml
<key>NSHealthShareUsageDescription</key>
<string>MuscleMap uses HealthKit to track your workouts and sync fitness data.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>MuscleMap writes workout data to HealthKit to keep your fitness history in sync.</string>
```

## App Groups for Shared Data

The watch app and phone app share data via App Groups:

**Group ID:** `group.com.musclemap.app`

**Shared Data:**
- Pending workouts (for offline sync)
- User preferences (rest timer defaults)
- Today's stats cache
- Authentication tokens

```swift
// Swift - Writing to shared container
let userDefaults = UserDefaults(suiteName: "group.com.musclemap.app")
userDefaults?.set(90, forKey: "defaultRestTime")

// Swift - Reading from shared container
let restTime = userDefaults?.integer(forKey: "defaultRestTime") ?? 90
```

## Offline Support

The watch app handles offline scenarios:

1. **Workout Logging:** Workouts are stored locally in App Groups
2. **Automatic Sync:** When connection is restored, pending workouts sync
3. **Queue Management:** Failed syncs are queued and retried
4. **Complication Updates:** Complications update from local cache

```swift
// Sync pending workouts when connection restored
func syncPendingWorkouts() {
    guard let pending = userDefaults?.array(forKey: "pendingWorkouts") else { return }

    for workout in pending {
        sendWorkoutToPhone(workout)
    }
}
```

## Testing

### Simulator Testing

1. Pair Watch simulator with iPhone simulator in Xcode
2. Run phone app on iPhone simulator
3. Run watch app on Watch simulator
4. Test WatchConnectivity message passing

### Device Testing

1. Pair real Apple Watch with development iPhone
2. Install phone app via TestFlight or Xcode
3. Install watch app via Xcode (direct deploy)
4. Test full workflow with real HealthKit data

### Unit Tests

Test WatchConnectivity module:

```typescript
import { watchConnectivity } from '@/native/WatchConnectivity';

describe('WatchConnectivity', () => {
  it('returns false for unsupported platforms', () => {
    // Mock Platform.OS = 'android'
    expect(watchConnectivity.isWatchConnectivitySupported()).toBe(false);
  });

  it('gets connection status', async () => {
    const status = await watchConnectivity.getConnectionStatus();
    expect(status).toHaveProperty('isPaired');
    expect(status).toHaveProperty('isReachable');
  });
});
```

## Deployment Checklist

Before submitting to App Store:

- [ ] Watch app icons in all required sizes
- [ ] Privacy policy updated for HealthKit usage
- [ ] App Store screenshots for watch (184x224, 208x253, etc.)
- [ ] Complication preview images
- [ ] HealthKit entitlements enabled in Apple Developer Portal
- [ ] App Groups configured in portal and provisioning profiles
- [ ] TestFlight beta tested on real hardware
- [ ] Offline sync verified
- [ ] Battery impact assessed

## Resources

### Official Documentation

- [WatchConnectivity - Apple Developer](https://developer.apple.com/documentation/watchconnectivity)
- [HealthKit - Apple Developer](https://developer.apple.com/documentation/healthkit)
- [ClockKit Complications - Apple Developer](https://developer.apple.com/documentation/clockkit)
- [SwiftUI for watchOS - Apple Developer](https://developer.apple.com/documentation/swiftui)

### Third-Party Libraries

- [react-native-watch-connectivity](https://github.com/watch-connectivity/react-native-watch-connectivity)
- [expo-apple-targets](https://github.com/EvanBacon/expo-apple-targets)

### Tutorials

- [Adding Apple Watch to Expo App](https://github.com/friyiajr/RealtimeWatchApp)
- [Bidirectional Watch Communication](https://keiver.dev/lab/apple-watch-app-with-react-native-bidirectional-communication)
- [React Native Apple Watch Integration Guide](https://solutionsquares.com/react-native-apple-watch-development/)

## Troubleshooting

### Watch Not Receiving Messages

1. Ensure both apps are in foreground during testing
2. Check `session.isReachable` before sending
3. Use `transferUserInfo` for guaranteed delivery
4. Verify App Group is correctly configured

### HealthKit Authorization Fails

1. Check entitlements are enabled in Xcode
2. Verify provisioning profile includes HealthKit
3. Ensure Info.plist has usage descriptions
4. Test on real device (simulator has limitations)

### Complications Not Updating

1. Call `CLKComplicationServer.sharedInstance().reloadTimeline(for:)`
2. Check complication is added to active watch face
3. Verify data source returns correct template type

### Build Errors After Prebuild

1. Clean build folder in Xcode (Shift+Cmd+K)
2. Delete `ios/Pods` and run `pod install`
3. Verify `target.config.json` syntax
4. Check framework linkage in Xcode project

---

**Last Updated:** January 2025
**Expo SDK:** 52.0.0
**watchOS Target:** 9.6+
**iOS Target:** 15.1+
