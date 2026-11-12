import { defineConfig, devices } from "@playwright/test";

// Browser tests: a real Chromium clicks through the real pages against the real API.
// They need both apps running and the demo accounts created:
//   npm run dev:api     npm run dev:web     npm run demo -w api
//   npm run test:e2e -w web
export default defineConfig({
  testDir: "./e2e",
  // Signs in once per role before any test (see e2e/global-setup.ts).
  globalSetup: "./e2e/global-setup.ts",
  // One at a time: the tests share three accounts and one database.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: process.env.WEB_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // The same tests run twice: at laptop size and at phone size.
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
