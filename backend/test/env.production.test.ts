import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const AUTH_VARIABLES = [
  "AUTH0_ISSUER_URL",
  "AUTH0_CLIENT_ID",
  "AUTH0_CLIENT_SECRET",
  "AUTH0_CALLBACK_URL",
  "AUTH_ALLOWED_RETURN_URLS",
  "AUTH_SESSION_HASH_SECRET",
] as const;

function configureProductionAuth(): void {
  vi.stubEnv("AUTH0_ISSUER_URL", "https://tenant.example.test/");
  vi.stubEnv("AUTH0_CLIENT_ID", "production-client");
  vi.stubEnv("AUTH0_CLIENT_SECRET", "production-secret");
  vi.stubEnv("AUTH0_CALLBACK_URL", "https://api.example.test/api/v1/auth/callback");
  vi.stubEnv("AUTH_ALLOWED_RETURN_URLS", "https://properties.example.test/admin");
  vi.stubEnv(
    "AUTH_SESSION_HASH_SECRET",
    "production-session-hash-secret-at-least-32-characters",
  );
}

function configureProductionBase(): void {
  vi.stubEnv(
    "MONGODB_URI",
    "mongodb+srv://application:credential@cluster.example.test/rc_premier",
  );
  vi.stubEnv("CORS_ORIGIN", "https://properties.example.test");
  vi.stubEnv("API_PUBLIC_ORIGIN", "https://api.example.test");
  vi.stubEnv("TRUST_PROXY_HOPS", "1");
}

describe("production authentication environment", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    configureProductionBase();
    for (const name of AUTH_VARIABLES) vi.stubEnv(name, "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("fails startup when the Auth0 application is not completely configured", async () => {
    await expect(import("../src/config/env.js")).rejects.toThrow(
      /Authentication configuration is required in production/,
    );
  });

  it("hard-disables development passkey-only assurance", async () => {
    configureProductionAuth();

    const { env } = await import("../src/config/env.js");
    expect(env.AUTH).toMatchObject({
      requiredAmr: "mfa",
      allowPasskeyOnly: false,
    });
    expect(env.TRUST_PROXY_HOPS).toBe(1);
  });

  it.each([
    ["AUTH_REQUIRED_AMR", "pwd"],
    ["AUTH_SESSION_IDLE_MINUTES", "31"],
    ["AUTH_SESSION_ABSOLUTE_HOURS", "9"],
    ["AUTH_MAX_CONCURRENT_SESSIONS", "4"],
    ["AUTH_TRANSACTION_MINUTES", "11"],
  ])("rejects a weakened %s policy", async (name, value) => {
    configureProductionAuth();
    vi.stubEnv(name, value);
    await expect(import("../src/config/env.js")).rejects.toThrow(name);
  });

  it.each([
    ["CORS_ORIGIN", "http://properties.example.test", /CORS_ORIGIN/],
    ["CORS_ORIGIN", "https://localhost", /CORS_ORIGIN/],
    ["API_PUBLIC_ORIGIN", "", /API_PUBLIC_ORIGIN/],
    ["TRUST_PROXY_HOPS", "", /TRUST_PROXY_HOPS/],
    ["MONGODB_URI", "mongodb://127.0.0.1/rc_premier", /MONGODB_URI/],
    [
      "MONGODB_URI",
      "mongodb+srv://cluster.example.test/rc_premier?tls=false",
      /MONGODB_URI/,
    ],
    [
      "MONGODB_URI",
      "mongodb://db.example.test/rc_premier?tls=true&ssl=false",
      /MONGODB_URI/,
    ],
    ["LOG_LEVEL", "debug", /LOG_LEVEL/],
  ])("rejects unsafe production %s", async (name, value, expected) => {
    configureProductionAuth();
    vi.stubEnv(name, value);
    await expect(import("../src/config/env.js")).rejects.toThrow(expected);
  });

  it("pins the Auth0 callback to the configured public API origin", async () => {
    configureProductionAuth();
    vi.stubEnv(
      "AUTH0_CALLBACK_URL",
      "https://other-api.example.test/api/v1/auth/callback",
    );
    await expect(import("../src/config/env.js")).rejects.toThrow(/API_PUBLIC_ORIGIN/);
  });
});
