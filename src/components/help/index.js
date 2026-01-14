/**
 * Help Components - Central export
 *
 * Provides inline help tooltips for explaining MuscleMap terms.
 *
 * USAGE:
 * ------
 *
 * 1. Basic usage with predefined term:
 *    <span>Training Units <HelpTooltip term="TU" /></span>
 *
 * 2. Custom content:
 *    <HelpTooltip
 *      term="My Term"
 *      explanation="Custom explanation here"
 *      learnMoreUrl="/docs/my-term"
 *    />
 *
 * 3. Inline with text:
 *    <InlineHelp term="TU">Training Units</InlineHelp>
 *
 * 4. With HelpProvider for global context:
 *    <HelpProvider customContent={{ ... }}>
 *      <App />
 *    </HelpProvider>
 *
 * PREDEFINED TERMS:
 * -----------------
 * TU, XP, credits, archetype, journey, rank, wealthTier,
 * muscleActivation, restTimer, set, rep, oneRM, volume,
 * crew, highFive, streak, transfer, dailyReward,
 * competition, milestone, achievement, skill, and more.
 *
 * See helpContent.js for the full list.
 */

// Main components
export { default as HelpTooltip, HelpIcon, InlineHelp } from './HelpTooltip';

// Provider and hooks
export { HelpProvider, useHelp, withHelp } from './HelpProvider';

// Content and utilities
export {
  default as HELP_CONTENT,
  getHelpContent,
  getHelpByCategory,
  searchHelp,
} from './helpContent';
