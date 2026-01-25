# Activity Log Enhancement Plan

**Status:** Approved for Implementation
**Priority:** P1 - High Impact
**Last Updated:** January 25, 2026

---

## Current State

The Activity Log (`/log`) currently supports 6 input methods:
1. ✅ Quick Log (manual entry)
2. ✅ Voice (Web Speech API)
3. ✅ Paste (text parsing)
4. ⚠️ Screenshot (OCR stubbed)
5. ✅ File Import (CSV/JSON)
6. ⚠️ Health Sync (OAuth stubbed)

---

## Enhancement Categories

### Category A: Complete Stubbed Features

#### A1. Screenshot OCR Implementation [P0]

**Current:** Returns empty array, shows "Coming Soon"

**Implementation:**
```typescript
// src/components/activity-log/ScreenshotImportSheet.tsx

import { createWorker } from 'tesseract.js';

async function performOCR(imageData: string): Promise<string[]> {
  const worker = await createWorker('eng');

  try {
    const { data: { text } } = await worker.recognize(imageData);
    await worker.terminate();

    // Parse workout patterns from OCR text
    return parseWorkoutText(text);
  } catch (error) {
    console.error('OCR failed:', error);
    return [];
  }
}

function parseWorkoutText(text: string): string[] {
  const lines = text.split('\n').filter(Boolean);
  const workoutPatterns = [
    // "Bench Press 135 lbs x 10"
    /^(.+?)\s+(\d+(?:\.\d+)?)\s*(?:lbs?|kg)?\s*[x×]\s*(\d+)/i,
    // "3x10 @ 135 Bench Press"
    /^(\d+)\s*[x×]\s*(\d+)\s*@?\s*(\d+(?:\.\d+)?)\s*(.+)/i,
    // "Bench Press: 3 sets, 10 reps, 135 lbs"
    /^(.+?):\s*(\d+)\s*sets?,\s*(\d+)\s*reps?,\s*(\d+(?:\.\d+)?)/i,
  ];

  return lines.map(line => {
    for (const pattern of workoutPatterns) {
      const match = line.match(pattern);
      if (match) return line; // Keep matched lines
    }
    return null;
  }).filter(Boolean) as string[];
}
```

**Dependencies:**
```bash
pnpm add tesseract.js
```

**Effort:** 1 week

#### A2. Health Platform OAuth [P1]

**Current:** Shows platform list but no actual integration

**Implementation Plan:**

**Apple Health (React Native only):**
```typescript
// apps/mobile/src/health/AppleHealth.ts
import AppleHealthKit from 'react-native-health';

const permissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Workout,
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
    ],
    write: [AppleHealthKit.Constants.Permissions.Workout],
  },
};

export async function requestHealthAccess(): Promise<boolean> {
  return new Promise((resolve) => {
    AppleHealthKit.initHealthKit(permissions, (error) => {
      resolve(!error);
    });
  });
}

export async function syncWorkouts(since: Date): Promise<Workout[]> {
  return new Promise((resolve, reject) => {
    AppleHealthKit.getSamples({
      type: 'Workout',
      startDate: since.toISOString(),
    }, (err, results) => {
      if (err) reject(err);
      else resolve(results.map(mapAppleWorkout));
    });
  });
}
```

**Google Fit (Web + Mobile):**
```typescript
// src/services/google-fit.ts
const GOOGLE_FIT_SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.read',
];

export async function initGoogleFit(): Promise<void> {
  const auth = await google.accounts.oauth2.initTokenClient({
    client_id: process.env.GOOGLE_CLIENT_ID,
    scope: GOOGLE_FIT_SCOPES.join(' '),
    callback: handleAuthCallback,
  });
}

export async function fetchWorkouts(token: string, since: Date): Promise<Workout[]> {
  const response = await fetch(
    `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${since.toISOString()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return (await response.json()).session.map(mapGoogleFitWorkout);
}
```

**Garmin Connect:**
```typescript
// src/services/garmin.ts
// Requires Garmin Connect IQ developer account

