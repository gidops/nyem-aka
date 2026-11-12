import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { type Role, sessionFile } from "./session";

// Scans each main page with axe-core, the engine behind most accessibility audits.
// It checks what a machine can check against WCAG 2.1 A and AA: colour contrast,
// missing labels, wrong ARIA, heading and landmark structure. It cannot judge
// whether the page makes sense with a screen reader, so it complements a manual
// check rather than replacing one.

const PAGES: { name: string; path: string; role?: Role }[] = [
  { name: "landing", path: "/" },
  { name: "sign in", path: "/login" },
  { name: "register", path: "/register" },
  { name: "requester: my requests", path: "/requests?tab=all", role: "requester" },
  { name: "requester: new request", path: "/requests/new", role: "requester" },
  { name: "officer: my work", path: "/officer?tab=COMPLETED", role: "officer" },
  { name: "admin: overview", path: "/admin", role: "admin" },
  { name: "admin: requests", path: "/admin/requests", role: "admin" },
  { name: "admin: users", path: "/admin/users", role: "admin" },
  { name: "admin: categories", path: "/admin/categories", role: "admin" },
  { name: "admin: audit trail", path: "/admin/audit", role: "admin" },
];

for (const target of PAGES) {
  test(`accessibility: ${target.name}`, async ({ browser }, testInfo) => {
    const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, baseURL } = testInfo.project.use;
    const context = await browser.newContext({
      viewport,
      userAgent,
      deviceScaleFactor,
      isMobile,
      hasTouch,
      baseURL,
      ...(target.role && { storageState: sessionFile(target.role) }),
    });
    const page = await context.newPage();
    await page.goto(target.path, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    // A readable failure: which rule, how serious, and which elements.
    const summary = results.violations.map((violation) => ({
      rule: violation.id,
      impact: violation.impact,
      help: violation.help,
      elements: violation.nodes.map((node) => node.target.join(" ")).slice(0, 5),
    }));
    expect(summary, `axe violations on ${target.path}`).toEqual([]);
    await context.close();
  });
}

test("accessibility: request detail and an open dialog", async ({ browser }, testInfo) => {
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, baseURL } = testInfo.project.use;
  const context = await browser.newContext({
    viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, baseURL,
    storageState: sessionFile("admin"),
  });
  const page = await context.newPage();
  const scan = async () =>
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations.map(
      (violation) => ({ rule: violation.id, elements: violation.nodes.map((node) => node.target.join(" ")).slice(0, 5) }),
    );

  await page.goto("/admin/requests?status=PENDING", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /NA-\d{6}/ }).locator("visible=true").first().click();
  await page.waitForURL(/\/requests\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();
  expect(await scan(), "axe violations on the request detail page").toEqual([]);

  await page.getByRole("button", { name: "Reject" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await scan(), "axe violations with the reject dialog open").toEqual([]);
  await context.close();
});
