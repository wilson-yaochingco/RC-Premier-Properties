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
    page.getByRole("heading", { level: 1, name: "Find a home worth coming home to." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Clark Garden Residence" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Find the area that feels right." })
      .getByRole("link", { name: /Angeles City/i }),
  ).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
  const tours = page.locator('section[aria-labelledby="property-tours-heading"]');
  await expect(tours.getByRole("button", { name: /^Play / })).toHaveCount(3);
  await expect(page.locator("iframe")).toHaveCount(0);

  const footer = page.getByRole("contentinfo");
  await expect(
    footer.getByRole("link", { name: "rcpremierph@gmail.com" }),
  ).toHaveAttribute("href", "mailto:rcpremierph@gmail.com");
  await expect(footer.getByRole("link", { name: "Instagram" })).toHaveAttribute(
    "href",
    "https://www.instagram.com/rcpremierproperties?stkn=MXZvanZrdDYydmpyeQ==",
  );
  await expect(footer.getByRole("link", { name: "YouTube" })).toHaveAttribute(
    "href",
    "https://www.youtube.com/@RCPremierProperties",
  );
  await expect(footer.getByRole("link", { name: "TikTok" })).toHaveAttribute(
    "href",
    "https://www.tiktok.com/@rcpremierpropertiesss",
  );

  await page.getByRole("button", { name: "Menu" }).click();
  const primaryNavigation = page
    .getByRole("dialog", { name: "Primary navigation" })
    .getByRole("navigation", { name: "Primary navigation" });
  await expect(primaryNavigation).toBeVisible();
  await expect(primaryNavigation.getByRole("link")).toHaveText([
    "Properties",
    "Locations",
    "Sell",
    "About",
    "Contact",
  ]);

  await primaryNavigation.getByRole("link", { name: "About" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /considered differently/ }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("homepage browse action opens real property discovery", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Browse properties", exact: true }).click();
  await expect(page).toHaveURL(/\/properties$/);

  const searchUrl = new URL(page.url());
  expect(searchUrl.pathname).toBe("/properties");
  await expect(
    page.getByRole("heading", { name: "Clark Garden Residence" }),
  ).toBeVisible();
});

test("locations map credits its boundary data", async ({ page }) => {
  await page.goto("/locations");
  await expect(page.getByRole("link", { name: "OCHA/NAMRIA/PSA" })).toHaveAttribute(
    "href",
    "https://data.humdata.org/dataset/cod-ab-phl",
  );
  await expect(page.getByRole("link", { name: "CC BY 3.0 IGO" })).toHaveAttribute(
    "href",
    "https://creativecommons.org/licenses/by/3.0/igo/",
  );
});

test("homepage sections keep their routes and guided actions", async ({ page }) => {
  await page.goto("/");
  const routes = page.locator('section[aria-labelledby="routes-heading"]');
  await expect(routes.getByRole("link", { name: "Buy a home" })).toHaveAttribute(
    "href",
    "/properties",
  );
  await expect(routes.getByRole("link", { name: "Book a viewing" })).toHaveAttribute(
    "href",
    "/book-viewing",
  );
  await expect(routes.getByRole("link", { name: "Sell a property" })).toHaveAttribute(
    "href",
    "/sell",
  );

  const why = page.locator('section[aria-labelledby="why-rc-premier-heading"]');
  await expect(
    why.getByRole("img", { name: /Line drawing of a contemporary/ }),
  ).toBeVisible();
  await expect(why.getByRole("heading", { level: 3 })).toHaveCount(3);

  const featured = page.locator('section[aria-labelledby="featured-heading"]');
  await expect(featured.locator("[data-featured-property-card]")).toHaveCount(1);
  await expect(
    featured.getByRole("link", { name: "Explore properties" }),
  ).toHaveAttribute("href", "/properties");

  const closer = page.getByRole("region", { name: "What to look for in a home" });
  await expect(closer.getByRole("group", { name: "1 of 4" })).toBeVisible();
  await closer.getByRole("button", { name: "Next step" }).click();
  await expect(closer.getByRole("group", { name: "2 of 4" })).toBeVisible();

  const explore = page.getByRole("region", { name: "Find the area that feels right." });
  await expect(explore.getByRole("link", { name: /Angeles City/i })).toBeVisible();
  await expect(
    explore.getByRole("link", { name: "Explore all locations" }),
  ).toHaveAttribute("href", "/locations");

  await expect(
    page.getByRole("link", { name: "Sell your property", exact: true }),
  ).toHaveAttribute("href", "/sell");
  await expect(
    page.locator('section[aria-labelledby="property-tours-heading"]'),
  ).toBeVisible();
});

