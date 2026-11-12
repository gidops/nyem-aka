import { type Browser, expect, type Page, test } from "@playwright/test";
import { deflateSync } from "node:zlib";
import { ACCOUNTS, type Role, sessionFile } from "./session";

// The core journey of the product, driven through the real pages:
// a requester reports a fault with a photo → an admin assigns it → the officer
// starts and completes it → the requester sees the result and the full timeline.

// A small, valid PNG generated in memory, so the test needs no image file.
function png(): Buffer {
  const width = 64;
  const height = 36;
  const raw = Buffer.alloc((width * 3 + 1) * height, 0xb0);
  for (let y = 0; y < height; y += 1) raw[y * (width * 3 + 1)] = 0; // filter byte per row
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buffer: Buffer) => {
    let c = 0xffffffff;
    for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Opens a page already signed in as the given role, at this project's screen size.
async function pageAs(browser: Browser, role: Role, use: object): Promise<Page> {
  const context = await browser.newContext({ ...use, storageState: sessionFile(role) });
  return context.newPage();
}

async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "the page should not scroll sideways").toBeLessThanOrEqual(1);
}

// The header band of the detail page, which holds the title, status and actions.
const header = (page: Page) => page.locator("section").filter({ has: page.getByRole("heading", { level: 1 }) });

test("a request goes from submitted to completed across all three roles", async ({ browser }, testInfo) => {
  const use = testInfo.project.use;
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, baseURL } = use;
  const device = { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, baseURL };
  const title = `E2E dripping tap ${testInfo.project.name} ${Date.now()}`;

  // ── 1. Requester submits a request with a photo ──
  const requester = await pageAs(browser, "requester", device);
  await requester.goto("/requests/new");
  await requester.getByLabel("What is the problem?").fill(title);
  await requester.getByLabel("Describe it").fill("The tap in the staff kitchen drips all day and night.");
  await requester.getByLabel("Where is it?").fill("Admin Block, staff kitchen");
  await requester.getByLabel("Category").selectOption({ label: "Plumbing" });
  await requester.getByLabel("How urgent is it?").selectOption({ label: "High" });
  await requester.locator('input[type="file"]').setInputFiles({ name: "tap.png", mimeType: "image/png", buffer: png() });
  await expect(requester.getByText("1 of 5 added")).toBeVisible();
  await expectNoSidewaysScroll(requester);
  await requester.getByRole("button", { name: "Submit request" }).click();

  await requester.waitForURL(/\/requests\/(?!new)[^/]+$/);
  const detailPath = new URL(requester.url()).pathname;
  await expect(requester.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(header(requester).getByText("Pending", { exact: true })).toBeVisible();
  await expect(requester.getByRole("img", { name: /tap\.png/ })).toBeVisible();
  // While pending, the requester may edit or cancel.
  await expect(requester.getByRole("button", { name: "Edit" })).toBeVisible();
  await expect(requester.getByRole("button", { name: "Cancel request" })).toBeVisible();

  // ── 2. Admin finds it by search and assigns an officer ──
  const admin = await pageAs(browser, "admin", device);
  await admin.goto(`/admin/requests?q=${encodeURIComponent(title)}`);
  await expect(admin.getByRole("link", { name: new RegExp(title) }).first()).toBeVisible();
  await expectNoSidewaysScroll(admin);
  await admin.getByRole("button", { name: "Assign", exact: true }).locator("visible=true").first().click();
  const assignDialog = admin.getByRole("dialog");
  await assignDialog.getByLabel("Maintenance officer").selectOption({ label: "Chidi Eze · Works & Maintenance" });
  await assignDialog.getByLabel("Note for the officer (optional)").fill("Please attend this week.");
  await assignDialog.getByRole("button", { name: "Assign", exact: true }).click();
  await expect(assignDialog).toBeHidden();
  await expect(admin.getByText("Assigned", { exact: true }).locator("visible=true").first()).toBeVisible();
  await expect(admin.getByRole("button", { name: "Reassign" }).locator("visible=true").first()).toBeVisible();

  // ── 3. Officer starts and completes the work ──
  const officer = await pageAs(browser, "officer", device);
  await officer.goto(`/officer?q=${encodeURIComponent(title)}`);
  await officer.getByRole("link", { name: new RegExp(title) }).locator("visible=true").first().click();
  await officer.waitForURL(`**${detailPath}`);

  await officer.getByRole("button", { name: "Start work" }).click();
  await officer.getByRole("dialog").getByRole("button", { name: "Start work" }).click();
  await expect(header(officer).getByText("In progress", { exact: true })).toBeVisible();

  await officer.getByRole("button", { name: "Mark completed" }).click();
  const completeDialog = officer.getByRole("dialog");
  await completeDialog.getByLabel("What was done? (optional)").fill("Replaced the washer and tested.");
  await completeDialog.getByRole("button", { name: "Mark completed" }).click();
  await expect(header(officer).getByText("Completed", { exact: true })).toBeVisible();
  // Nothing more for the officer to do.
  await expect(officer.getByRole("button", { name: "Mark completed" })).toHaveCount(0);
  await expectNoSidewaysScroll(officer);

  // ── 4. Requester sees the outcome and the whole history ──
  await requester.reload();
  await expect(header(requester).getByText("Completed", { exact: true })).toBeVisible();
  await expect(requester.getByText("Request submitted")).toBeVisible();
  await expect(requester.getByText("Pending → Assigned")).toBeVisible();
  await expect(requester.getByText("Assigned → In progress")).toBeVisible();
  await expect(requester.getByText("In progress → Completed")).toBeVisible();
  await expect(requester.getByText("Replaced the washer and tested.")).toBeVisible();
  await expect(requester.getByText("Chidi Eze").first()).toBeVisible();
  // A completed request can no longer be edited or cancelled.
  await expect(requester.getByRole("button", { name: "Edit" })).toHaveCount(0);
  await expect(requester.getByRole("button", { name: "Cancel request" })).toHaveCount(0);
  await expectNoSidewaysScroll(requester);
});

