/**
 * Sleep Hygiene Store
 *
 * Zustand store for sleep hygiene state management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { resilientStorage } from '../lib/zustand-storage';

/**
 * @typedef {Object} SleepHygienePreferences
 * @property {boolean} enabled
 * @property {boolean} showOnDashboard
 * @property {boolean} showTips
 * @property {boolean} showAssessments
 * @property {boolean} bedtimeReminderEnabled
 * @property {number} [bedtimeReminderMinutesBefore]
 * @property {boolean} morningCheckInEnabled
 * @property {boolean} weeklyReportEnabled
 * @property {boolean} earnCreditsEnabled
 */

/**
 * @typedef {Object} SleepHygieneTip
 * @property {string} id
 * @property {string} category
 * @property {number} priority
 * @property {string} title
 * @property {string} description
 * @property {string} [detailedExplanation]
 * @property {string} icon
 * @property {boolean} isBookmarked
 * @property {boolean} isFollowing
 */

/**
 * @typedef {Object} PreSleepChecklist
 * @property {boolean} [avoidedCaffeine]
 * @property {boolean} [avoidedAlcohol]
 * @property {boolean} [avoidedScreens1hr]
 * @property {boolean} [coolRoom]
 * @property {boolean} [darkRoom]
 * @property {boolean} [windDownRoutine]
 * @property {boolean} [consistentBedtime]
 * @property {boolean} [lightDinner]
 * @property {boolean} [noLateExercise]
 * @property {boolean} [relaxationPractice]
 */

/**
 * @typedef {Object} PostSleepChecklist
 * @property {boolean} [fellAsleepEasily]
 * @property {boolean} [stayedAsleep]
 * @property {boolean} [wokeRefreshed]
 * @property {boolean} [noGrogginess]
 * @property {boolean} [goodEnergy]
 * @property {boolean} [noMidnightWaking]
 */

/**
 * @typedef {Object} SleepHygieneAssessment
 * @property {string} id
 * @property {string} assessmentDate
 * @property {PreSleepChecklist} preSleepChecklist
 * @property {PostSleepChecklist} postSleepChecklist
 * @property {number} [preSleepScore]
 * @property {number} [postSleepScore]
 * @property {number} [overallScore]
 * @property {number} creditsAwarded
 */

/**
 * @typedef {Object} SleepHygieneStreak
 * @property {string} id
 * @property {string} streakType
 * @property {number} currentStreak
 * @property {number} bestStreak
 * @property {number} totalCreditsEarned
 */

// Credit amounts for display
export const SLEEP_CREDIT_AMOUNTS = {
  daily_log: 5,
  target_met: 10,
  good_quality: 5,
  excellent_quality: 10,
  hygiene_checklist: 5,
  perfect_hygiene: 15,
  streak_milestone_7: 25,
  streak_milestone_14: 50,
  streak_milestone_30: 100,
  streak_milestone_60: 200,
  streak_milestone_90: 350,
  weekly_consistency: 20,
};

const initialState = {
  // Enable state
  enabled: false,
  preferences: null,

  // Tips
  tips: [],
  bookmarkedTips: [],

  // Assessments
  todayAssessment: null,
  assessmentHistory: [],

  // Streaks
  streaks: [],

  // Credits
  todayCreditsEarned: 0,
  totalCreditsEarned: 0,
  creditAwards: [],

  // Weekly stats
  weeklyStats: null,

  // UI state
  isLoading: false,
  error: null,

  // Modal states
  checklistModalOpen: false,
  tipsModalOpen: false,
  selectedTip: null,
};

