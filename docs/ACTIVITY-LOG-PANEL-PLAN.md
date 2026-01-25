# Activity Log Panel - Implementation Plan

**Version:** 1.0
**Status:** Planning
**Last Updated:** 2025-01-25

---

## Executive Summary

The Activity Log Panel is a new data entry system that complements the existing Training Panel (exercise prescription system). While Training provides AI-generated workout recommendations, the Activity Log Panel is focused on **capturing workout data from any source** - imports, wearables, manual entry, voice, screenshots, and more.

The design philosophy: **Appearance simplicity that masks great functionality and high performance.**

---

## 1. Competitive Analysis & Market Research

### What Top Competitors Do Well

| App | Strength | What to Adopt |
|-----|----------|---------------|
| **Strong** | Fastest logging (3-5 taps per set), auto rest timer, plate calculator | Speed-first UX, minimal taps to log |
| **Hevy** | Social sharing, heat map visualization, Wear OS | Muscle heat map, share-ready summaries |
| **JEFIT** | 1,400+ exercises, CSV export, community routines | Deep exercise database, data portability |
| **Fitbod** | AI weight recommendations, recovery-aware | Smart suggestions based on history |
| **Fitness Gen** | Screenshot import, extracts sets/reps from images | OCR-like workout import |
| **Motra** | Auto-recognizes 470+ exercises from watch motion | Wearable exercise detection |
| **MyFitnessPal** | Voice logging, barcode scanning | Multi-modal input methods |

### Feature Gaps in Current Market

1. **No unified import hub** - Most apps support 1-2 sources, not all
2. **Screenshot import is rare** - Only Fitness Gen does it well
3. **Voice input is basic** - No context-aware voice logging
4. **No visual exercise selection** - Text lists dominate
5. **Poor offline handling** - Most require connectivity

### MuscleMap Competitive Advantages to Leverage

- 3D muscle visualization (show activation as you log)
- RPG gamification (XP/credits for logging)
- Existing wearable infrastructure (Apple Health, Fitbit, Garmin, Strava, Google Fit)
- Session persistence (crash recovery)
- TU (Training Units) calculation system

---

## 2. Core Design Principles

### 2.1 Mobile-First, Touch-First

- **Minimum touch target:** 48x48px (Apple HIG)
- **One-thumb operation:** All primary actions reachable with thumb
- **Swipe gestures:** Left/right for actions, up for quick save
- **Haptic feedback:** Confirm every action
- **Bottom sheets:** Modals slide up from bottom, not center popups

### 2.2 Visual-First

- **Show, don't tell:** Use images/icons over text where possible
- **Muscle visualization:** 3D model shows what you're logging
- **Color coding:** Green = complete, yellow = partial, red = skipped
- **Progress indicators:** Always show where you are in the flow

### 2.3 Progressive Disclosure

- **Simple surface:** Basic logging visible by default
- **Power features hidden:** Advanced options behind "More" or swipe
- **Contextual help:** Tooltips appear on first use only
- **Learn as you go:** Don't frontload all options

### 2.4 Speed Obsession

- **Target:** Log a set in 3 taps or less
- **Target:** Complete a workout log in under 60 seconds
- **Target:** Import external data in under 10 seconds
- **Offline-first:** Queue actions, sync when connected

---

## 3. Data Entry Methods (The "10 Ways")

### 3.1 Quick Manual Entry (Default)

**The 3-Tap Flow:**
```
[Select Exercise] → [Enter Weight/Reps] → [Save]
```

**Features:**
- Smart exercise search (fuzzy matching, recent first)
- Auto-populate from last session
- Tap +/- for weight/reps (no keyboard needed)
- Swipe up to save and advance
- Voice shortcut: "225 for 8"

**Components Needed:**
- `ExerciseQuickPicker` - Bottom sheet with search
- `SetEntryCard` - Inline weight/reps/RPE entry
- `QuickInputKeypad` - Custom numeric keypad optimized for gym use

### 3.2 Voice Input

**Voice Commands:**
- "Log bench press, 225 for 8"
- "Add 3 sets of squats at 315"
- "Same as last time" (repeats previous)
- "Skip rest" / "Start rest"
- "Finish workout"

**Implementation:**
- Web Speech API for recognition
- Local command parsing (no server round-trip)
- Visual confirmation before commit
- Fallback to manual if recognition fails

**Components Needed:**
- `VoiceInputButton` - Floating mic button
- `VoiceCommandParser` - Parse natural language
- `VoiceConfirmationModal` - Show parsed result for approval

