/**
 * The one HTTP client.
 * - The access token lives in memory only (never localStorage); the refresh token is an httpOnly
 *   cookie the browser sends to /api/auth automatically (withCredentials).
 * - On a 401 it renews the session once (shared by all waiting requests) and retries.
 * - Every failure becomes an ApiError with the backend's code, message and field details.
 */
import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface FieldIssue {
  field: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public details: FieldIssue[] = [],
    public requestId?: string
  ) {
    super(message);
  }

  /** Field errors keyed by field name, for forms. */
  /** Field → message. A nested field ("student.aadhaar") is also given under its own name ("aadhaar"). */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const d of this.details) {
      out[d.field] = d.message;
      const own = d.field.split('.').slice(1).join('.');
      if (own && !(own in out)) out[own] = d.message;
    }
    return out;
  }
}

interface Envelope<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  error?: { code: string; message: string; details?: FieldIssue[] };
  requestId?: string;
}

export interface TokenBundle {
  accessToken: string;
  expiresIn: number;
}

// ─── Access token (memory only) ──────────────────────────────────────────────

let accessToken: string | null = null;
let onSessionEnded: (() => void) | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};
export const hasAccessToken = () => accessToken !== null;

/** Called when the session can't be renewed (signed out elsewhere, expired). */
export const setSessionEndedHandler = (handler: () => void) => {
  onSessionEnded = handler;
};

const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

const toApiError = (err: unknown): ApiError => {
  if (err instanceof ApiError) return err;
  const ax = err as AxiosError<Envelope<unknown>>;
  if (ax.response) {
    const body = ax.response.data;
    return new ApiError(
      body?.error?.message || `Request failed (${ax.response.status})`,
      ax.response.status,
      body?.error?.code || 'ERROR',
      body?.error?.details || [],
      body?.requestId
    );
  }
  if (ax.code === 'ECONNABORTED') return new ApiError('The server took too long to answer. Please try again.', 0, 'TIMEOUT');
  return new ApiError("Can't reach the server. Check your connection and try again.", 0, 'NETWORK_ERROR');
};

// ─── Session renewal (one at a time) ─────────────────────────────────────────

let renewing: Promise<TokenBundle> | null = null;

const postRenew = async (): Promise<TokenBundle> => {
  try {
    const res = await http.post<Envelope<TokenBundle>>('/auth/refresh', undefined, { headers: { Authorization: '' } });
    return res.data.data!;
  } catch (err) {
    const e = toApiError(err);
    // Another tab renewed at the same moment: the cookie is new now, so try once more.
    if (e.status === 409) {
      const res = await http.post<Envelope<TokenBundle>>('/auth/refresh', undefined, { headers: { Authorization: '' } });
      return res.data.data!;
    }
    throw e;
  }
};

/** Renews the session using the refresh cookie; shared by everyone who asks at the same time. */
export const renewSession = <T extends TokenBundle = TokenBundle>(): Promise<T> => {
  if (!renewing) {
    renewing = postRenew()
      .then((bundle) => {
        setAccessToken(bundle.accessToken);
        return bundle;
      })
      .finally(() => {
        renewing = null;
      });
  }
  return renewing as Promise<T>;
};

/**
 * Page load: renews the session and gets "who am I" + "my access" in one request
 * (/auth/refresh?with=profile), instead of three requests one after another.
 */
let restoring: Promise<unknown> | null = null;

export const restoreSession = <T>(): Promise<T> => {
  // One request even if asked twice at once (React runs start-up effects twice in development).
  restoring ??= (async () => {
    const call = () => http.post<Envelope<T & TokenBundle>>("/auth/refresh", undefined, { params: { with: "profile" } });
    let res;
    try {
      res = await call();
    } catch (err) {
      const e = toApiError(err);
      if (e.status !== 409) throw e; // another tab renewed at the same moment: try once more
      res = await call();
    }
    const data = res.data.data!;
    setAccessToken(data.accessToken);
    return data;
  })().finally(() => {
    restoring = null;
  });
  return restoring as Promise<T>;
};

const NO_RENEW = ['/auth/login', '/auth/refresh', '/auth/mfa/verify', '/auth/forgot-password', '/auth/reset-password'];

http.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const config = err.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const url = config?.url || '';
    if (err.response?.status === 401 && config && !config._retried && !NO_RENEW.some((p) => url.startsWith(p))) {
      config._retried = true;
      try {
        await renewSession();
      } catch {
        setAccessToken(null);
        onSessionEnded?.();
        throw toApiError(err);
      }
      return http(config);
    }
    throw toApiError(err);
  }
);

// ─── Typed helpers: return `data` from the envelope ──────────────────────────

const unwrap = async <T>(p: Promise<{ data: Envelope<T> }>) => (await p).data.data as T;

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => unwrap<T>(http.get(url, config)),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => unwrap<T>(http.post(url, body, config)),
  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => unwrap<T>(http.patch(url, body, config)),
  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => unwrap<T>(http.put(url, body, config)),
  delete: <T>(url: string, config?: AxiosRequestConfig) => unwrap<T>(http.delete(url, config)),
};

/** Sends one file as multipart/form-data and returns `data` from the envelope. */
export const uploadFile = <T>(url: string, field: string, file: File) => {
  const form = new FormData();
  form.append(field, file);
  return unwrap<T>(http.post(url, form, { headers: { "Content-Type": "multipart/form-data" }, timeout: 120_000 }));
};

/** Downloads a file from an authenticated endpoint and saves it (name from Content-Disposition). */
export const downloadFile = async (url: string, params?: Record<string, string | number>, fallbackName = "download.xlsx") => {
  let res;
  try {
    res = await http.get<Blob>(url, { params, responseType: "blob", timeout: 120_000 });
  } catch (err) {
    // Error bodies arrive as a Blob too; read the JSON message out of it.
    const ax = err as AxiosError;
    const blob = (ax as unknown as { response?: { data?: Blob; status?: number } }).response?.data;
    if (blob instanceof Blob) {
      try {
        const body = JSON.parse(await blob.text()) as Envelope<unknown>;
        throw new ApiError(body.error?.message || "Download failed", ax.response?.status ?? 0, body.error?.code || "ERROR", body.error?.details || []);
      } catch (inner) {
        if (inner instanceof ApiError) throw inner;
      }
    }
    throw toApiError(err);
  }
  const disposition = String(res.headers["content-disposition"] ?? "");
  const name = disposition.match(/filename="?([^"]+)"?/)?.[1] ?? fallbackName;
  const href = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
};

/**
 * An image from an authenticated endpoint (e.g. a profile photo) as an object URL for <img>.
 * Paths carry ?v=<file id>, so each URL is fetched once and kept for the life of the page.
 */
const imageUrls = new Map<string, Promise<string>>();
export const authedImageUrl = (path: string) => {
  let url = imageUrls.get(path);
  if (!url) {
    url = http.get<Blob>(path, { responseType: "blob" }).then((res) => URL.createObjectURL(res.data));
    url.catch(() => imageUrls.delete(path));
    imageUrls.set(path, url);
  }
  return url;
};

/** Turns any thrown value into a message for a toast. */
export const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
