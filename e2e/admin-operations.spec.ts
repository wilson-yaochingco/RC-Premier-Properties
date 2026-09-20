import { expect, test, type Page, type Route } from "@playwright/test";
import {
  API_PREFIX,
  AUTH_PERMISSIONS,
  type AdminAuditListResponse,
  type AdminDashboardResponse,
  type AdminInquiryListResponse,
  type AdminInquirySearchResponse,
  type AdminPropertyListResponse,
  type AdminStaffListResponse,
  type AdminViewingCalendarResponse,
  type CurrentSessionResponse,
} from "@rc/shared";

const FRONTEND_ORIGIN = "http://127.0.0.1:3100";
const INQUIRY_ID = "507f191e810c19729de860ea";
const SESSION: CurrentSessionResponse = {
  authenticated: true,
  staff: {
    id: "fixture-admin",
    displayName: "RC Operations Administrator",
    email: "admin@example.test",
    role: "admin",
  },
  permissions: [...AUTH_PERMISSIONS],
  csrfToken: "fixture-operations-csrf-token",
  idleExpiresAt: "2030-09-10T09:00:00.000Z",
  absoluteExpiresAt: "2030-09-10T16:00:00.000Z",
};

const DASHBOARD: AdminDashboardResponse = {
  properties: {
    published: 4,
    draft: 2,
    unpublished: 1,
    available: 2,
    reserved: 1,
    sold: 1,
  },
  inquiries: { active: 6, new: 3 },
  notifications: { retryPending: 1, terminalFailure: 2 },
  upcomingViewings: [
    {
      inquiryId: INQUIRY_ID,
      propertyId: "RCPP-001",
      status: "confirmed",
      requestedDate: "2026-09-15",
      requestedTime: "10:00",
    },
  ],
  upcomingViewingCount: 1,
  mediaCleanupDebtCount: 2,
  generatedAt: "2026-09-10T01:00:00.000Z",
};

const CALENDAR: AdminViewingCalendarResponse = {
  items: DASHBOARD.upcomingViewings,
  start: "2026-08-30",
  end: "2026-10-10",
  pagination: { page: 1, limit: 200, total: 201, totalPages: 2 },
  truncated: true,
};

const AUDIT: AdminAuditListResponse = {
  items: [
    {
      id: "audit-event-id",
      actorStaffIdentityId: "fixture-admin",
      action: "property.edited",
      entityType: "property",
      entityId: "property-record-id",
      outcome: "succeeded",
      requestId: "safe-request-id",
      occurredAt: "2026-09-10T01:00:00.000Z",
    },
  ],
  pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
};

const STAFF: AdminStaffListResponse = {
  items: [
    {
      id: "fixture-admin",
      displayName: "RC Operations Administrator",
      email: "admin@example.test",
      role: "admin",
      status: "active",
      authorizationVersion: 3,
      lastLoginAt: "2026-09-10T00:30:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-09-10T00:30:00.000Z",
    },
  ],
  pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
};

const PROPERTIES: AdminPropertyListResponse = {
  items: [
    {
      id: "property-record-id",
      propertyId: "RCPP-001",
      slug: "synthetic-property",
      title: "Synthetic Property",
      purpose: "sale",
      propertyType: "house-and-lot",
      availability: "available",
      publicationStatus: "published",
      featured: false,
      price: { amount: 8_500_000, currency: "PHP", negotiable: false },
      location: {
        province: "Pampanga",
        city: "Angeles City",
        publicPrecision: "city-only",
      },
      shortDescription: "A synthetic private test record.",
      publicationReadiness: { ready: true, missing: [] },
      version: 1,
      updatedAt: "2026-09-10T00:00:00.000Z",
    },
  ],
  pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
};

const INQUIRIES: AdminInquiryListResponse = {
  items: [
    {
      id: INQUIRY_ID,
      name: "Sensitive Customer Name",
      email: "customer-private@example.test",
      inquiryType: "viewing",
      source: "viewing-page",
      propertyId: "RCPP-001",
      status: "new",
      notification: { status: "delivered", attempts: 1 },
      version: 0,
      createdAt: "2026-09-10T00:00:00.000Z",
      updatedAt: "2026-09-10T00:00:00.000Z",
    },
  ],
  pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
};

const INQUIRY_SEARCH: AdminInquirySearchResponse = {
  items: [
    {
      id: INQUIRY_ID,
      inquiryType: "viewing",
      status: "new",
      propertyId: "RCPP-001",
    },
  ],
};

const corsHeaders = {
  "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
  "Access-Control-Allow-Credentials": "true",
};

async function json(route: Route, body: unknown) {
  await route.fulfill({ status: 200, json: body, headers: corsHeaders });
}

