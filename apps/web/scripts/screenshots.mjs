// Captures every main page at desktop and phone width into docs/screenshots/,
// for the technical report and as a quick visual check.
//
// Needs both apps running and demo data loaded:
//   npm run dev:api      npm run dev:web      npm run demo -w api
//   npm run screenshots -w web
//
// It also fails loudly if a page logs a console error or scrolls sideways on a phone.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.WEB_URL ?? "http://localhost:3000";
const PASSWORD = process.env.DEMO_PASSWORD ?? "NyemAka-Demo-2026!";
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../docs/screenshots");

const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 375, height: 812 },
};

const problems = [];

async function capture(context, viewportName, name, path, prepare) {
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(String(error)));

  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  if (prepare) await prepare(page);
  // Let fonts and any last request settle.
  await page.waitForTimeout(400);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (overflow > 1) problems.push(`${name} (${viewportName}): scrolls sideways by ${overflow}px`);
  for (const error of errors) problems.push(`${name} (${viewportName}): console error: ${error}`);

  await page.screenshot({ path: `${OUT}/${name}-${viewportName}.png`, fullPage: true });
  console.log(`  ${name}-${viewportName}.png`);
  await page.close();
}

// Signs in through the real form once, then reuses that session at both sizes.
async function signIn(browser, email, password) {
  const context = await browser.newContext({ viewport: VIEWPORTS.desktop });
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  // The API allows 5 logins a minute. If we have just hit that, wait and try once more.
  const limited = await page
    .getByRole("alert")
    .filter({ hasText: /too many/i })
    .waitFor({ timeout: 2500 })
    .then(() => true)
    .catch(() => false);
  if (limited) {
    console.log("  login rate limit reached; waiting 60 seconds…");
    await page.waitForTimeout(61_000);
    await page.getByRole("button", { name: "Sign in" }).click();
  }
  await page.waitForURL((url) => !url.pathname.startsWith("/login") && url.pathname !== "/dashboard", {
    timeout: 15_000,
  });
  const state = await context.storageState();
  const landedOn = new URL(page.url()).pathname;
  await context.close();
  return { state, landedOn };
}

async function forEachViewport(browser, state, run) {
  for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext({
      viewport,
      storageState: state,
      isMobile: viewportName === "mobile",
      hasTouch: viewportName === "mobile",
    });
    await run(context, viewportName);
    await context.close();
  }
}

// Finds a request's page address by searching for its title in a list
// (searching, so it is found however many other requests exist).
async function requestPath(browser, state, listPath, title) {
  const context = await browser.newContext({ viewport: VIEWPORTS.desktop, storageState: state });
  const page = await context.newPage();
  const separator = listPath.includes("?") ? "&" : "?";
  await page.goto(`${BASE}${listPath}${separator}q=${encodeURIComponent(title)}`, { waitUntil: "networkidle" });
  const href = await page.getByRole("link", { name: new RegExp(title) }).first().getAttribute("href");
  await context.close();
  if (!href) throw new Error(`Could not find "${title}" on ${listPath}`);
  return href;
}

const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });

console.log("Public pages");
await forEachViewport(browser, undefined, async (context, viewport) => {
  await capture(context, viewport, "01-landing", "/");
  await capture(context, viewport, "02-login", "/login");
  await capture(context, viewport, "03-register", "/register");
});

console.log("Requester");
const requester = await signIn(browser, "ada@nyemaka.local", PASSWORD);
if (requester.landedOn !== "/requests") problems.push(`Requester landed on ${requester.landedOn}, expected /requests`);
const completed = await requestPath(browser, requester.state, "/requests?tab=all", "Leaking tap in Lab 2");
await forEachViewport(browser, requester.state, async (context, viewport) => {
  await capture(context, viewport, "04-requester-requests", "/requests?tab=all");
  await capture(context, viewport, "05-requester-new-request", "/requests/new");
  await capture(context, viewport, "06-requester-request-detail", completed);
  await capture(context, viewport, "07-requester-blocked-from-admin", "/admin");
  if (viewport === "mobile") {
    await capture(context, viewport, "08-requester-menu-open", "/requests", (page) =>
      page.getByRole("button", { name: "Menu" }).click(),
    );
  }
});

console.log("Officer");
const officer = await signIn(browser, "ngozi@nyemaka.local", PASSWORD);
if (officer.landedOn !== "/officer") problems.push(`Officer landed on ${officer.landedOn}, expected /officer`);
const inProgress = await requestPath(browser, officer.state, "/officer?tab=IN_PROGRESS", "Projector will not turn on");
await forEachViewport(browser, officer.state, async (context, viewport) => {
  await capture(context, viewport, "09-officer-my-work", "/officer?tab=IN_PROGRESS");
  await capture(context, viewport, "10-officer-request-detail", inProgress);
  await capture(context, viewport, "11-officer-mark-completed", inProgress, (page) =>
    page.getByRole("button", { name: "Mark completed" }).click(),
  );
});

console.log("Administrator");
const admin = await signIn(browser, process.env.ADMIN_EMAIL ?? "admin@nyemaka.local", process.env.ADMIN_PASSWORD ?? "");
if (admin.landedOn !== "/admin") problems.push(`Admin landed on ${admin.landedOn}, expected /admin`);
const reassigned = await requestPath(browser, admin.state, "/admin/requests", "Socket sparks when used");
await forEachViewport(browser, admin.state, async (context, viewport) => {
  await capture(context, viewport, "12-admin-overview", "/admin");
  await capture(context, viewport, "13-admin-requests", "/admin/requests");
  await capture(context, viewport, "14-admin-requests-filtered", "/admin/requests?status=PENDING&sort=priority");
  await capture(context, viewport, "15-admin-assign-modal", "/admin/requests?status=PENDING", (page) =>
    page.getByRole("button", { name: "Assign" }).first().click(),
  );
  await capture(context, viewport, "16-admin-request-detail", reassigned);
  await capture(context, viewport, "17-admin-users", "/admin/users");
  await capture(context, viewport, "18-admin-categories", "/admin/categories");
  await capture(context, viewport, "19-admin-audit", "/admin/audit");
});

await browser.close();

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exitCode = 1;
} else {
  console.log(`\nAll pages captured to ${OUT} with no console errors and no sideways scrolling.`);
}
