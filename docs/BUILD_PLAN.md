# Nyem Aka: Phased Build Plan

University Maintenance & Service Request System. Next.js + NestJS + Prisma + PostgreSQL, deployed to Vercel, Render and Neon.

Each phase has a goal, the reason it sits where it does, what you create, the endpoints or pages involved, and a checkpoint to pass before moving on. Do not start a phase until the previous checkpoint passes: every phase assumes the one before it works.

| Phase | Builds | You can demo afterwards |
| --- | --- | --- |
| 0 | Repository and tooling | Both apps boot locally |
| 1 | Prisma schema and seed | Data model visible in Prisma Studio |
| 2 | Auth and RBAC | Login, cookies, role-protected routes in Swagger |
| 3 | Request lifecycle | Full submit → assign → complete flow via the API |
| 4 | Design system and role dashboards | The whole product in the browser, on mobile too |
| 5 | Tests | Passing unit, e2e and browser tests |
| 6 | Deployment | Live URLs |

---

## Phase 0: Repository and tooling

**Goal.** One repository holding both apps, with a local database, so every later phase starts from a working base.

**Why now.** Folder layout and tooling are expensive to change later. Vercel and Render each deploy from a subfolder, so the split has to exist from day one.

**Create.**

```
nyem-aka/
  package.json            npm workspaces: ["apps/*"]
  docker-compose.yml      Postgres 16 for local dev
  .gitignore  .nvmrc      Node 20+
  apps/api/               nest new api
  apps/web/               create-next-app (TypeScript, App Router, Tailwind)
  docs/
```

**Endpoints / pages.** `GET /health` on the API; the default Next.js page.

**Checkpoint.**
- `docker compose up -d` starts Postgres.
- `npm run start:dev -w api` answers `GET http://localhost:4000/health`.
- `npm run dev -w web` serves `http://localhost:3000`.
- `git init` and the first commit are done.

---

## Phase 1: Prisma schema and relationships

**Goal.** Model every entity and relationship, migrate the database, and seed the reference data.

**Why now.** The schema is the contract everything else is written against: DTOs, guards, queries and screens all take their shape from it. A mistake here is cheap to fix today and costly after three modules depend on it.

**Design decisions (the why).**

- **`Role` is a table, not just an enum on `User`.** Roles are a required entity, and a table gives a real one-to-many relationship to show. The role *name* is still an enum so code can check it safely.
- **`Assignment` is its own table.** A request can be reassigned, so the link between a request and an officer has history and extra data (who assigned it, when, a note). That makes it a many-to-many relationship between `ServiceRequest` and `User` through an explicit join table.
- **`StatusLog` and `AuditLog` are separate.** `StatusLog` is the timeline a requester sees on one request. `AuditLog` is the admin-only record of every significant action in the system.
- **`User` has three relations to other tables by role in the action** (requester, assigned officer, assigning admin), so the relations are named.
- **`number` is an auto-increment** used to show a friendly reference such as `NA-000042`. The database generates it, so two simultaneous submissions cannot collide.
- **Users are deactivated, never deleted,** so history keeps valid foreign keys. Child rows of a request (attachments, logs, assignments) cascade if the request is deleted.

**Relationship types (you will reuse this table in the report).**

| Relationship | Type | Implemented by |
| --- | --- | --- |
| Role → User | One-to-many | `User.roleId` |
| User → ServiceRequest (requester) | One-to-many | `ServiceRequest.requesterId` |
| Category → ServiceRequest | One-to-many | `ServiceRequest.categoryId` |
| ServiceRequest → StatusLog | One-to-many | `StatusLog.requestId` |
| ServiceRequest → Attachment | One-to-many | `Attachment.requestId` |
| ServiceRequest ↔ User (officer) | Many-to-many with payload | `Assignment` join table |
| User → AuditLog | One-to-many, optional | `AuditLog.actorId` (nullable) |

**Create.** `apps/api/prisma/schema.prisma`, `apps/api/prisma.config.ts`, `apps/api/prisma/seed.ts`, `apps/api/src/prisma/prisma.module.ts`, `prisma.service.ts`, `apps/api/.env` and `.env.example`.

