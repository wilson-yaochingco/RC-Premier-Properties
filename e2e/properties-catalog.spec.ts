import { expect, test, type Page } from "@playwright/test";

const noOverflow = () =>
  document.documentElement.scrollWidth <= document.documentElement.clientWidth;

test("filters keep the URL, expand, sort and clear", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/properties?location=Angeles+City&bedrooms=3");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const toggle = page.getByRole("button", { name: /^More filters/ });
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByLabel("Min. bedrooms")).toHaveValue("3");

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();

  await page.getByRole("link", { name: "Price: low to high", exact: true }).click();
  await expect(page).toHaveURL(/sort=price-asc/);
  await expect(page).toHaveURL(/location=Angeles\+City/);
  await expect(
    page.getByRole("link", { name: "Price: low to high", exact: true }),
  ).toHaveAttribute("aria-current", "true");

  await page
    .getByLabel("Active property filters")
    .getByRole("link", { name: "Clear all" })
    .click();
  await expect(page).toHaveURL(/\/properties$/);
});

test("zero results is an editorial state with a way out", async ({ page }) => {
  await page.goto("/properties?propertyId=999999");
  await expect(
    page.getByRole("heading", { name: /No homes match\s*those filters yet\./ }),
  ).toBeVisible();
  await expect(page.getByText("0 properties", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Contact RC Premier/ })).toBeVisible();
  await page
    .getByRole("link", { name: /Clear filters/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/properties$/);
});

test("a single result keeps a normal card width", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/properties?propertyId=RCPP-E2E-001");
  await expect(page.getByText("1 property", { exact: true }).first()).toBeVisible();
  await expect(page.locator("[data-property-card]")).toHaveCount(1);
  const card = await page.locator("[data-property-card]").boundingBox();
  expect(card?.width).toBeGreaterThan(300);
  expect(card?.width).toBeLessThan(520);
});

async function columnCount(page: Page): Promise<number> {
  return page
    .getByRole("list", { name: "Available properties" })
    .evaluate((list) => getComputedStyle(list).gridTemplateColumns.split(" ").length);
}

test("the catalog is 3 columns from 1024px, 2 from 640px and one column below", async ({
  page,
}) => {
  await page.goto("/properties");
  for (const [width, columns] of [
    [1280, 3],
    [1024, 3],
    [935, 2],
    [768, 2],
    [640, 2],
    [390, 1],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    expect(await columnCount(page), `${width}px`).toBe(columns);
    expect(await page.evaluate(noOverflow), `${width}px overflow`).toBe(true);
  }
});

test("mobile results are a vertical list with no snap rail", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/properties");
  const list = page.getByRole("list", { name: "Available properties" });
  await expect(list).toHaveCSS("scroll-snap-type", "none");
  await expect(list).toHaveCSS("overflow-x", "visible");

  const cards = page.locator("[data-property-card]:visible");
  await expect(cards.first()).toBeVisible();
  const count = await cards.count();
  expect(count).toBeGreaterThan(1);
  const boxes = await cards.evaluateAll((nodes) =>
    nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { left: box.left, width: box.width, top: box.top + window.scrollY };
    }),
  );
  // One shared column, stacked top to bottom, none hidden off to the side.
  expect(new Set(boxes.map(({ left }) => Math.round(left))).size).toBe(1);
  expect(boxes.every(({ width }) => width > 300 && width <= 390)).toBe(true);
  expect(boxes.map(({ top }) => top)).toEqual(
    [...boxes.map(({ top }) => top)].sort((a, b) => a - b),
  );

  const lastBottom = await cards
    .last()
    .evaluate((node) => node.getBoundingClientRect().bottom + window.scrollY);
  const ctaTop = await page
    .locator('section[aria-labelledby="properties-cta-heading"]')
    .evaluate((node) => node.getBoundingClientRect().top + window.scrollY);
  expect(ctaTop).toBeGreaterThan(lastBottom);
});

test("empty-state actions are compact and centered on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/properties?propertyId=999999");
  const state = page.locator('[data-catalog-state="empty"]');
  const actions = state.getByRole("link");
  await expect(actions).toHaveCount(2);

  const boxes = await actions.evaluateAll((nodes) =>
    nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { width: box.width, height: box.height, centre: box.left + box.width / 2 };
    }),
  );
  for (const box of boxes) {
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeLessThanOrEqual(48);
    expect(box.width).toBeLessThan(260);
    expect(Math.abs(box.centre - 195)).toBeLessThan(12);
  }
});

test("development fixtures are ignored in a production build", async ({ page }) => {
  await page.goto("/properties?catalogFixture=6");
  await expect(page.getByText(/Fixture (Garden|Courtyard|Contemporary)/)).toHaveCount(
    0,
  );
  const locations = await page
    .getByLabel("Location", { exact: true })
    .locator("option")
    .allTextContents();
  expect(locations).toContain("Angeles City, Pampanga");
  expect(locations.join()).not.toContain("Mabalacat");
});

test("the homepage closes with the shared editorial CTA before the footer", async ({
  page,
}) => {
  await page.goto("/");
  const cta = page.locator('section[aria-labelledby="home-cta-heading"]');
  await expect(cta.getByText("Ready when you are")).toBeVisible();
  await expect(
    cta.getByRole("heading", { name: /Let’s find the right\s*property for you\./ }),
  ).toBeVisible();
  await expect(cta.getByRole("link", { name: "Talk to RC Premier" })).toHaveAttribute(
    "href",
    "/contact",
  );
  const closesMainBeforeFooter = await cta.evaluate(
    (section) =>
      section.parentElement?.lastElementChild === section &&
      section.parentElement.nextElementSibling?.tagName === "FOOTER",
  );
  expect(closesMainBeforeFooter).toBe(true);
});

