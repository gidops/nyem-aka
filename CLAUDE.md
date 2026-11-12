# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

**Phases 0 to 2 are done.** Built: the Prisma schema and seed; auth (register, login, refresh, logout, me) with httpOnly cookies; global JWT, role and rate-limit guards; admin user management; the audit service; Swagger at `/docs`. On the web: the `/api` proxy, the fetch helper, route protection, and plain login, register and temporary dashboard pages. **Not built yet:** categories, requests, attachments, reports (Phase 3) and the design system and real dashboards (Phase 4); anything below describing those is the plan from `docs/BUILD_PLAN.md`. As each phase lands, replace the planned detail with what actually exists, and correct anything that turned out different.

The `CLAUDE.md` in the home directory (`/home/PSL-TECH-DEV-02/CLAUDE.md`) describes a different project (AATC VMS). Its stack, commands and architecture do **not** apply here.

## How to work with the user

The user is building this as a learning project and wants a senior full-stack engineer as mentor:

- Explain **why** before **how**, then write the code. Do not hand over code without the reasoning behind it.
- Work one phase of `docs/BUILD_PLAN.md` at a time and stop at that phase's checkpoint so the user can test it before moving on.
- When requirements are ambiguous, ask and wait for the answer.
- Project documentation lives in this folder (`docs/`), as local Markdown files.

## Project

**Nyem Aka** is a University Maintenance & Service Request System (coursework for MIT 8333).

| Role | Can do |
| --- | --- |
| `REQUESTER` (student/staff) | Submit requests with fault images, track their own requests |
| `OFFICER` (maintenance officer) | See requests assigned to them, update progress, mark complete |
| `ADMIN` | Manage users and categories, assign requests, monitor status, reports and CSV export |

## Stack and deployment

- **Web:** Next.js (App Router, TypeScript), Tailwind CSS. Deployed on Vercel.
- **API:** NestJS REST, Prisma, Swagger at `/docs`. Deployed on Render.
- **Database:** PostgreSQL on Neon (local dev uses Postgres in Docker).
- **Images:** Cloudinary. Render's disk is ephemeral, so uploads must never be written to the API's filesystem.

## Planned layout

```
apps/
  api/    NestJS: prisma/, src/{auth,users,categories,requests,attachments,audit,reports}
  web/    Next.js: app/(public), app/(app)/{requests,officer,admin}, components/ui, lib/api
docs/     BUILD_PLAN.md, TECHNICAL_REPORT_OUTLINE.md, screenshots/
```

npm workspaces, one root lockfile. Vercel's root directory is `apps/web`; Render's is `apps/api`.

## Commands

Run from the repository root (npm workspaces: `api`, `web`).

```bash
npm install                                   # one install for both apps
docker compose up -d                          # local Postgres on host port 5433
npm run dev:api                               # API on :4000 (GET /health)
npm run dev:web                               # web on :3000
npm test -w api                               # unit tests (Vitest)
npm test -w api -- src/app.controller.spec.ts # single test file
npm run test:e2e -w api                       # supertest e2e
npm run lint -w api                           # oxlint (type-aware)
npm run lint -w web                           # eslint
npm run build                                 # build both apps
```

Database commands run inside `apps/api` (the Prisma CLI reads `prisma.config.ts` there):

```bash
npx prisma migrate dev --name <name>          # create and apply a migration
npx prisma generate                           # REQUIRED after every schema change
npx prisma db seed                            # roles, categories, first admin (safe to re-run)
npx prisma studio                             # browse the data
```

`npm run test:e2e -w api` needs the local database running; unit tests do not.

## Toolchain facts that differ from older tutorials

