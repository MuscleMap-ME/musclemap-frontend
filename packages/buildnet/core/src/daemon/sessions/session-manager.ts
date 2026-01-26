/**
 * Multi-User Session Manager
 *
 * Tracks who is connected and what they're doing in real-time.
 * Supports users, agents, and services with different capabilities.
 */

import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'eventemitter3';
import type { StateBackend } from '../../state/index.js';
import type { DoubleEntryLedger } from '../ledger/index.js';
import {
  type ActorIdentity,
  type Session,
  type ClientInfo,
  type Permission,
  type ActivityState,
  type ActivityEvent,
  SYSTEM_ACTOR,
} from '../types.js';

// ============================================================================
// Interfaces
// ============================================================================

export interface SessionManagerConfig {
  session_timeout_ms: number;
  cleanup_interval_ms: number;
  max_sessions_per_actor: number;
  key_prefix: string;
}

export interface CreateSessionParams {
  actor: ActorIdentity;
  connection_type: 'cli' | 'web' | 'api' | 'grpc' | 'websocket';
  client_info: ClientInfo;
  scopes?: string[];
}

export interface SessionEvent {
  type: 'created' | 'ended' | 'activity_started' | 'activity_ended' | 'timeout';
  session: Session;
  activity?: ActivityState;
}

// ============================================================================
// Session Manager Implementation
// ============================================================================

export class SessionManager extends EventEmitter {
  private state: StateBackend;
  private ledger: DoubleEntryLedger;
  private config: SessionManagerConfig;
  private sessions: Map<string, Session> = new Map();
  private sessionsByActor: Map<string, Set<string>> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;
  private initialized: boolean = false;

  constructor(
    state: StateBackend,
    ledger: DoubleEntryLedger,
    config: Partial<SessionManagerConfig> = {}
  ) {
    super();
    this.state = state;
    this.ledger = ledger;
    this.config = {
      session_timeout_ms: config.session_timeout_ms ?? 3600000, // 1 hour
      cleanup_interval_ms: config.cleanup_interval_ms ?? 60000, // 1 minute
      max_sessions_per_actor: config.max_sessions_per_actor ?? 10,
      key_prefix: config.key_prefix ?? 'sessions:',
    };
  }

  /**
   * Initialize the session manager.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load existing sessions from state
    const keys = await this.state.keys(this.key('*'));

    for (const key of keys) {
      if (key.includes(':activity:')) continue;

      const sessionStr = await this.state.get(key);
      if (sessionStr) {
        const session = this.deserializeSession(sessionStr);
        this.sessions.set(session.session_id, session);
        this.trackSessionByActor(session);
      }
    }

    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions().catch(console.error);
    }, this.config.cleanup_interval_ms);

    this.initialized = true;

    await this.ledger.recordChange({
      entity_type: 'session_manager',
      entity_id: 'system',
      previous_state: null,
      new_state: { initialized: true, session_count: this.sessions.size },
      actor: SYSTEM_ACTOR,
      reason: 'Session manager initialized',
    });
  }

  /**
   * Create a new session.
   */
  async createSession(params: CreateSessionParams): Promise<Session> {
    // Check max sessions per actor
    const actorSessions = this.sessionsByActor.get(params.actor.id);
    if (actorSessions && actorSessions.size >= this.config.max_sessions_per_actor) {
      throw new Error(`Maximum sessions (${this.config.max_sessions_per_actor}) reached for actor`);
    }

    // Resolve permissions based on actor type and scopes
    const permissions = await this.resolvePermissions(params.actor, params.scopes ?? []);

    const session: Session = {
      session_id: randomUUID(),
      actor: params.actor,
      actor_type: params.actor.type as 'user' | 'agent' | 'service' | 'system',
      connected_at: new Date(),
      last_activity: new Date(),
      connection_type: params.connection_type,
      client_info: params.client_info,
      permissions,
      scopes: params.scopes ?? ['read'],
      current_activity: null,
      activity_history: [],
      claimed_resources: [],
    };

    // Record in ledger
    await this.ledger.recordChange({
      entity_type: 'session',
      entity_id: session.session_id,
      previous_state: null,
      new_state: this.sanitizeSession(session),
      actor: params.actor,
      reason: 'Session created',
    });

    // Persist to state
    await this.state.set(this.key(session.session_id), this.serializeSession(session));

    // Add to local cache
    this.sessions.set(session.session_id, session);
    this.trackSessionByActor(session);

    // Emit event
    this.emit('session:created', { type: 'created', session });

    return session;
  }

  /**
   * End a session.
   */
  async endSession(sessionId: string, reason?: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Record in ledger
    await this.ledger.recordChange({
      entity_type: 'session',
      entity_id: sessionId,
      previous_state: this.sanitizeSession(session),
      new_state: null,
      actor: session.actor,
      reason: reason ?? 'Session ended',
    });

    // Remove from state
    await this.state.delete(this.key(sessionId));

    // Remove from local cache
    this.sessions.delete(sessionId);
    this.untrackSessionByActor(session);

    // Emit event
    this.emit('session:ended', { type: 'ended', session });
  }