async function mockOperations(page: Page) {
  await page.route(`**${API_PREFIX}/auth/session`, (route) => json(route, SESSION));
  await page.route(`**${API_PREFIX}/admin/operations/**`, (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.endsWith("/dashboard")) return json(route, DASHBOARD);
    if (path.endsWith("/viewings/calendar")) {
      return json(
        route,
        url.searchParams.get("page") === "2"
          ? {
              ...CALENDAR,
              items: [
                {
                  inquiryId: "507f191e810c19729de860eb",
                  propertyId: "RCPP-002",
                  status: "requested",
                  requestedDate: "2026-09-16",
                  requestedTime: "14:00",
                },
              ],
              pagination: { ...CALENDAR.pagination, page: 2 },
            }
          : CALENDAR,
      );
    }
    if (path.endsWith("/audit-events")) {
      const page = Number(url.searchParams.get("page") ?? "1");
      return json(route, {
        ...AUDIT,
        pagination: { ...AUDIT.pagination, page, total: 26, totalPages: 2 },
      });
    }
    return json(route, STAFF);
  });
  await page.route(`**${API_PREFIX}/admin/properties?*`, (route) =>
    json(route, PROPERTIES),
  );
  await page.route(`**${API_PREFIX}/admin/inquiries**`, (route) =>
    new URL(route.request().url()).pathname.endsWith("/search")
      ? json(route, INQUIRY_SEARCH)
      : json(route, INQUIRIES),
  );
}

async function expectNoDocumentOverflow(page: Page) {
  const layout = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const calendarTable = document.querySelector<HTMLElement>(
      "table[class*='calendarTable']",
    );
    const ancestors: Array<Record<string, string | number>> = [];
    let current = calendarTable;
    while (current && ancestors.length < 7) {
      const style = getComputedStyle(current);
      const rect = current.getBoundingClientRect();
      ancestors.push({
        element: current.tagName.toLowerCase(),
        className: current.className.toString().slice(0, 100),
        width: Math.round(rect.width),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        clientWidth: current.clientWidth,
        scrollWidth: current.scrollWidth,
        overflowX: style.overflowX,
        minWidth: style.minWidth,
      });
      current = current.parentElement;
    }
    const offenders = [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && (rect.left < -1 || rect.right > width + 1);
      })
      .slice(0, 8)
      .map((element) => ({
        element: element.tagName.toLowerCase(),
        className: element.className.toString().slice(0, 100),
        left: Math.round(element.getBoundingClientRect().left),
        right: Math.round(element.getBoundingClientRect().right),
      }));
    return {
      width,
      scrollWidth: document.documentElement.scrollWidth,
      offenders,
      ancestors,
    };
  });
  expect(
    layout.scrollWidth,
    JSON.stringify({ offenders: layout.offenders, ancestors: layout.ancestors }),
  ).toBeLessThanOrEqual(layout.width + 1);
}

async function expectFinalAdminData(page: Page, path: string) {
  await expect(page.locator("main#main-content [aria-busy='true']")).toHaveCount(0);
  if (path === "/admin") {
    await expect(
      page.getByRole("heading", { name: "Upcoming viewings" }),
    ).toBeVisible();
  }
  if (
    [
      "/admin/properties",
      "/admin/inquiries",
      "/admin/viewings",
      "/admin/audit",
      "/admin/staff",
    ].includes(path)
  ) {
    await expect(
      page.locator("table[class*='responsiveTable'] tbody tr").first(),
    ).toBeVisible();
  }
  if (path === "/admin/viewings") {
    await expect(
      page.getByRole("region", { name: "September 2026 viewing calendar" }),
    ).toBeVisible();
  }
}

