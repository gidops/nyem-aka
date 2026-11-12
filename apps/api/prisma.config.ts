import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Configuration for the Prisma CLI (migrate, seed, studio).
// The CLI uses DIRECT_URL: migrations need a direct connection, not Neon's pooler.
// The running API does not read this file; it connects with DATABASE_URL (see src/prisma/prisma.service.ts).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DIRECT_URL'),
  },
});
