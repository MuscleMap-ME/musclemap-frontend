// Tamagui configuration
export { config } from './tamagui.config';

// Components
export * from './components';

// Re-export commonly used Tamagui utilities
export {
  TamaguiProvider,
  styled,
  createStyledContext,
  useTheme,
  useMedia,
  Theme,
  ThemeableStack,
} from '@tamagui/core';

export type { GetProps, ThemeName } from '@tamagui/core';
