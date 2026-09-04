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
const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const rawMapTileUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL;

/** Base URL of the backend API, without a trailing slash. */
export const API_BASE_URL = (rawApiUrl ?? "http://localhost:5000").replace(/\/+$/, "");

/** Public frontend origin, used for canonical and sitemap URLs. */
export const SITE_URL = (rawSiteUrl ?? "http://localhost:3000").replace(/\/+$/, "");

/**
 * Public Leaflet evaluation tiles. The default is Stadia Alidade Smooth; localhost can
 * evaluate it without a browser token. The production provider remains a Phase 2B
 * decision, and retaining Stadia would require an appropriate plan and registered
 * domain. Attribution remains visible inside the map.
 */
export const MAP_TILE_URL =
  rawMapTileUrl ??
  "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png";

/** Build a fully-qualified API URL from a path such as `/api/health`. */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
