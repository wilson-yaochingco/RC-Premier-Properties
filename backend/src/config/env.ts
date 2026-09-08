import "dotenv/config";
import type { Environment } from "@rc/shared";

/**
 * Typed, validated access to the process environment.
 *
 * Read configuration from this module rather than `process.env` anywhere else, so
 * that every required variable is checked exactly once, at startup, with a clear
 * error instead of an `undefined` surfacing deep in a request handler.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env and fill it in.`,
    );
  }
  return value.trim();
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : fallback;
}

function optionalValue(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

function environment(name: string, fallback: Environment): Environment {
  const value = optional(name, fallback);

  switch (value) {
    case "development":
    case "test":
    case "production":
      return value;
    default:
      throw new Error(
        `Invalid ${name}: "${value}". Expected development, test, or production.`,
      );
  }
}

function port(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid ${name}: "${raw}" is not a valid port number.`);
  }
  return parsed;
}

function positiveInteger(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${name}: "${raw}" must be a positive integer.`);
  }
  return parsed;
}

function boundedPositiveInteger(
  name: string,
  fallback: number,
  maximum: number,
): number {
  const parsed = positiveInteger(name, fallback);
  if (parsed > maximum) {
    throw new Error(`${name} cannot exceed ${maximum}.`);
  }
  return parsed;
}

/** Parse the exact number of trusted reverse-proxy hops; zero means trust none. */
export function normalizeTrustProxyHops(value: string | undefined): number {
  if (!value || value.trim() === "") return 0;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10) {
    throw new Error(
      `Invalid TRUST_PROXY_HOPS: "${value}" must be an integer from 0 to 10.`,
    );
  }
  return parsed;
}

function productionTrustProxyHops(
  nodeEnv: Environment,
  value: string | undefined,
): number {
  if (nodeEnv === "production" && (!value || value.trim() === "")) {
    throw new Error(
      "TRUST_PROXY_HOPS must be explicitly set in production; use 0 only for a verified direct connection.",
    );
  }
  return normalizeTrustProxyHops(value);
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

/** Validate and normalize the single browser origin allowed by CORS. */
export function normalizeCorsOrigin(value: string): string {
  const normalized = value.trim();

  if (normalized === "*") {
    throw new Error('Invalid CORS_ORIGIN: wildcard "*" is not allowed.');
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`Invalid CORS_ORIGIN: "${normalized}" is not a valid URL.`);
  }

  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new Error(
      "Invalid CORS_ORIGIN: expected one HTTP(S) origin without credentials, a path, query, or fragment.",
    );
  }

  return parsed.origin;
}

/** Production browser/API/media origins must be HTTPS and publicly routable. */
export function validateProductionOrigin(
  nodeEnv: Environment,
  name: string,
  origin: string,
): string {
  if (nodeEnv !== "production") return origin;
  const parsed = new URL(origin);
  if (parsed.protocol !== "https:" || isLoopbackHostname(parsed.hostname)) {
    throw new Error(`${name} must be a non-local HTTPS origin in production.`);
  }
  return origin;
}

function configuredPublicOrigin(
  nodeEnv: Environment,
  name: string,
  value: string | undefined,
  requiredInProduction: boolean,
): string | undefined {
  if (!value) {
    if (nodeEnv === "production" && requiredInProduction) {
      throw new Error(`Missing required production environment variable: ${name}.`);
    }
    return undefined;
  }
  let normalized: string;
  try {
    normalized = normalizeCorsOrigin(value);
  } catch {
    throw new Error(
      `${name} must be one exact HTTP(S) origin without credentials, a path, query, or fragment.`,
    );
  }
  return validateProductionOrigin(nodeEnv, name, normalized);
}

/** Require encrypted, non-local MongoDB connectivity and an explicit database in production. */
export function validateMongoDbUri(nodeEnv: Environment, value: string): string {
  if (nodeEnv !== "production") return value;

  try {
    const parsed = new URL(value);
    const encryptedSrv = parsed.protocol === "mongodb+srv:";
    const encryptedStandard =
      parsed.protocol === "mongodb:" &&
      [parsed.searchParams.get("tls"), parsed.searchParams.get("ssl")].some(
        (setting) => setting?.toLowerCase() === "true",
      );
    const databaseName = parsed.pathname.replace(/^\//, "");
    if (
      (!encryptedSrv && !encryptedStandard) ||
      isLoopbackHostname(parsed.hostname) ||
      !databaseName ||
      databaseName.includes("/")
    ) {
      throw new Error("unsafe");
    }
  } catch {
    throw new Error(
      "MONGODB_URI must identify an encrypted, non-local MongoDB deployment and an explicit database in production.",
    );
  }
  return value;
}

function buildId(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(value)) {
    throw new Error(
      "APP_BUILD_ID must contain only letters, numbers, dots, underscores, or hyphens.",
    );
  }
  return value;
}