export async function initGarminOAuth(): Promise<void> {
  const authUrl = `https://connect.garmin.com/oauthConfirm?` +
    `oauth_consumer_key=${GARMIN_CONSUMER_KEY}` +
    `&oauth_callback=${encodeURIComponent(CALLBACK_URL)}`;

  window.location.href = authUrl;
}
```

**Effort:** 3 weeks total

---

### Category B: Enhanced Input Methods

#### B1. Smart Voice Parsing with NLP [P2]

**Current:** Basic regex matching

**Enhancement:** Natural language understanding
```typescript
// src/utils/voice-nlp.ts

interface ParsedVoiceCommand {
  exercise: string;
  sets?: number;
  reps?: number;
  weight?: number;
  unit?: 'lbs' | 'kg';
  rpe?: number;
  notes?: string;
}

const VOICE_PATTERNS = {
  // "I did 3 sets of 10 bench press at 135 pounds"
  narrative: /(?:i\s+)?(?:did|completed|finished)\s+(\d+)\s+sets?\s+(?:of\s+)?(\d+)\s+(.+?)\s+(?:at|with)\s+(\d+(?:\.\d+)?)\s*(lbs?|kg|pounds?|kilos?)?/i,

  // "bench press 135 for 3 sets of 10"
  exerciseFirst: /^(.+?)\s+(\d+(?:\.\d+)?)\s*(?:lbs?|kg)?\s+(?:for\s+)?(\d+)\s+sets?\s+(?:of\s+)?(\d+)/i,

  // "3 by 10 at 135 on bench"
  setsFirst: /^(\d+)\s*(?:x|by|times)\s*(\d+)\s+(?:at|@)\s*(\d+(?:\.\d+)?)\s*(?:lbs?|kg)?\s+(?:on\s+)?(.+)/i,

  // "135 bench 10 reps"
  weightFirst: /^(\d+(?:\.\d+)?)\s*(?:lbs?|kg)?\s+(.+?)\s+(\d+)\s+reps?/i,
};

export function parseVoiceCommand(transcript: string): ParsedVoiceCommand | null {
  const cleaned = transcript.toLowerCase().trim();

  for (const [name, pattern] of Object.entries(VOICE_PATTERNS)) {
    const match = cleaned.match(pattern);
    if (match) {
      return extractFromMatch(name, match);
    }
  }

  // Fallback: fuzzy exercise name matching
  return fuzzyMatch(cleaned);
}

function fuzzyMatch(text: string): ParsedVoiceCommand | null {
  // Use Fuse.js for fuzzy exercise name matching
  const exerciseNames = getExerciseNames(); // From cache
  const fuse = new Fuse(exerciseNames, { threshold: 0.4 });
  const results = fuse.search(text);

  if (results.length > 0) {
    return { exercise: results[0].item };
  }
  return null;
}
```

**Dependencies:**
```bash
pnpm add fuse.js
```

**Effort:** 2 weeks

#### B2. Clipboard Auto-Detection [P2]

**Current:** User must click "Paste" button

**Enhancement:** Auto-detect workout data in clipboard
```typescript
// src/hooks/useClipboardDetection.ts

export function useClipboardDetection() {
  const [hasWorkoutData, setHasWorkoutData] = useState(false);
  const [clipboardContent, setClipboardContent] = useState<string | null>(null);

  useEffect(() => {
    // Check clipboard on focus
    const checkClipboard = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (looksLikeWorkoutData(text)) {
          setHasWorkoutData(true);
          setClipboardContent(text);
        }
      } catch {
        // Clipboard access denied - silent fail
      }
    };

    window.addEventListener('focus', checkClipboard);
    return () => window.removeEventListener('focus', checkClipboard);
  }, []);

  return { hasWorkoutData, clipboardContent };
}

function looksLikeWorkoutData(text: string): boolean {
  const patterns = [
    /\d+\s*[x×]\s*\d+/,           // "3x10"
    /\d+\s*(?:lbs?|kg)/i,         // "135 lbs"
    /(?:bench|squat|deadlift)/i,  // Common exercises
    /(?:sets?|reps?|weight)/i,    // Workout terms
  ];

  return patterns.some(p => p.test(text));
}
```

#### B3. Barcode Scanner for Gym Equipment [P3]

**Future:** Scan gym equipment QR codes for auto-population
```typescript
// Concept - requires gym partnerships
interface GymEquipment {
  id: string;
  name: string;
  defaultExercise: string;
  weightIncrement: number;
  maxWeight: number;
}

