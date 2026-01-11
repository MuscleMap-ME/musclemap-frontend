# Achievement Verification System - Implementation Plan

## Overview

Add a video verification system for elite achievements where users can submit proof of completing difficult feats (one-arm handstand, freestanding handstand push-ups, full splits, etc.). Another user must publicly attest they witnessed the feat in person.

## User Preferences
- **Storage**: Local VPS storage (`/var/www/musclemap.me/uploads/verifications/`)
- **Review Process**: Witness-only (no admin review required)
- **Scope**: Tiered system - Bronze/Silver optional verification, Gold/Platinum required

## Database Schema

### New Tables (Migration 051)

```sql
-- Add tier to achievement_definitions
ALTER TABLE achievement_definitions
ADD COLUMN tier TEXT DEFAULT 'bronze'
CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond'));

ALTER TABLE achievement_definitions
ADD COLUMN requires_verification BOOLEAN DEFAULT FALSE;

-- Achievement verification submissions
CREATE TABLE achievement_verifications (
  id TEXT PRIMARY KEY DEFAULT 'av_' || replace(gen_random_uuid()::text, '-', ''),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,

  -- Video proof
  video_asset_id TEXT REFERENCES video_assets(id) ON DELETE SET NULL,
  video_url TEXT,  -- Direct URL for local storage
  thumbnail_url TEXT,

  -- Status tracking
  status TEXT DEFAULT 'pending_witness' CHECK (status IN (
    'pending_witness',  -- Waiting for witness attestation
    'verified',         -- Witness confirmed, achievement granted
    'rejected',         -- Witness declined or expired
    'expired'           -- No witness within 30 days
  )),

  -- Metadata
  notes TEXT,  -- User's description of the feat
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Witness attestations
CREATE TABLE achievement_witnesses (
  id TEXT PRIMARY KEY DEFAULT 'aw_' || replace(gen_random_uuid()::text, '-', ''),
  verification_id TEXT NOT NULL REFERENCES achievement_verifications(id) ON DELETE CASCADE,
  witness_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Attestation details
  attestation_text TEXT NOT NULL,  -- "I saw John do a one-arm handstand at..."
  relationship TEXT,  -- How they know the person (friend, gym buddy, trainer, etc.)
  location_description TEXT,  -- Where they witnessed it

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),

  -- Public visibility
  is_public BOOLEAN DEFAULT TRUE,  -- Show witness name on verified achievement

  attested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One witness per verification
  UNIQUE(verification_id)
);

-- Indexes
CREATE INDEX idx_verifications_user ON achievement_verifications(user_id, status);
CREATE INDEX idx_verifications_achievement ON achievement_verifications(achievement_id);
CREATE INDEX idx_verifications_pending ON achievement_verifications(status, expires_at)
  WHERE status = 'pending_witness';
CREATE INDEX idx_witnesses_user ON achievement_witnesses(witness_user_id);
CREATE INDEX idx_witnesses_verification ON achievement_witnesses(verification_id);
```

### Update Existing Achievement Seeds

Add tier and requires_verification to existing achievements:
- Bronze (common, uncommon) - `requires_verification: false`
- Silver (uncommon, rare) - `requires_verification: false`
- Gold (rare, epic) - `requires_verification: true`
- Platinum (epic, legendary) - `requires_verification: true`
- Diamond (legendary, special) - `requires_verification: true`

### New Elite Achievements to Add

