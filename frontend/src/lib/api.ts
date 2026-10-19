import { getToken } from "./auth";

const BASE = "/api";

/**
 * Wrapper fetch ke backend. Otomatis pasang Authorization + handle 401.
 */
export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("kiddytracker_token");
    localStorage.removeItem("kiddytracker_user");
    window.location.href = "/login";
    throw new Error("Sesi berakhir, silakan login ulang");
  }
  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      (data && (data.detail || data.message)) || `Error ${res.status}`
    );
  }
  return data as T;
}
