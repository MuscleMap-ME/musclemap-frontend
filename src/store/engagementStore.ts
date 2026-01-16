/**
 * Engagement Store (Zustand)
 *
 * Manages all engagement-related state:
 * - Daily login rewards and streaks
 * - Activity streaks (workout, nutrition, sleep, social)
 * - Daily/weekly challenges
 * - Time-limited events
 * - Recovery scores
 * - Push notification preferences
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================
// TYPES
// ============================================

interface DailyReward {
  credits: number;
  xp: number;
  mysteryBoxTier: string | null;
  isMilestone: boolean;
}

interface LoginStatus {
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string | null;
  streakFreezesOwned: number;
  totalLogins: number;
  todayReward: DailyReward | null;
  canClaim: boolean;
  streakAtRisk: boolean;
  nextMilestone: { days: number; reward: DailyReward } | null;
}

interface StreakInfo {
  streakType: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  nextMilestone: { days: number; credits: number; xp: number; badge?: string } | null;
  unclaimedMilestones: Array<{ days: number; credits: number; xp: number; badge?: string }>;
}

interface Challenge {
  id: string;
  challengeDate: string;
  challengeType: string;
  difficulty: 'easy' | 'medium' | 'hard';
  targetValue: number;
  currentProgress: number;
  isComplete: boolean;
  isClaimed: boolean;
  xpReward: number;
  creditReward: number;
  expiresAt: string;
  description: string;
}

interface WeeklyChallenge {
  id: string;
  weekStart: string;
  challengeType: string;
  targetValue: number;
  currentProgress: number;
  isComplete: boolean;
  isClaimed: boolean;
  xpReward: number;
  creditReward: number;
  expiresAt: string;
  description: string;
}

interface EngagementEvent {
  id: string;
  eventType: string;
  name: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  config: {
    creditMultiplier?: number;
    xpMultiplier?: number;
    challengeMultiplier?: number;
    discountPercent?: number;
  };
  isJoined?: boolean;
  progress?: Record<string, unknown>;
}

interface RecoveryScore {
  overallScore: number;
  muscleScores: Record<string, number>;
  factors: Record<string, number>;
  recommendation: string | null;
}

interface EngagementState {
  loginStatus: LoginStatus | null;
  loginCalendar: Array<{
    date: string;
    claimed: boolean;
    dayNumber: number;
    credits: number;
    xp: number;
  }>;
  streaks: StreakInfo[];
  totalCurrentDays: number;
  totalLongestDays: number;
  dailyChallenges: Challenge[];
  weeklyChallenge: WeeklyChallenge | null;
  activeEvents: EngagementEvent[];
  upcomingEvents: EngagementEvent[];
  currentMultipliers: {
    credits: number;
    xp: number;
    challenges: number;
  };
  recoveryScore: RecoveryScore | null;
  restDayActivities: Array<{
    id: string;
    activityType: string;
    creditsEarned: number;
    createdAt: string;
  }>;
  loading: {
    login: boolean;
    streaks: boolean;
    challenges: boolean;
    events: boolean;
    recovery: boolean;
  };
  error: string | null;
  showDailyRewardModal: boolean;
  showStreakAtRiskModal: boolean;
  lastClaimedReward: {
    credits: number;
    xp: number;
    newStreak: number;
    mysteryBoxId: string | null;
    isMilestone: boolean;
  } | null;
}

interface EngagementActions {
  fetchLoginStatus: () => Promise<void>;
  claimDailyReward: (useFreeze?: boolean) => Promise<void>;
  purchaseStreakFreeze: () => Promise<void>;
  fetchLoginCalendar: (days?: number) => Promise<void>;
  fetchAllStreaks: () => Promise<void>;
  fetchStreak: (type: string) => Promise<StreakInfo | null>;
  claimStreakMilestone: (type: string, days: number) => Promise<void>;
  fetchDailyChallenges: () => Promise<void>;
  claimChallengeReward: (challengeId: string) => Promise<void>;
  fetchWeeklyChallenge: () => Promise<void>;
  claimWeeklyChallengeReward: () => Promise<void>;
  fetchActiveEvents: () => Promise<void>;
  fetchUpcomingEvents: () => Promise<void>;
  joinEvent: (eventId: string) => Promise<void>;
  fetchMultipliers: () => Promise<void>;
  fetchRecoveryScore: () => Promise<void>;
  logRestDayActivity: (activityType: string, metadata?: Record<string, unknown>) => Promise<void>;
  fetchRestDayActivities: () => Promise<void>;
  setShowDailyRewardModal: (show: boolean) => void;
  setShowStreakAtRiskModal: (show: boolean) => void;
  clearLastClaimedReward: () => void;
  clearError: () => void;
  initializeEngagement: () => Promise<void>;
}

type EngagementStore = EngagementState & EngagementActions;

// API helper
async function apiRequest(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem('musclemap_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Request failed');
  }

  return response.json();
}

// ============================================
// INITIAL STATE
// ============================================

const initialState: EngagementState = {
  loginStatus: null,
  loginCalendar: [],
  streaks: [],
  totalCurrentDays: 0,
  totalLongestDays: 0,
  dailyChallenges: [],
  weeklyChallenge: null,
  activeEvents: [],
  upcomingEvents: [],
  currentMultipliers: { credits: 1, xp: 1, challenges: 1 },
  recoveryScore: null,
  restDayActivities: [],
  loading: {
    login: false,
    streaks: false,
    challenges: false,
    events: false,
    recovery: false,
  },
  error: null,
  showDailyRewardModal: false,
  showStreakAtRiskModal: false,
  lastClaimedReward: null,
};

// ============================================
// STORE
// ============================================

export const useEngagementStore = create<EngagementStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchLoginStatus: async () => {
        set((s) => ({ loading: { ...s.loading, login: true }, error: null }));
        try {
          const data = await apiRequest('GET', '/daily-login/status');
          set({
            loginStatus: data,
            showStreakAtRiskModal: data.streakAtRisk && data.streakFreezesOwned > 0,
            loading: { ...get().loading, login: false },
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to fetch login status',
            loading: { ...get().loading, login: false },
          });
        }
      },

      claimDailyReward: async (useFreeze = false) => {
        set((s) => ({ loading: { ...s.loading, login: true }, error: null }));
        try {
          const data = await apiRequest('POST', '/daily-login/claim', { useFreeze });
          set({
            lastClaimedReward: data,
            showDailyRewardModal: true,
            loading: { ...get().loading, login: false },
          });
          await get().fetchLoginStatus();
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to claim reward',
            loading: { ...get().loading, login: false },
          });
        }
      },

      purchaseStreakFreeze: async () => {
        set((s) => ({ loading: { ...s.loading, login: true }, error: null }));
        try {
          await apiRequest('POST', '/daily-login/purchase-freeze');
          await get().fetchLoginStatus();
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to purchase freeze',
            loading: { ...get().loading, login: false },
          });
        }
      },

      fetchLoginCalendar: async (days = 30) => {
        try {
          const data = await apiRequest('GET', `/daily-login/calendar?days=${days}`);
          set({ loginCalendar: data });
        } catch (err) {
          console.error('Failed to fetch login calendar:', err);
        }
      },

      fetchAllStreaks: async () => {
        set((s) => ({ loading: { ...s.loading, streaks: true }, error: null }));
        try {
          const data = await apiRequest('GET', '/streaks');
          set({
            streaks: data.streaks,
            totalCurrentDays: data.totalCurrentDays,
            totalLongestDays: data.totalLongestDays,
            loading: { ...get().loading, streaks: false },
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to fetch streaks',
            loading: { ...get().loading, streaks: false },
          });
        }
      },

      fetchStreak: async (type: string) => {
        try {
          const data = await apiRequest('GET', `/streaks/${type}`);
          return data;
        } catch (err) {
          console.error(`Failed to fetch ${type} streak:`, err);
          return null;
        }
      },

      claimStreakMilestone: async (type: string, days: number) => {
        try {
          await apiRequest('POST', `/streaks/${type}/claim`, { milestoneDays: days });
          await get().fetchAllStreaks();
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to claim milestone' });
        }
      },

      fetchDailyChallenges: async () => {
        set((s) => ({ loading: { ...s.loading, challenges: true }, error: null }));
        try {
          const data = await apiRequest('GET', '/challenges/daily');
          set({
            dailyChallenges: data,
            loading: { ...get().loading, challenges: false },
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to fetch challenges',
            loading: { ...get().loading, challenges: false },
          });
        }
      },

      claimChallengeReward: async (challengeId: string) => {
        try {
          await apiRequest('POST', `/challenges/daily/claim/${challengeId}`);
          await get().fetchDailyChallenges();
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to claim challenge' });
        }
      },

      fetchWeeklyChallenge: async () => {
        try {
          const data = await apiRequest('GET', '/challenges/weekly');
          set({ weeklyChallenge: data });
        } catch (err) {
          console.error('Failed to fetch weekly challenge:', err);
        }
      },

      claimWeeklyChallengeReward: async () => {
        try {
          await apiRequest('POST', '/challenges/weekly/claim');
          await get().fetchWeeklyChallenge();
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to claim weekly challenge' });
        }
      },

      fetchActiveEvents: async () => {
        set((s) => ({ loading: { ...s.loading, events: true }, error: null }));
        try {
          const data = await apiRequest('GET', '/events/active');
          set({
            activeEvents: data,
            loading: { ...get().loading, events: false },
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to fetch events',
            loading: { ...get().loading, events: false },
          });
        }
      },

      fetchUpcomingEvents: async () => {
        try {
          const data = await apiRequest('GET', '/events/upcoming');
          set({ upcomingEvents: data });
        } catch (err) {
          console.error('Failed to fetch upcoming events:', err);
        }
      },

      joinEvent: async (eventId: string) => {
        try {
          await apiRequest('POST', `/events/${eventId}/join`);
          await get().fetchActiveEvents();
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to join event' });
        }
      },

      fetchMultipliers: async () => {
        try {
          const data = await apiRequest('GET', '/events/multipliers');
          set({ currentMultipliers: data });
        } catch (err) {
          console.error('Failed to fetch multipliers:', err);
        }
      },

      fetchRecoveryScore: async () => {
        set((s) => ({ loading: { ...s.loading, recovery: true }, error: null }));
        try {
          const data = await apiRequest('GET', '/engagement/recovery/today');
          set({
            recoveryScore: data,
            loading: { ...get().loading, recovery: false },
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to fetch recovery score',
            loading: { ...get().loading, recovery: false },
          });
        }
      },

      logRestDayActivity: async (activityType: string, metadata = {}) => {
        try {
          await apiRequest('POST', '/engagement/recovery/log-activity', { activityType, metadata });
          await get().fetchRestDayActivities();
          await get().fetchRecoveryScore();
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to log activity' });
        }
      },

      fetchRestDayActivities: async () => {
        try {
          const data = await apiRequest('GET', '/engagement/recovery/activities');
          set({ restDayActivities: data });
        } catch (err) {
          console.error('Failed to fetch rest day activities:', err);
        }
      },

      setShowDailyRewardModal: (show: boolean) => set({ showDailyRewardModal: show }),
      setShowStreakAtRiskModal: (show: boolean) => set({ showStreakAtRiskModal: show }),
      clearLastClaimedReward: () => set({ lastClaimedReward: null }),
      clearError: () => set({ error: null }),

      initializeEngagement: async () => {
        const state = get();
        await Promise.all([
          state.fetchLoginStatus(),
          state.fetchAllStreaks(),
          state.fetchDailyChallenges(),
          state.fetchWeeklyChallenge(),
          state.fetchActiveEvents(),
          state.fetchMultipliers(),
          state.fetchRecoveryScore(),
        ]);
      },
    }),
    {
      name: 'musclemap-engagement',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        loginCalendar: state.loginCalendar,
        currentMultipliers: state.currentMultipliers,
      }),
    }
  )
);

// ============================================
// SHORTHAND HOOKS
// ============================================

export function useDailyLogin() {
  return useEngagementStore((s) => ({
    status: s.loginStatus,
    calendar: s.loginCalendar,
    loading: s.loading.login,
    canClaim: s.loginStatus?.canClaim ?? false,
    streakAtRisk: s.loginStatus?.streakAtRisk ?? false,
    currentStreak: s.loginStatus?.currentStreak ?? 0,
    fetchStatus: s.fetchLoginStatus,
    claim: s.claimDailyReward,
    purchaseFreeze: s.purchaseStreakFreeze,
    fetchCalendar: s.fetchLoginCalendar,
  }));
}

export function useStreaks() {
  return useEngagementStore((s) => ({
    streaks: s.streaks,
    totalCurrent: s.totalCurrentDays,
    totalLongest: s.totalLongestDays,
    loading: s.loading.streaks,
    fetchAll: s.fetchAllStreaks,
    fetchOne: s.fetchStreak,
    claimMilestone: s.claimStreakMilestone,
  }));
}

export function useChallenges() {
  return useEngagementStore((s) => ({
    daily: s.dailyChallenges,
    weekly: s.weeklyChallenge,
    loading: s.loading.challenges,
    fetchDaily: s.fetchDailyChallenges,
    fetchWeekly: s.fetchWeeklyChallenge,
    claimDaily: s.claimChallengeReward,
    claimWeekly: s.claimWeeklyChallengeReward,
  }));
}

export function useEvents() {
  return useEngagementStore((s) => ({
    active: s.activeEvents,
    upcoming: s.upcomingEvents,
    multipliers: s.currentMultipliers,
    loading: s.loading.events,
    fetchActive: s.fetchActiveEvents,
    fetchUpcoming: s.fetchUpcomingEvents,
    join: s.joinEvent,
    fetchMultipliers: s.fetchMultipliers,
  }));
}

export function useRecovery() {
  return useEngagementStore((s) => ({
    score: s.recoveryScore,
    activities: s.restDayActivities,
    loading: s.loading.recovery,
    fetchScore: s.fetchRecoveryScore,
    logActivity: s.logRestDayActivity,
    fetchActivities: s.fetchRestDayActivities,
  }));
}

export function useEngagementModals() {
  return useEngagementStore((s) => ({
    showDailyReward: s.showDailyRewardModal,
    showStreakAtRisk: s.showStreakAtRiskModal,
    lastReward: s.lastClaimedReward,
    setShowDailyReward: s.setShowDailyRewardModal,
    setShowStreakAtRisk: s.setShowStreakAtRiskModal,
    clearLastReward: s.clearLastClaimedReward,
  }));
}

export function useMultipliers() {
  return useEngagementStore((s) => s.currentMultipliers);
}

export default useEngagementStore;
