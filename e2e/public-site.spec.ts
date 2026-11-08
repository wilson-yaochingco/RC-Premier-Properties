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
      .getByRole("region", { name: "Explore our communities." })
      .getByRole("link", { name: /Angeles City/i }),
  ).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
  const tours = page.locator('section[aria-labelledby="property-tours-heading"]');
  await expect(tours.getByRole("button", { name: /^Play / })).toHaveCount(3);
  await expect(page.locator("iframe")).toHaveCount(0);

  const footer = page.getByRole("contentinfo");
  await expect(
    footer.getByRole("link", { name: "rcpropertiesss@gmail.com" }),
  ).toHaveAttribute("href", "mailto:rcpropertiesss@gmail.com");
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
    "About",
    "Properties",
    "Locations",
    "Sell",
    "Contact",
  ]);

  await primaryNavigation.getByRole("link", { name: "About" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /Rooted in Pampanga/ }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("homepage browse action opens real property discovery", async ({ page }) => {
  // Skip the first-visit brand intro: its overlay deliberately holds clicks while it plays.
  await page.addInitScript(() => sessionStorage.setItem("rc-intro-seen", "1"));
  await page.goto("/");
  await page.getByRole("link", { name: "Browse properties", exact: true }).click();
  await expect(page).toHaveURL(/\/properties$/);

  const searchUrl = new URL(page.url());
  expect(searchUrl.pathname).toBe("/properties");
  await expect(
    page.getByRole("heading", { name: "Clark Garden Residence" }),
  ).toBeVisible();
});

test("locations carries no map, so it shows no boundary-data credit", async ({
  page,
}) => {
  await page.goto("/locations");
  await expect(page.getByRole("link", { name: "OCHA/NAMRIA/PSA" })).toHaveCount(0);
  // The index shows no photograph credits; each location's detail page attributes its image.
  await expect(page.locator("#featured-locations details")).toHaveCount(0);
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

  const explore = page.locator('section[aria-labelledby="explore-pampanga-heading"]');
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

  await page.goto("/properties?propertyId=RCPP-E2E-001&propertyType=house-and-lot");
  await page.getByRole("button", { name: "Start Search", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Filters", exact: true });
  await drawer.getByRole("button", { name: "Angeles City", exact: true }).click();
  await page.getByLabel("Minimum price (PHP)").fill("12450000");
  await page.getByLabel("Maximum price (PHP)").fill("12550000");
  await drawer.getByRole("button", { name: "Search", exact: true }).click();

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
    page.getByRole("heading", { name: /No homes match\s*those filters yet/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Clear filters/ })).toHaveAttribute(
    "href",
    "/properties",
  );

  await page.goBack();
  await expect(page).toHaveURL(filteredHref);
  await expect(
    page.locator("form[role=search]").locator('input[name="propertyId"]'),
  ).toHaveValue("RCPP-E2E-001");
  await page.getByRole("button", { name: "Start Search", exact: true }).click();
  await expect(
    drawer.getByRole("button", { name: "Angeles City", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible();
  await expect(
    page.locator("form[role=search]").locator('input[name="propertyType"]'),
  ).toHaveValue("house-and-lot");
  await expect(page.getByText("1 property", { exact: true }).first()).toBeVisible();

  await page.goto("/properties");
  await page.getByRole("link", { name: "Price: low to high", exact: true }).click();
  await expect(page).toHaveURL(/sort=price-asc/);
  await expect(page.getByText("10 properties", { exact: true }).first()).toBeVisible();
  await expect(page.locator("main [data-property-card] h3").first()).toHaveText(
    "Pagination Fixture 01",
  );
  await expect(page.locator("main [data-property-card]")).toHaveCount(9);

  await page.getByRole("link", { name: /Next/ }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator("main [data-property-card]")).toHaveCount(1);

  await page.goBack();
  await expect(page).toHaveURL(/sort=price-asc/);
  expect(new URL(page.url()).searchParams.get("page")).toBeNull();
  await expect(page.locator("main [data-property-card]")).toHaveCount(9);
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

  await expect(page).toHaveTitle(
    "Pampanga Locations with Properties for Sale | RC Premier Properties",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://127.0.0.1:3100/locations",
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Find the right place for your next home in Pampanga",
    }),
  ).toBeVisible();
  const angeles = page
    .locator("#featured-locations article")
    .getByRole("link", { name: /Angeles City/ });
  await expect(angeles).toContainText("Explore location");
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
    "Clark Garden Residence",
  );
  await expect(
    page
      .getByRole("region", { name: "Clark Garden Residence", exact: true })
      .getByText("₱12,500,000", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Property gallery" })).toBeVisible();
  const fullscreenTrigger = page.getByRole("button", { name: "2 photos", exact: true });
  await fullscreenTrigger.click();
  const dialog = page.getByRole("dialog", { name: "Property photo gallery" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Back" })).toBeFocused();
  await expect(dialog.getByRole("img")).toHaveCount(2);
  // The scrollable photo region is the only other stop, so focus wraps inside the dialog.
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("region", { name: "All 2 photos" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Back" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Property photo gallery" }),
  ).toHaveCount(0);
  await expect(fullscreenTrigger).toBeFocused();
  await expect(page.getByRole("button", { name: "Copy Property Number" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Share property" }).click();
  await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Property link copied.");
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
    .getByRole("button", { name: "Book a Viewing" });
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
  await expect(
    page.getByRole("link", { name: "Inquire about this property" }),
  ).toHaveAttribute("href", "/contact?propertyId=RCPP-E2E-001");
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
  await expect(
    gallery.getByRole("button", { name: "2 photos", exact: true }),
  ).toBeVisible();
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

  const share = page.getByRole("button", { name: "Share property" });
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

  await page.getByRole("button", { name: "Share property" }).click();
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

  await page.getByRole("button", { name: "Share property" }).click();
  // The button confirms the copy with its own label, and keeps focus.
  await expect(page.getByRole("button", { name: "Link copied" })).toBeFocused();
  await expect(page.getByRole("status")).toContainText("Property link copied.");
});

test("out-of-range property pages recover to the last real filtered page", async ({
  page,
}) => {
  await page.goto("/properties?sort=price-asc&page=999");

  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator("main [data-property-card]")).toHaveCount(1);
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
    main.getByRole("link", { name: "rcpropertiesss@gmail.com" }).first(),
  ).toHaveAttribute("href", "mailto:rcpropertiesss@gmail.com");
  await expect(
    main.getByRole("link", { name: "+63 918 429 1873" }).first(),
  ).toHaveAttribute("href", "tel:+639184291873");

  // A resolved link shows the listing itself; the internal ID travels with the form.
  const context = main.getByRole("region", { name: "Clark Garden Residence" });
  await expect(context.getByText("#RCPP-E2E-001")).toBeVisible();
  await expect(context.getByRole("link", { name: "View listing" })).toHaveAttribute(
    "href",
    "/properties/clark-garden-residence",
  );
  await expect(page.getByLabel(/^Property ID/)).toHaveCount(0);
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
  // The form is replaced by a confirmation with working follow-up actions.
  await expect(page.getByLabel("Message")).toHaveCount(0);
  await expect(
    page.getByRole("status").getByRole("heading", { name: /submitted successfully/ }),
  ).toBeFocused();
  await expect(
    page.getByRole("status").getByRole("link", { name: "Browse properties" }),
  ).toHaveAttribute("href", "/properties");
  await expect(
    page.getByRole("status").getByRole("link", { name: /Back to Clark Garden/ }),
  ).toHaveAttribute("href", "/properties/clark-garden-residence");
  await page.getByRole("button", { name: "Send another inquiry" }).click();
  await expect(page.getByLabel("Name", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Message")).toHaveValue("");
  expect(browserErrors).toEqual([]);
});

test("a general contact inquiry never asks for or sends a property reference", async ({
  page,
}) => {
  await page.goto("/contact");
  await expect(page.getByLabel(/^Property ID/)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Asking about a specific listing?" }),
  ).toHaveCount(0);
  await expect(page.locator('input[name="propertyId"]')).toHaveCount(0);
  await expect(page.getByLabel("Inquiry type")).toHaveValue("general");
  // Visitors still choose an inquiry type.
  await page.getByLabel("Inquiry type").selectOption("selling");

  await page.getByLabel("Name", { exact: true }).fill("Playwright Visitor");
  await page.getByLabel("Email", { exact: true }).fill("visitor@example.test");
  await page.getByLabel("Phone", { exact: true }).fill("+63 917 123 4567");
  await page.getByLabel("Message").fill("A general question without a listing.");
  await page.getByRole("checkbox").check();
  const [apiResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url() === `${FIXTURE_API_ORIGIN}${API_PREFIX}/inquiries` &&
        response.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Send inquiry" }).click(),
  ]);
  const payload = apiResponse.request().postDataJSON();
  expect(payload).toMatchObject({ inquiryType: "selling", source: "contact-page" });
  expect(payload).not.toHaveProperty("propertyId");
});

test("contact recovers from unknown properties and lets a listing be dropped", async ({
  page,
}) => {
  await page.goto("/contact?propertyId=RCPP-UNKNOWN-404");
  await expect(
    page.getByText(/couldn’t find a current listing for that link/),
  ).toBeVisible();
  await expect(page.getByLabel(/^Property ID/)).toHaveCount(0);
  await expect(page.getByLabel("Inquiry type")).toHaveValue("general");

  await page.goto("/contact?propertyId=RCPP-E2E-001");
  const context = page.getByRole("region", { name: "Clark Garden Residence" });
  await context.getByRole("button", { name: "Not about this property" }).click();
  await expect(context).toHaveCount(0);
  await expect(page.getByLabel("Inquiry type")).toHaveValue("general");

  await page.getByLabel("Name", { exact: true }).fill("Playwright Visitor");
  await page.getByLabel("Email", { exact: true }).fill("visitor@example.test");
  await page.getByLabel("Phone", { exact: true }).fill("+63 917 123 4567");
  await page
    .getByLabel("Message")
    .fill("A general question after dropping the listing.");
  await page.getByRole("checkbox").check();
  const [apiResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url() === `${FIXTURE_API_ORIGIN}${API_PREFIX}/inquiries` &&
        response.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Send inquiry" }).click(),
  ]);
  const payload = apiResponse.request().postDataJSON();
  expect(payload).toMatchObject({ inquiryType: "general", source: "contact-page" });
  expect(payload).not.toHaveProperty("propertyId");
});

test("a listing the backend rejects is dropped and the inquiry can still be sent", async ({
  page,
}) => {
  let attempts = 0;
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
    attempts += 1;
    if (attempts > 1) return route.continue();
    return route.fulfill({
      status: 422,
      headers,
      json: {
        status: "error",
        statusCode: 422,
        message: "Please correct the highlighted fields.",
        issues: [{ field: "propertyId", message: "Select a current property." }],
      },
    });
  });
  await page.goto("/contact?propertyId=RCPP-E2E-001");
  await page.getByLabel("Name", { exact: true }).fill("Playwright Visitor");
  await page.getByLabel("Email", { exact: true }).fill("visitor@example.test");
  await page.getByLabel("Phone", { exact: true }).fill("+63 917 123 4567");
  await page.getByLabel("Message").fill("A question about a listing that went away.");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Send inquiry" }).click();

  const alert = page.locator("#inquiry-errors");
  await expect(alert).toContainText("no longer available");
  await expect(alert.getByRole("link")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Clark Garden Residence" }),
  ).toHaveCount(0);
  await expect(page.getByLabel(/^Property ID/)).toHaveCount(0);

  const [retry] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url() === `${FIXTURE_API_ORIGIN}${API_PREFIX}/inquiries` &&
        response.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Send inquiry" }).click(),
  ]);
  expect(retry.status()).toBe(201);
  expect(retry.request().postDataJSON()).not.toHaveProperty("propertyId");
});

test("Part 3 editorial pages keep factual RC Premier content and current channels", async ({
  page,
}) => {
  await page.goto("/about");
  await expect(
    page.getByRole("heading", { level: 1, name: /Rooted in Pampanga/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Thoughtfully presented homes, clearer property decisions, and a more personal way forward in Pampanga.",
    }),
  ).toBeVisible();

  await page.goto("/sell");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Your property, thoughtfully presented",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Let's talk about your property" }),
  ).toBeVisible();
  // The seller FAQ was removed; the preparation note keeps the document boundary visible.
  await expect(
    page.getByText(/This is preparation guidance, not a list of required documents/),
  ).toBeVisible();
  await expect(
    page.getByText(/Please do not upload sensitive documents through the form/),
  ).toBeVisible();

  await page.goto("/contact");
  await expect(
    page.getByRole("heading", { level: 1, name: /Let’s talk about your next move/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "How can we help?" }),
  ).toBeVisible();
  for (const channel of ["Facebook", "Instagram", "YouTube", "TikTok"]) {
    await expect(
      page.getByRole("contentinfo").getByRole("link", { name: new RegExp(channel) }),
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
    page.getByRole("heading", { level: 1, name: "See the property in person" }),
  ).toBeVisible();
  const context = page.getByRole("region", { name: "Clark Garden Residence" });
  await expect(context.getByText("#RCPP-E2E-001")).toBeVisible();
  // Availability is only called out when it changes expectations (reserved).
  await expect(context.getByText(/reserved/i)).toHaveCount(0);
  await expect(context.getByRole("link", { name: "View listing" })).toHaveAttribute(
    "href",
    "/properties/clark-garden-residence",
  );
  await expect(context.getByRole("button", { name: "Change" })).toHaveCount(0);
  await expect(page.getByLabel(/Premier Property number/)).toHaveCount(0);
  await expect(page.getByText("What happens next?")).toHaveCount(0);
  await expect(page.getByText(/Prefer to talk it through first/)).toHaveCount(0);
  await expect(page.getByText("Philippine time")).toHaveCount(0);
  await expect(
    page.getByText("Requested times are subject to confirmation by our team."),
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
    .getByRole("radio", { name: "2:30 PM", exact: true })
    .check();
  await scheduler.getByRole("button", { name: "Continue to your details" }).click();

  const details = page.getByRole("region", { name: "Where should we follow up?" });
  await expect(
    details.getByRole("heading", { name: "Where should we follow up?" }),
  ).toBeFocused();
  await expect(details.getByText("2:30 PM", { exact: true })).toBeVisible();
  await expect(details.getByText(/Philippine time/)).toHaveCount(0);
  await expect(details.getByLabel("Full name")).toHaveAttribute(
    "placeholder",
    "Enter your full name",
  );
  await expect(details.getByLabel("Phone number")).toHaveAttribute(
    "placeholder",
    "e.g. 0917 123 4567",
  );
  await expect(details.getByLabel("Email")).toHaveAttribute(
    "placeholder",
    "you@example.com",
  );
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
  await expect(success).toContainText("2:30 PM");
  await expect(success).not.toContainText("Philippine time");
  await expect(success.getByRole("link", { name: "Back to property" })).toHaveAttribute(
    "href",
    "/properties/clark-garden-residence",
  );
});

test("Book a Viewing offers current listings instead of a raw property number", async ({
  page,
}) => {
  await page.goto("/book-viewing");
  const picker = page.getByRole("region", {
    name: "Which property would you like to see?",
  });
  const listings = picker.getByRole("list", { name: "Current listings" });
  await expect(listings.getByRole("button")).not.toHaveCount(0);
  await expect(page.getByLabel(/Premier Property number/)).toHaveCount(0);

  // The schedule only appears once a listing is chosen.
  await expect(
    page.getByRole("region", { name: "Choose a preferred date and time." }),
  ).toHaveCount(0);

  // Choosing a listing swaps the picker for the chosen-property strip.
  await listings.getByRole("button", { name: /^Clark Garden Residence,/ }).click();
  const chosen = page.getByRole("region", { name: "Clark Garden Residence" });
  await expect(chosen.getByText("#RCPP-E2E-001")).toBeVisible();
  await expect(
    chosen.getByRole("heading", { name: "Clark Garden Residence" }),
  ).toBeFocused();
  await chosen.getByRole("button", { name: "Change property" }).click();
  await expect(picker).toBeVisible();

  await expect(
    picker.getByRole("link", { name: "Browse all properties" }),
  ).toHaveAttribute("href", "/properties");

  await page.goto("/book-viewing?propertyId=RCPP-UNKNOWN-404");
  await expect(
    page.getByText(/couldn’t find a current listing numbered “RCPP-UNKNOWN-404”/),
  ).toBeVisible();
  await expect(page.getByLabel(/Premier Property number/)).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Clark Garden Residence" }),
  ).toHaveCount(0);
});

