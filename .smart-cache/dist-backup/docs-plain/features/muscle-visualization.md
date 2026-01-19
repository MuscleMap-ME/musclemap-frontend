# Muscle Visualization

> See exactly which muscles work during every exercise.

---

## Overview

MuscleMap's signature feature is real-time 3D muscle visualization. As you browse exercises or work out, the muscle model lights up to show which muscles are being activated and how intensely.

```
+------------------------------------------------------------------+
|                  MUSCLE VISUALIZATION                             |
|------------------------------------------------------------------|
|                                                                   |
|                    [3D BODY MODEL]                                |
|                                                                   |
|            Chest glowing RED (80% activation)                     |
|            Triceps glowing ORANGE (60% activation)                |
|            Shoulders glowing YELLOW (40% activation)              |
|            Core subtle glow (20% activation)                      |
|                                                                   |
|  Legend:                                                          |
|  RED (80-100%) = Primary muscle, high activation                  |
|  ORANGE (60-79%) = Secondary muscle, moderate activation          |
|  YELLOW (40-59%) = Tertiary muscle, supporting role               |
|  DIM (1-39%) = Stabilizer, minimal activation                     |
|                                                                   |
+------------------------------------------------------------------+
```

---

## How It Works

### Muscle Database

Every exercise in MuscleMap is tagged with:

| Data Point | Description |
|------------|-------------|
| Primary muscles | Main muscles targeted (60-100% activation) |
| Secondary muscles | Supporting muscles (30-60% activation) |
| Stabilizers | Muscles for balance/control (10-30% activation) |
| Activation percentages | How much each muscle works |

### The 3D Model

The muscle model contains:
- **40+ distinct muscle groups**
- Front and back views
- Major and minor muscles
- Real anatomical placement

### Visualization Types

| Type | Description | Best For |
|------|-------------|----------|
| 3D Model | Fully rotatable anatomical model | Desktop, exploration |
| 2D Map | Front/back static view | Mobile, quick reference |
| Minimal | Text list with percentages | Low bandwidth, accessibility |

---

## Using Muscle Visualization

### During Exercise Browse

When viewing an exercise, the model shows what muscles it works:

```
BENCH PRESS
===========

[3D MODEL showing:]
- Chest: 85% (PRIMARY)
- Triceps: 65% (SECONDARY)
- Front Deltoids: 45% (SECONDARY)
- Core: 20% (STABILIZER)

Description: Compound push exercise targeting the chest...
```

### During Workouts

As you complete sets, the model updates to show cumulative activation:

```
WORKOUT IN PROGRESS
===================

Exercises completed: 3 of 6

[3D MODEL showing cumulative activation:]
- Chest: 145 TU worked
- Triceps: 98 TU worked
- Shoulders: 67 TU worked
- Core: 45 TU worked

Next exercise: Incline Dumbbell Press
```

### After Workout Summary

Your workout complete screen shows total muscle activation:

```
WORKOUT COMPLETE
================

[HEAT MAP showing:]

Most worked:
1. Chest      ████████████████████  92%
2. Triceps    ████████████████░░░░  78%
3. Shoulders  ████████████░░░░░░░░  62%
4. Core       ████████░░░░░░░░░░░░  45%

Least worked today (but recovered):
- Back, Legs, Biceps (intentionally not targeted)
```

---

## Muscle Groups Tracked

### Upper Body - Front

| Muscle | Location |
|--------|----------|
| Chest (Pectoralis Major) | Front of chest |
| Front Deltoids | Front of shoulders |
| Biceps | Front of upper arm |
| Forearms (Flexors) | Inner forearm |
| Abs (Rectus Abdominis) | Front of abdomen |
| Obliques | Sides of abdomen |

### Upper Body - Back

| Muscle | Location |
|--------|----------|
| Lats (Latissimus Dorsi) | Large back muscle |
| Traps (Trapezius) | Upper back/neck |
| Rhomboids | Middle back |
| Rear Deltoids | Back of shoulders |
| Triceps | Back of upper arm |
| Forearms (Extensors) | Outer forearm |
| Erector Spinae | Lower back |

### Lower Body

| Muscle | Location |
|--------|----------|
| Quadriceps | Front of thigh |
| Hamstrings | Back of thigh |
| Glutes | Buttocks |
| Hip Flexors | Front of hip |
| Adductors | Inner thigh |
| Abductors | Outer thigh |
| Calves | Back of lower leg |
| Tibialis Anterior | Front of shin |

---

## Activation Percentages

### What the Percentages Mean

```
ACTIVATION SCALE
================

90-100%  ████████████████████  PRIMARY - Main target muscle
         Maximum muscle fiber recruitment
         This exercise is DESIGNED for this muscle

70-89%   ██████████████████░░  HIGH - Strong secondary
         Significant contribution
         Will see growth/strength gains

50-69%   ████████████████░░░░  MODERATE - Active secondary
         Meaningful activation
         Supports the primary

30-49%   ████████████░░░░░░░░  LOW - Tertiary involvement
         Some activation
         Mostly stabilization

10-29%   ████████░░░░░░░░░░░░  MINIMAL - Stabilizer only
         Keeps you balanced
         Won't drive adaptation

0-9%     ████░░░░░░░░░░░░░░░░  NEGLIGIBLE
         Barely involved
         Not tracked for TU
```

