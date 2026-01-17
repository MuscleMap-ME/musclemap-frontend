/**
 * Mobile App Hooks
 *
 * Central export for all React hooks used in the mobile app.
 */

// Health integrations
export { useHealthKit, default as useHealthKitDefault } from './useHealthKit';
export { useHealthConnect, default as useHealthConnectDefault } from './useHealthConnect';
export { useHealth, default as useHealthDefault } from './useHealth';
export type { UseHealthResult, WorkoutInput, DateRangeOptions } from './useHealth';

// Watch connectivity
export { default as useWatchConnectivity } from './useWatchConnectivity';

// Visualization
export { useMobileVisualization, default as useMobileVisualizationDefault } from './useMobileVisualization';
export type {
  VisualizationMode,
  VisualizationPreference,
  MobileVisualizationSettings,
} from './useMobileVisualization';
