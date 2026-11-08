import { expect, test, type Page } from "@playwright/test";
import {
  PRICE_SLIDER_STEPS,
  priceToProgress,
} from "../frontend/src/features/properties/property-price-filter";

const filter = (page: Page, name: string) =>
  page.getByRole("button", { name: new RegExp(`^${name}`) }).first();
const search = (page: Page) =>
  page.getByRole("button", { name: "Search", exact: true });
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

const noOverflow = () =>
  document.documentElement.scrollWidth <= document.documentElement.clientWidth;

test("desktop choices close immediately, restore focus and apply together", async ({
  page,
}) => {
  await page.goto("/properties?propertyType=house-and-lot&sort=price-asc");
  await filter(page, "Location").click();
  const location = page.getByRole("dialog", { name: "Location" });
  await expect(location.getByRole("button", { name: "Done" })).toHaveCount(0);
  await location.getByRole("button", { name: "Angeles City", exact: true }).click();
  await expect(location).not.toBeVisible();
  await expect(filter(page, "Location")).toBeFocused();
  await filter(page, "Bedrooms").click();
  const bedrooms = page.getByRole("dialog", { name: "Bedrooms" });
  await bedrooms.getByRole("button", { name: "4 bedrooms", exact: true }).click();
  await expect(bedrooms).not.toBeVisible();
  await expect(filter(page, "Bedrooms")).toBeFocused();
  await filter(page, "Price Range").click();
  await page.getByLabel("Minimum price (PHP)").fill("10000000");
  await page.getByLabel("Maximum price (PHP)").fill("13000000");
  await expect(page.getByLabel("Minimum price (PHP)")).toHaveValue("10,000,000");
  await expect(page.getByRole("dialog", { name: "Price Range" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).not.toHaveURL(/bedrooms=/);
  await search(page).click();
  await expect(page).toHaveURL(/bedrooms=4/);
  expect(Object.fromEntries(new URL(page.url()).searchParams)).toMatchObject({
    location: "Angeles City",
    bedrooms: "4",
    minPrice: "10000000",
    maxPrice: "13000000",
    propertyType: "house-and-lot",
    sort: "price-asc",
  });
  await expect(page.locator("[data-property-card]")).toHaveCount(1);
  await page.reload();
  await expect(filter(page, "Price Range")).toContainText("₱13,000,000");
});

test("Any price stays unfiltered and empty curated locations remain selectable", async ({
  page,
}) => {
  await page.goto("/properties");
  await expect(filter(page, "Price Range")).toContainText("Any price");
  await search(page).click();
  await expect(page).not.toHaveURL(/minPrice=|maxPrice=/);
  await filter(page, "Location").click();
  const dialog = page.getByRole("dialog", { name: "Location" });
  for (const name of [
    "All Locations",
    "Angeles City",
    "Mabalacat City",
    "Magalang",
    "Porac",
  ])
    await expect(dialog.getByRole("button", { name, exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Porac", exact: true }).click();
  await search(page).click();
  await expect(page).toHaveURL(/location=Porac/);
  await expect(page.locator('[data-catalog-state="empty"]')).toBeVisible();
});

test("whole-peso formatting, validation and canonical query values agree", async ({
  page,
}) => {
  await page.goto("/properties");
  await filter(page, "Price Range").click();
  const minimum = page.getByLabel("Minimum price (PHP)");
  const maximum = page.getByLabel("Maximum price (PHP)");
  await maximum.fill("18213237.76");
  await expect(maximum).toHaveValue("18,213,238");
  await expect(
    page.getByRole("slider", { name: "Maximum price slider" }),
  ).toHaveAttribute("aria-valuetext", "₱18,213,238");
  await minimum.fill("-1");
  await page.keyboard.press("Escape");
  await search(page).click();
  await expect(page).not.toHaveURL(/minPrice=/);
  await expect(minimum).toBeFocused();
  await expect(minimum).toHaveAttribute("aria-invalid", "true");
  await minimum.fill("20000000");
  await expect(
    page.getByRole("dialog", { name: "Price Range" }).getByRole("alert"),
  ).toContainText("Maximum price");
  await page.getByRole("button", { name: "Clear price range" }).click();
  await maximum.fill("18213237.76");
  await page.keyboard.press("Escape");
  await search(page).click();
  await expect(page).toHaveURL(/maxPrice=18213238/);
  await page.goto("/properties?maxPrice=18213237.76");
  await expect(page).toHaveURL(/maxPrice=18213238/);
  await page.goto("/properties?minPrice=8.9e6");
  await expect(page).toHaveURL(/minPrice=8900000/);
});

test("range handles use useful increments with mouse and keyboard", async ({
  page,
}) => {
  await page.goto("/properties");
  await filter(page, "Price Range").click();
  const low = page.getByRole("slider", { name: "Minimum price slider" });
  const high = page.getByRole("slider", { name: "Maximum price slider" });
  await expect(low).toHaveAttribute("aria-valuemin", "0");
  await expect(high).toHaveAttribute("aria-valuemax", "100000000");
  await low.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("Minimum price (PHP)")).toHaveValue("250,000");
  await high.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByLabel("Maximum price (PHP)")).toHaveValue("99,000,000");
  await page.getByRole("button", { name: "Clear price range" }).click();
  const rect = (await page.locator('[class*="rangeControl"]').boundingBox())!;
  await page.mouse.move(rect.x + 9, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width * 0.3, rect.y + rect.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  const amount = Number(
    (await page.getByLabel("Minimum price (PHP)").inputValue()).replaceAll(",", ""),
  );
  expect(amount).toBeGreaterThan(1000000);
  expect(amount % 250000).toBe(0);
  await low.focus();
  await page.keyboard.press("End");
  await high.focus();
  await page.keyboard.press("Home");
  expect(Number(await low.getAttribute("aria-valuenow"))).toBeLessThanOrEqual(
    Number(await high.getAttribute("aria-valuenow")),
  );
  await page.mouse.move(rect.x + rect.width - 9, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width * 0.5, rect.y + rect.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  expect(Number(await low.getAttribute("aria-valuenow"))).toBeLessThan(100000000);
});

test("chip keyboard navigation and popover dismissal remain accessible", async ({
  page,
}) => {
  await page.goto("/properties");
  const location = filter(page, "Location");
  await location.focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    page
      .getByRole("dialog", { name: "Location" })
      .getByRole("button", { name: "All Locations", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(location).toBeFocused();
  await expect(location).toContainText("Angeles City");
  await location.click();
  await page.keyboard.press("Escape");
  await expect(location).toBeFocused();
  await filter(page, "Price Range").click();
  await page.locator("h1").click();
  await expect(page.getByRole("dialog", { name: "Price Range" })).not.toBeVisible();
});

test("all requested widths have correct proportions and readable controls", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1920, 1440, 1024, 768, 390, 375, 320]) {
    const height = width < 768 ? 844 : 1080;
    await page.setViewportSize({ width, height });
    await page.goto("/properties");
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(noOverflow), `${width}px overflow`).toBe(true);
    if (width >= 768) {
      const button = (await search(page).boundingBox())!;
      expect(button.width).toBeGreaterThanOrEqual(140);
      expect(button.width).toBeLessThanOrEqual(160);
      for (const name of ["Location", "Bedrooms", "Price Range"]) {
        await filter(page, name).click();
        const dialog = page.getByRole("dialog", { name });
        await expect(dialog.getByRole("button", { name: "Done" })).toHaveCount(0);
        if (name === "Location") {
          expect(await dialog.getByRole("button").allTextContents()).toEqual([
            "All Locations",
            "Angeles City",
            "Porac",
            "Magalang",
            "Mabalacat City",
          ]);
          if (width >= 1440) {
            const chips = await dialog
              .getByRole("button")
              .evaluateAll((elements) =>
                elements.map((element) => element.getBoundingClientRect().top),
              );
            expect(chips[0]).toBe(chips[1]);
            expect(chips[1]).toBe(chips[2]);
            expect(chips[3]).toBeGreaterThan(chips[2]);
            expect(chips[4]).toBe(chips[3]);
          }
        }
        if (name === "Bedrooms") {
          await expect(
            dialog.getByRole("button", { name: "5 bedrooms", exact: true }),
          ).toBeVisible();
          await expect(
            dialog.getByRole("button", { name: "All", exact: true }),
          ).toBeVisible();
          await expect(dialog.getByRole("button", { name: /Studio/ })).toHaveCount(0);
          const rows = await dialog
            .getByRole("button")
            .evaluateAll((buttons) =>
              buttons.map((button) => button.getBoundingClientRect().top),
            );
          expect(new Set(rows.slice(0, 4)).size).toBe(1);
          expect(rows[4]).toBe(rows[5]);
          expect(rows[4]).toBeGreaterThan(rows[0]);
        }
        if (name === "Price Range") {
          const motif = dialog.locator("[data-price-motif]");
          await expect(motif).toBeVisible();
          await expect(motif).toHaveAttribute("aria-hidden", "true");
          expect(await motif.locator("span").count()).toBe(11);
          expect(
            await motif.locator("span").evaluateAll((bars) =>
              bars.every((bar) => {
                const box = bar.getBoundingClientRect();
                return (
                  getComputedStyle(bar).visibility === "hidden" ||
                  (box.width >= 2 && box.height >= 8)
                );
              }),
            ),
          ).toBe(true);
          const clear = dialog.getByRole("button", { name: "Clear price range" });
          await expect(clear).toBeDisabled();
          const heading = (await dialog.getByRole("heading").boundingBox())!;
          const action = (await clear.boundingBox())!;
          if (width >= 1024)
            expect(
              Math.abs(heading.y + heading.height / 2 - action.y - action.height / 2),
            ).toBeLessThan(1);
          await expect(dialog).toHaveCSS("border-radius", "0px");
          await expect(dialog.locator('[class*="rangeLabels"]')).toHaveCount(0);
        }
        const box = (await dialog.boundingBox())!;
        const field = (await filter(page, name).boundingBox())!;
        if (name === "Location")
          expect(Math.abs(box.width - field.width)).toBeLessThan(1);
        else expect(box.width).toBeGreaterThanOrEqual(field.width);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        expect(Math.abs(field.y - box.y - box.height - 12)).toBeLessThan(1);
        expect(
          await dialog.evaluate(
            (element) => element.scrollWidth <= element.clientWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: testInfo.outputPath(`${name.replace(" ", "-")}-${width}.png`),
        });
        await page.keyboard.press("Escape");
      }
    } else {
      await expect(
        page.getByRole("button", { name: "Start Search", exact: true }),
      ).toBeVisible();
      const start = page.getByRole("button", { name: "Start Search", exact: true });
      const startBox = (await start.boundingBox())!;
      const headline = (await page.locator("h1").boundingBox())!;
      expect(startBox.width).toBeLessThan(width - 60);
      expect(startBox.height).toBeGreaterThanOrEqual(48);
      expect(Math.abs(startBox.x - headline.x)).toBeLessThan(1);
      await start.click();
      const drawer = page.getByRole("dialog", {
        name: "Filters",
        exact: true,
      });
      await expect(drawer).toBeVisible();
      const fullBox = (await drawer.boundingBox())!;
      expect(fullBox.x).toBe(0);
      expect(fullBox.y).toBe(0);
      expect(fullBox.width).toBe(width);
      expect(fullBox.height).toBe(height);
      await expect(drawer).toHaveCSS("border-radius", "0px");
      await expect(page.locator("body")).toHaveCSS("position", "fixed");
      expect(
        await drawer.evaluate((element) => element.scrollWidth <= element.clientWidth),
      ).toBe(true);
      const footer = (await drawer
        .getByRole("button", { name: "Search", exact: true })
        .boundingBox())!;
      expect(footer.y + footer.height).toBeLessThanOrEqual(height);
      await page.screenshot({ path: testInfo.outputPath(`drawer-${width}.png`) });
      await drawer
        .getByRole("slider", { name: "Minimum price slider" })
        .scrollIntoViewIfNeeded();
      const motif = drawer.locator("[data-price-motif]");
      await expect(motif).toBeVisible();
      expect((await motif.boundingBox())!.height).toBeGreaterThan(40);
      const minimumBox = (await drawer
        .getByLabel("Minimum price (PHP)")
        .boundingBox())!;
      const maximumBox = (await drawer
        .getByLabel("Maximum price (PHP)")
        .boundingBox())!;
      expect(minimumBox.y).toBe(maximumBox.y);
      await drawer.getByLabel("Maximum price (PHP)").scrollIntoViewIfNeeded();
      const headerTitle = drawer.getByRole("heading", { name: "Filters", exact: true });
      const titleBox = (await headerTitle.boundingBox())!;
      expect(Math.abs(titleBox.x + titleBox.width / 2 - width / 2)).toBeLessThan(1);
      await expect(
        drawer.getByRole("button", { name: "Reset filters", exact: true }),
      ).toHaveCSS("border-top-width", "0px");
      await page.screenshot({ path: testInfo.outputPath(`drawer-price-${width}.png`) });
      await page.keyboard.press("Escape");
      await expect(drawer).not.toBeVisible();
      await expect(
        page.getByRole("button", { name: "Start Search", exact: true }),
      ).toBeFocused();
    }
  }
});

test("mobile drawer locks scrolling, retains drafts, resets and applies", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/properties?propertyType=house-and-lot");
  await page.evaluate(() => window.scrollTo({ top: 120, behavior: "instant" }));
  const initialScroll = await page.evaluate(() => window.scrollY);
  const start = page.getByRole("button", { name: "Start Search", exact: true });
  await start.click();
  const drawer = page.getByRole("dialog", { name: "Filters", exact: true });
  const lockedTop = await page.locator("body").evaluate((element) => element.style.top);
  await page.setViewportSize({ width: 390, height: 500 });
  await expect.poll(async () => (await drawer.boundingBox())?.height).toBe(500);
  const keyboardFooter = (await drawer
    .getByRole("button", { name: "Search", exact: true })
    .boundingBox())!;
  expect(keyboardFooter.y + keyboardFooter.height).toBeLessThanOrEqual(500);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.mouse.move(5, 100);
  await page.mouse.wheel(0, 400);
  expect(await page.locator("body").evaluate((element) => element.style.top)).toBe(
    lockedTop,
  );
  await drawer.getByRole("button", { name: "Angeles City", exact: true }).click();
  await drawer.getByRole("button", { name: "4 bedrooms", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible();
  await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(initialScroll);
  await start.click();
  await expect(
    drawer.getByRole("button", { name: "4 bedrooms", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await drawer.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/bedrooms=4/);
  await expect(page).toHaveURL(/location=Angeles/);
  await expect(drawer).not.toBeVisible();
  await start.click();
  await drawer.getByRole("button", { name: "Reset filters", exact: true }).click();
  await drawer.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).not.toHaveURL(/bedrooms=|location=|propertyType=/);
});

test("mobile range responds to touch with whole-peso increments", async ({
  browser,
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3100/properties");
  await page.getByRole("button", { name: "Start Search", exact: true }).tap();
  const slider = page.getByRole("slider", { name: "Minimum price slider" });
  await slider.scrollIntoViewIfNeeded();
  const box = (await page.locator('[class*="rangeControl"]').boundingBox())!;
  const session = await context.newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + 9, y: box.y + box.height / 2 }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: box.x + box.width * 0.3, y: box.y + box.height / 2 }],
  });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  const amount = Number(
    (await page.getByLabel("Minimum price (PHP)").inputValue()).replaceAll(",", ""),
  );
  expect(amount).toBeGreaterThan(1000000);
  expect(amount % 250000).toBe(0);
  await context.close();
});

test("video, filters and drawer hydrate without errors", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydration|hydrating|server rendered/i.test(message.text())
    )
      errors.push(message.text());
  });
  const mediaRequests = new Set<string>();
  page.on("request", (request) => {
    if (request.url().includes(".mp4"))
      mediaRequests.add(new URL(request.url()).pathname);
  });
  await page.goto("/properties");
  const video = page.locator("section[data-properties-hero] video");
  await expect(video).toHaveCount(1);
  await page.waitForLoadState("networkidle");
  await expect
    .poll(() =>
      video.evaluate(
        (element: HTMLVideoElement) => element.readyState >= 2 && !element.paused,
      ),
    )
    .toBe(true);
  await expect(video.locator("source")).toHaveAttribute(
    "src",
    "/media/properties-hero.mp4",
  );
  expect(
    await video.evaluate((element: HTMLVideoElement) => ({
      width: element.videoWidth,
      height: element.videoHeight,
      duration: element.duration,
      muted: element.muted,
      loop: element.loop,
      inline: element.playsInline,
      poster: element.poster,
    })),
  ).toEqual({
    width: 1920,
    height: 1080,
    duration: 20,
    muted: true,
    loop: true,
    inline: true,
    poster: "",
  });
  for (const width of [1920, 1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1080 });
    const hero = (await page.locator("section[data-properties-hero]").boundingBox())!;
    const film = (await video.boundingBox())!;
    expect(film.width).toBeGreaterThanOrEqual(hero.width);
    expect(film.height).toBeGreaterThanOrEqual(hero.height);
    await expect(video).toHaveCSS("object-fit", "cover");
    expect(await page.evaluate(noOverflow)).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`properties-video-${width}.png`),
    });
  }
  expect([...mediaRequests]).toEqual(["/media/properties-hero.mp4"]);
  await video.evaluate(
    (element: HTMLVideoElement) =>
      new Promise<void>((resolve) => {
        element.addEventListener("seeked", () => resolve(), { once: true });
        element.currentTime = 19.7;
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
  await page.setViewportSize({ width: 1440, height: 1080 });
  await filter(page, "Price Range").click();
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Start Search", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Filters" })).not.toBeVisible();
  expect(errors).toEqual([]);
});

