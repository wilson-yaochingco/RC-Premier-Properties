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
  publicationReadiness: { ready: true, missing: [] },
  version: 0,
  description: "This synthetic draft exists only in the browser test boundary.",
  highlights: [],
  amenities: [],
  features: [],
  gallery: [],
  createdAt: "2026-09-06T08:00:00.000Z",
  updatedAt: "2026-09-06T08:00:00.000Z",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers": "Content-Type, X-CSRF-Token",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
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
  await page.route("**/_next/image?*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  await mockSession(page);
  let property = structuredClone(DRAFT);
  let createRequest: Record<string, unknown> | undefined;
  let editRequest: Record<string, unknown> | undefined;
  let mediaRequest: Record<string, unknown> | undefined;
  let uploadRequest:
    | { alt: string | null; contentType: string | undefined; byteLength: number }
    | undefined;
  const writeCsrfHeaders: string[] = [];

  await page.route(`**${API_PREFIX}/admin/properties**`, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    const path = new URL(request.url()).pathname;
    writeCsrfHeaders.push(
      ...(request.method() === "POST" ||
      request.method() === "PUT" ||
      request.method() === "PATCH"
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
        coverMedia,
        gallery,
        createdAt,
        publishedAt,
        ...summary
      } = property;
      void description;
      void specifications;
      void highlights;
      void amenities;
      void features;
      void coverMedia;
      void gallery;
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
    if (request.method() === "POST" && path.endsWith("/media/uploads")) {
      const requestUrl = new URL(request.url());
      const uploaded: AdminPropertyDetail["gallery"][number] = {
        id: "media-server-uploaded",
        kind: "image",
        url: "/media/properties/server-uploaded.webp",
        alt: requestUrl.searchParams.get("alt") ?? "",
        source: "production",
        focalPoint: { x: 50, y: 50 },
      };
      uploadRequest = {
        alt: requestUrl.searchParams.get("alt"),
        contentType: request.headers()["content-type"],
        byteLength: request.postDataBuffer()?.byteLength ?? 0,
      };
      property = {
        ...property,
        gallery: [...property.gallery, uploaded],
        coverMedia: property.coverMedia ?? uploaded,
        version: property.version + 1,
      };
      await json(route, 201, property);
      return;
    }
    if (request.method() === "POST" && path.endsWith("/admin/properties")) {
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
    if (request.method() === "POST" && path.endsWith("/publish")) {
      property = {
        ...property,
        publicationStatus: "published",
        publishedAt: "2026-09-06T08:10:00.000Z",
        version: property.version + 1,
      };
      await json(route, 200, property);
      return;
    }
    if (request.method() === "PUT" && path.endsWith("/media")) {
      mediaRequest = request.postDataJSON() as Record<string, unknown>;
      const gallery = mediaRequest.media as AdminPropertyDetail["gallery"];
      const coverMedia = gallery.find((item) => item.id === mediaRequest?.coverMediaId);
      property = {
        ...property,
        gallery,
        ...(coverMedia ? { coverMedia } : { coverMedia: undefined }),
        version: property.version + 1,
        updatedAt: "2026-09-06T08:07:00.000Z",
      };
      await json(route, 200, property);
      return;
    }
    editRequest = request.postDataJSON() as Record<string, unknown>;
    property = {
      ...property,
      ...editRequest,
      version: property.version + 1,
      updatedAt: "2026-09-06T08:05:00.000Z",
    };
    await json(route, 200, property);
  });

  await page.goto("/admin/properties");
  await expect(
    page.getByRole("heading", { name: "Properties", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator("td strong").filter({ hasText: "E2E private draft" }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex.*nofollow/,
  );
  await expect(page.locator("header")).toHaveCount(1);
  await expect(page.getByRole("banner")).toHaveCount(1);
  await expect(page.locator("main#main-content")).toHaveCount(1);
  const adminNavigation = page.getByRole("navigation", {
    name: "Administration navigation",
  });
  for (const [name, href] of [
    ["Dashboard", "/admin"],
    ["Properties", "/admin/properties"],
    ["Inquiries", "/admin/inquiries"],
    ["Viewings", "/admin/viewings"],
    ["Create draft", "/admin/properties/new"],
  ]) {
    await expect(
      adminNavigation.getByRole("link", { name, exact: true }),
    ).toHaveAttribute("href", href);
  }
  await expect(
    adminNavigation.getByRole("link", { name: "View Website" }),
  ).toHaveAttribute("href", "/");
  await expect(
    adminNavigation.getByRole("link", { name: "Properties", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main-content")).toBeFocused();

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
  await expect(
    page.getByRole("heading", { name: "Editing PREMIER PROPERTY #RCPP-E2E-NEW" }),
  ).toBeVisible();
  await expect(page.getByLabel("Property ID")).toHaveAttribute("readonly", "");
  await page.getByLabel("Title").fill("E2E edited draft");
  await page.getByRole("button", { name: "Save property content" }).click();
  await expect(page.getByText("Property changes saved.")).toBeVisible();
  expect(editRequest).toEqual({ title: "E2E edited draft", expectedVersion: 0 });
  await page.getByLabel("Public precision").selectOption("approximate");
  await page.getByLabel("Private address (optional)").fill("99 Synthetic Test Street");
  await page.getByLabel("Private exact latitude (optional)").fill("15.101");
  await page.getByLabel("Private exact longitude (optional)").fill("120.601");
  await page.getByLabel("Approved public latitude (optional)").fill("15.15");
  await page.getByLabel("Approved public longitude (optional)").fill("120.61");
  await page.getByRole("button", { name: "Save property content" }).click();
  await expect(page.getByText("Property changes saved.")).toBeVisible();
  expect(editRequest).toEqual({
    expectedVersion: 1,
    location: {
      province: "Pampanga",
      city: "Angeles City",
      publicPrecision: "approximate",
      privateAddress: "99 Synthetic Test Street",
      coordinates: { latitude: 15.101, longitude: 120.601 },
      publicPoint: { type: "Point", coordinates: [120.61, 15.15] },
    },
  });
  await expect(page.getByText("Add licensed development sample")).toHaveCount(0);
  const fileInput = page.locator('input[type="file"]');
  await fileInput.focus();
  await expect(fileInput.locator("..")).not.toHaveCSS("outline-style", "none");
  await fileInput.setInputFiles({
    name: "portrait-home.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByLabel("Alternative text").fill("Uploaded portrait test home");
  await expect(
    page.getByRole("progressbar", { name: "Upload progress for portrait-home.png" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Upload Photos" }).click();
  await expect(page.getByText("Uploaded", { exact: true })).toBeVisible();
  expect(uploadRequest).toMatchObject({
    alt: "Uploaded portrait test home",
    contentType: "image/png",
  });
  expect(uploadRequest?.byteLength).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Add production image reference" }).click();
  await page
    .getByLabel("Image URL / storage reference")
    .nth(1)
    .fill("https://media.example.test/property-living-room.webp");
  await page
    .getByLabel("Alternative text")
    .last()
    .fill("Living room of the synthetic test property");
  await page.getByRole("radio", { name: "Cover image" }).nth(1).check();
  await page.getByRole("button", { name: "Move image 2 earlier" }).click();
  await expect(page.getByRole("button", { name: "Move image 1 later" })).toBeFocused();
  await expect(page.getByText("Image moved to position 1.")).toBeAttached();
  await page.getByRole("button", { name: "Save property media" }).click();
  await expect(page.getByText("Property media saved.")).toBeVisible();
  expect(mediaRequest?.coverMediaId).toEqual(
    (mediaRequest?.media as Array<{ id: string }>)[0]?.id,
  );
  for (const width of [320, 360, 390, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      })),
    ).toMatchObject({ viewport: width, document: width, body: width });
  }
  await page.getByRole("link", { name: "Preview property" }).last().click();
  await expect(page.getByText("Private property preview")).toBeVisible();
  await expect(page.getByText("Development sample — not this listing")).toHaveCount(0);
  await page.getByRole("link", { name: "Back to properties" }).click();
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText(/was published/i)).toBeVisible();
  expect(writeCsrfHeaders).toEqual([
    CSRF_TOKEN,
    CSRF_TOKEN,
    CSRF_TOKEN,
    CSRF_TOKEN,
    CSRF_TOKEN,
    CSRF_TOKEN,
  ]);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
});

test("admin HTML is private, non-indexable, and protected by browser headers", async ({
  request,
}) => {
  const response = await request.get("/admin");
  const headers = response.headers();

  expect(response.ok()).toBe(true);
  expect(headers["cache-control"]).toContain("no-store");
  expect(headers["x-robots-tag"]).toContain("noindex");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["strict-transport-security"]).toContain("max-age=31536000");
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
