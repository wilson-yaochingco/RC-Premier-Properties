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
): void {
  if (nodeEnv !== "production") return;

  const urls = [corsOrigin, callbackUrl, ...returnUrls];
  if (urls.some((value) => new URL(value).protocol !== "https:")) {
    throw new Error(
      "Production authentication requires HTTPS CORS, callback, and return URLs.",
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
  sessionHashSecret: string;
  sessionIdleMinutes: number;
  sessionAbsoluteHours: number;
  maxConcurrentSessions: number;
  transactionMinutes: number;
}

function authEnvironment(
  nodeEnv: Environment,
  corsOrigin: string,
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
  validateAuthTransportSecurity(nodeEnv, corsOrigin, callbackUrl, allowedReturnUrls);

  return Object.freeze({
    issuerUrl,
    clientId: required("AUTH0_CLIENT_ID"),
    clientSecret: required("AUTH0_CLIENT_SECRET"),
    callbackUrl,
    allowedReturnUrls,
    requiredAmr,
    sessionHashSecret,
    sessionIdleMinutes: positiveInteger("AUTH_SESSION_IDLE_MINUTES", 30),
    sessionAbsoluteHours: positiveInteger("AUTH_SESSION_ABSOLUTE_HOURS", 8),
    maxConcurrentSessions: positiveInteger("AUTH_MAX_CONCURRENT_SESSIONS", 3),
    transactionMinutes: positiveInteger("AUTH_TRANSACTION_MINUTES", 10),
  });
}

const nodeEnv = environment("NODE_ENV", "development");
const corsOrigin = normalizeCorsOrigin(
  optional("CORS_ORIGIN", "http://localhost:3000"),
);

export const env = Object.freeze({
  NODE_ENV: nodeEnv,
  IS_PRODUCTION: nodeEnv === "production",
  PORT: port("PORT", 5000),
  MONGODB_URI: required("MONGODB_URI"),
  CORS_ORIGIN: corsOrigin,
  AUTH: authEnvironment(nodeEnv, corsOrigin),
});

export type Env = typeof env;
