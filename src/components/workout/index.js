/**
 * Workout Components
 *
 * Components for workout tracking, exercise groups, and set logging.
 *
 * @example
 * import {
 *   SupersetGroup,
 *   GroupTypeSelector,
 *   CreateGroupPanel,
 *   FloatingRestTimer,
 * } from '@/components/workout';
 */

// Exercise group components
export {
  SupersetGroup,
  GroupTypeSelector,
  CreateGroupPanel,
} from './SupersetGroup';

// Rest timer components
export { FloatingRestTimer } from './FloatingRestTimer';
export { RestTimerSettings } from './RestTimerSettings';
export { RestTimerControl } from './RestTimerControl';
export { SetLogger } from './SetLogger';

// RPE/RIR components
export {
  RPESelector,
  RPESelectorExpanded,
  RPEBadge,
  getRPEColor,
  getRPEIntensity,
} from './RPESelector';
export {
  RIRSelector,
  RIRSelectorCompact,
  RIRBadge,
  RPERIRQuickInput,
  getRIRColor,
  rirToRpe,
  rpeToRir,
} from './RIRSelector';
export {
  RPETrendsChart,
  RPESummaryCard,
} from './RPETrendsChart';
