import { execSync } from 'node:child_process';
import { testEnv } from './test-env.js';

// Runs once before the e2e suite: brings the test database to the current schema
// and makes sure the roles, categories and admin exist.
//
// `migrate deploy` applies any migration not yet applied (and creates the database
// the first time). It is the same command production uses, so every test run also
// proves that the migrations work on a database built from nothing.
export default function setup() {
  const env = { ...process.env, ...testEnv };
  const run = (command: string) =>
    execSync(command, { env, stdio: ['ignore', 'pipe', 'inherit'] });

  try {
    run('npx prisma migrate deploy');
    run('npx prisma db seed');
  } catch (error) {
    throw new Error(
      'Could not prepare the test database. Is Postgres running? (docker compose up -d)',
      { cause: error },
    );
  }
}
