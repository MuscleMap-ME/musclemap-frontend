/**
 * Mascot Timeline Service
 *
 * Integrates mascot reactions with the user's journey timeline.
 * Generates contextual reactions based on workout events, achievements, etc.
 *
 * Key features:
 * - Automatic reaction generation for timeline events
 * - Context-aware messaging based on mascot personality
 * - Stage-dependent reaction complexity
 * - Cooldown management to prevent reaction spam
 */

import { queryOne, queryAll, query } from '../../db/client';
import { appearanceGeneratorService } from './appearance-generator.service';
import type { MascotBaseTraits } from './appearance-generator.service';
import { loggers } from '../../lib/logger';

const log = loggers.db;

// =====================================================
// TYPES
// =====================================================

export interface MascotTimelineEvent {
  id: string;
  userId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  timestamp: Date;
  importance: 'low' | 'medium' | 'high' | 'epic';
}

export interface MascotReaction {
  id: string;
  eventId: string;
  reactionType: string;
  message: string;
  emote: string;
  animation: string;
  duration: number;
  intensity: number;
  soundEffect: string | null;
  createdAt: Date;
  shown: boolean;
}

export interface TimelineEventWithReaction {
  event: MascotTimelineEvent;
  reaction: MascotReaction | null;
}

// =====================================================
// REACTION TEMPLATES
// =====================================================

interface ReactionTemplate {
  messages: string[];
  emotes: string[];
  animations: string[];
  importance: 'low' | 'medium' | 'high' | 'epic';
}

const REACTION_TEMPLATES: Record<string, ReactionTemplate> = {
  workout_logged: {
    messages: [
      "Great workout! 💪",
      "You crushed it today!",
      "Another one in the books!",
      "Feeling the burn yet?",
      "That's the spirit!",
      "Keep up the momentum!",
    ],
    emotes: ['flex', 'thumbsUp', 'fire', 'star', 'sweat'],
    animations: ['celebrate', 'jump', 'dance'],
    importance: 'medium',
  },
  pr_set: {
    messages: [
      "NEW PERSONAL RECORD! 🎉",
      "You just broke your own record!",
      "UNSTOPPABLE!",
      "Look at you go! New PR!",
      "That's a new best! Incredible!",
      "PR ALERT! You're getting stronger!",
    ],
    emotes: ['trophy', 'explosion', 'crown', 'star', 'rocket'],
    animations: ['jump_excited', 'fireworks', 'victory_pose'],
    importance: 'high',
  },
  streak_hit: {
    messages: [
      "Streak maintained! 🔥",
      "You're on fire! {days} days strong!",
      "Consistency is key, and you've got it!",
      "{days} days in a row! Incredible dedication!",
      "The streak lives on!",
    ],
    emotes: ['fire', 'calendar', 'medal', 'rocket'],
    animations: ['dance', 'celebrate', 'spin'],
    importance: 'medium',
  },
  goal_progress: {
    messages: [
      "Making progress on your goal!",
      "One step closer to your target!",
      "You're {percent}% there!",
      "Keep pushing toward that goal!",
      "Progress detected! Nice work!",
    ],
    emotes: ['target', 'chart', 'thumbsUp', 'muscle'],
    animations: ['nod', 'thumbs_up', 'point'],
    importance: 'low',
  },
  goal_completed: {
    messages: [
      "GOAL ACHIEVED! 🎯",
      "You did it! Goal complete!",
      "Mission accomplished!",
      "Another goal crushed!",
      "Look at you hitting your targets!",
    ],
    emotes: ['trophy', 'check', 'party', 'confetti'],
    animations: ['victory_dance', 'jump_excited', 'fireworks'],
    importance: 'high',
  },
  stage_evolved: {
    messages: [
      "I've evolved! We're getting stronger together!",
      "New power unlocked! Stage {stage}!",
      "Evolution complete! I feel more powerful!",
      "We've reached stage {stage}! New abilities await!",
      "EVOLUTION! Together, we grow!",
    ],
    emotes: ['sparkle', 'star', 'rocket', 'gem'],
    animations: ['evolution_burst', 'glow', 'transform'],
    importance: 'epic',
  },
  badge_awarded: {
    messages: [
      "New badge earned!",
      "You unlocked: {badge}!",
      "Achievement unlocked!",
      "Look at this shiny new badge!",
      "Adding another badge to your collection!",
    ],
    emotes: ['medal', 'star', 'ribbon', 'trophy'],
    animations: ['pose_proud', 'show_off', 'celebrate'],
    importance: 'medium',
  },
  rank_up: {
    messages: [
      "RANK UP! Welcome to {rank}!",
      "New rank achieved: {rank}!",
      "You've ascended to {rank}!",
      "Promoted to {rank}! Well deserved!",
    ],
    emotes: ['crown', 'star', 'rocket', 'gem'],
    animations: ['salute', 'victory_pose', 'glow'],
    importance: 'high',
  },
  first_workout: {
    messages: [
      "Your first workout! This is the start of something great!",
      "Welcome to your fitness journey!",
      "Day 1 complete! The first of many!",
      "And so it begins! Great first workout!",
    ],
    emotes: ['party', 'star', 'rocket', 'sparkle'],
    animations: ['wave', 'celebrate', 'dance'],
    importance: 'high',
  },
  comeback: {
    messages: [
      "Welcome back! I missed you!",
      "You're back! Let's get moving!",
      "Glad to see you again!",
      "Ready to pick up where we left off?",
    ],
    emotes: ['wave', 'heart', 'happy', 'hug'],
    animations: ['wave', 'jump', 'happy_dance'],
    importance: 'medium',
  },
  high_volume_workout: {
    messages: [
      "Wow, that was a BIG workout!",
      "You really went all out today!",
      "Massive volume! Great effort!",
      "That's what I call dedication!",
    ],
    emotes: ['fire', 'explosion', 'muscle', 'sweat'],
    animations: ['exhausted_happy', 'wipe_sweat', 'thumbs_up'],
    importance: 'medium',
  },
  rest_day: {
    messages: [
      "Recovery is important too!",
      "Rest up, champion!",
      "Taking a well-deserved break!",
      "Recharge those batteries!",
    ],
    emotes: ['sleep', 'moon', 'peace', 'zen'],
    animations: ['yawn', 'stretch', 'relax'],
    importance: 'low',
  },
};