test("the closing call to action links to contact", async ({ page }) => {
  await page.goto("/properties");
  await expect(
    page.getByRole("heading", { name: /Let’s find the right\s*property for you\./ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Talk to RC Premier" })).toHaveAttribute(
    "href",
    "/contact",
  );
});

test("the catalog has no map toggle and uses the homepage header", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/properties");
  await expect(page.getByRole("button", { name: "Map", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "List", exact: true })).toHaveCount(0);

  const header = page.locator("header").first();
  await expect(header.getByRole("button", { name: /menu/i })).toBeVisible();
  await expect(header.getByRole("link", { name: "Book a viewing" })).toBeVisible();
});

test.describe("hybrid filter apply", () => {
  /** Non-prefetch RSC requests: one per applied filter change. */
  function navigationRequests(page: Page): string[] {
    const urls: string[] = [];
    page.on("request", (request) => {
      const headers = request.headers();
      if (headers["rsc"] && !headers["next-router-prefetch"]) urls.push(request.url());
    });
    return urls;
  }

  test("location, type and advanced selects apply immediately and keep More filters open", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/properties");
    await page.getByRole("button", { name: /^More filters/ }).click();
    const requests = navigationRequests(page);

    const location = page.getByLabel("Location", { exact: true });
    await location.selectOption({ index: 1 });
    await expect(page).toHaveURL(/location=/);
    expect(requests).toHaveLength(1);

    await page.getByLabel("Type", { exact: true }).selectOption({ index: 1 });
    await expect(page).toHaveURL(/propertyType=/);
    await expect(page).toHaveURL(/location=/);

    await page.getByLabel("Min. bedrooms").selectOption("2");
    await expect(page).toHaveURL(/bedrooms=2/);
    await expect(page).toHaveURL(/propertyType=/);
    await expect(page.getByRole("button", { name: /^More filters/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(requests).toHaveLength(3);
  });

  test("typed keyword waits for Enter or Search", async ({ page }) => {
    await page.goto("/properties");
    const requests = navigationRequests(page);
    const keyword = page.getByLabel("Search", { exact: true });

    await keyword.pressSequentially("garden", { delay: 20 });
    await expect(page).not.toHaveURL(/keyword=/);
    expect(requests).toHaveLength(0);

    await keyword.press("Enter");
    await expect(page).toHaveURL(/keyword=garden/);
    expect(requests).toHaveLength(1);

    await keyword.fill("clark");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL(/keyword=clark/);
  });

  test("custom price and numeric fields apply only on Enter or Apply", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/properties");
    const requests = navigationRequests(page);

    await page.getByRole("button", { name: /^Price/ }).click();
    await page.getByLabel("Minimum price (PHP)").pressSequentially("5000000", {
      delay: 20,
    });
    await expect(page).not.toHaveURL(/minPrice=/);
    expect(requests).toHaveLength(0);

    await page.getByLabel("Minimum price (PHP)").press("Enter");
    await expect(page).toHaveURL(/minPrice=5000000/);

    await page.getByRole("button", { name: /^More filters/ }).click();
    await page
      .getByLabel("Min. floor area (sqm)")
      .pressSequentially("120", { delay: 20 });
    await expect(page).not.toHaveURL(/minFloorArea=/);
    await page.getByLabel("Min. floor area (sqm)").press("Enter");
    await expect(page).toHaveURL(/minFloorArea=120/);
    await expect(page).toHaveURL(/minPrice=5000000/);
  });

  test("Clear all applies at once and re-syncs the fields", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/properties?bedrooms=2");
    await expect(page.getByLabel("Min. bedrooms")).toHaveValue("2");

    await page
      .getByLabel("Active property filters")
      .getByRole("link", { name: "Clear all" })
      .click();
    await expect(page).toHaveURL(/\/properties$/);
    await expect(page.getByLabel("Min. bedrooms")).toHaveValue("");
    await expect(page.getByLabel("Active property filters")).toHaveCount(0);
  });

  test("Back returns to the last explicit search, not each select change", async ({
    page,
  }) => {
    await page.goto("/properties");
    await page.getByLabel("Search", { exact: true }).fill("garden");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/keyword=garden/);

    await page.getByLabel("Type", { exact: true }).selectOption({ index: 1 });
    await expect(page).toHaveURL(/propertyType=/);

    await page.goBack();
    await expect(page).toHaveURL(/\/properties$/);
  });
});

test("invalid filter URLs show a recoverable state rather than an outage", async ({
  page,
}) => {
  for (const query of ["minPrice=abc", "minPrice=5000000&maxPrice=1", "bedrooms=-1"]) {
    await page.goto(`/properties?${query}`);
    // `.last()`: the streamed copy can briefly coexist with the swapped-in content.
    const state = page.locator('[data-catalog-state="invalid"]').last();
    await expect(state, query).toContainText("Some filters");
    await expect(state.getByRole("link", { name: "Clear filters" })).toHaveAttribute(
      "href",
      "/properties",
    );
    await expect(page.locator('[data-catalog-state="unavailable"]')).toHaveCount(0);
  }
});