async function scanEquipmentBarcode(): Promise<GymEquipment | null> {
  // Use device camera to scan QR code
  // Return equipment info if recognized
}
```

---

### Category C: Export Enhancements

#### C1. PDF Report Generation [P2]

**Current:** CSV/JSON only

**Enhancement:**
```typescript
// src/utils/pdf-export.ts
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export function generateWorkoutPDF(sessions: WorkoutSession[]): Blob {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.text('MuscleMap Training Report', 20, 20);

  // Date range
  doc.setFontSize(12);
  doc.text(`Period: ${formatDateRange(sessions)}`, 20, 30);

  // Summary stats
  doc.autoTable({
    startY: 40,
    head: [['Metric', 'Value']],
    body: [
      ['Total Workouts', sessions.length],
      ['Total Sets', countSets(sessions)],
      ['Total Volume', formatVolume(calculateVolume(sessions))],
      ['Most Trained Muscle', findTopMuscle(sessions)],
    ],
  });

  // Exercise breakdown
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Exercise', 'Sets', 'Best Set', 'Total Volume']],
    body: getExerciseBreakdown(sessions),
  });

  // Progress charts (as images)
  // ...

  return doc.output('blob');
}
```

**Dependencies:**
```bash
pnpm add jspdf jspdf-autotable
```

#### C2. StrongApp Migration Format [P2]

**Current:** Generic CSV

**Enhancement:** Full StrongApp-compatible export
```typescript
// src/utils/strong-export.ts

const STRONG_CSV_HEADERS = [
  'Date', 'Workout Name', 'Duration', 'Exercise Name',
  'Set Order', 'Weight', 'Weight Unit', 'Reps', 'RPE',
  'Distance', 'Distance Unit', 'Seconds', 'Notes', 'Workout Notes'
];

export function exportToStrongFormat(sessions: WorkoutSession[]): string {
  const rows = sessions.flatMap(session =>
    session.exercises.flatMap((exercise, exerciseIndex) =>
      exercise.sets.map((set, setIndex) => [
        formatDate(session.date, 'yyyy-MM-dd HH:mm:ss'),
        session.name || `Workout ${exerciseIndex + 1}`,
        formatDuration(session.duration),
        exercise.name,
        setIndex + 1,
        set.weight || '',
        set.weightUnit || 'lbs',
        set.reps || '',
        set.rpe || '',
        set.distance || '',
        set.distanceUnit || '',
        set.duration || '',
        set.notes || '',
        session.notes || '',
      ])
    )
  );

  return [STRONG_CSV_HEADERS, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
}
```

---

### Category D: UX Improvements

#### D1. Smart Entry Method Suggestion [P1]

**Current:** All 6 methods shown equally

**Enhancement:** Context-aware highlighting
```typescript
// src/hooks/useSmartEntryMethod.ts

interface EntryContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  location: 'home' | 'gym' | 'outdoor' | 'unknown';
  recentMethods: EntryMethod[];
  hasClipboardData: boolean;
  lastWorkoutWas: 'today' | 'yesterday' | 'earlier' | 'never';
  deviceCapabilities: {
    hasMicrophone: boolean;
    hasCamera: boolean;
    hasHealthKit: boolean;
  };
}

export function getSuggestedMethod(context: EntryContext): EntryMethod {
  // During gym hours with quick history → Quick Log
  if (context.timeOfDay === 'afternoon' && context.location === 'gym') {
    return 'quick';
  }

  // Has clipboard data → Paste
  if (context.hasClipboardData) {
    return 'text';
  }

  // Morning review with health kit → Sync
  if (context.timeOfDay === 'morning' && context.deviceCapabilities.hasHealthKit) {
    return 'health';
  }

  // User preference
  if (context.recentMethods.length > 0) {
    return getMostFrequent(context.recentMethods);
  }

  return 'quick'; // Default
}
```

**UI Update:**
```tsx
// Highlight suggested method
<button
  className={cn(
    'rounded-2xl p-4',
    method.id === suggestedMethod && 'ring-2 ring-yellow-400 ring-offset-2',
    method.color
  )}
