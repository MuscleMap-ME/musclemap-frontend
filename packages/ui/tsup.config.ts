import { defineConfig } from 'tsup';

export default defineConfig([
  // Main index entry - DTS disabled due to Tamagui type inference issues
  // The styled() function returns types that reference internal React types
  // which causes "cannot be named without a reference" errors during DTS build
  {
    entry: {
      index: 'src/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: false, // Disabled - Tamagui styled() has type inference issues with tsup DTS
    sourcemap: true,
    clean: true,
    external: ['react', 'react-native'],
  },
  // Tamagui config without DTS
  {
    entry: {
      'tamagui.config': 'src/tamagui.config.ts',
    },
    format: ['cjs', 'esm'],
    dts: false,
    sourcemap: true,
    external: ['react', 'react-native', '@tamagui/config'],
  },
]);
