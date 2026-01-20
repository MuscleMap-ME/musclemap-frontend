import globals from 'globals';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

// Three.js / React-Three-Fiber JSX properties that are valid
const threeJsProperties = [
  'args', 'attach', 'object', 'rotation', 'position', 'scale',
  'intensity', 'castShadow', 'receiveShadow', 'dispose',
  'wireframe', 'transparent', 'opacity', 'color', 'emissive',
  'emissiveIntensity', 'metalness', 'roughness', 'side',
  'depthWrite', 'depthTest', 'fog', 'map', 'normalMap',
  'roughnessMap', 'metalnessMap', 'envMap', 'envMapIntensity',
  'sizeAttenuation', 'vertexColors', 'count', 'array', 'itemSize',
  'geometry', 'material', 'skeleton', 'morphTargetInfluences',
  'frustumCulled', 'renderOrder', 'visible', 'matrixAutoUpdate',
];

export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react: pluginReact,
      'react-hooks': pluginReactHooks,
      '@typescript-eslint': tseslint,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...pluginReact.configs.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'warn',
      'react/no-unknown-property': ['error', { ignore: threeJsProperties }],
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-console': 'off',
      // Discourage barrel imports for better tree-shaking
      // Import directly from source files instead of index.ts
      // NOTE: This is intentionally set to 'off' because the barrel files
      // themselves need to import from stores to re-export them.
      // The deprecation warnings in the barrel files serve as guidance.
      // Enable this rule in component files only if desired.
      // 'no-restricted-imports': ['warn', {
      //   patterns: [
      //     {
      //       group: ['@/hooks', '../hooks', './hooks', '*/hooks/index'],
      //       message: 'Import hooks directly from source files for better tree-shaking.',
      //     },
      //     {
      //       group: ['@/store', '../store', './store', '*/store/index'],
      //       message: 'Import from specific store files for better tree-shaking.',
      //     },
      //   ],
      // }],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'apps/**', 'packages/**', 'plugins/**'],
  },
];
