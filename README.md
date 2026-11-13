# Nyem Aka

A University Maintenance & Service Request System. Students and staff report faults with photos; administrators assign them to maintenance officers; officers update progress until the work is complete. Every step is recorded.

*Nyem aka* is Igbo for "lend me a hand".

| | |
| --- | --- |
| Live site | <https://nyem-aka.vercel.app> |
| API documentation (Swagger) | <https://nyem-aka-api.onrender.com/docs> |

## Features

- Three roles with separate dashboards: requester, maintenance officer, administrator
- Request lifecycle with enforced rules: pending → assigned → in progress → completed, plus reject, cancel and reopen
- Photo evidence on requests (JPEG, PNG, WebP)
- Search, filters, sorting and pagination; CSV export
- Sign-in with JWTs in httpOnly cookies, rotating refresh tokens, login rate limiting
- Full timeline per request and a system-wide audit trail
- Responsive from phone to desktop; automated accessibility checks

## Stack

| Part | Technology | Hosted on |
| --- | --- | --- |
| Web | Next.js (App Router), TypeScript, Tailwind CSS, TanStack Query | Vercel |
| API | NestJS, Prisma, Swagger | Render |
| Database | PostgreSQL | Neon |
| Images | Cloudinary | Cloudinary |
| Tests | Vitest, supertest, Playwright, axe-core | GitHub Actions |

## Run it locally

Needs Node 22 or newer and Docker.

```bash
npm install                          # installs both apps
docker compose up -d                 # PostgreSQL on port 5433

cp apps/api/.env.example apps/api/.env      # then set the two JWT secrets and the admin password
cp apps/web/.env.example apps/web/.env.local

cd apps/api
npx prisma migrate deploy            # create the tables
npx prisma db seed                   # roles, categories, first admin
cd ../..

npm run dev:api                      # API  → http://localhost:4000   (Swagger at /docs)
npm run dev:web                      # web  → http://localhost:3000
```

Sign in with the admin email and password from `apps/api/.env`. For sample users and requests in every status, run `npm run demo -w api` while the API is running.

## Common commands

| Task | Command |
| --- | --- |
| API unit tests | `npm test -w api` |
| API end-to-end tests | `npm run test:e2e -w api` |
| Both, with coverage | `npm run test:cov -w api` |
| Browser tests (apps running, demo data loaded) | `npm run test:e2e -w web` |
| Lint | `npm run lint` |
| Build both apps | `npm run build` |
| New migration after a schema change | `npx prisma migrate dev --name <name> && npx prisma generate` (in `apps/api`) |
| Browse the database | `npx prisma studio` (in `apps/api`) |

## Project layout

```
apps/api/     NestJS API: auth, users, categories, requests, attachments, audit, reports
apps/web/     Next.js web app: landing page, sign-in, and pages for each role
docs/         Build plan, testing, deployment, report outline, screenshots
render.yaml   Render deployment blueprint for the API
```

## Documentation

- [Build plan](docs/BUILD_PLAN.md): how the system was built, phase by phase, and why
- [Testing](docs/TESTING.md): strategy, role matrix, test cases, defects found, evidence
- [Deployment](docs/DEPLOYMENT.md): step-by-step guide for Neon, Cloudinary, Render and Vercel
- [Technical report outline](docs/TECHNICAL_REPORT_OUTLINE.md)
- [Screenshots](docs/screenshots): every page at desktop and phone size
