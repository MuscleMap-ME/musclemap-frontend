# Workout Generation

> AI-powered workout prescription tailored to you.

---

## How It Works

MuscleMap's prescription engine generates personalized workouts based on multiple factors:

```
+-------------------+
|   YOUR CONTEXT    |
+-------------------+
        |
        v
+-------------------+     +-------------------+
|     INPUTS        | --> |  PRESCRIPTION     |
+-------------------+     |     ENGINE        |
| - Archetype       |     +-------------------+
| - Level           |            |
| - Equipment       |            v
| - Location        |     +-------------------+
| - Time available  |     |  YOUR WORKOUT     |
| - Recent history  |     +-------------------+
| - Muscle fatigue  |     | - Exercises       |
| - Goals           |     | - Sets/Reps       |
+-------------------+     | - Rest periods    |
                          | - Alternatives    |
                          +-------------------+
```

---

## Input Factors

### 1. Archetype & Level

Your archetype determines training philosophy:

| Archetype | Training Focus |
|-----------|----------------|
| Bodybuilder | Higher volume, isolation, pump |
| Powerlifter | Heavy compounds, low reps |
| Athlete | Functional, varied |
| CrossFitter | WOD-style, high intensity |
| Calisthenics | Bodyweight progressions |
| Martial Artist | Combat conditioning |

Your level affects:
- Exercise complexity
- Volume recommendations
- Progressive overload targets

### 2. Available Equipment

Tell MuscleMap what you have access to:

```
Equipment Categories:
+------------------+---------------------------+
| Category         | Examples                  |
+------------------+---------------------------+
| Bodyweight Only  | No equipment needed       |
| Dumbbells        | Adjustable or fixed       |
| Barbell + Plates | Olympic or standard       |
| Cable Machine    | Home or commercial        |
| Pull-up Bar      | Doorway or mounted        |
| Resistance Bands | Light to heavy            |
| Kettlebells      | Various weights           |
| Machines         | Leg press, Smith, etc.    |
| Specialty        | GHD, rings, TRX           |
+------------------+---------------------------+
```

### 3. Location

Where you're training affects recommendations:

- **Commercial Gym**: Full equipment access
- **Home Gym**: Your saved equipment
- **Bodyweight Only**: Parks, hotels, anywhere
- **Custom Location**: Your defined setup

### 4. Time Available

Set your workout duration:

```
Time Slots:
+------------+------------------+------------------+
| Duration   | Typical Content  | Example          |
+------------+------------------+------------------+
| 15-20 min  | Quick circuit    | 3 exercises      |
| 30-45 min  | Standard session | 5-6 exercises    |
| 45-60 min  | Full workout     | 7-8 exercises    |
| 60-90 min  | Extended session | 10+ exercises    |
+------------+------------------+------------------+
```

### 5. Recent Workout History

The engine considers:
- What muscle groups you trained recently
- How much volume (TU) per muscle
- Days since last training
- Accumulated fatigue

### 6. Muscle Recovery State

```
Recovery Status Indicators:

FRESH      ████████████████████  Ready for heavy work
RECOVERED  ████████████████░░░░  Good to train
MODERATE   ████████████░░░░░░░░  Light work okay
FATIGUED   ████████░░░░░░░░░░░░  Consider rest
EXHAUSTED  ████░░░░░░░░░░░░░░░░  Rest recommended
```

---

## Generation Process

### Step 1: Analyze Context

```
User Profile Analysis:
- Archetype: Bodybuilder
- Level: 14 (Advanced)
- Last workout: 2 days ago (Chest/Triceps)
- Equipment: Commercial gym
- Time: 45 minutes
- Goal: Hypertrophy
```

### Step 2: Identify Target Muscles

```
Muscle Selection Logic:

Recent Training:
+----------------+-----------+----------+
| Muscle Group   | Last Hit  | Fatigue  |
+----------------+-----------+----------+
| Chest          | 2 days    | Moderate |
| Triceps        | 2 days    | Moderate |
| Back           | 4 days    | Fresh    |  <-- Priority
| Biceps         | 4 days    | Fresh    |  <-- Priority
| Shoulders      | 3 days    | Low      |
| Legs           | 5 days    | Fresh    |  <-- Priority
+----------------+-----------+----------+

Recommendation: Back & Biceps
```

### Step 3: Select Exercises

Based on:
- Equipment availability
- Archetype preferences
- Progressive overload needs
- Exercise variety (avoid staleness)

### Step 4: Determine Volume

