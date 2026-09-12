import express from "express";
import request from "supertest";
import rateLimit from "express-rate-limit";
import { describe, expect, it, vi } from "vitest";
import { operationalLogger } from "../src/lib/operational-logger.js";
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
  it("excludes path parameters from unexpected-error logs", async () => {
    const log = vi.spyOn(operationalLogger, "error").mockImplementation(() => {});
    try {
      const app = express();
      app.get("/properties/:slug", () => {
        throw new Error("private error detail");
      });
      app.use(errorHandler);
      const response = await request(app).get("/properties/private-path-value");
      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Internal Server Error");
      expect(log).toHaveBeenCalledWith(
        "http_request_failed",
        expect.objectContaining({
          route: "/properties/:slug",
          statusCode: 500,
        }),
      );
      expect(JSON.stringify(log.mock.calls)).not.toMatch(
        /private-path-value|private error detail/,
      );
    } finally {
      log.mockRestore();
    }
  });

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

describe("rate-limit proxy boundary", () => {
  it("does not let untrusted forwarding headers create new IP buckets", async () => {
    const app = express();
    app.use(
      rateLimit({
        windowMs: 60_000,
        limit: 2,
        standardHeaders: true,
        legacyHeaders: false,
        validate: { xForwardedForHeader: false },
      }),
    );
    app.get("/", (_req, res) => res.status(204).end());
    const responses = [];
    for (const address of ["198.51.100.1", "198.51.100.2", "198.51.100.3"]) {
      responses.push(await request(app).get("/").set("X-Forwarded-For", address));
    }
    expect(responses.map((response) => response.status)).toEqual([204, 204, 429]);
  });
});
