import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { safeErrorMessage } from "../src/lib/safe-error.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { notFound } from "../src/middleware/notFound.js";
import { createSecurityHeaders } from "../src/middleware/securityHeaders.js";

describe("security response headers", () => {
  it.each([
    [false, false],
    [true, true],
  ])("uses the reviewed header policy (production=%s)", async (production, hsts) => {
    const app = express();
    app.use(...createSecurityHeaders(production));
    app.get("/", (_req, res) => res.status(204).end());

    const response = await request(app).get("/");
    expect(response.headers["content-security-policy"]).toContain("default-src 'self'");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["permissions-policy"]).toBe(
      "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
    );
    expect(Boolean(response.headers["strict-transport-security"])).toBe(hsts);
  });
});

describe("sensitive error privacy", () => {
  it("redacts configured secrets, URL credentials, and common token fields", () => {
    const configuredSecret = "configured-session-secret";
    const safe = safeErrorMessage(
      new Error(
        "mongodb+srv://staff:database-password@cluster.example/test " +
          "https://api.example.test/callback?code=one-time-code&access_token=token " +
          `client_secret=${configuredSecret}`,
      ),
      [configuredSecret],
    );

    expect(safe).not.toContain("database-password");
    expect(safe).not.toContain("one-time-code");
    expect(safe).not.toContain("access_token=token");
    expect(safe).not.toContain(configuredSecret);
    expect(safe).toContain("[REDACTED]");
  });

  it("does not reflect query credentials in a route-not-found response", async () => {
    const app = express();
    app.use(notFound);
    app.use(errorHandler);

    const response = await request(app).get(
      "/missing-callback?code=one-time-code&access_token=provider-token",
    );
    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Route not found: GET /missing-callback");
    expect(JSON.stringify(response.body)).not.toContain("one-time-code");
    expect(JSON.stringify(response.body)).not.toContain("provider-token");
  });
});