### 3.3 Screenshot/Image Import

**Flow:**
```
[Take/Upload Screenshot] → [AI Extracts Data] → [Review & Edit] → [Save]
```

**What It Extracts:**
- Exercise names
- Sets, reps, weight
- Rest periods
- Workout structure (supersets, circuits)

**Implementation:**
- Accept images via camera, gallery, clipboard paste
- Send to backend for OCR + AI parsing
- Return structured workout data
- User reviews/corrects in editable form

**Components Needed:**
- `ScreenshotImporter` - Camera/gallery/paste interface
- `ImageToWorkoutService` - Backend AI processing
- `ImportReviewEditor` - Edit extracted data

### 3.4 Copy/Paste Text Import

**Flow:**
```
[Paste Workout Text] → [Parse Structure] → [Review] → [Save]
```

**Formats Supported:**
- Free-form text ("Bench 3x8 @ 185")
- Structured lists
- Reddit/forum formatted workouts
- Spreadsheet tab-separated values

**Implementation:**
- Regex patterns for common formats
- AI fallback for complex parsing
- Instant preview as you paste

**Components Needed:**
- `TextImportModal` - Paste area with format hints
- `WorkoutTextParser` - Parse various formats
- `ParsePreview` - Show parsed structure

### 3.5 CSV/File Import

**Supported Formats:**
- CSV (Strong, JEFIT, Hevy export formats)
- JSON (MuscleMap native format)
- XML (legacy fitness app exports)

**Flow:**
```
[Select File] → [Auto-Detect Format] → [Map Fields] → [Import]
```

**Features:**
- Drag-and-drop file upload
- Format auto-detection
- Column mapping UI for unknowns
- Duplicate detection (skip already-imported)
- Progress bar for large imports

**Components Needed:**
- `FileImportDropzone` - Drag/drop area
- `FormatDetector` - Identify file format
- `FieldMapper` - Map columns to MuscleMap fields
- `ImportProgressTracker` - Show import progress

### 3.6 Health Platform Sync

**Supported Platforms:**
- Apple Health (via native bridge or export file)
- Google Fit / Health Connect
- Fitbit
- Garmin Connect
- Strava
- Whoop
- Oura

**Sync Types:**
- **Pull:** Import workouts from platforms
- **Push:** Export MuscleMap workouts to platforms
- **Auto-sync:** Background sync when app opens

**Flow:**
```
[Connect Account] → [Select Data Types] → [Set Sync Direction] → [Confirm]
```

**Components Needed:**
- `HealthPlatformConnector` - OAuth flow for each platform
- `SyncSettingsPanel` - Configure what syncs where
- `SyncHistoryLog` - Show sync activity
- `ConflictResolver` - Handle duplicate workouts

### 3.7 Wearable Live Capture

**Features:**
- Apple Watch companion app
- Wear OS companion app
- Auto-detect exercise from motion (future)
- Real-time rep counting (future)

**MVP Scope:**
- Apple Watch quick-log widget
- Wear OS tile for set logging
- Push workout to watch, log on watch

**Components Needed:**
- Native watch apps (separate projects)
- `WearableSync` - Real-time data sync
- `WatchWorkoutReceiver` - Process watch data

### 3.8 Visual/Graphical Selection

**Muscle Map Selection:**
```
[Tap Muscle on 3D Body] → [Show Exercises for Muscle] → [Select] → [Log]
```

**Features:**
- Interactive 3D muscle model
- Tap a muscle to filter exercises
- See activation intensity as you log
- Visual workout builder

**Components Needed:**
- `InteractiveMuscleSelector` - Tappable 3D model
- `MuscleExerciseDrawer` - Exercises for selected muscle
- Extend existing `MuscleVisualization` component

### 3.9 Template/Routine Selection

**Flow:**
```
[Pick Saved Routine] → [Auto-Populate Exercises] → [Log Each Set] → [Save]
```

**Features:**
- Personal templates
- Community templates (browse/fork)
- AI-suggested routines based on history
- Quick-start popular routines

**Components Needed:**
- `TemplateGallery` - Browse/search templates
- `TemplatePreview` - See routine before starting
- `RoutineToWorkout` - Convert template to active session
- Extend existing `workout-templates.service.ts`

### 3.10 Multiple Choice / Quick Pick

**For Common Scenarios:**
- "Which workout did you do today?"
- "Same as [recent workout]?"
- "Quick log: Push / Pull / Legs / Upper / Lower?"

**Features:**
- One-tap to log a typical workout
- Learns your patterns
- Suggests based on time/day