export const useSleepHygieneStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      // ============================================
      // Actions - Enable/Disable
      // ============================================

      setEnabled: (enabled) => set({ enabled }),

      setPreferences: (preferences) => set({
        preferences,
        enabled: preferences?.enabled ?? false,
      }),

      // ============================================
      // Actions - Dashboard Data
      // ============================================

      loadDashboard: (dashboard) => set({
        enabled: dashboard.preferences?.enabled ?? false,
        preferences: dashboard.preferences,
        todayAssessment: dashboard.todayAssessment || null,
        streaks: dashboard.streaks || [],
        tips: dashboard.recentTips || [],
        bookmarkedTips: dashboard.bookmarkedTips || [],
        todayCreditsEarned: dashboard.todayCreditsEarned || 0,
        totalCreditsEarned: dashboard.totalCreditsEarned || 0,
        weeklyStats: dashboard.weeklyStats || null,
      }),

      // ============================================
      // Actions - Tips
      // ============================================

      setTips: (tips) => set({ tips }),

      setBookmarkedTips: (bookmarkedTips) => set({ bookmarkedTips }),

      bookmarkTip: (tipId) => set((state) => {
        const tips = state.tips.map(tip =>
          tip.id === tipId ? { ...tip, isBookmarked: true } : tip
        );
        const bookmarkedTip = tips.find(t => t.id === tipId);
        const bookmarkedTips = bookmarkedTip
          ? [...state.bookmarkedTips, bookmarkedTip]
          : state.bookmarkedTips;
        return { tips, bookmarkedTips };
      }),

      unbookmarkTip: (tipId) => set((state) => ({
        tips: state.tips.map(tip =>
          tip.id === tipId ? { ...tip, isBookmarked: false } : tip
        ),
        bookmarkedTips: state.bookmarkedTips.filter(t => t.id !== tipId),
      })),

      followTip: (tipId) => set((state) => ({
        tips: state.tips.map(tip =>
          tip.id === tipId ? { ...tip, isFollowing: true } : tip
        ),
      })),

      unfollowTip: (tipId) => set((state) => ({
        tips: state.tips.map(tip =>
          tip.id === tipId ? { ...tip, isFollowing: false } : tip
        ),
      })),

      setSelectedTip: (tip) => set({ selectedTip: tip, tipsModalOpen: !!tip }),

      // ============================================
      // Actions - Assessments
      // ============================================

      setTodayAssessment: (assessment) => set({ todayAssessment: assessment }),

      setAssessmentHistory: (history) => set({ assessmentHistory: history }),

      updatePreSleepChecklist: (updates) => set((state) => {
        const current = state.todayAssessment?.preSleepChecklist || {};
        return {
          todayAssessment: {
            ...state.todayAssessment,
            preSleepChecklist: { ...current, ...updates },
          },
        };
      }),

      updatePostSleepChecklist: (updates) => set((state) => {
        const current = state.todayAssessment?.postSleepChecklist || {};
        return {
          todayAssessment: {
            ...state.todayAssessment,
            postSleepChecklist: { ...current, ...updates },
          },
        };
      }),

      // ============================================
      // Actions - Streaks
      // ============================================

      setStreaks: (streaks) => set({ streaks }),

      getStreak: (streakType) => {
        const { streaks } = get();
        return streaks.find(s => s.streakType === streakType);
      },

      getBestStreak: () => {
        const { streaks } = get();
        if (streaks.length === 0) return null;
        return streaks.reduce((best, current) =>
          current.currentStreak > best.currentStreak ? current : best
        );
      },

      // ============================================
      // Actions - Credits
      // ============================================

      setTodayCreditsEarned: (credits) => set({ todayCreditsEarned: credits }),

      setTotalCreditsEarned: (credits) => set({ totalCreditsEarned: credits }),

      setCreditAwards: (awards) => set({ creditAwards: awards }),

      addCreditsEarned: (amount) => set((state) => ({
        todayCreditsEarned: state.todayCreditsEarned + amount,
        totalCreditsEarned: state.totalCreditsEarned + amount,
      })),

      // ============================================
      // Actions - UI State
      // ============================================

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      openChecklistModal: () => set({ checklistModalOpen: true }),

      closeChecklistModal: () => set({ checklistModalOpen: false }),

      openTipsModal: () => set({ tipsModalOpen: true }),

      closeTipsModal: () => set({ tipsModalOpen: false, selectedTip: null }),

      // ============================================
      // Actions - Reset
      // ============================================

      reset: () => set(initialState),

      // ============================================
      // Computed - Progress
      // ============================================

      getPreSleepProgress: () => {
        const { todayAssessment } = get();
        if (!todayAssessment?.preSleepChecklist) return 0;

        const checklist = todayAssessment.preSleepChecklist;
        const items = Object.values(checklist).filter(v => v !== undefined);
        const completed = items.filter(v => v === true).length;
        return items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
      },

      getPostSleepProgress: () => {
        const { todayAssessment } = get();
        if (!todayAssessment?.postSleepChecklist) return 0;

        const checklist = todayAssessment.postSleepChecklist;
        const items = Object.values(checklist).filter(v => v !== undefined);
        const completed = items.filter(v => v === true).length;
        return items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
      },

      getTotalProgress: () => {
        const { todayAssessment } = get();
        if (!todayAssessment) return 0;
        return todayAssessment.overallScore || 0;
      },

      // ============================================
      // Computed - Streak Stats
      // ============================================

      getTotalStreakDays: () => {
        const { streaks } = get();
        return streaks.reduce((total, s) => total + s.currentStreak, 0);
      },

      getLongestStreak: () => {
        const { streaks } = get();
        if (streaks.length === 0) return 0;
        return Math.max(...streaks.map(s => s.bestStreak));
      },

      // ============================================
      // Computed - Tip Stats
      // ============================================

      getFollowedTipsCount: () => {
        const { tips } = get();
        return tips.filter(t => t.isFollowing).length;
      },

      getTipsByCategory: (category) => {
        const { tips } = get();
        return tips.filter(t => t.category === category);
      },
    }),
    {
      name: 'sleep-hygiene-storage',
      storage: createJSONStorage(() => resilientStorage),
      partialize: (state) => ({
        // Only persist these fields
        enabled: state.enabled,
        bookmarkedTips: state.bookmarkedTips.map(t => ({ id: t.id, title: t.title })),
      }),
    }
  )
);

