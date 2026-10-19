import type { Pengguna } from "../types";

const TOKEN_KEY = "kiddytracker_token";
const USER_KEY = "kiddytracker_user";

export function setAuth(token: string, user: Pengguna) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): Pengguna | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Pengguna;
  } catch {
    return null;
  }
}

export function setUser(user: Pengguna) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