// Personality-based message modifiers
const PERSONALITY_MODIFIERS: Record<string, Record<string, string[]>> = {
  bold: {
    prefix: ["LET'S GO! ", "YEAH! ", "BOOM! ", ""],
    suffix: [" 💪", " 🔥", "!!", " You're a BEAST!"],
  },
  confident: {
    prefix: ["Nice! ", "Excellent! ", "I knew it! ", ""],
    suffix: [" Keep it up!", " Impressive!", "", " That's the way!"],
  },
  friendly: {
    prefix: ["Hey! ", "Yay! ", "Awesome! ", ""],
    suffix: [" 😊", " ❤️", " So proud of you!", ""],
  },
  shy: {
    prefix: ["Oh! ", "Um... ", "Wow... ", ""],
    suffix: [" *happy noises*", "...", " 👏", " That's... amazing."],
  },
};

// =====================================================
// SERVICE
// =====================================================

export const mascotTimelineService = {
  /**
   * Record a timeline event and generate a mascot reaction
   */
  async recordEvent(
    userId: string,
    eventType: string,
    eventData: Record<string, unknown> = {},
    forceReaction: boolean = false
  ): Promise<TimelineEventWithReaction> {
    // Check cooldown (prevent reaction spam)
    if (!forceReaction) {
      const recentReaction = await queryOne<{ id: string }>(`
        SELECT id FROM mascot_timeline_reactions
        WHERE user_id = $1 AND event_type = $2
          AND created_at > NOW() - INTERVAL '5 minutes'
        LIMIT 1
      `, [userId, eventType]);

      if (recentReaction && !['pr_set', 'stage_evolved', 'goal_completed', 'rank_up'].includes(eventType)) {
        // Cooldown active for low-importance events
        const event = await this.createEvent(userId, eventType, eventData);
        return { event, reaction: null };
      }
    }

    // Create the event
    const event = await this.createEvent(userId, eventType, eventData);

    // Generate reaction
    const reaction = await this.generateReaction(userId, event);

    return { event, reaction };
  },

  /**
   * Create a timeline event record
   */
  async createEvent(
    userId: string,
    eventType: string,
    eventData: Record<string, unknown>
  ): Promise<MascotTimelineEvent> {
    const template = REACTION_TEMPLATES[eventType];
    const importance = template?.importance || 'low';

    const result = await queryOne<{
      id: string;
      created_at: Date;
    }>(`
      INSERT INTO mascot_timeline_events
      (user_id, event_type, event_data, importance)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at
    `, [userId, eventType, JSON.stringify(eventData), importance]);

    if (!result) {
      throw new Error('Failed to create timeline event');
    }

    return {
      id: result.id,
      userId,
      eventType,
      eventData,
      timestamp: result.created_at,
      importance,
    };
  },

  /**
   * Generate a mascot reaction for an event
   */
  async generateReaction(
    userId: string,
    event: MascotTimelineEvent
  ): Promise<MascotReaction | null> {
    const template = REACTION_TEMPLATES[event.eventType];
    if (!template) {
      log.debug({ eventType: event.eventType }, 'No reaction template for event type');
      return null;
    }

    // Get user's mascot appearance for personality-based customization
    let baseTraits: MascotBaseTraits;
    try {
      const appearance = await appearanceGeneratorService.getFullAppearance(userId);
      baseTraits = appearance.base;
    } catch {
      // Default traits if appearance fails
      baseTraits = appearanceGeneratorService.generateBaseTraits(userId, null);
    }

    // Get companion stage for reaction complexity
    const companionState = await queryOne<{ stage: number }>(`
      SELECT stage FROM user_companion_state WHERE user_id = $1
    `, [userId]);
    const stage = companionState?.stage || 1;

    // Select random elements from template
    const messageTemplate = this.pickRandom(template.messages);
    const emote = this.pickRandom(template.emotes);
    const animation = this.pickRandom(template.animations);

    // Personalize message based on mascot personality
    const message = this.personalizeMessage(messageTemplate, baseTraits, event.eventData);

    // Get animation config
    const animConfig = appearanceGeneratorService.getReactionAnimation(event.eventType, baseTraits);

    // Calculate intensity based on importance and stage
    let intensity = animConfig.intensity;
    if (event.importance === 'epic') intensity *= 1.5;
    if (event.importance === 'high') intensity *= 1.2;
    if (stage >= 4) intensity *= 1.1; // Higher stages are more expressive

    // Insert reaction
    const result = await queryOne<{
      id: string;
      created_at: Date;
    }>(`
      INSERT INTO mascot_timeline_reactions
      (user_id, event_id, event_type, reaction_type, message, emote, animation, duration, intensity, sound_effect)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, created_at
    `, [
      userId,
      event.id,
      event.eventType,
      event.importance,
      message,
      emote,
      animation,
      animConfig.duration,
      Math.round(intensity * 100) / 100,
      animConfig.soundEffect,
    ]);

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      eventId: event.id,
      reactionType: event.importance,
      message,
      emote,
      animation,
      duration: animConfig.duration,
      intensity: Math.round(intensity * 100) / 100,
      soundEffect: animConfig.soundEffect,
      createdAt: result.created_at,
      shown: false,
    };
  },

  /**
   * Personalize a message template based on mascot personality and event data
   */
  personalizeMessage(
    template: string,
    traits: MascotBaseTraits,
    eventData: Record<string, unknown>
  ): string {
    let message = template;

    // Replace placeholders with event data
    for (const [key, value] of Object.entries(eventData)) {
      message = message.replace(`{${key}}`, String(value));
    }

    // Add personality modifiers
    const modifiers = PERSONALITY_MODIFIERS[traits.demeanor] || PERSONALITY_MODIFIERS.friendly;
    const prefix = this.pickRandom(modifiers.prefix);
    const suffix = this.pickRandom(modifiers.suffix);

    return `${prefix}${message}${suffix}`;
  },

  /**
   * Get pending (unshown) reactions for a user
   */
  async getPendingReactions(userId: string, limit: number = 5): Promise<MascotReaction[]> {
    const reactions = await queryAll<{
      id: string;
      event_id: string;
      reaction_type: string;
      message: string;
      emote: string;
      animation: string;
      duration: number;
      intensity: number;
      sound_effect: string | null;
      created_at: Date;
    }>(`
      SELECT id, event_id, reaction_type, message, emote, animation, duration, intensity, sound_effect, created_at
      FROM mascot_timeline_reactions
      WHERE user_id = $1 AND shown = FALSE
      ORDER BY created_at ASC
      LIMIT $2
    `, [userId, limit]);

    return reactions.map(r => ({
      id: r.id,
      eventId: r.event_id,
      reactionType: r.reaction_type,
      message: r.message,
      emote: r.emote,
      animation: r.animation,
      duration: r.duration,
      intensity: r.intensity,
      soundEffect: r.sound_effect,
      createdAt: r.created_at,
      shown: false,
    }));
  },

  /**
   * Mark reactions as shown
   */
  async markReactionsShown(userId: string, reactionIds: string[]): Promise<void> {
    if (reactionIds.length === 0) return;

    await query(`
      UPDATE mascot_timeline_reactions
      SET shown = TRUE, shown_at = NOW()
      WHERE user_id = $1 AND id = ANY($2)
    `, [userId, reactionIds]);
  },

  /**
   * Get timeline with reactions for a user
   */
  async getTimelineWithReactions(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      importance?: string[];
    } = {}
  ): Promise<TimelineEventWithReaction[]> {
    const { limit = 20, offset = 0, importance } = options;

    let sql = `
      SELECT
        e.id as event_id,
        e.event_type,
        e.event_data,
        e.importance,
        e.created_at as event_created_at,
        r.id as reaction_id,
        r.reaction_type,
        r.message,
        r.emote,
        r.animation,
        r.duration,
        r.intensity,
        r.sound_effect,
        r.created_at as reaction_created_at,
        r.shown
      FROM mascot_timeline_events e
      LEFT JOIN mascot_timeline_reactions r ON r.event_id = e.id
      WHERE e.user_id = $1
    `;
    const params: unknown[] = [userId];

    if (importance && importance.length > 0) {
      params.push(importance);
      sql += ` AND e.importance = ANY($${params.length})`;
    }

    sql += ` ORDER BY e.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const results = await queryAll<{
      event_id: string;
      event_type: string;
      event_data: Record<string, unknown>;
      importance: string;
      event_created_at: Date;
      reaction_id: string | null;
      reaction_type: string | null;
      message: string | null;
      emote: string | null;
      animation: string | null;
      duration: number | null;
      intensity: number | null;
      sound_effect: string | null;
      reaction_created_at: Date | null;
      shown: boolean | null;
    }>(sql, params);

    return results.map(r => ({
      event: {
        id: r.event_id,
        userId,
        eventType: r.event_type,
        eventData: r.event_data,
        timestamp: r.event_created_at,
        importance: r.importance as 'low' | 'medium' | 'high' | 'epic',
      },
      reaction: r.reaction_id ? {
        id: r.reaction_id,
        eventId: r.event_id,
        reactionType: r.reaction_type!,
        message: r.message!,
        emote: r.emote!,
        animation: r.animation!,
        duration: r.duration!,
        intensity: r.intensity!,
        soundEffect: r.sound_effect,
        createdAt: r.reaction_created_at!,
        shown: r.shown!,
      } : null,
    }));
  },

  /**
   * Get recent timeline stats for a user
   */
  async getTimelineStats(userId: string, days: number = 7): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByImportance: Record<string, number>;
    reactionsShown: number;
    reactionsPending: number;
  }> {
    const stats = await queryOne<{
      total_events: string;
      events_by_type: Record<string, number>;
      events_by_importance: Record<string, number>;
      reactions_shown: string;
      reactions_pending: string;
    }>(`
      SELECT
        COUNT(DISTINCT e.id)::text as total_events,
        jsonb_object_agg(COALESCE(e.event_type, 'unknown'), type_counts.count) as events_by_type,
        jsonb_object_agg(COALESCE(e.importance, 'low'), imp_counts.count) as events_by_importance,
        COUNT(CASE WHEN r.shown = TRUE THEN 1 END)::text as reactions_shown,
        COUNT(CASE WHEN r.shown = FALSE THEN 1 END)::text as reactions_pending
      FROM mascot_timeline_events e
      LEFT JOIN mascot_timeline_reactions r ON r.event_id = e.id
      LEFT JOIN LATERAL (
        SELECT event_type, COUNT(*) as count
        FROM mascot_timeline_events
        WHERE user_id = $1 AND created_at > NOW() - INTERVAL '${days} days'
        GROUP BY event_type
      ) type_counts ON type_counts.event_type = e.event_type
      LEFT JOIN LATERAL (
        SELECT importance, COUNT(*) as count
        FROM mascot_timeline_events
        WHERE user_id = $1 AND created_at > NOW() - INTERVAL '${days} days'
        GROUP BY importance
      ) imp_counts ON imp_counts.importance = e.importance
      WHERE e.user_id = $1 AND e.created_at > NOW() - INTERVAL '${days} days'
    `, [userId]);

    return {
      totalEvents: parseInt(stats?.total_events || '0'),
      eventsByType: stats?.events_by_type || {},
      eventsByImportance: stats?.events_by_importance || {},
      reactionsShown: parseInt(stats?.reactions_shown || '0'),
      reactionsPending: parseInt(stats?.reactions_pending || '0'),
    };
  },

  /**
   * Helper: Pick random element from array
   */
  pickRandom<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  },
};

export default mascotTimelineService;
