import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'js/data/**'] },
  js.configs.recommended,
  {
    // Serverless functions and tests (Node, ES modules)
    files: ['api/**/*.js', 'tests/**/*.js', 'eslint.config.js'],
    languageOptions: { sourceType: 'module', ecmaVersion: 2023, globals: { ...globals.node } }
  },
  {
    // Browser scripts are loaded via <script> tags and share globals across files,
    // so no-undef stays off here until the frontend moves to ES modules.
    files: ['js/**/*.js'],
    languageOptions: { sourceType: 'script', ecmaVersion: 2023, globals: { ...globals.browser } },
    rules: {
      'no-undef': 'off',
      // Top-level `const Module = {...}` declarations are globals used by other files.
      'no-unused-vars': ['warn', { vars: 'local', args: 'after-used', caughtErrors: 'none' }],
      // Best-effort features (storage, optional APIs) intentionally swallow errors.
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-useless-assignment': 'off'
    }
  }
];