test("100M and common manual budgets stay synchronized without applying defaults", async ({
  page,
}) => {
  await page.goto("/properties");
  await filter(page, "Price Range").click();
  const maximum = page.getByLabel("Maximum price (PHP)");
  for (const [amount, display] of [
    ["8750000", "8,750,000"],
    ["21000000", "21,000,000"],
    ["50000000", "50,000,000"],
    ["100000000", "100,000,000"],
  ]) {
    await maximum.fill(amount);
    await expect(maximum).toHaveValue(display);
    await expect(
      page.getByRole("slider", { name: "Maximum price slider" }),
    ).toHaveAttribute("aria-valuenow", amount);
  }
  await page.keyboard.press("Escape");
  await search(page).click();
  await expect(page).toHaveURL(/maxPrice=100000000/);
});

test("mobile drawer opens smoothly over 650ms and closes over 450ms", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/properties");
  const start = page.getByRole("button", { name: "Start Search", exact: true });
  await start.click();
  const drawer = page.getByRole("dialog", { name: "Filters", exact: true });
  await expect(drawer).toHaveCSS("animation-duration", "0.65s");
  const lockedTop = await page.locator("body").evaluate((element) => element.style.top);
  const animation = await drawer.evaluateHandle((element) =>
    element
      .getAnimations()
      .find((item) => (item.effect as KeyframeEffect).target === element)!,
  );
  const positions: number[] = [];
  for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
    await animation.evaluate((item, fraction) => {
      item.pause();
      item.currentTime = 650 * fraction;
    }, fraction);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    positions.push((await drawer.boundingBox())!.y);
    await page.screenshot({
      path: `node_modules/.cache/drawer-entrance-${fraction * 100}.png`,
    });
  }
  expect(positions[0]).toBeGreaterThanOrEqual(843);
  expect(positions[4]).toBe(0);
  for (let index = 1; index < positions.length; index++)
    expect(positions[index]).toBeLessThan(positions[index - 1]);
  await animation.evaluate((item) => item.finish());
  expect(await page.locator("body").evaluate((element) => element.style.top)).toBe(
    lockedTop,
  );
  await drawer.getByRole("button", { name: "Close search" }).click();
  await expect(drawer).toHaveCSS("animation-duration", "0.45s");
  await page.waitForTimeout(120);
  await expect(drawer).toBeVisible();
  expect(await page.locator("body").evaluate((element) => element.style.top)).toBe(
    lockedTop,
  );
  await expect(drawer).not.toBeVisible();
  await expect(start).toBeFocused();
});

