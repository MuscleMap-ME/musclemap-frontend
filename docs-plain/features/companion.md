# Apple Watch Companion

> Your workout buddy on your wrist.

---

## Overview

The MuscleMap Apple Watch app provides:

```
+--------------------------------------------------+
|           APPLE WATCH COMPANION                   |
+--------------------------------------------------+
|                                                  |
|   +-------------------+                          |
|   |    MuscleMap     |                          |
|   |   ============   |                          |
|   |   BENCH PRESS    |                          |
|   |   Set 3 of 4     |                          |
|   |   80kg x 10      |                          |
|   |   [Done] [Skip]  |                          |
|   +-------------------+                          |
|                                                  |
|   Features:                                      |
|   ├── Exercise guidance                         |
|   ├── Rest timer with haptics                   |
|   ├── Quick logging                             |
|   ├── Heart rate tracking                       |
|   └── Phone-free workouts                       |
+--------------------------------------------------+
```

---

## Key Features

### At-a-Glance Workout Info

```
WATCH DISPLAY DURING WORKOUT
============================

+-------------------+
|    MUSCLEMAP     |
|==================|
|  SQUAT           |
|  Set 2 of 4      |
|                  |
|  100kg           |
|  8 reps target   |
|                  |
|  [✓ Done] [Skip] |
+-------------------+
```

### Rest Timer

```
REST PERIOD
===========

+-------------------+
|    REST TIME     |
|==================|
|                  |
|     1:32         |
|   remaining      |
|                  |
|  ♥ 142 bpm       |
|                  |
| [Skip] [+30 sec] |
+-------------------+

Haptic alerts:
├── 30 seconds remaining (gentle tap)
├── 10 seconds remaining (double tap)
└── Rest complete (strong buzz)
```

### Quick Logging

```
LOG YOUR SET
============

+-------------------+
|   LOG SET        |
|==================|
|  Weight: 100kg   |
|  [−] [95] [+]    |
|                  |
|  Reps: 8         |
|  [−] [8]  [+]    |
|                  |
|  [Save Set]      |
+-------------------+
```

---

## Workout Flow

### Starting a Workout

**Option 1: Start from Phone**
1. Start workout on iPhone
2. Watch automatically syncs
3. Workout appears on wrist

**Option 2: Start from Watch**
1. Open MuscleMap on Watch
2. Tap **Start Workout**
3. Choose: Resume last / Quick start / Generate

### During Workout

```
WORKOUT FLOW
============

Exercise Display → Log Set → Rest Timer → Next Set
      │              │           │            │
      │              │           │            │
   See current    Record     Count down   Next set or
   exercise       actual     rest time    next exercise
                  weight/
                  reps
```

### Completing Workout

1. Tap **End Workout** when done
2. View summary on watch
3. Full details sync to phone
4. TU and achievements update

---

## Health Integration

### Data Captured

| Metric | Source | Usage |
|--------|--------|-------|
| Heart Rate | Watch sensors | Track intensity |
| Calories | Watch calculation | Energy expenditure |
| Workout Duration | Timer | Time tracking |
| Active Minutes | Motion sensors | Activity credit |

### HealthKit Sync

Data syncs to Apple Health:
- Workout sessions
- Heart rate during exercise
- Active energy burned
- Strength training minutes

```
HEALTHKIT PERMISSIONS
=====================

MuscleMap requests:
├── Read: Heart Rate, Steps
├── Write: Workouts, Active Energy
└── Background: Heart rate during exercise

All permissions optional.
Settings > Health > MuscleMap
```

---

## Watch Complications

### Available Complications

Add MuscleMap to your watch face:

```
COMPLICATIONS
=============

+------------------+-------------------+
| Type             | Shows             |
+------------------+-------------------+
| Circular         | Today's TU        |
| Rectangular      | TU + Streak       |
| Corner           | Quick launch      |
| Modular Large    | Next workout      |
+------------------+-------------------+
```

### Complication Examples

```
CIRCULAR           RECTANGULAR
+---------+        +------------------+
|         |        | MuscleMap        |
|  847    |        | 847 TU today     |
|   TU    |        | 🔥 23 day streak |
+---------+        +------------------+
```