**Prisma 7 notes.** The client is generated as TypeScript into `apps/api/src/generated/prisma` (git-ignored) and imported from `../generated/prisma/client.js`. `migrate dev` no longer regenerates it, so run `npx prisma generate` after every schema change (it also runs on `npm install`). The client needs a driver adapter (`@prisma/adapter-pg`).

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

// Prisma 7: no connection URL here. The CLI reads DIRECT_URL from prisma.config.ts;
// the running API passes DATABASE_URL to a driver adapter in prisma.service.ts.
datasource db {
  provider = "postgresql"
}

enum RoleName {
  REQUESTER
  OFFICER
  ADMIN
}

enum RequestStatus {
  PENDING
  ASSIGNED
  IN_PROGRESS
  COMPLETED
  REJECTED
  CANCELLED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

model Role {
  id          Int      @id @default(autoincrement())
  name        RoleName @unique
  description String?
  users       User[]
}

model User {
  id               String   @id @default(cuid())
  email            String   @unique
  passwordHash     String
  fullName         String
  department       String?
  isActive         Boolean  @default(true)
  refreshTokenHash String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  roleId Int
  role   Role @relation(fields: [roleId], references: [id])

  requests            ServiceRequest[] @relation("RequestedBy")
  assignmentsReceived Assignment[]     @relation("AssignedOfficer")
  assignmentsMade     Assignment[]     @relation("AssignedBy")
  statusLogs          StatusLog[]
  attachments         Attachment[]
  auditLogs           AuditLog[]

  @@index([roleId])
}

model Category {
  id          Int              @id @default(autoincrement())
  name        String           @unique
  description String?
  isActive    Boolean          @default(true)
  requests    ServiceRequest[]
}

model ServiceRequest {
  id          String        @id @default(cuid())
  number      Int           @unique @default(autoincrement()) // shown as NA-000042
  title       String
  description String
  location    String
  priority    Priority      @default(MEDIUM)
  status      RequestStatus @default(PENDING)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  completedAt DateTime?

  categoryId Int
  category   Category @relation(fields: [categoryId], references: [id])

  requesterId String
  requester   User   @relation("RequestedBy", fields: [requesterId], references: [id])

  assignments Assignment[]
  statusLogs  StatusLog[]
  attachments Attachment[]

  @@index([status])
  @@index([requesterId])
  @@index([categoryId])
  @@index([createdAt])
}

model Assignment {
  id           String    @id @default(cuid())
  note         String?
  isActive     Boolean   @default(true)
  assignedAt   DateTime  @default(now())
  unassignedAt DateTime?

  requestId String
  request   ServiceRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)

  officerId String
  officer   User   @relation("AssignedOfficer", fields: [officerId], references: [id])

  assignedById String
  assignedBy   User   @relation("AssignedBy", fields: [assignedById], references: [id])

  @@index([officerId, isActive])
  @@index([requestId])
}

model StatusLog {
  id         String         @id @default(cuid())
  fromStatus RequestStatus?
  toStatus   RequestStatus
  note       String?
  createdAt  DateTime       @default(now())

  requestId String
  request   ServiceRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)

  changedById String
  changedBy   User   @relation(fields: [changedById], references: [id])

  @@index([requestId, createdAt])
}

model Attachment {
  id        String   @id @default(cuid())
  url       String
  publicId  String   // Cloudinary id, needed to delete the file
  fileName  String
  mimeType  String
  sizeBytes Int
  createdAt DateTime @default(now())

  requestId String
  request   ServiceRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)

  uploadedById String
  uploadedBy   User   @relation(fields: [uploadedById], references: [id])

  @@index([requestId])
}

