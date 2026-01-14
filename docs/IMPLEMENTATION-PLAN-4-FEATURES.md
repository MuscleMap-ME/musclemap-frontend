# Implementation Plan: 4 Priority Features

**Created:** January 14, 2026
**Completed:** January 14, 2026
**Features:** Career Readiness Frontend, Achievement Verification, Workout Templates, Progressive Overload

---

## Executive Summary

This plan covers implementation of 4 high-priority features that significantly enhance MuscleMap's value proposition.

**ALL FEATURES IMPLEMENTED**

| # | Feature | Status | Files Created/Modified |
|---|---------|--------|------------------------|
| 1 | Career Readiness Frontend | ✅ COMPLETE | `src/pages/CareerReadiness.jsx`, routes in `App.jsx` |
| 2 | Achievement Verification Completion | ✅ COMPLETE | `notification.service.ts`, `video-processing.service.ts`, migration 053 |
| 3 | Workout Templates & Sharing | ✅ COMPLETE | `workout-templates.service.ts`, `templates.ts` routes, migration 054 |
| 4 | Progressive Overload Tracking | ✅ COMPLETE | `progression.service.ts`, `progression.ts` routes, migration 055 |

**Implementation Order:** 1 → 2 → 3 → 4

---

## Feature 1: Career Readiness Frontend

### Overview
Build frontend pages for the existing career readiness backend. The API is 90% complete with endpoints for career goals, PT standards, assessments, and readiness calculations.

### Backend Status (Already Implemented)
- ✅ Database tables: `user_career_goals`, `career_readiness_cache`, `pt_tests`, `team_readiness_config`
- ✅ Service: `apps/api/src/modules/career/index.ts` (1052 lines)
- ✅ 12 pre-seeded PT tests (ACFT, CPAT, PFT, Navy PRT, etc.)
- ✅ Readiness calculation with caching (1-hour TTL)
- ✅ Team readiness with opt-in permissions
- ⚠️ Missing: HTTP routes need to be registered, GraphQL schema needs career queries

### Implementation Tasks

#### Phase 1.1: Backend Routes (Day 1)
**File:** `apps/api/src/http/routes/career.ts` (new)

```typescript
// Routes to implement:
GET  /career/standards              // List all PT tests by category
GET  /career/standards/:id          // Single PT test with events
GET  /career/categories             // List categories with counts
GET  /career/goals                  // User's career goals
POST /career/goals                  // Create career goal
PUT  /career/goals/:id              // Update goal (target date, priority)
DELETE /career/goals/:id            // Remove goal
GET  /career/readiness              // All goals with readiness scores
GET  /career/readiness/:goalId      // Single goal readiness detail
GET  /career/exercises/:goalId      // Recommended exercises for weak events
POST /career/assessments            // Log PT test result
GET  /career/assessments            // User's assessment history
GET  /career/team/:hangoutId        // Team readiness dashboard
POST /career/team/:hangoutId/opt-in // Member opt-in/out
```

**Steps:**
1. Create `apps/api/src/http/routes/career.ts`
2. Import career service from `modules/career`
3. Implement each route with auth middleware
4. Register routes in `apps/api/src/http/server.ts`
5. Add to E2E test suite

#### Phase 1.2: GraphQL Schema (Day 1-2)
**File:** `apps/api/src/graphql/schema/career.graphql` (new)

```graphql
type PTTest {
  id: ID!
  name: String!
  description: String
  category: PTTestCategory!
  events: [PTTestEvent!]!
  recertificationMonths: Int
  exerciseMappings: JSON
  tips: [String!]
  icon: String
}

enum PTTestCategory {
  military
  firefighter
  law_enforcement
  special_operations
  civil_service
  general
}

type PTTestEvent {
  id: ID!
  name: String!
  description: String
  passingCriteria: JSON!
  scoringTable: JSON
  unit: String!
}

type CareerGoal {
  id: ID!
  ptTest: PTTest!
  targetDate: String
  priority: GoalPriority!
  status: GoalStatus!
  agencyName: String
  notes: String
  readiness: ReadinessScore
  createdAt: String!
}

enum GoalPriority {
  primary
  secondary
}

enum GoalStatus {
  active
  achieved
  abandoned
}

type ReadinessScore {
  score: Int!
  status: ReadinessStatus!
  eventsPassed: Int!
  eventsTotal: Int!
  weakEvents: [WeakEvent!]!
  lastAssessmentDate: String
  trend: ReadinessTrend
}

enum ReadinessStatus {
  ready
  at_risk
  not_ready
  no_data
}

enum ReadinessTrend {
  improving
  stable
  declining
}

type WeakEvent {
  eventId: ID!
  eventName: String!
  lastScore: Float
  passingScore: Float!
  gap: Float!
  recommendedExercises: [Exercise!]!
}

type Query {
  careerStandards(category: PTTestCategory): [PTTest!]!
  careerStandard(id: ID!): PTTest
  careerCategories: [CategoryCount!]!
  myCareerGoals: [CareerGoal!]!
  myReadiness(goalId: ID): ReadinessScore
  teamReadiness(hangoutId: ID!): TeamReadiness
}

type Mutation {
  createCareerGoal(input: CreateCareerGoalInput!): CareerGoal!
  updateCareerGoal(id: ID!, input: UpdateCareerGoalInput!): CareerGoal!
  deleteCareerGoal(id: ID!): Boolean!
  logAssessment(input: LogAssessmentInput!): Assessment!
  setTeamReadinessOptIn(hangoutId: ID!, optIn: Boolean!, shareOptions: ShareOptionsInput): Boolean!
}
```

**Steps:**
1. Create GraphQL type definitions
2. Create resolvers in `apps/api/src/graphql/resolvers/career.ts`
3. Wire to career service
4. Add to schema stitching

#### Phase 1.3: Frontend Pages (Days 2-4)

**Directory Structure:**
```
src/pages/Career/
├── index.jsx                 // Route exports
├── CareerDashboard.jsx       // Main career page
├── StandardsLibrary.jsx      // Browse PT tests
├── StandardDetail.jsx        // Single PT test view
├── GoalDetail.jsx            // Single goal with readiness
├── AssessmentLogger.jsx      // Log PT test results
├── TeamReadiness.jsx         // Team dashboard
└── components/
    ├── ReadinessGauge.jsx    // Circular progress gauge
    ├── EventBreakdown.jsx    // Pass/fail per event
    ├── WeakEventCard.jsx     // Exercise recommendations
    ├── TrendChart.jsx        // Readiness over time
    └── GoalCard.jsx          // Goal summary card
```

**CareerDashboard.jsx** - Main entry point:
```jsx
// Key sections:
// 1. Active Goals (primary + secondary) with readiness gauges
// 2. Quick Actions (Log Assessment, Browse Standards)
// 3. Upcoming Recertifications
// 4. Recent Assessments timeline
// 5. Weak Areas summary with exercise links
```

