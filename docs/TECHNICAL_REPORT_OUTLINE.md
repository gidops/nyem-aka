# Nyem Aka: Technical Report Outline

Each section lists what to cover and where the material comes from. Collect evidence into `docs/screenshots/` as each build phase finishes.

**Front matter.** Title page (project name, course code, your name and ID, date), abstract (about 150 words: problem, solution, stack, outcome), table of contents, list of figures and tables.

## 1. Problem Statement

- How maintenance faults are reported on campus today (verbal, paper, phone, chat groups) and what goes wrong: lost requests, no tracking, no accountability, no data for planning.
- Who is affected: students and staff, maintenance officers, administrators.
- One-sentence statement of the problem the system solves.

## 2. Objectives

- The aim in one sentence.
- Specific, checkable objectives, for example: submit a request with image evidence; track status in real time; assign requests to officers; record every status change; restrict actions by role; export reports.
- Scope: what is included and what is deliberately left out (e.g. email/SMS notifications, inventory, payments).

## 3. Requirement Analysis

- **Stakeholders and roles:** Requester, Maintenance Officer, Administrator.
- **Functional requirements:** a numbered table per role (FR-01 …).
- **Non-functional requirements:** security, usability and mobile responsiveness, performance (pagination), reliability, maintainability.
- **Use-case diagram** and two or three use-case descriptions (submit request, assign request, complete request).
- **Request lifecycle:** state diagram and the transition table from Build Plan Phase 3.

## 4. System Design and Architecture

- Architecture diagram: browser → Next.js on Vercel → `/api` proxy → NestJS on Render → PostgreSQL on Neon; Cloudinary for images.
- Why a separate frontend and REST API; why the proxy (first-party cookies).
- Module structure of the API and route structure of the web app.

## 5. Frontend Technologies

- Next.js App Router, TypeScript, Tailwind CSS, TanStack Query, react-hook-form with zod: what each does and why it was chosen.
- Design system: Redwood-inspired direction, colour tokens, component list, with a note that no Oracle assets were used.
- Mobile responsiveness approach (mobile-first, tables to cards, drawer navigation).
- Route protection and role-based navigation.

## 6. Backend Technologies

- NestJS (modules, controllers, services, guards, pipes), Prisma, PostgreSQL: what each does and why.
- Authentication: argon2 hashing, access and refresh JWTs in httpOnly cookies, rotation, logout.
- Authorization: `JwtAuthGuard`, `RolesGuard`, ownership scoping in services.
- Validation and error handling.
- Advanced features, one short subsection each: image upload, search/filter/pagination, audit trail, CSV export, Swagger.

## 7. Database Design and Relationship Types

- ER diagram (generate from the Prisma schema, e.g. with `prisma-erd-generator` or dbdiagram.io).
- Data dictionary: one table per entity (field, type, constraints, purpose) for User, Role, ServiceRequest, Category, Assignment, StatusLog, Attachment, AuditLog.
- Relationship types with examples: the table from Build Plan Phase 1 (one-to-many, many-to-many through `Assignment`, optional relation on `AuditLog`).
- Design choices: role as a table, assignment history, two kinds of log, deactivate instead of delete, indexes, cascade rules.
- Migrations and seeding.

## 8. API Documentation

- Base URL, authentication method, response and error format, pagination format.
- Endpoint table grouped by module: method, path, access, purpose.
- Two or three worked examples with request and response (login, create request, change status).
- Swagger UI screenshots and the live `/docs` link.

## 9. Screenshots

Each with a figure number and a one-line caption. Include desktop and mobile versions of the key screens.

- Landing page, login, register
- Requester: request list, new request form with image upload, request detail with timeline
- Officer: assigned queue, status update
- Admin: overview, request table with filters, assign modal, users, categories, audit trail, CSV opened in a spreadsheet

## 10. Testing Evidence

Most of this section is already drafted in [`TESTING.md`](./TESTING.md), with raw output in [`testing/`](./testing). Adapt it rather than starting from nothing.

- Strategy: what is tested at each level and why (unit, API e2e, browser).
- Test case table: ID, description, steps, expected, actual, pass/fail. Include the RBAC matrix (role × endpoint → 200/401/403/404).
- Evidence: Vitest output, coverage summary, Playwright report, CI run, manual mobile checks.
- Defects found during testing and how they were fixed.

## 11. Deployment

- Environments and services: Vercel, Render, Neon, Cloudinary, with reasons.
- Deployment steps and the environment variables used (names only, never the values).
- Production migration approach (`prisma migrate deploy`).
- Live URLs, repository link, demo accounts for the marker.
- Screenshots of the three dashboards showing a successful deploy.

## 12. Challenges and Solutions

Write these as they happen; keep a running list. Likely candidates:

- Cross-site cookies between Vercel and Render, solved with the proxy.
- Ephemeral disk on Render, solved with Cloudinary.
- Neon pooled versus direct connections for migrations.
- Keeping status, timeline and audit consistent, solved with transactions.
- Making data tables usable on mobile.
- Free-tier cold starts.

For each: what happened, how you diagnosed it, what you changed, what you learned.

## 13. Conclusion

- What was built, measured against each objective in Section 2.
- Limitations.
- Future work (e.g. email/SMS notifications, SLA timers and escalation, requester feedback rating, analytics charts, a mobile app).

## References and Appendices

- References: official documentation and any sources cited.
- Appendix A: full Prisma schema. Appendix B: full endpoint list. Appendix C: environment variable list. Appendix D: user guide (short, per role).
