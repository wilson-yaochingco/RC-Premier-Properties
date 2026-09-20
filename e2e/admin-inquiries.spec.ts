import { expect, test, type Page, type Route } from "@playwright/test";
import { readFile } from "node:fs/promises";
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
  notification: {
    status: "delivered",
    attempts: 1,
    deliveredAt: "2026-09-07T08:00:00.000Z",
  },
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

test("inquiries keep long contact data and filters inside every supported viewport", async ({
  page,
}) => {
  await mockSession(page);
  await page.route(`**${API_PREFIX}/admin/inquiries**`, (route) =>
    json(route, 200, {
      items: [
        {
          ...INQUIRY,
          name: "LongContactName".repeat(8),
          email: `${"longaddress".repeat(12)}@example.test`,
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
  );
  await page.goto("/admin/inquiries");
  await expect(page.getByRole("link", { name: "View details" })).toBeVisible();
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("button", { name: "Apply filters" })).toBeVisible();
    const geometry = await page
      .locator("section[aria-labelledby='admin-inquiries-title']")
      .evaluate((section) => {
        const filters = section.querySelector("form")!;
        const bounds = filters.getBoundingClientRect();
        return {
          pageFits: document.documentElement.scrollWidth <= innerWidth,
          filtersFit: [...filters.children].every((child) => {
            const rect = child.getBoundingClientRect();
            return rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1;
          }),
          cellsFit: [...section.querySelectorAll("tbody td")].every(
            (cell) => cell.scrollWidth <= cell.clientWidth + 1,
          ),
        };
      });
    expect(geometry, `inquiry layout at ${width}px`).toEqual({
      pageFits: true,
      filtersFit: true,
      cellsFit: true,
    });
  }
});

async function json(route: Route, status: number, body: unknown) {
  await route.fulfill({ status, json: body, headers: corsHeaders });
}

async function mockSession(page: Page) {
  await page.route(`**${API_PREFIX}/auth/session`, (route) =>
    json(route, 200, SESSION),
  );
}

test("inquiry controls and long records fit with either sidebar state", async ({
  page,
}, testInfo) => {
  const inquiry: AdminInquiryDetail = {
    ...INQUIRY,
    name: "LongContactName".repeat(8),
    email: `${"longaddress".repeat(12)}@example.test`,
    propertyId: "RCPP-LONG-PROPERTY-REFERENCE-000000000001",
    status: "viewing-scheduled",
    notification: { status: "retry-pending", attempts: 1 },
    viewingRequest: { ...INQUIRY.viewingRequest!, status: "reschedule-requested" },
  };
  await mockSession(page);
  await page.route(`**${API_PREFIX}/admin/inquiries**`, (route) =>
    json(route, 200, {
      items: [inquiry],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
  );
  await page.goto("/admin/inquiries");
  const section = page.locator("section[aria-labelledby='admin-inquiries-title']");
  await expect(section.getByRole("link", { name: "View details" })).toBeVisible();
  await section
    .getByRole("combobox", { name: /^Status/ })
    .selectOption("viewing-scheduled");
  await section.getByLabel("Viewing status").selectOption("reschedule-requested");
  const measurements = [];
  for (const width of [320, 375, 430, 768, 1024, 1280, 1366, 1440, 1536, 1920]) {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 900 });
    for (const collapsed of width > 1024 ? [false, true] : [false]) {
      if (width > 1024) {
        const shell = page.locator("[data-collapsed]");
        if ((await shell.getAttribute("data-collapsed")) !== String(collapsed)) {
          await page.getByRole("button", { name: /administration sidebar/ }).click();
        }
        await expect(shell).toHaveAttribute("data-collapsed", String(collapsed));
      }
      const geometry = await section.evaluate((element) => {
        const filters = element.querySelector("form")!;
        const controls = [...filters.querySelectorAll("input, select, button")];
        const bounds = filters.getBoundingClientRect();
        const rects = controls.map((control) => control.getBoundingClientRect());
        const wrapper = element.querySelector<HTMLElement>("[role='region']")!;
        const exportButton = element.querySelector("button")!.getBoundingClientRect();
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        const selectTextFits = [...filters.querySelectorAll("select")].every(
          (select) => {
            const style = getComputedStyle(select);
            context.font = style.font;
            const text = select.selectedOptions[0].text;
            const label =
              style.textTransform === "uppercase" ? text.toUpperCase() : text;
            const textWidth =
              context.measureText(label).width +
              Math.max(0, label.length - 1) * (parseFloat(style.letterSpacing) || 0);
            return (
              textWidth +
                parseFloat(style.paddingLeft) +
                parseFloat(style.paddingRight) +
                20 <=
              select.clientWidth
            );
          },
        );
        const sidebar = document.querySelector("aside")!.getBoundingClientRect();
        const sectionBounds = element.getBoundingClientRect();
        return {
          pageFits:
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
          shellOverflowVisible:
            getComputedStyle(document.querySelector("[data-collapsed]")!).overflowX ===
            "visible",
          filtersFit: rects.every(
            (rect) => rect.left >= bounds.left && rect.right <= bounds.right,
          ),
          controlsSeparate: rects.every((rect, index) =>
            rects
              .slice(index + 1)
              .every(
                (other) =>
                  Math.min(rect.right, other.right) - Math.max(rect.left, other.left) <=
                    1 ||
                  Math.min(rect.bottom, other.bottom) - Math.max(rect.top, other.top) <=
                    1,
              ),
          ),
          exportFits:
            exportButton.left >= sectionBounds.left &&
            exportButton.right <= sectionBounds.right,
          cellsFit: [...element.querySelectorAll("tbody td")].every(
            (cell) => cell.scrollWidth <= cell.clientWidth + 1,
          ),
          selectTextFits,
          sidebarSeparate: sidebar.width === 0 || sectionBounds.left >= sidebar.right,
          tableScroll: wrapper.scrollWidth > wrapper.clientWidth,
          contactWidth: element.querySelector("tbody td")!.clientWidth,
        };
      });
      const label = `${width}px, sidebar ${collapsed ? "collapsed" : "expanded"}`;
      expect(geometry, label).toMatchObject({
        pageFits: true,
        shellOverflowVisible: true,
        filtersFit: true,
        controlsSeparate: true,
        exportFits: true,
        cellsFit: true,
        selectTextFits: true,
        sidebarSeparate: true,
      });
      if (width > 1024)
        expect(geometry.contactWidth, label).toBeGreaterThanOrEqual(190);
      measurements.push({ width, collapsed, ...geometry });
      await expect(section.locator("tbody td")).toHaveCount(9);
      await expect(section).toContainText(inquiry.name);
      await expect(section).toContainText(inquiry.email);
      await expect(section).toContainText(inquiry.propertyId);
      const wrapper = section.getByRole("region", { name: "Private inquiries table" });
      await wrapper.evaluate((element) => {
        element.scrollLeft = element.scrollWidth;
      });
      const details = section.getByRole("link", { name: "View details" });
      await details.scrollIntoViewIfNeeded();
      await expect(details).toBeInViewport();
      await details.focus();
      await expect(details).toBeFocused();
      expect(await page.evaluate(() => window.scrollX), label).toBe(0);
      await wrapper.evaluate((element) => {
        element.scrollLeft = 0;
      });
      if ([320, 768, 1366, 1440, 1920].includes(width)) {
        await page.screenshot({
          path: testInfo.outputPath(`inquiries-${width}-${collapsed}.png`),
          fullPage: true,
        });
      }
    }
  }
  await testInfo.attach("inquiry-layout-measurements", {
    body: JSON.stringify(measurements, null, 2),
    contentType: "application/json",
  });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  for (const width of [320, 375, 430]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
      `long inquiry at ${width}px and 200% text`,
    ).toBe(true);
    expect(
      await section
        .locator("tbody td")
        .evaluateAll((cells) =>
          cells.every((cell) => cell.scrollWidth <= cell.clientWidth + 1),
        ),
    ).toBe(true);
  }
  await page.route(`**${API_PREFIX}/admin/inquiries/${INQUIRY_ID}`, (route) =>
    json(route, 200, { ...INQUIRY, ...inquiry }),
  );
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "100%";
  });
  await section.getByRole("link", { name: "View details" }).click();
  const detailCards = page.locator(
    "main [class*='detailCard'], main [class*='workflowCard']",
  );
  await expect(detailCards).toHaveCount(5);
  for (const card of await detailCards.all()) {
    await expect(card).toBeVisible();
    await expect(card).toHaveCSS("border-top-left-radius", "0px");
  }
  await page.screenshot({
    path: testInfo.outputPath("inquiry-detail-430.png"),
    fullPage: true,
  });
});