**StandardsLibrary.jsx** - Browse/select PT tests:
```jsx
// Features:
// - Category filter tabs (Military, Fire, LE, etc.)
// - Search by name
// - Card grid with test info + "Set as Goal" button
// - Show which tests user already has as goals
```

**AssessmentLogger.jsx** - Log PT test results:
```jsx
// Features:
// - Select goal/PT test
// - Event-by-event input with validation
// - Auto-calculate pass/fail per event
// - Show improvement from last attempt
// - Notes field
// - Submit → recalculates readiness
```

**Steps:**
1. Create page components with loading states
2. Add GraphQL queries using Apollo
3. Implement form handling with validation
4. Add routes to `src/App.jsx` router
5. Add navigation links in sidebar/menu
6. Style with existing design system (glassmorphism)

#### Phase 1.4: Integration & Polish (Day 5)

1. **Prescription Integration:**
   - Update prescription form to show career goal option
   - When career goal selected, auto-target weak events
   - Show "Training for: ACFT" badge on workout page

2. **Dashboard Widget:**
   - Add "Career Readiness" widget to main dashboard
   - Show primary goal readiness gauge
   - Days until target date countdown

3. **Notifications:**
   - Recertification reminders (30, 14, 7 days)
   - Readiness milestone notifications (50%, 75%, 90%)

4. **E2E Tests:**
   - Add career test suite to `scripts/e2e-user-journey.ts`
   - Test: list standards, create goal, log assessment, check readiness

### Acceptance Criteria
- [ ] User can browse 12+ PT standards by category
- [ ] User can set primary/secondary career goals with target dates
- [ ] User can log assessment results event-by-event
- [ ] Readiness score calculates correctly (events passed / total)
- [ ] Weak events show recommended exercises
- [ ] Team readiness shows opted-in members' scores
- [ ] E2E tests pass for all career endpoints

---

## Feature 2: Achievement Verification Completion

### Overview
Complete the 90%-done verification system by adding video thumbnail generation, witness notifications, and user result notifications.

### Current Status
- ✅ Video upload and storage working
- ✅ Witness attestation flow complete
- ✅ Achievement granting on verification
- ⚠️ TODO: Thumbnail generation with ffmpeg
- ⚠️ TODO: Notify witness when verification submitted
- ⚠️ TODO: Notify user when verification result received

### Implementation Tasks

#### Phase 2.1: FFmpeg Thumbnail Generation (Day 1)

**File:** `apps/api/src/services/video-processing.ts` (new)

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

interface ThumbnailResult {
  thumbnailPath: string;
  thumbnailUrl: string;
  width: number;
  height: number;
}

export async function generateThumbnail(
  videoPath: string,
  outputDir: string,
  timestamp: number = 1 // seconds into video
): Promise<ThumbnailResult> {
  const thumbnailFilename = 'thumbnail.jpg';
  const thumbnailPath = path.join(outputDir, thumbnailFilename);

  // FFmpeg command: extract frame at timestamp, scale to 480px width
  const cmd = `ffmpeg -y -i "${videoPath}" -ss ${timestamp} -vframes 1 -vf "scale=480:-1" "${thumbnailPath}"`;

  await execAsync(cmd);

  // Get dimensions
  const probeCmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${thumbnailPath}"`;
  const { stdout } = await execAsync(probeCmd);
  const [width, height] = stdout.trim().split(',').map(Number);

  return {
    thumbnailPath,
    thumbnailUrl: `/uploads/verifications/${path.basename(path.dirname(outputDir))}/${path.basename(outputDir)}/thumbnail.jpg`,
    width,
    height
  };
}

export async function getVideoDuration(videoPath: string): Promise<number> {
  const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
  const { stdout } = await execAsync(cmd);
  return parseFloat(stdout.trim());
}
```

**Update verification/index.ts:**
```typescript
// After saving video file (around line 235):
import { generateThumbnail, getVideoDuration } from '../../services/video-processing';

// In submitVerification function:
const thumbnailResult = await generateThumbnail(videoPath, verificationDir, 1);
const duration = await getVideoDuration(videoPath);

// Update verification record:
await db('achievement_verifications')
  .where({ id: verificationId })
  .update({
    thumbnail_url: thumbnailResult.thumbnailUrl,
    video_duration_seconds: duration
  });
```

**Steps:**
1. Ensure ffmpeg is installed on server (`apt install ffmpeg`)
2. Create video-processing.ts service
3. Update verification submission to generate thumbnail
4. Update verification queries to return thumbnail_url
5. Test with sample video upload

#### Phase 2.2: Notification Service Extension (Day 1-2)

**File:** `apps/api/src/services/notifications.ts` (extend)

```typescript
// Add notification types:
export enum NotificationType {
  // ... existing types
  VERIFICATION_WITNESS_REQUEST = 'verification_witness_request',
  VERIFICATION_CONFIRMED = 'verification_confirmed',
  VERIFICATION_REJECTED = 'verification_rejected',
  VERIFICATION_EXPIRED = 'verification_expired'
}

// Add notification templates:
const templates = {
  verification_witness_request: {
    title: 'Witness Request',
    body: '{userName} wants you to witness their {achievementName} achievement',
    action: '/witness/{verificationId}'
  },
  verification_confirmed: {
    title: 'Achievement Verified!',
    body: 'Your {achievementName} achievement has been verified by {witnessName}',
    action: '/achievements'
  },
  verification_rejected: {
    title: 'Verification Not Confirmed',
    body: 'Your witness could not confirm your {achievementName} achievement',
    action: '/achievements/verification/{verificationId}'
  },
  verification_expired: {
    title: 'Verification Expired',
    body: 'Your {achievementName} verification request has expired',
    action: '/achievements'
  }
};

// Add send functions:
export async function sendVerificationWitnessRequest(
  witnessUserId: string,
  verification: AchievementVerification,
  submitterName: string
): Promise<void> {
  await createNotification({
    userId: witnessUserId,
    type: NotificationType.VERIFICATION_WITNESS_REQUEST,
    title: templates.verification_witness_request.title,
    body: templates.verification_witness_request.body
      .replace('{userName}', submitterName)
      .replace('{achievementName}', verification.achievementName),
    actionUrl: templates.verification_witness_request.action
      .replace('{verificationId}', verification.id),
    metadata: {
      verificationId: verification.id,
      achievementId: verification.achievementId
    }
  });

  // Also send push notification if enabled
  await sendPushNotification(witnessUserId, {
    title: 'New Witness Request',
    body: `${submitterName} needs you to verify an achievement`,
    data: { verificationId: verification.id }
  });
}