test("the global Request a Tour entry requires a property before continuing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/locations/angeles-city");
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

test("the property-detail header preserves the Book a viewing entry", async ({
  page,
}) => {
  await page.goto("/properties/clark-garden-residence");
  const headerLink = page
    .getByRole("banner")
    .getByRole("link", { name: /Book a viewing/i });
  await expect(headerLink).toHaveAttribute("href", "/book-viewing");
  await headerLink.click();
  await expect(page).toHaveURL(/\/book-viewing$/);
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
  await expect(panel.getByRole("link", { name: "About" })).toBeFocused();
  await expect(page.locator("body")).toHaveCSS("position", "fixed");

  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(panel).toHaveAttribute("aria-hidden", "true");
  await expect(trigger).toBeFocused();
  await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
});

test("the photo gallery is a two-column modal with Share and Book a Viewing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/properties/clark-garden-residence");

  await page.getByRole("button", { name: "2 photos", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Property photo gallery" });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box!.width).toBeLessThan(1440);
  // Sharp corners, flush with the top of the viewport.
  await expect(dialog).toHaveCSS("border-radius", "0px");
  expect(box!.y).toBe(0);
  const tiles = await dialog
    .locator("li")
    .evaluateAll((items) =>
      items.map((item) => Math.round(item.getBoundingClientRect().left)),
    );
  expect(new Set(tiles).size).toBe(2);
  await expect(dialog.getByRole("button", { name: "Share property" })).toBeVisible();

  await dialog.getByRole("button", { name: "Book a Viewing" }).click();
  await expect(
    page.getByRole("dialog", { name: "Property photo gallery" }),
  ).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Request a Tour" })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "2 photos", exact: true }).click();
  await page.mouse.click(8, 8);
  await expect(
    page.getByRole("dialog", { name: "Property photo gallery" }),
  ).toHaveCount(0);
});

