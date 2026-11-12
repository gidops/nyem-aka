import { resolve } from "node:path";

export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "NyemAka-Demo-2026!";

// The demo accounts created by `npm run demo -w api`.
export const ACCOUNTS = {
  requester: { email: "ada@nyemaka.local", name: "Ada Okafor", home: "/requests" },
  officer: { email: "chidi@nyemaka.local", name: "Chidi Eze", home: "/officer" },
  admin: { email: process.env.SEED_ADMIN_EMAIL ?? "admin@nyemaka.local", name: "System Administrator", home: "/admin" },
} as const;

export type Role = keyof typeof ACCOUNTS;

// Where each role's signed-in cookies are saved between global setup and the tests.
export const sessionFile = (role: Role) => resolve(__dirname, `.auth/${role}.json`);