// ============================================
// Selector Hooks (for performance)
// ============================================

export const useSleepHygieneEnabled = () => useSleepHygieneStore((s) => s.enabled);
export const useSleepHygienePreferences = () => useSleepHygieneStore((s) => s.preferences);
export const useSleepHygieneTips = () => useSleepHygieneStore((s) => s.tips);
export const useSleepHygieneBookmarkedTips = () => useSleepHygieneStore((s) => s.bookmarkedTips);
export const useSleepHygieneTodayAssessment = () => useSleepHygieneStore((s) => s.todayAssessment);
export const useSleepHygieneStreaks = () => useSleepHygieneStore((s) => s.streaks);
export const useSleepHygieneTodayCredits = () => useSleepHygieneStore((s) => s.todayCreditsEarned);
export const useSleepHygieneTotalCredits = () => useSleepHygieneStore((s) => s.totalCreditsEarned);
export const useSleepHygieneWeeklyStats = () => useSleepHygieneStore((s) => s.weeklyStats);
export const useSleepHygieneLoading = () => useSleepHygieneStore((s) => s.isLoading);
export const useSleepHygieneError = () => useSleepHygieneStore((s) => s.error);
export const useSleepHygieneChecklistModalOpen = () => useSleepHygieneStore((s) => s.checklistModalOpen);
export const useSleepHygieneTipsModalOpen = () => useSleepHygieneStore((s) => s.tipsModalOpen);
export const useSleepHygieneSelectedTip = () => useSleepHygieneStore((s) => s.selectedTip);

// Computed selectors
export const useSleepHygieneProgress = () => useSleepHygieneStore((s) => ({
  preSleep: s.getPreSleepProgress(),
  postSleep: s.getPostSleepProgress(),
  total: s.getTotalProgress(),
}));

export const useSleepHygieneStreakStats = () => useSleepHygieneStore((s) => ({
  bestStreak: s.getBestStreak(),
  totalDays: s.getTotalStreakDays(),
  longestEver: s.getLongestStreak(),
}));

export default useSleepHygieneStore;
