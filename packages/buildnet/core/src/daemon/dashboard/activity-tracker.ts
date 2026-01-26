/**
 * Activity Tracker
 *
 * Real-time tracking and broadcasting of all daemon activity.
 * Provides the data feed for dashboards and monitoring.
 */

import { EventEmitter } from 'eventemitter3';
import type {
  DashboardState,
  DaemonEvent,
  Session,
  ActivityState,
  BuildResult,
  Resource,
} from '../types.js';

// ============================================================================
// Interfaces
// ============================================================================

export interface ActivityTrackerConfig {
  max_events: number;
  broadcast_interval_ms: number;
}

export interface Subscriber {
  id: string;
  callback: (state: DashboardState) => void;
  filters?: SubscriptionFilters;
}

export interface SubscriptionFilters {
  event_types?: string[];
  severity?: ('info' | 'warn' | 'error' | 'critical')[];
  actor_types?: ('user' | 'agent' | 'service' | 'system')[];
}

export interface ActivityUpdate {
  type: 'full' | 'incremental';
  timestamp: Date;
  data: DashboardState | IncrementalUpdate;
}

export interface IncrementalUpdate {
  events?: DaemonEvent[];
  sessions?: {
    added?: Session[];
    removed?: string[];
    updated?: Session[];
  };
  builds?: {
    started?: string[];
    completed?: BuildResult[];
  };
  resources?: {
    added?: Resource[];
    removed?: string[];
    updated?: Resource[];
  };
}

// ============================================================================
// Activity Tracker Implementation
// ============================================================================

export class ActivityTracker extends EventEmitter {
  private config: ActivityTrackerConfig;
  private subscribers: Map<string, Subscriber> = new Map();
  private eventBuffer: DaemonEvent[] = [];
  private currentState: DashboardState | null = null;
  private broadcastTimer: NodeJS.Timeout | null = null;
  private pendingUpdates: IncrementalUpdate = {};

  constructor(config: Partial<ActivityTrackerConfig> = {}) {
    super();
    this.config = {
      max_events: config.max_events ?? 1000,
      broadcast_interval_ms: config.broadcast_interval_ms ?? 100,
    };
  }

  /**
   * Start the activity tracker.
   */
  start(): void {
    // Start broadcast timer for batching updates
    this.broadcastTimer = setInterval(() => {
      this.broadcastPendingUpdates();
    }, this.config.broadcast_interval_ms);
  }

  /**
   * Stop the activity tracker.
   */
  stop(): void {
    if (this.broadcastTimer) {
      clearInterval(this.broadcastTimer);
      this.broadcastTimer = null;
    }

    // Final broadcast
    this.broadcastPendingUpdates();

    // Clear subscribers
    this.subscribers.clear();
  }

