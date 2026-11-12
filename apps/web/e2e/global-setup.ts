import { chromium, type FullConfig } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { ACCOUNTS, DEMO_PASSWORD, type Role, sessionFile } from "./session";

// Runs once before all tests: signs in as each role through the real login form
// and saves the cookies. Tests then start already signed in.
//
// Why not sign in inside every test? The API allows 5 logins a minute per client
// (to slow password guessing), and the suite would exceed that. For the same reason
// a session saved by an earlier run is reused while it is still valid.

function adminPassword(): string {
  if (process.env.SEED_ADMIN_PASSWORD) return process.env.SEED_ADMIN_PASSWORD;
  // Fall back to the API's local .env, where the seeded admin's password lives.
  const envFile = resolve(__dirname, "../../api/.env");
  const match = /^SEED_ADMIN_PASSWORD="?([^"\n]+)"?$/m.exec(readFileSync(envFile, "utf8"));
  if (!match) throw new Error("Set SEED_ADMIN_PASSWORD, or define it in apps/api/.env");
  return match[1];
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL!;
  const browser = await chromium.launch();

  for (const role of Object.keys(ACCOUNTS) as Role[]) {
    const account = ACCOUNTS[role];

    // Reuse the session saved by a previous run if the API still accepts it.
    // (Refreshing swaps an expired access token for a new one without a login.)
    if (existsSync(sessionFile(role))) {
      const saved = await browser.newContext({ baseURL, storageState: sessionFile(role) });
      let valid = (await saved.request.get("/api/auth/me")).ok();
      if (!valid && (await saved.request.post("/api/auth/refresh")).ok()) {
        valid = (await saved.request.get("/api/auth/me")).ok();
      }
      if (valid) await saved.storageState({ path: sessionFile(role) });
      await saved.close();
      if (valid) continue;
    }

    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();

    await page.goto("/login");
    await page.getByLabel("Email").fill(account.email);
    await page.getByLabel("Password").fill(role === "admin" ? adminPassword() : DEMO_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    // Each role must land on its own home page.
    await page.waitForURL(`**${account.home}`, { timeout: 15_000 }).catch(async () => {
      const alert = await page.getByRole("alert").first().textContent().catch(() => null);
      throw new Error(
        `Could not sign in as ${account.email}${alert ? `: ${alert}` : ""}. ` +
          "Are both apps running, and has `npm run demo -w api` been run?",
      );
    });

    await mkdir(dirname(sessionFile(role)), { recursive: true });
    await context.storageState({ path: sessionFile(role) });
    await context.close();
  }
  await browser.close();
}
