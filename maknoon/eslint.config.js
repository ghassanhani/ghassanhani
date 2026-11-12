// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', '.expo/*', 'node_modules/*', 'server/*', 'assets/*'] },
  {
    // Node-side code (build scripts, importers, tests) imports with explicit extensions.
    files: ['scripts/**', 'pipeline/**', 'tests/**', 'src/search/core.ts', 'src/worship/prayer-core.ts'],
    rules: { 'import/no-unresolved': 'off', 'import/extensions': 'off' },
  },
  {
    files: ['scripts/**', 'pipeline/**', 'tests/**'],
    languageOptions: { globals: { Buffer: 'readonly', process: 'readonly', console: 'readonly', fetch: 'readonly' } },
  },
]);
