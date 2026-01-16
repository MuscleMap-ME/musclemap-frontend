/**
 * Events Service
 *
 * Manages time-limited engagement events:
 * - Flash sales
 * - Double credit weekends
 * - Challenge bonuses
 * - Seasonal events
 * - Community goals
 */

import { db, queryOne, queryAll, query } from '../../db/client';
import { ValidationError, NotFoundError } from '../../lib/errors';
import { loggers } from '../../lib/logger';

const log = loggers.economy;

export type EventType = 'flash_sale' | 'double_credits' | 'challenge_bonus' | 'seasonal' | 'community_goal';

interface EventConfig {
  creditMultiplier?: number;
  xpMultiplier?: number;
  challengeMultiplier?: number;
  discountPercent?: number;
  communityTarget?: number;
  rewards?: Array<{ threshold: number; credits: number; xp: number }>;
  [key: string]: unknown;
}

interface EngagementEvent {
  id: string;
  eventType: EventType;
  name: string;
  description: string | null;
  config: EventConfig;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  isCurrentlyActive: boolean;
  timeRemaining: number; // milliseconds
}

interface EventParticipation {
  eventId: string;
  userId: string;
  progress: Record<string, unknown>;
  rewardsClaimed: Record<string, boolean>;
  joinedAt: Date;
}

