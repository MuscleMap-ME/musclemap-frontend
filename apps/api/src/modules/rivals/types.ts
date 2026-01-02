/**
 * Rivals Module Types
 *
 * Type definitions for the rivalry system.
 */

export type RivalStatus = 'pending' | 'active' | 'declined' | 'ended';

export interface Rival {
  id: string;
  challengerId: string;
  challengedId: string;
  status: RivalStatus;
  createdAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  challengerTU: number;
  challengedTU: number;
  lastChallengerWorkout: Date | null;
  lastChallengedWorkout: Date | null;
}

export interface RivalWithUser extends Rival {
  opponent: {
    id: string;
    username: string;
    avatar?: string | null;
    archetype?: string | null;
    level?: number;
  };
  isChallenger: boolean;
  myTU: number;
  opponentTU: number;
  myLastWorkout: Date | null;
  opponentLastWorkout: Date | null;
  tuDifference: number;
  isWinning: boolean;
}

export interface RivalStats {
  activeRivals: number;
  wins: number;
  losses: number;
  ties: number;
  totalTUEarned: number;
  currentStreak: number;
  longestStreak: number;
}

// WebSocket event types
export type RivalEventType =
  | 'rival.request'
  | 'rival.accepted'
  | 'rival.declined'
  | 'rival.ended'
  | 'rival.workout'
  | 'rival.milestone';

export interface RivalEvent {
  type: RivalEventType;
  rivalryId: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface RivalWorkoutEvent extends RivalEvent {
  type: 'rival.workout';
  data: {
    userId: string;
    username: string;
    tuEarned: number;
    totalTU: number;
    workoutId: string;
    topMuscles: string[];
  };
}

export interface RivalMilestoneEvent extends RivalEvent {
  type: 'rival.milestone';
  data: {
    userId: string;
    username: string;
    milestone: 'overtake' | 'streak_3' | 'streak_7' | 'tu_100' | 'tu_500';
    value: number;
  };
}

// Request/Response types
export interface CreateRivalRequest {
  userId: string;
}

export interface RivalResponse {
  rival: RivalWithUser;
}

export interface RivalsListResponse {
  rivals: RivalWithUser[];
  stats: RivalStats;
}
