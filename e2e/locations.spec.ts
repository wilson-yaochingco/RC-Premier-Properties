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
  await expect(featured.getByRole("link")).toHaveCount(0);
  for (const { name, slug } of FEATURED) {
    const tile = featured.locator(`[data-tile="${slug}"]`);
    await expect(tile.getByRole("heading", { name })).toBeVisible();
    await expect(tile.locator("img")).toHaveAttribute("loading", "lazy");
    await expect(tile.locator("img")).toHaveAttribute("src", /photography-v1/);
  }
  await expect(featured.getByText(/\d+ properties/)).toHaveCount(0);
  await expect(featured.locator("details")).toHaveCount(0);
  await expect(featured.getByText("CC BY-SA")).toHaveCount(0);
  await expect(featured.getByText("Resized & cropped")).toHaveCount(0);
});
test("removed location detail URLs return 404", async ({ page }) => {
  for (const slug of [...FEATURED.map(({ slug }) => slug), "atlantis"]) {
    const response = await open(page, `/locations/${slug}`);
    expect(response?.status(), slug).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "right address",
    );
  }
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
  await expect(
    section.getByRole("heading", { level: 2, name: "Homes worth exploring" }),
  ).toBeVisible();
  await expect(
    section.getByText("Discover currently published properties across Pampanga."),
  ).toBeVisible();
  await expect(
    section.getByRole("link", { name: "Browse all properties" }),
  ).toHaveAttribute("href", "/properties");

  // Homepage cards: three at most, none repeated, each a real detail route.
  const cards = section.locator("[data-featured-property-card]");
  await expect(cards).toHaveCount(1);
  const ids = await cards.evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-property-id")),
  );
  expect(new Set(ids).size).toBe(1);
  await expect(section.getByText("City of San Fernando", { exact: false })).toHaveCount(
    0,
  );
  expect(
    await section.getByText("Angeles City, Pampanga", { exact: false }).count(),
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
  // A wrapping CTA (`cta--wrap`) rolls its label spans instead of the track.
  const rolled = (locator: ReturnType<Page["locator"]>) =>
    locator
      .locator(".cta-roll__track")
      .first()
      .evaluate((track) => {
        const moving =
          getComputedStyle(track).display === "contents"
            ? track.firstElementChild!
            : track;
        const { transform } = getComputedStyle(moving);
        return transform === "none" ? 0 : new DOMMatrix(transform).m42;
      });

  const targets = [
    page
      .locator('section[aria-labelledby="collection-title"]')
      .getByRole("link", { name: "Browse all properties" }),
  ];
  for (const target of targets) {
    await target.scrollIntoViewIfNeeded();
    // Let the scroll entrance finish moving the action before pointing at it: nothing between
    // it and <main> may still be faded or offset by a reveal.
    await expect
      .poll(() =>
        target.evaluate((element) => {
          for (let node: Element | null = element; node && node.tagName !== "MAIN";) {
            const style = getComputedStyle(node);
            if (style.opacity !== "1" || style.transform !== "none") return false;
            node = node.parentElement;
          }
          return true;
        }),
      )
      .toBe(true);
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
    .locator('section[aria-labelledby="collection-title"]')
    .getByRole("link", { name: "Browse all properties" })
    .first();
  await tile.scrollIntoViewIfNeeded();
  await tile.hover();
  await page.waitForTimeout(400);
  expect(
    await tile.locator("svg").evaluate((svg) => getComputedStyle(svg).transform),
  ).toMatch(/^matrix\(0\.70/);
});

for (const width of [320, 390, 768, 1024, 1088, 1280, 1440, 1920]) {
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

test("editorial Locations composition, header and page order across all requested widths", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /hydration|hydrating/i.test(message.text()))
      errors.push(message.text());
  });
  for (const width of [1920, 1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
    await open(page, "/locations");
    const hero = page.locator("section[data-locations-hero]");
    await expect(hero.locator("h1")).toHaveText(
      "Find the right place for your next home in Pampanga",
    );
    const video = hero.locator("video");
    await expect(video).toHaveCount(1);
    await expect(video.locator("source")).toHaveAttribute(
      "src",
      "/media/locations-hero.mp4",
    );
    await expect(hero.locator("img, figure")).toHaveCount(0);
    await expect(video).toHaveCSS("object-fit", "cover");
    await expect(video).toHaveAttribute("data-ready", "true");
    const heading = (await hero.locator("h1").boundingBox())!;
    const film = (await video.boundingBox())!;
    const frame = (await hero.boundingBox())!;
    const paragraph = (await hero.locator("p").boundingBox())!;
    expect(film.width).toBeGreaterThanOrEqual(frame.width);
    expect(film.height).toBeGreaterThanOrEqual(frame.height);
    expect(heading.x).toBeLessThan(width * 0.07);
    expect(heading.y).toBeGreaterThan(400);
    if (width >= 768) {
      expect(paragraph.x).toBeGreaterThan(width * 0.65);
      expect(paragraph.y).toBeGreaterThan(heading.y);
      expect(heading.x + heading.width).toBeLessThanOrEqual(paragraph.x);
    } else expect(paragraph.y).toBeGreaterThan(heading.y + heading.height);
    await expect(page.locator('header[data-locations-hero="true"]')).toHaveAttribute(
      "data-sticky",
      "false",
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    const order = await page
      .locator("main > section")
      .evaluateAll((sections) =>
        sections.map((section) => section.getAttribute("aria-labelledby")),
      );
    expect(order.slice(0, 5)).toEqual([
      "locations-title",
      "locations-statement-title",
      "featured-title",
      "collection-title",
      "locations-guidance-title",
    ]);
    await expect(
      page.locator('[aria-labelledby="locations-guidance-title"] article'),
    ).toHaveCount(3);
    await page.screenshot({ path: testInfo.outputPath(`locations-hero-${width}.png`) });
    if (width === 1440 || width === 390)
      await page.screenshot({
        path: testInfo.outputPath(`locations-full-${width}.png`),
        fullPage: true,
      });
    await page.locator("#featured-locations").scrollIntoViewIfNeeded();
    await expect(page.locator('header[data-locations-hero="true"]')).toHaveAttribute(
      "data-sticky",
      "true",
    );
  }
  expect(errors).toEqual([]);
});