```javascript
const eliteAchievements = [
  // Calisthenics mastery - Gold/Platinum tier
  { key: 'one_arm_handstand', name: 'One-Arm Handstand', tier: 'platinum', requires_verification: true, rarity: 'legendary', points: 2000 },
  { key: 'freestanding_hspu', name: 'Freestanding Handstand Push-up', tier: 'gold', requires_verification: true, rarity: 'epic', points: 1000 },
  { key: 'full_front_lever', name: 'Full Front Lever', tier: 'gold', requires_verification: true, rarity: 'epic', points: 800 },
  { key: 'full_back_lever', name: 'Full Back Lever', tier: 'gold', requires_verification: true, rarity: 'rare', points: 600 },
  { key: 'full_planche', name: 'Full Planche', tier: 'platinum', requires_verification: true, rarity: 'legendary', points: 2500 },
  { key: 'iron_cross', name: 'Iron Cross', tier: 'platinum', requires_verification: true, rarity: 'legendary', points: 2000 },
  { key: 'muscle_up_strict', name: 'Strict Muscle-Up', tier: 'silver', requires_verification: false, rarity: 'uncommon', points: 300 },
  { key: 'human_flag', name: 'Human Flag', tier: 'gold', requires_verification: true, rarity: 'epic', points: 1000 },

  // Flexibility - Gold tier
  { key: 'full_front_split', name: 'Full Front Split', tier: 'gold', requires_verification: true, rarity: 'rare', points: 500 },
  { key: 'full_middle_split', name: 'Full Middle Split', tier: 'gold', requires_verification: true, rarity: 'epic', points: 700 },
  { key: 'full_pancake', name: 'Full Pancake', tier: 'gold', requires_verification: true, rarity: 'rare', points: 500 },

  // Strength milestones - Silver/Gold tier
  { key: 'bodyweight_ohp', name: 'Bodyweight Overhead Press', tier: 'gold', requires_verification: true, rarity: 'rare', points: 600 },
  { key: 'double_bodyweight_deadlift', name: '2x Bodyweight Deadlift', tier: 'gold', requires_verification: true, rarity: 'rare', points: 700 },
  { key: 'double_bodyweight_squat', name: '2x Bodyweight Squat', tier: 'gold', requires_verification: true, rarity: 'rare', points: 700 },
];
```

## API Endpoints

### New Routes (`apps/api/src/http/routes/verifications.ts`)

```
POST   /achievements/:id/verify          - Submit verification video
GET    /achievements/:id/verification    - Get verification status for achievement
GET    /me/verifications                 - List my pending/completed verifications
GET    /me/witness-requests              - List witness requests sent to me
POST   /verifications/:id/witness        - Submit witness attestation
DELETE /verifications/:id                - Cancel pending verification
```

### Request/Response Types

```typescript
// Submit verification
POST /achievements/:id/verify
Body: multipart/form-data
  - video: File (mp4, mov, webm - max 50MB, max 60 seconds)
  - notes: string (optional description)
  - witness_user_id: string (user to request as witness)

Response: {
  id: string,
  status: 'pending_witness',
  video_url: string,
  thumbnail_url: string,
  witness: { user_id, username, display_name },
  expires_at: Date
}

// Witness attestation
POST /verifications/:id/witness
Body: {
  confirm: boolean,
  attestation_text: string,  // Required if confirming
  relationship?: string,
  location_description?: string
}

Response: {
  verification_id: string,
  status: 'verified' | 'rejected',
  achievement_granted: boolean,
  achievement?: AchievementEvent
}
```

## Module Implementation

### New Module (`apps/api/src/modules/verification/index.ts`)

```typescript
export const verificationService = {
  // Submit verification with video
  async submitVerification(userId, achievementId, videoFile, witnessUserId, notes),

  // Get user's verifications
  async getUserVerifications(userId, options),

  // Get pending witness requests for user
  async getWitnessRequests(witnessUserId),

  // Submit witness attestation
  async submitWitnessAttestation(verificationId, witnessUserId, attestation),

  // Process verified achievement (grant to user)
  async processVerifiedAchievement(verificationId),

  // Cancel pending verification
  async cancelVerification(verificationId, userId),

  // Expire old verifications (cron job)
  async expireOldVerifications(),

  // Check if achievement requires verification
  async requiresVerification(achievementId),
}
```

## File Storage

### Local VPS Storage Strategy