test("property filters stay in the URL, affect results, and expose an empty state", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/properties");

  // Typed Property ID waits; each select then applies the whole form straight away.
  await page.getByRole("button", { name: /^More filters/ }).click();
  await page.getByLabel("Property ID").fill("RCPP-E2E-001");
  await page
    .getByLabel("Location", { exact: true })
    .selectOption({ label: "Angeles City, Pampanga" });
  await page.getByLabel("Type", { exact: true }).selectOption("house-and-lot");
  await expect(page).toHaveURL(/propertyType=house-and-lot/);
  await page.getByRole("button", { name: /^Price/ }).click();
  await page.getByLabel("Minimum price (PHP)").fill("12450000");
  await page.getByLabel("Maximum price (PHP)").fill("12550000");
  await page.getByRole("button", { name: "Apply price" }).click();

  await expect(page).toHaveURL(/maxPrice=12550000/);
  const filteredUrl = new URL(page.url());
  expect(filteredUrl.searchParams.get("propertyId")).toBe("RCPP-E2E-001");
  expect(filteredUrl.searchParams.get("location")).toContain("Angeles City");
  expect(filteredUrl.searchParams.get("propertyType")).toBe("house-and-lot");
  expect(filteredUrl.searchParams.get("minPrice")).toBe("12450000");
  expect(filteredUrl.searchParams.get("maxPrice")).toBe("12550000");
  const filteredHref = page.url();
  await expect(page.getByText("1 property", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Clark Garden Residence" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Mabalacat Skyline Condominium" }),
  ).toHaveCount(0);

  await page.goto("/properties?location=No+Such+Fixture+District");
  await expect(page.getByText("0 properties", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /No homes match\s*those filters yet\./ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Clear filters/ })).toHaveAttribute(
    "href",
    "/properties",
  );

  await page.goBack();
  await expect(page).toHaveURL(filteredHref);
  await expect(page.getByLabel("Property ID")).toHaveValue("RCPP-E2E-001");
  await expect(page.getByLabel("Location", { exact: true })).toHaveValue(
    /Angeles City/,
  );
  await expect(page.getByLabel("Type", { exact: true })).toHaveValue("house-and-lot");
  await expect(page.getByText("1 property", { exact: true }).first()).toBeVisible();

  await page.goto("/properties");
  await page.getByRole("link", { name: "Price: low to high", exact: true }).click();
  await expect(page).toHaveURL(/sort=price-asc/);
  await expect(page.getByText("10 properties", { exact: true }).first()).toBeVisible();
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

