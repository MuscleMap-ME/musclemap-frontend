/**
 * Feedback Components
 *
 * Components for open source community engagement including
 * bug reporting, feature suggestions, and GitHub integration.
 * Also includes empty state components for various UI scenarios.
 */

export { OpenSourceBanner } from './OpenSourceBanner';
export { BugReportForm } from './BugReportForm';
export { FeatureSuggestionForm } from './FeatureSuggestionForm';
export { FeedbackCenter } from './FeedbackCenter';
export { OpenSourceHero } from './OpenSourceHero';
export { GitHubStatsWidget } from './GitHubStatsWidget';

// Empty State Components
export { default as EmptyState, EmptyStateCard, EmptyStatePage } from './EmptyState';
export {
  ILLUSTRATION_MAP,
  getIllustration,
  NoWorkoutsIllustration,
  NoAchievementsIllustration,
  NoMessagesIllustration,
  NoFriendsIllustration,
  NoDataIllustration,
  ErrorIllustration,
  ComingSoonIllustration,
} from './EmptyStateIllustrations';