export async function sendVerificationResult(
  userId: string,
  verification: AchievementVerification,
  confirmed: boolean,
  witnessName: string
): Promise<void> {
  const type = confirmed
    ? NotificationType.VERIFICATION_CONFIRMED
    : NotificationType.VERIFICATION_REJECTED;
  const template = confirmed
    ? templates.verification_confirmed
    : templates.verification_rejected;

  await createNotification({
    userId,
    type,
    title: template.title,
    body: template.body
      .replace('{achievementName}', verification.achievementName)
      .replace('{witnessName}', witnessName),
    actionUrl: template.action.replace('{verificationId}', verification.id),
    metadata: {
      verificationId: verification.id,
      achievementId: verification.achievementId,
      confirmed
    }
  });

  await sendPushNotification(userId, {
    title: template.title,
    body: confirmed
      ? `${witnessName} verified your achievement!`
      : 'Your verification was not confirmed',
    data: { verificationId: verification.id }
  });
}
```

**Update verification/index.ts:**
```typescript
// Line 263 - After creating verification:
import { sendVerificationWitnessRequest, sendVerificationResult } from '../../services/notifications';

// In submitVerification, after inserting witness record:
const submitter = await db('users').where({ id: userId }).first();
await sendVerificationWitnessRequest(witnessUserId, verification, submitter.display_name);

// Line 632 - In submitWitnessAttestation, after updating status:
const witness = await db('users').where({ id: witnessUserId }).first();
await sendVerificationResult(
  verification.userId,
  verification,
  confirm, // boolean
  witness.display_name
);
```

#### Phase 2.3: Frontend Updates (Day 2)

**Update AchievementVerification.jsx:**
```jsx
// Add thumbnail preview after video upload
{verification?.thumbnailUrl && (
  <div className="thumbnail-preview">
    <img
      src={verification.thumbnailUrl}
      alt="Video thumbnail"
      className="rounded-lg w-full max-w-md"
    />
  </div>
)}
```

**Update WitnessAttestation.jsx:**
```jsx
// Show video with thumbnail poster
<video
  src={verification.videoUrl}
  poster={verification.thumbnailUrl}
  controls
  className="rounded-lg w-full"
/>
```

**Add notification badge/indicator:**
- Show notification dot on achievements menu when pending verification
- Toast notification when verification result received

#### Phase 2.4: E2E Tests & Cron Job (Day 2)

**Add to e2e-user-journey.ts:**
```typescript
async function testVerification(ctx: TestContext) {
  // Test verification required achievements list
  await runTest('Verification', 'Get verification-required achievements', async () => {
    const res = await request('GET', '/achievements/verification-required', {
      token: ctx.token
    });
    assert(res.status === 200, 'Should return verification achievements');
  });

  // Test submission validation (without actual video)
  await runTest('Verification', 'Validate submission requirements', async () => {
    const res = await request('POST', '/verification/validate', {
      token: ctx.token,
      body: { achievementId: 'test-achievement' },
      expectedStatus: [200, 400, 404]
    });
    assert([200, 400, 404].includes(res.status), 'Should validate');
  });
}
```

**Cron job for expiration:**
```typescript
// apps/api/src/jobs/verification-expiry.ts
import cron from 'node-cron';
import { expireOldVerifications } from '../modules/verification';
import { sendVerificationExpired } from '../services/notifications';

// Run daily at midnight
cron.schedule('0 0 * * *', async () => {
  const expired = await expireOldVerifications();

  for (const verification of expired) {
    await sendVerificationExpired(verification.userId, verification);
  }

  console.log(`Expired ${expired.length} verifications`);
});
```

### Acceptance Criteria
- [ ] Video thumbnails generated automatically on upload
- [ ] Witness receives notification when requested
- [ ] User receives notification when verification confirmed/rejected
- [ ] Thumbnails display in verification views
- [ ] Expired verifications cleaned up daily with notifications
- [ ] E2E tests pass for verification flow

---

## Feature 3: Workout Templates & Sharing

### Overview
Allow users to save workouts as reusable templates, browse community templates, and share templates with others.

### Database Schema Changes

#### Phase 3.1: Database Migration (Day 1)

**File:** `apps/api/src/db/migrations/053_workout_templates.ts`

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Workout templates table
  await knex.schema.createTable('workout_templates', (table) => {
    table.text('id').primary();
    table.text('creator_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('name').notNullable();
    table.text('description');
    table.text('category'); // strength, cardio, hiit, mobility, sport-specific
    table.text('difficulty'); // beginner, intermediate, advanced
    table.integer('estimated_duration_minutes');
    table.jsonb('exercises').notNullable(); // Array of exercise configs
    table.jsonb('warmup'); // Optional warmup exercises
    table.jsonb('cooldown'); // Optional cooldown exercises
    table.jsonb('equipment_required'); // Array of equipment IDs
    table.jsonb('target_muscles'); // Primary muscles targeted
    table.jsonb('tags'); // User-defined tags
    table.boolean('is_public').defaultTo(false);
    table.boolean('is_featured').defaultTo(false);
    table.integer('use_count').defaultTo(0);
    table.integer('like_count').defaultTo(0);
    table.integer('fork_count').defaultTo(0);
    table.text('forked_from_id').references('id').inTable('workout_templates');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('creator_id');
    table.index('is_public');
    table.index('category');
    table.index(['is_public', 'use_count']);
    table.index(['is_public', 'like_count']);
  });

  // Template likes (for popularity)
  await knex.schema.createTable('template_likes', (table) => {
    table.text('id').primary();
    table.text('template_id').notNullable().references('id').inTable('workout_templates').onDelete('CASCADE');
    table.text('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['template_id', 'user_id']);
    table.index('user_id');
  });

  // Template shares (direct sharing)
  await knex.schema.createTable('template_shares', (table) => {
    table.text('id').primary();
    table.text('template_id').notNullable().references('id').inTable('workout_templates').onDelete('CASCADE');
    table.text('shared_by_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('shared_with_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('access_level').defaultTo('view'); // view, use, fork
    table.text('message'); // Optional share message
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['template_id', 'shared_with_id']);
    table.index('shared_with_id');
  });

  // Link workouts to templates
  await knex.schema.alterTable('workouts', (table) => {
    table.text('template_id').references('id').inTable('workout_templates');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('workouts', (table) => {
    table.dropColumn('template_id');
  });
  await knex.schema.dropTableIfExists('template_shares');
  await knex.schema.dropTableIfExists('template_likes');
  await knex.schema.dropTableIfExists('workout_templates');
}
```

#### Phase 3.2: Backend Service (Days 2-3)

**File:** `apps/api/src/modules/templates/index.ts`

