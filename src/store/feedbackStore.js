/**
 * Feedback Store (Zustand)
 *
 * Manages state for the user feedback system including:
 * - Bug reports
 * - Feature requests
 * - Questions & support
 * - FAQ browsing
 *
 * @example
 * // Open feedback modal for bug report
 * useFeedbackStore.getState().openFeedbackModal('bug_report');
 *
 * // Use shorthand hook
 * const { openFeedbackModal, closeFeedbackModal } = useFeedbackModal();
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';

/**
 * Feedback type definitions
 */
export const FEEDBACK_TYPES = {
  BUG_REPORT: 'bug_report',
  FEATURE_REQUEST: 'feature_request',
  QUESTION: 'question',
  GENERAL: 'general',
};

export const FEEDBACK_LABELS = {
  bug_report: 'Report a Bug',
  feature_request: 'Suggest a Feature',
  question: 'Ask a Question',
  general: 'General Feedback',
};

export const FEEDBACK_ICONS = {
  bug_report: 'Bug',
  feature_request: 'Lightbulb',
  question: 'HelpCircle',
  general: 'MessageSquare',
};

export const FEEDBACK_DESCRIPTIONS = {
  bug_report: "Something isn't working right? Let us know.",
  feature_request: 'Have an idea to make MuscleMap better?',
  question: 'Need help or have a question?',
  general: 'Share your thoughts with us.',
};

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', description: 'Minor issue, workaround exists' },
  { value: 'medium', label: 'Medium', description: 'Noticeable issue, affects experience' },
  { value: 'high', label: 'High', description: 'Significant issue, blocks workflow' },
  { value: 'critical', label: 'Critical', description: "App is unusable or data is lost" },
];

/**
 * Feedback Store
 */
export const useFeedbackStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // ============================================
        // MODAL STATE
        // ============================================
        isOpen: false,
        feedbackType: null, // 'bug_report' | 'feature_request' | 'question' | 'general'
        step: 'select', // 'select' | 'form' | 'success' | 'faq'

        openFeedbackModal: (type = null) =>
          set({
            isOpen: true,
            feedbackType: type,
            step: type ? 'form' : 'select',
            formData: { ...get().initialFormData },
            submitting: false,
            error: null,
          }),

        closeFeedbackModal: () =>
          set({
            isOpen: false,
            feedbackType: null,
            step: 'select',
            formData: { ...get().initialFormData },
            submitting: false,
            error: null,
          }),

        setFeedbackType: (type) =>
          set({
            feedbackType: type,
            step: 'form',
          }),

        setStep: (step) => set({ step }),

        // ============================================
        // FORM STATE
        // ============================================
        initialFormData: {
          title: '',
          description: '',
          priority: 'medium',
          stepsToReproduce: '',
          expectedBehavior: '',
          actualBehavior: '',
          category: '',
          attachments: [],
        },

        formData: {
          title: '',
          description: '',
          priority: 'medium',
          stepsToReproduce: '',
          expectedBehavior: '',
          actualBehavior: '',
          category: '',
          attachments: [],
        },

        updateFormData: (field, value) =>
          set((s) => ({
            formData: { ...s.formData, [field]: value },
          })),

        resetFormData: () =>
          set((s) => ({
            formData: { ...s.initialFormData },
          })),

        // ============================================
        // SUBMISSION STATE
        // ============================================
        submitting: false,
        error: null,
        lastSubmittedId: null,

        setSubmitting: (submitting) => set({ submitting }),
        setError: (error) => set({ error }),
        setSubmissionSuccess: (feedbackId) =>
          set({
            submitting: false,
            error: null,
            lastSubmittedId: feedbackId,
            step: 'success',
          }),

        // ============================================
        // FAQ STATE
        // ============================================
        faqCategories: [],
        faqEntries: {},
        faqLoading: false,
        faqSearchQuery: '',
        faqSearchResults: null,
        expandedFaqId: null,

        setFaqCategories: (categories) => set({ faqCategories: categories }),
        setFaqEntries: (entries) => set({ faqEntries: entries }),
        setFaqLoading: (loading) => set({ faqLoading: loading }),
        setFaqSearchQuery: (query) => set({ faqSearchQuery: query }),
        setFaqSearchResults: (results) => set({ faqSearchResults: results }),
        setExpandedFaqId: (id) =>
          set((s) => ({
            expandedFaqId: s.expandedFaqId === id ? null : id,
          })),

        // ============================================
        // FEATURE REQUESTS STATE
        // ============================================
        popularFeatures: [],
        popularFeaturesLoading: false,
        userVotes: new Set(), // Track which features user has voted on

        setPopularFeatures: (features) => set({ popularFeatures: features }),
        setPopularFeaturesLoading: (loading) => set({ popularFeaturesLoading: loading }),
        addUserVote: (feedbackId) =>
          set((s) => {
            const newVotes = new Set(s.userVotes);
            newVotes.add(feedbackId);
            return { userVotes: newVotes };
          }),
        removeUserVote: (feedbackId) =>
          set((s) => {
            const newVotes = new Set(s.userVotes);
            newVotes.delete(feedbackId);
            return { userVotes: newVotes };
          }),
        hasVoted: (feedbackId) => get().userVotes.has(feedbackId),

        // ============================================
        // USER FEEDBACK HISTORY
        // ============================================
        myFeedback: [],
        myFeedbackLoading: false,
        myFeedbackCursor: null,
        myFeedbackHasMore: true,

        setMyFeedback: (feedback, append = false) =>
          set((s) => ({
            myFeedback: append ? [...s.myFeedback, ...feedback] : feedback,
          })),
        setMyFeedbackLoading: (loading) => set({ myFeedbackLoading: loading }),
        setMyFeedbackCursor: (cursor) => set({ myFeedbackCursor: cursor }),
        setMyFeedbackHasMore: (hasMore) => set({ myFeedbackHasMore: hasMore }),

        // ============================================
        // DEVICE INFO (auto-captured)
        // ============================================
        getDeviceInfo: () => {
          if (typeof window === 'undefined') return {};
          return {
            userAgent: navigator.userAgent,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            platform: navigator.platform,
            appVersion: import.meta.env.VITE_APP_VERSION,
          };
        },
      }),
      {
        name: 'musclemap-feedback',
        // Only persist user votes and FAQ cache
        partialize: (state) => ({
          userVotes: Array.from(state.userVotes),
          faqCategories: state.faqCategories,
        }),
        // Convert userVotes back to Set on hydration
        onRehydrateStorage: () => (state) => {
          if (state && state.userVotes) {
            state.userVotes = new Set(state.userVotes);
          }
        },
      }
    )
  )
);

