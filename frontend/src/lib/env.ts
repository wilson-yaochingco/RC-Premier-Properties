/**
 * Client- and server-safe access to the frontend environment.
 *
 * Next.js inlines `NEXT_PUBLIC_*` values into browser bundles, so every read must remain
 * a direct static property access in this module. Deployment secrets must never use the
 * `NEXT_PUBLIC_` prefix.
 */

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL;
const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const rawDeploymentEnvironment = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV;
const rawMediaOrigin = process.env.NEXT_PUBLIC_MEDIA_ORIGIN;
const rawMapTileUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL;
const rawMapAttributionText = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION_TEXT;
const rawMapAttributionUrl = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION_URL;
const rawNodeEnv = process.env.NODE_ENV;

export type FrontendDeploymentEnvironment =
  "development" | "test" | "staging" | "production";

const DEVELOPMENT_API_URL = "http://localhost:5000";
const DEVELOPMENT_SITE_URL = "http://localhost:3000";
const EVALUATION_MAP_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const EVALUATION_MAP_ATTRIBUTION_TEXT = "OpenStreetMap contributors";
const EVALUATION_MAP_ATTRIBUTION_URL = "https://www.openstreetmap.org/copyright";

function isPublicDeployment(environment: FrontendDeploymentEnvironment): boolean {
  return environment === "staging" || environment === "production";
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "127.0.0.1" ||
    normalized === "[::1]" ||
    normalized === "::1"
  );
}

function parseOrigin(value: string | undefined): URL | undefined {
  const candidate = value?.trim();
  if (!candidate) return undefined;

  try {
    const url = new URL(candidate);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return undefined;
    }
    return url;
  } catch {
    return undefined;
  }
}

function configuredOrigin(
  name: string,
  value: string | undefined,
  environment: FrontendDeploymentEnvironment,
  developmentFallback?: string,
): string {
  const parsed = parseOrigin(value ?? developmentFallback);
  if (
    !parsed ||
    (isPublicDeployment(environment) &&
      (parsed.protocol !== "https:" || isLoopbackHostname(parsed.hostname)))
  ) {
    throw new Error(
      `${name} must be an exact${isPublicDeployment(environment) ? " non-local HTTPS" : " HTTP(S)"} origin without credentials, a path, query, or fragment.`,
    );
  }
  return parsed.origin;
}

export function resolveDeploymentEnvironment(
  value: string | undefined,
  nodeEnvironment: string | undefined,
): FrontendDeploymentEnvironment {
  // Next's build/type-generation tools force NODE_ENV=production even for local and CI
  // artifact checks. Only the explicit deployment variable may activate public gates;
  // the deployment build wrapper refuses to run without staging/production selected.
  const candidate =
    value?.trim() ||
    (nodeEnvironment === "production" ? "test" : nodeEnvironment) ||
    "development";
  if (
    candidate === "development" ||
    candidate === "test" ||
    candidate === "staging" ||
    candidate === "production"
  ) {
    return candidate;
  }
  throw new Error(
    "NEXT_PUBLIC_DEPLOYMENT_ENV must be development, test, staging, or production.",
  );
}

export function resolveApiBaseUrl(
  value: string | undefined,
  environment: FrontendDeploymentEnvironment,
): string {
  return configuredOrigin(
    "NEXT_PUBLIC_API_URL",
    value,
    environment,
    isPublicDeployment(environment) ? undefined : DEVELOPMENT_API_URL,
  );
}

/** Normalize the public site origin used by every SEO surface. */
export function resolveSiteUrl(
  value: string | undefined,
  environment: FrontendDeploymentEnvironment,
): string | undefined {
  const parsed = parseOrigin(
    value ?? (isPublicDeployment(environment) ? undefined : DEVELOPMENT_SITE_URL),
  );
  if (
    !parsed ||
    (isPublicDeployment(environment) &&
      (parsed.protocol !== "https:" || isLoopbackHostname(parsed.hostname)))
  ) {
    return undefined;
  }
  return parsed.origin;
}