```typescript
import { db } from '../../db';
import { generateId } from '../../lib/utils';

export interface TemplateExercise {
  exerciseId: string;
  sets: number;
  reps?: number;
  duration?: number; // seconds
  weight?: number;
  restSeconds?: number;
  notes?: string;
  alternatives?: string[]; // Alternative exercise IDs
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  category?: string;
  difficulty?: string;
  exercises: TemplateExercise[];
  warmup?: TemplateExercise[];
  cooldown?: TemplateExercise[];
  equipmentRequired?: string[];
  targetMuscles?: string[];
  tags?: string[];
  isPublic?: boolean;
}

// Create a new template
export async function createTemplate(
  userId: string,
  input: CreateTemplateInput
): Promise<WorkoutTemplate> {
  const id = generateId('tmpl');
  const estimatedDuration = calculateTemplateDuration(input.exercises);

  const template = {
    id,
    creator_id: userId,
    name: input.name,
    description: input.description,
    category: input.category,
    difficulty: input.difficulty,
    estimated_duration_minutes: estimatedDuration,
    exercises: JSON.stringify(input.exercises),
    warmup: input.warmup ? JSON.stringify(input.warmup) : null,
    cooldown: input.cooldown ? JSON.stringify(input.cooldown) : null,
    equipment_required: JSON.stringify(input.equipmentRequired || []),
    target_muscles: JSON.stringify(input.targetMuscles || []),
    tags: JSON.stringify(input.tags || []),
    is_public: input.isPublic || false,
    created_at: new Date(),
    updated_at: new Date()
  };

  await db('workout_templates').insert(template);
  return getTemplate(id);
}

// Create template from existing workout
export async function createTemplateFromWorkout(
  userId: string,
  workoutId: string,
  name: string,
  isPublic: boolean = false
): Promise<WorkoutTemplate> {
  const workout = await db('workouts').where({ id: workoutId }).first();
  if (!workout) throw new Error('Workout not found');
  if (workout.user_id !== userId) throw new Error('Not authorized');

  const exerciseData = JSON.parse(workout.exercise_data);
  const exercises: TemplateExercise[] = exerciseData.map((ex: any) => ({
    exerciseId: ex.exerciseId,
    sets: ex.sets,
    reps: ex.reps,
    weight: ex.weight,
    duration: ex.duration
  }));

  return createTemplate(userId, {
    name,
    exercises,
    isPublic
  });
}

// Fork a template (copy to own templates)
export async function forkTemplate(
  userId: string,
  templateId: string
): Promise<WorkoutTemplate> {
  const original = await getTemplate(templateId);
  if (!original) throw new Error('Template not found');
  if (!original.is_public && original.creator_id !== userId) {
    // Check if shared with user
    const share = await db('template_shares')
      .where({ template_id: templateId, shared_with_id: userId })
      .first();
    if (!share || share.access_level === 'view') {
      throw new Error('Not authorized to fork');
    }
  }

  const forked = await createTemplate(userId, {
    name: `${original.name} (Copy)`,
    description: original.description,
    category: original.category,
    difficulty: original.difficulty,
    exercises: original.exercises,
    warmup: original.warmup,
    cooldown: original.cooldown,
    equipmentRequired: original.equipment_required,
    targetMuscles: original.target_muscles,
    tags: original.tags,
    isPublic: false // Forks start private
  });

  // Update fork reference and counts
  await db('workout_templates')
    .where({ id: forked.id })
    .update({ forked_from_id: templateId });
  await db('workout_templates')
    .where({ id: templateId })
    .increment('fork_count', 1);

  return getTemplate(forked.id);
}

// Browse public templates
export async function browseTemplates(options: {
  category?: string;
  difficulty?: string;
  tags?: string[];
  search?: string;
  sortBy?: 'popular' | 'recent' | 'uses';
  limit?: number;
  offset?: number;
}): Promise<{ templates: WorkoutTemplate[]; total: number }> {
  let query = db('workout_templates')
    .where('is_public', true)
    .leftJoin('users', 'workout_templates.creator_id', 'users.id')
    .select(
      'workout_templates.*',
      'users.display_name as creator_name',
      'users.avatar_url as creator_avatar'
    );

  if (options.category) {
    query = query.where('category', options.category);
  }
  if (options.difficulty) {
    query = query.where('difficulty', options.difficulty);
  }
  if (options.search) {
    query = query.where((builder) => {
      builder
        .whereILike('name', `%${options.search}%`)
        .orWhereILike('description', `%${options.search}%`);
    });
  }
  if (options.tags?.length) {
    query = query.whereRaw('tags ?| array[?]', [options.tags]);
  }

  // Sorting
  switch (options.sortBy) {
    case 'popular':
      query = query.orderBy('like_count', 'desc');
      break;
    case 'uses':
      query = query.orderBy('use_count', 'desc');
      break;
    case 'recent':
    default:
      query = query.orderBy('created_at', 'desc');
  }

  const countQuery = query.clone();
  const [{ count }] = await countQuery.count('* as count');

  const templates = await query
    .limit(options.limit || 20)
    .offset(options.offset || 0);

  return {
    templates: templates.map(parseTemplate),
    total: parseInt(count as string)
  };
}

// Get user's templates
export async function getUserTemplates(
  userId: string,
  includeShared: boolean = true
): Promise<WorkoutTemplate[]> {
  const owned = await db('workout_templates')
    .where('creator_id', userId)
    .orderBy('updated_at', 'desc');

  if (!includeShared) {
    return owned.map(parseTemplate);
  }

  const shared = await db('template_shares')
    .where('shared_with_id', userId)
    .join('workout_templates', 'template_shares.template_id', 'workout_templates.id')
    .leftJoin('users', 'workout_templates.creator_id', 'users.id')
    .select(
      'workout_templates.*',
      'users.display_name as creator_name',
      'template_shares.access_level'
    );

  return [...owned, ...shared].map(parseTemplate);
}

// Share template with user
export async function shareTemplate(
  userId: string,
  templateId: string,
  shareWithUserId: string,
  accessLevel: 'view' | 'use' | 'fork' = 'use',
  message?: string
): Promise<void> {
  const template = await getTemplate(templateId);
  if (!template || template.creator_id !== userId) {
    throw new Error('Not authorized');
  }

  await db('template_shares')
    .insert({
      id: generateId('share'),
      template_id: templateId,
      shared_by_id: userId,
      shared_with_id: shareWithUserId,
      access_level: accessLevel,
      message
    })
    .onConflict(['template_id', 'shared_with_id'])
    .merge({ access_level: accessLevel, message });

  // Send notification
  await sendTemplateSharedNotification(shareWithUserId, template, userId, message);
}

// Like/unlike template
export async function toggleTemplateLike(
  userId: string,
  templateId: string
): Promise<{ liked: boolean; likeCount: number }> {
  const existing = await db('template_likes')
    .where({ template_id: templateId, user_id: userId })
    .first();

  if (existing) {
    await db('template_likes').where({ id: existing.id }).delete();
    await db('workout_templates').where({ id: templateId }).decrement('like_count', 1);
    const template = await getTemplate(templateId);
    return { liked: false, likeCount: template.like_count };
  } else {
    await db('template_likes').insert({
      id: generateId('like'),
      template_id: templateId,
      user_id: userId
    });
    await db('workout_templates').where({ id: templateId }).increment('like_count', 1);
    const template = await getTemplate(templateId);
    return { liked: true, likeCount: template.like_count };
  }
}

// Use template to start workout
export async function useTemplate(
  userId: string,
  templateId: string
): Promise<{ exercises: TemplateExercise[]; templateId: string }> {
  const template = await getTemplate(templateId);
  if (!template) throw new Error('Template not found');

  // Check access
  if (!template.is_public && template.creator_id !== userId) {
    const share = await db('template_shares')
      .where({ template_id: templateId, shared_with_id: userId })
      .first();
    if (!share || share.access_level === 'view') {
      throw new Error('Not authorized');
    }
  }

  // Increment use count
  await db('workout_templates')
    .where({ id: templateId })
    .increment('use_count', 1);

  return {
    exercises: template.exercises,
    templateId
  };
}

// Generate share link
export function generateShareLink(templateId: string): string {
  return `https://musclemap.me/templates/${templateId}`;
}

