import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Configuration for the Prisma CLI (migrate, seed, studio, generate).
// The running API does not read this file; it connects with DATABASE_URL
// (see src/prisma/prisma.service.ts).
//
// The CLI prefers DIRECT_URL: migrations need a direct connection, not Neon's pooler.
//
// The URL is optional here on purpose. `prisma generate` runs on every
// `npm install` (including on CI, Render and Vercel, before any database settings
// exist) and needs no database. Commands that do need one fail with a clear
// message of their own when the URL is missing.
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  ...(url && { datasource: { url } }),
});
