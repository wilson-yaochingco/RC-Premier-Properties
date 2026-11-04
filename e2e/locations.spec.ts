import { expect, test, type Page } from "@playwright/test";

/**
 * Navigates and waits for Next's streamed content to finish swapping in. Until then the
 * streamed markup and its loading shell can both be in the document, which makes strict
 * locators ambiguous (the intermittent `[id="S:1"]` duplicate noted in docs/development/testing.md).
 */
async function open(page: Page, path: string) {
  const response = await page.goto(path);
  await page.waitForFunction(() => !document.querySelector('[id^="S:"]'));
  return response;
}

/**
 * The fixture API publishes nine homes in Angeles City and none in Mabalacat City,
 * Magalang or Porac, so the curated four exercise both populated and confirmed-empty areas.
 */
const FEATURED = [
  { name: "Angeles City", slug: "angeles-city" },
  { name: "Mabalacat City", slug: "mabalacat-city" },
  { name: "Magalang", slug: "magalang" },
  { name: "Porac", slug: "porac" },
] as const;

test("the four curated locations stay visible with truthful counts", async ({
  page,
}) => {
  await open(page, "/locations");
  const featured = page.locator("#featured-locations");
  await expect(featured.getByRole("article")).toHaveCount(4);
  await expect(
    featured.getByRole("link", { name: /Angeles City/ }).first(),
  ).toContainText("9 properties");
  for (const name of ["Mabalacat City", "Magalang", "Porac"]) {
    await expect(
      featured.getByRole("link", { name: new RegExp(name) }).first(),
    ).toContainText("0 properties");
  }
  // A confirmed zero is never worded as an outage.
  await expect(page.getByText("Inventory unavailable")).toHaveCount(0);
  // Every photograph is credited with its creator and licence.
  const credits = featured.locator("p", {
    hasText: "Photography, via Wikimedia Commons",
  });
  for (const creator of ["Patrickroque01", "Judgefloro", "Ralff Nestor Nacor"]) {
    await expect(credits).toContainText(creator);
  }
  await expect(credits.getByRole("link", { name: "CC BY-SA 4.0" })).toHaveCount(2);
});

test("every curated location route resolves, including areas with no listings", async ({
  page,
}) => {
  for (const { name, slug } of FEATURED) {
    const response = await open(page, `/locations/${slug}`);
    expect(response?.status(), slug).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  }

  // Angeles City has published homes; the others show a truthful, location-specific state.
  await open(page, "/locations/angeles-city");
  await expect(page.locator("[data-property-card]").first()).toBeVisible();
  await expect(page.getByText("No published properties yet")).toHaveCount(0);

  await open(page, "/locations/magalang");
  await expect(page.getByText("0 properties").first()).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "No homes are published in Magalang right now.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Browse all properties" }),
  ).toHaveAttribute("href", "/properties");
  // A location with nothing published is reachable but not indexed.
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );

  // Other slugs are still not locations.
  await page.goto("/locations/atlantis");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "This published location could not be found.",
    }),
  ).toBeVisible();
  expect(
    await page.locator('meta[name="robots"][content*="noindex"]').count(),
  ).toBeGreaterThan(0);
});

test("homes by location shows real homes or an honest empty state per area", async ({
  page,
}) => {
  await open(page, "/locations");
  const homes = page.locator('section[aria-labelledby="homes-title"]');
  await expect(
    homes.getByRole("heading", {
      level: 2,
      name: "Explore available homes in Pampanga.",
    }),
  ).toBeVisible();

  // Defaults to the first area that has published homes.
  const angeles = homes.getByRole("button", { name: /^Angeles City/ });
  await expect(angeles).toHaveAttribute("aria-pressed", "true");
  const panel = homes.getByRole("region", { name: "Homes in Angeles City" });
  await expect(panel.locator("[data-property-card]")).toHaveCount(3);
  await expect(
    panel.getByRole("link", { name: "View all in Angeles City" }),
  ).toHaveAttribute("href", "/locations/angeles-city");
  const firstCard = panel.locator("[data-property-card] a").first();
  await expect(firstCard).toHaveAttribute(
    "href",
    /^\/properties\/.+\?from=%2Flocations%2Fangeles-city$/,
  );

  // An area with no published homes says so and offers real next steps.
  await homes.getByRole("button", { name: /^Porac/ }).click();
  await expect(
    homes.getByRole("region", { name: "Homes in Angeles City" }),
  ).toBeHidden();
  const empty = homes.getByRole("region", { name: "Homes in Porac" });
  await expect(
    empty.getByRole("heading", {
      name: "Porac has no published properties right now.",
    }),
  ).toBeVisible();
  await expect(empty.locator("[data-property-card]")).toHaveCount(0);
  await expect(
    empty.getByRole("link", { name: "Browse all properties" }),
  ).toHaveAttribute("href", "/properties");
  await expect(empty.getByRole("link", { name: "Talk to RC Premier" })).toHaveAttribute(
    "href",
    "/contact",
  );

  // A property card leads to its real detail page.
  await angeles.click();
  await panel.locator("[data-property-card] a").first().click();
  await expect(page).toHaveURL(/\/properties\/.+/);
});