test("the contact agent panel replaces the repeated price and hides internal metadata", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/properties/clark-garden-residence");

  const aside = page.getByRole("complementary", { name: "Property inquiry" });
  await expect(aside.getByText("Renzo Yao")).toBeVisible();
  await expect(aside.getByText("Property Agent")).toBeVisible();
  await expect(aside.getByRole("link", { name: "+63 918 429 1873" })).toBeVisible();
  await expect(aside.getByText("confirmed by our agent")).toHaveCount(0);
  await expect(aside.locator(".button__icon")).toHaveCount(0);
  await expect(aside.getByRole("button", { name: "Book a Viewing" })).toBeVisible();
  await expect(
    aside.getByRole("link", { name: "Inquire about this property" }),
  ).toBeVisible();
  // The old meta row above the title is gone; type and availability live in the details.
  await expect(page.getByRole("list", { name: "Listing summary" })).toHaveCount(0);
  const details = page.locator("dl", { hasText: "Property type" });
  await expect(details).toContainText("House & lot");
  await expect(details).toContainText("available");
  await expect(
    page.getByText("The exact address is shared when you inquire"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("main").getByRole("link", { name: /^Explore / }),
  ).toHaveCount(0);

  // No viewing hours anywhere; the booking dialog still collects a preferred date and time.
  await expect(page.getByText("View hours")).toHaveCount(0);
  await expect(page.getByText(/9:00 AM/)).toHaveCount(0);
  // Furnishing is a feature, not a structural detail.
  await expect(details).not.toContainText("Furnishing");
  await expect(
    page.getByRole("heading", { name: "Features and inclusions" }).locator(".."),
  ).toContainText("Semi-furnished");

  const inquire = aside.getByRole("link", { name: "Inquire about this property" });
  await inquire.hover();
  await expect(inquire).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(aside.getByText("₱12,500,000")).toHaveCount(0);
  await expect(page.getByText("Last updated")).toHaveCount(0);
  await expect(page.getByText("Property no.")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Print property" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Share property" })).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "Browse all properties" }).last(),
  ).toBeVisible();
});