>
  {method.id === suggestedMethod && (
    <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs px-2 py-0.5 rounded-full">
      Suggested
    </span>
  )}
  ...
</button>
```

#### D2. Guided First Log [P1]

**Current:** Users dropped into full interface

**Enhancement:** Step-by-step first-time flow
```tsx
// src/components/activity-log/FirstLogWizard.tsx

const WIZARD_STEPS = [
  {
    id: 'welcome',
    title: 'Log Your First Workout',
    description: 'Let\'s record what you did today. This helps us personalize your training.',
  },
  {
    id: 'method',
    title: 'How do you want to log?',
    description: 'Pick the method that works best for you.',
    highlight: 'quick', // Suggest Quick Log for first-timers
  },
  {
    id: 'exercise',
    title: 'What did you do?',
    description: 'Search for an exercise or pick from popular ones.',
    showPopular: true,
  },
  {
    id: 'details',
    title: 'How much?',
    description: 'Add your sets, reps, and weight.',
    showTips: true,
  },
  {
    id: 'complete',
    title: 'Great job!',
    description: 'Your workout has been logged. Keep it up!',
    showRewards: true,
  },
];
```

#### D3. Quick Templates [P2]

**Current:** Start from scratch each time

**Enhancement:** Save and reuse workout templates
```typescript
// Database schema
CREATE TABLE workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  exercises JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ
);

// GraphQL
type WorkoutTemplate {
  id: ID!
  name: String!
  description: String
  exercises: [TemplateExercise!]!
  useCount: Int!
  lastUsedAt: DateTime
}

input CreateTemplateInput {
  name: String!
  description: String
  exercises: [TemplateExerciseInput!]!
}

type Mutation {
  createWorkoutTemplate(input: CreateTemplateInput!): WorkoutTemplate!
  useWorkoutTemplate(templateId: ID!): WorkoutSession!
}
```

#### D4. Rest Timer Integration [P2]

**Current:** Separate from logging

**Enhancement:** Inline rest timer during active workout
```tsx
// src/components/activity-log/InlineRestTimer.tsx