test("admin surfaces reuse public square corners while functional circles and pills retain their shape", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  await mockOperations(page);
  for (const width of [320, 768, 1366, 1440, 1920]) {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 900 });
    for (const path of [
      "/admin",
      "/admin/properties",
      "/admin/inquiries",
      "/admin/viewings",
      "/admin/search",
      "/admin/audit",
      "/admin/staff",
      "/admin/properties/new",
    ]) {
      await page.goto(path);
      await expect(page.locator("[data-collapsed]")).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectFinalAdminData(page, path);
      const geometry = await page.locator("main#main-content").evaluate((main) => {
        const surfaceClasses = [
          "panel",
          "filters",
          "detailCard",
          "workflowCard",
          "calendarPanel",
          "mediaManager",
          "searchPanel",
          "preview",
          "metricCard",
          "tableWrap",
          "lifecycleNotice",
          "errorSummary",
          "successMessage",
          "locationNotice",
          "locationWarning",
          "mediaItem",
          "mediaEmpty",
          "uploadZone",
          "dayAgenda",
        ];
        const surfaces = [
          ...main.querySelectorAll<HTMLElement>(
            "[class], fieldset, button, input, select, textarea",
          ),
        ].filter((element) => {
          if (
            element.matches(
              "input[type='checkbox'], input[type='radio'], input[type='range']",
            )
          )
            return false;
          return (
            element.matches("fieldset, button, input, select, textarea") ||
            surfaceClasses.some((name) =>
              [...element.classList].some((className) =>
                className.includes(`_${name}_`),
              ),
            ) ||
            element.matches("table[class*='responsiveTable'] tbody tr")
          );
        });
        return {
          token: getComputedStyle(main).getPropertyValue("--radius-card").trim(),
          roundedSurfaces: surfaces
            .filter(
              (element) => getComputedStyle(element).borderTopLeftRadius !== "0px",
            )
            .map((element) => ({
              element: element.tagName,
              className: element.className,
              radius: getComputedStyle(element).borderTopLeftRadius,
            })),
          pillRadii: [
            ...main.querySelectorAll(
              "[class*='statusBadge'], [class*='featuredBadge'], [class*='mutedBadge']",
            ),
          ].map((element) => getComputedStyle(element).borderTopLeftRadius),
          circleRadii: [
            ...document.querySelectorAll(
              "[class*='sidebarLogo'], [class*='mobileLogo'], [class*='collapseButton']",
            ),
          ].map((element) => getComputedStyle(element).borderTopLeftRadius),
        };
      });
      expect(geometry.token, `${path} at ${width}px`).toBe("0");
      expect(geometry.roundedSurfaces, `${path} at ${width}px`).toEqual([]);
      expect(geometry.pillRadii.every((radius) => radius === "999px")).toBe(true);
      expect(geometry.circleRadii.every((radius) => radius === "50%")).toBe(true);
      await expectNoDocumentOverflow(page);
      await page.screenshot({
        path: testInfo.outputPath(`${path.replaceAll("/", "-")}-${width}.png`),
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 375, height: 900 });
  await page.getByRole("button", { name: "Open administration menu" }).click();
  const drawer = page.getByRole("dialog", { name: "Administration menu" });
  await expect(drawer).toBeVisible();
  expect(
    await drawer
      .getByRole("button", { name: "Close", exact: true })
      .evaluate((button) => getComputedStyle(button).borderTopLeftRadius),
  ).toBe("0px");
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Open administration menu" }),
  ).toBeFocused();
});

test("dashboard and calendar remain useful and reflow at 320px", async ({ page }) => {
  await mockOperations(page);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/admin");

  await expect(
    page.getByRole("heading", { level: 1, name: "Dashboard" }),
  ).toBeVisible();
  await expect(page.getByText("Published properties", { exact: true })).toBeVisible();
  await expect(page.getByText("New inquiries", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "2026-09-15 at 10:00" })).toBeVisible();
  await expectNoDocumentOverflow(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expectNoDocumentOverflow(page);

  await page.goto("/admin/viewings");
  await expect(page.getByRole("heading", { level: 1, name: "Viewings" })).toBeVisible();
  await page.getByRole("button", { name: "2026-09-15, 1 viewing" }).click();
  await expect(
    page.getByRole("heading", { level: 3, name: /Tuesday, September 15, 2026/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "10:00 · Premier Property #RCPP-001" }),
  ).toBeVisible();
  const schedulePages = page.getByRole("navigation", {
    name: "Viewing schedule pages",
  });
  await expect(schedulePages).toContainText("Page 1 of 2");
  await schedulePages.getByRole("button", { name: "Next" }).click();
  await expect(schedulePages).toContainText("Page 2 of 2");
  await expect(page.getByText("Premier Property #RCPP-002")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "September 2026 viewing calendar" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 3, name: "Schedule list" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "2026-09-16 at 14:00" })).toBeVisible();
  await expectNoDocumentOverflow(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expectNoDocumentOverflow(page);
});

