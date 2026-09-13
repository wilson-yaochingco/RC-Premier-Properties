import { API_PREFIX } from "@rc/shared";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

describe("deployment health checks", () => {
  it("separates process liveness from database-backed readiness", async () => {
    const disconnected = createApp({
      health: {
        databaseStatus: () => ({ status: "disconnected", readyState: 0 }),
      },
    });

    const liveness = await request(disconnected).get(`${API_PREFIX}/health`);
    const readiness = await request(disconnected).get(`${API_PREFIX}/health/ready`);

    expect(liveness.status).toBe(200);
    expect(liveness.body).toMatchObject({
      status: "ok",
      database: { status: "disconnected", readyState: 0 },
    });
    expect(readiness.status).toBe(503);
    expect(readiness.body).toMatchObject({
      status: "not-ready",
      database: { status: "disconnected", readyState: 0 },
    });
    expect(liveness.headers["cache-control"]).toBe("no-store");
    expect(readiness.headers["cache-control"]).toBe("no-store");
    expect(JSON.stringify(readiness.body)).not.toContain("mongodb://");
  });

  it("reports ready only for an active MongoDB connection", async () => {
    const app = createApp({
      health: {
        databaseStatus: () => ({ status: "connected", readyState: 1 }),
      },
    });

    const response = await request(app).get(`${API_PREFIX}/health/ready`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ready");
  });
});