model AuditLog {
  id        String   @id @default(cuid())
  action    String   // e.g. "auth.login", "request.assigned", "user.role_changed"
  entity    String   // e.g. "ServiceRequest"
  entityId  String?
  metadata  Json?
  ip        String?
  createdAt DateTime @default(now())

  actorId String?
  actor   User?   @relation(fields: [actorId], references: [id], onDelete: SetNull)

  @@index([entity, entityId])
  @@index([actorId])
  @@index([createdAt])
}
```

**Seed (`prisma/seed.ts`).** Upsert the three roles; categories (Electrical, Plumbing, Carpentry, HVAC, ICT/Network, Cleaning, Other); one admin from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. Upserts make the seed safe to run twice.

**Endpoints / pages.** None yet.

**Checkpoint.**
- `npx prisma migrate dev --name init` then `npx prisma generate` succeed (run inside `apps/api`).
- `npx prisma db seed` runs twice without errors or duplicates.
- `npx prisma studio` shows 8 tables, 3 roles, the categories and one admin with a hashed password.
- `GET /health` returns `"database": "connected"`.
- You can explain each row of the relationship table above without looking.

---

## Phase 2: Authentication and role-based access control

**Goal.** Register, log in, stay logged in, log out, and restrict routes by role. Swagger is switched on here so every later endpoint is documented as it is written.

**Why now.** Every request-lifecycle endpoint needs to know *who* is calling and *what they may do*. Building features first and bolting auth on afterwards means rewriting every controller.

**Design decisions (the why).**

- **httpOnly cookies, not `localStorage`.** JavaScript cannot read an httpOnly cookie, so an XSS bug cannot steal the token.
- **Two tokens.** A 15-minute access token limits the damage of a leaked token; a 7-day refresh token saves the user from logging in every 15 minutes. The refresh token rotates on each use and only its hash is stored, so a database leak does not expose usable tokens and logout can revoke it.
- **The browser talks only to the web origin.** Vercel and Render are different sites, and browsers increasingly block cross-site cookies. `next.config.ts` rewrites `/api/:path*` to the API, so cookies are first-party. This also removes most CORS trouble and lets Next middleware read the cookie.
- **Cookies bring CSRF risk.** `SameSite=Lax` plus the same-origin proxy covers it for this project; state-changing routes never use `GET`.
- **Self-registration creates a `REQUESTER` only.** Otherwise anyone could sign up as an admin. Officers and admins are created by an admin.
- **Guards are global and opt-out.** A forgotten decorator then fails closed (401) rather than open.

**Create (API).**

```
src/main.ts                       cookie-parser, helmet, ValidationPipe({ whitelist: true }), Swagger at /docs
src/auth/
  auth.module.ts  auth.controller.ts  auth.service.ts
  strategies/jwt.strategy.ts      reads the token from the cookie
  guards/jwt-auth.guard.ts  guards/roles.guard.ts
  decorators/public.decorator.ts  roles.decorator.ts  current-user.decorator.ts
  dto/register.dto.ts  login.dto.ts
src/users/
  users.module.ts  users.controller.ts  users.service.ts  dto/
src/audit/
  audit.module.ts  audit.service.ts   log(tx, { actorId, action, entity, entityId, metadata })
