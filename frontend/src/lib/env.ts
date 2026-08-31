/**
 * Client- and server-safe access to the frontend's environment configuration.
 *
 * Every module that needs to talk to the RC Premier Properties API should import
 * `API_BASE_URL` from here rather than reading `process.env` directly, so there is
 * exactly one place to change when the backend moves.
 *
 * Note: Next.js inlines `NEXT_PUBLIC_*` variables at build time, so this must be a
 * direct static property access — destructuring or dynamic lookup will not work.
 */

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL;

/** Base URL of the backend API, without a trailing slash. */
export const API_BASE_URL = (rawApiUrl ?? "http://localhost:5000").replace(/\/+$/, "");

/** Build a fully-qualified API URL from a path such as `/api/health`. */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
