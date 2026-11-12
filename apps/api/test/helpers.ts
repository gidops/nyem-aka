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

// Every e2e test user gets this email prefix so cleanup can find them.
export const E2E_EMAIL_PREFIX = 'e2e-';

export function uniqueEmail(label: string): string {
  return `${E2E_EMAIL_PREFIX}${label}-${Date.now()}-${Math.round(Math.random() * 1e6)}@test.local`;
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