test("location discovery and detail use only inventory-backed facets", async ({
  page,
}) => {
  await page.route("https://tile.openstreetmap.org/**", (route) =>
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
  await page.goto("/locations");

  await expect(page).toHaveTitle("Locations | RC Premier Properties");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://127.0.0.1:3100/locations",
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Where you live shapes how you live.",
    }),
  ).toBeVisible();
  const angeles = page
    .getByRole("list", { name: "Current property locations" })
    .getByRole("link", { name: /Angeles City 9 homes/ });
  await expect(angeles).toHaveAttribute("href", "/locations/angeles-city");
  await angeles.click();

  await expect(page).toHaveURL(/\/locations\/angeles-city$/);
  await expect(page).toHaveTitle(
    "Properties for Sale in Angeles City | RC Premier Properties",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://127.0.0.1:3100/locations/angeles-city",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
  expect(jsonLd).toContain('"@type":"BreadcrumbList"');
  expect(jsonLd).not.toContain("coordinates");
  expect(jsonLd).not.toContain("privateAddress");
  await expect(
    page.getByRole("heading", { level: 1, name: "Angeles City" }),
  ).toBeVisible();
  await expect(page.getByText("9 properties", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Clark Garden Residence" }),
  ).toBeVisible();

  await page.getByLabel("Minimum price").fill("999999999");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/minPrice=999999999/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://127.0.0.1:3100/locations/angeles-city",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await expect(
    page.getByRole("heading", {
      name: "No published properties match these filters.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Clear filters" })).toHaveAttribute(
    "href",
    "/locations/angeles-city",
  );

  await page.goto("/locations/angeles-city?page=999");
  await expect.poll(() => new URL(page.url()).searchParams.get("page")).toBe("1");
  await expect(
    page.getByText("No published properties match these filters."),
  ).toHaveCount(0);
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
  await expect(page.getByText("₱12,500,000", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Property gallery" })).toBeVisible();
  const fullscreenTrigger = page.getByRole("button", { name: "View Fullscreen" });
  await fullscreenTrigger.click();
  const dialog = page.getByRole("dialog", { name: "Property photo viewer" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Next photo" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
  await expect(dialog.getByText("Photo 1 of 2")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByText("Photo 2 of 2")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Property photo viewer" })).toHaveCount(
    0,
  );
  await expect(fullscreenTrigger).toBeFocused();
  await page.getByRole("button", { name: "Copy Property Number" }).click();
  await expect(page.getByText("Property number copied.")).toBeVisible();
  await page.getByRole("button", { name: "Share Property" }).click();
  await expect(page.getByText("Property link copied.")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`${new URL(page.url()).origin}/properties/clark-garden-residence`);
  await expect(page.getByRole("link", { name: "Back to Results" })).toHaveAttribute(
    "href",
    "/properties?propertyId=RCPP-E2E-001",
  );
  await expect(
    page.getByRole("complementary", { name: "Property inquiry" }),
  ).toBeVisible();
  const tourTrigger = page
    .getByRole("complementary", { name: "Property inquiry" })
    .getByRole("button", { name: "Request a Tour" });
  await expect(tourTrigger).toBeVisible();
  await tourTrigger.click();
  const tourDialog = page.getByRole("dialog", { name: "Request a Tour" });
  await expect(tourDialog).toBeVisible();
  await expect(tourDialog.getByText("Clark Garden Residence")).toBeVisible();
  await expect(tourDialog.locator('input[name="requestedDate"]:checked')).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    tourDialog.getByRole("button", { name: "Close Request a Tour" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(tourDialog.getByRole("button", { name: "Next" })).toBeFocused();
  await tourDialog.getByRole("button", { name: "Next" }).click();
  const fullName = tourDialog.getByLabel("Full name");
  const phone = tourDialog.getByLabel("Phone number");
  const email = tourDialog.getByLabel("Email");
  await expect(fullName).toHaveAttribute("required", "");
  await expect(phone).toHaveAttribute("required", "");
  await expect(email).toHaveAttribute("required", "");
  let inquiryRequests = 0;
  page.on("request", (request) => {
    if (
      request.url() === `${FIXTURE_API_ORIGIN}${API_PREFIX}/inquiries` &&
      request.method() === "POST"
    ) {
      inquiryRequests += 1;
    }
  });
  await tourDialog.getByRole("button", { name: "Submit request" }).click();
  expect(await fullName.evaluate((input) => input.validity.valueMissing)).toBe(true);
  await fullName.fill("   ");
  await phone.fill("+63 917 555 0110");
  await email.fill("viewer@example.test");
  await tourDialog.getByRole("checkbox").check();
  await tourDialog.getByRole("button", { name: "Submit request" }).click();
  await expect(tourDialog.getByRole("alert")).toContainText("full name");
  await expect(tourDialog.getByRole("alert")).toBeFocused();
  expect(inquiryRequests).toBe(0);
  await fullName.fill("Playwright Viewer");
  await phone.fill("not-a-phone");
  await tourDialog.getByRole("button", { name: "Submit request" }).click();
  await expect(tourDialog.getByRole("alert")).toContainText("valid phone number");
  await expect(tourDialog.getByRole("alert")).toBeFocused();
  expect(inquiryRequests).toBe(0);
  await page.keyboard.press("Escape");
  await expect(tourDialog).toHaveCount(0);
  await expect(tourTrigger).toBeFocused();
  await expect(page.getByRole("link", { name: "Send an inquiry" })).toHaveAttribute(
    "href",
    "/contact?propertyId=RCPP-E2E-001",
  );
  expect(browserErrors).toEqual([]);
});

test("production rendering keeps neutral placeholders when property media is absent", async ({
  page,
}) => {
  await page.goto("/properties/san-fernando-townhouse");

  const gallery = page.getByRole("region", { name: "Property gallery" });
  await expect(gallery).toBeVisible();
  await expect(gallery.getByText("PROPERTY GALLERY IMAGE 01")).toBeVisible();
  await expect(page.getByText("Development sample — not this listing")).toHaveCount(0);
});

test("failed property images preserve the gallery with a neutral fallback", async ({
  page,
}) => {
  await page.route("**/_next/image?*", (route) =>
    route.fulfill({ status: 500, body: "Unavailable" }),
  );
  await page.goto("/properties/clark-garden-residence");

  const gallery = page.getByRole("region", { name: "Property gallery" });
  await expect(
    gallery.getByRole("img", { name: /image unavailable/i }).first(),
  ).toBeVisible();
  await expect(gallery.getByRole("button", { name: "View Fullscreen" })).toBeVisible();
});

test("copy and share controls provide a safe fallback without modern browser APIs", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    document.execCommand = () => false;
  });
  await page.goto("/properties/clark-garden-residence");

  const copy = page.getByRole("button", { name: "Copy Property Number" });
  await copy.click();
  await expect(copy).toBeFocused();
  await expect(page.getByRole("status")).toContainText(
    "Select and copy the property number shown on this page.",
  );
  const share = page.getByRole("button", { name: "Share Property" });
  await share.click();
  await expect(share).toBeFocused();
  await expect(page.getByRole("status")).toContainText(
    "Copy the link from your browser address bar.",
  );
});

test("native share receives only the canonical property URL", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        (window as Window & { sharedPropertyUrl?: string }).sharedPropertyUrl =
          data.url;
      },
    });
  });
  await page.goto(
    "/properties/clark-garden-residence?from=private-state&tracking=discarded",
  );

  await page.getByRole("button", { name: "Share Property" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { sharedPropertyUrl?: string }).sharedPropertyUrl,
      ),
    )
    .toBe(`${new URL(page.url()).origin}/properties/clark-garden-residence`);
});

