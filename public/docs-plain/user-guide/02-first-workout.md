# Your First Workout

> Start, log, and complete your first MuscleMap workout.

---

## Table of Contents

1. [Starting a Workout](#starting-a-workout)
2. [Understanding the Interface](#understanding-the-interface)
3. [Logging Your Sets](#logging-your-sets)
4. [Rest Timer](#rest-timer)
5. [Completing Your Workout](#completing-your-workout)
6. [Understanding Your Results](#understanding-your-results)

---

## Starting a Workout

### Quick Start

1. Go to your Dashboard
2. Click **Start Workout**
3. MuscleMap generates a personalized routine

### Workout Generation

The prescription engine considers:

```
+------------------------------------------------------------------+
|                 WORKOUT GENERATION                                |
|------------------------------------------------------------------|
|                                                                   |
|  INPUT FACTORS:                                                   |
|  +------------------+  +------------------+  +------------------+ |
|  | Your Archetype   |  | Equipment        |  | Recovery Status  | |
|  | (training style) |  | (what you have)  |  | (muscle fatigue) | |
|  +------------------+  +------------------+  +------------------+ |
|                                                                   |
|  +------------------+  +------------------+  +------------------+ |
|  | Location         |  | Available Time   |  | Your Level       | |
|  | (gym/home/etc)   |  | (15-90 minutes)  |  | (difficulty)     | |
|  +------------------+  +------------------+  +------------------+ |
|                                                                   |
|                            |                                      |
|                            v                                      |
|                                                                   |
|  OUTPUT: Balanced workout hitting optimal muscles                 |
|                                                                   |
+------------------------------------------------------------------+
```

### Setting Preferences

Before generating, you can set:

| Option | Description |
|--------|-------------|
| Time Available | 15, 30, 45, 60, or 90 minutes |
| Location | Gym, home, park, hotel, etc. |
| Focus Area | Optional: upper/lower/full body |
| Intensity | Light, moderate, intense |

---

## Understanding the Interface

### Workout Screen Layout

```
+------------------------------------------------------------------+
|  <- Back                    WORKOUT                   Options ... |
|------------------------------------------------------------------|
|                                                                   |
|  Exercise 2 of 6                      [Skip] [Swap]               |
|                                                                   |
|  +------------------------------------------------------------+  |
|  |                                                              |  |
|  |                    PUSH-UPS                                  |  |
|  |                                                              |  |
|  |    +--------------------------------------------------+     |  |
|  |    |                                                  |     |  |
|  |    |         [3D MUSCLE VISUALIZATION]                |     |  |
|  |    |                                                  |     |  |
|  |    |    Chest: 80%  |  Triceps: 60%  |  Core: 30%     |     |  |
|  |    |                                                  |     |  |
|  |    +--------------------------------------------------+     |  |
|  |                                                              |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  TARGET: 3 sets x 12 reps                                        |
|  REST: 60 seconds between sets                                    |
|                                                                   |
|  SETS COMPLETED:                                                  |
|  [Set 1: 12 reps - Done]  [Set 2: --]  [Set 3: --]               |
|                                                                   |
|                    [LOG SET]                                      |
|                                                                   |
+------------------------------------------------------------------+
```

### Interface Elements

| Element | Function |
|---------|----------|
| Exercise Name | Current exercise |
| Muscle Visualization | 3D model showing activation |
| Target | Recommended sets/reps |
| Set Tracker | Shows completed sets |
| Skip | Move to next exercise |
| Swap | Replace with alternative |
| Options | More settings |

---

## Logging Your Sets

### For Each Set

1. Perform the exercise
2. Tap **Log Set**
3. Enter your actual performance

```
+----------------------------------+
|           LOG SET                |
|----------------------------------|
|                                  |
|  Reps:     [___12___]            |
|                                  |
|  Weight:   [___45___] kg         |
|  (if applicable)                 |
|                                  |
|  RPE:      [___7____]            |
|  (Rate of Perceived Exertion)    |
|                                  |
|  Notes:    [________________]    |
|  (optional)                      |
|                                  |
|  [Cancel]        [Save Set]      |
|                                  |
+----------------------------------+
```

### RPE Scale

Rate of Perceived Exertion measures effort:

| RPE | Meaning | Reps Left |
|-----|---------|-----------|
| 1-4 | Very easy | 6+ reps in reserve |
| 5-6 | Moderate | 4-5 reps in reserve |
| 7 | Challenging | 3 reps in reserve |
| 8 | Hard | 2 reps in reserve |
| 9 | Very hard | 1 rep in reserve |
| 10 | Maximum | No reps left |

**Tip**: Most training should be RPE 7-8 for optimal gains.

### Logging Tips

- Log immediately after each set
- Be honest - it helps your recommendations
- Use notes for technique reminders
- Weight is optional for bodyweight exercises

---

## Rest Timer

### Automatic Timer

After logging a set, a rest timer starts:

```
+----------------------------------+
|          REST TIMER              |
|----------------------------------|
|                                  |
|            0:45                  |
|         remaining                |
|                                  |
|     [||||||||||||------]         |
|                                  |
|  [Add 30s]        [Skip Rest]    |
|                                  |
+----------------------------------+
```

### Rest Recommendations

| Training Type | Rest Duration |
|---------------|---------------|
| Strength (1-5 reps) | 3-5 minutes |
| Hypertrophy (8-12 reps) | 60-90 seconds |
| Endurance (15+ reps) | 30-60 seconds |
| Circuit training | 0-30 seconds |

### Timer Features

- **Add time**: Tap to extend rest
- **Skip**: Start next set early
- **Adjust default**: In workout settings
- **Audio alert**: Notifies when rest ends

---

## Completing Your Workout

### When You're Done

1. Finish your last exercise
2. Tap **Complete Workout**
3. Review your summary

### Early Exit

If you need to stop early:
- Tap **Options** → **End Workout**
- Your logged sets are saved
- You still earn TU for completed work

---

## Understanding Your Results

### Workout Summary

```
+------------------------------------------------------------------+
|                   WORKOUT COMPLETE!                               |
|------------------------------------------------------------------|
|                                                                   |
|  TRAINING UNITS                                                   |
|  +------------------------------------------------------------+  |
|  |                                                              |  |
|  |                       52.3 TU                                |  |
|  |                      earned                                  |  |
|  |                                                              |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  SUMMARY                                                          |
|  +------------------+  +------------------+  +------------------+ |
|  |    32 min        |  |    6 exercises   |  |    18 sets       | |
|  |    Duration      |  |    Completed     |  |    Total         | |
|  +------------------+  +------------------+  +------------------+ |
|                                                                   |
|  MUSCLE ACTIVATION                                                |
|  +------------------------------------------------------------+  |
|  |                                                              |  |
|  |  Chest      ████████████████░░░░░░░░  78%                   |  |
|  |  Triceps    ██████████████░░░░░░░░░░  65%                   |  |
|  |  Shoulders  ████████████░░░░░░░░░░░░  52%                   |  |
|  |  Core       ████████░░░░░░░░░░░░░░░░  40%                   |  |
|  |                                                              |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  +------------------+  +------------------+  +------------------+ |
|  |  [View Details]  |  |     [Share]      |  |     [Done]       | |
|  +------------------+  +------------------+  +------------------+ |
|                                                                   |
+------------------------------------------------------------------+
```

### What the Numbers Mean

| Metric | Explanation |
|--------|-------------|
| **Training Units (TU)** | Volume-weighted score for this workout |
| **Duration** | Time from start to finish |
| **Exercises** | Number of different movements |
| **Sets** | Total sets logged |
| **Muscle Activation** | How much each muscle was worked |

### After Your Workout

Your workout is automatically:
- Saved to your history
- Added to your TU total
- Used to update your level progress
- Factored into future recommendations

---

## Tips for Better Workouts

```
+------------------------------------------------------------------+
|                    WORKOUT TIPS                                   |
|------------------------------------------------------------------|
|                                                                   |
|  1. WARM UP FIRST                                                 |
|     5-10 minutes of light cardio prepares your body.              |
|                                                                   |
|  2. FOLLOW THE ORDER                                              |
|     Exercises are sequenced for optimal performance.              |
|     Compound moves before isolation.                              |
|                                                                   |
|  3. USE FULL RANGE OF MOTION                                      |
|     Partial reps earn partial TU.                                 |
|     Quality over quantity.                                        |
|                                                                   |
|  4. REST ADEQUATELY                                               |
|     Don't rush between sets.                                      |
|     Recovery is part of training.                                 |
|                                                                   |
|  5. COOL DOWN                                                     |
|     Light stretching helps recovery.                              |
|     Your muscles will thank you.                                  |
|                                                                   |
+------------------------------------------------------------------+
```

---

## Common Issues

### "I can't do an exercise"

- Tap **Skip** to move on
- Or tap **Swap** for an alternative
- MuscleMap learns your preferences

### "The weight feels wrong"

- Adjust to what feels right for you
- Log your actual weight used
- Recommendations improve over time

### "I want different exercises"

- Update your equipment settings
- Try a different focus area
- Your archetype affects selections

---

*Next: [Tracking Progress →](./03-tracking-progress.md)*
