/**
 * AI Coach Component Library
 *
 * AI Training Partner chat widget with personalized workout recommendations
 * and motivation.
 *
 * @example
 * // Basic usage
 * import { AICoach } from '@/components/ai-coach';
 *
 * function App() {
 *   return (
 *     <div>
 *       <AICoach userContext={{ name: 'John', streak: 5 }} />
 *     </div>
 *   );
 * }
 *
 * @example
 * // With custom position and reduced motion
 * import { AICoach, useAICoach } from '@/components/ai-coach';
 *
 * function App() {
 *   return (
 *     <AICoach
 *       position="bottom-left"
 *       reducedMotion={true}
 *       userContext={{ name: 'Jane' }}
 *     />
 *   );
 * }
 *
 * @example
 * // Using the hook directly for custom UI
 * import { useAICoach, CoachAvatar, ChatMessage } from '@/components/ai-coach';
 *
 * function CustomChat() {
 *   const { messages, sendMessage, isTyping } = useAICoach();
 *   // Build custom UI...
 * }
 */

// Main component
export { default as AICoach, useAICoach } from './AICoach';

// Sub-components
export { default as ChatMessage, TypingIndicator } from './ChatMessage';
export { default as QuickActions, QuickActionGrid, QuickActionFAB } from './QuickActions';
export { default as CoachAvatar, AVATAR_STATES } from './CoachAvatar';

// Hooks
export { default as useAICoachHook, QUICK_ACTIONS, MESSAGE_TYPES } from './useAICoach';

// Personality and responses
export {
  default as coachPersonality,
  getTimeGreeting,
  getGreetingMessage,
  generateResponse,
  COACH_PERSONALITY,
  MOTIVATIONAL_QUOTES,
  FORM_TIPS,
  RECOVERY_SUGGESTIONS,
  WORKOUT_SUGGESTIONS,
  SUGGESTED_EXERCISES,
} from './coachPersonality';

// Default export
export { default } from './AICoach';