test("legacy clipboard success restores focus to the activated control", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    document.execCommand = () => true;
  });
  await page.goto("/properties/clark-garden-residence?tracking=discarded");

  const copy = page.getByRole("button", { name: "Copy Property Number" });
  await copy.click();
  await expect(copy).toBeFocused();
  const share = page.getByRole("button", { name: "Share Property" });
  await share.click();
  await expect(share).toBeFocused();
  await expect(page.getByRole("status")).toContainText("Property link copied.");
});

test("out-of-range property pages recover to the last real filtered page", async ({
  page,
}) => {
  await page.goto("/properties?sort=price-asc&page=999");

  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator("main article")).toHaveCount(1);
  await expect(
    page.getByText("No published properties match these filters."),
  ).toHaveCount(0);
});

test("slow related inventory does not hold back the property detail response", async ({
  page,
}) => {
  await page.goto("/properties/streaming-regression-fixture", {
    waitUntil: "commit",
    timeout: 5_000,
  });

  await expect(page.getByRole("heading", { level: 1 }).last()).toContainText(
    "Clark Garden Residence",
    { timeout: 5_000 },
  );
});

test("property tour activation loads one titled player and transfers focus to it", async ({
  page,
}) => {
  await page.route("https://www.youtube-nocookie.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<title>Fixture</title>",
    }),
  );
  const response = await page.goto("/");
  expect(response?.headers()["content-security-policy"]).toContain(
    "https://i.ytimg.com",
  );
  expect(response?.headers()["content-security-policy"]).toContain(
    "frame-src https://www.youtube-nocookie.com",
  );

  const tours = page.locator('section[aria-labelledby="property-tours-heading"]');
  await expect(page.locator("iframe")).toHaveCount(0);
  await tours
    .getByRole("button", { name: /^Play / })
    .first()
    .click();
  const player = tours.locator("iframe");
  await expect(player).toHaveCount(1);
  await expect(player).toBeFocused();
  await expect(player).toHaveAttribute(
    "src",
    /youtube-nocookie\.com\/embed\/.*autoplay=1/,
  );

  await tours.getByRole("button", { name: "Show more property tours" }).click();
  await expect(page.locator("iframe")).toHaveCount(0);
});