test("admin routes remain contained across the final responsive matrix", async ({
  page,
}, testInfo) => {
  await mockOperations(page);
  const routes = [
    ["/admin", "Dashboard"],
    ["/admin/properties", "Properties"],
    ["/admin/properties/new", "Create a draft property"],
    ["/admin/inquiries", "Inquiries"],
    ["/admin/viewings", "Viewings"],
    ["/admin/search", "Search"],
    ["/admin/audit", "Audit events"],
    ["/admin/staff", "Staff identities"],
  ] as const;

  for (const width of [320, 390, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    for (const [path, heading] of routes) {
      await page.goto(path);
      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();
      await expectFinalAdminData(page, path);
      const layout = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      }));
      expect(
        layout.documentWidth,
        `${path} overflow at ${width}px`,
      ).toBeLessThanOrEqual(layout.viewportWidth + 1);

      if (
        width <= 1024 &&
        [
          "/admin/properties",
          "/admin/inquiries",
          "/admin/viewings",
          "/admin/audit",
          "/admin/staff",
        ].includes(path)
      ) {
        const table = page.locator("table[class*='responsiveTable']");
        await expect(table).toHaveCSS("display", "block");
        await expect(table.locator("tbody tr").first()).toBeVisible();
        await expect(table.locator("td[data-label]").first()).toBeVisible();
      }

      if (width <= 1024) {
        if (path === "/admin/viewings") {
          const calendar = page.getByRole("region", {
            name: "September 2026 viewing calendar",
          });
          await expect(calendar).toBeVisible();
          const geometry = await calendar.evaluate((element) => ({
            width: element.clientWidth,
            scrollWidth: element.scrollWidth,
            right: element.getBoundingClientRect().right,
            lastColumnRight: element
              .querySelector("thead th:last-child")!
              .getBoundingClientRect().right,
          }));
          expect(
            geometry.scrollWidth,
            `calendar overflow at ${width}px`,
          ).toBeLessThanOrEqual(geometry.width + 1);
          expect(
            geometry.lastColumnRight,
            `Saturday clipped at ${width}px`,
          ).toBeLessThanOrEqual(geometry.right + 1);
          await calendar.screenshot({
            path: testInfo.outputPath(`viewing-calendar-${width}px.png`),
          });
        }

        await page.evaluate(() => {
          document.documentElement.style.scrollBehavior = "auto";
          window.scrollTo(0, document.documentElement.scrollHeight);
        });
        await expect
          .poll(
            () =>
              page
                .locator("main#main-content > :last-child")
                .evaluate(
                  (element) =>
                    element.getBoundingClientRect().bottom - window.innerHeight,
                ),
            { message: `${path} final content clipped at ${width}px` },
          )
          .toBeLessThanOrEqual(1);
      }
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (const [path, heading] of routes) {
    await page.goto(path);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expectFinalAdminData(page, path);
    const layout = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    expect(layout.documentWidth, `${path} overflow at 200% text`).toBeLessThanOrEqual(
      layout.viewportWidth + 1,
    );
  }
});

test("audit and staff surfaces expose only their bounded operational views", async ({
  page,
}) => {
  await mockOperations(page);
  await page.goto("/admin/audit");
  await expect(
    page.getByRole("heading", { level: 1, name: "Audit events" }),
  ).toBeVisible();
  await expect(page.getByText("safe-request-id")).toBeVisible();
  const staffFilter = page.getByRole("textbox", { name: "Staff ID", exact: true });
  await expect(staffFilter).toBeVisible();
  const filteredRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return (
      url.pathname.endsWith("/audit-events") &&
      url.searchParams.get("actorStaffIdentityId") === "507f191e810c19729de860ec"
    );
  });
  await staffFilter.fill("507f191e810c19729de860ec");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await filteredRequest;
  const auditPages = page.getByRole("navigation", { name: "Audit event pages" });
  const paginatedRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return (
      url.pathname.endsWith("/audit-events") &&
      url.searchParams.get("actorStaffIdentityId") === "507f191e810c19729de860ec" &&
      url.searchParams.get("page") === "2"
    );
  });
  await auditPages.getByRole("button", { name: "Next" }).click();
  await paginatedRequest;
  await expect(auditPages).toContainText("Page 2 of 2");
  const resetRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return (
      url.pathname.endsWith("/audit-events") &&
      !url.searchParams.has("actorStaffIdentityId") &&
      url.searchParams.get("page") === "1"
    );
  });
  await staffFilter.fill("");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await resetRequest;
  await expect(
    page.getByText(/customer messages, property values, tokens/),
  ).toBeVisible();

  await page.goto("/admin/staff");
  await expect(
    page.getByRole("heading", { level: 1, name: "Staff identities" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Staff identities table" })
      .getByText("RC Operations Administrator"),
  ).toBeVisible();
  await expect(
    page.getByText(/Provisioning and deactivation remain deliberate CLI/),
  ).toBeVisible();
});

test("cross-admin search omits customer identity from broad result previews", async ({
  page,
}) => {
  await mockOperations(page);
  await page.goto("/admin/search");
  await page.getByLabel(/Premier Property number/).fill("RCPP-001");
  await page.getByRole("button", { name: "Search" }).click();

  await expect(page.getByRole("link", { name: "Synthetic Property" })).toBeVisible();
  await expect(page.getByRole("link", { name: `Inquiry ${INQUIRY_ID}` })).toBeVisible();
  await expect(page.getByText("Sensitive Customer Name")).toHaveCount(0);
  await expect(page.getByText("customer-private@example.test")).toHaveCount(0);
});