test("bedroom chips apply exact counts rather than minimum counts", async ({
  page,
}) => {
  await page.goto("/properties");
  await filter(page, "Bedrooms").click();
  await page.getByRole("button", { name: "3 bedrooms", exact: true }).click();
  await search(page).click();
  await expect(page).toHaveURL(/bedroomsMatch=exact/);
  await expect(page.locator("[data-property-card]")).toHaveCount(0);
  await filter(page, "Bedrooms").click();
  await page.getByRole("button", { name: "4 bedrooms", exact: true }).click();
  await search(page).click();
  await expect(page.locator("[data-property-card]")).toHaveCount(1);
});

test("dashed price track snaps clicks and mutes only bars outside the selection", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto("/properties");
  await filter(page, "Price Range").click();
  const panel = page.getByRole("dialog", { name: "Price Range", exact: true });
  const track = panel.locator('[class*="rangeTrack"]');
  await expect(track).toHaveCSS("height", "1px");
  expect(
    await track.evaluate((element) => getComputedStyle(element).backgroundImage),
  ).toContain("repeating-linear-gradient");
  await expect(track.locator("span")).toHaveCount(0);
  const box = (await track.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.25, box.y);
  await expect(panel.getByLabel("Minimum price (PHP)")).toHaveValue("5,000,000");
  await panel.getByLabel("Maximum price (PHP)").fill("8000000");
  await expect(panel.locator("[data-price-motif] span").first()).toHaveCSS(
    "opacity",
    "0.18",
  );
  await expect(panel.locator("[data-price-motif] span").nth(6)).toHaveCSS(
    "opacity",
    "1",
  );
  await page.screenshot({
    path: testInfo.outputPath("dashed-price-track-selected.png"),
  });
  const minimum = panel.getByLabel("Minimum price (PHP)");
  await minimum.fill("8750123");
  await panel.getByLabel("Maximum price (PHP)").fill("21000000");
  await expect(minimum).toHaveValue("8,750,123");
  await panel
    .getByRole("slider", { name: "Minimum price slider", exact: true })
    .focus();
  await page.keyboard.press("ArrowRight");
  await expect(minimum).toHaveValue("9,000,000");
  await panel.getByRole("button", { name: "Clear price range" }).click();
  await expect(panel.locator('[data-price-motif] span[data-muted="true"]')).toHaveCount(
    0,
  );
});

