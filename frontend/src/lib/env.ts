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
const rawNodeEnv = process.env.NODE_ENV;

type FrontendEnvironment = "development" | "test" | "production";

/**
 * Normalize the public site origin used by every SEO surface. Production deliberately
 * returns no origin when configuration is absent or points at localhost, so canonical,
 * social, sitemap and structured-data URLs cannot silently advertise a development host.
 */
export function resolveSiteUrl(
  value: string | undefined,
  environment: FrontendEnvironment,
): string | undefined {
  const candidate = value?.trim();
  if (!candidate) {
    return environment === "production" ? undefined : "http://localhost:3000";
  }

  try {
    const url = new URL(candidate);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      (environment === "production" && url.hostname === "localhost")
    ) {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
}

/** Whether the frontend is running as an optimized production build. */
export const IS_PRODUCTION = rawNodeEnv === "production";

/**
 * Presentation-only sample property media is deliberately limited to `next dev`.
 * Optimized builds, test builds and production runtimes retain neutral placeholders.
 */
export const DEVELOPMENT_SAMPLE_MEDIA_ENABLED = rawNodeEnv === "development";

/** Base URL of the backend API, without a trailing slash. */
export const API_BASE_URL = (rawApiUrl ?? "http://localhost:5000").replace(/\/+$/, "");

/**
 * Public frontend origin for canonical, sitemap, social and structured-data URLs.
 * Undefined is an intentional safe state when a production origin is not configured.
 */
export const SITE_URL = resolveSiteUrl(
  rawSiteUrl,
  (rawNodeEnv ?? "development") as FrontendEnvironment,
);

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
