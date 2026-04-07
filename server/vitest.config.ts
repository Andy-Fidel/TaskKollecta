import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,          // 30s — mongodb-memory-server can be slow on first boot
    hookTimeout: 30000,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'domains/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['domains/**/*.js', 'middleware/**', 'utils/**'],
      exclude: ['node_modules', 'tests', 'config', 'domains/**/*.test.ts'],
    },
  },
});