export function normalizeAuthIssuerUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error(`Invalid AUTH0_ISSUER_URL: "${value}" is not a valid URL.`);
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    (parsed.pathname !== "/" && parsed.pathname !== "") ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new Error(
      "Invalid AUTH0_ISSUER_URL: expected an HTTPS origin without credentials, a path, query, or fragment.",
    );
  }

  return `${parsed.origin}/`;
}

export function normalizeAuthCallbackUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error(`Invalid AUTH0_CALLBACK_URL: "${value}" is not a valid URL.`);
  }

  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname === "/" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new Error(
      "Invalid AUTH0_CALLBACK_URL: expected an absolute HTTP(S) callback URL without credentials, query, or fragment.",
    );
  }

  return parsed.href;
}

export function normalizeAuthReturnUrls(
  value: string,
  allowedOrigin: string,
): readonly string[] {
  const values = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (values.length === 0) {
    throw new Error("AUTH_ALLOWED_RETURN_URLS must contain at least one URL.");
  }

  const normalized = values.map((entry) => {
    let parsed: URL;
    try {
      parsed = new URL(entry);
    } catch {
      throw new Error(`Invalid AUTH_ALLOWED_RETURN_URLS entry: "${entry}".`);
    }

    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      parsed.username !== "" ||
      parsed.password !== "" ||
      parsed.search !== "" ||
      parsed.hash !== "" ||
      parsed.origin !== allowedOrigin
    ) {
      throw new Error(
        "Invalid AUTH_ALLOWED_RETURN_URLS: every entry must be an exact URL on CORS_ORIGIN without credentials, query, or fragment.",
      );
    }

    return parsed.href;
  });

  return Object.freeze([...new Set(normalized)]);
}

export function validateAuthTransportSecurity(
  nodeEnv: Environment,
  corsOrigin: string,
  callbackUrl: string,
  returnUrls: readonly string[],
  publicApiOrigin?: string,
): void {
  if (nodeEnv !== "production") return;

  const urls = [corsOrigin, callbackUrl, ...returnUrls];
  if (urls.some((value) => new URL(value).protocol !== "https:")) {
    throw new Error(
      "Production authentication requires HTTPS CORS, callback, and return URLs.",
    );
  }
  if (publicApiOrigin && new URL(callbackUrl).origin !== publicApiOrigin) {
    throw new Error(
      "Production AUTH0_CALLBACK_URL must use the configured API_PUBLIC_ORIGIN.",
    );
  }
}

export interface AuthEnvironmentConfig {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  allowedReturnUrls: readonly string[];
  requiredAmr: string;
  allowPasskeyOnly: boolean;
  sessionHashSecret: string;
  sessionIdleMinutes: number;
  sessionAbsoluteHours: number;
  maxConcurrentSessions: number;
  transactionMinutes: number;
}

function validateProductionAuthPolicy(config: AuthEnvironmentConfig): void {
  if (config.requiredAmr !== "mfa") {
    throw new Error('Production AUTH_REQUIRED_AMR must remain "mfa".');
  }
  if (config.sessionIdleMinutes > 30) {
    throw new Error("Production AUTH_SESSION_IDLE_MINUTES cannot exceed 30.");
  }
  if (config.sessionAbsoluteHours > 8) {
    throw new Error("Production AUTH_SESSION_ABSOLUTE_HOURS cannot exceed 8.");
  }
  if (config.maxConcurrentSessions > 3) {
    throw new Error("Production AUTH_MAX_CONCURRENT_SESSIONS cannot exceed 3.");
  }
  if (config.transactionMinutes > 10) {
    throw new Error("Production AUTH_TRANSACTION_MINUTES cannot exceed 10.");
  }
}