test("Locations motion keeps text geometry stable and hydrates streamed cards safely", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydration|hydrating|server rendered/i.test(message.text())
    )
      errors.push(message.text());
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page, "/locations");
  await page.evaluate(() => document.fonts.ready);
  const heroLines = page.locator("[data-locations-hero] h1 > span");
  const geometry = () =>
    heroLines.evaluateAll((lines) =>
      lines.map((line) => {
        const box = line.getBoundingClientRect();
        return [box.x, box.y, box.width, box.height];
      }),
    );
  const initial = await geometry();
  await expect
    .poll(() =>
      page
        .locator("[data-location-line]")
        .first()
        .evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m42),
    )
    .toBe(0);
  expect(await geometry()).toEqual(initial);
  expect(
    await heroLines.evaluateAll((lines) =>
      lines.every(
        (line) =>
          line.querySelector("span")!.getBoundingClientRect().height <
          parseFloat(getComputedStyle(line).lineHeight) * 1.1,
      ),
    ),
  ).toBe(true);
  const statement = page.locator('[aria-labelledby="locations-statement-title"]');
  const lines = statement.locator("h2 > span");
  const before = await lines.evaluateAll((lines) =>
    lines.map((line) => line.getBoundingClientRect().height),
  );
  await statement.scrollIntoViewIfNeeded();
  await expect(statement).toHaveAttribute("data-scrub", "on");
  await expect
    .poll(() =>
      statement
        .locator("[data-char]")
        .last()
        .evaluate((element) =>
          Number((element as HTMLElement).style.getPropertyValue("--fill")),
        ),
    )
    .toBe(1);
  expect(
    await lines.evaluateAll((lines) =>
      lines.map((line) => line.getBoundingClientRect().height),
    ),
  ).toEqual(before);
  await page.locator("#collection-title").scrollIntoViewIfNeeded();
  await expect(
    page.locator(
      '[data-motion-gate="locations-featured"] [data-featured-property-card]',
    ),
  ).toHaveCount(1);
  await page.locator("#locations-guidance-title").scrollIntoViewIfNeeded();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("[data-location-line]").first()).toHaveCSS(
    "transform",
    "none",
  );
  expect(errors).toEqual([]);
});

test("Locations header attaches after navigation from another cinematic page", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/about");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.getByRole("link", { name: "Locations", exact: true }).click();
  await expect(page).toHaveURL(/\/locations$/);
  const header = page.locator('header[data-locations-hero="true"]');
  await expect(header).toHaveAttribute("data-sticky", "false");
  await expect(
    page.getByRole("button", { name: "Menu", exact: true }),
  ).toBeInViewport();
  await page.locator("#featured-locations").scrollIntoViewIfNeeded();
  await expect(header).toHaveAttribute("data-sticky", "true");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(header).toHaveAttribute("data-sticky", "false");
});

