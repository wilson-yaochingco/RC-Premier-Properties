import { createHash } from "node:crypto";
import mongoose, { type Connection } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import type { Options } from "express-rate-limit";
import request from "supertest";
import { API_PREFIX } from "@rc/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoRateLimitStore } from "../src/middleware/mongoRateLimitStore.js";
import { createInquiryRateLimit } from "../src/middleware/inquiryRateLimit.js";
import { createApiRateLimit } from "../src/middleware/rateLimit.js";
import { createApp } from "../src/app.js";
import { rateLimitStores } from "./helpers/rate-limit-stores.js";

describe("MongoDB rate-limit store", () => {
  let server: MongoMemoryServer;
  let connection: Connection;
  let store: MongoRateLimitStore;
  const ip = "198.51.100.42";
  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    connection = await mongoose.createConnection(server.getUri()).asPromise();
  }, 60_000);
  beforeEach(async () => {
    await connection.db!.collection("ratelimits").deleteMany({});
    store = new MongoRateLimitStore("test", connection);
    store.init({ windowMs: 60_000 } as Options);
  });
  afterAll(async () => {
    await connection?.close();
    await server?.stop();
  });

  it("increments within a fixed window and stores only namespaced SHA-256 keys", async () => {
    const first = await store.increment(ip);
    const second = await store.increment(ip);
    expect(first.totalHits).toBe(1);
    expect(second).toEqual({ totalHits: 2, resetTime: first.resetTime });
    expect(first.resetTime!.getTime()).toBeGreaterThan(Date.now());
    const records = await connection.db!.collection("ratelimits").find().toArray();
    expect(records).toEqual([
      {
        _id: createHash("sha256").update(`test:${ip}`).digest("hex"),
        totalHits: 2,
        resetAt: first.resetTime,
      },
    ]);
    expect(JSON.stringify(records)).not.toContain(ip);
    const other = new MongoRateLimitStore("other", connection);
    other.init({ windowMs: 60_000 } as Options);
    expect((await other.increment(ip)).totalHits).toBe(1);
    expect(await connection.db!.collection("ratelimits").countDocuments()).toBe(2);
  });

  it("resets an expired window atomically under concurrent increments", async () => {
    await store.increment(ip);
    await connection
      .db!.collection("ratelimits")
      .updateMany({}, { $set: { resetAt: new Date(0), totalHits: 99 } });
    const results = await Promise.all(
      Array.from({ length: 20 }, () => store.increment(ip)),
    );
    expect(results.map(({ totalHits }) => totalHits).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
    expect(new Set(results.map(({ resetTime }) => resetTime!.getTime())).size).toBe(1);
    expect(results[0].resetTime!.getTime()).toBeGreaterThan(Date.now());
  });

  it("decrements without making counts negative or creating missing keys", async () => {
    await store.decrement(ip);
    expect(await connection.db!.collection("ratelimits").countDocuments()).toBe(0);
    await store.increment(ip);
    await store.increment(ip);
    await store.decrement(ip);
    expect((await store.increment(ip)).totalHits).toBe(2);
    await Promise.all(Array.from({ length: 5 }, () => store.decrement(ip)));
    expect((await store.increment(ip)).totalHits).toBe(1);
  });

  it("resets only the requested key", async () => {
    await store.increment(ip);
    await store.increment("other");
    await store.resetKey(ip);
    expect((await store.increment(ip)).totalHits).toBe(1);
    expect((await store.increment("other")).totalHits).toBe(2);
  });

  it("creates the TTL index before accepting increments", async () => {
    await store.increment(ip);
    expect(await connection.db!.collection("ratelimits").indexes()).toContainEqual(
      expect.objectContaining({ key: { resetAt: 1 }, expireAfterSeconds: 0 }),
    );
  });

  it("enforces one limit across two app instances with separate store clients", async () => {
    const apps = [1, 2].map(() =>
      createApp({
        inquiryRateLimit: createInquiryRateLimit(
          new MongoRateLimitStore("shared-inquiry", connection),
        ),
      }),
    );
    const responses = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        request(apps[i % 2])
          .post(`${API_PREFIX}/inquiries`)
          .send({}),
      ),
    );
    expect(responses.filter(({ status }) => status === 400)).toHaveLength(5);
    expect(responses.filter(({ status }) => status === 429)).toHaveLength(7);
    for (const response of responses.filter(({ status }) => status === 429))
      expect(response.body).toEqual({
        status: "error",
        statusCode: 429,
        message: "Too many inquiries, please try again later.",
      });
  });
});

describe("baseline API limiter", () => {
  it.each(rateLimitStores())(
    "preserves the 300-request budget and health bypass ($name)",
    async ({ create }) => {
      const app = createApp({
        applicationRateLimit: createApiRateLimit(create("baseline")),
      });
      for (let i = 0; i < 300; i++)
        expect((await request(app).get(`${API_PREFIX}/missing`)).status).toBe(404);
      const response = await request(app).get(`${API_PREFIX}/missing`);
      expect(response.status).toBe(429);
      expect(response.body).toEqual({
        status: "error",
        statusCode: 429,
        message: "Too many requests, please try again later.",
      });
      expect(response.headers["ratelimit-limit"]).toBe("300");
      expect(response.headers["retry-after"]).toBeDefined();
      expect((await request(app).get(`${API_PREFIX}/health`)).status).toBe(200);
      expect((await request(app).get(`${API_PREFIX}/health/ready`)).status).toBe(503);
    },
  );
});
