import { expect, test, type Page, type Route } from "@playwright/test";
import {
  API_PREFIX,
  AUTH_PERMISSIONS,
  type AdminInquiryDetail,
  type CurrentSessionResponse,
} from "@rc/shared";

const FRONTEND_ORIGIN = "http://127.0.0.1:3100";
const INQUIRY_ID = "507f191e810c19729de860ea";
const CSRF_TOKEN = "fixture-inquiry-csrf-token";

const SESSION: CurrentSessionResponse = {
  authenticated: true,
  staff: {
    id: "fixture-admin",
    displayName: "RC Test Administrator",
    email: "admin@example.test",
    role: "admin",
  },
  permissions: [...AUTH_PERMISSIONS],
  csrfToken: CSRF_TOKEN,
  idleExpiresAt: "2026-09-07T09:00:00.000Z",
  absoluteExpiresAt: "2026-09-07T16:00:00.000Z",
};

const INQUIRY: AdminInquiryDetail = {
  id: INQUIRY_ID,
  name: "Maria Browser Fixture",
  email: "maria@example.test",
  phone: "+63 917 555 0101",
  inquiryType: "viewing",
  source: "viewing-page",
  propertyId: "RCPP-E2E-DRAFT",
  subject: "Viewing follow-up",
  message: "This is a synthetic private inquiry used only by browser tests.",
  privacyConsentAt: "2026-09-07T08:00:00.000Z",
  status: "new",
  viewingRequest: {
    status: "requested",
    requestedDate: "2030-09-20",
    requestedTime: "10:30",
    statusHistory: [
      {
        toStatus: "requested",
        requestedDate: "2030-09-20",
        requestedTime: "10:30",
        changedAt: "2026-09-07T08:00:00.000Z",
      },
    ],
  },
  statusHistory: [{ toStatus: "new", changedAt: "2026-09-07T08:00:00.000Z" }],
  internalNotes: [],
  version: 0,
  createdAt: "2026-09-07T08:00:00.000Z",
  updatedAt: "2026-09-07T08:00:00.000Z",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers": "Content-Type, X-CSRF-Token",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

async function json(route: Route, status: number, body: unknown) {
  await route.fulfill({ status, json: body, headers: corsHeaders });
}

async function mockSession(page: Page) {
  await page.route(`**${API_PREFIX}/auth/session`, (route) =>
    json(route, 200, SESSION),
  );
}

test("staff can operate the inquiry queue without exposing session data", async ({
  page,
}) => {
  await mockSession(page);
  let inquiry = structuredClone(INQUIRY);
  let preSpamStatus: Exclude<AdminInquiryDetail["status"], "spam"> = "new";
  const actions: string[] = [];
  const csrfHeaders: string[] = [];

  await page.route(`**${API_PREFIX}/admin/inquiries**`, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    const path = new URL(request.url()).pathname;
    if (request.method() === "GET" && path.endsWith("/admin/inquiries")) {
      const {
        phone,
        message,
        privacyConsentAt,
        internalNotes,
        statusHistory,
        ...summary
      } = inquiry;
      void phone;
      void message;
      void privacyConsentAt;
      void internalNotes;
      void statusHistory;
      await json(route, 200, {
        items: [summary],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
      return;
    }
    if (request.method() === "GET") {
      await json(route, 200, inquiry);
      return;
    }

    csrfHeaders.push(request.headers()["x-csrf-token"] ?? "");
    const body = request.postDataJSON() as {
      expectedVersion: number;
      status?: string;
      note?: string;
      requestedDate?: string;
      requestedTime?: string;
    };
    expect(body.expectedVersion).toBe(inquiry.version);
    const previousStatus = inquiry.status;
    if (
      path.endsWith("/viewing") &&
      body.status === "confirmed" &&
      body.requestedDate &&
      body.requestedTime &&
      inquiry.viewingRequest
    ) {
      actions.push("viewing");
      inquiry.viewingRequest.statusHistory.push({
        fromStatus: inquiry.viewingRequest.status,
        toStatus: "confirmed",
        requestedDate: body.requestedDate,
        requestedTime: body.requestedTime,
        changedAt: "2026-09-07T08:04:00.000Z",
      });
      inquiry.viewingRequest.status = "confirmed";
      inquiry.status = "viewing-scheduled";
    } else if (path.endsWith("/status") && body.status) {
      actions.push("status");
      inquiry.status = body.status as AdminInquiryDetail["status"];
      inquiry.statusHistory.push({
        fromStatus: previousStatus,
        toStatus: body.status as AdminInquiryDetail["status"],
        changedAt: "2026-09-07T08:05:00.000Z",
      });
    } else if (path.endsWith("/notes") && body.note) {
      actions.push("note");
      inquiry.internalNotes.push({
        id: "507f191e810c19729de860eb",
        note: body.note,
        createdAt: "2026-09-07T08:06:00.000Z",
      });
    } else if (path.endsWith("/not-spam")) {
      actions.push("not-spam");
      inquiry.status = preSpamStatus;
      inquiry.statusHistory.push({
        fromStatus: "spam",
        toStatus: preSpamStatus,
        changedAt: "2026-09-07T08:08:00.000Z",
      });
    } else if (path.endsWith("/spam")) {
      actions.push("spam");
      if (inquiry.status !== "spam") preSpamStatus = inquiry.status;
      inquiry.status = "spam";
      inquiry.statusHistory.push({
        fromStatus: previousStatus,
        toStatus: "spam",
        changedAt: "2026-09-07T08:07:00.000Z",
      });
    }
    inquiry.version += 1;
    inquiry.updatedAt = "2026-09-07T08:08:00.000Z";
    await json(route, 200, inquiry);
  });

  await page.goto("/admin/viewings");
  await expect(page.getByRole("heading", { name: "Viewing requests" })).toBeVisible();
  await expect(page.getByText("Premier Property #RCPP-E2E-DRAFT")).toBeVisible();
  await page.getByRole("link", { name: "View details" }).click();
  await expect(
    page.getByText("This is a synthetic private inquiry used only by browser tests."),
  ).toBeVisible();

  await expect(page.getByText(/Sep 20, 2030.*Philippine time/).first()).toBeVisible();
  await page.getByLabel("Viewing status").selectOption("confirmed");
  await page.getByRole("button", { name: "Update viewing request" }).click();
  await expect(page.getByText("Viewing request changed to Confirmed.")).toBeVisible();
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Cancel this viewing request");
    await dialog.dismiss();
  });
  await page.getByLabel("Viewing status").selectOption("canceled");
  await page.getByRole("button", { name: "Update viewing request" }).click();
  expect(actions).toEqual(["viewing"]);

  await page.getByLabel("Status", { exact: true }).selectOption("in-progress");
  await page.getByRole("button", { name: "Update status" }).click();
  await expect(page.getByText("Status changed to In progress.")).toBeVisible();
  await page.getByLabel("Add a follow-up note").fill("Called the synthetic lead.");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText("Called the synthetic lead.")).toBeVisible();
  await page.getByRole("button", { name: "Mark spam" }).click();
  await expect(page.getByText("Inquiry moved to spam quarantine.")).toBeVisible();
  await page.getByRole("button", { name: "Mark not spam" }).click();
  await expect(
    page.getByText("Legitimate inquiry restored to its previous status."),
  ).toBeVisible();

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("remain recoverable");
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: "Archive inquiry" }).click();

  expect(actions).toEqual(["viewing", "status", "note", "spam", "not-spam"]);
  expect(csrfHeaders).toEqual(Array(5).fill(CSRF_TOKEN));
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
});
