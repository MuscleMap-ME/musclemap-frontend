/**
 * Tips Components
 *
 * Contextual tips, insights, and milestone tracking components.
 */

// Original tip components
export { default as TipCard } from './TipCard';
export { default as DailyTip } from './DailyTip';
export { default as ExerciseTip } from './ExerciseTip';
export { default as MilestoneCard } from './MilestoneCard';
export { default as MilestoneProgress } from './MilestoneProgress';
export { default as WorkoutComplete } from './WorkoutComplete';

// Contextual tip system
export {
  default as ContextualTip,
  ActiveContextualTip,
  InlineTip,
} from './ContextualTip';

export {
  ContextualTipProvider,
  useContextualTips,
  useTipOnCondition,
} from './ContextualTipProvider';

export {
  TIP_TRIGGERS,
  TIP_CATEGORIES,
  TIP_DEFINITIONS,
  getTipsByTrigger,
  getPrimaryTipForTrigger,
  getTipById,
} from './tipDefinitions';