test("Locations film and descenders remain correct during real hero playback", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
    viewport: { width: 1440, height: 1000 },
    recordVideo: {
      dir: testInfo.outputPath("hero-playback"),
      size: { width: 1440, height: 1000 },
    },
  });
  const page = await context.newPage();
  try {
    const films = new Set<string>();
    page.on("request", (request) => {
      if (request.url().includes(".mp4")) films.add(new URL(request.url()).pathname);
    });
    await open(page, "/locations");
    const hero = page.locator("section[data-locations-hero]");
    const lines = hero.locator("h1 > span");
    const before = await lines.evaluateAll((lines) =>
      lines.map((line) => {
        const box = line.getBoundingClientRect();
        return [box.x, box.y, box.width, box.height];
      }),
    );
    for (const frame of [0, 1, 2, 3, 4]) {
      await page.screenshot({
        path: testInfo.outputPath(`locations-entrance-${frame}.png`),
      });
      await page.waitForTimeout(300);
    }
    expect(
      await lines.evaluateAll((lines) =>
        lines.map((line) => {
          const box = line.getBoundingClientRect();
          return [box.x, box.y, box.width, box.height];
        }),
      ),
    ).toEqual(before);
    const ink = await hero.locator("[data-location-line]").evaluateAll((lines) =>
      lines.map((line) => {
        const element = line as HTMLElement;
        const style = getComputedStyle(element);
        const canvas = document.createElement("canvas").getContext("2d")!;
        canvas.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const metrics = canvas.measureText(element.textContent!);
        const rect = element.getBoundingClientRect();
        const mask = element.parentElement!.getBoundingClientRect();
        const baseline =
          rect.top +
          (parseFloat(style.lineHeight) -
            metrics.fontBoundingBoxAscent -
            metrics.fontBoundingBoxDescent) /
            2 +
          metrics.fontBoundingBoxAscent;
        return {
          bottomSpace: mask.bottom - baseline - metrics.actualBoundingBoxDescent,
          topSpace: baseline - metrics.actualBoundingBoxAscent - mask.top,
        };
      }),
    );
    expect(ink.every((line) => line.bottomSpace >= 1 && line.topSpace >= 0)).toBe(true);
    const video = hero.locator("video");
    await expect
      .poll(() =>
        video.evaluate(
          (element: HTMLVideoElement) => element.readyState >= 2 && !element.paused,
        ),
      )
      .toBe(true);
    expect(
      await video.evaluate((element: HTMLVideoElement) => [
        element.videoWidth,
        element.videoHeight,
        element.duration,
        element.muted,
        element.loop,
        element.playsInline,
      ]),
    ).toEqual([1920, 1080, 11.3, true, true, true]);
    expect([...films]).toEqual(["/media/locations-hero.mp4"]);
    await video.evaluate(
      (element: HTMLVideoElement) =>
        new Promise<void>((resolve) => {
          element.addEventListener("seeked", () => resolve(), { once: true });
          element.currentTime = element.duration - 0.2;
        }),
    );
    await expect
      .poll(() =>
        video.evaluate(
          (element: HTMLVideoElement) => element.currentTime < 2 && !element.paused,
        ),
      )
      .toBe(true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect
      .poll(() =>
        video.evaluate(
          (element: HTMLVideoElement) => element.paused && element.currentTime === 0,
        ),
      )
      .toBe(true);
  } finally {
    await context.close();
  }
});

