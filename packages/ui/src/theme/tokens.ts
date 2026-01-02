/**
 * MuscleMap Design Tokens
 *
 * Custom theme tokens extending Tamagui's default configuration.
 */

export const muscleMapColors = {
  // Primary brand colors
  primary: {
    50: '#e6f2ff',
    100: '#b3d9ff',
    200: '#80bfff',
    300: '#4da6ff',
    400: '#1a8cff',
    500: '#0073e6',
    600: '#005ab3',
    700: '#004080',
    800: '#00264d',
    900: '#000d1a',
  },

  // Muscle group colors for visualization
  muscle: {
    chest: '#ef4444',     // Red
    back: '#3b82f6',      // Blue
    shoulders: '#f97316', // Orange
    arms: '#8b5cf6',      // Purple
    legs: '#22c55e',      // Green
    core: '#eab308',      // Yellow
    cardio: '#ec4899',    // Pink
  },

  // Status colors
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
} as const;

export const muscleMapSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const muscleMapRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;
