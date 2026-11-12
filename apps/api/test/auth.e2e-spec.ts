import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  cookieHeader,
  createTestApp,
  E2E_EMAIL_PREFIX,
  setCookies,
  uniqueEmail,
} from './helpers.js';

// Walks the Phase 2 checkpoint against the real application and database.
describe('Auth and RBAC (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  const adminEmail = process.env.SEED_ADMIN_EMAIL!;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD!;
  const password = 'correct-horse-battery';

  const http = () => request(app.getHttpServer());

  async function loginAs(email: string, pass: string) {
    const response = await http()
      .post('/auth/login')
      .send({ email, password: pass })
      .expect(200);
    return { response, cookie: cookieHeader(setCookies(response)) };
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Remove the users this suite created. Their audit rows stay (actor becomes null).
    await prisma.user.deleteMany({
      where: { email: { startsWith: E2E_EMAIL_PREFIX } },
    });
    await app.close();
  });

  describe('login', () => {
    it('sets two httpOnly cookies and returns no token or hash in the body', async () => {
      const { response } = await loginAs(adminEmail, adminPassword);
      const cookies = setCookies(response);

      expect(cookies).toHaveLength(2);
      for (const cookie of cookies) {
        expect(cookie).toMatch(/HttpOnly/i);
        expect(cookie).toMatch(/SameSite=Lax/i);
      }
      const body = JSON.stringify(response.body);
      expect(body).not.toMatch(/token/i);
      expect(body).not.toMatch(/passwordHash/);
      expect(response.body.user.role).toBe('ADMIN');
    });

    it('rejects a wrong password and an unknown email with the same message', async () => {
      const wrongPassword = await http()
        .post('/auth/login')
        .send({ email: adminEmail, password: 'not-the-password' })
        .expect(401);
      const unknownEmail = await http()
        .post('/auth/login')
        .send({ email: uniqueEmail('nobody'), password: 'whatever-123' })
        .expect(401);
      expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
    });

    it('accepts the email in any letter case', async () => {
      await loginAs(adminEmail.toUpperCase(), adminPassword);
    });
  });

  describe('register', () => {
    it('creates a REQUESTER and signs them in', async () => {
      const email = uniqueEmail('register');
      const response = await http()
        .post('/auth/register')
        .send({ email, password, fullName: 'Test Requester' })
        .expect(201);
      expect(response.body.user.role).toBe('REQUESTER');
      expect(setCookies(response)).toHaveLength(2);
    });

    it('rejects an attempt to choose a role', async () => {
      await http()
        .post('/auth/register')
        .send({
          email: uniqueEmail('sneaky'),
          password,
          fullName: 'Sneaky Admin',
          role: 'ADMIN',
        })
        .expect(400);
    });

    it('rejects a duplicate email with 409', async () => {
      const email = uniqueEmail('dup');
      const body = { email, password, fullName: 'First Person' };
      await http().post('/auth/register').send(body).expect(201);
      await http().post('/auth/register').send(body).expect(409);
    });

    it('rejects a short password', async () => {
      await http()
        .post('/auth/register')
        .send({ email: uniqueEmail('short'), password: 'short', fullName: 'Short Pass' })
        .expect(400);
    });
  });

  describe('access control', () => {
    it('GET /auth/me returns the user without secrets', async () => {
      const { cookie } = await loginAs(adminEmail, adminPassword);
      const response = await http()
        .get('/auth/me')
        .set('Cookie', cookie)
        .expect(200);
      expect(response.body.user.email).toBe(adminEmail);
      expect(response.body.user.passwordHash).toBeUndefined();
      expect(response.body.user.refreshTokenHash).toBeUndefined();
    });

    it('a signed-out caller gets 401', async () => {
      await http().get('/auth/me').expect(401);
      await http().get('/users').expect(401);
    });

    it('a tampered token gets 401', async () => {
      await http()
        .get('/auth/me')
        .set('Cookie', 'access_token=not.a.real.token')
        .expect(401);
    });

    it('a requester gets 403 on admin routes; an admin gets 200', async () => {
      const email = uniqueEmail('rbac');
      await http()
        .post('/auth/register')
        .send({ email, password, fullName: 'Plain Requester' })
        .expect(201);
      const requester = await loginAs(email, password);
      await http().get('/users').set('Cookie', requester.cookie).expect(403);

      const admin = await loginAs(adminEmail, adminPassword);
      const list = await http()
        .get('/users?limit=5')
        .set('Cookie', admin.cookie)
        .expect(200);
      expect(list.body.meta.limit).toBe(5);
      expect(list.body.data.length).toBeLessThanOrEqual(5);
      expect(JSON.stringify(list.body)).not.toMatch(/passwordHash/);
    });
  });

  describe('user management', () => {
    it('an admin creates an officer, who can then sign in', async () => {
      const admin = await loginAs(adminEmail, adminPassword);
      const email = uniqueEmail('officer');
      const created = await http()
        .post('/users')
        .set('Cookie', admin.cookie)
        .send({ email, password, fullName: 'Olu Officer', role: 'OFFICER' })
        .expect(201);
      expect(created.body.role).toBe('OFFICER');

      const officer = await loginAs(email, password);
      expect(officer.response.body.user.role).toBe('OFFICER');

      const search = await http()
        .get(`/users?q=${encodeURIComponent(email)}&role=OFFICER`)
        .set('Cookie', admin.cookie)
        .expect(200);
      expect(search.body.meta.total).toBe(1);
    });

    it('a deactivated user cannot sign in or refresh', async () => {
      const admin = await loginAs(adminEmail, adminPassword);
      const email = uniqueEmail('deactivate');
      const created = await http()
        .post('/users')
        .set('Cookie', admin.cookie)
        .send({ email, password, fullName: 'Soon Gone', role: 'REQUESTER' })
        .expect(201);
      const victim = await loginAs(email, password);

      await http()
        .patch(`/users/${created.body.id}/status`)
        .set('Cookie', admin.cookie)
        .send({ isActive: false })
        .expect(200);

      await http()
        .post('/auth/login')
        .send({ email, password })
        .expect(403);
      await http()
        .post('/auth/refresh')
        .set('Cookie', victim.cookie)
        .expect(401);
    });

    it('an admin cannot deactivate or demote themselves', async () => {
      const admin = await loginAs(adminEmail, adminPassword);
      const me = admin.response.body.user.id as string;
      await http()
        .patch(`/users/${me}/status`)
        .set('Cookie', admin.cookie)
        .send({ isActive: false })
        .expect(400);
      await http()
        .patch(`/users/${me}/role`)
        .set('Cookie', admin.cookie)
        .send({ role: 'REQUESTER' })
        .expect(400);
    });
  });

  describe('refresh and logout', () => {
    it('refresh rotates the token: the old one stops working', async () => {
      const email = uniqueEmail('rotate');
      const registered = await http()
        .post('/auth/register')
        .send({ email, password, fullName: 'Rota Tion' })
        .expect(201);
      const firstCookie = cookieHeader(setCookies(registered));

      const refreshed = await http()
        .post('/auth/refresh')
        .set('Cookie', firstCookie)
        .expect(200);
      const secondCookie = cookieHeader(setCookies(refreshed));
      expect(secondCookie).not.toBe(firstCookie);

      // Replaying the first refresh token is treated as theft: it fails,
      // and it also ends the session that the second token belonged to.
      await http().post('/auth/refresh').set('Cookie', firstCookie).expect(401);
      await http().post('/auth/refresh').set('Cookie', secondCookie).expect(401);
    });

    it('after logout the refresh token is dead and cookies are cleared', async () => {
      const email = uniqueEmail('logout');
      const registered = await http()
        .post('/auth/register')
        .send({ email, password, fullName: 'Log Out' })
        .expect(201);
      const cookie = cookieHeader(setCookies(registered));

      const loggedOut = await http()
        .post('/auth/logout')
        .set('Cookie', cookie)
        .expect(200);
      for (const cleared of setCookies(loggedOut)) {
        expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);
      }
      await http().post('/auth/refresh').set('Cookie', cookie).expect(401);
    });

    it('logout without any cookie still succeeds', async () => {
      await http().post('/auth/logout').expect(200);
    });
  });

  describe('audit trail', () => {
    it('records login, failed login, logout and user creation', async () => {
      const admin = await loginAs(adminEmail, adminPassword);
      const email = uniqueEmail('audit');
      const created = await http()
        .post('/users')
        .set('Cookie', admin.cookie)
        .send({ email, password, fullName: 'Audit Trail', role: 'REQUESTER' })
        .expect(201);
      const userId = created.body.id as string;

      await http()
        .post('/auth/login')
        .send({ email, password: 'wrong-password' })
        .expect(401);
      const session = await loginAs(email, password);
      await http().post('/auth/logout').set('Cookie', session.cookie).expect(200);

      const rows = await prisma.auditLog.findMany({
        where: { entity: 'User', entityId: userId },
        orderBy: { createdAt: 'asc' },
      });
      expect(rows.map((row) => row.action)).toEqual([
        'user.created',
        'auth.login_failed',
        'auth.login',
        'auth.logout',
      ]);
      expect(rows[0].actorId).toBe(admin.response.body.user.id);
    });
  });
});