// Helper functions
function calculateTemplateDuration(exercises: TemplateExercise[]): number {
  let totalSeconds = 0;
  for (const ex of exercises) {
    const setTime = ex.duration || 45; // Default 45s per set
    const restTime = ex.restSeconds || 60;
    totalSeconds += ex.sets * (setTime + restTime);
  }
  return Math.ceil(totalSeconds / 60);
}

function parseTemplate(row: any): WorkoutTemplate {
  return {
    ...row,
    exercises: typeof row.exercises === 'string' ? JSON.parse(row.exercises) : row.exercises,
    warmup: row.warmup ? (typeof row.warmup === 'string' ? JSON.parse(row.warmup) : row.warmup) : null,
    cooldown: row.cooldown ? (typeof row.cooldown === 'string' ? JSON.parse(row.cooldown) : row.cooldown) : null,
    equipment_required: typeof row.equipment_required === 'string' ? JSON.parse(row.equipment_required) : row.equipment_required,
    target_muscles: typeof row.target_muscles === 'string' ? JSON.parse(row.target_muscles) : row.target_muscles,
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags
  };
}
```

#### Phase 3.3: HTTP Routes (Day 3)

**File:** `apps/api/src/http/routes/templates.ts`

```typescript
import { FastifyInstance } from 'fastify';
import * as templates from '../../modules/templates';

export async function templateRoutes(fastify: FastifyInstance) {
  // Browse public templates
  fastify.get('/templates', async (request, reply) => {
    const { category, difficulty, tags, search, sortBy, limit, offset } = request.query as any;
    const result = await templates.browseTemplates({
      category,
      difficulty,
      tags: tags?.split(','),
      search,
      sortBy,
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0
    });
    return result;
  });

  // Get single template
  fastify.get('/templates/:id', async (request, reply) => {
    const { id } = request.params as any;
    const userId = request.user?.id;
    const template = await templates.getTemplate(id, userId);
    if (!template) {
      return reply.status(404).send({ error: 'Template not found' });
    }
    return template;
  });

  // Get my templates
  fastify.get('/templates/mine', { preHandler: [fastify.authenticate] }, async (request) => {
    return templates.getUserTemplates(request.user.id);
  });

  // Create template
  fastify.post('/templates', { preHandler: [fastify.authenticate] }, async (request) => {
    return templates.createTemplate(request.user.id, request.body as any);
  });

  // Create from workout
  fastify.post('/templates/from-workout/:workoutId', { preHandler: [fastify.authenticate] }, async (request) => {
    const { workoutId } = request.params as any;
    const { name, isPublic } = request.body as any;
    return templates.createTemplateFromWorkout(request.user.id, workoutId, name, isPublic);
  });

  // Update template
  fastify.put('/templates/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const updated = await templates.updateTemplate(request.user.id, id, request.body as any);
    if (!updated) {
      return reply.status(404).send({ error: 'Template not found' });
    }
    return updated;
  });

  // Delete template
  fastify.delete('/templates/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    await templates.deleteTemplate(request.user.id, id);
    return { success: true };
  });

  // Fork template
  fastify.post('/templates/:id/fork', { preHandler: [fastify.authenticate] }, async (request) => {
    const { id } = request.params as any;
    return templates.forkTemplate(request.user.id, id);
  });

  // Like/unlike template
  fastify.post('/templates/:id/like', { preHandler: [fastify.authenticate] }, async (request) => {
    const { id } = request.params as any;
    return templates.toggleTemplateLike(request.user.id, id);
  });

  // Share template
  fastify.post('/templates/:id/share', { preHandler: [fastify.authenticate] }, async (request) => {
    const { id } = request.params as any;
    const { userId, accessLevel, message } = request.body as any;
    await templates.shareTemplate(request.user.id, id, userId, accessLevel, message);
    return { success: true };
  });

  // Use template (start workout)
  fastify.post('/templates/:id/use', { preHandler: [fastify.authenticate] }, async (request) => {
    const { id } = request.params as any;
    return templates.useTemplate(request.user.id, id);
  });
}
```

#### Phase 3.4: Frontend Pages (Days 4-6)

**Directory Structure:**
```
src/pages/Templates/
├── index.jsx                 // Route exports
├── TemplatesBrowser.jsx      // Browse/search public templates
├── MyTemplates.jsx           // User's own templates
├── TemplateDetail.jsx        // View single template
├── TemplateEditor.jsx        // Create/edit template
├── SharedWithMe.jsx          // Templates shared with user
└── components/
    ├── TemplateCard.jsx      // Template preview card
    ├── TemplateFilters.jsx   // Category/difficulty filters
    ├── ExerciseList.jsx      // Exercise list in template
    ├── ShareModal.jsx        // Share template modal
    └── SaveAsTemplateModal.jsx // Save workout as template
```

**TemplatesBrowser.jsx:**
```jsx
// Features:
// - Search bar with real-time search
// - Category tabs (Strength, Cardio, HIIT, Mobility, Sport-Specific)
// - Difficulty filter (Beginner, Intermediate, Advanced)
// - Sort options (Popular, Recent, Most Used)
// - Infinite scroll template grid
// - Quick "Use This" button on cards
// - Like button with count
```

**TemplateDetail.jsx:**
```jsx
// Features:
// - Template header (name, creator, stats)
// - Full exercise list with sets/reps/rest
// - Equipment required list
// - Target muscles visualization
// - "Start Workout" primary CTA
// - "Fork", "Like", "Share" secondary actions
// - Creator profile link
// - Fork history (if applicable)
```

**SaveAsTemplateModal.jsx** (integrate into Workout.jsx):
```jsx
// Show after completing a workout:
// - "Save as Template?" prompt
// - Name input
// - Public/private toggle
// - Category selection
// - Tags input
// - Save button
```

#### Phase 3.5: Integration Points (Days 7-8)

1. **Workout Page Integration:**
   - Add "Use Template" button to start workout
   - Add "Save as Template" after completing workout
   - Link completed workouts to template used

2. **Dashboard Widget:**
   - "My Templates" quick access
   - "Suggested Templates" based on goals

3. **Deep Links:**
   - `/templates/:id` for sharing
   - Handle template links in mobile app

4. **E2E Tests:**
   - Create template, browse, fork, use, share

### Acceptance Criteria
- [ ] User can create templates from scratch
- [ ] User can save completed workout as template
- [ ] User can browse public templates with filters
- [ ] User can fork templates to customize
- [ ] User can like templates
- [ ] User can share templates with specific users
- [ ] Use count increments when template used
- [ ] Template links work as shareable URLs
- [ ] E2E tests pass

---

## Feature 4: Progressive Overload Tracking

### Overview
Automatically track and suggest progressive overload (weight/rep increases) for each exercise based on workout history.

### Backend Implementation

#### Phase 4.1: Overload Calculation Service (Day 1)

**File:** `apps/api/src/modules/progression/index.ts`

```typescript
import { db } from '../../db';