- **The API is NestJS 12 and ESM-only.** Relative imports end in `.js` (`./app.module.js`), `__dirname` does not exist (use `import.meta.dirname`), tests run on **Vitest** (`vi.fn()`, not `jest.fn()`), and linting is **oxlint**, not ESLint. `apps/api/AGENTS.md` links the current Nest docs; read the relevant page before using a Nest API from memory.
- **The web app is Next.js 16.** `apps/web/AGENTS.md` says to read the guide in `node_modules/next/dist/docs/` before writing Next code, because conventions have changed.
- **Prisma is pinned to 7.10.1** (npm's `latest` tag pointed at an 8.0 release candidate when this was set up). Prisma 7 differs from older tutorials: the schema has no `url`; the CLI gets `DIRECT_URL` from `apps/api/prisma.config.ts`; the runtime client needs a driver adapter and gets `DATABASE_URL` in `src/prisma/prisma.service.ts`; the client is generated into `apps/api/src/generated/prisma` (git-ignored, lint-ignored) and imported as `../generated/prisma/client.js`, not from `@prisma/client`; `migrate dev` does not regenerate the client.
- **Specs that build a provider depending on `PrismaService` must supply a mock** (see `apps/api/src/app.controller.spec.ts`).
- **Local Postgres is on port 5433**, because 5432 on this machine is used by another project. Local connection string: `postgresql://nyemaka:nyemaka@localhost:5433/nyemaka`.

## Architecture decisions that span files

- **Cookies are first-party through a proxy.** The browser never calls the API directly. `apps/web/next.config.ts` rewrites `/api/*` to `API_URL`, so the httpOnly auth cookies belong to the web origin and the API needs no CORS. `apps/web/lib/api.ts` is the only place that calls `fetch`; it does one silent refresh-and-retry on 401. `apps/web/proxy.ts` (Next 16's name for middleware) only checks that a session cookie exists, as a convenience redirect; the API is the real enforcement.
- **Auth:** 15-minute access JWT plus a 7-day rotating refresh JWT, both in httpOnly `SameSite=Lax` cookies with path `/` (set in `auth/auth.cookies.ts`). Only a SHA-256 hash of the refresh token is stored (`User.refreshTokenHash`); replaying an old refresh token clears it and ends the session. Passwords are hashed with argon2. Self-registration always creates a `REQUESTER` (the DTO has no role field and unknown fields are rejected); officers and admins are created by an admin, and the first admin comes from the seed. Changing a user's role or deactivating them clears their refresh hash.
- **RBAC:** global guards registered in `auth/auth.module.ts`, in order: `ThrottlerGuard`, `JwtAuthGuard` (opt out with `@Public()`), `RolesGuard` driven by `@Roles(...)`. The role comes from the token, so there is no per-request database lookup. Use `@CurrentUser()` to get `{ id, email, role }`. Role checks are not enough for requests: the service layer also scopes by ownership (requesters see their own, officers see those actively assigned to them).
- **Request lifecycle is a state machine** in one place (`requests/request-status.machine.ts`). Every status change goes through it, and in the same Prisma transaction writes a `StatusLog` row and an `AuditLog` row. Never update `ServiceRequest.status` directly.
- **Assignments keep history.** Reassigning sets the old `Assignment.isActive = false` and creates a new row; rows are never overwritten.
- **Two logs, two purposes.** `StatusLog` is the user-visible timeline of one request. `AuditLog` is the admin-only record of who did what across the system (logins, user changes, assignments, exports).
- **User data leaves the API only through `users/user.select.ts`** (`publicUserSelect` + `toPublicUser`), so password and token hashes cannot leak. Reuse it for any query that returns a user.
- **Audit writes go through `AuditService.log(entry, tx?)`.** Pass the transaction client when the audited change is in a transaction.
- **HTTP setup lives in `src/app.setup.ts`** (`configureApp`), shared by `main.ts` and the e2e tests (`test/helpers.ts`). e2e tests run against the local dev database, create users with an `e2e-` email prefix and delete them afterwards; rate limiting is skipped when `NODE_ENV=test`.
- **List endpoints** extend `PaginationQueryDto` and return `paginated(...)` from `src/common/pagination.ts`: `{ data, meta: { total, page, limit, totalPages } }`.
- **Users are deactivated, not deleted** (`isActive`), so history keeps its foreign keys.
- **Two database URLs:** `DATABASE_URL` (runtime; Neon's pooled string in production) and `DIRECT_URL` (Prisma CLI; Neon's direct string). Locally both point at the Docker database.

## Design direction

Inspired by Oracle's Redwood style without using Oracle logos, fonts or assets: warm off-white canvas, charcoal text, one terracotta accent, flat bordered cards (no shadows), pill buttons, a wide hero band, tabbed sections, generous whitespace. Colours are defined once as tokens in `apps/web/app/globals.css`; components use the tokens, never raw hex values.

Every page must work on mobile: build mobile-first, tables collapse to stacked cards below `md`, and navigation becomes a drawer.
