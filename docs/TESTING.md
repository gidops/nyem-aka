# Nyem Aka: Testing

How the system is tested, how to run the tests, and the evidence. This document feeds Section 10 of the technical report.

## Summary

| Level | Tool | Tests | What it proves |
| --- | --- | --- | --- |
| Unit | Vitest | 20 | Pure rules in isolation: the status state machine, CSV escaping, image type detection, the health check |
| API end-to-end | Vitest + supertest | 42 | The real API against a real PostgreSQL database: auth, roles, the request lifecycle, uploads, reports, audit trail |
| Browser | Playwright (Chromium) | 32 | The real pages driven like a user, at laptop and phone size: the full journey, role gates, filters, CSV download, accessibility |
| **Total** | | **94** | |

Combined API coverage (unit + end-to-end): **96.5% of statements, 82.9% of branches, 99.4% of functions**. Raw output is in [`docs/testing/`](./testing).

## Strategy

**Test where a bug is costly.** Effort went into three areas, because a mistake in any of them harms real users or leaks data:

1. **The status state machine.** A unit test checks all 108 combinations of *from status × to status × role* and confirms that exactly the 7 allowed moves succeed.
2. **Access control.** Who is refused (401, 403) and what is hidden (404) is tested for every role, through real HTTP requests.
3. **Ownership.** A requester must not see another requester's request; an officer must not touch a request assigned to someone else.

**Why most tests are end-to-end rather than unit.** The services are mostly database queries and transactions. Testing them with a fake database would test the fake. Running the real application against a real database tests the actual SQL, the constraints, the transactions and the guards together. Unit tests are kept for logic that has no dependencies and many cases.

**Tests run in their own database.** The API end-to-end tests use `nyemaka_test`, created and migrated automatically before each run, so they never touch development data. Each test file tags the users it creates and removes its own data afterwards.

## How to run

```bash
docker compose up -d                 # Postgres

npm test -w api                      # unit tests
npm run test:e2e -w api              # API end-to-end tests (uses the nyemaka_test database)
npm run test:cov -w api              # both, with a coverage report in apps/api/coverage/

# Browser tests need both apps running and the demo accounts:
npm run dev:api                      # terminal 1
npm run dev:web                      # terminal 2
npm run demo -w api                  # once
npm run test:e2e -w web              # report in apps/web/playwright-report/
```

A single file: `npm test -w api -- src/reports/csv.spec.ts`, or `npx playwright test e2e/happy-path.spec.ts` inside `apps/web`.

## Role and access matrix

Expected HTTP status for each role. Every cell is checked by an automated test.

