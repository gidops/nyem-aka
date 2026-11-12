import { api, ApiError } from "./api";
import type { User } from "./types";

export interface Credentials {
  email: string;
  password: string;
}

export interface Registration extends Credentials {
  fullName: string;
  department?: string;
}

export const login = (body: Credentials) =>
  api<{ user: User }>("/auth/login", { method: "POST", body });

export const register = (body: Registration) =>
  api<{ user: User }>("/auth/register", { method: "POST", body });

export const logout = () =>
  api<{ success: boolean }>("/auth/logout", { method: "POST" });

// Returns null when nobody is signed in. `/auth/me` is an auth route, so `api()` does
// not refresh for it automatically; we do it here once, by hand.
export async function currentUser(): Promise<User | null> {
  try {
    return (await api<{ user: User }>("/auth/me")).user;
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
  }
  try {
    await api("/auth/refresh", { method: "POST" });
    return (await api<{ user: User }>("/auth/me")).user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}