test("on phones Share sits beside the price and Similar properties is a swipe rail", async ({
  page,
}) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/properties/clark-garden-residence");

    const share = page.getByRole("button", { name: "Share property" });
    const price = page.getByText("Selling price").first();
    const facts = page.getByRole("list", { name: "Key specifications" });
    const [shareBox, priceBox, factsBox] = await Promise.all([
      share.boundingBox(),
      price.boundingBox(),
      facts.boundingBox(),
    ]);
    expect(shareBox!.y).toBeLessThan(factsBox!.y);
    expect(Math.abs(shareBox!.y - priceBox!.y)).toBeLessThan(80);

    const rail = page.locator('[class*="relatedGrid"]');
    await rail.scrollIntoViewIfNeeded();
    const geometry = await rail.evaluate((element) => {
      const first = element.firstElementChild!.getBoundingClientRect();
      return {
        overflowX: getComputedStyle(element).overflowX,
        scrollable: element.scrollWidth > element.clientWidth,
        firstWidth: first.width,
        viewport: window.innerWidth,
        pageOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(geometry.overflowX).toBe("auto");
    expect(geometry.scrollable).toBe(true);
    expect(geometry.firstWidth).toBeLessThan(geometry.viewport * 0.9);
    expect(geometry.pageOverflow).toBeLessThanOrEqual(0);
  }
});

test("sharing leaves no status text behind, on the page or in the photo modal", async ({
  page,
}) => {
  await page.addInitScript(() => {
    let calls = 0;
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => {
        calls += 1;
        if (calls % 2 === 0) throw new DOMException("cancelled", "AbortError");
      },
    });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/properties/clark-garden-residence");

  const visibleStatus = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('[role="status"]')]
        .map((element) => (element as HTMLElement).textContent?.trim())
        .filter(Boolean),
    );

  const share = page.getByRole("button", { name: "Share property" });
  await share.click();
  await expect.poll(visibleStatus).toEqual([]);
  await share.click();
  await expect.poll(visibleStatus).toEqual([]);
  await expect(page.getByText(/Share options opened|Sharing canceled/)).toHaveCount(0);

  await page.getByRole("button", { name: "2 photos", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Property photo gallery" });
  await dialog.getByRole("button", { name: "Share property" }).click();
  await expect.poll(visibleStatus).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByText(/Share options opened|Sharing canceled/)).toHaveCount(0);
});