test("property tours use a native mobile scroll-snap row", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const row = page.locator('section[aria-labelledby="property-tours-heading"] ul');
  await expect(row).toHaveCSS("scroll-snap-type", "x mandatory");
  await expect(row.locator("li")).toHaveCount(6);
  await expect(page.getByRole("button", { name: /property tours$/ })).toHaveCount(0);
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

  const main = page.locator("main#main-content");
  await expect(
    main.getByRole("link", { name: "rcpremierph@gmail.com" }).first(),
  ).toHaveAttribute("href", "mailto:rcpremierph@gmail.com");
  await expect(
    main.getByRole("link", { name: "+63 918 429 1873" }).first(),
  ).toHaveAttribute("href", "tel:+639184291873");
  await expect(main.getByRole("link", { name: /Facebook/ })).toHaveAttribute(
    "href",
    "https://www.facebook.com/people/RC-Premier-Properties/61588365958516/",
  );

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
  await expect(page.getByRole("status")).toContainText(
    "Inquiry submitted successfully.",
  );
  await expect(page.getByRole("status")).toContainText("E2E-INQUIRY-001");
  expect(browserErrors).toEqual([]);
});

test("Part 3 editorial pages keep factual RC Premier content and current channels", async ({
  page,
}) => {
  await page.goto("/about");
  await expect(
    page.getByRole("heading", { level: 1, name: "Property, considered differently." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /helps people discover residential properties/ }),
  ).toBeVisible();

  await page.goto("/sell");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Your property deserves the right presentation.",
    }),
  ).toBeVisible();
  for (const disclosure of ["Not a valuation", "Not a listing agreement"]) {
    await expect(page.getByText(disclosure, { exact: true })).toBeVisible();
  }
  await expect(
    page.getByText("Keep sensitive documents private", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Seller inquiry", exact: true }),
  ).toBeVisible();

  await page.goto("/contact");
  await expect(
    page.getByRole("heading", { name: "Start a Conversation." }),
  ).toBeVisible();
  for (const channel of ["Facebook", "Instagram", "YouTube", "TikTok"]) {
    await expect(
      page
        .locator("main#main-content")
        .getByRole("link", { name: new RegExp(channel) }),
    ).toBeVisible();
  }
});