export interface ExerciseHistory {
  exerciseId: string;
  exerciseName: string;
  history: WorkoutSet[];
  personalRecords: PersonalRecords;
  progression: ProgressionAnalysis;
  recommendation: ProgressionRecommendation;
}

export interface WorkoutSet {
  date: string;
  sets: number;
  reps: number;
  weight: number;
  volume: number; // sets * reps * weight
  estimatedOneRepMax: number;
}

export interface PersonalRecords {
  maxWeight: { value: number; date: string; reps: number };
  maxVolume: { value: number; date: string };
  maxReps: { value: number; date: string; weight: number };
  estimated1RM: { value: number; date: string };
}

export interface ProgressionAnalysis {
  trend: 'improving' | 'stable' | 'declining';
  weeklyVolumeChange: number; // percentage
  lastWorkoutVsAverage: number; // percentage
  consistencyScore: number; // 0-100
  workoutsLast30Days: number;
}

export interface ProgressionRecommendation {
  type: 'increase_weight' | 'increase_reps' | 'increase_sets' | 'maintain' | 'deload';
  suggestedWeight: number;
  suggestedReps: number;
  suggestedSets: number;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
}

// Get exercise history for a user
export async function getExerciseHistory(
  userId: string,
  exerciseId: string,
  limit: number = 20
): Promise<ExerciseHistory> {
  // Get workout data for this exercise
  const workouts = await db('workouts')
    .where('user_id', userId)
    .whereRaw("exercise_data::jsonb @> ?", [JSON.stringify([{ exerciseId }])])
    .orderBy('date', 'desc')
    .limit(limit);

  const history: WorkoutSet[] = [];

  for (const workout of workouts) {
    const exerciseData = JSON.parse(workout.exercise_data);
    const exerciseEntry = exerciseData.find((e: any) => e.exerciseId === exerciseId);
    if (exerciseEntry) {
      const volume = exerciseEntry.sets * exerciseEntry.reps * (exerciseEntry.weight || 0);
      const e1RM = calculateEstimated1RM(exerciseEntry.weight, exerciseEntry.reps);
      history.push({
        date: workout.date,
        sets: exerciseEntry.sets,
        reps: exerciseEntry.reps,
        weight: exerciseEntry.weight || 0,
        volume,
        estimatedOneRepMax: e1RM
      });
    }
  }

  const personalRecords = calculatePersonalRecords(history);
  const progression = analyzeProgression(history);
  const recommendation = generateRecommendation(history, progression);

  const exercise = await db('exercises').where({ id: exerciseId }).first();

  return {
    exerciseId,
    exerciseName: exercise?.name || 'Unknown',
    history: history.reverse(), // Chronological order
    personalRecords,
    progression,
    recommendation
  };
}

// Calculate estimated 1RM using Epley formula
function calculateEstimated1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps === 0 || weight === 0) return 0;
  return Math.round(weight * (1 + reps / 30));
}

// Find personal records
function calculatePersonalRecords(history: WorkoutSet[]): PersonalRecords {
  let maxWeight = { value: 0, date: '', reps: 0 };
  let maxVolume = { value: 0, date: '' };
  let maxReps = { value: 0, date: '', weight: 0 };
  let max1RM = { value: 0, date: '' };

  for (const set of history) {
    if (set.weight > maxWeight.value) {
      maxWeight = { value: set.weight, date: set.date, reps: set.reps };
    }
    if (set.volume > maxVolume.value) {
      maxVolume = { value: set.volume, date: set.date };
    }
    if (set.reps > maxReps.value) {
      maxReps = { value: set.reps, date: set.date, weight: set.weight };
    }
    if (set.estimatedOneRepMax > max1RM.value) {
      max1RM = { value: set.estimatedOneRepMax, date: set.date };
    }
  }

  return {
    maxWeight,
    maxVolume,
    maxReps,
    estimated1RM: max1RM
  };
}

// Analyze progression trends
function analyzeProgression(history: WorkoutSet[]): ProgressionAnalysis {
  if (history.length < 2) {
    return {
      trend: 'stable',
      weeklyVolumeChange: 0,
      lastWorkoutVsAverage: 0,
      consistencyScore: history.length > 0 ? 50 : 0,
      workoutsLast30Days: history.length
    };
  }

  // Calculate weekly volume change
  const recentVolumes = history.slice(-4).map(h => h.volume);
  const olderVolumes = history.slice(-8, -4).map(h => h.volume);

  const recentAvg = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
  const olderAvg = olderVolumes.length > 0
    ? olderVolumes.reduce((a, b) => a + b, 0) / olderVolumes.length
    : recentAvg;

  const weeklyVolumeChange = olderAvg > 0
    ? ((recentAvg - olderAvg) / olderAvg) * 100
    : 0;

  // Determine trend
  let trend: 'improving' | 'stable' | 'declining';
  if (weeklyVolumeChange > 5) trend = 'improving';
  else if (weeklyVolumeChange < -5) trend = 'declining';
  else trend = 'stable';

  // Last workout vs average
  const allVolumes = history.map(h => h.volume);
  const avgVolume = allVolumes.reduce((a, b) => a + b, 0) / allVolumes.length;
  const lastVolume = history[history.length - 1]?.volume || 0;
  const lastWorkoutVsAverage = avgVolume > 0
    ? ((lastVolume - avgVolume) / avgVolume) * 100
    : 0;

  // Consistency score (based on workout frequency)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const workoutsLast30Days = history.filter(h => new Date(h.date) >= thirtyDaysAgo).length;
  const consistencyScore = Math.min(100, (workoutsLast30Days / 12) * 100); // 12 = 3x/week

  return {
    trend,
    weeklyVolumeChange: Math.round(weeklyVolumeChange * 10) / 10,
    lastWorkoutVsAverage: Math.round(lastWorkoutVsAverage * 10) / 10,
    consistencyScore: Math.round(consistencyScore),
    workoutsLast30Days
  };
}