  /**
   * Get a session by ID.
   */
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions.
   */
  getActiveSessions(): Session[] {
    const now = Date.now();
    return Array.from(this.sessions.values()).filter(
      s => now - s.last_activity.getTime() < this.config.session_timeout_ms
    );
  }

  /**
   * Get sessions by actor type.
   */
  getSessionsByType(type: 'user' | 'agent' | 'service' | 'system'): Session[] {
    return this.getActiveSessions().filter(s => s.actor_type === type);
  }

  /**
   * Get sessions by actor ID.
   */
  getSessionsByActor(actorId: string): Session[] {
    const sessionIds = this.sessionsByActor.get(actorId);
    if (!sessionIds) return [];

    return Array.from(sessionIds)
      .map(id => this.sessions.get(id))
      .filter((s): s is Session => s !== undefined);
  }

  /**
   * Update session activity timestamp.
   */
  async touchSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.last_activity = new Date();
    await this.state.set(this.key(sessionId), this.serializeSession(session));
  }

  /**
   * Start an activity for a session.
   */
  async startActivity(
    sessionId: string,
    activity: Omit<ActivityState, 'activity_id' | 'started_at' | 'logs' | 'artifacts'>
  ): Promise<ActivityState> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // End any current activity
    if (session.current_activity) {
      await this.endActivity(sessionId);
    }

    const activityState: ActivityState = {
      activity_id: randomUUID(),
      started_at: new Date(),
      ...activity,
      logs: [],
      artifacts: [],
    };

    session.current_activity = activityState;
    session.last_activity = new Date();

    // Record in ledger
    await this.ledger.recordChange({
      entity_type: 'activity',
      entity_id: activityState.activity_id,
      previous_state: null,
      new_state: activityState,
      actor: session.actor,
      reason: `Started ${activity.activity_type}`,
    });

    // Persist session
    await this.state.set(this.key(sessionId), this.serializeSession(session));

    // Emit event
    this.emit('activity:started', { type: 'activity_started', session, activity: activityState });

    return activityState;
  }

  /**
   * Update activity progress.
   */
  async updateActivityProgress(
    sessionId: string,
    progress: Partial<ActivityState['progress']>
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.current_activity) return;

    session.current_activity.progress = {
      ...session.current_activity.progress,
      ...progress,
    };
    session.last_activity = new Date();

    // Persist session
    await this.state.set(this.key(sessionId), this.serializeSession(session));

    // Emit event
    this.emit('activity:progress', {
      session_id: sessionId,
      activity_id: session.current_activity.activity_id,
      progress: session.current_activity.progress,
    });
  }

  /**
   * Add a log entry to current activity.
   */
  async addActivityLog(
    sessionId: string,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.current_activity) return;

    session.current_activity.logs.push({
      timestamp: new Date(),
      level,
      message,
      metadata,
    });

    // Keep only last 1000 logs
    if (session.current_activity.logs.length > 1000) {
      session.current_activity.logs.shift();
    }

    session.last_activity = new Date();

    // Persist session
    await this.state.set(this.key(sessionId), this.serializeSession(session));
  }

  /**
   * End current activity.
   */
  async endActivity(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.current_activity) return;

    const activity = session.current_activity;

    // Add to history
    const historyEvent: ActivityEvent = {
      event_id: randomUUID(),
      activity_id: activity.activity_id,
      event_type: 'completed',
      timestamp: new Date(),
      data: {
        duration_ms: Date.now() - activity.started_at.getTime(),
        progress: activity.progress,
      },
    };

    session.activity_history.push(historyEvent);

    // Keep only last 100 activities
    if (session.activity_history.length > 100) {
      session.activity_history.shift();
    }

    // Record in ledger
    await this.ledger.recordChange({
      entity_type: 'activity',
      entity_id: activity.activity_id,
      previous_state: activity,
      new_state: null,
      actor: session.actor,
      reason: 'Activity ended',
    });

    // Clear current activity
    session.current_activity = null;
    session.last_activity = new Date();

    // Persist session
    await this.state.set(this.key(sessionId), this.serializeSession(session));

    // Emit event
    this.emit('activity:ended', { type: 'activity_ended', session, activity });
  }

  /**
   * Claim a resource for a session.
   */
  async claimResource(sessionId: string, resourceId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (session.claimed_resources.includes(resourceId)) {
      return true; // Already claimed
    }

    session.claimed_resources.push(resourceId);
    session.last_activity = new Date();

    await this.state.set(this.key(sessionId), this.serializeSession(session));

    return true;
  }

  /**
   * Release a resource from a session.
   */
  async releaseResource(sessionId: string, resourceId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const index = session.claimed_resources.indexOf(resourceId);
    if (index !== -1) {
      session.claimed_resources.splice(index, 1);
      session.last_activity = new Date();
      await this.state.set(this.key(sessionId), this.serializeSession(session));
    }
  }

  /**
   * Get current activities across all sessions.
   */
  getCurrentActivities(): Map<string, ActivityState> {
    const activities = new Map<string, ActivityState>();
    for (const session of this.sessions.values()) {
      if (session.current_activity) {
        activities.set(session.session_id, session.current_activity);
      }
    }
    return activities;
  }

  /**
   * Get session statistics.
   */
  getStats(): {
    total: number;
    active: number;
    by_type: Record<string, number>;
    by_connection: Record<string, number>;
    with_activity: number;
  } {
    const activeSessions = this.getActiveSessions();
    const by_type: Record<string, number> = {};
    const by_connection: Record<string, number> = {};
    let with_activity = 0;

    for (const session of activeSessions) {
      by_type[session.actor_type] = (by_type[session.actor_type] ?? 0) + 1;
      by_connection[session.connection_type] = (by_connection[session.connection_type] ?? 0) + 1;
      if (session.current_activity) with_activity++;
    }

    return {
      total: this.sessions.size,
      active: activeSessions.length,
      by_type,
      by_connection,
      with_activity,
    };
  }

  /**
   * Stop the session manager.
   */
  async stop(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private key(suffix: string): string {
    return `${this.config.key_prefix}${suffix}`;
  }

  private trackSessionByActor(session: Session): void {
    const sessions = this.sessionsByActor.get(session.actor.id) ?? new Set();
    sessions.add(session.session_id);
    this.sessionsByActor.set(session.actor.id, sessions);
  }

  private untrackSessionByActor(session: Session): void {
    const sessions = this.sessionsByActor.get(session.actor.id);
    if (sessions) {
      sessions.delete(session.session_id);
      if (sessions.size === 0) {
        this.sessionsByActor.delete(session.actor.id);
      }
    }
  }

  private async resolvePermissions(
    actor: ActorIdentity,
    scopes: string[]
  ): Promise<Permission[]> {
    // Default permissions based on actor type
    const permissions: Permission[] = [];

    if (actor.type === 'system') {
      // System has all permissions
      permissions.push({ resource: '*', actions: ['*'] });
    } else if (actor.type === 'service') {
      // Services have broad permissions
      permissions.push({ resource: 'builds', actions: ['read', 'write', 'execute'] });
      permissions.push({ resource: 'resources', actions: ['read'] });
      permissions.push({ resource: 'sessions', actions: ['read'] });
    } else if (actor.type === 'agent') {
      // Agents have build permissions
      permissions.push({ resource: 'builds', actions: ['read', 'write', 'execute'] });
      permissions.push({ resource: 'resources', actions: ['read', 'claim'] });
      permissions.push({ resource: 'sessions', actions: ['read'] });
    } else {
      // Users have scope-based permissions
      if (scopes.includes('admin')) {
        permissions.push({ resource: '*', actions: ['*'] });
      } else {
        if (scopes.includes('write')) {
          permissions.push({ resource: 'builds', actions: ['read', 'write', 'execute'] });
          permissions.push({ resource: 'resources', actions: ['read', 'write'] });
        } else if (scopes.includes('read')) {
          permissions.push({ resource: 'builds', actions: ['read'] });
          permissions.push({ resource: 'resources', actions: ['read'] });
        }
        permissions.push({ resource: 'sessions', actions: ['read'] });
      }
    }

    return permissions;
  }

  private async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now();

    for (const session of this.sessions.values()) {
      const timeSinceActivity = now - session.last_activity.getTime();

      if (timeSinceActivity > this.config.session_timeout_ms) {
        await this.endSession(session.session_id, 'Session timed out');
        this.emit('session:timeout', { type: 'timeout', session });
      }
    }
  }

  private serializeSession(session: Session): string {
    return JSON.stringify({
      ...session,
      connected_at: session.connected_at.toISOString(),
      last_activity: session.last_activity.toISOString(),
      current_activity: session.current_activity ? {
        ...session.current_activity,
        started_at: session.current_activity.started_at.toISOString(),
        logs: session.current_activity.logs.map(l => ({
          ...l,
          timestamp: l.timestamp.toISOString(),
        })),
      } : null,
      activity_history: session.activity_history.map(e => ({
        ...e,
        timestamp: e.timestamp.toISOString(),
      })),
    });
  }

  private deserializeSession(str: string): Session {
    const obj = JSON.parse(str);
    return {
      ...obj,
      connected_at: new Date(obj.connected_at),
      last_activity: new Date(obj.last_activity),
      current_activity: obj.current_activity ? {
        ...obj.current_activity,
        started_at: new Date(obj.current_activity.started_at),
        logs: obj.current_activity.logs.map((l: { timestamp: string }) => ({
          ...l,
          timestamp: new Date(l.timestamp),
        })),
      } : null,
      activity_history: obj.activity_history.map((e: { timestamp: string }) => ({
        ...e,
        timestamp: new Date(e.timestamp),
      })),
    };
  }

  private sanitizeSession(session: Session): Omit<Session, 'permissions'> & { permissions: string[] } {
    // Remove sensitive data for ledger
    return {
      ...session,
      permissions: session.permissions.map(p => `${p.resource}:${p.actions.join(',')}`),
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSessionManager(
  state: StateBackend,
  ledger: DoubleEntryLedger,
  config?: Partial<SessionManagerConfig>
): SessionManager {
  return new SessionManager(state, ledger, config);
}
