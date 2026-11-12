import { defineConfig } from 'vitest/config';
import { testEnv } from './test/test-env.js';

// API end-to-end tests: the real application against a real (test) database.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: testEnv,
    globalSetup: './test/global-setup.ts',
  },
});