```

The cookie settings are the part most worth understanding:

```ts
res.cookie('access_token', accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 15 * 60 * 1000,
});
```

**Create (web).** `next.config.ts` (the rewrite), `lib/api.ts` (fetch wrapper: `credentials: "include"`, one silent refresh-and-retry on 401), `middleware.ts` (redirects to `/login` when the cookie is missing), `app/(public)/login/page.tsx`, `app/(public)/register/page.tsx`. Keep these two pages plain for now; styling comes in Phase 4.

**Endpoints.**

| Method | Path | Access |
| --- | --- | --- |
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |
| POST | `/auth/refresh` | Refresh cookie |
| POST | `/auth/logout` | Signed in |
| GET | `/auth/me` | Signed in |
| GET | `/users` (search, role filter, pagination) | ADMIN |
| POST | `/users` | ADMIN |
| PATCH | `/users/:id` | ADMIN |
| PATCH | `/users/:id/role` | ADMIN |
| PATCH | `/users/:id/status` (activate / deactivate) | ADMIN |

**Checkpoint.**
- In Swagger, log in as the seeded admin: the response sets two cookies and the body contains no token.
- DevTools → Application → Cookies shows both as `HttpOnly`; `document.cookie` in the console shows neither.
- `GET /auth/me` returns the user without `passwordHash`.
- A registered requester gets **403** on `GET /users`; a signed-out caller gets **401**.
- After logout, `POST /auth/refresh` fails.
- `AuditLog` has rows for login, logout and user creation.

---

## Phase 3: Request lifecycle

**Goal.** The core of the product through the API: submit a request with images, assign it, progress it, complete it, and see the full history.

**Why now.** This is the business logic the dashboards display. Building and testing it through Swagger first means that when a screen misbehaves in Phase 4, you know the fault is in the UI.

**Design decisions (the why).**

- **A state machine in one file.** Allowed transitions and who may make them live in a single table, so there is one place to read, test and change the rules.

  | From | To | Who |
  | --- | --- | --- |
  | PENDING | ASSIGNED | ADMIN (by assigning) |
  | PENDING | REJECTED | ADMIN (note required) |
  | PENDING | CANCELLED | The requester |
  | ASSIGNED | ASSIGNED | ADMIN (reassign) |
  | ASSIGNED | IN_PROGRESS | The assigned officer |
  | IN_PROGRESS | COMPLETED | The assigned officer (sets `completedAt`) |
  | COMPLETED | IN_PROGRESS | ADMIN (reopen, note required) |

- **One transaction per change.** Updating the status, writing the `StatusLog`, writing the `AuditLog` and (for assignment) switching `Assignment` rows happen in a single `prisma.$transaction`. Either all of it is saved or none, so the history can never disagree with the current state.
- **Ownership scoping in the service.** A role check answers "may officers call this?"; it does not answer "is this *their* request?". `GET /requests` applies a `where` clause by role: requester → `requesterId = me`; officer → has an active assignment to me; admin → everything. Reading someone else's request returns 404, not 403, so ids cannot be probed.
- **Pagination is offset-based** (`page`, `limit`, capped at 100) returning `{ data, meta: { total, page, limit, totalPages } }`. It is simple and fits numbered pages in an admin table.
- **Images go to Cloudinary.** Render's disk is wiped on every deploy. The API accepts the upload in memory (multer), checks type (JPEG, PNG, WebP) and size (5 MB, max 5 per request), streams it to Cloudinary and stores only the URL and `publicId`.

**Create (API).**

```
src/categories/   module, controller, service, dto
src/requests/
  requests.module.ts  requests.controller.ts  requests.service.ts
  request-status.machine.ts          canTransition(from, to, role), pure function
  dto/create-request.dto.ts  update-request.dto.ts  query-requests.dto.ts
      assign-request.dto.ts  change-status.dto.ts
src/attachments/  module, controller, service, cloudinary.provider.ts
src/common/       dto/pagination.dto.ts, paginate.ts
```

**Endpoints.**

| Method | Path | Access |
| --- | --- | --- |
| GET | `/categories` | Signed in |
| POST / PATCH / DELETE | `/categories`, `/categories/:id` | ADMIN |
| POST | `/requests` | REQUESTER |
| GET | `/requests?q=&status=&categoryId=&priority=&from=&to=&sort=&page=&limit=` | Signed in, scoped by role |
| GET | `/requests/:id` (with assignments, timeline, attachments) | Owner, assigned officer, ADMIN |
| PATCH | `/requests/:id` | Owner, while PENDING |
| POST | `/requests/:id/cancel` | Owner, while PENDING |
| POST | `/requests/:id/assign` | ADMIN |
| PATCH | `/requests/:id/status` | Assigned officer, ADMIN |
| POST | `/requests/:id/attachments` (multipart) | Owner, assigned officer |
| DELETE | `/attachments/:id` | Uploader, ADMIN |
| GET | `/audit-logs?entity=&actorId=&from=&to=&page=` | ADMIN |

**Checkpoint.** Run this script in Swagger using three accounts:
1. Requester creates a request and uploads two images. Status is `PENDING`.
2. A second requester cannot see it (404).
3. Admin assigns it to an officer. Status is `ASSIGNED`.
4. A different officer cannot change it. The assigned officer moves it to `IN_PROGRESS`, then `COMPLETED`.
5. Trying `PENDING → COMPLETED` directly on a new request returns 400.
6. `GET /requests/:id` shows four timeline entries in order, with names and notes.
7. Admin reassigns another request: the old `Assignment` has `isActive = false`, the new one `true`.
8. `GET /requests?q=leak&status=PENDING&page=1&limit=5` returns the right rows and correct `meta`.
9. `GET /audit-logs` lists every step above.

---

## Phase 4: Design system and role dashboards

**Goal.** The complete product in the browser for all three roles, in the Nyem Aka visual style, usable on a phone.

**Why now.** The API is finished and proven, so this phase is purely presentation and interaction. Splitting it in two steps (components first, pages second) keeps pages consistent and short.

### 4a. Design system

**Why first.** If every page invents its own button, the product looks stitched together and each change is made ten times. Tokens and a small set of components are built once and reused.

Tokens in `app/globals.css` (Tailwind `@theme`). Starting values; adjust to taste, but keep text contrast at 4.5:1 or better:

| Token | Value | Use |
| --- | --- | --- |
| `canvas` | `#FAF7F2` | Page background, warm off-white |
| `surface` | `#FFFFFF` | Cards |
| `ink` | `#2B2A28` | Text, charcoal |
| `muted` | `#6B6762` | Secondary text |
| `line` | `#E3DED6` | Borders |
| `accent` | `#B5482A` | Terracotta: primary buttons, links, active tab |
| `accent-soft` | `#F6E7E0` | Hero band, selected rows |