test("a copied link is confirmed briefly and then cleared", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
  });
  await page.goto("/properties/clark-garden-residence");

  await page.getByRole("button", { name: "Share property" }).click();
  await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Share property" })).toBeVisible({
    timeout: 6000,
  });
  await expect(page.getByRole("status")).toHaveText("");
});

test("the page wipe covers a change of public page but not filtering, Back or reduced motion", async ({
  browser,
  page,
}) => {
  const wipeVisible = () =>
    page.evaluate(() => {
      const panel = [
        ...document.querySelectorAll("body > div[aria-hidden='true']"),
      ].find((element) => (element as HTMLElement).style.zIndex === "250");
      return panel ? getComputedStyle(panel).visibility === "visible" : false;
    });
  const sawWipe = async (action: () => Promise<void>) => {
    await page.evaluate(() => {
      const w = window as Window & { __wipe?: boolean };
      w.__wipe = false;
      const tick = () => {
        const panel = [
          ...document.querySelectorAll("body > div[aria-hidden='true']"),
        ].find((element) => (element as HTMLElement).style.zIndex === "250");
        if (panel && getComputedStyle(panel).visibility === "visible") w.__wipe = true;
        requestAnimationFrame(tick);
      };
      tick();
    });
    await action();
    await page.waitForTimeout(1500);
    return page.evaluate(() => (window as Window & { __wipe?: boolean }).__wipe);
  };

  await page.goto("/properties?propertyId=RCPP-E2E-001");
  // A different page, with its query intact, is covered by the wipe.
  expect(
    await sawWipe(() =>
      page.getByRole("link", { name: "View Clark Garden Residence" }).click(),
    ),
  ).toBe(true);
  await expect(page).toHaveURL(/\/properties\/clark-garden-residence\?from=/);
  expect(await wipeVisible()).toBe(false);
  expect(await page.evaluate(() => scrollY)).toBe(0);

  // Back to Results is a page change too, and restores the filtered URL.
  expect(
    await sawWipe(() => page.getByRole("link", { name: "Back to Results" }).click()),
  ).toBe(true);
  await expect(page).toHaveURL(/\/properties\?propertyId=RCPP-E2E-001$/);

  // Sorting stays on the page: no wipe.
  expect(
    await sawWipe(() => page.getByRole("link", { name: "Price: low to high" }).click()),
  ).toBe(false);

  // The browser's own Back is left alone.
  expect(await sawWipe(() => page.goBack())).toBe(false);

  const reduced = await browser.newContext({ reducedMotion: "reduce" });
  const calm = await reduced.newPage();
  await calm.goto("/properties?propertyId=RCPP-E2E-001");
  await calm.getByRole("link", { name: "View Clark Garden Residence" }).click();
  await expect(calm).toHaveURL(/\/properties\/clark-garden-residence/);
  await reduced.close();
});