test("Locations measured typography and mobile centering match the editorial layout", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1920, 1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
    await open(page, "/locations");
    await page.evaluate(() => document.fonts.ready);
    const statement = page.locator('[aria-labelledby="locations-statement-title"]');
    await expect(statement.locator("p")).toHaveCount(1);
    await expect(statement.locator("h2 > span")).toHaveCount(4);
    const title = page.locator("#locations-statement-title");
    await expect(title).toHaveText(
      "Finding the right home begins with understanding the places and people and the everyday moments that make a community feel like home to you",
    );
    const guide = page.locator("#locations-guidance-title");
    const font = await guide.evaluate((element) => {
      const style = getComputedStyle(element);
      const family = style.fontFamily.split(",")[0];
      return { family, loaded: document.fonts.check(`500 72px ${family}`) };
    });
    expect(font.family).toContain("generalSans");
    expect(font.loaded).toBe(true);
    if (width >= 768) {
      const bounds = await title.evaluate(
        (element) => element.getBoundingClientRect().width,
      );
      const linesFit = await title.locator(":scope > span").evaluateAll((lines) =>
        lines.map((line) => {
          const range = document.createRange();
          range.selectNodeContents(line);
          return {
            width: range.getBoundingClientRect().width,
            height: line.getBoundingClientRect().height,
            expected: parseFloat(getComputedStyle(line).lineHeight),
          };
        }),
      );
      expect(linesFit).toHaveLength(4);
      expect(
        linesFit.every(
          (line) =>
            line.width <= bounds + 1 && Math.abs(line.height - line.expected) < 1,
        ),
      ).toBe(true);
      const grid = await page.locator("[data-guide-row-content]").evaluateAll((rows) =>
        rows.map((row) => {
          const number = row.querySelector("span")!.getBoundingClientRect();
          const heading = row.querySelector("h3")!.getBoundingClientRect();
          return {
            gap: (heading.left - number.left) / row.getBoundingClientRect().width,
            x: heading.left,
            top: Math.abs(heading.top - number.top),
          };
        }),
      );
      expect(grid.every((row) => row.gap > 0 && row.top < 1)).toBe(true);
      expect(new Set(grid.map((row) => row.x)).size).toBe(1);
    }
    if (width >= 1440) {
      const statementSize = await title.evaluate((element) =>
        parseFloat(getComputedStyle(element).fontSize),
      );
      // Scaled with the viewport (5.2vw) so the four lines never overflow at 1440.
      expect(statementSize).toBeGreaterThanOrEqual(72);
      expect(statementSize).toBeLessThanOrEqual(90);
      const eyebrowSize = await statement
        .locator("p")
        .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
      expect(eyebrowSize).toBeGreaterThanOrEqual(16);
      expect(eyebrowSize).toBeLessThanOrEqual(18);
      const lines = await title.locator(":scope > span").evaluateAll((lines) =>
        lines.map((line) => ({
          height: line.getBoundingClientRect().height,
          line: parseFloat(getComputedStyle(line).lineHeight),
        })),
      );
      expect(lines.every((line) => Math.abs(line.height - line.line) < 1)).toBe(true);
      const inkWidths = await title.locator(":scope > span").evaluateAll((lines) =>
        lines.map((line) => {
          const range = document.createRange();
          range.selectNodeContents(line);
          return range.getBoundingClientRect().width;
        }),
      );
      expect(Math.min(...inkWidths)).toBeGreaterThan(1040);
      expect(Math.max(...inkWidths) / Math.min(...inkWidths)).toBeLessThan(1.25);
      await expect(guide).toHaveCSS("font-size", "72px");
      await expect(guide).toHaveCSS("line-height", "75.6px");
      await expect(guide).toHaveCSS("font-weight", "450");
      const guideLines = await guide
        .locator("span")
        .evaluateAll((lines) =>
          lines.map((line) => line.getBoundingClientRect().height),
        );
      expect(guideLines).toHaveLength(3);
      expect(guideLines.every((height) => Math.abs(height - 75.6) < 1)).toBe(true);
      const guideTop = (await guide.locator("span").first().boundingBox())!.y;
      const rowTop = (await page
        .locator('[aria-labelledby="locations-guidance-title"] h3')
        .first()
        .boundingBox())!.y;
      expect(Math.abs(guideTop - rowTop)).toBeLessThan(2);
      const rows = page.locator('[aria-labelledby="locations-guidance-title"] h3');
      await expect(rows).toHaveCount(3);
      for (const row of await rows.all()) {
        await expect(row.locator("span")).toHaveCount(2);
        const geometry = await row.locator("span").evaluateAll((lines) =>
          lines.map((line) => ({
            height: line.getBoundingClientRect().height,
            line: parseFloat(getComputedStyle(line).lineHeight),
          })),
        );
        expect(geometry.every((line) => Math.abs(line.height - line.line) < 1)).toBe(
          true,
        );
      }
      expect(
        await statement.evaluate((element) =>
          parseFloat(getComputedStyle(element).paddingTop),
        ),
      ).toBeGreaterThanOrEqual(200);
    }
    if (width < 768) {
      await expect(guide).toHaveCSS("text-align", "center");
      await expect(page.locator("#collection-title")).toHaveCSS("text-align", "center");
      await expect(page.locator("[data-locations-hero] h1")).toHaveCSS(
        "text-align",
        "start",
      );
      const action = (await page
        .getByRole("link", { name: "Browse all properties", exact: true })
        .boundingBox())!;
      expect(Math.abs(action.x + action.width / 2 - width / 2)).toBeLessThan(1);
      const cardLabel = page.locator('[data-tile="angeles-city"] h3');
      await expect(cardLabel).toHaveCSS("text-align", "left");
    }
    for (const tile of await page.locator("[data-tile]").all()) {
      await expect(tile.locator("h3")).toHaveCSS("text-align", "left");
      await expect(tile.locator('[class*="tileText"]')).toHaveCSS("text-align", "left");
      await expect(tile.getByRole("link")).toHaveCount(0);
    }
    await page.locator("#featured-locations").scrollIntoViewIfNeeded();
    await page
      .locator("#featured-locations img")
      .evaluateAll((images) =>
        Promise.all(images.map((image) => (image as HTMLImageElement).decode())),
      );
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect(page.locator('header[data-locations-hero="true"]')).toHaveAttribute(
      "data-sticky",
      "false",
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`locations-measured-${width}.png`),
      fullPage: true,
    });
  }
});

