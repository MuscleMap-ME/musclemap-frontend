/**
 * Crews & Crew Wars Types
 *
 * Type definitions for crew/team system and tournaments.
 */

export type CrewRole = 'owner' | 'captain' | 'member';
export type CrewWarStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export interface Crew {
  id: string;
  name: string;
  tag: string; // 3-5 character clan tag
  description: string | null;
  avatar: string | null;
  color: string; // hex color
  ownerId: string;
  memberCount: number;
  totalTU: number;
  weeklyTU: number;
  wins: number;
  losses: number;
  createdAt: string;
}

export interface CrewMember {
  id: string;
  crewId: string;
  userId: string;
  role: CrewRole;
  joinedAt: string;
  weeklyTU: number;
  totalTU: number;
  // User info
  username: string;
  avatar: string | null;
  archetype: string | null;
}

export interface CrewInvite {
  id: string;
  crewId: string;
  inviterId: string;
  inviteeId: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export interface CrewWar {
  id: string;
  challengerCrewId: string;
  defendingCrewId: string;
  status: CrewWarStatus;
  startDate: string;
  endDate: string;
  challengerTU: number;
  defendingTU: number;
  winnerId: string | null;
  createdAt: string;
}

export interface CrewWarWithDetails extends CrewWar {
  challengerCrew: Pick<Crew, 'id' | 'name' | 'tag' | 'avatar' | 'color'>;
  defendingCrew: Pick<Crew, 'id' | 'name' | 'tag' | 'avatar' | 'color'>;
  isChallenger: boolean;
  myCrewTU: number;
  opponentCrewTU: number;
  daysRemaining: number;
  isWinning: boolean;
}

export interface CrewLeaderboard {
  rank: number;
  crew: Pick<Crew, 'id' | 'name' | 'tag' | 'avatar' | 'color' | 'memberCount' | 'weeklyTU'>;
}

export interface CrewStats {
  totalMembers: number;
  totalTU: number;
  weeklyTU: number;
  warsWon: number;
  warsLost: number;
  currentStreak: number;
  topContributors: Pick<CrewMember, 'userId' | 'username' | 'avatar' | 'weeklyTU'>[];
}

export interface CrewWarEvent {
  type: 'crew.war_started' | 'crew.war_ended' | 'crew.workout' | 'crew.member_joined' | 'crew.member_left';
  crewId: string;
  warId?: string;
  userId?: string;
  data?: {
    tu?: number;
    workout?: { id: string; totalTU: number };
    winner?: string;
    message?: string;
  };
}