export const eventsService = {
  /**
   * Get all currently active events
   */
  async getActiveEvents(): Promise<EngagementEvent[]> {
    const now = new Date();

    const rows = await queryAll<{
      id: string;
      event_type: string;
      name: string;
      description: string | null;
      config: EventConfig;
      starts_at: Date;
      ends_at: Date;
      is_active: boolean;
    }>(
      `SELECT * FROM engagement_events
       WHERE is_active = TRUE
         AND starts_at <= $1
         AND ends_at > $1
       ORDER BY ends_at ASC`,
      [now]
    );

    return rows.map((r) => ({
      id: r.id,
      eventType: r.event_type as EventType,
      name: r.name,
      description: r.description,
      config: r.config,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      isActive: r.is_active,
      isCurrentlyActive: true,
      timeRemaining: r.ends_at.getTime() - now.getTime(),
    }));
  },

  /**
   * Get a specific event
   */
  async getEvent(eventId: string): Promise<EngagementEvent | null> {
    const now = new Date();

    const row = await queryOne<{
      id: string;
      event_type: string;
      name: string;
      description: string | null;
      config: EventConfig;
      starts_at: Date;
      ends_at: Date;
      is_active: boolean;
    }>('SELECT * FROM engagement_events WHERE id = $1', [eventId]);

    if (!row) return null;

    const isCurrentlyActive = row.is_active && row.starts_at <= now && row.ends_at > now;

    return {
      id: row.id,
      eventType: row.event_type as EventType,
      name: row.name,
      description: row.description,
      config: row.config,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      isActive: row.is_active,
      isCurrentlyActive,
      timeRemaining: isCurrentlyActive ? row.ends_at.getTime() - now.getTime() : 0,
    };
  },

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(limit: number = 10): Promise<EngagementEvent[]> {
    const now = new Date();

    const rows = await queryAll<{
      id: string;
      event_type: string;
      name: string;
      description: string | null;
      config: EventConfig;
      starts_at: Date;
      ends_at: Date;
      is_active: boolean;
    }>(
      `SELECT * FROM engagement_events
       WHERE is_active = TRUE
         AND starts_at > $1
       ORDER BY starts_at ASC
       LIMIT $2`,
      [now, limit]
    );

    return rows.map((r) => ({
      id: r.id,
      eventType: r.event_type as EventType,
      name: r.name,
      description: r.description,
      config: r.config,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      isActive: r.is_active,
      isCurrentlyActive: false,
      timeRemaining: r.starts_at.getTime() - now.getTime(),
    }));
  },

  /**
   * Join an event
   */
  async joinEvent(userId: string, eventId: string): Promise<EventParticipation> {
    const event = await this.getEvent(eventId);

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    if (!event.isCurrentlyActive) {
      throw new ValidationError('Event is not currently active');
    }

    // Insert or update participation
    await query(
      `INSERT INTO event_participation (event_id, user_id, progress, rewards_claimed)
       VALUES ($1, $2, '{}', '{}')
       ON CONFLICT (event_id, user_id) DO NOTHING`,
      [eventId, userId]
    );

    const participation = await queryOne<{
      event_id: string;
      user_id: string;
      progress: Record<string, unknown>;
      rewards_claimed: Record<string, boolean>;
      joined_at: Date;
    }>(
      `SELECT * FROM event_participation WHERE event_id = $1 AND user_id = $2`,
      [eventId, userId]
    );

    log.info({ userId, eventId }, 'User joined event');

    return {
      eventId: participation!.event_id,
      userId: participation!.user_id,
      progress: participation!.progress,
      rewardsClaimed: participation!.rewards_claimed,
      joinedAt: participation!.joined_at,
    };
  },

  /**
   * Get user's participation in an event
   */
  async getParticipation(userId: string, eventId: string): Promise<EventParticipation | null> {
    const row = await queryOne<{
      event_id: string;
      user_id: string;
      progress: Record<string, unknown>;
      rewards_claimed: Record<string, boolean>;
      joined_at: Date;
    }>(
      `SELECT * FROM event_participation WHERE event_id = $1 AND user_id = $2`,
      [eventId, userId]
    );

    if (!row) return null;

    return {
      eventId: row.event_id,
      userId: row.user_id,
      progress: row.progress,
      rewardsClaimed: row.rewards_claimed,
      joinedAt: row.joined_at,
    };
  },

  /**
   * Update event progress
   */
  async updateProgress(
    userId: string,
    eventId: string,
    progressUpdate: Record<string, unknown>
  ): Promise<EventParticipation> {
    const existing = await this.getParticipation(userId, eventId);

    if (!existing) {
      // Auto-join if not participating
      await this.joinEvent(userId, eventId);
    }

    const result = await queryOne<{
      event_id: string;
      user_id: string;
      progress: Record<string, unknown>;
      rewards_claimed: Record<string, boolean>;
      joined_at: Date;
    }>(
      `UPDATE event_participation
       SET progress = progress || $1
       WHERE event_id = $2 AND user_id = $3
       RETURNING *`,
      [JSON.stringify(progressUpdate), eventId, userId]
    );

    return {
      eventId: result!.event_id,
      userId: result!.user_id,
      progress: result!.progress,
      rewardsClaimed: result!.rewards_claimed,
      joinedAt: result!.joined_at,
    };
  },

  /**
   * Get current credit multiplier from active events
   */
  async getCreditMultiplier(): Promise<number> {
    const activeEvents = await this.getActiveEvents();
    let multiplier = 1.0;

    for (const event of activeEvents) {
      if (event.config.creditMultiplier) {
        multiplier *= event.config.creditMultiplier;
      }
    }

    return multiplier;
  },

  /**
   * Get current XP multiplier from active events
   */
  async getXpMultiplier(): Promise<number> {
    const activeEvents = await this.getActiveEvents();
    let multiplier = 1.0;

    for (const event of activeEvents) {
      if (event.config.xpMultiplier) {
        multiplier *= event.config.xpMultiplier;
      }
    }

    return multiplier;
  },

  /**
   * Get user's event history
   */
  async getEventHistory(
    userId: string,
    limit: number = 20
  ): Promise<Array<{
    event: EngagementEvent;
    participation: EventParticipation;
  }>> {
    const rows = await queryAll<{
      event_id: string;
      user_id: string;
      progress: Record<string, unknown>;
      rewards_claimed: Record<string, boolean>;
      joined_at: Date;
      e_id: string;
      event_type: string;
      name: string;
      description: string | null;
      config: EventConfig;
      starts_at: Date;
      ends_at: Date;
      is_active: boolean;
    }>(
      `SELECT ep.*, e.id as e_id, e.event_type, e.name, e.description, e.config, e.starts_at, e.ends_at, e.is_active
       FROM event_participation ep
       JOIN engagement_events e ON e.id = ep.event_id
       WHERE ep.user_id = $1
       ORDER BY ep.joined_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    const now = new Date();

    return rows.map((r) => ({
      event: {
        id: r.event_id,
        eventType: r.event_type as EventType,
        name: r.name,
        description: r.description,
        config: r.config,
        startsAt: r.starts_at,
        endsAt: r.ends_at,
        isActive: r.is_active,
        isCurrentlyActive: r.is_active && r.starts_at <= now && r.ends_at > now,
        timeRemaining: r.ends_at > now ? r.ends_at.getTime() - now.getTime() : 0,
      },
      participation: {
        eventId: r.event_id,
        userId: r.user_id,
        progress: r.progress,
        rewardsClaimed: r.rewards_claimed,
        joinedAt: r.joined_at,
      },
    }));
  },

  /**
   * Create a new event (admin only)
   */
  async createEvent(params: {
    eventType: EventType;
    name: string;
    description?: string;
    config: EventConfig;
    startsAt: Date;
    endsAt: Date;
  }): Promise<EngagementEvent> {
    const result = await queryOne<{
      id: string;
      event_type: string;
      name: string;
      description: string | null;
      config: EventConfig;
      starts_at: Date;
      ends_at: Date;
      is_active: boolean;
    }>(
      `INSERT INTO engagement_events (event_type, name, description, config, starts_at, ends_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [params.eventType, params.name, params.description || null, JSON.stringify(params.config), params.startsAt, params.endsAt]
    );

    const now = new Date();

    log.info({ eventId: result!.id, name: params.name }, 'Event created');

    return {
      id: result!.id,
      eventType: result!.event_type as EventType,
      name: result!.name,
      description: result!.description,
      config: result!.config,
      startsAt: result!.starts_at,
      endsAt: result!.ends_at,
      isActive: result!.is_active,
      isCurrentlyActive: result!.starts_at <= now && result!.ends_at > now,
      timeRemaining: result!.ends_at > now ? result!.ends_at.getTime() - now.getTime() : 0,
    };
  },

  /**
   * Deactivate an event (admin only)
   */
  async deactivateEvent(eventId: string): Promise<void> {
    await query(
      `UPDATE engagement_events SET is_active = FALSE WHERE id = $1`,
      [eventId]
    );

    log.info({ eventId }, 'Event deactivated');
  },
};
