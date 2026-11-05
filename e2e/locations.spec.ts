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

test("the four curated locations stay visible without inventory labels", async ({
  page,
}) => {
  await open(page, "/locations");
  const featured = page.locator("#featured-locations");
  await expect(featured.getByRole("article")).toHaveCount(4);
  for (const { name, slug } of FEATURED) {
    await expect(
      featured.getByRole("link", { name: new RegExp(name) }).first(),
    ).toHaveAttribute("href", `/locations/${slug}`);
  }
  await expect(featured.getByText(/\d+ properties/)).toHaveCount(0);
  await expect(featured.locator("details")).toHaveCount(0);
  await expect(featured.getByText("CC BY-SA")).toHaveCount(0);
  await expect(featured.getByText("Resized & cropped")).toHaveCount(0);
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

test("Section 2 stands on its own without a visible heading or eyebrow", async ({
  page,
}) => {
  await open(page, "/locations");
  const featured = page.locator("#featured-locations");
  // The heading stays in the outline for assistive technology only.
  const heading = featured.getByRole("heading", {
    level: 2,
    name: "Featured locations",
  });
  await expect(heading).toHaveCount(1);
  await expect(heading).not.toBeInViewport();
  await expect(page.getByText("Four places to start your search.")).toHaveCount(0);
  await expect(page.getByText("Featured locations", { exact: true })).toHaveCount(1);
});

test("the search section is removed", async ({ page }) => {
  await open(page, "/locations");
  await expect(page.getByRole("search")).toHaveCount(0);
  await expect(page.getByText("Discover by what matters")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Find properties" })).toHaveCount(0);
});

test("homes worth exploring shows real published properties", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, "/locations");
  const section = page.locator('section[aria-labelledby="collection-title"]');
  await expect(section.getByText("Current collection")).toBeVisible();
  await expect(
    section.getByRole("heading", { level: 2, name: "Homes worth exploring." }),
  ).toBeVisible();
  await expect(
    section.getByText("Discover currently published properties across Pampanga."),
  ).toBeVisible();
  await expect(
    section.getByRole("link", { name: "Browse all properties" }),
  ).toHaveAttribute("href", "/properties");

  // Homepage cards: three at most, none repeated, each a real detail route.
  const cards = section.locator("[data-featured-property-card]");
  await expect(cards).toHaveCount(3);
  const ids = await cards.evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-property-id")),
  );
  expect(new Set(ids).size).toBe(3);
  await expect(section.getByText("City of San Fernando", { exact: false })).toHaveCount(
    0,
  );
  expect(
    await section.getByText("Angeles City, Pampanga", { exact: true }).count(),
  ).toBeGreaterThan(0);
  const lead = cards.first();
  await expect(lead).toHaveAttribute("href", /^\/properties\/[^?]+$/);
  await expect(section.getByText(/Showing the latest/)).toHaveCount(0);
  await expect(section.getByText(/₱/).first()).toBeVisible();
  await expect(section.getByText("Collection unavailable")).toHaveCount(0);

  await lead.focus();
  await expect(lead).toBeFocused();
  await lead.press("Enter");
  await expect(page).toHaveURL(/\/properties\/.+/);
});

test("fixtures are never served by the production build", async ({ page }) => {
  await open(page, "/locations?locationsFixture=many");
  await expect(page.getByLabel("Preview (development only)")).toHaveCount(0);
  await expect(page.locator('[data-property-id^="fixture-locations-"]')).toHaveCount(0);
  await expect(page.locator('[data-property-id^="fixture-featured-"]')).toHaveCount(0);
  await expect(page.getByText(/Design preview:/)).toHaveCount(0);
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
      .locator('section[aria-labelledby="collection-title"]')
      .getByRole("link", { name: "Browse all properties" }),
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