| Endpoint | Signed out | Requester | Officer | Admin |
| --- | --- | --- | --- | --- |
| `GET /health` | 200 | 200 | 200 | 200 |
| `GET /auth/me` | 401 | 200 | 200 | 200 |
| `GET /users` and user management | 401 | 403 | 403 | 200 |
| `GET /categories` | 401 | 200 | 200 | 200 |
| `POST / PATCH / DELETE /categories` | 401 | 403 | 403 | 200 / 201 |
| `POST /requests` | 401 | 201 | 403 | 403 |
| `GET /requests` | 401 | 200, own only | 200, assigned only | 200, all |
| `GET /requests/:id` (someone else's) | 401 | 404 | 404 | 200 |
| `PATCH /requests/:id`, `POST …/cancel` | 401 | 200 while pending, own | 403 | 403 |
| `POST /requests/:id/assign` | 401 | 403 | 403 | 200 |
| `PATCH /requests/:id/status` | 401 | 403 | 200 if assigned, else 404 | 200 for reject / reopen |
| `POST /requests/:id/attachments` | 401 | 201 if own, else 404 | 201 if assigned, else 404 | 403 |
| `DELETE /attachments/:id` | 401 | 200 own upload, 403 other's | 200 own upload, 403 other's | 200 |
| `GET /audit-logs` | 401 | 403 | 403 | 200 |
| `GET /reports/summary`, `requests.csv` | 401 | 403 | 403 | 200 |

404 rather than 403 for "not yours" is deliberate: it does not reveal whether a request exists.

## Selected test cases

| ID | Scenario | Expected | Result |
| --- | --- | --- | --- |
| TC-01 | Log in with valid credentials | Two httpOnly, SameSite=Lax cookies; no token in the response body | Pass |
| TC-02 | Wrong password vs unknown email | Same 401 message for both | Pass |
| TC-03 | Register while sending `"role": "ADMIN"` | 400; nobody can choose their own role | Pass |
| TC-04 | Reuse a refresh token after it was rotated | 401, and the session is ended | Pass |
| TC-05 | Refresh after logout | 401 | Pass |
| TC-06 | Deactivated user tries to log in or refresh | 403 / 401 | Pass |
| TC-07 | Admin changes a user's role | Old session cannot refresh; new role on next login; audited | Pass |
| TC-08 | Admin tries to deactivate or demote themselves | 400 | Pass |
| TC-09 | Full lifecycle: submit → assign → in progress → completed | Statuses change in order; four timeline entries with names and notes | Pass |
| TC-10 | Jump straight from PENDING to COMPLETED | 400 | Pass |
| TC-11 | Officer not assigned tries to update the request | 404 | Pass |
| TC-12 | Reassign a request | Old assignment closed with an end time; new one active; first officer loses access | Pass |
| TC-13 | Reject or reopen without a note | 400 | Pass |
| TC-14 | Two status changes sent at the same instant | One succeeds, one is refused; one timeline entry | Pass |
| TC-15 | Upload a script renamed to `.png` | 400 (type is read from the file's bytes) | Pass |
| TC-16 | Upload a file over 5 MB | 413 | Pass |
| TC-17 | Sixth image from the same person | 400 | Pass |
| TC-18 | Search, filter, sort and paginate | Correct rows and `meta` totals | Pass |
| TC-19 | CSV export containing `=HYPERLINK(...)` in a title | Cell is neutralised with a leading apostrophe; export is audited | Pass |
| TC-20 | Delete a category that requests use | 409 with advice to deactivate instead | Pass |
| TC-21 | Browser: the whole journey with three roles, desktop and phone | Completes; no sideways scrolling | Pass |
| TC-22 | Browser: a requester opens `/admin` | "You do not have access" page | Pass |
| TC-23 | Browser: change two filters, refresh | Both filters still applied | Pass |
| TC-24 | Browser: accessibility scan of 13 pages and an open dialog (WCAG 2.1 A and AA) | No violations | Pass |

## Defects found by testing

Tests earned their keep by finding real problems before any user did.

| # | Found by | Defect | Fix |
| --- | --- | --- | --- |
| 1 | Browser test TC-23, against the dev server | Changing two filters in quick succession lost the first one. The second change was built from a stale copy of the address. | `lib/use-url-state.ts` now remembers the address it most recently requested and builds on that. |
| 2 | Preparing CI | Installing the project on a machine with no `.env` file failed, because generating the database client demanded a database address it does not need. This would have broken CI and both deployments. | `prisma.config.ts` makes the address optional; only commands that use a database require it. |
| 3 | Visual review of screenshots | Status badges were invisible against the tinted page header; the "new request" form stretched to full width. | Badges gained an outline; the page body gained a narrow variant. |
| 4 | Demo and screenshot scripts | Scripts that sign in several times hit the login rate limit (5 a minute). | The limit was kept. Scripts wait and retry, and the browser tests reuse saved sessions. |

## Known limits

- **Cloudinary is not exercised.** Tests and development use local-disk storage. The Cloudinary driver runs for the first time in deployment and must be checked there.
- **Automated accessibility checks are partial.** axe-core finds contrast, labelling and structure problems; it cannot judge keyboard flow or screen-reader sense. A manual keyboard pass is still worthwhile.
- **Browser tests cover the main journey,** not every button: editing, cancelling, rejecting and reopening from the page, removing a photo, and the user and category screens are tested at API level only.
- **Browser tests leave their requests behind** in the development database (titles starting "E2E dripping tap"), because the API has no delete endpoint.
- **CI has not yet run.** `.github/workflows/ci.yml` is written and its syntax checked, but it only runs once the repository is on GitHub.
- **One browser engine.** Tests run in Chromium only.

## Evidence

| File | Contents |
| --- | --- |
| [`testing/api-unit-tests.txt`](./testing/api-unit-tests.txt) | Unit test run, every test named |
| [`testing/api-e2e-tests.txt`](./testing/api-e2e-tests.txt) | API end-to-end run, every test named |
| [`testing/api-coverage.txt`](./testing/api-coverage.txt) | Coverage per file and in total |
| [`testing/browser-tests.txt`](./testing/browser-tests.txt) | Playwright run at both screen sizes |
| [`screenshots/`](./screenshots) | Every page at desktop and phone size |

Regenerate the HTML reports locally with `npm run test:cov -w api` and `npm run test:e2e -w web`.