---

## Standalone Mode

### Phone-Free Workouts

Works without iPhone nearby:

```
STANDALONE CAPABILITIES
=======================

Works Offline:
├── View workout plan
├── Log sets and exercises
├── Rest timer with haptics
├── Heart rate tracking
└── Store up to 10 workouts

Needs Phone:
├── Generate new AI workouts
├── Full exercise library
├── Sync to cloud
└── Community features
```

### Syncing Later

1. Complete workout on watch
2. Data stored locally
3. When iPhone connects, auto-syncs
4. All data uploaded to cloud

---

## Watch Settings

### Haptic Preferences

```
HAPTIC SETTINGS
===============

Rest Timer Alerts:     [ON]
Set Complete:          [ON]
Workout Milestones:    [ON]
Achievement Earned:    [ON]
Intensity:            [Strong / Medium / Light]
```

### Display Options

```
DISPLAY SETTINGS
================

Auto-Lock:            [Never during workout]
Keep Screen On:       [During sets]
Large Text Mode:      [OFF]
High Contrast:        [OFF]
```

### Workout Defaults

```
WORKOUT DEFAULTS
================

Default Rest Time:    90 seconds
Auto-advance Sets:    [ON]
Show Heart Rate:      [ON]
Quick Add Buttons:    [ON]
```

---

## Troubleshooting

### Watch Not Syncing

```
SYNC TROUBLESHOOTING
====================

1. Check Bluetooth connection
   Watch Settings > Bluetooth

2. Check WiFi (if using)
   Watch Settings > WiFi

3. Force sync
   MuscleMap Watch > Settings > Force Sync

4. Re-pair watch
   iPhone Watch app > Unpair > Re-pair
```

### Battery Optimization

```
BATTERY TIPS
============

To extend watch battery during workouts:

1. Use Theater Mode (dims display)
2. Reduce haptic intensity
3. Turn off Always-On display
4. Close other watch apps
5. Disable workout playlists

Typical usage: 3-4 hour workout = 30% battery
```

### Heart Rate Issues

```
HEART RATE TROUBLESHOOTING
==========================

If heart rate not showing:

1. Check watch fit (snug, 1 finger above wrist)
2. Clean sensor and wrist
3. Check workout privacy settings
4. Restart watch
5. Re-enable heart rate for workouts
```

---

## Setup Guide

### Installation

1. **Download MuscleMap** on iPhone
2. **Open Watch app** on iPhone
3. Find MuscleMap in **Available Apps**
4. Tap **Install**
5. Wait for transfer complete

### First Launch

1. Open MuscleMap on Watch
2. Sign in (via iPhone prompt)
3. Grant health permissions
4. Set haptic preferences
5. Add complication (optional)

### Pairing with iPhone

```
PAIRING FLOW
============

Watch                    iPhone
  │                        │
  │  Bluetooth handshake   │
  │ <────────────────────> │
  │                        │
  │  Account sync          │
  │ <────────────────────> │
  │                        │
  │  Settings sync         │
  │ <────────────────────> │
  │                        │
  ✓  Ready to workout      ✓
```

---

## Requirements

### Minimum Requirements

| Requirement | Minimum |
|-------------|---------|
| watchOS | 9.0+ |
| Apple Watch | Series 4+ |
| iPhone | iOS 16+ (for install) |
| Storage | 50MB |

### Recommended

| For Best Experience |
|---------------------|
| Apple Watch Series 7+ |
| watchOS 10+ |
| Cellular watch (for standalone) |

---

## FAQ

### Can I use just the watch without the phone?

Yes, for basic workout logging. AI workout generation and full features require phone connection.

### Does it work with AirPods?

Yes. Audio cues can play through connected AirPods.

### How accurate is calorie tracking?

Watch uses heart rate + motion for estimates. Accuracy varies by individual (typically ±10-15%).

### Can I see the 3D muscle model on watch?

No. The 3D model is phone/web only. Watch shows simplified muscle targeting info.

### Does it drain watch battery?

Moderate impact. A 1-hour workout uses approximately 10-15% battery with heart rate tracking.

---

*Last updated: 2026-01-15*