test.describe("fixed-stop pointer control", () => {
  test("maximum handle selects consecutive stops and stays aligned during fast reversals", async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      baseURL: "http://127.0.0.1:3100",
      reducedMotion: "reduce",
      recordVideo: {
        dir: testInfo.outputPath("drag-recording"),
        size: { width: 1440, height: 1080 },
      },
    });
    const page = await context.newPage();
    try {
      await page.setViewportSize({ width: 1440, height: 1080 });
      await page.goto("/properties");
      await filter(page, "Price Range").click();
      const panel = page.getByRole("dialog", { name: "Price Range", exact: true });
      const maximum = panel.getByLabel("Maximum price (PHP)");
      await maximum.fill("15000000");
      const high = panel.getByRole("slider", {
        name: "Maximum price slider",
        exact: true,
      });
      const track = (await panel.locator('[class*="rangeTrack"]').boundingBox())!;
      const barsBefore = await panel
        .locator("[data-price-motif] span")
        .evaluateAll((bars) =>
          bars.map((bar) => {
            const rect = bar.getBoundingClientRect();
            return [rect.x, rect.y, rect.height];
          }),
        );
      const thumb = (await high.boundingBox())!;
      await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2);
      await page.mouse.down();
      for (const amount of [15000000, 14500000, 14000000, 13500000]) {
        const x = track.x + (track.width * priceToProgress(amount)) / 100;
        await page.mouse.move(x, track.y, { steps: 8 });
        await expect(high).toHaveAttribute("aria-valuenow", String(amount));
        await expect(maximum).toHaveValue(amount.toLocaleString("en-PH"));
        const handle = (await high.boundingBox())!;
        expect(Math.abs(handle.x + handle.width / 2 - x)).toBeLessThan(0.75);
        await page.waitForTimeout(120);
      }
      const amounts: number[] = [];
      for (const progress of [10, 90, 25, 80, 40, 95, 30, 60]) {
        await page.mouse.move(track.x + (track.width * progress) / 100, track.y);
        const amount = Number(await high.getAttribute("aria-valuenow"));
        amounts.push(amount);
        expect(PRICE_SLIDER_STEPS).toContain(amount);
        await expect(maximum).toHaveValue(amount.toLocaleString("en-PH"));
        const handle = (await high.boundingBox())!;
        expect(
          Math.abs(
            handle.x +
              handle.width / 2 -
              track.x -
              (track.width * priceToProgress(amount)) / 100,
          ),
        ).toBeLessThan(0.75);
      }
      await page.mouse.up();
      expect(new Set(amounts).size).toBeGreaterThan(4);
      expect(
        await panel.locator("[data-price-motif] span").evaluateAll((bars) =>
          bars.map((bar) => {
            const rect = bar.getBoundingClientRect();
            return [rect.x, rect.y, rect.height];
          }),
        ),
      ).toEqual(barsBefore);
      await page.screenshot({ path: testInfo.outputPath("stepped-maximum.png") });
      const selected = await maximum.inputValue();
      await page.keyboard.press("Escape");
      await search(page).click();
      await expect(page).toHaveURL(
        new RegExp(`maxPrice=${selected.replaceAll(",", "")}`),
      );
    } finally {
      await context.close();
    }
  });
});