**Components Needed:**
- `QuickPickPanel` - Large buttons for common choices
- `PatternLearner` - ML service for suggestions
- `WorkoutCloner` - Duplicate past workout

---

## 4. Step-by-Step User Flow

### 4.1 Entry Points

**From Dashboard:**
```
[ + Log Activity ] button → Activity Log Panel
```

**From Training Panel:**
```
[ Log Manually ] button → Activity Log Panel (pre-filled with prescription)
```

**From Anywhere:**
```
Floating Action Button → Quick Log Sheet
```

### 4.2 Main Activity Log Panel Layout

```
┌─────────────────────────────────────────┐
│ ← Activity Log                    [?]   │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  🏋️ What did you do today?      │    │
│  │                                 │    │
│  │  [🎤 Voice] [📸 Photo] [📋 Paste]│    │
│  │                                 │    │
│  │  [📁 Import] [⌚ Sync] [🔍 Search]│    │
│  └─────────────────────────────────┘    │
│                                         │
│  ── Quick Start ──────────────────      │
│  [ Same as Monday ]  [ Chest Day ]      │
│  [ Yesterday's Log ] [ New Workout ]    │
│                                         │
│  ── Recent ───────────────────────      │
│  ┌─────────────────────────────────┐    │
│  │ Mon - Push Day     💪 45 min    │ ←  │
│  │ 8 exercises, 24 sets            │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ Sat - Pull Day     💪 52 min    │ ←  │
│  │ 7 exercises, 21 sets            │    │
│  └─────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│ [────────────────────────────────────]  │
│               [ + Add Set ]             │
└─────────────────────────────────────────┘
```

### 4.3 Quick Log Flow (3-Tap Target)

**Step 1: Select Exercise**
```
┌─────────────────────────────────────────┐
│ Search exercises...              [🎤]   │
├─────────────────────────────────────────┤
│ RECENT                                  │
│ ┌───────┐ ┌───────┐ ┌───────┐          │
│ │ Bench │ │ Squat │ │ Dead  │          │
│ │ Press │ │       │ │ lift  │          │
│ └───────┘ └───────┘ └───────┘          │
│                                         │
│ OR TAP MUSCLE                           │
│      ┌─────────┐                        │
│      │  [3D]   │                        │
│      │  Body   │                        │
│      │  Model  │                        │
│      └─────────┘                        │
│                                         │
│ ALL EXERCISES                           │
│ Bench Press                        →    │
│ Incline Bench Press                →    │
│ ...                                     │
└─────────────────────────────────────────┘
```

**Step 2: Enter Set Data**
```
┌─────────────────────────────────────────┐
│ ← Bench Press                           │
├─────────────────────────────────────────┤
│                                         │
│  Last time: 185 lbs × 8 reps            │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Weight        185  lbs         │    │
│  │  [-5] [━━━━━━━━━━━] [+5]        │    │
│  │                                 │    │
│  │  Reps           8               │    │
│  │  [-1] [━━━━━━━━━━━] [+1]        │    │
│  │                                 │    │
│  │  RPE (optional)  ○○○○○○○○○○    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [ More Options ▼ ]                     │
│   └─ RIR, Notes, Tags (warmup/drop)     │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │      [ Save & Add Another ]     │    │
│  │                                 │    │
│  │      [ Save & Finish ]          │    │
│  └─────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│  Sets logged: ①②③ ○○ (3 of 5)          │
└─────────────────────────────────────────┘
```

**Step 3: Workout Summary**
```
┌─────────────────────────────────────────┐
│ ← Workout Summary           [Share 📤]  │
├─────────────────────────────────────────┤
│                                         │
│  🎉 Great workout!                      │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Duration      45 min           │    │
│  │  Exercises     8                │    │
│  │  Total Sets    24               │    │
│  │  Volume        12,450 lbs       │    │
│  │  TU Earned     156 🔥           │    │
│  │  XP Earned     +320             │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ── Muscles Worked ──────────────       │
│      ┌─────────┐                        │
│      │  [3D]   │ Chest: 85%             │
│      │  Heat   │ Triceps: 60%           │
│      │  Map    │ Shoulders: 45%         │
│      └─────────┘                        │
│                                         │
│  ── PRs Achieved 🏆 ─────────────       │
│  • Bench Press: New 1RM (225 lbs)       │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │        [ Save Workout ]         │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

---

## 5. Technical Architecture

### 5.1 New Database Tables

```sql
-- Activity log entries (unified format from all sources)
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL, -- 'manual', 'voice', 'screenshot', 'import_csv', 'apple_health', etc.
  source_id VARCHAR(255), -- External ID for deduplication
  activity_type VARCHAR(50) NOT NULL, -- 'strength', 'cardio', 'flexibility', etc.
  name VARCHAR(255),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  notes TEXT,
  raw_data JSONB, -- Original imported data
  processed_data JSONB, -- Normalized workout structure
  is_processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user_date ON activity_logs(user_id, started_at DESC);
