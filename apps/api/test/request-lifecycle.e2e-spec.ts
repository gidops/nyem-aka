import type { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { LOCAL_UPLOADS_DIR } from '../src/attachments/storage/local-disk.storage.js';
import { StorageService } from '../src/attachments/storage/storage.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  cookieHeader,
  createTestApp,
  emailFactory,
  setCookies,
} from './helpers.js';

const emails = emailFactory('lifecycle');
const password = 'correct-horse-battery';

// The smallest thing that passes for each format: just the signature bytes.
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);

// Walks the Phase 3 checkpoint: submit → assign → progress → complete, with the
// visibility, state-machine, history, search and audit rules checked along the way.
describe('Request lifecycle (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  // One signed-in session per actor, created once.
  const actors = {} as Record<
    'admin' | 'requester' | 'otherRequester' | 'officer' | 'otherOfficer',
    { cookie: string; id: string }
  >;
  let categoryId: number;

  async function login(email: string, pass: string) {
    const response = await http()
      .post('/auth/login')
      .send({ email, password: pass })
      .expect(200);
    return {
      cookie: cookieHeader(setCookies(response)),
      id: response.body.user.id as string,
    };
  }

  async function createUser(label: string, role: 'REQUESTER' | 'OFFICER') {
    const email = emails.unique(label);
    await http()
      .post('/users')
      .set('Cookie', actors.admin.cookie)
      .send({ email, password, fullName: `Test ${label}`, role })
      .expect(201);
    return login(email, password);
  }

  async function submit(overrides: Record<string, unknown> = {}) {
    const response = await http()
      .post('/requests')
      .set('Cookie', actors.requester.cookie)
      .send({
        title: 'Leaking tap in Lab 2',
        description: 'The cold tap at the back sink drips constantly.',
        location: 'Science Block, Lab 2',
        categoryId,
        ...overrides,
      })
      .expect(201);
    return response.body as { id: string; reference: string; status: string };
  }

  const assign = (id: string, officerId: string, cookie = actors.admin.cookie) =>
    http().post(`/requests/${id}/assign`).set('Cookie', cookie).send({ officerId });

  const setStatus = (id: string, cookie: string, status: string, note?: string) =>
    http().patch(`/requests/${id}/status`).set('Cookie', cookie).send({ status, note });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    actors.admin = await login(
      process.env.SEED_ADMIN_EMAIL!,
      process.env.SEED_ADMIN_PASSWORD!,
    );
    actors.requester = await createUser('requester', 'REQUESTER');
    actors.otherRequester = await createUser('other-requester', 'REQUESTER');
    actors.officer = await createUser('officer', 'OFFICER');
    actors.otherOfficer = await createUser('other-officer', 'OFFICER');

    const categories = await http()
      .get('/categories')
      .set('Cookie', actors.requester.cookie)
      .expect(200);
    categoryId = (categories.body as { id: number; name: string }[]).find(
      (category) => category.name === 'Plumbing',
    )!.id;
  });

  afterAll(async () => {
    // Remove stored files, then requests (their logs, assignments and attachment
    // rows cascade), then the users and categories this suite created.
    const mine = { requester: { email: { startsWith: emails.prefix } } };
    const files = await prisma.attachment.findMany({
      where: { request: mine },
      select: { publicId: true },
    });
    const storage = app.get(StorageService);
    await Promise.all(files.map((file) => storage.remove(file.publicId)));
    await prisma.serviceRequest.deleteMany({ where: mine });
    await prisma.user.deleteMany({ where: { email: { startsWith: emails.prefix } } });
    await prisma.category.deleteMany({ where: { name: { startsWith: emails.prefix } } });
    await app.close();
  });

  describe('the full script', () => {
    let id: string;
    let reference: string;

    it('1. a requester submits a request and attaches two images', async () => {
      const created = await submit();
      id = created.id;
      reference = created.reference;
      expect(created.status).toBe('PENDING');
      expect(reference).toMatch(/^NA-\d{6}$/);

      for (const [name, bytes] of [['tap.png', PNG], ['floor.jpg', JPEG]] as const) {
        const upload = await http()
          .post(`/requests/${id}/attachments`)
          .set('Cookie', actors.requester.cookie)
          .attach('file', bytes, name)
          .expect(201);
        expect(upload.body.fileName).toBe(name);
        // Served back by the API, so the image can actually be displayed.
        await http().get(upload.body.url as string).expect(200);
      }
    });

    it('2. another requester cannot see it (404, not 403)', async () => {
      await http()
        .get(`/requests/${id}`)
        .set('Cookie', actors.otherRequester.cookie)
        .expect(404);
      const list = await http()
        .get('/requests')
        .set('Cookie', actors.otherRequester.cookie)
        .expect(200);
      expect(list.body.meta.total).toBe(0);
    });

    it('3. an admin assigns it to an officer', async () => {
      // Before assignment the officer cannot see it either.
      await http().get(`/requests/${id}`).set('Cookie', actors.officer.cookie).expect(404);

      const assigned = await assign(id, actors.officer.id).expect(200);
      expect(assigned.body.status).toBe('ASSIGNED');
      expect(assigned.body.assignedOfficer.id).toBe(actors.officer.id);
    });

    it('4. only the assigned officer can progress and complete it', async () => {
      await setStatus(id, actors.otherOfficer.cookie, 'IN_PROGRESS').expect(404);
      await setStatus(id, actors.requester.cookie, 'IN_PROGRESS').expect(403);

      const started = await setStatus(id, actors.officer.cookie, 'IN_PROGRESS', 'On site').expect(200);
      expect(started.body.status).toBe('IN_PROGRESS');

      const done = await setStatus(id, actors.officer.cookie, 'COMPLETED', 'Washer replaced').expect(200);
      expect(done.body.status).toBe('COMPLETED');
      expect(done.body.completedAt).not.toBeNull();
    });

    it('5. skipping steps is refused with 400', async () => {
      const fresh = await submit({ title: 'Flickering light in corridor' });
      // Nobody can jump PENDING → COMPLETED.
      const refused = await setStatus(fresh.id, actors.admin.cookie, 'COMPLETED').expect(400);
      expect(refused.body.message).toMatch(/cannot become COMPLETED/);
      // And the status endpoint cannot be used to assign without naming an officer.
      await setStatus(fresh.id, actors.admin.cookie, 'ASSIGNED').expect(400);
    });

    it('6. the timeline shows four entries in order, with names and notes', async () => {
      const detail = await http()
        .get(`/requests/${id}`)
        .set('Cookie', actors.requester.cookie)
        .expect(200);
      const timeline = detail.body.timeline as {
        fromStatus: string | null;
        toStatus: string;
        note: string | null;
        changedBy: { fullName: string; role: string };
      }[];

      expect(timeline.map((entry) => [entry.fromStatus, entry.toStatus])).toEqual([
        [null, 'PENDING'],
        ['PENDING', 'ASSIGNED'],
        ['ASSIGNED', 'IN_PROGRESS'],
        ['IN_PROGRESS', 'COMPLETED'],
      ]);
      expect(timeline.map((entry) => entry.changedBy.role)).toEqual([
        'REQUESTER',
        'ADMIN',
        'OFFICER',
        'OFFICER',
      ]);
      expect(timeline[3].note).toBe('Washer replaced');
      expect(detail.body.attachments).toHaveLength(2);
      // No user secrets anywhere in the response.
      expect(JSON.stringify(detail.body)).not.toMatch(/passwordHash|refreshTokenHash/);
    });

    it('7. reassigning keeps history: the old assignment is closed, a new one opened', async () => {
      const fresh = await submit({ title: 'Broken door handle, Room 12' });
      await assign(fresh.id, actors.officer.id).expect(200);
      // Assigning the same officer again is pointless and refused.
      await assign(fresh.id, actors.officer.id).expect(400);

      const reassigned = await assign(fresh.id, actors.otherOfficer.id).expect(200);
      const assignments = reassigned.body.assignments as {
        isActive: boolean;
        unassignedAt: string | null;
        officer: { id: string };
      }[];
      expect(assignments).toHaveLength(2);
      const [current, previous] = assignments; // newest first
      expect(current).toMatchObject({ isActive: true, officer: { id: actors.otherOfficer.id } });
      expect(previous).toMatchObject({ isActive: false, officer: { id: actors.officer.id } });
      expect(previous.unassignedAt).not.toBeNull();

      // The first officer has lost access; the second has gained it.
      await http().get(`/requests/${fresh.id}`).set('Cookie', actors.officer.cookie).expect(404);
      await http().get(`/requests/${fresh.id}`).set('Cookie', actors.otherOfficer.cookie).expect(200);
    });

    it('8. search, filters and pagination return the right rows and meta', async () => {
      await submit({ title: 'Roof leak above library desk', priority: 'URGENT' });
      await submit({ title: 'Leak under kitchen sink', priority: 'LOW' });

      const page = await http()
        .get('/requests?q=leak&status=PENDING&page=1&limit=1&sort=priority')
        .set('Cookie', actors.requester.cookie)
        .expect(200);
      expect(page.body.meta).toEqual({ total: 2, page: 1, limit: 1, totalPages: 2 });
      expect(page.body.data).toHaveLength(1);
      expect(page.body.data[0].priority).toBe('URGENT'); // highest priority first

      const byReference = await http()
        .get(`/requests?q=${reference}`)
        .set('Cookie', actors.requester.cookie)
        .expect(200);
      expect(byReference.body.data.map((row: { id: string }) => row.id)).toEqual([id]);

      const today = new Date().toISOString().slice(0, 10);
      const inRange = await http()
        .get(`/requests?from=${today}&to=${today}&status=COMPLETED`)
        .set('Cookie', actors.requester.cookie)
        .expect(200);
      expect(inRange.body.meta.total).toBe(1);

      // The officer's list contains only what is assigned to them.
      const officerList = await http()
        .get('/requests?limit=100')
        .set('Cookie', actors.officer.cookie)
        .expect(200);
      expect(officerList.body.data.map((row: { id: string }) => row.id)).toEqual([id]);

      await http().get('/requests?limit=500').set('Cookie', actors.requester.cookie).expect(400);
      await http().get('/requests?status=DONE').set('Cookie', actors.requester.cookie).expect(400);
    });

    it('9. the audit trail lists every step, and only admins can read it', async () => {
      const trail = await http()
        .get(`/audit-logs?entity=ServiceRequest&entityId=${id}&limit=50`)
        .set('Cookie', actors.admin.cookie)
        .expect(200);
      const actions = (trail.body.data as { action: string }[])
        .map((row) => row.action)
        .reverse(); // the endpoint returns newest first
      expect(actions).toEqual([
        'request.created',
        'attachment.added',
        'attachment.added',
        'request.assigned',
        'request.in_progress',
        'request.completed',
      ]);

      await http().get('/audit-logs').set('Cookie', actors.requester.cookie).expect(403);
      await http().get('/audit-logs').set('Cookie', actors.officer.cookie).expect(403);
    });
  });

  describe('other lifecycle rules', () => {
    it('a requester can edit and cancel only while pending', async () => {
      const fresh = await submit({ title: 'Blocked drain outside hostel' });
      const edited = await http()
        .patch(`/requests/${fresh.id}`)
        .set('Cookie', actors.requester.cookie)
        .send({ title: 'Blocked drain outside Hostel B' })
        .expect(200);
      expect(edited.body.title).toBe('Blocked drain outside Hostel B');

      await assign(fresh.id, actors.officer.id).expect(200);
      await http()
        .patch(`/requests/${fresh.id}`)
        .set('Cookie', actors.requester.cookie)
        .send({ title: 'Too late to change this' })
        .expect(400);
      await http()
        .post(`/requests/${fresh.id}/cancel`)
        .set('Cookie', actors.requester.cookie)
        .expect(400);

      const other = await submit({ title: 'Reported by mistake, ignore' });
      const cancelled = await http()
        .post(`/requests/${other.id}/cancel`)
        .set('Cookie', actors.requester.cookie)
        .expect(200);
      expect(cancelled.body.status).toBe('CANCELLED');
      // Cancelled is final.
      await assign(other.id, actors.officer.id).expect(400);
    });

    it('rejecting and reopening need a note; an admin can reopen a completed request', async () => {
      const toReject = await submit({ title: 'Please repaint my whole office' });
      await setStatus(toReject.id, actors.admin.cookie, 'REJECTED').expect(400);
      const rejected = await setStatus(
        toReject.id,
        actors.admin.cookie,
        'REJECTED',
        'Not a maintenance fault',
      ).expect(200);
      expect(rejected.body.status).toBe('REJECTED');

      const toReopen = await submit({ title: 'Socket sparks when used' });
      await assign(toReopen.id, actors.officer.id).expect(200);
      await setStatus(toReopen.id, actors.officer.cookie, 'IN_PROGRESS').expect(200);
      await setStatus(toReopen.id, actors.officer.cookie, 'COMPLETED').expect(200);
      // The officer cannot reopen their own work; the admin can, with a reason.
      await setStatus(toReopen.id, actors.officer.cookie, 'IN_PROGRESS', 'again').expect(403);
      const reopened = await setStatus(
        toReopen.id,
        actors.admin.cookie,
        'IN_PROGRESS',
        'Still sparking',
      ).expect(200);
      expect(reopened.body.status).toBe('IN_PROGRESS');
      expect(reopened.body.completedAt).toBeNull();
    });

    it('only requesters submit; only admins assign; the assignee must be an active officer', async () => {
      const body = {
        title: 'Officer trying to submit',
        description: 'This should not be allowed.',
        location: 'Anywhere',
        categoryId,
      };
      await http().post('/requests').set('Cookie', actors.officer.cookie).send(body).expect(403);
      await http().post('/requests').send(body).expect(401);

      const fresh = await submit({ title: 'Window will not close' });
      await assign(fresh.id, actors.officer.id, actors.requester.cookie).expect(403);
      await assign(fresh.id, actors.requester.id).expect(400); // not an officer
      await assign(fresh.id, 'no-such-user').expect(400);
    });

    it('validates a new request', async () => {
      const post = (body: Record<string, unknown>) =>
        http().post('/requests').set('Cookie', actors.requester.cookie).send(body);
      const valid = {
        title: 'A valid title',
        description: 'A valid description.',
        location: 'Block A',
        categoryId,
      };
      await post({ ...valid, title: 'abc' }).expect(400); // too short
      await post({ ...valid, categoryId: 999_999 }).expect(400); // no such category
      await post({ ...valid, priority: 'ASAP' }).expect(400); // not a priority
      await post({ ...valid, status: 'COMPLETED' }).expect(400); // cannot set status
      await post({ ...valid, requesterId: actors.otherRequester.id }).expect(400); // cannot impersonate
    });
  });

  describe('attachments', () => {
    it('rejects non-images, missing files, oversized files and strangers', async () => {
      const fresh = await submit({ title: 'Cracked window pane' });
      const upload = (cookie: string) =>
        http().post(`/requests/${fresh.id}/attachments`).set('Cookie', cookie);

      // A script renamed to .png is still not an image.
      await upload(actors.requester.cookie)
        .attach('file', Buffer.from('<script>alert(1)</script>'), {
          filename: 'evil.png',
          contentType: 'image/png',
        })
        .expect(400);
      await upload(actors.requester.cookie).expect(400);
      await upload(actors.requester.cookie)
        .attach('file', Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024 + 1)]), 'huge.png')
        .expect(413);
      await upload(actors.otherRequester.cookie).attach('file', PNG, 'x.png').expect(404);
      await upload(actors.officer.cookie).attach('file', PNG, 'x.png').expect(404); // not assigned
    });

    it('enforces five images per person, lets the uploader delete, and removes the file', async () => {
      const fresh = await submit({ title: 'Ceiling fan wobbles badly' });
      const ids: string[] = [];
      const urls: string[] = [];
      for (let index = 0; index < 5; index += 1) {
        const upload = await http()
          .post(`/requests/${fresh.id}/attachments`)
          .set('Cookie', actors.requester.cookie)
          .attach('file', PNG, `fan-${index}.png`)
          .expect(201);
        ids.push(upload.body.id as string);
        urls.push(upload.body.url as string);
      }
      await http()
        .post(`/requests/${fresh.id}/attachments`)
        .set('Cookie', actors.requester.cookie)
        .attach('file', PNG, 'one-too-many.png')
        .expect(400);

      // The assigned officer can add their own evidence, but not delete the requester's.
      await assign(fresh.id, actors.officer.id).expect(200);
      await http()
        .post(`/requests/${fresh.id}/attachments`)
        .set('Cookie', actors.officer.cookie)
        .attach('file', JPEG, 'after-repair.jpg')
        .expect(201);
      await http().delete(`/attachments/${ids[0]}`).set('Cookie', actors.officer.cookie).expect(403);
      await http().delete(`/attachments/${ids[0]}`).set('Cookie', actors.otherRequester.cookie).expect(404);

      const fileOnDisk = join(LOCAL_UPLOADS_DIR, urls[0].split('/').pop()!);
      expect(existsSync(fileOnDisk)).toBe(true);
      await http().delete(`/attachments/${ids[0]}`).set('Cookie', actors.requester.cookie).expect(200);
      expect(existsSync(fileOnDisk)).toBe(false);
      await http().delete(`/attachments/${ids[1]}`).set('Cookie', actors.admin.cookie).expect(200);

      // No more images once the work is finished.
      await setStatus(fresh.id, actors.officer.cookie, 'IN_PROGRESS').expect(200);
      await setStatus(fresh.id, actors.officer.cookie, 'COMPLETED').expect(200);
      await http()
        .post(`/requests/${fresh.id}/attachments`)
        .set('Cookie', actors.officer.cookie)
        .attach('file', JPEG, 'late.jpg')
        .expect(400);
    });
  });

  describe('categories', () => {
    it('admins manage categories; in-use ones cannot be deleted; inactive ones are hidden', async () => {
      const name = `${emails.prefix}Lifts-${Date.now()}`;
      await http().post('/categories').set('Cookie', actors.requester.cookie).send({ name }).expect(403);

      const created = await http()
        .post('/categories')
        .set('Cookie', actors.admin.cookie)
        .send({ name, description: 'Lifts and escalators' })
        .expect(201);
      const newId = created.body.id as number;
      await http().post('/categories').set('Cookie', actors.admin.cookie).send({ name }).expect(409);

      const fresh = await submit({ title: 'Lift stuck between floors', categoryId: newId });
      const refused = await http()
        .delete(`/categories/${newId}`)
        .set('Cookie', actors.admin.cookie)
        .expect(409);
      expect(refused.body.message).toMatch(/Deactivate it instead/);

      await http()
        .patch(`/categories/${newId}`)
        .set('Cookie', actors.admin.cookie)
        .send({ isActive: false })
        .expect(200);
      const visible = await http().get('/categories').set('Cookie', actors.requester.cookie).expect(200);
      expect((visible.body as { id: number }[]).some((category) => category.id === newId)).toBe(false);
      await http()
        .post('/requests')
        .set('Cookie', actors.requester.cookie)
        .send({
          title: 'Another lift problem',
          description: 'Should be refused: category is inactive.',
          location: 'Tower',
          categoryId: newId,
        })
        .expect(400);

      // The existing request keeps its category.
      const detail = await http().get(`/requests/${fresh.id}`).set('Cookie', actors.admin.cookie).expect(200);
      expect(detail.body.category.id).toBe(newId);
    });
  });

  describe('reports', () => {
    it('summary counts by status and is admin-only', async () => {
      const summary = await http()
        .get('/reports/summary')
        .set('Cookie', actors.admin.cookie)
        .expect(200);
      const byStatus = summary.body.byStatus as Record<string, number>;
      expect(Object.keys(byStatus).sort()).toEqual(
        ['ASSIGNED', 'CANCELLED', 'COMPLETED', 'IN_PROGRESS', 'PENDING', 'REJECTED'],
      );
      expect(summary.body.total).toBe(
        Object.values(byStatus).reduce((sum, count) => sum + count, 0),
      );
      expect(summary.body.open).toBe(byStatus.PENDING + byStatus.ASSIGNED + byStatus.IN_PROGRESS);
      expect(typeof summary.body.averageCompletionHours).toBe('number');

      await http().get('/reports/summary').set('Cookie', actors.officer.cookie).expect(403);
      await http().get('/reports/requests.csv').set('Cookie', actors.requester.cookie).expect(403);
    });

    it('the open/closed group filter matches the individual statuses', async () => {
      const count = async (query: string) =>
        (await http().get(`/requests?limit=1&${query}`).set('Cookie', actors.requester.cookie).expect(200))
          .body.meta.total as number;
      expect(await count('group=open')).toBe(
        (await count('status=PENDING')) + (await count('status=ASSIGNED')) + (await count('status=IN_PROGRESS')),
      );
      expect((await count('group=open')) + (await count('group=closed'))).toBe(await count(''));
    });

    it('CSV export matches the filter, escapes dangerous cells and is audited', async () => {
      const marker = `csvmark${Date.now()}`;
      await submit({ title: `=HYPERLINK("http://evil") ${marker}`, location: 'Block A, Room 2' });
      await submit({ title: `Ordinary request ${marker}` });

      const response = await http()
        .get(`/reports/requests.csv?q=${marker}`)
        .set('Cookie', actors.admin.cookie)
        .expect(200);
      expect(response.headers['content-type']).toMatch(/text\/csv/);
      expect(response.headers['content-disposition']).toMatch(/attachment; filename="nyem-aka-requests-/);

      const lines = response.text.replace(/^\uFEFF/, '').trim().split('\r\n');
      expect(lines).toHaveLength(3); // header + the two matching requests
      expect(lines[0].startsWith('Reference,Title,Category')).toBe(true);
      // The formula is defused with a leading apostrophe, and the comma is quoted.
      expect(response.text).toContain(`"'=HYPERLINK(""http://evil"") ${marker}"`);
      expect(response.text).toContain('"Block A, Room 2"');

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'report.exported', actorId: actors.admin.id },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit?.metadata).toMatchObject({ rows: 2, filters: { q: marker } });
    });
  });

  describe('two people acting at once', () => {
    it('only one of two simultaneous status changes wins; the other gets 409 or 400', async () => {
      const fresh = await submit({ title: 'Tap handle snapped off' });
      await assign(fresh.id, actors.officer.id).expect(200);

      const results = await Promise.all([
        setStatus(fresh.id, actors.officer.cookie, 'IN_PROGRESS'),
        setStatus(fresh.id, actors.officer.cookie, 'IN_PROGRESS'),
      ]);
      const codes = results.map((result) => result.status).sort((a, b) => a - b);
      expect(codes[0]).toBe(200);
      expect([400, 409]).toContain(codes[1]);

      // Exactly one timeline entry for the move, not two.
      const logs = await prisma.statusLog.count({
        where: { requestId: fresh.id, toStatus: 'IN_PROGRESS' },
      });
      expect(logs).toBe(1);
    });
  });
});
