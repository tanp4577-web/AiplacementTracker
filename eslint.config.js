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
    // Not part of `npm run lint` yet; run `npm run lint:all` to see the backlog.
    files: ['js/**/*.js'],
    languageOptions: { sourceType: 'script', ecmaVersion: 2023, globals: { ...globals.browser } },
    rules: { 'no-undef': 'off', 'no-unused-vars': 'warn' }
  }
];