CREATE UNIQUE INDEX idx_activity_logs_source_dedup ON activity_logs(user_id, source, source_id) WHERE source_id IS NOT NULL;

-- Voice command history (for learning)
CREATE TABLE voice_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  parsed_intent JSONB,
  was_corrected BOOLEAN DEFAULT FALSE,
  corrected_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Import jobs (track bulk imports)
CREATE TABLE import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  total_records INTEGER,
  imported_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  errors JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2 New GraphQL Schema

```graphql
# Input types
input QuickLogSetInput {
  exerciseId: ID!
  weight: Float
  reps: Int!
  rpe: Float
  rir: Int
  notes: String
  tag: SetTag
}

input VoiceLogInput {
  rawText: String!
  audioUrl: String
}

input ScreenshotImportInput {
  imageUrl: String!
  imageBase64: String
}

input FileImportInput {
  fileUrl: String!
  fileName: String!
  fileType: String!
}

input ActivityLogInput {
  source: ActivitySource!
  activityType: ActivityType!
  name: String
  startedAt: DateTime!
  endedAt: DateTime
  exercises: [WorkoutExerciseInput!]
  notes: String
}

# Enums
enum ActivitySource {
  MANUAL
  VOICE
  SCREENSHOT
  CLIPBOARD
  CSV_IMPORT
  JSON_IMPORT
  APPLE_HEALTH
  GOOGLE_FIT
  FITBIT
  GARMIN
  STRAVA
  WHOOP
  OURA
  WEARABLE
}

enum ActivityType {
  STRENGTH
  CARDIO
  HIIT
  FLEXIBILITY
  SPORTS
  OTHER
}

# Response types
type VoiceParseResult {
  success: Boolean!
  parsedExercise: String
  parsedWeight: Float
  parsedReps: Int
  parsedSets: Int
  confidence: Float!
  needsConfirmation: Boolean!
  alternatives: [VoiceParseResult!]
}

type ScreenshotParseResult {
  success: Boolean!
  exercises: [ParsedExercise!]
  confidence: Float!
  rawText: String
  errors: [String!]
}

type ParsedExercise {
  name: String!
  matchedExerciseId: ID
  sets: Int
  reps: Int
  weight: Float
  confidence: Float!
}

type ImportJobStatus {
  id: ID!
  status: String!
  progress: Float!
  totalRecords: Int
  importedCount: Int!
  skippedCount: Int!
  errorCount: Int!
  errors: [ImportError!]
}

type ImportError {
  row: Int
  field: String
  message: String!
}

# Queries
extend type Query {
  # Activity log queries
  activityLogs(
    limit: Int = 20
    cursor: String
    source: ActivitySource
    activityType: ActivityType
    startDate: DateTime
    endDate: DateTime
  ): ActivityLogConnection!

  activityLog(id: ID!): ActivityLog

  # Import job queries
  importJob(id: ID!): ImportJobStatus
  importJobs(limit: Int = 10): [ImportJobStatus!]!

  # Quick pick suggestions
  suggestedWorkouts: [SuggestedWorkout!]!
  recentWorkoutPatterns: [WorkoutPattern!]!
}

# Mutations
extend type Mutation {
  # Quick logging
  quickLogSet(input: QuickLogSetInput!): LoggedSet!
  quickLogWorkout(input: ActivityLogInput!): Workout!

  # Voice logging
  parseVoiceCommand(input: VoiceLogInput!): VoiceParseResult!
  confirmVoiceLog(parsedData: QuickLogSetInput!): LoggedSet!

  # Screenshot/image import
  parseScreenshot(input: ScreenshotImportInput!): ScreenshotParseResult!
  confirmScreenshotImport(exercises: [QuickLogSetInput!]!): Workout!

  # File import
  startFileImport(input: FileImportInput!): ImportJobStatus!
  cancelImport(jobId: ID!): Boolean!

  # Health platform sync
  syncHealthPlatform(platform: ActivitySource!): SyncResult!
  disconnectHealthPlatform(platform: ActivitySource!): Boolean!

  # Clone/duplicate
  cloneWorkout(workoutId: ID!, date: DateTime!): Workout!
}
```

