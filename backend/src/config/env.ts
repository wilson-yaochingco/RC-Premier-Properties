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

function port(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid ${name}: "${raw}" is not a valid port number.`);
  }
  return parsed;
}

const nodeEnv = optional("NODE_ENV", "development") as Environment;

export const env = Object.freeze({
  NODE_ENV: nodeEnv,
  IS_PRODUCTION: nodeEnv === "production",
  PORT: port("PORT", 5000),
  MONGODB_URI: required("MONGODB_URI"),
  CORS_ORIGIN: optional("CORS_ORIGIN", "http://localhost:3000"),
});

export type Env = typeof env;
