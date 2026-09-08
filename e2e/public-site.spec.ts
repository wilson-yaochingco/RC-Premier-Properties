import { expect, test, type Page } from "@playwright/test";
import { API_PREFIX } from "@rc/shared";

const FIXTURE_API_ORIGIN = "http://127.0.0.1:5051";

function trackBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("home renders fixture inventory and primary navigation works", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Find a home that feels right." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Clark Garden Residence" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Angeles City, Pampanga 9 Properties/ }),
  ).toBeVisible();
  await expect(page.getByText("9 Properties")).toBeVisible();

  const primaryNavigation = page.getByRole("navigation", {
    name: "Primary navigation",
  });
  await expect(primaryNavigation).toBeVisible();
  await expect(primaryNavigation.getByRole("link")).toHaveText([
    "Home",
    "Properties",
    "Locations",
    "About",
    "Contact",
  ]);

  await primaryNavigation.getByRole("link", { name: "About" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /Property decisions/ }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("property filters stay in the URL, affect results, and expose an empty state", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  await page.goto("/properties");

  await page.getByLabel("Property ID").fill("RCPP-E2E-001");
  await page.getByLabel("Location").fill("Angeles City");
  await page.getByLabel("Property type").selectOption("house-and-lot");
  await page.getByLabel("Minimum price").fill("12450000");
  await page.getByLabel("Maximum price").fill("12550000");
  await page.getByRole("button", { name: "Search properties" }).click();

  await expect(page).toHaveURL(/\/properties\?/);
  const filteredUrl = new URL(page.url());
  expect(filteredUrl.searchParams.get("propertyId")).toBe("RCPP-E2E-001");
  expect(filteredUrl.searchParams.get("location")).toBe("Angeles City");
  expect(filteredUrl.searchParams.get("propertyType")).toBe("house-and-lot");
  expect(filteredUrl.searchParams.get("minPrice")).toBe("12450000");
  expect(filteredUrl.searchParams.get("maxPrice")).toBe("12550000");
  const filteredHref = page.url();
  await expect(page.getByText("1 result", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Clark Garden Residence" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Mabalacat Skyline Condominium" }),
  ).toHaveCount(0);

  await page.goto("/properties?location=No+Such+Fixture+District");
  await expect(page.getByText("0 results", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "No published properties match these filters.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Clear all filters" })).toHaveAttribute(
    "href",
    "/properties",
  );

  await page.goBack();
  await expect(page).toHaveURL(filteredHref);
  await expect(page.getByLabel("Property ID")).toHaveValue("RCPP-E2E-001");
  await expect(page.getByLabel("Location")).toHaveValue("Angeles City");
  await expect(page.getByLabel("Property type")).toHaveValue("house-and-lot");
  await expect(page.getByText("1 result", { exact: true })).toBeVisible();

  await page.goto("/properties");
  await page.locator("summary").filter({ hasText: "More filters" }).click();
  await page.getByLabel("Sort results").selectOption("price-asc");
  await page.getByRole("button", { name: "Search properties" }).click();
  await expect(page).toHaveURL(/sort=price-asc/);
  await expect(page.getByText("10 results", { exact: true })).toBeVisible();
  await expect(page.locator("main article h3").first()).toHaveText(
    "Pagination Fixture 01",
  );
  await expect(page.locator("main article")).toHaveCount(9);

  await page.getByRole("link", { name: /Next/ }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator("main article")).toHaveCount(1);

  await page.goBack();
  await expect(page).toHaveURL(/sort=price-asc/);
  expect(new URL(page.url()).searchParams.get("page")).toBeNull();
  await expect(page.locator("main article")).toHaveCount(9);
  expect(browserErrors).toEqual([]);
});

test("property detail renders public data and carries its ID into inquiry links", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
  });
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
  const browserErrors = trackBrowserErrors(page);
  await page.goto("/properties?propertyId=RCPP-E2E-001");
  await page.getByRole("link", { name: "View Clark Garden Residence" }).click();

  await expect(page).toHaveURL(/\/properties\/clark-garden-residence\?from=/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Clark Garden Residence" }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText(
    "RCPP-E2E-001",
  );
  await expect(page.getByText("₱12,500,000")).toBeVisible();
  await expect(page.getByRole("region", { name: "Property gallery" })).toBeVisible();
  await page.getByRole("button", { name: "View Fullscreen" }).click();
  await expect(
    page.getByRole("dialog", { name: "Property photo viewer" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog").getByText("1 / 2")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog").getByText("2 / 2")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Property photo viewer" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Copy Property Number" }).click();
  await expect(page.getByText("Property number copied.")).toBeVisible();
  await page.getByRole("button", { name: "Share Property" }).click();
  await expect(page.getByText("Property link copied.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Results" })).toHaveAttribute(
    "href",
    "/properties?propertyId=RCPP-E2E-001",
  );
  await expect(
    page.getByRole("complementary", { name: "Property inquiry" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("complementary", { name: "Property inquiry" })
      .getByRole("link", { name: "Book a Viewing" }),
  ).toHaveAttribute("href", "/book-viewing?propertyId=RCPP-E2E-001");
  await expect(page.getByRole("link", { name: "Send an inquiry" })).toHaveAttribute(
    "href",
    "/contact?propertyId=RCPP-E2E-001",
  );
  expect(browserErrors).toEqual([]);
});

