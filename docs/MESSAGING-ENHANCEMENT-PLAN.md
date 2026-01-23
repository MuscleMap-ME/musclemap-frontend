# MuscleMap Messaging System Enhancement Plan

**Version:** 2.0
**Status:** Planning
**Author:** Claude Code
**Date:** 2026-01-22

---

## Executive Summary

This plan outlines a comprehensive enhancement of MuscleMap's messaging system to transform it from a functional messaging feature into a robust, powerful, and feature-rich communication platform. The enhancements are organized into phases based on user impact, technical complexity, and dependencies.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Enhancement Categories](#2-enhancement-categories)
3. [Phase 1: Core Reliability & UX](#3-phase-1-core-reliability--ux)
4. [Phase 2: Rich Messaging Features](#4-phase-2-rich-messaging-features)
5. [Phase 3: Social & Engagement](#5-phase-3-social--engagement)
6. [Phase 4: Advanced Features](#6-phase-4-advanced-features)
7. [Phase 5: Enterprise & Scale](#7-phase-5-enterprise--scale)
8. [Technical Architecture](#8-technical-architecture)
9. [Database Schema Changes](#9-database-schema-changes)
10. [API Enhancements](#10-api-enhancements)
11. [Security Considerations](#11-security-considerations)
12. [Performance Optimization](#12-performance-optimization)
13. [Implementation Priority Matrix](#13-implementation-priority-matrix)
14. [Success Metrics](#14-success-metrics)

---

## 1. Current State Analysis

### What's Working Well

| Feature | Status | Quality |
|---------|--------|---------|
| Direct 1:1 messaging | ✅ | Solid |
| Group conversations | ✅ | Solid |
| Message history (cursor pagination) | ✅ | Excellent |
| Read receipts | ✅ | Basic |
| User blocking | ✅ | Complete |
| Soft delete messages | ✅ | Good |
| Reply threading (reply_to_id) | ✅ | Schema only |
| Message attachments | ✅ | Schema only |
| WebSocket real-time | ✅ | Basic |
| GraphQL subscriptions | ✅ | Basic |
| Privacy controls | ✅ | Good |

### Critical Gaps

| Missing Feature | User Impact | Priority |
|----------------|-------------|----------|
| Typing indicators | High | P0 |
| Message editing | High | P0 |
| Delivery receipts | Medium | P1 |
| Message reactions | High | P1 |
| Message search | High | P1 |
| Presence indicators (online/offline) | High | P1 |
| Voice messages | Medium | P2 |
| Rate limiting enforcement | Critical (security) | P0 |
| Push notifications | Critical | P0 |

---

## 2. Enhancement Categories

### Category A: Real-Time Experience
- Typing indicators
- Presence (online/offline/away)
- Delivery receipts
- Live message updates

### Category B: Rich Media
- Voice messages
- Image galleries
- File sharing improvements
- GIF/sticker support
- Link previews

### Category C: Message Features
- Message editing
- Message reactions (emoji)
- Message pinning
- Message forwarding
- Message search
- Scheduled messages

### Category D: Conversation Management
- Conversation archiving
- Starred conversations
- Mute/notification controls
- Conversation folders/labels
- Conversation search

### Category E: Group Features
- Admin/moderator roles
- Member management
- Group settings
- Announcements
- Polls

### Category F: Security & Privacy
- End-to-end encryption (E2EE)
- Disappearing messages
- Message reporting
- Spam detection
- Rate limiting

### Category G: Integrations
- Push notifications
- Email notifications
- Workout sharing
- Achievement sharing
- Profile card sharing

---

## 3. Phase 1: Core Reliability & UX

**Timeline:** 2-3 weeks
**Focus:** Essential features users expect from any modern messaging app

### 3.1 Typing Indicators

**Description:** Show when a user is typing in a conversation.

**Database Changes:**
```sql
-- No persistent storage needed - use Redis for ephemeral state
-- Redis key pattern: typing:{conversationId}:{userId}
-- TTL: 5 seconds (auto-expire)
```

**API Changes:**
```graphql
# New mutation
mutation SetTypingStatus($conversationId: ID!, $isTyping: Boolean!) {
  setTypingStatus(conversationId: $conversationId, isTyping: $isTyping): Boolean!
}

# New subscription
subscription TypingIndicator($conversationId: ID!) {
  typingIndicator(conversationId: $conversationId) {
    userId
    username
    avatarUrl
    isTyping
  }
}
```

**Implementation:**
1. Frontend debounces typing events (every 2 seconds while typing)
2. Backend publishes to Redis pub/sub channel `typing:{conversationId}`
3. Redis key auto-expires after 5 seconds (user stopped typing)
4. Subscription delivers typing status to other participants

**Frontend UX:**
- Show "John is typing..." below last message
- For groups: "John, Jane are typing..." (max 3 names, then "3 people are typing...")
- Animated dots indicator

### 3.2 Message Editing

**Description:** Allow users to edit sent messages within a time window.

**Database Changes:**
```sql
-- Already have edited_at column, add:
ALTER TABLE messages ADD COLUMN original_content TEXT;
ALTER TABLE messages ADD COLUMN edit_count INTEGER DEFAULT 0;
```

**API Changes:**
```graphql
# New mutation
mutation EditMessage($messageId: ID!, $content: String!) {
  editMessage(messageId: $messageId, content: $content): Message!
}
```

**Business Rules:**
- Can only edit own messages
- 15-minute edit window (configurable)
- Max 5 edits per message
- Original content preserved for audit
- "(edited)" indicator shown in UI
- Real-time update via subscription

### 3.3 Delivery Receipts

**Description:** Three-state message status: Sent → Delivered → Read

**Database Changes:**
```sql
CREATE TABLE message_receipts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(message_id, user_id)
);

CREATE INDEX idx_receipts_message ON message_receipts(message_id);
CREATE INDEX idx_receipts_user ON message_receipts(user_id);
```

**Status Flow:**
1. **Sent:** Message stored in DB
2. **Delivered:** Recipient's device acknowledges receipt (WebSocket ack)
3. **Read:** Recipient views the message

**UI Indicators:**
- Single grey check: Sent
- Single blue check: Delivered
- Double blue check: Read
- For groups: "Read by 3 of 5" tooltip

### 3.4 Presence System (Online/Offline/Away)

**Description:** Real-time user presence indicators.

**Redis Structure:**
```
presence:{userId} = {
  status: "online" | "away" | "offline",
  lastSeen: timestamp,
  device: "web" | "mobile" | "desktop"
}
TTL: 60 seconds (heartbeat refresh)
```

**API Changes:**
```graphql
type UserPresence {
  userId: ID!
  status: PresenceStatus!
  lastSeen: DateTime
}

enum PresenceStatus {
  ONLINE
  AWAY
  OFFLINE
}

subscription UserPresence($userIds: [ID!]!) {
  userPresence(userIds: $userIds) {
    userId
    status
    lastSeen
  }
}
```

**Implementation:**
1. Frontend sends heartbeat every 30 seconds
2. Backend updates Redis with TTL
3. Presence changes published to subscribers
4. "Away" status after 5 minutes of inactivity
5. "Offline" after Redis key expires

**Privacy Controls:**
- Users can opt to hide presence ("Appear offline")
- Users can choose who sees their presence (Everyone/Followers/No one)

### 3.5 Push Notifications

**Description:** Mobile and web push notifications for new messages.

**Database Changes:**
```sql
CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  device_type TEXT DEFAULT 'web',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, endpoint)
);

CREATE TABLE notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  messaging_enabled BOOLEAN DEFAULT true,
  messaging_sound BOOLEAN DEFAULT true,
  messaging_preview BOOLEAN DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Implementation:**
1. Web Push API integration (VAPID keys)
2. Firebase Cloud Messaging for mobile
3. Notification queue with Redis
4. Batching (don't spam for rapid messages)
5. Quiet hours respect

### 3.6 Rate Limiting Enforcement

**Description:** Enforce the 0.1 credit cost per message recipient.

**Implementation:**
```typescript
// Before sending message
const recipientCount = conversation.participants.length - 1;
const cost = recipientCount * 0.1;

if (user.creditBalance < cost) {
  throw new GraphQLError('Insufficient credits', {
    extensions: { code: 'INSUFFICIENT_CREDITS', required: cost }
  });
}

// Deduct credits atomically
await db('users')
  .where('id', userId)
  .decrement('credit_balance', cost);

// Log transaction
await db('credit_transactions').insert({
  user_id: userId,
  amount: -cost,
  type: 'message_send',
  metadata: { conversationId, recipientCount }
});
```

**Additional Limits:**
- Max 60 messages per minute per user
- Max 20 new conversations per day
- Max 50 participants per group
- Spam detection (identical messages)

---

## 4. Phase 2: Rich Messaging Features

**Timeline:** 3-4 weeks
**Focus:** Features that make messaging more expressive and useful

### 4.1 Message Reactions (Emoji)

**Description:** React to messages with emojis like Slack/Discord.

**Database Changes:**
```sql
CREATE TABLE message_reactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,  -- Unicode emoji or custom emoji ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX idx_reactions_message ON message_reactions(message_id);
CREATE INDEX idx_reactions_user ON message_reactions(user_id);
```

**API Changes:**
```graphql
mutation AddReaction($messageId: ID!, $emoji: String!) {
  addReaction(messageId: $messageId, emoji: $emoji): Message!
}

mutation RemoveReaction($messageId: ID!, $emoji: String!) {
  removeReaction(messageId: $messageId, emoji: $emoji): Message!
}

type Message {
  # ... existing fields
  reactions: [ReactionGroup!]!
}

type ReactionGroup {
  emoji: String!
  count: Int!
  users: [User!]!
  hasReacted: Boolean!  # Current user has this reaction
}
```

**UX:**
- Quick reaction picker (5-6 common emojis)
- Full emoji picker on "+"
- Show reaction counts under message
- Tap reaction to see who reacted
- Tap own reaction to toggle off

### 4.2 Message Search

**Description:** Full-text search across all messages.

**Database Changes:**
```sql
-- Add full-text search vector
ALTER TABLE messages ADD COLUMN search_vector tsvector;

-- Create GIN index for fast search
CREATE INDEX idx_messages_search ON messages USING GIN(search_vector);

-- Trigger to auto-update search vector
CREATE OR REPLACE FUNCTION messages_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_search_trigger
  BEFORE INSERT OR UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION messages_search_update();

-- Backfill existing messages
UPDATE messages SET search_vector = to_tsvector('english', COALESCE(content, ''));
```

**API Changes:**
```graphql
type MessageSearchResult {
  message: Message!
  conversation: Conversation!
  highlights: [String!]!  # Matching text snippets
  score: Float!
}

query SearchMessages(
  $query: String!
  $conversationId: ID
  $limit: Int
  $offset: Int
): MessageSearchConnection! {
  searchMessages(
    query: $query
    conversationId: $conversationId
    limit: $limit
    offset: $offset
  ) {
    nodes: [MessageSearchResult!]!
    totalCount: Int!
    hasMore: Boolean!
  }
}
```

**Features:**
- Search within specific conversation or all conversations
- Highlight matching terms
- Date range filters
- From specific user filter
- Jump to message in context

### 4.3 Voice Messages

**Description:** Record and send audio messages.

**Database Changes:**
```sql
-- Extend message_attachments for audio
-- content_type = 'audio'
-- Add duration column
ALTER TABLE message_attachments ADD COLUMN duration_seconds INTEGER;
ALTER TABLE message_attachments ADD COLUMN waveform JSONB;  -- Audio waveform data for visualization
```

**Implementation:**
1. Frontend uses MediaRecorder API
2. Upload to S3/R2 (same as image attachments)
3. Generate waveform visualization data
4. Store audio URL in message_attachments
5. Playback with custom audio player

**Features:**
- Max 2 minutes per voice message
- Audio waveform visualization
- Playback speed control (1x, 1.5x, 2x)
- Continue playback when navigating
- Voice-to-text transcription (future)

### 4.4 Link Previews

**Description:** Rich previews for shared URLs.

**Database Changes:**
```sql
CREATE TABLE link_previews (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  image_url TEXT,
  site_name TEXT,
  favicon_url TEXT,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX idx_link_previews_url ON link_previews(url);
CREATE INDEX idx_link_previews_expires ON link_previews(expires_at);
```

**Implementation:**
1. Parse URLs from message content
2. Check cache for existing preview
3. If not cached, queue background job to fetch Open Graph metadata
4. Store in link_previews table
5. Return preview data with message

**Metadata Fetched:**
- `og:title`
- `og:description`
- `og:image`
- `og:site_name`
- Favicon

### 4.5 GIF & Sticker Support

**Description:** Integrate GIF search and custom stickers.

**Implementation:**
```typescript
// GIF search via Tenor/GIPHY API
const searchGifs = async (query: string) => {
  const response = await fetch(
    `https://tenor.googleapis.com/v2/search?q=${query}&key=${TENOR_API_KEY}&limit=20`
  );
  return response.json();
};
```

**Database for Custom Stickers:**
```sql
CREATE TABLE sticker_packs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  creator_id TEXT REFERENCES users(id),
  is_official BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE stickers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id TEXT NOT NULL REFERENCES sticker_packs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  emoji_shortcode TEXT,  -- :muscle: maps to this sticker
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_sticker_packs (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL REFERENCES sticker_packs(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY(user_id, pack_id)
);
```

### 4.6 Message Forwarding

**Description:** Forward messages to other conversations.

**API Changes:**
```graphql
mutation ForwardMessage(
  $messageId: ID!
  $toConversationIds: [ID!]!
  $addComment: String
): [Message!]!
```

**Implementation:**
- Copy message content to new conversations
- Add "Forwarded from [conversation/user]" attribution
- Optional comment above forwarded message
- Preserve attachments (reference same files)

### 4.7 Message Pinning

**Description:** Pin important messages in a conversation.

**Database Changes:**
```sql
ALTER TABLE messages ADD COLUMN pinned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE messages ADD COLUMN pinned_by TEXT REFERENCES users(id);

CREATE INDEX idx_messages_pinned ON messages(conversation_id, pinned_at)
WHERE pinned_at IS NOT NULL;
```

**Limits:**
- Max 10 pinned messages per conversation
- Only conversation owner/moderators can pin
- Pinned messages shown in dedicated section

---

## 5. Phase 3: Social & Engagement

**Timeline:** 3-4 weeks
**Focus:** Features that increase engagement and social interaction

### 5.1 Workout Sharing in Messages

**Description:** Share workout sessions directly in chat.

**Implementation:**
```graphql
mutation ShareWorkout($conversationId: ID!, $workoutId: ID!) {
  shareWorkout(conversationId: $conversationId, workoutId: $workoutId): Message!
}
```

**Message Card Display:**
- Workout type and date
- Duration
- Total volume/sets/reps
- Key exercises
- "View Details" button
- "High Five" quick action

### 5.2 Achievement Sharing

**Description:** Share unlocked achievements with friends.

**Implementation:**
```graphql
mutation ShareAchievement($conversationId: ID!, $achievementId: ID!) {
  shareAchievement(conversationId: $conversationId, achievementId: $achievementId): Message!
}
```

**Message Card Display:**
- Achievement badge with animation
- Achievement name and description
- Rarity indicator
- "Congrats!" reaction quick actions

### 5.3 Challenge Invites

**Description:** Invite friends to challenges via messaging.

**Implementation:**
```graphql
mutation SendChallengeInvite($conversationId: ID!, $challengeId: ID!) {
  sendChallengeInvite(conversationId: $conversationId, challengeId: $challengeId): Message!
}
```

**Message Card:**
- Challenge details
- Accept/Decline buttons
- Participant count
- End date countdown

### 5.4 Profile Cards

**Description:** Send user profile cards that can be clicked to view full profile.

**Implementation:**
```graphql
mutation ShareProfile($conversationId: ID!, $userId: ID!) {
  shareProfile(conversationId: $conversationId, userId: $userId): Message!
}
```

**Card Display:**
- Avatar
- Username and display name
- Level and archetype
- Key stats (streak, total workouts)
- "View Profile" / "Follow" buttons

### 5.5 Quick High-Fives in Chat

**Description:** Send high-fives directly from message context.

**Implementation:**
- "High Five" button on workout shares
- Animated high-five effect
- Sound effect (optional)
- Credits the sender
- Notifies recipient

---

## 6. Phase 4: Advanced Features

**Timeline:** 4-6 weeks
**Focus:** Power-user features and advanced functionality

### 6.1 Scheduled Messages

**Description:** Schedule messages to be sent at a future time.

**Database Changes:**
```sql
CREATE TABLE scheduled_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text',
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  status TEXT DEFAULT 'pending',  -- pending, sent, cancelled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_scheduled_pending ON scheduled_messages(scheduled_for, status)
WHERE status = 'pending';
```

**Background Job:**
- Run every minute
- Find messages where `scheduled_for <= NOW() AND status = 'pending'`
- Send messages
- Update status to 'sent'

### 6.2 Disappearing Messages

**Description:** Messages that auto-delete after a set time.

**Database Changes:**
```sql
ALTER TABLE conversations ADD COLUMN disappearing_messages_ttl INTEGER;  -- seconds, null = disabled
ALTER TABLE messages ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
```

**Options:**
- Off (default)
- 24 hours
- 7 days
- 30 days
- Custom

**Implementation:**
- Background job deletes expired messages
- UI shows countdown for messages about to expire
- Setting controlled per-conversation

### 6.3 Message Translation

**Description:** Auto-translate messages to user's preferred language.

**Implementation:**
```graphql
type Message {
  # ... existing fields
  originalLanguage: String
  translations: [MessageTranslation!]
}

type MessageTranslation {
  language: String!
  content: String!
}

mutation TranslateMessage($messageId: ID!, $targetLanguage: String!) {
  translateMessage(messageId: $messageId, targetLanguage: $targetLanguage): Message!
}
```

**Features:**
- Auto-detect source language
- One-click translation
- Cache translations
- Support major languages (EN, ES, FR, DE, PT, ZH, JA, KO)

### 6.4 Read-Aloud (Accessibility)

**Description:** Text-to-speech for messages.

**Implementation:**
- Use Web Speech API
- "Read aloud" button on messages
- Voice selection in settings
- Reading speed control

### 6.5 Smart Replies

**Description:** AI-suggested quick replies based on message context.

**Implementation:**
```graphql
query GetSmartReplies($messageId: ID!) {
  smartReplies(messageId: $messageId): [String!]!
}
```

**Suggestions:**
- "Nice workout!"
- "Let's train together"
- "Congrats on the PR!"
- Context-aware based on shared content type

### 6.6 Message Templates

**Description:** Save and reuse common message templates.

**Database Changes:**
```sql
CREATE TABLE message_templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  shortcut TEXT,  -- e.g., /workout triggers template
  category TEXT,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 7. Phase 5: Enterprise & Scale

**Timeline:** 6-8 weeks
**Focus:** Features for teams, trainers, and large-scale deployment

### 7.1 End-to-End Encryption (E2EE)

**Description:** Optional E2EE for privacy-conscious users.

**Implementation:**
- Signal Protocol (libsignal)
- Device key pairs
- Session establishment
- Message encryption/decryption on client
- Key backup and recovery

**Trade-offs:**
- No server-side search in E2EE conversations
- No message editing (immutable)
- Requires all participants to support E2EE

### 7.2 Trainer-Client Messaging

**Description:** Enhanced messaging features for trainer relationships.

**Features:**
- Workout assignment messages
- Progress photo requests (with privacy controls)
- Form check video requests
- Nutrition plan sharing
- Quick feedback templates
- Scheduled check-ins
- Read receipts with priority

### 7.3 Team/Crew Channels

**Description:** Slack-like channels for crews and teams.

**Database Changes:**
```sql
CREATE TABLE channels (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id TEXT REFERENCES crews(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_private BOOLEAN DEFAULT false,
  is_announcement BOOLEAN DEFAULT false,  -- Only admins can post
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE channel_members (
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  notifications TEXT DEFAULT 'all',  -- all, mentions, none
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY(channel_id, user_id)
);
```

### 7.4 Broadcast Messages

**Description:** One-to-many announcements for admins/trainers.

**Features:**
- Bulk message to followers/clients
- No reply (one-way)
- Delivery analytics
- Scheduling
- Rate limits to prevent spam

### 7.5 Message Analytics

**Description:** Analytics for trainers and community managers.

**Metrics:**
- Response rate
- Average response time
- Most active conversations
- Peak messaging times
- Message volume trends

### 7.6 Conversation Export

**Description:** Export conversation history for record-keeping.

**Formats:**
- JSON (structured)
- PDF (formatted)
- CSV (spreadsheet)

**Privacy:**
- Only own conversations
- Participant consent for groups
- Excludes deleted messages

---

## 8. Technical Architecture

### 8.1 Real-Time Infrastructure

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Client    │────▶│  API Gateway    │────▶│   Redis Pub/Sub │
│  (WebSocket)    │◀────│  (Fastify WS)   │◀────│   (Channels)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │                        │
                                ▼                        ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │   PostgreSQL    │     │  Redis Cache    │
                        │   (Messages)    │     │  (Presence,     │
                        └─────────────────┘     │   Typing, etc.) │
                                                └─────────────────┘
```

### 8.2 Message Flow

```
1. User sends message
   │
   ▼
2. API validates (auth, rate limit, credits)
   │
   ▼
3. Store in PostgreSQL
   │
   ▼
4. Publish to Redis pub/sub
   │
   ▼
5. WebSocket server broadcasts to participants
   │
   ▼
6. Queue push notifications for offline users
   │
   ▼
7. Update conversation metadata (last_message_at)
```

### 8.3 Subscription Channels

| Channel | Purpose | Data |
|---------|---------|------|
| `message:{conversationId}` | New messages | Message object |
| `typing:{conversationId}` | Typing indicators | userId, isTyping |
| `presence:{userId}` | User presence | status, lastSeen |
| `conversation:{userId}` | Conversation updates | Conversation object |
| `reaction:{messageId}` | Message reactions | reaction object |

---

## 9. Database Schema Changes

### New Tables Summary

| Table | Purpose | Phase |
|-------|---------|-------|
| `message_receipts` | Delivery/read receipts | 1 |
| `push_subscriptions` | Web push endpoints | 1 |
| `notification_preferences` | User notification settings | 1 |
| `message_reactions` | Emoji reactions | 2 |
| `link_previews` | URL preview cache | 2 |
| `sticker_packs` | Custom sticker packs | 2 |
| `stickers` | Individual stickers | 2 |
| `user_sticker_packs` | User's sticker collections | 2 |
| `scheduled_messages` | Scheduled sends | 4 |
| `message_templates` | Saved templates | 4 |
| `channels` | Crew channels | 5 |
| `channel_members` | Channel membership | 5 |

### Column Additions

```sql
-- messages table
ALTER TABLE messages ADD COLUMN original_content TEXT;
ALTER TABLE messages ADD COLUMN edit_count INTEGER DEFAULT 0;
ALTER TABLE messages ADD COLUMN search_vector tsvector;
ALTER TABLE messages ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE messages ADD COLUMN pinned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE messages ADD COLUMN pinned_by TEXT REFERENCES users(id);

-- message_attachments table
ALTER TABLE message_attachments ADD COLUMN duration_seconds INTEGER;
ALTER TABLE message_attachments ADD COLUMN waveform JSONB;

-- conversations table
ALTER TABLE conversations ADD COLUMN disappearing_messages_ttl INTEGER;
ALTER TABLE conversations ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE conversations ADD COLUMN starred BOOLEAN DEFAULT false;

-- users table
ALTER TABLE users ADD COLUMN presence_visible BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE;
```

---

## 10. API Enhancements

### New GraphQL Mutations

| Mutation | Phase | Description |
|----------|-------|-------------|
| `setTypingStatus` | 1 | Update typing indicator |
| `editMessage` | 1 | Edit sent message |
| `acknowledgeDelivery` | 1 | Mark message delivered |
| `registerPushSubscription` | 1 | Register push endpoint |
| `updateNotificationPreferences` | 1 | Update notification settings |
| `addReaction` | 2 | Add emoji reaction |
| `removeReaction` | 2 | Remove emoji reaction |
| `sendVoiceMessage` | 2 | Upload voice message |
| `forwardMessage` | 2 | Forward to conversations |
| `pinMessage` | 2 | Pin message |
| `unpinMessage` | 2 | Unpin message |
| `shareWorkout` | 3 | Share workout in chat |
| `shareAchievement` | 3 | Share achievement in chat |
| `sendChallengeInvite` | 3 | Invite to challenge |
| `shareProfile` | 3 | Share user profile card |
| `scheduleMessage` | 4 | Schedule future message |
| `cancelScheduledMessage` | 4 | Cancel scheduled message |
| `setDisappearingMessages` | 4 | Set conversation TTL |
| `translateMessage` | 4 | Translate message content |
| `saveMessageTemplate` | 4 | Save template |
| `createChannel` | 5 | Create crew channel |
| `sendBroadcast` | 5 | Send broadcast message |

### New GraphQL Subscriptions

| Subscription | Phase | Description |
|--------------|-------|-------------|
| `typingIndicator` | 1 | Typing status updates |
| `userPresence` | 1 | User online/offline status |
| `messageDelivered` | 1 | Delivery confirmations |
| `reactionAdded` | 2 | New reactions on messages |
| `messagePinned` | 2 | Pinned message updates |

### New GraphQL Queries

| Query | Phase | Description |
|-------|-------|-------------|
| `searchMessages` | 2 | Full-text message search |
| `getPinnedMessages` | 2 | Get pinned messages |
| `getSmartReplies` | 4 | AI-suggested replies |
| `getScheduledMessages` | 4 | User's scheduled messages |
| `getMessageTemplates` | 4 | User's saved templates |
| `getChannels` | 5 | Get crew channels |
| `getConversationAnalytics` | 5 | Message analytics |

---

## 11. Security Considerations

### 11.1 Rate Limiting

| Action | Limit | Window |
|--------|-------|--------|
| Send message | 60 | per minute |
| Create conversation | 20 | per day |
| Add reaction | 30 | per minute |
| Edit message | 10 | per hour |
| Search messages | 30 | per minute |
| Upload attachment | 20 | per hour |

### 11.2 Content Security

- **Sanitization:** All message content sanitized before storage
- **File validation:** Attachments scanned for malware
- **Image moderation:** NSFW detection on images
- **Spam detection:** Pattern matching for spam content
- **Link safety:** URL scanning for malicious links

### 11.3 Privacy Controls

| Setting | Options | Default |
|---------|---------|---------|
| Who can message me | Everyone / Followers / No one | Everyone |
| Show online status | Everyone / Followers / No one | Followers |
| Show read receipts | On / Off | On |
| Show typing indicator | On / Off | On |
| Allow message requests | On / Off | On |

### 11.4 Reporting System

```sql
CREATE TABLE message_reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL REFERENCES messages(id),
  reporter_id TEXT NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,  -- spam, harassment, inappropriate, other
  details TEXT,
  status TEXT DEFAULT 'pending',  -- pending, reviewed, actioned, dismissed
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  action_taken TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 12. Performance Optimization

### 12.1 Database Indexes

```sql
-- Phase 1: Core performance indexes
CREATE INDEX CONCURRENTLY idx_receipts_unread
ON message_receipts(user_id, message_id)
WHERE read_at IS NULL;

-- Phase 2: Search optimization
CREATE INDEX CONCURRENTLY idx_messages_search
ON messages USING GIN(search_vector);

-- Reaction aggregation
CREATE INDEX CONCURRENTLY idx_reactions_count
ON message_reactions(message_id, emoji);

-- Scheduled messages
CREATE INDEX CONCURRENTLY idx_scheduled_pending
ON scheduled_messages(scheduled_for, status)
WHERE status = 'pending';
```

### 12.2 Caching Strategy

| Data | Cache Location | TTL |
|------|---------------|-----|
| Typing indicators | Redis | 5s |
| Presence status | Redis | 60s |
| Link previews | PostgreSQL + Redis | 7 days |
| Sticker packs | Redis | 1 hour |
| Smart replies | Redis | 5 minutes |
| Unread counts | Redis | 30 seconds |

### 12.3 Query Optimization

```typescript
// Batch load participants with DataLoader
const participantsLoader = new DataLoader(async (conversationIds) => {
  const participants = await db('conversation_participants')
    .join('users', 'conversation_participants.user_id', 'users.id')
    .whereIn('conversation_id', conversationIds)
    .select('conversation_participants.*', 'users.username', 'users.avatar_url');

  return conversationIds.map(id =>
    participants.filter(p => p.conversation_id === id)
  );
});
```

### 12.4 Pagination

All list endpoints use keyset pagination:
```typescript
// Cursor-based pagination for messages
const cursor = { createdAt: lastMessage.createdAt, id: lastMessage.id };
const nextPage = await db('messages')
  .where('conversation_id', conversationId)
  .where(function() {
    this.where('created_at', '<', cursor.createdAt)
      .orWhere(function() {
        this.where('created_at', '=', cursor.createdAt)
          .andWhere('id', '<', cursor.id);
      });
  })
  .orderBy([
    { column: 'created_at', order: 'desc' },
    { column: 'id', order: 'desc' }
  ])
  .limit(50);
```

---

## 13. Implementation Priority Matrix

### P0: Critical (Phase 1) - Must Have

| Feature | Effort | Impact | Dependencies |
|---------|--------|--------|--------------|
| Typing indicators | 1 week | High | Redis |
| Message editing | 3 days | High | None |
| Delivery receipts | 1 week | Medium | WebSocket |
| Presence system | 1 week | High | Redis |
| Push notifications | 2 weeks | Critical | VAPID keys |
| Rate limiting | 3 days | Critical | None |

### P1: High (Phase 2) - Should Have

| Feature | Effort | Impact | Dependencies |
|---------|--------|--------|--------------|
| Message reactions | 1 week | High | None |
| Message search | 2 weeks | High | Full-text indexes |
| Voice messages | 2 weeks | Medium | S3/R2 storage |
| Link previews | 1 week | Medium | Background jobs |
| GIF support | 3 days | Medium | Tenor API |
| Message forwarding | 3 days | Low | None |
| Message pinning | 2 days | Low | None |

### P2: Medium (Phase 3) - Nice to Have

| Feature | Effort | Impact | Dependencies |
|---------|--------|--------|--------------|
| Workout sharing | 1 week | High | Workout module |
| Achievement sharing | 3 days | Medium | Achievement module |
| Challenge invites | 1 week | High | Competition module |
| Profile cards | 2 days | Low | None |
| High-fives in chat | 2 days | Medium | High-five module |

### P3: Low (Phase 4-5) - Future

| Feature | Effort | Impact | Dependencies |
|---------|--------|--------|--------------|
| Scheduled messages | 1 week | Low | Background jobs |
| Disappearing messages | 1 week | Low | Background jobs |
| Message translation | 2 weeks | Medium | Translation API |
| Smart replies | 2 weeks | Medium | AI/ML |
| E2EE | 4 weeks | Low | libsignal |
| Team channels | 3 weeks | Medium | Crew module |

---

## 14. Success Metrics

### Engagement Metrics

| Metric | Current Baseline | Target (6 months) |
|--------|------------------|-------------------|
| Daily messages sent | TBD | +50% |
| Users sending messages | TBD | +40% |
| Conversations per user | TBD | +30% |
| Message response rate | TBD | +25% |
| Average response time | TBD | -30% |

### Technical Metrics

| Metric | Target |
|--------|--------|
| Message delivery time | <100ms |
| Typing indicator latency | <50ms |
| Presence update latency | <100ms |
| Search query time | <200ms |
| Push notification delivery | <3s |

### Quality Metrics

| Metric | Target |
|--------|--------|
| Message delivery success rate | 99.9% |
| WebSocket connection stability | 99.5% |
| Push notification delivery rate | 98% |
| Search relevance score | >80% |

---

## Appendix A: Migration Strategy

### Phase 1 Migration Script

```sql
-- 001_messaging_phase1.sql

-- Message receipts for delivery/read tracking
CREATE TABLE message_receipts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(message_id, user_id)
);

CREATE INDEX idx_receipts_message ON message_receipts(message_id);
CREATE INDEX idx_receipts_user ON message_receipts(user_id);
CREATE INDEX idx_receipts_unread ON message_receipts(user_id, message_id)
WHERE read_at IS NULL;

-- Push notification subscriptions
CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  device_type TEXT DEFAULT 'web',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, endpoint)
);

-- Notification preferences
CREATE TABLE notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  messaging_enabled BOOLEAN DEFAULT true,
  messaging_sound BOOLEAN DEFAULT true,
  messaging_preview BOOLEAN DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message editing support
ALTER TABLE messages ADD COLUMN original_content TEXT;
ALTER TABLE messages ADD COLUMN edit_count INTEGER DEFAULT 0;

-- User presence
ALTER TABLE users ADD COLUMN presence_visible BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE;
```

---

## Appendix B: Feature Flag Strategy

```typescript
// Feature flags for gradual rollout
const MESSAGING_FLAGS = {
  TYPING_INDICATORS: 'messaging.typing_indicators',
  MESSAGE_EDITING: 'messaging.message_editing',
  DELIVERY_RECEIPTS: 'messaging.delivery_receipts',
  PRESENCE_SYSTEM: 'messaging.presence_system',
  PUSH_NOTIFICATIONS: 'messaging.push_notifications',
  MESSAGE_REACTIONS: 'messaging.message_reactions',
  MESSAGE_SEARCH: 'messaging.message_search',
  VOICE_MESSAGES: 'messaging.voice_messages',
  LINK_PREVIEWS: 'messaging.link_previews',
  GIF_SUPPORT: 'messaging.gif_support',
  SCHEDULED_MESSAGES: 'messaging.scheduled_messages',
  DISAPPEARING_MESSAGES: 'messaging.disappearing_messages',
  E2E_ENCRYPTION: 'messaging.e2e_encryption',
};

// Rollout percentages
const ROLLOUT_CONFIG = {
  [MESSAGING_FLAGS.TYPING_INDICATORS]: { percentage: 100 },
  [MESSAGING_FLAGS.MESSAGE_REACTIONS]: { percentage: 50 },
  [MESSAGING_FLAGS.VOICE_MESSAGES]: { percentage: 10, tiers: ['premium'] },
};
```

---

## Appendix C: Testing Strategy

### Unit Tests
- Message validation
- Rate limiting logic
- Credit deduction
- Block list enforcement

### Integration Tests
- Message flow (send → store → broadcast)
- WebSocket connections
- Push notification delivery
- Search indexing

### E2E Tests
- Complete messaging flow
- Typing indicators
- Presence updates
- Message reactions

### Load Tests
- 1000 concurrent WebSocket connections
- 100 messages/second throughput
- Search with 1M+ messages

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-22 | Initial plan |

---

## Next Steps

1. **Review & Approve** - Stakeholder review of plan
2. **Phase 1 Sprint Planning** - Break down P0 features into tickets
3. **Infrastructure Setup** - Ensure Redis pub/sub is production-ready
4. **Start Implementation** - Begin with typing indicators (lowest risk, high visibility)