Style rules: cards are flat with a 1px border and no shadow; buttons are pills (`rounded-full`); the hero is a full-width band; whitespace is generous. The typeface is an open-source one loaded with `next/font` (for example DM Sans). No Oracle logos, fonts or assets.

Components in `components/ui/`: `Button`, `Card`, `Input`, `Select`, `Textarea`, `Tabs`, `Badge`, `StatusBadge`, `PriorityBadge`, `DataTable`, `Pagination`, `Modal`, `Toast`, `EmptyState`, `Hero`, `AppShell`, `FileDropzone`, `Timeline`.

Mobile rules: write styles mobile-first; `DataTable` renders stacked cards below `md`; `AppShell` navigation becomes a drawer; tabs scroll horizontally; tap targets are at least 44px.

### 4b. Pages

Server state uses TanStack Query (caching, loading states, refetch after mutations). Filters live in the URL query string, so a filtered view can be bookmarked and survives refresh. Forms use react-hook-form with zod.

| Path | Role | Content |
| --- | --- | --- |
| `/` | Public | Hero band, how it works, sign-in call to action |
| `/login`, `/register` | Public | Restyled forms |
| `/requests` | REQUESTER | Tabs: Open / Completed / All; search; list |
| `/requests/new` | REQUESTER | Form with category, priority, location, image dropzone with previews |
| `/requests/[id]` | All (scoped) | Details, image gallery, timeline; actions depend on role and status |
| `/officer` | OFFICER | Tabs: Assigned / In progress / Completed; counts |
| `/admin` | ADMIN | Stat cards (by status, by category, average completion time), recent activity |
| `/admin/requests` | ADMIN | Full table with all filters, assign modal, **Export CSV** |
| `/admin/users` | ADMIN | Table, create user, change role, activate / deactivate |
| `/admin/categories` | ADMIN | CRUD |
| `/admin/audit` | ADMIN | Filterable audit trail |

After login, redirect by role (`/requests`, `/officer`, `/admin`). `middleware.ts` blocks signed-out users; the layout for each area checks the role from `/auth/me` and shows a 403 page otherwise. The API remains the real enforcement; UI checks are for usability only.

**New endpoints (API `src/reports/`).**

| Method | Path | Access |
| --- | --- | --- |
| GET | `/reports/summary?from=&to=` | ADMIN |
| GET | `/reports/requests.csv` (same filters as `/requests`) | ADMIN |

CSV notes: set `Content-Type: text/csv` and `Content-Disposition: attachment`; quote fields; prefix cells starting with `=`, `+`, `-` or `@` with `'` so a spreadsheet does not execute them as formulas; write an `AuditLog` row for each export.

