import globals from 'globals';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';

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
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
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
      'react/prop-types': 'off', // Disabled - using runtime validation instead of PropTypes
      'react/no-unescaped-entities': 'warn',
      'react/no-unknown-property': ['error', { ignore: threeJsProperties }],
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'apps/**', 'packages/**', 'plugins/**'],
  },
];