export function resolveMapTileUrl(
  value: string | undefined,
  environment: FrontendDeploymentEnvironment,
): string {
  const candidate =
    value?.trim() ||
    (isPublicDeployment(environment) ? undefined : EVALUATION_MAP_TILE_URL);
  if (
    !candidate ||
    !["{z}", "{x}", "{y}"].every((token) => candidate.includes(token))
  ) {
    throw new Error(
      "NEXT_PUBLIC_MAP_TILE_URL must be configured with {z}, {x}, and {y} placeholders.",
    );
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("NEXT_PUBLIC_MAP_TILE_URL must be an absolute HTTP(S) URL.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash ||
    (isPublicDeployment(environment) &&
      (url.protocol !== "https:" || isLoopbackHostname(url.hostname)))
  ) {
    throw new Error(
      "NEXT_PUBLIC_MAP_TILE_URL must use an approved non-local HTTPS provider in staging and production.",
    );
  }
  return candidate;
}

export function resolveMapAttribution(
  text: string | undefined,
  url: string | undefined,
  environment: FrontendDeploymentEnvironment,
): { text: string; url: string } {
  const candidateText =
    text?.trim() ||
    (isPublicDeployment(environment) ? undefined : EVALUATION_MAP_ATTRIBUTION_TEXT);
  if (!candidateText || candidateText.length > 240 || /[<>]/.test(candidateText)) {
    throw new Error(
      "NEXT_PUBLIC_MAP_ATTRIBUTION_TEXT is required and must be plain text under 241 characters.",
    );
  }
  const candidateUrl =
    url?.trim() ||
    (isPublicDeployment(environment) ? undefined : EVALUATION_MAP_ATTRIBUTION_URL);
  let parsedUrl: URL;
  try {
    if (!candidateUrl) throw new Error("missing");
    parsedUrl = new URL(candidateUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_MAP_ATTRIBUTION_URL must be an absolute URL.");
  }
  if (
    !["http:", "https:"].includes(parsedUrl.protocol) ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.hash ||
    (isPublicDeployment(environment) &&
      (parsedUrl.protocol !== "https:" || isLoopbackHostname(parsedUrl.hostname)))
  ) {
    throw new Error(
      "NEXT_PUBLIC_MAP_ATTRIBUTION_URL must use an approved non-local HTTPS provider in staging and production.",
    );
  }
  return {
    text: candidateText,
    url: parsedUrl.toString(),
  };
}

export function resolveMediaOrigin(
  value: string | undefined,
  environment: FrontendDeploymentEnvironment,
): string | undefined {
  if (!value?.trim()) return undefined;
  return configuredOrigin("NEXT_PUBLIC_MEDIA_ORIGIN", value, environment);
}

export const DEPLOYMENT_ENV = resolveDeploymentEnvironment(
  rawDeploymentEnvironment,
  rawNodeEnv,
);

/** Whether Next.js is producing/running its optimized build. */
export const IS_PRODUCTION = rawNodeEnv === "production";

/** Whether public deployment security requirements must be enforced. */
export const IS_PUBLIC_DEPLOYMENT = isPublicDeployment(DEPLOYMENT_ENV);

/** Presentation-only sample media is deliberately limited to `next dev`. */
export const DEVELOPMENT_SAMPLE_MEDIA_ENABLED = rawNodeEnv === "development";

/** Exact public backend origin, without a trailing slash. */
export const API_BASE_URL = resolveApiBaseUrl(rawApiUrl, DEPLOYMENT_ENV);

/** Public frontend origin for canonicals, sitemap, social metadata, and JSON-LD. */
export const SITE_URL = resolveSiteUrl(rawSiteUrl, DEPLOYMENT_ENV);
if (IS_PUBLIC_DEPLOYMENT && !SITE_URL) {
  throw new Error(
    "NEXT_PUBLIC_SITE_URL must be a configured non-local HTTPS origin in staging and production.",
  );
}

/** Optional exact HTTPS origin approved to deliver production listing media. */
export const MEDIA_ORIGIN = resolveMediaOrigin(rawMediaOrigin, DEPLOYMENT_ENV);

/** Leaflet provider configuration. Public deployments cannot use the evaluation default. */
export const MAP_TILE_URL = resolveMapTileUrl(rawMapTileUrl, DEPLOYMENT_ENV);
const mapAttribution = resolveMapAttribution(
  rawMapAttributionText,
  rawMapAttributionUrl,
  DEPLOYMENT_ENV,
);
export const MAP_ATTRIBUTION_TEXT = mapAttribution.text;
export const MAP_ATTRIBUTION_URL = mapAttribution.url;

const LOCAL_PROPERTY_MEDIA =
  /^\/media\/properties\/[a-zA-Z0-9][a-zA-Z0-9/_-]*\.(?:avif|jpe?g|png|webp)$/i;

/** Accept only local managed media or the one deployment-approved public media origin. */
export function isApprovedProductionMediaUrl(
  value: string | undefined,
): value is string {
  if (!value) return false;
  if (LOCAL_PROPERTY_MEDIA.test(value) && !value.includes("..")) return true;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.hash) {
      return false;
    }
    if (MEDIA_ORIGIN) return url.origin === MEDIA_ORIGIN;
    return !IS_PUBLIC_DEPLOYMENT;
  } catch {
    return false;
  }
}

/** Build a fully-qualified API URL from a path such as `/api/v1/health`. */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