**Checkpoint.**
- Complete the Phase 3 script entirely in the browser with three accounts.
- At 375px width (DevTools device mode) every page is usable with no horizontal scrolling.
- Refreshing a filtered admin table keeps the filters.
- The exported CSV opens in Excel or Sheets and matches the filtered table.
- A requester typing `/admin` in the address bar is refused.
- Lighthouse accessibility score is 90 or above on the main pages.

---

## Phase 5: Tests

**Goal.** Automated proof that the rules hold, and evidence for the report.

**Why now.** The behaviour is stable, so tests will not be rewritten every day, and it comes before deployment so that what ships is verified. In practice, write the state-machine unit tests during Phase 3; this phase completes the coverage and collects the evidence.

**Where to spend effort.** Test the parts where a bug is costly: the state machine, access control and ownership scoping. Do not chase a coverage number on trivial code.

**Create.**

| Layer | Tool | Files | Covers |
| --- | --- | --- | --- |
| Unit | Vitest | `request-status.machine.spec.ts`, `auth.service.spec.ts`, `requests.service.spec.ts`, `csv.spec.ts` | Every allowed and forbidden transition; password hashing and token rotation; scoping by role; CSV escaping |
| API e2e | Vitest + supertest | `test/auth.e2e-spec.ts`, `test/rbac.e2e-spec.ts`, `test/request-lifecycle.e2e-spec.ts` | Cookies set and cleared; 401 / 403 / 404 matrix per role; the full Phase 3 script |
| Browser | Playwright | `apps/web/e2e/happy-path.spec.ts` | Requester submits → admin assigns → officer completes, including a mobile viewport |
| CI | GitHub Actions | `.github/workflows/ci.yml` | Lint, typecheck, unit and e2e against a Postgres service container |

e2e tests run against a separate database (`DATABASE_URL` from `.env.test`), reset before each run, with Cloudinary mocked.

**Checkpoint.**
- `npm test -w api` and `npm run test:e2e -w api` pass.
- The Playwright test passes on desktop and mobile viewports.
- CI is green on a pull request.
- Saved to `docs/screenshots/`: test output, the coverage summary and the Playwright report.

---

## Phase 6: Deployment

**Goal.** The system live on Neon, Render and Vercel.

**Why last.** You deploy something known to work, so any problem that appears is a configuration problem and not a code problem.

**Order and why.** Database first (the API needs it), API second (the web app needs its URL), web last.

1. **Neon.** Create the project. Copy the pooled string to `DATABASE_URL` and the direct string to `DIRECT_URL`.
2. **Cloudinary.** Create the account and copy the three credentials.
3. **Render (API).** New Web Service from the repository, root directory `apps/api`.
   - Build: `npm ci && npx prisma generate && npm run build`
   - Start: `npx prisma migrate deploy && node dist/main.js`
   - Env: `DATABASE_URL`, `DIRECT_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CLOUDINARY_*`, `WEB_ORIGIN`, `NODE_ENV=production`
   - Health check path: `/health`
   - Run the seed once with production admin credentials, then change that password.
   - `app.set('trust proxy', 1)` so secure cookies and client IPs work behind Render's proxy.
4. **Vercel (web).** Import the repository, root directory `apps/web`, env `API_URL=https://<your-api>.onrender.com` (used by the rewrite).
5. **Smoke test in production,** then record the URLs in the README.

**Create.** `render.yaml` (optional, makes the Render setup reproducible), `apps/api/.env.example`, `apps/web/.env.example`, `README.md` with setup steps and live URLs.

**Known limits to state in the report.** Render's free tier sleeps after inactivity, so the first request can take up to a minute; Neon's free compute also suspends when idle.

**Checkpoint.**
- `https://<api>.onrender.com/health` and `/docs` respond.
- On the Vercel URL: register, log in, submit a request with an image, assign and complete it using three accounts.
- The cookies are `HttpOnly` and `Secure`, and belong to the Vercel domain.
- The uploaded image is still there after redeploying the API.
- The whole flow works on a real phone.

---

## After Phase 6

Write the report using `docs/TECHNICAL_REPORT_OUTLINE.md`. Capture screenshots as you finish each phase rather than at the end; it is much less work.