test("server validation is focused, linked, and preserved beside each inquiry field", async ({
  page,
}) => {
  await page.route(`**${API_PREFIX}/inquiries`, (route) => {
    const headers = {
      "Access-Control-Allow-Origin": "http://127.0.0.1:3100",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers });
    }
    return route.fulfill({
      status: 422,
      headers,
      json: {
        status: "error",
        statusCode: 422,
        message: "Please correct the highlighted fields.",
        issues: [
          { field: "email", message: "Enter a deliverable email address." },
          { field: "message", message: "Add enough detail for staff to respond." },
        ],
      },
    });
  });
  await page.goto("/contact");
  await page.getByLabel("Name").fill("Playwright Visitor");
  await page.getByLabel("Email").fill("visitor@example.test");
  await page.getByLabel("Message").fill("A valid-length message for the fixture.");
  await page.getByRole("checkbox").check();
  const phone = page.getByLabel("Phone", { exact: true });
  await expect(phone).toHaveAttribute("required", "");
  await phone.fill("invalid-phone");
  await page.getByRole("button", { name: "Send inquiry" }).click();
  await expect(page.locator("#inquiry-errors")).toContainText("valid phone number");
  await phone.fill("+63 917 555 0110");
  await page.getByRole("button", { name: "Send inquiry" }).click();

  const summary = page.locator("#inquiry-errors");
  await expect(summary).toBeFocused();
  await expect(page.getByLabel("Email")).toHaveAttribute(
    "aria-describedby",
    "inquiry-email-error",
  );
  await expect(page.locator("#inquiry-email-error")).toHaveText(
    "Enter a deliverable email address.",
  );
  await expect(page.getByLabel("Message")).toHaveAttribute(
    "aria-describedby",
    /inquiry-message-count inquiry-message-error/,
  );
  await expect(page.locator("#inquiry-message-count")).not.toHaveAttribute(
    "aria-live",
    /.+/,
  );
  await expect(page.getByLabel("Name")).toHaveValue("Playwright Visitor");
});

test("an unrelated admin-prefixed 404 retains the public chrome", async ({ page }) => {
  await page.goto("/administrator");
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("Book a Viewing schedules one structured unconfirmed request inline", async ({
  page,
}) => {
  await page.goto("/book-viewing?propertyId=RCPP-E2E-001");

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 1, name: "See the property in person." }),
  ).toBeVisible();
  const context = page.getByRole("complementary", { name: "Clark Garden Residence" });
  await expect(context.getByText("#RCPP-E2E-001")).toBeVisible();
  await expect(
    context.getByRole("link", { name: "View property details" }),
  ).toHaveAttribute("href", "/properties/clark-garden-residence");
  await expect(page.getByText(/Your selection is a request/)).toBeVisible();
  await expect(
    page.getByText("Requested times require staff confirmation."),
  ).toBeVisible();

  const scheduler = page.getByRole("region", {
    name: "Choose a preferred date and time.",
  });
  await scheduler.getByRole("button", { name: "Continue to your details" }).click();
  await expect(scheduler.getByRole("alert")).toHaveText(
    "Choose a preferred date and time to continue.",
  );

  const dates = scheduler
    .getByRole("group", { name: "Preferred date" })
    .getByRole("radio");
  const firstDate = await dates.first().inputValue();
  await scheduler.getByRole("button", { name: "Next month" }).click();
  const requestedDate = await dates.first().inputValue();
  expect(requestedDate > firstDate).toBe(true);
  await dates.first().check();
  await scheduler
    .getByRole("group", { name: "Afternoon" })
    .getByRole("radio", { name: "2:30 PM" })
    .check();
  await scheduler.getByRole("button", { name: "Continue to your details" }).click();

  const details = page.getByRole("region", { name: "Where should we follow up?" });
  await expect(
    details.getByRole("heading", { name: "Where should we follow up?" }),
  ).toBeFocused();
  await expect(details.getByText("2:30 PM · Philippine time")).toBeVisible();
  await details.getByRole("button", { name: "Edit schedule" }).click();
  await expect(scheduler.getByRole("radio", { checked: true })).toHaveCount(2);
  await scheduler.getByRole("button", { name: "Continue to your details" }).click();

  await details.getByLabel("Full name").fill("Playwright Viewer");
  await details.getByLabel("Phone number").fill("invalid");
  await details.getByLabel("Email").fill("viewer@example.test");
  await details.getByRole("checkbox").check();
  await details.getByRole("button", { name: "Send viewing request" }).click();
  await expect(details.locator("#viewing-errors")).toBeFocused();
  await expect(details.getByLabel("Phone number")).toHaveAttribute(
    "aria-describedby",
    "viewing-phone-error",
  );
  await details.getByLabel("Phone number").fill("+63 917 555 0110");

  const [apiResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url() === `${FIXTURE_API_ORIGIN}${API_PREFIX}/inquiries` &&
        response.request().method() === "POST",
    ),
    details.getByRole("button", { name: "Send viewing request" }).click(),
  ]);

  expect(apiResponse.status()).toBe(201);
  expect(apiResponse.request().postDataJSON()).toMatchObject({
    inquiryType: "viewing",
    source: "viewing-page",
    propertyId: "RCPP-E2E-001",
    phone: "+63 917 555 0110",
    requestedDate,
    requestedTime: "14:30",
    privacyConsent: true,
  });
  const success = page.getByRole("status");
  await expect(success).toContainText("Request received");
  await expect(success).toContainText("E2E-INQUIRY-001");
  await expect(success).toContainText("Clark Garden Residence");
  await expect(success).toContainText("This is not yet a confirmed appointment.");
  await expect(success.getByRole("link", { name: "Back to property" })).toHaveAttribute(
    "href",
    "/properties/clark-garden-residence",
  );
});