// Generate progressive overload recommendation
function generateRecommendation(
  history: WorkoutSet[],
  progression: ProgressionAnalysis
): ProgressionRecommendation {
  if (history.length === 0) {
    return {
      type: 'maintain',
      suggestedWeight: 0,
      suggestedReps: 10,
      suggestedSets: 3,
      reasoning: 'No workout history. Start with a comfortable weight.',
      confidence: 'low'
    };
  }

  const lastWorkout = history[history.length - 1];
  const { reps, weight, sets } = lastWorkout;

  // Deload if declining significantly
  if (progression.trend === 'declining' && progression.weeklyVolumeChange < -15) {
    return {
      type: 'deload',
      suggestedWeight: Math.round(weight * 0.85),
      suggestedReps: reps,
      suggestedSets: sets,
      reasoning: 'Performance declining. Consider a deload week with reduced weight.',
      confidence: 'high'
    };
  }

  // Standard progressive overload logic
  // If hit target reps (e.g., 12), increase weight
  if (reps >= 12) {
    const newWeight = Math.round(weight * 1.05); // 5% increase
    return {
      type: 'increase_weight',
      suggestedWeight: newWeight,
      suggestedReps: 8, // Reset to lower reps
      suggestedSets: sets,
      reasoning: `You hit ${reps} reps last time. Increase weight to ${newWeight} and aim for 8 reps.`,
      confidence: 'high'
    };
  }

  // If can do more reps, increase reps
  if (reps < 12 && progression.trend !== 'declining') {
    return {
      type: 'increase_reps',
      suggestedWeight: weight,
      suggestedReps: reps + 1,
      suggestedSets: sets,
      reasoning: `Try to get ${reps + 1} reps this time. When you hit 12, increase weight.`,
      confidence: 'medium'
    };
  }

  // Maintain current level
  return {
    type: 'maintain',
    suggestedWeight: weight,
    suggestedReps: reps,
    suggestedSets: sets,
    reasoning: 'Maintain current weight and reps. Focus on form and consistency.',
    confidence: 'medium'
  };
}

// Get progression summary for all exercises
export async function getProgressionSummary(userId: string): Promise<{
  totalExercises: number;
  improving: number;
  stable: number;
  declining: number;
  recentPRs: Array<{ exerciseName: string; type: string; value: number; date: string }>;
}> {
  // Get unique exercises from recent workouts
  const recentWorkouts = await db('workouts')
    .where('user_id', userId)
    .where('date', '>=', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .select('exercise_data');

  const exerciseIds = new Set<string>();
  for (const workout of recentWorkouts) {
    const data = JSON.parse(workout.exercise_data);
    data.forEach((ex: any) => exerciseIds.add(ex.exerciseId));
  }

  let improving = 0, stable = 0, declining = 0;
  const recentPRs: any[] = [];

  for (const exerciseId of exerciseIds) {
    const history = await getExerciseHistory(userId, exerciseId, 10);

    if (history.progression.trend === 'improving') improving++;
    else if (history.progression.trend === 'declining') declining++;
    else stable++;

    // Check for recent PRs (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    if (new Date(history.personalRecords.maxWeight.date) >= sevenDaysAgo) {
      recentPRs.push({
        exerciseName: history.exerciseName,
        type: 'Weight PR',
        value: history.personalRecords.maxWeight.value,
        date: history.personalRecords.maxWeight.date
      });
    }
  }

  return {
    totalExercises: exerciseIds.size,
    improving,
    stable,
    declining,
    recentPRs: recentPRs.slice(0, 5) // Top 5 recent PRs
  };
}
```

#### Phase 4.2: HTTP Routes (Day 2)

**File:** `apps/api/src/http/routes/progression.ts`

```typescript
import { FastifyInstance } from 'fastify';
import * as progression from '../../modules/progression';

export async function progressionRoutes(fastify: FastifyInstance) {
  // Get progression summary
  fastify.get('/progression/summary', { preHandler: [fastify.authenticate] }, async (request) => {
    return progression.getProgressionSummary(request.user.id);
  });

  // Get exercise history with recommendations
  fastify.get('/progression/exercise/:exerciseId', { preHandler: [fastify.authenticate] }, async (request) => {
    const { exerciseId } = request.params as any;
    const { limit } = request.query as any;
    return progression.getExerciseHistory(request.user.id, exerciseId, parseInt(limit) || 20);
  });

  // Get recommendations for multiple exercises (for workout planning)
  fastify.post('/progression/recommendations', { preHandler: [fastify.authenticate] }, async (request) => {
    const { exerciseIds } = request.body as any;
    const recommendations: Record<string, any> = {};

    for (const exerciseId of exerciseIds) {
      const history = await progression.getExerciseHistory(request.user.id, exerciseId, 10);
      recommendations[exerciseId] = {
        recommendation: history.recommendation,
        lastWorkout: history.history[history.history.length - 1] || null
      };
    }

    return recommendations;
  });

  // Get all personal records
  fastify.get('/progression/records', { preHandler: [fastify.authenticate] }, async (request) => {
    return progression.getAllPersonalRecords(request.user.id);
  });
}
```

#### Phase 4.3: Frontend Components (Days 3-4)

**Directory Structure:**
```
src/components/Progression/
├── ProgressionSummary.jsx    // Dashboard widget
├── ExerciseProgressChart.jsx // Line chart for exercise
├── PRBadge.jsx               // Personal record indicator
├── RecommendationCard.jsx    // Suggested weight/reps
├── TrendIndicator.jsx        // Improving/stable/declining
└── ProgressionModal.jsx      // Full exercise history
```

**ProgressionSummary.jsx (Dashboard Widget):**
```jsx
import { useQuery } from '@apollo/client';
import { TrendingUp, TrendingDown, Minus, Trophy } from 'lucide-react';