test("the explorer keeps the map in sync with real buttons", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, "/locations");
  const explorer = page.locator('section[aria-labelledby="explorer-title"]');
  const group = explorer.getByRole("group", { name: "Choose a location" });
  await expect(group.getByRole("button")).toHaveCount(4);

  const magalang = group.getByRole("button", { name: /^Magalang/ });
  await magalang.hover();
  await expect(explorer.locator('path[data-active="true"]')).toHaveCount(1);
  await magalang.click();
  await expect(
    explorer.getByRole("heading", { level: 3, name: "Magalang" }),
  ).toBeVisible();
  await expect(explorer.getByText("0 properties").first()).toBeVisible();
  await expect(
    explorer.getByRole("link", { name: "Explore location" }),
  ).toHaveAttribute("href", "/locations/magalang");

  // Clicking the map selects too, while the map itself stays out of the focus order.
  await explorer.locator('path[data-featured="true"]').first().click();
  await expect(group.getByRole("button", { pressed: true })).toHaveCount(1);
  await expect(
    explorer.locator("svg[aria-hidden='true'] :is(a, button, [tabindex])"),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "OCHA/NAMRIA/PSA" })).toBeVisible();
});

test("fixtures are never served by the production build", async ({ page }) => {
  await open(page, "/locations?locationsFixture=many");
  // Real data only: the fixture API's nine homes, not the fixture's invented twelve.
  await expect(
    page
      .locator("#featured-locations")
      .getByRole("link", { name: /Angeles City/ })
      .first(),
  ).toContainText("9 properties");
  await expect(page.getByText("12 properties")).toHaveCount(0);
  await expect(page.getByLabel("Preview (development only)")).toHaveCount(0);
  const html = await page.content();
  expect(html).not.toContain("fixtureLocationsInventory");
  expect(html).not.toContain("fixture-locations-");
});

test("Locations actions share the up-right to right arrow and rolling label", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, "/locations");
  const angle = (locator: ReturnType<Page["locator"]>) =>
    locator
      .locator("svg")
      .first()
      .evaluate((svg) => {
        const { transform } = getComputedStyle(svg);
        if (transform === "none") return 0;
        const matrix = new DOMMatrix(transform);
        return Math.round((Math.atan2(matrix.b, matrix.a) * 180) / Math.PI);
      });
  const rolled = (locator: ReturnType<Page["locator"]>) =>
    locator
      .locator(".cta-roll__track")
      .first()
      .evaluate((track) => {
        const { transform } = getComputedStyle(track);
        return transform === "none" ? 0 : new DOMMatrix(transform).m42;
      });

  const targets = [
    page.getByRole("link", { name: "Explore locations" }),
    page
      .locator("#featured-locations article")
      .getByRole("link", { name: /Angeles City/ }),
    page
      .locator('section[aria-labelledby="explorer-title"]')
      .getByRole("link", { name: "Explore location" }),
  ];
  for (const target of targets) {
    await target.scrollIntoViewIfNeeded();
    expect(await angle(target)).toBe(-45);
    expect(await rolled(target)).toBe(0);
    await target.hover();
    await expect.poll(() => angle(target)).toBe(0);
    await expect.poll(() => rolled(target)).toBeLessThan(0);
    await page.mouse.move(0, 0);
    await expect.poll(() => angle(target)).toBe(-45);
    // Keyboard focus gives the same treatment.
    await target.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(target).toBeFocused();
    await expect.poll(() => angle(target)).toBe(0);
    await target.blur();
  }
});

test("the Locations page keeps its arrows and labels still under reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, "/locations");
  const tile = page
    .locator("#featured-locations")
    .getByRole("link", { name: /Angeles City/ })
    .first();
  await tile.scrollIntoViewIfNeeded();
  await tile.hover();
  await page.waitForTimeout(400);
  expect(
    await tile.locator("svg").evaluate((svg) => getComputedStyle(svg).transform),
  ).toMatch(/^matrix\(0\.70/);
});

for (const width of [320, 390, 768, 1024, 1088, 1280, 1440]) {
  test(`locations fits without horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page, "/locations");
    await page.locator("#featured-locations").scrollIntoViewIfNeeded();
    const geometry = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - innerWidth,
      tiles: [...document.querySelectorAll("#featured-locations article")].map((el) => {
        const box = el.getBoundingClientRect();
        return {
          left: box.left,
          right: box.right,
          width: box.width,
          height: box.height,
        };
      }),
    }));
    expect(geometry.overflow).toBeLessThanOrEqual(0);
    expect(geometry.tiles).toHaveLength(4);
    for (const tile of geometry.tiles) {
      expect(tile.left).toBeGreaterThanOrEqual(0);
      expect(tile.right).toBeLessThanOrEqual(width + 1);
      expect(tile.height).toBeGreaterThan(200);
    }
    // Tiles never overlap each other.
    const boxes = await page
      .locator("#featured-locations article")
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect()));
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        const overlap =
          a.left < b.right - 1 &&
          b.left < a.right - 1 &&
          a.top < b.bottom - 1 &&
          b.top < a.bottom - 1;
        expect(overlap, `tiles ${i} and ${j}`).toBe(false);
      }
    }
  });
}
