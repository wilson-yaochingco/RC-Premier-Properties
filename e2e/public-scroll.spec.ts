import { expect, test } from "@playwright/test";

test.use({
  launchOptions: {
    ignoreDefaultArgs: ["--hide-scrollbars"],
    args: ["--disable-features=OverlayScrollbar"],
  },
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
]) {
  test(`public media corners and frozen menu at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/lenis/);
    const radius = viewport.width <= 768 ? "12px" : "18px";
    const frame = page.locator('section[aria-labelledby="intro-heading"] figure > div');
    for (const surface of [frame]) {
      await expect(surface).toHaveCSS("border-top-left-radius", radius);
      await expect(surface).toHaveCSS("border-top-right-radius", "0px");
      await expect(surface).toHaveCSS("border-bottom-right-radius", radius);
      await expect(surface).toHaveCSS("border-bottom-left-radius", "0px");
      await expect(surface).toHaveCSS("overflow", "hidden");
    }
    await page.evaluate(() => window.scrollTo({ top: 120, behavior: "instant" }));
    const before = await page.evaluate(() => ({
      position: scrollY,
      width: document.documentElement.clientWidth,
      heroTop: document.querySelector("main section")!.getBoundingClientRect().top,
    }));
    expect(before.width).toBeLessThan(viewport.width);
    await page
      .getByRole("button", { name: "Menu", exact: true })
      .evaluate((element) => (element as HTMLButtonElement).click());
    await expect(page.locator("html")).toHaveClass(/lenis-stopped/);
    await expect(page.locator("html")).toHaveCSS("overflow-y", "scroll");
    await page.mouse.move(5, viewport.height / 2);
    await page.mouse.wheel(0, 600);
    await page.keyboard.press("PageDown");
    await page.waitForTimeout(350);
    expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(
      before.width,
    );
    expect(
      await page
        .locator("main section")
        .first()
        .evaluate((hero) => hero.getBoundingClientRect().top),
    ).toBe(before.heroTop);
    await page.keyboard.press("Escape");
    await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
    await expect(page.locator("html")).not.toHaveClass(/lenis-stopped/);
    expect(await page.evaluate(() => scrollY)).toBe(before.position);
    expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(
      before.width,
    );
    await page.mouse.wheel(0, 350);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(300);
  });
}

test("wheel interpolation is responsive and keyboard/anchor scrolling remains native", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/lenis/);
  await page.mouse.move(600, 400);
  await page.mouse.wheel(0, 500);
  await expect(page.locator("html")).toHaveClass(/lenis-smooth/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(400);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(500);
  await page.keyboard.press("End");
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(1500);
  await page.keyboard.press("Home");
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.keyboard.press("PageDown");
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  const previous = await page.evaluate(() => scrollY);
  await page.keyboard.press("ArrowDown");
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(previous);
  await page.keyboard.press("Home");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main-content$/);
  await expect(page.locator("#main-content")).toBeFocused();
});

test("reduced motion remains native and can change while menu is open", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/lenis/);
  await page.mouse.move(600, 400);
  await page.mouse.wheel(0, 300);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(300);
  await expect(page.locator("html")).not.toHaveClass(/lenis-smooth/);
  await page.evaluate(() => window.scrollTo({ top: 120, behavior: "instant" }));
  await page
    .getByRole("button", { name: "Menu", exact: true })
    .evaluate((element) => (element as HTMLButtonElement).click());
  await expect(page.locator("body")).toHaveCSS("top", "-120px");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("html")).toHaveClass(/lenis-stopped/);
  await expect(page.locator("body")).toHaveCSS("top", "-120px");
  await page.keyboard.press("Escape");
  await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
  expect(await page.evaluate(() => scrollY)).toBe(120);
  await page.mouse.wheel(0, 300);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(420);
});

test("staff routes do not create a Lenis instance", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/lenis/);
  await page.goto("/admin");
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
});

for (const width of [375, 768]) {
  test(`touch scrolling stays native at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/lenis/);
    const session = await context.newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: width / 2, y: 600 }],
    });
    for (const y of [550, 500, 450, 400, 350]) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: width / 2, y }],
      });
    }
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(150);
    await expect(page.locator("html")).not.toHaveClass(/lenis-smooth/);
    await context.close();
  });
}

test("public property media and dialogs retain clipping and scroll isolation", async ({
  page,
}) => {
  await page.goto("/properties?propertyId=RCPP-E2E-001");
  const card = page.locator("[data-property-card]").first();
  await expect(card).toHaveCSS("border-radius", "18px 0px");
  await expect(card).toHaveCSS("overflow", "hidden");
  await page.getByRole("link", { name: "View Clark Garden Residence" }).click();
  await expect(page).toHaveURL(/\/properties\/clark-garden-residence/);
  await expect(page.locator("html")).toHaveClass(/lenis/);
  const gallery = page.getByRole("region", { name: "Property gallery" });
  await expect(gallery.locator("figure > .property-media").first()).toHaveCSS(
    "border-radius",
    "18px 0px",
  );
  await page.getByRole("button", { name: "View Fullscreen" }).click();
  await expect(page.locator("html")).toHaveClass(/lenis-stopped/);
  const saved = await page.evaluate(() => scrollY);
  await page.mouse.move(500, 400);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => scrollY)).toBe(saved);
  await page.keyboard.press("Escape");
  await expect(page.locator("html")).not.toHaveClass(/lenis-stopped/);
  await page
    .getByRole("complementary", { name: "Property inquiry" })
    .getByRole("button", { name: "Request a Tour" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Request a Tour" });
  await expect(dialog).toHaveAttribute("data-lenis-prevent", "true");
  await expect(page.locator("html")).toHaveClass(/lenis-stopped/);
  const tourPosition = await page.evaluate(() => scrollY);
  await page.mouse.move(5, 400);
  await page.mouse.wheel(0, 400);
  expect(await page.evaluate(() => scrollY)).toBe(tourPosition);
  await dialog.getByRole("button", { name: "Close Request a Tour" }).click();
  await expect(page.locator("html")).not.toHaveClass(/lenis-stopped/);
});