  /**
   * Subscribe to activity updates.
   */
  subscribe(
    id: string,
    callback: (state: DashboardState) => void,
    filters?: SubscriptionFilters
  ): () => void {
    const subscriber: Subscriber = { id, callback, filters };
    this.subscribers.set(id, subscriber);

    // Send initial state if available
    if (this.currentState) {
      callback(this.currentState);
    }

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(id);
    };
  }

  /**
   * Update the full dashboard state.
   */
  updateState(state: DashboardState): void {
    this.currentState = state;

    // Broadcast full state to all subscribers
    for (const subscriber of this.subscribers.values()) {
      subscriber.callback(state);
    }

    this.emit('state:updated', state);
  }

  /**
   * Record a new event.
   */
  recordEvent(event: DaemonEvent): void {
    // Add to buffer
    this.eventBuffer.unshift(event);
    if (this.eventBuffer.length > this.config.max_events) {
      this.eventBuffer.pop();
    }

    // Add to pending updates
    this.pendingUpdates.events = this.pendingUpdates.events ?? [];
    this.pendingUpdates.events.push(event);

    this.emit('event:recorded', event);
  }

  /**
   * Record a session change.
   */
  recordSessionChange(
    type: 'added' | 'removed' | 'updated',
    session: Session | string
  ): void {
    this.pendingUpdates.sessions = this.pendingUpdates.sessions ?? {};

    if (type === 'added' && typeof session !== 'string') {
      this.pendingUpdates.sessions.added = this.pendingUpdates.sessions.added ?? [];
      this.pendingUpdates.sessions.added.push(session);
    } else if (type === 'removed') {
      const id = typeof session === 'string' ? session : session.session_id;
      this.pendingUpdates.sessions.removed = this.pendingUpdates.sessions.removed ?? [];
      this.pendingUpdates.sessions.removed.push(id);
    } else if (type === 'updated' && typeof session !== 'string') {
      this.pendingUpdates.sessions.updated = this.pendingUpdates.sessions.updated ?? [];
      this.pendingUpdates.sessions.updated.push(session);
    }

    this.emit('session:changed', { type, session });
  }

  /**
   * Record a build change.
   */
  recordBuildChange(type: 'started' | 'completed', data: string | BuildResult): void {
    this.pendingUpdates.builds = this.pendingUpdates.builds ?? {};

    if (type === 'started' && typeof data === 'string') {
      this.pendingUpdates.builds.started = this.pendingUpdates.builds.started ?? [];
      this.pendingUpdates.builds.started.push(data);
    } else if (type === 'completed' && typeof data !== 'string') {
      this.pendingUpdates.builds.completed = this.pendingUpdates.builds.completed ?? [];
      this.pendingUpdates.builds.completed.push(data);
    }

    this.emit('build:changed', { type, data });
  }

  /**
   * Record a resource change.
   */
  recordResourceChange(
    type: 'added' | 'removed' | 'updated',
    resource: Resource | string
  ): void {
    this.pendingUpdates.resources = this.pendingUpdates.resources ?? {};

    if (type === 'added' && typeof resource !== 'string') {
      this.pendingUpdates.resources.added = this.pendingUpdates.resources.added ?? [];
      this.pendingUpdates.resources.added.push(resource);
    } else if (type === 'removed') {
      const id = typeof resource === 'string' ? resource : resource.id;
      this.pendingUpdates.resources.removed = this.pendingUpdates.resources.removed ?? [];
      this.pendingUpdates.resources.removed.push(id);
    } else if (type === 'updated' && typeof resource !== 'string') {
      this.pendingUpdates.resources.updated = this.pendingUpdates.resources.updated ?? [];
      this.pendingUpdates.resources.updated.push(resource);
    }

    this.emit('resource:changed', { type, resource });
  }

  /**
   * Get recent events.
   */
  getRecentEvents(limit: number = 50): DaemonEvent[] {
    return this.eventBuffer.slice(0, limit);
  }

  /**
   * Get events filtered by type.
   */
  getEventsByType(type: string, limit: number = 50): DaemonEvent[] {
    return this.eventBuffer
      .filter(e => e.event_type === type)
      .slice(0, limit);
  }

  /**
   * Get events filtered by severity.
   */
  getEventsBySeverity(
    severity: 'info' | 'warn' | 'error' | 'critical',
    limit: number = 50
  ): DaemonEvent[] {
    return this.eventBuffer
      .filter(e => e.severity === severity)
      .slice(0, limit);
  }

  /**
   * Get current dashboard state.
   */
  getCurrentState(): DashboardState | null {
    return this.currentState;
  }

  /**
   * Get subscriber count.
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private broadcastPendingUpdates(): void {
    // Check if there are any pending updates
    const hasUpdates =
      (this.pendingUpdates.events?.length ?? 0) > 0 ||
      (this.pendingUpdates.sessions?.added?.length ?? 0) > 0 ||
      (this.pendingUpdates.sessions?.removed?.length ?? 0) > 0 ||
      (this.pendingUpdates.sessions?.updated?.length ?? 0) > 0 ||
      (this.pendingUpdates.builds?.started?.length ?? 0) > 0 ||
      (this.pendingUpdates.builds?.completed?.length ?? 0) > 0 ||
      (this.pendingUpdates.resources?.added?.length ?? 0) > 0 ||
      (this.pendingUpdates.resources?.removed?.length ?? 0) > 0 ||
      (this.pendingUpdates.resources?.updated?.length ?? 0) > 0;

    if (!hasUpdates) return;

    // Emit incremental update
    this.emit('update:incremental', {
      type: 'incremental',
      timestamp: new Date(),
      data: this.pendingUpdates,
    });

    // Clear pending updates
    this.pendingUpdates = {};
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createActivityTracker(
  config?: Partial<ActivityTrackerConfig>
): ActivityTracker {
  return new ActivityTracker(config);
}