function authEnvironment(
  nodeEnv: Environment,
  corsOrigin: string,
  publicApiOrigin: string | undefined,
): AuthEnvironmentConfig | null {
  const requiredNames = [
    "AUTH0_ISSUER_URL",
    "AUTH0_CLIENT_ID",
    "AUTH0_CLIENT_SECRET",
    "AUTH0_CALLBACK_URL",
    "AUTH_ALLOWED_RETURN_URLS",
    "AUTH_SESSION_HASH_SECRET",
  ] as const;
  const configured = requiredNames.some(
    (name) => process.env[name] && process.env[name]?.trim() !== "",
  );

  if (!configured) {
    if (nodeEnv === "production") {
      throw new Error(
        "Authentication configuration is required in production. Set the AUTH0_* and AUTH_* environment variables from .env.example.",
      );
    }
    return null;
  }

  const sessionHashSecret = required("AUTH_SESSION_HASH_SECRET");
  if (sessionHashSecret.length < 32) {
    throw new Error("AUTH_SESSION_HASH_SECRET must contain at least 32 characters.");
  }

  const requiredAmr = optional("AUTH_REQUIRED_AMR", "mfa");
  if (!/^[a-z0-9_-]{1,32}$/i.test(requiredAmr)) {
    throw new Error("AUTH_REQUIRED_AMR must be one short authentication-method value.");
  }

  const issuerUrl = normalizeAuthIssuerUrl(required("AUTH0_ISSUER_URL"));
  const callbackUrl = normalizeAuthCallbackUrl(required("AUTH0_CALLBACK_URL"));
  const allowedReturnUrls = normalizeAuthReturnUrls(
    required("AUTH_ALLOWED_RETURN_URLS"),
    corsOrigin,
  );
  validateAuthTransportSecurity(
    nodeEnv,
    corsOrigin,
    callbackUrl,
    allowedReturnUrls,
    publicApiOrigin,
  );

  const config: AuthEnvironmentConfig = {
    issuerUrl,
    clientId: required("AUTH0_CLIENT_ID"),
    clientSecret: required("AUTH0_CLIENT_SECRET"),
    callbackUrl,
    allowedReturnUrls,
    requiredAmr,
    allowPasskeyOnly: nodeEnv !== "production",
    sessionHashSecret,
    sessionIdleMinutes: positiveInteger("AUTH_SESSION_IDLE_MINUTES", 30),
    sessionAbsoluteHours: positiveInteger("AUTH_SESSION_ABSOLUTE_HOURS", 8),
    maxConcurrentSessions: positiveInteger("AUTH_MAX_CONCURRENT_SESSIONS", 3),
    transactionMinutes: positiveInteger("AUTH_TRANSACTION_MINUTES", 10),
  };
  if (nodeEnv === "production") validateProductionAuthPolicy(config);
  return Object.freeze(config);
}

const nodeEnv = environment("NODE_ENV", "development");
const corsOrigin = normalizeCorsOrigin(
  optional("CORS_ORIGIN", "http://localhost:3000"),
);
validateProductionOrigin(nodeEnv, "CORS_ORIGIN", corsOrigin);
const publicApiOrigin = configuredPublicOrigin(
  nodeEnv,
  "API_PUBLIC_ORIGIN",
  optionalValue("API_PUBLIC_ORIGIN"),
  true,
);
const mediaPublicOrigin = configuredPublicOrigin(
  nodeEnv,
  "MEDIA_PUBLIC_ORIGIN",
  optionalValue("MEDIA_PUBLIC_ORIGIN"),
  false,
);
const mongodbUri = validateMongoDbUri(nodeEnv, required("MONGODB_URI"));

export const env = Object.freeze({
  NODE_ENV: nodeEnv,
  IS_PRODUCTION: nodeEnv === "production",
  PORT: port("PORT", 5000),
  TRUST_PROXY_HOPS: productionTrustProxyHops(nodeEnv, process.env.TRUST_PROXY_HOPS),
  SHUTDOWN_GRACE_SECONDS: boundedPositiveInteger("SHUTDOWN_GRACE_SECONDS", 30, 120),
  APP_BUILD_ID: buildId(optionalValue("APP_BUILD_ID")),
  MONGODB_URI: mongodbUri,
  CORS_ORIGIN: corsOrigin,
  API_PUBLIC_ORIGIN: publicApiOrigin,
  MEDIA_PUBLIC_ORIGIN: mediaPublicOrigin,
  AUTH: authEnvironment(nodeEnv, corsOrigin, publicApiOrigin),
});

export type Env = typeof env;
