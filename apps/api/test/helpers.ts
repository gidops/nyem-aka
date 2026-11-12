import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

// Builds the real application, configured exactly like main.ts does.
export async function createTestApp(): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return app;
}

// Test files run in parallel against one database. Each suite therefore tags the
// users it creates with its own email prefix, and cleans up only its own.
export function emailFactory(suite: string) {
  const prefix = `e2e-${suite}-`;
  return {
    prefix,
    unique: (label: string) =>
      `${prefix}${label}-${Date.now()}-${Math.round(Math.random() * 1e6)}@test.local`,
  };
}

// supertest returns Set-Cookie as an array of "name=value; Path=/; HttpOnly" strings.
export function setCookies(response: { headers: Record<string, unknown> }): string[] {
  const header = response.headers['set-cookie'];
  return Array.isArray(header) ? (header as string[]) : [];
}

// Turns Set-Cookie headers into a Cookie header for the next request.
export function cookieHeader(cookies: string[]): string {
  return cookies.map((cookie) => cookie.split(';')[0]).join('; ');
}
