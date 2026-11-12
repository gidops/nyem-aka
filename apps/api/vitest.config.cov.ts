import { defineConfig } from 'vitest/config';
import { testEnv } from './test/test-env.js';

// Coverage across BOTH kinds of test in one report. Unit tests alone would make
// the services look untested, when in fact the e2e tests exercise them through
// real HTTP requests and a real database.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    env: testEnv,
    globalSetup: './test/global-setup.ts',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/generated/**', // written by Prisma, not by us
        'src/**/*.spec.ts',
        'src/main.ts', // only starts the server
        'src/attachments/storage/cloudinary.storage.ts', // needs a real Cloudinary account
      ],
      reporter: ['text', 'text-summary', 'html'],
      reportsDirectory: './coverage',
    },
  },
});
