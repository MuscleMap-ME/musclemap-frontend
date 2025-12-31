/**
 * Community Module Types
 */

export type EventType =
  | 'session.start'
  | 'session.end'
  | 'workout.started'
  | 'workout.completed'
  | 'exercise.selected'
  | 'exercise.completed'
  | 'stage.entered'
  | 'stage.completed'
  | 'level.up'
  | 'archetype.switched'
  | 'achievement.unlocked'
  | 'competition.joined'
  | 'competition.completed'
  | 'privacy.location_toggled'
  | 'heartbeat';

export type VisibilityScope = 'public_anon' | 'public_profile' | 'moderator' | 'admin';

export interface ActivityEvent {
  id: string;
  userId: string;
  eventType: EventType;
  payload: Record<string, unknown>;
  geoBucket?: string;
  visibilityScope: VisibilityScope;
  createdAt: string;
}

export interface PublicEvent {
  id: string;
  ts: string;
  type: EventType;
  geoBucket?: string;
  displayName?: string;
  payload: Record<string, unknown>;
}

export interface PrivacySettings {
  userId: string;
  shareLocation: boolean;
  showInFeed: boolean;
  showOnMap: boolean;
  showWorkoutDetails: boolean;
  publicProfile: boolean;
  publicDisplayName?: string;
  updatedAt: string;
}

export interface UserLocation {
  userId: string;
  geoBucket: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  timezone?: string;
  updatedAt: string;
}

export interface PresenceMeta {
  geoBucket?: string;
  stageId?: string;
  journeyId?: string;
  ts: number;
}

export interface ActiveNowStats {
  total: number;
  byGeoBucket: Record<string, number>;
  byStage: Record<string, number>;
}

export interface NowStats {
  activeUsers: number;
  topExercises: Array<{ exerciseId: string; name: string; count: number }>;
  recentActivity: number;
}

export interface CommunitySnapshot {
  activeNow: ActiveNowStats;
  recentEvents: PublicEvent[];
  topExercises: Array<{ exerciseId: string; name: string; count: number }>;
  stats: {
    totalWorkoutsToday: number;
    totalTuToday: number;
    activeCountries: number;
  };
}

export interface MetricRollup {
  id: string;
  hourBucket: string;
  metricType: string;
  metricKey?: string;
  valueCount: number;
  valueSum: number;
  valueMin?: number;
  valueMax?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
