// The environment the e2e tests run in.
//
// Tests get their OWN database (nyemaka_test), so they never read or write your
// development data: no stray audit rows, no used-up request numbers, and a test
// can never be affected by whatever you happened to click in the app.
//
// Every value can be overridden by a real environment variable of the same name
// with a TEST_ prefix removed where shown; CI sets the database URL that way.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://nyemaka:nyemaka@localhost:5433/nyemaka_test';

export const testEnv: Record<string, string> = {
  NODE_ENV: 'test',
  DATABASE_URL: TEST_DATABASE_URL,
  DIRECT_URL: TEST_DATABASE_URL,
  // Fixed, obviously-fake secrets: test tokens must never be valid anywhere else.
  JWT_ACCESS_SECRET: 'test-only-access-secret-not-used-anywhere-else',
  JWT_REFRESH_SECRET: 'test-only-refresh-secret-not-used-anywhere-else',
  JWT_ACCESS_TTL_SECONDS: '900',
  JWT_REFRESH_TTL_SECONDS: '604800',
  SEED_ADMIN_EMAIL: 'admin@test.local',
  SEED_ADMIN_PASSWORD: 'test-admin-password',
  SEED_ADMIN_NAME: 'Test Administrator',
  TRUST_PROXY_HOPS: '1',
  // Empty on purpose: tests use local-disk storage and never call Cloudinary.
  CLOUDINARY_CLOUD_NAME: '',
  CLOUDINARY_API_KEY: '',
  CLOUDINARY_API_SECRET: '',
};