### 5.3 New Frontend Components

```
src/components/activity-log/
├── ActivityLogPanel.tsx           # Main panel container
├── QuickEntryMethods.tsx          # The 6 input method buttons
├── QuickLogSheet.tsx              # Bottom sheet for fast logging
├── ExerciseQuickPicker.tsx        # Exercise search with recent
├── SetEntryCard.tsx               # Weight/reps/RPE entry
├── VoiceInputButton.tsx           # Mic button with animation
├── VoiceConfirmation.tsx          # Show parsed voice result
├── ScreenshotImporter.tsx         # Camera/paste/upload
├── ImportReviewEditor.tsx         # Edit parsed screenshot data
├── TextImportModal.tsx            # Paste workout text
├── FileImportDropzone.tsx         # Drag-drop file upload
├── FieldMapper.tsx                # Map CSV columns
├── ImportProgressBar.tsx          # Show import progress
├── HealthPlatformConnector.tsx    # OAuth connection UI
├── SyncSettingsPanel.tsx          # Configure sync options
├── QuickPickPanel.tsx             # Big buttons for common workouts
├── WorkoutSummaryCard.tsx         # Post-workout summary
├── InteractiveMuscleSelector.tsx  # Tap 3D body to select muscle
└── hooks/
    ├── useVoiceRecognition.ts     # Web Speech API wrapper
    ├── useClipboardPaste.ts       # Clipboard event handler
    ├── useFileImport.ts           # File import state
    └── useActivityLog.ts          # Main state management
```

### 5.4 New Backend Services

```
apps/api/src/services/
├── activity-log.service.ts        # Core activity logging
├── voice-parser.service.ts        # Parse voice commands
├── screenshot-parser.service.ts   # OCR + AI extraction
├── workout-text-parser.service.ts # Parse text formats
├── csv-import.service.ts          # CSV file import
├── field-mapper.service.ts        # Auto-map CSV columns
├── workout-cloner.service.ts      # Clone past workouts
└── pattern-suggester.service.ts   # ML-based suggestions
```

### 5.5 API Routes

```
apps/api/src/http/routes/
├── activity-log.ts                # Activity log CRUD
├── voice-parse.ts                 # Voice command parsing
├── screenshot-import.ts           # Image upload + parse
├── file-import.ts                 # CSV/JSON file import
└── health-sync.ts                 # Health platform webhooks
```

---

## 6. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Basic manual logging with improved UX

**Deliverables:**
- [ ] Database migrations for `activity_logs` table
- [ ] GraphQL schema additions
- [ ] `ActivityLogPanel` main container
- [ ] `ExerciseQuickPicker` with search and recent
- [ ] `SetEntryCard` with +/- buttons
- [ ] `QuickLogSheet` bottom sheet
- [ ] Integration with existing workout session system
- [ ] Basic summary view after logging

**Success Criteria:**
- Log a set in 3 taps
- Show recent exercises
- Calculate TU correctly
- Award credits for logging

### Phase 2: Voice & Clipboard (Week 3-4)

**Goal:** Hands-free and quick-paste options

**Deliverables:**
- [ ] `VoiceInputButton` with Web Speech API
- [ ] `voice-parser.service.ts` command parsing
- [ ] `VoiceConfirmation` modal
- [ ] Clipboard paste handling
- [ ] `TextImportModal` for pasted text
- [ ] `workout-text-parser.service.ts`
- [ ] Voice command training data collection

**Success Criteria:**
- "225 for 8" correctly parses to weight/reps
- Paste Reddit-style workout and parse
- <5% error rate on common commands

### Phase 3: Import Hub (Week 5-6)

**Goal:** Import from files and screenshots

**Deliverables:**
- [ ] `FileImportDropzone` component
- [ ] `csv-import.service.ts` with format detection
- [ ] `FieldMapper` for unknown formats
- [ ] Strong/JEFIT/Hevy format support
- [ ] `ScreenshotImporter` component
- [ ] `screenshot-parser.service.ts` with OCR
- [ ] `ImportReviewEditor` for corrections
- [ ] `ImportProgressBar` component
- [ ] Import job tracking in database

**Success Criteria:**
- Import 1000+ workout CSV in <30 seconds
- Extract exercises from screenshot with >80% accuracy
- Detect and skip duplicates

### Phase 4: Health Platform Sync (Week 7-8)

**Goal:** Two-way sync with major platforms

