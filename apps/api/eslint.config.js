import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      // Type safety rules - CRITICAL for preventing runtime errors
      '@typescript-eslint/no-explicit-any': 'warn', // Warn on explicit 'any' - use proper types
      '@typescript-eslint/no-unsafe-assignment': 'off', // TODO: Enable after fixing existing issues
      '@typescript-eslint/no-unsafe-call': 'off', // TODO: Enable after fixing existing issues
      '@typescript-eslint/no-unsafe-member-access': 'off', // TODO: Enable after fixing existing issues
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      // Console.log rules - warn in development, should be error in production
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