### Example: Squat Activation

```
BACK SQUAT - Muscle Activation
==============================

Quadriceps:    ████████████████████  95%  (Primary)
Glutes:        ██████████████████░░  85%  (Primary)
Hamstrings:    ██████████████░░░░░░  65%  (Secondary)
Erector Spinae:████████████░░░░░░░░  55%  (Secondary)
Core:          ████████░░░░░░░░░░░░  40%  (Stabilizer)
Calves:        ██████░░░░░░░░░░░░░░  30%  (Stabilizer)
Hip Flexors:   ████░░░░░░░░░░░░░░░░  20%  (Stabilizer)
```

---

## Training Balance

### The Muscle Balance Map

MuscleMap tracks your muscle training over time:

```
WEEKLY MUSCLE BALANCE
=====================

                  FRONT                          BACK

           +-----------+                   +-----------+
           |   NECK    |                   |   TRAPS   |
           +-----------+                   +-----------+
              [  OK  ]                        [  LOW  ]

      +-----+         +-----+         +-----+         +-----+
      |DELT |         |DELT |         |REAR |         |REAR |
      +-----+         +-----+         +-----+         +-----+
      [ OK  ]         [ OK  ]         [ LOW ]         [ LOW ]

      +-----+  +-----+  +-----+        +-----+  +-----+
      |CHEST|  | ABS |  |BICEP|        | LATS|  |TRIC |
      +-----+  +-----+  +-----+        +-----+  +-----+
      [ HIGH]  [ OK  ]  [ OK  ]        [ LOW ]  [ HIGH]

           +-----+         +-----+         +-----+
           |QUADS|         |GLUTE|         |HAMS |
           +-----+         +-----+         +-----+
           [ OK  ]         [ HIGH]         [ LOW ]

Legend: HIGH = Well trained  |  OK = Balanced  |  LOW = Needs work
```

### Balance Recommendations

Based on your balance map, MuscleMap suggests:

```
RECOMMENDATIONS
===============

Your chest and triceps are well-developed this week.
Consider focusing on:

1. Back exercises (rows, pull-ups)
   - Current: 45 TU this week
   - Target: 80+ TU for balance

2. Hamstrings (Romanian deadlifts, leg curls)
   - Current: 30 TU this week
   - Target: 60+ TU for balance

3. Rear deltoids (face pulls, reverse flyes)
   - Current: 15 TU this week
   - Target: 30+ TU for balance
```

---

## Settings & Customization

### Visualization Options

```
MUSCLE VISUALIZATION SETTINGS
=============================

View mode:        [3D Model ▼]
                  - 3D Model (rotatable)
                  - 2D Map (static)
                  - Minimal (text only)

Color scheme:     [Heat Map ▼]
                  - Heat Map (red/orange/yellow)
                  - Single Color (intensity)
                  - High Contrast

Animation:        [On ▼]
                  - On (smooth transitions)
                  - Off (static)

Detail level:     [Full ▼]
                  - Full (all muscles)
                  - Major (main groups only)
                  - Simple (5 regions)
```

### Performance Mode

For older devices:

```
PERFORMANCE MODE
================

[x] Enable performance mode

When enabled:
- 2D visualization instead of 3D
- Reduced animation
- Faster load times

Recommended for:
- Older smartphones
- Slow connections
- Battery saving
```

---

## The Science

### How We Calculate Activation

Activation percentages are based on:

1. **EMG Research** - Electromyography studies measuring actual muscle electrical activity
2. **Biomechanical Analysis** - Joint angles and force vectors
3. **Peer-Reviewed Literature** - Published exercise science research
4. **Expert Consultation** - Input from exercise physiologists

### Data Sources

- Journal of Strength and Conditioning Research
- Medicine & Science in Sports & Exercise
- European Journal of Applied Physiology
- Certified Strength and Conditioning Specialists (CSCS)

---

## FAQ

**Q: Is the muscle data accurate?**
A: Our activation data is based on EMG research and peer-reviewed studies. While individual variation exists, the relative rankings are consistent.

**Q: Can I see muscles during cardio?**
A: Currently, muscle visualization focuses on resistance training. Cardio tracking uses different metrics (heart rate, duration).

**Q: Why do some muscles show 0%?**
A: If a muscle isn't meaningfully involved in an exercise, we don't track it for that movement. This keeps the visualization focused.

**Q: Can I customize the muscle colors?**
A: Yes! Settings → Visualization → Color Scheme offers several options including high-contrast for accessibility.

---

*See also: [Training Units](./training-units.md) | [Workout Generation](./workout-generation.md)*