**Deliverables:**
- [ ] `HealthPlatformConnector` OAuth flows
- [ ] Apple Health file import (XML export)
- [ ] Google Fit REST API integration
- [ ] Fitbit OAuth + API
- [ ] Garmin Connect integration
- [ ] `SyncSettingsPanel` configuration
- [ ] Background sync job
- [ ] Conflict resolution logic

**Success Criteria:**
- Connect Apple Health in <30 seconds
- Auto-import last 30 days on connect
- Bidirectional sync for configured platforms

### Phase 5: Smart Features (Week 9-10)

**Goal:** Pattern learning and suggestions

**Deliverables:**
- [ ] `QuickPickPanel` with learned patterns
- [ ] `pattern-suggester.service.ts`
- [ ] "Same as [day]" one-tap logging
- [ ] `InteractiveMuscleSelector` on 3D model
- [ ] Workout cloning feature
- [ ] Time-of-day suggestions
- [ ] Weekly routine auto-detection

**Success Criteria:**
- Suggest correct workout type >70% of time
- One-tap to log "same as Monday"
- Tap muscle → see exercises

### Phase 6: Polish & Optimization (Week 11-12)

**Goal:** Performance, accessibility, edge cases

**Deliverables:**
- [ ] Offline queue for logging
- [ ] Optimistic UI updates
- [ ] Skeleton loading states
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Error recovery flows
- [ ] Analytics integration
- [ ] Performance optimization (<100ms interactions)
- [ ] iOS Lockdown Mode testing

**Success Criteria:**
- Works offline, syncs when online
- Screen reader compatible
- No iOS Lockdown Mode blank screens
- <100ms tap-to-feedback

---

## 7. UX Details & Micro-Interactions

### 7.1 Haptic Feedback Map

| Action | Haptic | iOS | Android |
|--------|--------|-----|---------|
| Select exercise | Light | impact light | 1ms vibrate |
| Log set | Medium | impact medium | 10ms vibrate |
| Complete workout | Heavy | notification success | 50ms pattern |
| Error | Error | notification error | 100ms pattern |
| +/- buttons | Selection | selection changed | 1ms vibrate |

### 7.2 Animation Guidelines

- **Entry:** Elements slide up from bottom (200ms ease-out)
- **Exit:** Elements slide down (150ms ease-in)
- **Selection:** Scale 1.0 → 0.95 → 1.0 (100ms)
- **Success:** Checkmark draws in (300ms)
- **Loading:** Skeleton shimmer (infinite)

### 7.3 Error States

- **Empty search:** "No exercises found. Try a different term or [add custom exercise]"
- **Voice fail:** "Didn't catch that. Try again or [type instead]"
- **Import fail:** "Could not parse row 42. [Show details] [Skip and continue]"
- **Sync fail:** "Connection lost. Changes saved locally. [Retry]"

### 7.4 Accessibility Requirements

- All interactive elements have aria-labels
- Focus management for modal flows
- Color contrast ratio ≥ 4.5:1
- Touch targets ≥ 48x48px
- Voice input has visual alternative
- Motion respects prefers-reduced-motion

---

## 8. Risk Assessment & Mitigations

### 8.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Voice recognition accuracy | Medium | Medium | Confirmation step, learning from corrections |
| Screenshot OCR quality | High | Medium | Allow manual edits, show confidence scores |
| Health platform API changes | Medium | High | Abstract behind adapter pattern, monitor deprecations |
| Large import performance | Medium | Medium | Background jobs, chunked processing |
| Offline sync conflicts | Medium | Medium | Last-write-wins with conflict UI |

### 8.2 UX Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Too many options overwhelm users | High | High | Progressive disclosure, smart defaults |
| Voice misinterpretation frustration | Medium | Medium | Always show confirmation, easy correction |
| Import data loss | Low | High | Preview before commit, undo capability |
| Learning curve | Medium | Medium | Guided onboarding, contextual tips |

### 8.3 Assumptions to Validate

1. **Users want multiple input methods** - Survey existing users
2. **Voice logging in gym is practical** - User testing in real gyms
3. **Screenshot import is desired** - Check competitor adoption
4. **Pattern suggestions are accurate** - A/B test recommendation quality
5. **3-tap logging is achievable** - Prototype and time-test

---

## 9. Success Metrics

### 9.1 Adoption Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Activity Log Panel usage | 50% of active users | Weekly panel visits |
| Avg sets logged per session | +20% vs current | Sets/session |
| Time to log workout | <60 seconds | Timer from start to save |
| Import feature usage | 25% of new users | Imports within first week |
| Voice input usage | 10% of logging events | Voice logs / total logs |

