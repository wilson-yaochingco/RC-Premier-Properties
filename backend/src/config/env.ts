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

const nodeEnv = environment("NODE_ENV", "development");

export const env = Object.freeze({
  NODE_ENV: nodeEnv,
  IS_PRODUCTION: nodeEnv === "production",
  PORT: port("PORT", 5000),
  MONGODB_URI: required("MONGODB_URI"),
  CORS_ORIGIN: normalizeCorsOrigin(optional("CORS_ORIGIN", "http://localhost:3000")),
});

export type Env = typeof env;