```
Volume Calculation:

Base volume by level:
  Level 1-5:   10-15 sets per session
  Level 6-10:  15-20 sets per session
  Level 11-20: 18-24 sets per session
  Level 21+:   20-28 sets per session

Adjusted for:
  - Time available (-/+ 20%)
  - Recovery state (-/+ 30%)
  - User preferences (-/+ 15%)
```

### Step 5: Generate Prescription

```
Example Output:

BACK & BICEPS WORKOUT (45 min)
==============================

1. Pull-ups (or Lat Pulldown)
   4 sets x 8-10 reps
   Rest: 90 sec
   Target: Lats, Rhomboids

2. Barbell Row
   4 sets x 8-10 reps
   Rest: 90 sec
   Target: Mid-Back, Lats

3. Seated Cable Row
   3 sets x 10-12 reps
   Rest: 75 sec
   Target: Mid-Back, Rear Delts

4. Face Pulls
   3 sets x 15 reps
   Rest: 60 sec
   Target: Rear Delts, Rhomboids

5. Barbell Curl
   3 sets x 10-12 reps
   Rest: 60 sec
   Target: Biceps

6. Hammer Curls
   3 sets x 12 reps
   Rest: 60 sec
   Target: Brachialis, Biceps

Est. TU: 85-95 | Total Sets: 20
```

---

## Customization Options

### During Workout

You can modify the generated workout:

| Action | How |
|--------|-----|
| **Skip exercise** | Tap skip button |
| **Swap exercise** | Tap swap, choose alternative |
| **Add exercise** | Tap + button |
| **Modify sets/reps** | Tap on prescription |
| **Adjust rest time** | Tap on timer |

### Pre-Generation Preferences

Set in Settings → Workout Preferences:

- **Favorite exercises** - Prioritized in generation
- **Exercises to avoid** - Never suggested
- **Superset preference** - Enable/disable
- **Volume preference** - Low/Medium/High
- **Intensity preference** - Conservative/Moderate/Aggressive

---

## Smart Features

### Progressive Overload Tracking

The engine suggests increases when ready:

```
Previous: Bench Press 80kg x 10, 10, 9
Analysis: Completed reps, good recovery
Suggestion: Try 82.5kg x 10, 10, 10

[Accept] [Keep Same] [Adjust]
```

### Exercise Rotation

Avoids staleness by rotating variations:

```
Week 1: Barbell Bench Press
Week 2: Dumbbell Bench Press
Week 3: Incline Barbell Press
Week 4: Barbell Bench Press (cycle)
```

### Fatigue Management

Reduces volume when accumulated fatigue is high:

```
Warning: High accumulated fatigue detected
         for Chest (3 sessions in 5 days)

Recommendation: Reduced chest volume today
                or focus on other muscles

[Reduce Volume] [Train Anyway] [Change Focus]
```

---

## Credit Cost

Each generated workout costs **25 credits**.

```
Credit Economy:
+---------------------------+----------+
| Action                    | Credits  |
+---------------------------+----------+
| New user signup           | +100     |
| Generate workout          | -25      |
| Repeat saved workout      | FREE     |
| Manually log workout      | FREE     |
+---------------------------+----------+

100 credits = 4 AI-generated workouts
```

### Free Alternatives

You can workout for free by:
- Repeating past workouts
- Using saved templates
- Logging exercises manually
- Following friend's shared workouts

---

## Workout Templates

### Saving Templates

After a good workout:

1. Tap **Save as Template**
2. Name your template
3. Add tags (optional)
4. Save

Templates are free to repeat unlimited times.

### Using Templates

1. Go to **Workouts → Templates**
2. Select a template
3. **Start Workout**

---

## Tips for Better Prescriptions

1. **Keep equipment updated** - Accurate equipment = better suggestions
2. **Log all workouts** - History improves recommendations
3. **Rate workouts** - Feedback trains the engine
4. **Set accurate goals** - Helps prioritize muscles
5. **Update time realistically** - Don't rush through workouts

---

## FAQ

### Why did I get a muscle group I just trained?

Possible reasons:
- It's been 48+ hours (typical recovery)
- You selected "Full Body" mode
- Your other muscle groups are more fatigued

### Can I request specific muscle groups?

Yes! Use the **Focus** option before generating:
- Select target muscle groups
- The engine prioritizes your selection

### Why doesn't it ever suggest [exercise]?

Check:
- Is the required equipment in your profile?
- Is the exercise on your "avoid" list?
- Does it match your archetype's style?

### How do I improve recommendations?

- Log workouts consistently
- Rate generated workouts (thumbs up/down)
- Keep preferences updated
- Provide feedback on swaps

---

*Last updated: 2026-01-15*