test("Home and Locations share featured inventory without changing Home copy or count", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "/");
  const home = page.locator('section[aria-labelledby="featured-heading"]');
  await expect(home.getByRole("heading", { level: 2 })).toHaveText(
    "Featured homes across Pampanga.",
  );
  await expect(home.getByText("Featured properties", { exact: true })).toHaveCount(1);
  await expect(
    home.getByRole("link", { name: "Explore properties", exact: true }),
  ).toHaveCount(1);
  const records = await home
    .locator("[data-featured-property-card]")
    .evaluateAll((cards) => cards.map((card) => card.getAttribute("data-property-id")));
  expect(records).toHaveLength(1);
  await open(page, "/locations");
  const locations = page.locator('section[aria-labelledby="collection-title"]');
  await expect(locations).toHaveAttribute("data-motion-gate", "locations-featured");
  expect(
    await locations
      .locator("[data-featured-property-card]")
      .evaluateAll((cards) =>
        cards.map((card) => card.getAttribute("data-property-id")),
      ),
  ).toEqual(records);
  await expect(locations.getByRole("heading", { level: 2 })).toHaveText(
    "Homes worth exploring",
  );
});

test("Locations uses the Home scroll fill progressively and reversibly without reflow", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page, "/locations");
  await page.evaluate(() => document.fonts.ready);
  const section = page.locator('[aria-labelledby="locations-statement-title"]');
  await expect(section).toHaveAttribute("data-scrub", "on");
  const heading = section.locator("h2");
  const top = await heading.evaluate(
    (element) => element.getBoundingClientRect().top + scrollY,
  );
  const heights = () =>
    heading
      .locator(":scope > span")
      .evaluateAll((lines) => lines.map((line) => line.getBoundingClientRect().height));
  const before = await heights();
  const samples: number[] = [];
  for (const fraction of [0, 0.35, 0.7, 1, 0.35, 0]) {
    await page.evaluate(
      ({ top, fraction }) =>
        window.scrollTo({
          top: top - innerHeight * 0.85 + innerHeight * 0.5 * fraction,
          behavior: "instant",
        }),
      { top, fraction },
    );
    await page.waitForTimeout(150);
    samples.push(
      await heading
        .locator("[data-char]")
        .evaluateAll(
          (chars) =>
            chars.reduce(
              (sum, char) =>
                sum + Number((char as HTMLElement).style.getPropertyValue("--fill")),
              0,
            ) / chars.length,
        ),
    );
    expect(await heights()).toEqual(before);
    await page.screenshot({ path: testInfo.outputPath(`fill-${samples.length}.png`) });
  }
  expect(samples[0]).toBeLessThan(0.01);
  expect(samples[1]).toBeGreaterThan(samples[0]);
  expect(samples[2]).toBeGreaterThan(samples[1]);
  expect(samples[3]).toBeGreaterThan(0.99);
  expect(samples[4]).toBeLessThan(samples[3]);
  expect(samples[5]).toBeLessThan(0.01);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(heading.locator("[data-char]").first()).toHaveCSS(
    "color",
    await heading.evaluate((element) => getComputedStyle(element).color),
  );
});

test("Locations statement remains fully readable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto("http://127.0.0.1:3100/locations");
    const section = page.locator('[aria-labelledby="locations-statement-title"]');
    await expect(section).toHaveAttribute("data-scrub", "off");
    await expect(section.locator("h2")).toBeVisible();
    expect(
      await section
        .locator("[data-char]")
        .first()
        .evaluate((element) =>
          getComputedStyle(element).getPropertyValue("--fill").trim(),
        ),
    ).toBe("1");
  } finally {
    await context.close();
  }
});