### 9.2 Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Voice parse accuracy | >90% | Correct parses / total |
| Screenshot extract accuracy | >80% | Correct extracts / total |
| Import success rate | >95% | Successful imports / total |
| Sync reliability | >99% | Successful syncs / total |
| Error rate | <1% | Errors / total actions |

### 9.3 Engagement Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Logging streak retention | +15% | 7-day streak completion |
| Return rate after logging | >80% | Return within 48 hours |
| Feature discovery | 60% use 2+ methods | Distinct input methods used |

---

## 10. Open Questions

1. **Screenshot AI provider** - Use local ML or cloud API (OpenAI Vision, Google Cloud Vision)?
2. **Voice recognition** - Web Speech API sufficient or need premium service?
3. **Apple Health native** - Require React Native bridge or accept file export workflow?
4. **Wearable apps** - Phase in native watch apps or defer to platform health sync?
5. **Import history limit** - How far back to import (30 days? 1 year? All time)?
6. **Data portability** - Should we support export to competitor formats?
7. **Offline storage limit** - How many workouts to queue offline?

---

## 11. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-25 | Claude | Initial plan |

---

## 12. Review: Mistakes, Assumptions & Adjustments

### 12.1 Corrections Based on Codebase Review

**Mistake 1: Duplicating Existing Infrastructure**
The plan initially proposed creating new tables and services that already exist:
- ✅ **Already exists:** `health-import.service.ts` with Apple Health, Google Fit, Strava, Garmin, Fitbit support
- ✅ **Already exists:** `imported_activities` table with deduplication
- ✅ **Already exists:** `wearable_connections` and `wearable_data` tables
- ✅ **Already exists:** Multi-part file upload infrastructure (`exercise-images` route)
- ✅ **Already exists:** Clipboard paste handling in `BugReportForm`

**Adjustment:** Extend existing services instead of creating new ones. The `activity_logs` table should integrate with existing `imported_activities` and `workouts` tables rather than duplicate them.

**Mistake 2: Underestimating Existing Components**
Several components exist that can be reused:
- `RealtimeSetLogger` - Already has weight/reps/RPE entry
- `BottomSheet` - Already mobile-optimized
- `ExerciseSubstitutionPicker` - Already has exercise search/filter
- `QuickLogModal` (nutrition) - Similar pattern for quick entry

**Adjustment:** Phase 1 should focus on composing existing components rather than building from scratch.

**Mistake 3: Proposing REST Routes**
The plan included REST routes (`activity-log.ts`, `voice-parse.ts`, etc.), but CLAUDE.md explicitly states:
> "ALL new features MUST use GraphQL. No exceptions."

**Adjustment:** All data operations go through GraphQL mutations/queries. Only file upload (multipart) uses REST.

### 12.2 Assumptions to Validate

| Assumption | Risk | Validation Method |
|------------|------|-------------------|
| Users want voice logging in the gym | Medium | Survey + gym user testing |
| Screenshot OCR is accurate enough | High | Test with 100 real workout screenshots |
| 3-tap logging is achievable | Medium | Build prototype, time 20 users |
| Web Speech API works in all browsers | Low | Test Chrome, Safari, Firefox mobile |
| Existing wearable infrastructure is sufficient | Low | Review health-import.service.ts coverage |

### 12.3 Scope Reduction Recommendations

**Defer to Later Phases:**
1. **Wearable live capture** - Native watch apps are a separate project
2. **Pattern learning ML** - Start with simple heuristics (same day of week)
3. **Two-way sync** - Start with import only, export later
4. **Screenshot AI** - Start with text paste, add image later

**Simplify MVP:**
1. Focus on manual + voice + paste for Phase 1-2
2. Use existing health import service for Phase 3-4
3. Defer ML-based suggestions to Phase 5+

### 12.4 iOS Lockdown Mode Considerations

Per CLAUDE.md, the app must work with iOS Lockdown Mode + Brave:
- Use `SafeMotion` components instead of `motion.*`
- Add `style={{ opacity: 1 }}` fallbacks
- Provide static fallbacks for all animations
- Test on restrictive environments before shipping

---

## 13. Revised Architecture (Post-Review)

### 13.1 Table Strategy (Minimized)

Instead of 3 new tables, use **1 new table + extend existing**:

```sql
-- NEW: Voice command history (for learning)
CREATE TABLE voice_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  parsed_intent JSONB,
  was_corrected BOOLEAN DEFAULT FALSE,
  corrected_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXTEND: imported_activities (add source column values)
-- Already supports: apple_health, google_fit, strava, garmin, fitbit
-- Add: 'voice', 'screenshot', 'clipboard', 'csv_import'

-- REUSE: workouts table for final logged workouts
-- REUSE: workout_sets for individual sets
-- REUSE: active_workout_sessions for crash recovery
```

