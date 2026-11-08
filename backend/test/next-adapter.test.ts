import { createServer } from "node:http";
import type { NextApiRequest, NextApiResponse } from "next";
import { API_PREFIX } from "@rc/shared";
import request from "supertest";
import { afterEach, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import type { PropertyService } from "../src/modules/properties/property.types.js";
import {
  createAuthCookieSettings,
  setSessionCookie,
  setTransactionCookie,
} from "../src/modules/auth/auth.cookies.js";
import handler, { config } from "../../frontend/src/pages/api/v1/[...path]";

vi.mock("../src/config/database.js", async (original) => ({
  ...(await original<typeof import("../src/config/database.js")>()),
  connectDatabase: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@vercel/functions", () => ({ attachDatabasePool: vi.fn() }));
vi.mock("rc-premier-backend/serverless", () => import("../src/serverless.js"));
vi.mock("../src/app.js", async (original) => ({
  ...(await original<typeof import("../src/app.js")>()),
  createApp: vi.fn(),
}));

afterEach(() => vi.restoreAllMocks());

it("preserves Express queries, JSON, raw bodies, envelopes and secure host cookies through the Next adapter", async () => {
  const { createApp: realCreateApp } =
    await vi.importActual<typeof import("../src/app.js")>("../src/app.js");
  const search = vi.fn<PropertyService["search"]>(async (query) => ({
    items: [],
    appliedFilters: query,
    sort: query.sort,
    pagination: { page: query.page, limit: query.limit, total: 0, totalPages: 0 },
  }));
  vi.mocked(createApp).mockImplementation(() =>
    realCreateApp({
      applicationRateLimit: (_req, res, next) => {
        const cookies = createAuthCookieSettings(true, 60_000, 60_000);
        setSessionCookie(res, cookies, "test-session");
        setTransactionCookie(res, cookies, "test-transaction");
        next();
      },
      propertyService: {
        search,
        map: vi.fn(),
        findPublishedBySlug: vi.fn(),
        related: vi.fn(),
        getFacets: vi.fn(),
      },
    }),
  );
  expect(config.api).toEqual({
    bodyParser: false,
    externalResolver: true,
    responseLimit: false,
  });
  const server = createServer((incoming, outgoing) => {
    const req = incoming as NextApiRequest;
    const res = outgoing as NextApiResponse;
    Object.defineProperty(req, "query", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: { path: ["properties"], page: "2" },
    });
    for (const key of ["cookies", "previewData", "preview", "draftMode"]) {
      Object.defineProperty(req, key, { configurable: true, get: () => ({}) });
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
        writable: true,
        value: () => {
          throw new Error(`Shadowed ${key}`);
        },
      });
    }
    void handler(req, res).catch((error) => res.destroy(error));
  });
  try {
    const response = await request(server).get(`${API_PREFIX}/properties?page=2`);
    expect(response.status).toBe(200);
    expect(search).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
    expect(search.mock.calls[0][0]).not.toHaveProperty("path");
    expect(response.body.items).toEqual([]);
    const cookies = response.headers["set-cookie"] as unknown as string[];
    expect(cookies).toHaveLength(2);
    for (const cookie of cookies) {
      expect(cookie).toMatch(/^__Host-rc_(session|oidc_transaction)=/);
      for (const flag of ["Path=/", "HttpOnly", "Secure", "SameSite=Lax"])
        expect(cookie).toContain(flag);
      expect(cookie).not.toMatch(/Domain=/i);
    }
    const malformed = await request(server)
      .post(`${API_PREFIX}/inquiries`)
      .set("Content-Type", "application/json")
      .send("{");
    expect(malformed.status).toBe(400);
    expect(malformed.body).toEqual({
      status: "error",
      statusCode: 400,
      message: "Malformed JSON request body.",
    });
    const missing = await request(server).get(`${API_PREFIX}/x`);
    expect(missing.status).toBe(404);
    expect(missing.body).toMatchObject({ status: "error", statusCode: 404 });
  } finally {
    server.closeAllConnections();
    server.close();
  }
});