export function InlineRestTimer({ exercise, onComplete }: Props) {
  const [timeLeft, setTimeLeft] = useState(exercise.restSeconds || 90);
  const [isRunning, setIsRunning] = useState(false);

  // Auto-start after logging a set
  useEffect(() => {
    if (exercise.justLoggedSet) {
      setIsRunning(true);
      haptic('medium');
    }
  }, [exercise.justLoggedSet]);

  // Haptic + sound when done
  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      haptic('success');
      playRestCompleteSound();
      setIsRunning(false);
      onComplete();
    }
  }, [timeLeft, isRunning]);

  return (
    <div className="bg-blue-600/20 rounded-xl p-4 mt-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Rest</span>
        <span className="text-2xl font-mono">{formatTime(timeLeft)}</span>
        <button onClick={() => setIsRunning(!isRunning)}>
          {isRunning ? <Pause /> : <Play />}
        </button>
      </div>
      <div className="h-1 bg-gray-700 rounded-full mt-2">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${(timeLeft / exercise.restSeconds) * 100}%` }}
        />
      </div>
    </div>
  );
}
```

---

### Category E: Data Quality

#### E1. Duplicate Detection [P1]

**Current:** Imports may create duplicates

**Enhancement:**
```typescript
// src/utils/duplicate-detection.ts

interface DuplicateCandidate {
  existing: WorkoutSession;
  imported: WorkoutSession;
  similarity: number;
  recommendation: 'skip' | 'merge' | 'keep_both';
}

export function detectDuplicates(
  existing: WorkoutSession[],
  imported: WorkoutSession[]
): DuplicateCandidate[] {
  return imported.map(imp => {
    const matches = existing
      .map(ex => ({
        existing: ex,
        imported: imp,
        similarity: calculateSimilarity(ex, imp),
      }))
      .filter(m => m.similarity > 0.7)
      .sort((a, b) => b.similarity - a.similarity);

    if (matches.length === 0) return null;

    const best = matches[0];
    return {
      ...best,
      recommendation: best.similarity > 0.95 ? 'skip' : 'merge',
    };
  }).filter(Boolean) as DuplicateCandidate[];
}

function calculateSimilarity(a: WorkoutSession, b: WorkoutSession): number {
  const dateWeight = 0.3;
  const exerciseWeight = 0.5;
  const volumeWeight = 0.2;

  const dateSim = isSameDay(a.date, b.date) ? 1 : 0;
  const exerciseSim = jaccard(
    a.exercises.map(e => e.name),
    b.exercises.map(e => e.name)
  );
  const volumeSim = 1 - Math.abs(a.totalVolume - b.totalVolume) / Math.max(a.totalVolume, b.totalVolume);

  return dateWeight * dateSim + exerciseWeight * exerciseSim + volumeWeight * volumeSim;
}
```

#### E2. Data Validation [P1]

**Current:** Minimal validation

**Enhancement:** Comprehensive input validation
```typescript
// src/schemas/workout.ts
import { z } from 'zod';

export const setSchema = z.object({
  reps: z.number().int().min(1).max(100),
  weight: z.number().min(0).max(2000).optional(),
  weightUnit: z.enum(['lbs', 'kg']).default('lbs'),
  rpe: z.number().min(1).max(10).optional(),
  duration: z.number().int().min(0).max(3600).optional(),
  distance: z.number().min(0).max(100).optional(),
  distanceUnit: z.enum(['mi', 'km', 'm']).optional(),
});

export const exerciseLogSchema = z.object({
  exerciseId: z.string().uuid(),
  exerciseName: z.string().min(1).max(100),
  sets: z.array(setSchema).min(1).max(50),
  notes: z.string().max(500).optional(),
});

export const workoutImportSchema = z.object({
  date: z.coerce.date(),
  name: z.string().max(100).optional(),
  duration: z.number().int().min(0).max(28800).optional(), // Max 8 hours
  exercises: z.array(exerciseLogSchema).min(1).max(100),
  notes: z.string().max(1000).optional(),
});
```

---

## Implementation Timeline

### Sprint 1 (Weeks 1-2): Core Fixes
- [ ] Screenshot OCR with Tesseract.js
- [ ] Input validation with Zod
- [ ] Duplicate detection

### Sprint 2 (Weeks 3-4): Health Integration
- [ ] Apple Health OAuth (React Native)
- [ ] Google Fit OAuth (Web)
- [ ] Garmin Connect OAuth

### Sprint 3 (Weeks 5-6): Export Enhancement
- [ ] PDF report generation
- [ ] StrongApp export format
- [ ] Excel export with formatting

### Sprint 4 (Weeks 7-8): UX Polish
- [ ] Smart entry method suggestion
- [ ] Guided first log wizard
- [ ] Inline rest timer

### Sprint 5 (Weeks 9-10): Advanced Features
- [ ] Smart voice parsing with NLP
- [ ] Clipboard auto-detection
- [ ] Quick templates

---

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Workout log completion | 65% | 85% | Started vs completed |
| Time to log | ~90s | ~45s | Median time |
| Voice success rate | 40% | 80% | Parsed correctly |
| Import success rate | 70% | 95% | Files imported |
| User satisfaction | 3.5/5 | 4.5/5 | In-app survey |

---

## Technical Dependencies

### New Packages
```json
{
  "tesseract.js": "^5.0.0",
  "fuse.js": "^7.0.0",
  "jspdf": "^2.5.0",
  "jspdf-autotable": "^3.8.0",
  "react-native-health": "^1.18.0"
}
```

### API Integrations
- Google Fit API (OAuth 2.0)
- Garmin Connect IQ (OAuth 1.0a)
- Apple HealthKit (iOS native)

### Infrastructure
- No new infrastructure needed
- OCR runs client-side (Tesseract.js)
- PDF generation runs client-side

---

*Document maintained by the MuscleMap development team.*