### 13.2 Service Strategy (Extend, Don't Duplicate)

```
EXTEND existing:
├── health-import.service.ts      # Add voice, screenshot, clipboard sources
├── workout-templates.service.ts  # Add clone/duplicate feature
└── image-processing.service.ts   # Reuse for screenshot upload

NEW services (minimal):
├── voice-parser.service.ts       # Parse "225 for 8" patterns
├── workout-text-parser.service.ts # Parse pasted workout text
└── screenshot-parser.service.ts  # OCR + exercise matching
```

### 13.3 Component Strategy (Compose, Don't Recreate)

```
REUSE existing:
├── RealtimeSetLogger.tsx         # Already has set entry UI
├── BottomSheet.tsx               # Already mobile-optimized
├── ExerciseSubstitutionPicker.tsx # Already has exercise search
├── FloatingRestTimer.tsx         # Already exists
├── WorkoutComplete modal         # Already shows summary
└── RPESelector, RIRSelector      # Already exist

NEW components (compose existing):
├── ActivityLogPanel.tsx          # New page, composes existing
├── QuickEntryMethods.tsx         # 6 input method buttons
├── VoiceInputButton.tsx          # Mic button + Web Speech API
├── VoiceConfirmation.tsx         # Parsed result display
├── TextImportModal.tsx           # Paste area (reuse BottomSheet)
├── FileImportDropzone.tsx        # Drag-drop (copy BugReportForm pattern)
└── HealthSyncStatus.tsx          # Show sync state
```

---

## 14. Final Prioritized MVP Scope

### Phase 1A: Core Manual Logging (Week 1)
- [ ] New `/log` route with `ActivityLogPanel`
- [ ] Compose existing `RealtimeSetLogger` in new context
- [ ] "Recent exercises" quick-pick (query workout_sets)
- [ ] Summary view using existing workout complete pattern

### Phase 1B: Voice Input (Week 2)
- [ ] `VoiceInputButton` with Web Speech API
- [ ] Simple regex parser for "225 for 8" patterns
- [ ] Confirmation modal before save
- [ ] `voice_commands` table for learning

### Phase 2: Text & Clipboard (Week 3-4)
- [ ] `TextImportModal` bottom sheet
- [ ] Paste detection and parsing
- [ ] Support "Bench 3x8 @ 185" format
- [ ] Preview → Edit → Save flow

### Phase 3: File & Health Sync (Week 5-6)
- [ ] File upload via existing infrastructure
- [ ] CSV parser for Strong/JEFIT formats
- [ ] Extend `healthImportService` for UI
- [ ] Show connected platforms status

### Phase 4: Smart Suggestions (Week 7-8)
- [ ] "Same as Monday" quick-pick
- [ ] Day-of-week pattern detection
- [ ] Clone past workout feature

### Phase 5: Polish (Week 9-10)
- [ ] Offline queue (IndexedDB)
- [ ] iOS Lockdown Mode testing
- [ ] Accessibility audit
- [ ] Performance optimization

---

## 15. Next Steps

1. **Validate Assumptions**: Survey 10-20 users on preferred input methods
2. **Technical Spike**: Build voice parser prototype, test in gym environment
3. **Review**: Get stakeholder sign-off on this revised plan
4. **Estimate**: Break Phase 1A into 1-2 day tasks
5. **Kickoff**: Begin Phase 1A implementation

---

## Appendix A: Competitive Research Sources

- [Setgraph: Best Workout Tracking Apps](https://setgraph.app/ai-blog/best-workout-tracking-apps) - Comparison of Strong, Hevy, JEFIT
- [Just12Reps: Best Weightlifting Apps 2025](https://just12reps.com/best-weightlifting-apps-of-2025-compare-strong-fitbod-hevy-jefit-just12reps/) - Feature comparison
- [Stormotion: Fitness App UI Design](https://stormotion.io/blog/fitness-app-ux/) - UX best practices
- [Consagous: Voice Recognition in Fitness Apps](https://www.consagous.co/blog/how-to-use-voice-recognition-to-improve-your-fitness-app-functionality) - Voice integration patterns
- [Fitness Gen](https://fitnessgen.app) - Screenshot import reference implementation
- [Zapier: Best Fitness Apps 2025](https://zapier.com/blog/best-fitness-tracking-apps/) - Market overview

