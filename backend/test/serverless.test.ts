import express from "express";
import { createServer, type Server } from "node:http";
import { API_PREFIX } from "@rc/shared";
import mongoose from "mongoose";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { attachDatabasePool } from "@vercel/functions";
import { createApp } from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import type { PropertyService } from "../src/modules/properties/property.types.js";

vi.mock("@vercel/functions", () => ({ attachDatabasePool: vi.fn() }));
vi.mock("../src/config/database.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/config/database.js")>()),
  connectDatabase: vi.fn(),
}));
vi.mock("../src/app.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/app.js")>()),
  createApp: vi.fn(),
}));

describe("serverless API entry", () => {
  let realCreateApp: typeof createApp;
  const servers: Server[] = [];
  const search = vi.fn<PropertyService["search"]>();
  const client = {} as ReturnType<typeof mongoose.connection.getClient>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    ({ createApp: realCreateApp } =
      await vi.importActual<typeof import("../src/app.js")>("../src/app.js"));
    vi.mocked(connectDatabase).mockResolvedValue();
    vi.spyOn(mongoose.connection, "getClient").mockReturnValue(client);
    search.mockImplementation(async (filters) => ({
      items: [],
      pagination: { page: filters.page, limit: filters.limit, total: 0, totalPages: 0 },
      appliedFilters: filters,
      sort: filters.sort,
    }));
    vi.mocked(createApp).mockImplementation((dependencies = {}) =>
      realCreateApp({
        health: { databaseStatus: () => ({ status: "disconnected", readyState: 0 }) },
        propertyService: {
          search,
          map: vi.fn(),
          findPublishedBySlug: vi.fn(),
          related: vi.fn(),
          getFacets: vi.fn(),
        },
        applicationRateLimit: (_req, _res, next) => next(),
        ...dependencies,
      }),
    );
  });

  afterEach(() => {
    for (const server of servers.splice(0)) server.closeAllConnections();
    vi.restoreAllMocks();
  });

  async function server() {
    const { handleApiRequest } = await import("../src/serverless.js");
    const result = createServer(handleApiRequest);
    servers.push(result);
    return result;
  }

  it("shares one pending connection and one app across concurrent and warm requests", async () => {
    let connected!: () => void;
    vi.mocked(connectDatabase).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          connected = resolve;
        }),
    );
    const api = await server();
    const requests = Promise.all(
      [1, 2, 3].map(() => request(api).get(`${API_PREFIX}/properties`)),
    );
    await vi.waitFor(() => expect(connectDatabase).toHaveBeenCalledOnce());
    expect(attachDatabasePool).not.toHaveBeenCalled();
    connected();
    expect((await requests).map((response) => response.status)).toEqual([
      200, 200, 200,
    ]);
    expect((await request(api).get(`${API_PREFIX}/properties`)).status).toBe(200);
    expect(createApp).toHaveBeenCalledExactlyOnceWith();
    expect(connectDatabase).toHaveBeenCalledOnce();
    expect(attachDatabasePool).toHaveBeenCalledExactlyOnceWith(client);
  });

  it("returns the existing 503 envelope and retries after a failed connection", async () => {
    vi.mocked(connectDatabase).mockRejectedValueOnce(new Error("private database URI"));
    const api = await server();
    const response = await request(api)
      .get(`${API_PREFIX}/properties`)
      .set("Origin", "http://localhost:3000");
    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: "error",
      statusCode: 503,
      message: "Database service is unavailable.",
    });
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-request-id"]).toBeDefined();
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000",
    );
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
    expect(search).not.toHaveBeenCalled();
    expect(attachDatabasePool).not.toHaveBeenCalled();
    vi.mocked(connectDatabase).mockRejectedValueOnce(new Error("still unavailable"));
    const preflight = await request(api)
      .options(`${API_PREFIX}/properties`)
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "GET");
    const normalPreflight = await request(realCreateApp())
      .options(`${API_PREFIX}/properties`)
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "GET");
    expect(preflight.status).toBe(204);
    expect(preflight.status).toBe(normalPreflight.status);
    expect(preflight.text).toBe(normalPreflight.text);
    for (const header of [
      "access-control-allow-origin",
      "access-control-allow-credentials",
      "access-control-allow-methods",
      "vary",
      "x-content-type-options",
    ]) {
      expect(preflight.headers[header]).toBe(normalPreflight.headers[header]);
    }
    expect((await request(api).get(`${API_PREFIX}/properties`)).status).toBe(200);
    expect(connectDatabase).toHaveBeenCalledTimes(3);
    expect(attachDatabasePool).toHaveBeenCalledOnce();
  });

  it("serves liveness and readiness without connecting, including during a pending connection", async () => {
    let connected!: () => void;
    vi.mocked(connectDatabase).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          connected = resolve;
        }),
    );
    const api = await server();
    expect((await request(api).get(`${API_PREFIX}/health?probe=1`)).status).toBe(200);
    expect((await request(api).get(`${API_PREFIX}/health/ready/`)).status).toBe(503);
    expect(connectDatabase).not.toHaveBeenCalled();
    const pending = request(api)
      .get(`${API_PREFIX}/properties`)
      .then((response) => response);
    await vi.waitFor(() => expect(connectDatabase).toHaveBeenCalledOnce());
    const live = await request(api).get(`${API_PREFIX}/health`);
    const ready = await request(api).get(`${API_PREFIX}/health/ready`);
    expect(live.body.status).toBe("ok");
    expect(ready.body.status).toBe("not-ready");
    expect(attachDatabasePool).not.toHaveBeenCalled();
    connected();
    expect((await pending).status).toBe(200);
  });

  it("keeps the handler pending until an asynchronous response closes", async () => {
    let send!: () => void;
    vi.mocked(createApp).mockImplementation(() => {
      const app = express();
      app.get("/delayed", (_req, res) => {
        send = () => res.status(204).end();
      });
      return app;
    });
    const { handleApiRequest } = await import("../src/serverless.js");
    let completed = false;
    const api = createServer((req, res) => {
      void handleApiRequest(req, res).then(() => {
        completed = true;
      });
    });
    servers.push(api);
    const pending = request(api)
      .get("/delayed")
      .then((response) => response);
    await vi.waitFor(() => expect(send).toBeTypeOf("function"));
    expect(completed).toBe(false);
    send();
    expect((await pending).status).toBe(204);
    await vi.waitFor(() => expect(completed).toBe(true));
  });

  it("removes Next own helpers so Express parses queries, bodies and error envelopes", async () => {
    const { handleApiRequest } = await import("../src/serverless.js");
    const completed: Promise<void>[] = [];
    const observations: {
      req: import("node:http").IncomingMessage;
      res: import("node:http").ServerResponse;
    }[] = [];
    const api = createServer((req, res) => {
      for (const key of ["query", "cookies", "previewData", "preview", "draftMode"]) {
        Object.defineProperty(req, key, {
          configurable: true,
          get: () => ({ path: ["properties"], unexpected: true }),
        });
      }
      for (const key of [
        "status",
        "send",
        "json",
        "redirect",
        "setDraftMode",
        "setPreviewData",
        "clearPreviewData",
        "revalidate",
      ]) {
        Object.defineProperty(res, key, {
          configurable: true,
          value: () => {
            throw new Error(`Next helper ${key} survived`);
          },
        });
      }
      completed.push(handleApiRequest(req, res));
      observations.push({ req, res });
    });
    servers.push(api);
    const response = await request(api).get(`${API_PREFIX}/properties?page=2&limit=6`);
    expect(response.status).toBe(200);
    expect(search).toHaveBeenCalledWith(expect.objectContaining({ page: 2, limit: 6 }));
    const invalid = await request(api).get(`${API_PREFIX}/properties?unexpected=true`);
    expect(invalid.status).toBe(400);
    expect(invalid.body).toMatchObject({ status: "error", statusCode: 400 });
    const malformed = await request(api)
      .post(`${API_PREFIX}/inquiries`)
      .set("Content-Type", "application/json")
      .send("{");
    expect(malformed.status).toBe(400);
    expect(malformed.body.message).toBe("Malformed JSON request body.");
    const missing = await request(api).get(`${API_PREFIX}/missing`);
    expect(missing.status).toBe(404);
    expect(missing.body).toMatchObject({ status: "error", statusCode: 404 });
    await Promise.all(completed);
    for (const { req, res } of observations) {
      expect(res.writableFinished).toBe(true);
      for (const key of ["query", "cookies", "previewData", "preview", "draftMode"])
        expect(Object.hasOwn(req, key)).toBe(false);
      for (const key of [
        "status",
        "send",
        "json",
        "redirect",
        "setDraftMode",
        "setPreviewData",
        "clearPreviewData",
        "revalidate",
      ])
        expect(Object.hasOwn(res, key)).toBe(false);
    }
  });
});