```
/var/www/musclemap.me/uploads/
└── verifications/
    └── {user_id}/
        └── {verification_id}/
            ├── video.mp4
            └── thumbnail.jpg
```

### Caddy Configuration Update

Add to production Caddyfile:
```
handle /uploads/* {
    root * /var/www/musclemap.me
    file_server
}
```

### Upload Handler

```typescript
// In verification route handler
const uploadDir = `/var/www/musclemap.me/uploads/verifications/${userId}/${verificationId}`;
await fs.mkdir(uploadDir, { recursive: true });
await pipeline(videoStream, fs.createWriteStream(`${uploadDir}/video.mp4`));
// Generate thumbnail with ffmpeg
```

## Frontend Components

### Web (`src/pages/AchievementVerification.jsx`)
- Video upload dropzone
- User search for witness selection
- Verification status tracker
- Witness request inbox

### Mobile (`apps/mobile/app/verification/`)
- Camera/gallery video picker
- Friend selector for witness
- Push notifications for witness requests

### Achievement Display Updates
- Show "Verified ✓" badge on verified achievements
- Display witness name: "Witnessed by @username"
- Link to verification video (optional public viewing)

## Verification Flow

```
1. User views achievement that requires verification
2. User records/uploads video (15-60 seconds)
3. User selects a friend/follower as witness
4. System creates verification record (status: pending_witness)
5. Witness receives notification
6. Witness reviews video + confirms they saw it in person
7. If confirmed:
   - Status → verified
   - Achievement granted to user
   - Witness name displayed publicly
8. If declined or expired:
   - Status → rejected/expired
   - User can resubmit with new video/witness
```

## Implementation Order

### Phase 1: Database & Core Module
1. Create migration `051_achievement_verification.ts`
2. Add tier column to achievement_definitions
3. Create achievement_verifications table
4. Create achievement_witnesses table
5. Seed elite achievements with verification requirements
6. Implement `verificationService` module

### Phase 2: API & File Upload
7. Create upload directory structure
8. Implement video upload handler with size/duration validation
9. Implement thumbnail generation (ffmpeg)
10. Create verification routes
11. Add to server.ts route registration

### Phase 3: Frontend - Web
12. Create AchievementVerification page
13. Add video upload component
14. Add witness selector (user search)
15. Add verification status display
16. Update Achievements page to show verified badges

### Phase 4: Frontend - Mobile
17. Create verification screens
18. Implement video picker
19. Add witness request notifications
20. Update achievement cards with verified status

### Phase 5: Notifications & Polish
21. Add notification when witness request received
22. Add notification when verification approved/rejected
23. Add expiration cron job
24. Update client SDK with verification methods

## Security Considerations

- Validate video file type and size server-side
- Limit video duration to 60 seconds max
- Rate limit verification submissions (max 3 pending per user)
- Witnesses must have verified email
- Witnesses must have been on platform 30+ days
- Users cannot witness their own verifications
- Videos stored in non-public directory, served via authenticated route

## Files to Create/Modify

### New Files
- `apps/api/src/db/migrations/051_achievement_verification.ts`
- `apps/api/src/modules/verification/index.ts`
- `apps/api/src/http/routes/verifications.ts`
- `src/pages/AchievementVerification.jsx`
- `src/components/VideoUpload.jsx`
- `src/components/WitnessSelector.jsx`
- `src/components/VerifiedBadge.jsx`
- `apps/mobile/app/verification/submit.tsx`
- `apps/mobile/app/verification/witness.tsx`
- `packages/client/src/api/verification.ts`

### Modified Files
- `apps/api/src/http/server.ts` - Register verification routes
- `apps/api/src/modules/achievements/index.ts` - Check verification requirements
- `src/pages/Achievements.jsx` - Show verified badges
- `apps/mobile/app/(tabs)/achievements.tsx` - Show verified badges
- `packages/client/src/api/index.ts` - Export verification client
