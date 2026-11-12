# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

**Phase 0 (repository and tooling) is done.** Both apps are scaffolded and boot; the API has only `GET /health`, and the web app is still the default Next.js page. Everything under "Planned layout" and "Architecture decisions" beyond that is the plan from `docs/BUILD_PLAN.md`, not yet built. As each phase lands, replace the planned detail with what actually exists, and correct anything that turned out different.

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

Planned, not available until Phase 1 (run inside `apps/api`): `npx prisma migrate dev --name <name>`, `npx prisma db seed`.

## Toolchain facts that differ from older tutorials

- **The API is NestJS 12 and ESM-only.** Relative imports end in `.js` (`./app.module.js`), `__dirname` does not exist (use `import.meta.dirname`), tests run on **Vitest** (`vi.fn()`, not `jest.fn()`), and linting is **oxlint**, not ESLint. `apps/api/AGENTS.md` links the current Nest docs; read the relevant page before using a Nest API from memory.
- **The web app is Next.js 16.** `apps/web/AGENTS.md` says to read the guide in `node_modules/next/dist/docs/` before writing Next code, because conventions have changed.
- **Local Postgres is on port 5433**, because 5432 on this machine is used by another project. Local connection string: `postgresql://nyemaka:nyemaka@localhost:5433/nyemaka`.

## Architecture decisions that span files

- **Cookies are first-party through a proxy.** The browser never calls Render directly. `apps/web/next.config.ts` rewrites `/api/*` to the API, so the httpOnly auth cookies belong to the web origin. This avoids third-party-cookie blocking between `vercel.app` and `onrender.com` and lets Next middleware read the cookie for route protection. All web fetches go to `/api/...` with `credentials: "include"`.
- **Auth:** short-lived access JWT plus a rotating refresh JWT, both in httpOnly cookies. Only a hash of the refresh token is stored (`User.refreshTokenHash`). Passwords are hashed with argon2. Self-registration always creates a `REQUESTER`; officers and admins are created by an admin, and the first admin comes from the seed.
- **RBAC:** a global `JwtAuthGuard` (opt out with `@Public()`) and a `RolesGuard` driven by `@Roles(...)`. Role checks are not enough for requests: the service layer also scopes by ownership (requesters see their own, officers see those actively assigned to them).
- **Request lifecycle is a state machine** in one place (`requests/request-status.machine.ts`). Every status change goes through it, and in the same Prisma transaction writes a `StatusLog` row and an `AuditLog` row. Never update `ServiceRequest.status` directly.
- **Assignments keep history.** Reassigning sets the old `Assignment.isActive = false` and creates a new row; rows are never overwritten.
- **Two logs, two purposes.** `StatusLog` is the user-visible timeline of one request. `AuditLog` is the admin-only record of who did what across the system (logins, user changes, assignments, exports).
- **Users are deactivated, not deleted** (`isActive`), so history keeps its foreign keys.
- **Neon needs two URLs:** `DATABASE_URL` (pooled, runtime) and `DIRECT_URL` (direct, migrations).

## Design direction

Inspired by Oracle's Redwood style without using Oracle logos, fonts or assets: warm off-white canvas, charcoal text, one terracotta accent, flat bordered cards (no shadows), pill buttons, a wide hero band, tabbed sections, generous whitespace. Colours are defined once as tokens in `apps/web/app/globals.css`; components use the tokens, never raw hex values.

Every page must work on mobile: build mobile-first, tables collapse to stacked cards below `md`, and navigation becomes a drawer.
