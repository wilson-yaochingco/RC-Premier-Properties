import express from "express";
import request from "supertest";
import { afterEach, expect, it, vi } from "vitest";
import { MongoRateLimitStore } from "../src/middleware/mongoRateLimitStore.js";
import { createApiRateLimit } from "../src/middleware/rateLimit.js";
import { createLoginRateLimit } from "../src/middleware/loginRateLimit.js";
import { createInquiryRateLimit } from "../src/middleware/inquiryRateLimit.js";
import { errorHandler } from "../src/middleware/errorHandler.js";

vi.mock("../src/config/env.js", async (original) => ({
  env: {
    ...(await original<typeof import("../src/config/env.js")>()).env,
    IS_PRODUCTION: true,
  },
}));

afterEach(() => vi.restoreAllMocks());

it("selects separately namespaced MongoDB stores in production", async () => {
  const namespaces: string[] = [];
  vi.spyOn(MongoRateLimitStore.prototype, "increment").mockImplementation(
    async function () {
      namespaces.push(this.prefix);
      return { totalHits: 1, resetTime: new Date(Date.now() + 60_000) };
    },
  );
  for (const factory of [
    createApiRateLimit,
    createLoginRateLimit,
    createInquiryRateLimit,
  ]) {
    const app = express();
    app.use(factory());
    app.get("/", (_req, res) => res.status(204).end());
    expect((await request(app).get("/")).status).toBe(204);
  }
  expect(namespaces).toEqual(["api:", "login:", "inquiry:"]);
});

it("fails closed when the shared store is unavailable", async () => {
  vi.spyOn(MongoRateLimitStore.prototype, "increment").mockRejectedValue(
    new Error("database unavailable"),
  );
  const app = express();
  app.use(createInquiryRateLimit());
  const handler = vi.fn((_req, res) => res.status(201).end());
  app.post("/", handler);
  app.use(errorHandler);
  expect((await request(app).post("/")).status).toBe(500);
  expect(handler).not.toHaveBeenCalled();
});
