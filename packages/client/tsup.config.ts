import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'storage/web': 'src/storage/web.ts',
    'storage/native': 'src/storage/native.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'expo-secure-store'],
});