test("all inquiry filters, pagination and current-page export retain their request semantics", async ({
  page,
}) => {
  await mockSession(page);
  await page.route(`**${API_PREFIX}/admin/inquiries**`, (route) => {
    const currentPage = Number(new URL(route.request().url()).searchParams.get("page"));
    return json(route, 200, {
      items: [
        { ...INQUIRY, name: currentPage === 2 ? "Second Page Fixture" : INQUIRY.name },
      ],
      pagination: { page: currentPage, limit: 20, total: 21, totalPages: 2 },
    });
  });
  await page.goto("/admin/inquiries");
  const section = page.locator("section[aria-labelledby='admin-inquiries-title']");
  await expect(section.getByRole("link", { name: "View details" })).toBeVisible();
  await section.getByLabel("Search", { exact: true }).fill("  Maria  ");
  await section.getByLabel("Property ID").fill(INQUIRY.propertyId!);
  await section.getByLabel("Queue").selectOption("archived");
  await section
    .getByRole("combobox", { name: /^Status/ })
    .selectOption("viewing-scheduled");
  await section.getByRole("combobox", { name: /^Type/ }).selectOption("viewing");
  await section.getByLabel("Viewing status").selectOption("reschedule-requested");
  await section.getByLabel("Source").selectOption("viewing-page");
  const expected = {
    query: "Maria",
    propertyId: INQUIRY.propertyId,
    queue: "archived",
    status: "viewing-scheduled",
    inquiryType: "viewing",
    viewingStatus: "reschedule-requested",
    source: "viewing-page",
    page: "1",
    limit: "20",
  };
  const filteredRequest = page.waitForRequest(
    (request) =>
      request.method() === "GET" &&
      new URL(request.url()).searchParams.get("query") === "Maria",
  );
  await section.getByRole("button", { name: "Apply filters" }).click();
  expect(
    Object.fromEntries(new URL((await filteredRequest).url()).searchParams),
  ).toEqual(expected);
  await expect(section.getByText("21 inquiries found")).toBeVisible();
  const nextRequest = page.waitForRequest(
    (request) => new URL(request.url()).searchParams.get("page") === "2",
  );
  await section.getByRole("button", { name: "Next", exact: true }).click();
  expect(Object.fromEntries(new URL((await nextRequest).url()).searchParams)).toEqual({
    ...expected,
    page: "2",
  });
  await expect(section.getByText("Second Page Fixture")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await section.getByRole("button", { name: /Export current page/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("rc-premier-inquiries-page.csv");
  const csv = await readFile((await download.path())!, "utf8");
  expect(csv).toContain("Second Page Fixture");
  expect(csv).toContain(INQUIRY.email);
  expect(csv).not.toContain(INQUIRY.name);
  expect(csv).not.toContain(INQUIRY.phone);
  const previousRequest = page.waitForRequest(
    (request) => new URL(request.url()).searchParams.get("page") === "1",
  );
  await section.getByRole("button", { name: "Previous" }).click();
  expect(
    Object.fromEntries(new URL((await previousRequest).url()).searchParams),
  ).toEqual(expected);
  await expect(section.getByText(INQUIRY.name)).toBeVisible();
  await expect(section.getByRole("link", { name: "View details" })).toHaveAttribute(
    "href",
    `/admin/inquiries/${INQUIRY_ID}`,
  );
});

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
  await expect(page.getByRole("heading", { level: 1, name: "Viewings" })).toBeVisible();
  await expect(page.getByText("Premier Property #RCPP-E2E-DRAFT")).toBeVisible();
  await page.getByRole("link", { name: "View details" }).click();
  await expect(
    page.getByText("This is a synthetic private inquiry used only by browser tests."),
  ).toBeVisible();
  await expect(page.getByText("Notification delivered")).toBeVisible();

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
