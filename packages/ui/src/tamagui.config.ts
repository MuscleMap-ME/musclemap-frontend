import { createTamagui, createTokens } from '@tamagui/core';
import { shorthands } from '@tamagui/shorthands';
import { createMedia } from '@tamagui/react-native-media-driver';

// MuscleMap color palette
const colors = {
  // Grayscale
  gray1: '#fafafa',
  gray2: '#f5f5f5',
  gray3: '#e5e5e5',
  gray4: '#d4d4d4',
  gray5: '#a3a3a3',
  gray6: '#737373',
  gray7: '#525252',
  gray8: '#404040',
  gray9: '#262626',
  gray10: '#171717',
  gray11: '#0a0a0a',
  gray12: '#000000',

  // Primary - Blue
  primary1: '#eff6ff',
  primary2: '#dbeafe',
  primary3: '#bfdbfe',
  primary4: '#93c5fd',
  primary5: '#60a5fa',
  primary6: '#3b82f6',
  primary7: '#2563eb',
  primary8: '#1d4ed8',
  primary9: '#1e40af',
  primary10: '#1e3a8a',

  // Success - Green
  success1: '#f0fdf4',
  success2: '#dcfce7',
  success3: '#bbf7d0',
  success4: '#86efac',
  success5: '#4ade80',
  success6: '#22c55e',
  success7: '#16a34a',
  success8: '#15803d',
  success9: '#166534',
  success10: '#14532d',

  // Warning - Yellow
  warning1: '#fefce8',
  warning2: '#fef9c3',
  warning3: '#fef08a',
  warning4: '#fde047',
  warning5: '#facc15',
  warning6: '#eab308',
  warning7: '#ca8a04',
  warning8: '#a16207',
  warning9: '#854d0e',
  warning10: '#713f12',

  // Error - Red
  error1: '#fef2f2',
  error2: '#fee2e2',
  error3: '#fecaca',
  error4: '#fca5a5',
  error5: '#f87171',
  error6: '#ef4444',
  error7: '#dc2626',
  error8: '#b91c1c',
  error9: '#991b1b',
  error10: '#7f1d1d',

  // Muscle activation colors (normalized 0-5 scale)
  activation0: '#1a1a1a', // Not trained
  activation1: '#3b82f6', // Low
  activation2: '#22c55e', // Medium-Low
  activation3: '#eab308', // Medium
  activation4: '#f97316', // Medium-High
  activation5: '#ef4444', // High

  // Common
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
};

const tokens = createTokens({
  color: colors,
  space: {
    $0: 0,
    $1: 4,
    $2: 8,
    $3: 12,
    $4: 16,
    $5: 20,
    $6: 24,
    $7: 28,
    $8: 32,
    $9: 36,
    $10: 40,
    $11: 44,
    $12: 48,
    $true: 16,
    '-1': -4,
    '-2': -8,
    '-3': -12,
    '-4': -16,
  },
  size: {
    $0: 0,
    $1: 4,
    $2: 8,
    $3: 12,
    $4: 16,
    $5: 20,
    $6: 24,
    $7: 28,
    $8: 32,
    $9: 36,
    $10: 40,
    $11: 44,
    $12: 48,
    $true: 44,
  },
  radius: {
    $0: 0,
    $1: 2,
    $2: 4,
    $3: 6,
    $4: 8,
    $5: 10,
    $6: 12,
    $7: 14,
    $8: 16,
    $9: 20,
    $10: 24,
    $true: 8,
    full: 9999,
  },
  zIndex: {
    $0: 0,
    $1: 100,
    $2: 200,
    $3: 300,
    $4: 400,
    $5: 500,
    $true: 1,
  },
});

const media = createMedia({
  xs: { maxWidth: 660 },
  sm: { maxWidth: 800 },
  md: { maxWidth: 1020 },
  lg: { maxWidth: 1280 },
  xl: { maxWidth: 1420 },
  xxl: { maxWidth: 1600 },
  gtXs: { minWidth: 660 + 1 },
  gtSm: { minWidth: 800 + 1 },
  gtMd: { minWidth: 1020 + 1 },
  gtLg: { minWidth: 1280 + 1 },
  short: { maxHeight: 820 },
  tall: { minHeight: 820 },
  hoverNone: { hover: 'none' },
  pointerCoarse: { pointer: 'coarse' },
});

// Dark theme (default for MuscleMap)
const darkTheme = {
  background: colors.gray11,
  backgroundHover: colors.gray10,
  backgroundPress: colors.gray9,
  backgroundFocus: colors.gray10,
  backgroundStrong: colors.gray12,
  backgroundTransparent: colors.transparent,

  color: colors.gray1,
  colorHover: colors.white,
  colorPress: colors.gray3,
  colorFocus: colors.white,
  colorTransparent: colors.transparent,

  borderColor: colors.gray8,
  borderColorHover: colors.gray7,
  borderColorFocus: colors.primary6,
  borderColorPress: colors.gray6,

  placeholderColor: colors.gray6,

  // Semantic colors
  primary: colors.primary6,
  primaryHover: colors.primary5,
  success: colors.success6,
  warning: colors.warning6,
  error: colors.error6,

  // Cards and surfaces
  card: colors.gray10,
  cardHover: colors.gray9,
};

// Light theme
const lightTheme = {
  background: colors.white,
  backgroundHover: colors.gray2,
  backgroundPress: colors.gray3,
  backgroundFocus: colors.gray2,
  backgroundStrong: colors.gray1,
  backgroundTransparent: colors.transparent,

  color: colors.gray11,
  colorHover: colors.gray12,
  colorPress: colors.gray10,
  colorFocus: colors.gray12,
  colorTransparent: colors.transparent,

  borderColor: colors.gray4,
  borderColorHover: colors.gray5,
  borderColorFocus: colors.primary6,
  borderColorPress: colors.gray6,

  placeholderColor: colors.gray5,

  // Semantic colors
  primary: colors.primary6,
  primaryHover: colors.primary7,
  success: colors.success6,
  warning: colors.warning6,
  error: colors.error6,

  // Cards and surfaces
  card: colors.white,
  cardHover: colors.gray2,
};

export const config = createTamagui({
  tokens,
  themes: {
    dark: darkTheme,
    light: lightTheme,
  },
  media,
  shorthands,
  defaultTheme: 'dark',
});

export default config;

export type Conf = typeof config;

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends Conf {}
}
