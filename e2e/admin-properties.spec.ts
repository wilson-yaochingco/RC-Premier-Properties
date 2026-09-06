import { expect, test, type Page, type Route } from "@playwright/test";
import {
  API_PREFIX,
  AUTH_PERMISSIONS,
  type AdminPropertyDetail,
  type CurrentSessionResponse,
} from "@rc/shared";

const FRONTEND_ORIGIN = "http://127.0.0.1:3100";
const API_ORIGIN = "http://127.0.0.1:5051";
const PROPERTY_ID = "507f1f77bcf86cd799439011";
const CSRF_TOKEN = "fixture-session-bound-csrf-token";

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
  idleExpiresAt: "2026-09-06T09:00:00.000Z",
  absoluteExpiresAt: "2026-09-06T16:00:00.000Z",
};

const DRAFT: AdminPropertyDetail = {
  id: PROPERTY_ID,
  propertyId: "RCPP-E2E-DRAFT",
  slug: "e2e-private-draft",
  title: "E2E private draft",
  purpose: "sale",
  propertyType: "house-and-lot",
  availability: "available",
  publicationStatus: "draft",
  featured: false,
  price: { amount: 7_500_000, currency: "PHP", negotiable: false },
  location: {
    province: "Pampanga",
    city: "Angeles City",
    publicPrecision: "city-only",
  },
  specifications: { bedrooms: 3, bathrooms: 2 },
  shortDescription: "A private browser-test draft.",
  description: "This synthetic draft exists only in the browser test boundary.",
  highlights: [],
  amenities: [],
  features: [],
  createdAt: "2026-09-06T08:00:00.000Z",
  updatedAt: "2026-09-06T08:00:00.000Z",
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

async function mockSession(page: Page, status = 200) {
  await page.route(`**${API_PREFIX}/auth/session`, (route) =>
    json(
      route,
      status,
      status === 200
        ? SESSION
        : { status: "error", statusCode: status, message: "Authentication required." },
    ),
  );
}

test("the protected admin property flow lists, creates, and edits a draft", async ({
  page,
}) => {
  await mockSession(page);
  let property = structuredClone(DRAFT);
  let createRequest: Record<string, unknown> | undefined;
  let editRequest: Record<string, unknown> | undefined;
  const writeCsrfHeaders: string[] = [];

  await page.route(`**${API_PREFIX}/admin/properties**`, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    const path = new URL(request.url()).pathname;
    writeCsrfHeaders.push(
      ...(request.method() === "POST" || request.method() === "PATCH"
        ? [request.headers()["x-csrf-token"] ?? ""]
        : []),
    );
    if (request.method() === "GET" && path.endsWith("/admin/properties")) {
      const {
        description,
        specifications,
        highlights,
        amenities,
        features,
        createdAt,
        publishedAt,
        ...summary
      } = property;
      void description;
      void specifications;
      void highlights;
      void amenities;
      void features;
      void createdAt;
      void publishedAt;
      await json(route, 200, {
        items: [summary],
        pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
      });
      return;
    }
    if (request.method() === "GET") {
      await json(route, 200, property);
      return;
    }
    if (request.method() === "POST") {
      createRequest = request.postDataJSON() as Record<string, unknown>;
      property = {
        ...property,
        ...createRequest,
        price: {
          ...(createRequest.price as AdminPropertyDetail["price"]),
          currency: "PHP",
        },
        id: PROPERTY_ID,
        availability: "available",
        publicationStatus: "draft",
      } as AdminPropertyDetail;
      await json(route, 201, property);
      return;
    }
    editRequest = request.postDataJSON() as Record<string, unknown>;
    property = {
      ...property,
      ...editRequest,
      updatedAt: "2026-09-06T08:05:00.000Z",
    };
    await json(route, 200, property);
  });

  await page.goto("/admin/properties");
  await expect(page.getByRole("heading", { name: "Draft properties" })).toBeVisible();
  await expect(
    page.locator("td strong").filter({ hasText: "E2E private draft" }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex.*nofollow/,
  );

  await page.getByRole("link", { name: "Create draft", exact: true }).last().click();
  await page.getByLabel("Property ID").fill("RCPP-E2E-NEW");
  await page.getByLabel("URL slug").fill("e2e-new-draft");
  await page.getByLabel("Title").fill("E2E new draft");
  await page.getByLabel("Price (PHP)").fill("8250000");
  await page
    .getByLabel("Short description")
    .fill("A newly created browser-test draft.");
  await page
    .getByLabel("Full description")
    .fill("This private draft was created through the intercepted browser-test API.");
  await page.getByRole("button", { name: "Create private draft" }).click();
  await expect(page.getByText("Draft property created.")).toBeVisible();
  expect(createRequest).not.toHaveProperty("publicationStatus");
  expect(createRequest).not.toHaveProperty("availability");

  await page.getByRole("link", { name: "Edit the new draft" }).click();
  await expect(page.getByRole("heading", { name: "Edit draft content" })).toBeVisible();
  await page.getByLabel("Title").fill("E2E edited draft");
  await page.getByRole("button", { name: "Save draft content" }).click();
  await expect(page.getByText("Draft changes saved.")).toBeVisible();
  expect(editRequest).toEqual({ title: "E2E edited draft" });
  expect(writeCsrfHeaders).toEqual([CSRF_TOKEN, CSRF_TOKEN]);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test("the admin shell exposes sign-in, forbidden, and expired-session states", async ({
  page,
}) => {
  await mockSession(page, 401);
  await page.goto("/admin/properties");
  const signIn = page.getByRole("link", { name: "Sign in with Auth0" });
  await expect(signIn).toBeVisible();
  const href = new URL((await signIn.getAttribute("href")) ?? "");
  expect(href.origin).toBe(API_ORIGIN);
  expect(href.pathname).toBe(`${API_PREFIX}/auth/login`);
  expect(href.searchParams.get("returnTo")).toBe(`${FRONTEND_ORIGIN}/admin`);

  await page.unroute(`**${API_PREFIX}/auth/session`);
  await mockSession(page);
  await page.route(`**${API_PREFIX}/admin/properties**`, (route) =>
    json(route, 403, {
      status: "error",
      statusCode: 403,
      message: "Permission denied.",
    }),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Permission required" }),
  ).toBeVisible();

  await page.unroute(`**${API_PREFIX}/admin/properties**`);
  await page.route(`**${API_PREFIX}/admin/properties**`, (route) =>
    json(route, 401, {
      status: "error",
      statusCode: 401,
      message: "Authentication required.",
    }),
  );
  await page.reload();
  await expect(page.getByText(/staff session has expired/i)).toBeVisible();
});