test("each role is kept out of areas that are not theirs", async ({ browser }, testInfo) => {
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, baseURL } = testInfo.project.use;
  const device = { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, baseURL };

  const requester = await pageAs(browser, "requester", device);
  await requester.goto("/admin");
  await expect(requester.getByRole("heading", { name: "You do not have access to this page" })).toBeVisible();
  await requester.goto("/officer");
  await expect(requester.getByRole("heading", { name: "You do not have access to this page" })).toBeVisible();

  const officer = await pageAs(browser, "officer", device);
  await officer.goto("/admin/users");
  await expect(officer.getByRole("heading", { name: "You do not have access to this page" })).toBeVisible();
  await officer.goto("/requests/new");
  await expect(officer.getByRole("heading", { name: "You do not have access to this page" })).toBeVisible();

  // And a visitor who is not signed in is sent to the login page.
  const visitor = await (await browser.newContext({ baseURL })).newPage();
  await visitor.goto("/admin");
  await expect(visitor).toHaveURL(/\/login\?next=%2Fadmin$/);
  await expect(visitor.getByRole("heading", { name: "Sign in" })).toBeVisible();

  expect(ACCOUNTS.requester.home).toBe("/requests");
});

test("filters live in the address bar and survive a refresh", async ({ browser }, testInfo) => {
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, baseURL } = testInfo.project.use;
  const admin = await pageAs(browser, "admin", { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, baseURL });

  await admin.goto("/admin/requests");
  await admin.getByLabel("Status").selectOption({ label: "Pending" });
  await admin.getByLabel("Sort by").selectOption({ label: "Most urgent first" });
  await expect(admin).toHaveURL(/status=PENDING/);
  await expect(admin).toHaveURL(/sort=priority/);

  await admin.reload();
  await expect(admin.getByLabel("Status")).toHaveValue("PENDING");
  await expect(admin.getByLabel("Sort by")).toHaveValue("priority");
  await expect(admin.getByRole("button", { name: /Clear 1 filter/ })).toBeVisible();
});

test("an admin can download the filtered list as CSV", async ({ browser }, testInfo) => {
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, baseURL } = testInfo.project.use;
  const admin = await pageAs(browser, "admin", { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, baseURL });

  await admin.goto("/admin/requests?status=REJECTED");
  await expect(admin.getByRole("link", { name: /Please repaint my office/ }).locator("visible=true").first()).toBeVisible();

  const [download] = await Promise.all([
    admin.waitForEvent("download"),
    admin.getByRole("button", { name: "Export CSV" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^nyem-aka-requests-\d{4}-\d{2}-\d{2}\.csv$/);

  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const lines = Buffer.concat(chunks).toString("utf8").replace(/^﻿/, "").trim().split("\r\n");

  expect(lines[0]).toBe(
    "Reference,Title,Category,Priority,Status,Location,Requester,Requester email,Assigned officer,Created,Completed,Hours to complete",
  );
  // Only rejected requests, matching the filter on screen.
  expect(lines.length).toBeGreaterThan(1);
  for (const line of lines.slice(1)) expect(line).toContain(",REJECTED,");
  expect(lines.some((line) => line.includes("Please repaint my office"))).toBe(true);
});
