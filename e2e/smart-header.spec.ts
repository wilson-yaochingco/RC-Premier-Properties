import { expect, test } from "@playwright/test";

const viewports = [
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 375, height: 667 },
  { width: 320, height: 568 },
  { width: 1024, height: 600 },
];

for (const viewport of viewports) {
  test(`responsive hero and smart header ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const hero = page.locator("[data-home-hero]");
    await hero.locator("img").evaluateAll(async (images) => {
      await Promise.all(
        images
          .filter((image) => image.getBoundingClientRect().width > 0)
          .map((image) => (image as HTMLImageElement).decode()),
      );
    });
    const header = page.getByRole("banner");
    const menu = header.getByRole("button", { name: "Menu", exact: true });
    expect(
      (await menu.locator('[class*="menuLabel"]').boundingBox())!.width,
    ).toBeGreaterThan(20);
    await expect(header).toHaveAttribute("data-sticky", "false");
    const bounds = await hero.boundingBox();
    expect(bounds!.height).toBe(viewport.height);
    const content = hero.locator("h1").locator("..");
    const contentBounds = await content.boundingBox();
    expect(contentBounds!.y).toBeGreaterThan(80);
    expect(contentBounds!.x).toBeGreaterThanOrEqual(16);
    expect(contentBounds!.x + contentBounds!.width).toBeLessThanOrEqual(viewport.width);
    const cue = await hero.locator('div[aria-hidden="true"]:has(> span)').boundingBox();
    if (viewport.width >= 640) {
      expect(cue!.x + cue!.width / 2).toBeCloseTo(
        (await page.evaluate(() => document.documentElement.clientWidth)) / 2,
        0,
      );
      if (contentBounds!.x + contentBounds!.width > cue!.x) {
        expect(contentBounds!.y + contentBounds!.height).toBeLessThan(cue!.y);
      }
    } else expect(cue).toBeNull();
    const card = hero.getByRole("complementary");
    if (viewport.width < 640) {
      if (viewport.height >= 780) {
        await expect(card).toBeVisible();
        const cardBounds = await card.boundingBox();
        expect(cardBounds!.y).toBeGreaterThan(contentBounds!.y + contentBounds!.height);
        expect(cardBounds!.y + cardBounds!.height).toBeLessThan(viewport.height);
      } else await expect(card).toBeHidden();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (viewport.width >= 640)
      await expect(header.getByRole("link", { name: "Book a viewing" })).toBeVisible();
    else
      await expect(header.getByRole("link", { name: "Book a viewing" })).toBeHidden();
    await page.screenshot({
      path: `node_modules/.cache/hero-review/${viewport.width}-${viewport.height}.png`,
    });

    await page.evaluate(
      (height) => window.scrollTo({ top: height - 20, behavior: "instant" }),
      viewport.height,
    );
    await expect(header).toHaveAttribute("data-sticky", "false");
    await page.evaluate(
      (height) => window.scrollTo({ top: height + 220, behavior: "instant" }),
      viewport.height,
    );
    await expect(header).toHaveAttribute("data-sticky", "true");
    await expect(header).toHaveAttribute("data-hidden", "true");
    await expect(header).toHaveAttribute("inert", "");
    await menu.evaluate((element) => (element as HTMLButtonElement).focus());
    await expect(menu).not.toBeFocused();
    await page.evaluate(() => window.scrollBy({ top: -100, behavior: "instant" }));
    await expect(header).toHaveAttribute("data-hidden", "false");
    await expect(header).not.toHaveAttribute("inert");
    await expect(
      header.getByRole("img", { name: "RC Premier Properties", exact: true }),
    ).toHaveAttribute("src", /rc-premier-logo\./);
    await page.waitForTimeout(350);
    const toolbarLogo = header.getByRole("img", {
      name: "RC Premier Properties",
      exact: true,
    });
    const toolbarBounds = await header.boundingBox();
    const logoBounds = await toolbarLogo.boundingBox();
    expect(logoBounds!.y).toBeGreaterThan(0);
    expect(logoBounds!.y + logoBounds!.height).toBeLessThan(toolbarBounds!.height);
    await page.screenshot({
      path: `node_modules/.cache/hero-review/sticky-${viewport.width}-${viewport.height}.png`,
    });
    const viewing = header.getByRole("link", { name: "Book a viewing" });
    if (viewport.width < 640) await expect(viewing).toBeHidden();
    else await expect(viewing).toHaveCSS("background-color", "rgb(37, 44, 54)");
    const saved = await page.evaluate(() => scrollY);
    await menu.click();
    const dialog = page.getByRole("dialog", { name: "Primary navigation" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Book a viewing" })).toBeVisible();
    await expect(
      dialog.getByRole("link", { name: "Properties", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    if (viewport.width < 640) {
      await expect(
        dialog.getByRole("button", { name: "Close", exact: true }),
      ).toBeFocused();
      const panel = page.locator("#mobile-navigation-panel");
      await expect(panel).toHaveCSS("opacity", "1");
      await expect(dialog.locator('[class*="menuLogo"]')).toHaveCSS("opacity", "1");
      await expect(
        dialog
          .getByRole("navigation", { name: "Primary navigation" })
          .locator("li")
          .last(),
      ).toHaveCSS("opacity", "1");
      const image = dialog.getByRole("img", {
        name: "RC Premier residential property with a pool",
      });
      await expect(image).toBeVisible();
      await image.evaluate((element) => (element as HTMLImageElement).decode());
      const ctaBounds = await dialog
        .getByRole("link", { name: "Book a viewing" })
        .boundingBox();
      const navBounds = await dialog
        .getByRole("navigation", { name: "Primary navigation" })
        .boundingBox();
      const imageBounds = await image.boundingBox();
      expect(ctaBounds!.y).toBeGreaterThan(navBounds!.y + navBounds!.height);
      expect(imageBounds!.y).toBeGreaterThan(ctaBounds!.y + ctaBounds!.height);
      await page.screenshot({
        path: `node_modules/.cache/hero-review/menu-${viewport.width}-${viewport.height}.png`,
      });
      await expect(page.locator("html")).toHaveClass(/lenis-stopped/);
      await page.mouse.move(viewport.width / 2, viewport.height - 30);
      await page.mouse.wheel(0, 900);
      await expect.poll(() => panel.evaluate((element) => element.scrollTop)).toBe(0);
      await panel.evaluate((element) =>
        element.scrollTo({ top: element.scrollHeight, behavior: "instant" }),
      );
      expect(await panel.evaluate((element) => element.scrollTop)).toBe(0);
      const email = dialog.getByRole("link", { name: "rcpremierph@gmail.com" });
      const emailBounds = await email.boundingBox();
      expect(emailBounds!.y + emailBounds!.height).toBeLessThanOrEqual(viewport.height);
      expect(await page.locator("body").evaluate((element) => element.style.top)).toBe(
        `-${saved}px`,
      );
      expect(
        await panel.evaluate((element) => element.scrollWidth <= element.clientWidth),
      ).toBe(true);
    } else
      await expect(dialog.getByRole("link", { name: "Book a viewing" })).toBeFocused();
    await page.mouse.wheel(0, 300);
    await page.keyboard.press("Escape");
    await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
    await expect(page.locator("html")).not.toHaveClass(/lenis-stopped/);
    await expect(menu).toBeFocused();
    expect(await page.evaluate(() => scrollY)).toBe(saved);
    await page.locator("main").focus();
    await page.evaluate(() => window.scrollBy({ top: 100, behavior: "instant" }));
    await expect(header).toHaveAttribute("data-hidden", "true");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => window.scrollBy({ top: -100, behavior: "instant" }));
    await expect(header).toHaveAttribute("data-hidden", "false");
    expect(
      await header
        .locator('[class*="menuControls"]')
        .evaluate((element) =>
          parseFloat(getComputedStyle(element).transitionDuration),
        ),
    ).toBeLessThanOrEqual(0.001);
    await page.evaluate(
      (height) => window.scrollTo({ top: height - 10, behavior: "instant" }),
      viewport.height,
    );
    await expect(header).toHaveAttribute("data-eligible", "false");
    await expect(header).toHaveAttribute("data-sticky", "false");
    await expect(
      header.getByRole("link", { name: "RC Premier Properties home" }),
    ).toBeHidden();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect(menu).toBeVisible();
  });
}