export function ProgressionSummary() {
  const { data, loading } = useQuery(PROGRESSION_SUMMARY_QUERY);

  if (loading) return <ProgressionSkeleton />;

  const { totalExercises, improving, stable, declining, recentPRs } = data.progressionSummary;

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-bold mb-4">Progressive Overload</h3>

      {/* Trend Summary */}
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2 text-green-500">
          <TrendingUp size={20} />
          <span>{improving} improving</span>
        </div>
        <div className="flex items-center gap-2 text-yellow-500">
          <Minus size={20} />
          <span>{stable} stable</span>
        </div>
        <div className="flex items-center gap-2 text-red-500">
          <TrendingDown size={20} />
          <span>{declining} declining</span>
        </div>
      </div>

      {/* Recent PRs */}
      {recentPRs.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Trophy className="text-yellow-500" size={16} />
            Recent PRs
          </h4>
          <ul className="space-y-1">
            {recentPRs.map((pr, i) => (
              <li key={i} className="text-sm">
                {pr.exerciseName}: {pr.value} lbs ({pr.type})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

**ExerciseProgressChart.jsx:**
```jsx
import { LineChart } from '../d3/visualizations/LineChartD3';

export function ExerciseProgressChart({ exerciseId }) {
  const { data } = useQuery(EXERCISE_HISTORY_QUERY, {
    variables: { exerciseId }
  });

  if (!data) return null;

  const chartData = data.exerciseHistory.history.map(h => ({
    date: new Date(h.date),
    weight: h.weight,
    volume: h.volume,
    e1RM: h.estimatedOneRepMax
  }));

  return (
    <div className="glass-card p-4">
      <h4 className="font-semibold mb-2">{data.exerciseHistory.exerciseName}</h4>

      <LineChart
        data={chartData}
        xKey="date"
        yKey="weight"
        color="#0066FF"
        showArea
        showDots
        height={200}
      />

      {/* Personal Records */}
      <div className="grid grid-cols-3 gap-2 mt-4 text-center text-sm">
        <div>
          <div className="text-gray-400">Max Weight</div>
          <div className="font-bold">{data.exerciseHistory.personalRecords.maxWeight.value} lbs</div>
        </div>
        <div>
          <div className="text-gray-400">Max Volume</div>
          <div className="font-bold">{data.exerciseHistory.personalRecords.maxVolume.value}</div>
        </div>
        <div>
          <div className="text-gray-400">Est. 1RM</div>
          <div className="font-bold">{data.exerciseHistory.personalRecords.estimated1RM.value} lbs</div>
        </div>
      </div>
    </div>
  );
}
```

**RecommendationCard.jsx (Show in Workout):**
```jsx
export function RecommendationCard({ exerciseId, onAccept }) {
  const { data } = useQuery(EXERCISE_RECOMMENDATION_QUERY, {
    variables: { exerciseId }
  });

  if (!data) return null;

  const { recommendation, lastWorkout } = data.exerciseProgression;

  const typeColors = {
    increase_weight: 'text-green-500',
    increase_reps: 'text-blue-500',
    increase_sets: 'text-purple-500',
    maintain: 'text-yellow-500',
    deload: 'text-orange-500'
  };

  return (
    <div className="bg-white/5 rounded-lg p-3">
      <div className={`text-sm font-semibold ${typeColors[recommendation.type]}`}>
        {recommendation.type === 'increase_weight' && '↑ Increase Weight'}
        {recommendation.type === 'increase_reps' && '↑ Increase Reps'}
        {recommendation.type === 'maintain' && '→ Maintain'}
        {recommendation.type === 'deload' && '↓ Deload'}
      </div>

      <div className="text-lg font-bold mt-1">
        {recommendation.suggestedWeight} lbs × {recommendation.suggestedReps} reps
      </div>

      <div className="text-xs text-gray-400 mt-1">
        {recommendation.reasoning}
      </div>

      {lastWorkout && (
        <div className="text-xs text-gray-500 mt-2">
          Last time: {lastWorkout.weight} lbs × {lastWorkout.reps} reps
        </div>
      )}

      <button
        onClick={() => onAccept(recommendation)}
        className="mt-2 px-3 py-1 bg-blue-600 rounded text-sm"
      >
        Use Suggestion
      </button>
    </div>
  );
}
```

#### Phase 4.4: Workout Page Integration (Day 5)

**Update Workout.jsx:**
```jsx
// Add to exercise card in workout:
import { RecommendationCard } from '../components/Progression/RecommendationCard';

// In exercise entry section:
{showRecommendation && (
  <RecommendationCard
    exerciseId={exercise.id}
    onAccept={(rec) => {
      setWeight(rec.suggestedWeight);
      setReps(rec.suggestedReps);
      setSets(rec.suggestedSets);
      setShowRecommendation(false);
    }}
  />
)}

// Add "Beat Last Time" indicator:
{lastWorkoutForExercise && (
  <div className="text-sm text-gray-400">
    Last: {lastWorkoutForExercise.weight} × {lastWorkoutForExercise.reps}
    {currentWeight > lastWorkoutForExercise.weight && (
      <span className="text-green-500 ml-2">PR!</span>
    )}
  </div>
)}
```

**Add PR Celebration:**
```jsx
// When logging a set that beats PR:
if (isNewPR) {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
  toast.success('🏆 New Personal Record!');
}
```

### Acceptance Criteria
- [ ] Exercise history tracked with weight/reps/sets
- [ ] Personal records calculated (max weight, volume, e1RM)
- [ ] Progression trends analyzed (improving/stable/declining)
- [ ] Smart recommendations generated (increase weight/reps/deload)
- [ ] Dashboard shows progression summary
- [ ] Exercise detail shows progress chart
- [ ] Workout page shows "beat last time" targets
- [ ] PR celebrations trigger on new records
- [ ] E2E tests pass

---

## Timeline Summary

```
Week 1:
├── Days 1-2: Career Readiness Backend Routes + GraphQL
├── Days 3-4: Career Readiness Frontend Pages
└── Day 5: Career Readiness Integration + Polish

Week 2:
├── Days 1-2: Achievement Verification Completion (all 3 TODOs)
├── Days 3-4: Progressive Overload Backend + Service
└── Day 5: Progressive Overload Frontend Components

Week 3:
├── Days 1-2: Workout Templates Database + Backend Service
├── Days 3-4: Workout Templates HTTP Routes
└── Day 5: Workout Templates Frontend (Browser)

Week 4:
├── Days 1-2: Workout Templates Frontend (Editor, Detail)
├── Days 3-4: Integration, Share Links, Deep Links
└── Day 5: E2E Tests, Documentation, Deploy
```

## Dependencies & Prerequisites

### Technical Prerequisites
- [ ] ffmpeg installed on production server (`apt install ffmpeg`)
- [ ] Push notification service configured (for verification notifications)

### Database Migrations
1. `053_workout_templates.ts` - New migration for templates feature

### API Routes to Register
1. `/career/*` - Career readiness routes
2. `/templates/*` - Workout templates routes
3. `/progression/*` - Progressive overload routes

### GraphQL Schema Extensions
1. Career types and queries
2. Template types and queries
3. Progression types and queries

### Frontend Routes to Add
1. `/career-readiness` - Career dashboard
2. `/career-readiness/:goalId` - Goal detail
3. `/templates` - Template browser
4. `/templates/mine` - My templates
5. `/templates/:id` - Template detail
6. `/progression` - Progression dashboard
7. `/progression/:exerciseId` - Exercise detail

## Testing Requirements

### E2E Test Additions
1. Career readiness test suite
2. Verification test suite
3. Templates test suite
4. Progression test suite

### Manual Testing Checklist
- [ ] Career goal creation and readiness calculation
- [ ] Video upload with thumbnail generation
- [ ] Notification delivery (witness, verification result)
- [ ] Template creation, browsing, forking, sharing
- [ ] Progressive overload recommendations accuracy
- [ ] PR detection and celebration
- [ ] Mobile responsiveness for all new pages

---

## Post-Implementation

### Documentation Updates
- [ ] Update API documentation with new endpoints
- [ ] Add feature guides to docs/
- [ ] Update CLAUDE.md with new patterns

### Deployment Checklist
- [ ] Run `pnpm build:all`
- [ ] Run `pnpm typecheck`
- [ ] Run `pnpm test`
- [ ] Run `pnpm test:e2e:api`
- [ ] Deploy with `./deploy.sh`
- [ ] Run production migrations
- [ ] Verify on live site

---

*End of Implementation Plan*
