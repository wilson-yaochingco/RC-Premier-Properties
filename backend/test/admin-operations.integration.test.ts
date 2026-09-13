import express from "express";
import { API_PREFIX, type AuthPermission } from "@rc/shared";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { errorHandler, HttpError } from "../src/middleware/errorHandler.js";
import { requestContext } from "../src/middleware/requestContext.js";
import { createAuthCookieSettings } from "../src/modules/auth/auth.cookies.js";
import type { AuthService } from "../src/modules/auth/auth.service.js";
import type { AuthenticatedContext } from "../src/modules/auth/auth.types.js";
import { createAdminOperationsRoutes } from "../src/modules/operations/admin-operations.routes.js";
import type { AdminOperationsService } from "../src/modules/operations/admin-operations.types.js";

const cookies = createAuthCookieSettings(false, 60_000, 60_000);
const context = {
  staff: { id: "507f191e810c19729de86001" },
  session: { id: "session-test" },
  permissions: [],
  csrfToken: "not-used-by-read-routes",
} as unknown as AuthenticatedContext;

function service() {
  const operations: AdminOperationsService = {
    dashboard: vi.fn().mockResolvedValue({
      properties: {
        published: 0,
        draft: 0,
        unpublished: 0,
        available: 0,
        reserved: 0,
        sold: 0,
      },
      inquiries: { active: 0, new: 0 },
      notifications: { retryPending: 0, terminalFailure: 0 },
      upcomingViewings: [],
      upcomingViewingCount: 0,
      mediaCleanupDebtCount: 0,
      generatedAt: "2026-09-10T00:00:00.000Z",
    }),
    viewingCalendar: vi.fn().mockResolvedValue({
      items: [],
      start: "2026-09-01",
      end: "2026-09-30",
      pagination: { page: 1, limit: 200, total: 0, totalPages: 0 },
      truncated: false,
    }),
    auditEvents: vi.fn().mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
    }),
    staff: vi.fn().mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
    }),
  };
  return operations;
}

function auth(permissions: readonly AuthPermission[]) {
  return {
    authenticate: vi.fn(async (token?: string) => {
      if (token !== "valid-session")
        throw new HttpError(401, "Authentication required.");
      return context;
    }),
    authorize: vi.fn(async (_context, permission: AuthPermission) => {
      if (!permissions.includes(permission)) {
        throw new HttpError(403, "Permission denied.");
      }
    }),
  } as unknown as AuthService;
}

function app(
  authService: AuthService | null,
  operations: AdminOperationsService = service(),
) {
  const application = express();
  application.use(requestContext);
  application.use(
    `${API_PREFIX}/admin/operations`,
    createAdminOperationsRoutes({
      service: operations,
      auth: {
        service: authService,
        ...(authService ? { cookies } : {}),
        loginRateLimit: (_request, _response, next) => next(),
        callbackFailureRateLimit: (_request, _response, next) => next(),
      },
    }),
  );
  application.use(errorHandler);
  return application;
}

describe("admin operations HTTP security boundary", () => {
  it("fails closed when authentication is unavailable or absent", async () => {
    const unavailable = await request(app(null)).get(
      `${API_PREFIX}/admin/operations/dashboard`,
    );
    const anonymous = await request(app(auth([]))).get(
      `${API_PREFIX}/admin/operations/dashboard`,
    );

    expect(unavailable.status).toBe(503);
    expect(anonymous.status).toBe(401);
    expect(unavailable.body).toMatchObject({ status: "error", statusCode: 503 });
    expect(anonymous.body).toMatchObject({ status: "error", statusCode: 401 });
  });

  it("requires both dashboard permissions and each route's named permission", async () => {
    const dashboardService = service();
    const dashboard = await request(
      app(auth(["property:read-private"]), dashboardService),
    )
      .get(`${API_PREFIX}/admin/operations/dashboard`)
      .set("Cookie", `${cookies.sessionName}=valid-session`);
    const audit = await request(app(auth(["inquiry:read"])))
      .get(`${API_PREFIX}/admin/operations/audit-events`)
      .set("Cookie", `${cookies.sessionName}=valid-session`);
    const staff = await request(app(auth(["audit:read"])))
      .get(`${API_PREFIX}/admin/operations/staff`)
      .set("Cookie", `${cookies.sessionName}=valid-session`);

    expect([dashboard.status, audit.status, staff.status]).toEqual([403, 403, 403]);
    expect(dashboardService.dashboard).not.toHaveBeenCalled();
  });

  it("returns private headers and rejects malformed queries before service work", async () => {
    const operations = service();
    const authService = auth([
      "property:read-private",
      "inquiry:read",
      "audit:read",
      "staff:manage",
    ]);
    const application = app(authService, operations);
    const dashboard = await request(application)
      .get(`${API_PREFIX}/admin/operations/dashboard`)
      .set("Cookie", `${cookies.sessionName}=valid-session`);
    const calendar = await request(application)
      .get(`${API_PREFIX}/admin/operations/viewings/calendar`)
      .query({ start: "2026-09-01", end: "2026-09-30" })
      .set("Cookie", `${cookies.sessionName}=valid-session`);

    expect(dashboard.status).toBe(200);
    expect(calendar.status).toBe(200);
    for (const response of [dashboard, calendar]) {
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.headers["x-robots-tag"]).toBe("noindex, nofollow");
    }

    const invalidDashboards = await Promise.all(
      ["?unknown=value", "?unknown=one&unknown=two", "?unknown%5B%24ne%5D=value"].map(
        (query) =>
          request(application)
            .get(`${API_PREFIX}/admin/operations/dashboard${query}`)
            .set("Cookie", `${cookies.sessionName}=valid-session`),
      ),
    );
    const repeatedCalendar = await request(application)
      .get(
        `${API_PREFIX}/admin/operations/viewings/calendar?start=2026-09-01&start=2026-09-02&end=2026-09-30`,
      )
      .set("Cookie", `${cookies.sessionName}=valid-session`);
    const invalidAudit = await request(application)
      .get(`${API_PREFIX}/admin/operations/audit-events?actorStaffIdentityId=invalid`)
      .set("Cookie", `${cookies.sessionName}=valid-session`);

    expect(invalidDashboards.map((response) => response.status)).toEqual([
      400, 400, 400,
    ]);
    expect([repeatedCalendar.status, invalidAudit.status]).toEqual([400, 400]);
    expect(operations.dashboard).toHaveBeenCalledOnce();
    expect(operations.viewingCalendar).toHaveBeenCalledOnce();
    expect(operations.auditEvents).not.toHaveBeenCalled();
  });
});
