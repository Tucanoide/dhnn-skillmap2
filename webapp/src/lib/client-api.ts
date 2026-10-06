"use client";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("skillmap_token");
}

export interface SessionData {
  token: string;
  nombre: string;
  es_lider: boolean;
  es_admin: boolean;
}

export function setSession(data: SessionData) {
  localStorage.setItem("skillmap_token", data.token);
  localStorage.setItem("skillmap_nombre", data.nombre);
  localStorage.setItem("skillmap_es_lider", data.es_lider ? "1" : "");
  localStorage.setItem("skillmap_es_admin", data.es_admin ? "1" : "");
}

export function clearSession() {
  localStorage.clear();
}

export interface CurrentUser {
  nombre: string;
  esLider: boolean;
  esAdmin: boolean;
}

export function currentUser(): CurrentUser {
  return {
    nombre: localStorage.getItem("skillmap_nombre") || "",
    esLider: !!localStorage.getItem("skillmap_es_lider"),
    esAdmin: !!localStorage.getItem("skillmap_es_admin"),
  };
}

export class ApiClientError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(opts.headers as Record<string, string>) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...opts, headers });
  if (res.status === 401) {
    clearSession();
    window.location.replace("/login");
    throw new ApiClientError(401, "401");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiClientError(res.status, body.detail || `Error ${res.status}`);
  return body as T;
}