// ============================================
// SHORTHAND HOOKS
// ============================================

/**
 * Hook for feedback modal control
 */
export const useFeedbackModal = () => {
  const isOpen = useFeedbackStore((s) => s.isOpen);
  const feedbackType = useFeedbackStore((s) => s.feedbackType);
  const step = useFeedbackStore((s) => s.step);
  const openFeedbackModal = useFeedbackStore((s) => s.openFeedbackModal);
  const closeFeedbackModal = useFeedbackStore((s) => s.closeFeedbackModal);
  const setFeedbackType = useFeedbackStore((s) => s.setFeedbackType);
  const setStep = useFeedbackStore((s) => s.setStep);

  return {
    isOpen,
    feedbackType,
    step,
    openFeedbackModal,
    closeFeedbackModal,
    setFeedbackType,
    setStep,
  };
};

/**
 * Hook for feedback form state
 */
export const useFeedbackForm = () => {
  const formData = useFeedbackStore((s) => s.formData);
  const updateFormData = useFeedbackStore((s) => s.updateFormData);
  const resetFormData = useFeedbackStore((s) => s.resetFormData);
  const submitting = useFeedbackStore((s) => s.submitting);
  const error = useFeedbackStore((s) => s.error);
  const getDeviceInfo = useFeedbackStore((s) => s.getDeviceInfo);

  return {
    formData,
    updateFormData,
    resetFormData,
    submitting,
    error,
    getDeviceInfo,
  };
};

/**
 * Hook for FAQ state
 */
export const useFaq = () => {
  const faqCategories = useFeedbackStore((s) => s.faqCategories);
  const faqEntries = useFeedbackStore((s) => s.faqEntries);
  const faqLoading = useFeedbackStore((s) => s.faqLoading);
  const faqSearchQuery = useFeedbackStore((s) => s.faqSearchQuery);
  const faqSearchResults = useFeedbackStore((s) => s.faqSearchResults);
  const expandedFaqId = useFeedbackStore((s) => s.expandedFaqId);
  const setFaqSearchQuery = useFeedbackStore((s) => s.setFaqSearchQuery);
  const setExpandedFaqId = useFeedbackStore((s) => s.setExpandedFaqId);

  return {
    categories: faqCategories,
    entries: faqEntries,
    loading: faqLoading,
    searchQuery: faqSearchQuery,
    searchResults: faqSearchResults,
    expandedId: expandedFaqId,
    setSearchQuery: setFaqSearchQuery,
    toggleExpanded: setExpandedFaqId,
  };
};

/**
 * Hook for feature voting
 */
export const useFeatureVoting = () => {
  const popularFeatures = useFeedbackStore((s) => s.popularFeatures);
  const loading = useFeedbackStore((s) => s.popularFeaturesLoading);
  const userVotes = useFeedbackStore((s) => s.userVotes);
  const addUserVote = useFeedbackStore((s) => s.addUserVote);
  const removeUserVote = useFeedbackStore((s) => s.removeUserVote);

  return {
    features: popularFeatures,
    loading,
    hasVoted: (id) => userVotes.has(id),
    addVote: addUserVote,
    removeVote: removeUserVote,
  };
};

/**
 * Hook for user's feedback history
 */
export const useMyFeedback = () => {
  const feedback = useFeedbackStore((s) => s.myFeedback);
  const loading = useFeedbackStore((s) => s.myFeedbackLoading);
  const hasMore = useFeedbackStore((s) => s.myFeedbackHasMore);
  const cursor = useFeedbackStore((s) => s.myFeedbackCursor);

  return {
    feedback,
    loading,
    hasMore,
    cursor,
  };
};

export default useFeedbackStore;