test("Book a Viewing keeps unknown and missing property context truthful", async ({
  page,
}) => {
  await page.goto("/book-viewing");
  const choose = page.getByRole("complementary", { name: "Choose the property" });
  const propertyId = choose.getByLabel("Property ID");
  await expect(propertyId).toHaveValue("");
  await page.getByRole("button", { name: "Continue to your details" }).click();
  expect(await propertyId.evaluate((input) => input.validity.valueMissing)).toBe(true);
  await expect(choose.getByRole("link", { name: "Browse properties" })).toHaveAttribute(
    "href",
    "/properties",
  );

  await page.goto("/book-viewing?propertyId=RCPP-UNKNOWN-404");
  const confirm = page.getByRole("complementary", { name: "Confirm the property" });
  await expect(confirm).toContainText("could not find a published property");
  await expect(confirm.getByLabel("Property ID")).toHaveValue("RCPP-UNKNOWN-404");
  await expect(page.getByText("Clark Garden Residence")).toHaveCount(0);
});

test("the global Request a Tour entry requires a property before continuing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/contact");
  const trigger = page.getByRole("banner").getByRole("button", {
    name: "Request a Tour",
  });
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Request a Tour" });
  const propertyId = dialog.getByLabel("Property ID");
  await expect(propertyId).toBeFocused();
  await dialog.getByRole("button", { name: "Next" }).click();
  expect(await propertyId.evaluate((input) => input.validity.valueMissing)).toBe(true);
  await dialog.getByRole("button", { name: "Close Request a Tour" }).click();
  await expect(trigger).toBeFocused();
});

test("the property-detail header Request a Tour inherits the current listing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/properties/clark-garden-residence");
  const headerTrigger = page
    .getByRole("banner")
    .getByRole("button", { name: "Request a Tour" });
  await headerTrigger.click();

  const dialog = page.getByRole("dialog", { name: "Request a Tour" });
  await expect(dialog.getByText("Clark Garden Residence")).toBeVisible();
  await expect(dialog.getByText("Premier Property #RCPP-E2E-001")).toBeVisible();
  await expect(dialog.getByLabel("Property ID")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Next" }).click();
  await expect(dialog.getByLabel(/^Subject/)).toHaveCount(0);
  await expect(dialog.getByLabel(/Notes for the team/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(headerTrigger).toBeFocused();
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
  await expect(page.getByRole("dialog", { name: "Primary navigation" })).toBeVisible();
  await expect(panel.getByRole("link", { name: "Properties" })).toBeFocused();
  await expect(page.locator("body")).toHaveCSS("position", "fixed");

  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(panel).toHaveAttribute("aria-hidden", "true");
  await expect(trigger).toBeFocused();
  await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
});
