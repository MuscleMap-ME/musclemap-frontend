# MuscleMap Apple Watch Extension

This directory contains the foundation for the MuscleMap Apple Watch companion app.

## Architecture

```
MuscleMapWatch/
├── WatchConnectivityBridge.swift    # React Native bridge for WatchConnectivity
├── MuscleMapWatchApp/               # watchOS app target
│   ├── MuscleMapWatchApp.swift      # App entry point
│   ├── ContentView.swift            # Main view
│   ├── WorkoutView.swift            # Active workout interface
│   ├── ExerciseListView.swift       # Exercise browser
│   ├── SetLoggerView.swift          # Set logging interface
│   ├── RestTimerView.swift          # Rest timer
│   ├── Models/                      # Data models
│   │   ├── WorkoutSession.swift
│   │   ├── Exercise.swift
│   │   └── SetLog.swift
│   ├── Services/                    # Services
│   │   ├── WorkoutManager.swift     # Workout session management
│   │   ├── HealthKitManager.swift   # Health data
│   │   └── PhoneConnectivity.swift  # WatchConnectivity handling
│   ├── Complications/               # Watch face complications
│   │   └── ComplicationController.swift
│   └── Assets.xcassets              # Watch app icons
└── Shared/                          # Shared code between phone/watch
    └── WatchTypes.swift             # Shared type definitions
```

## Features

### Phase 1 (Foundation) ✅
- [x] React Native WatchConnectivity hook (`useWatchConnectivity.ts`)
- [x] Shared type definitions (`watch.ts`)
- [x] Communication protocol design

### Phase 2 (Core Watch App)
- [ ] Basic watchOS app structure
- [ ] Exercise list view
- [ ] Simple workout start/stop
- [ ] Rest timer
- [ ] Heart rate display

### Phase 3 (Full Workout Tracking)
- [ ] Complete set logging (reps, weight, RPE)
- [ ] Workout templates
- [ ] Exercise quick-switch
- [ ] Haptic feedback
- [ ] Crown-based input

### Phase 4 (HealthKit Integration)
- [ ] Heart rate streaming
- [ ] Calorie tracking
- [ ] Workout saving to Health app
- [ ] Background delivery

### Phase 5 (Complications & Polish)
- [ ] Watch face complications
- [ ] Glanceable widgets
- [ ] Smart notifications
- [ ] Offline mode

## Implementation Notes

### WatchConnectivity Bridge

The bridge (`WatchConnectivityBridge.swift`) needs to:

1. Implement `WCSessionDelegate`
2. Expose methods to React Native:
   - `activateSession()`
   - `sendMessage(message:)`
   - `updateApplicationContext(context:)`
   - `transferUserInfo(userInfo:)`
   - `transferFile(file:metadata:)`
   - `requestWorkoutSync()`
   - `endWorkout()`

3. Send events to JavaScript:
   - `watchConnectivityStateChanged`
   - `watchReachabilityChanged`
   - `watchMessageReceived`
   - `watchHeartRateUpdated`
   - `watchWorkoutUpdated`

### Expo Compatibility

Since MuscleMap uses Expo, the Watch app requires:

1. **Development Build**: Must use `expo prebuild` to generate native iOS project
2. **Config Plugin**: Create an Expo config plugin to add the Watch target
3. **EAS Build**: Configure in `eas.json` for Watch app building

### Building the Watch App

```bash
# Generate native project
cd apps/mobile
npx expo prebuild --platform ios

# Open in Xcode to add Watch target
open ios/MuscleMap.xcworkspace

# In Xcode:
# 1. File > New > Target > watchOS > App
# 2. Name: MuscleMapWatch
# 3. Add WatchConnectivity framework
# 4. Create WatchConnectivity bridge
```

### Testing

1. Use Xcode Simulator with paired Watch simulator
2. Test message passing between phone/watch
3. Test workout session lifecycle
4. Test HealthKit data flow

## Resources

- [WatchConnectivity Framework](https://developer.apple.com/documentation/watchconnectivity)
- [HealthKit for watchOS](https://developer.apple.com/documentation/healthkit)
- [Workout Sessions](https://developer.apple.com/documentation/healthkit/workouts_and_activity_rings)
- [Watch Complications](https://developer.apple.com/documentation/clockkit)