test("production rendering keeps neutral placeholders when property media is absent", async ({
  page,
}) => {
  await page.goto("/properties/san-fernando-commercial-lot");

  const gallery = page.getByRole("region", { name: "Property gallery" });
  await expect(gallery).toBeVisible();
  await expect(gallery.getByText("PROPERTY GALLERY IMAGE 01")).toBeVisible();
  await expect(page.getByText("Development sample — not this listing")).toHaveCount(0);
});

test("malformed, rental, and missing property slugs render the public not-found state", async ({
  page,
}) => {
  for (const path of [
    "/properties/INVALID_SLUG",
    "/properties/mabalacat-skyline-condominium",
    "/properties/missing-property",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "This published property could not be found.",
      }),
    ).toBeVisible();
  }
});

test("contact form sends its typed payload and displays API success feedback", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  await page.goto("/contact?propertyId=RCPP-E2E-001");

  await expect(page.getByLabel(/^Property ID/)).toHaveValue("RCPP-E2E-001");
  await expect(page.getByLabel("Inquiry type")).toHaveValue("property");
  await page.getByLabel("Name").fill("Playwright Visitor");
  await page.getByLabel("Email").fill("visitor@example.test");
  await page.getByLabel(/^Phone/).fill("+63 917 123 4567");
  await page.getByLabel(/^Subject/).fill("Fixture property question");
  await page
    .getByLabel("Message")
    .fill("Please send more test-only context about this fixture property.");
  await page.getByRole("checkbox").check();

  const [apiResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url() === `${FIXTURE_API_ORIGIN}${API_PREFIX}/inquiries` &&
        response.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Send inquiry" }).click(),
  ]);

  expect(apiResponse.status()).toBe(201);
  expect(apiResponse.request().postDataJSON()).toMatchObject({
    name: "Playwright Visitor",
    email: "visitor@example.test",
    phone: "+63 917 123 4567",
    inquiryType: "property",
    source: "contact-page",
    propertyId: "RCPP-E2E-001",
    subject: "Fixture property question",
    privacyConsent: true,
  });
  await expect(page.getByRole("status")).toContainText("Inquiry received.");
  await expect(page.getByRole("status")).toContainText("E2E-INQUIRY-001");
  expect(browserErrors).toEqual([]);
});

test("viewing form submits a structured unconfirmed appointment request", async ({
  page,
}) => {
  await page.goto("/book-viewing?propertyId=RCPP-E2E-001");

  await expect(
    page.getByText("This is a request, not an instant booking."),
  ).toBeVisible();
  await expect(page.getByLabel(/^Property ID/)).toHaveValue("RCPP-E2E-001");
  await page.getByLabel("Name").fill("Playwright Viewer");
  await page.getByLabel("Email").fill("viewer@example.test");
  await page.getByLabel("Requested date").fill("2030-09-20");
  await page.getByLabel("Requested time").fill("10:30");
  await page.getByRole("checkbox").check();

  const [apiResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url() === `${FIXTURE_API_ORIGIN}${API_PREFIX}/inquiries` &&
        response.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Request viewing" }).click(),
  ]);

  expect(apiResponse.status()).toBe(201);
  expect(apiResponse.request().postDataJSON()).toMatchObject({
    inquiryType: "viewing",
    source: "viewing-page",
    propertyId: "RCPP-E2E-001",
    requestedDate: "2030-09-20",
    requestedTime: "10:30",
    privacyConsent: true,
  });
  await expect(page.getByRole("status")).toContainText("Viewing request received.");
  await expect(page.getByRole("status")).toContainText("Staff must confirm");
});

test("mobile navigation closes on Escape and restores trigger focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "Menu" });
  const panel = page.locator("#mobile-navigation-panel");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(panel).toHaveAttribute("aria-hidden", "true");

  await trigger.click();
  await expect(page.getByRole("button", { name: "Close" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(panel).toHaveAttribute("aria-hidden", "false");
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(panel).toHaveAttribute("aria-hidden", "true");
  await expect(trigger).toBeFocused();
});
