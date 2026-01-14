import { defineConfig } from 'tsup';

export default defineConfig([
  // Main index entry with DTS
  {
    entry: {
      index: 'src/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ['react', 'react-native'],
  },
  // Tamagui config without DTS (has external type dependency issues)
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
