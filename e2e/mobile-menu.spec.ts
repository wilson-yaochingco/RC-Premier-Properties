import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 320, height: 568 },
  { width: 360, height: 740 },
  { width: 375, height: 667 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
]) {
  test(`mobile menu fits ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.scrollTo({ top: 120, behavior: "instant" }));
    const hero = page.locator("[data-home-hero]");
    const before = await page.evaluate(() => ({
      bodyHeight: document.body.scrollHeight,
      position: scrollY,
      heroTop: document.querySelector("[data-home-hero]")!.getBoundingClientRect().top,
    }));
    const menu = page.getByRole("button", { name: "Menu", exact: true });
    await menu.evaluate((element) => (element as HTMLButtonElement).click());
    const panel = page.locator("#mobile-navigation-panel");
    const content = panel.locator('[class*="menuContent"]');
    const dialog = page.getByRole("dialog", { name: "Primary navigation" });
    await expect(panel).toHaveCSS("opacity", "1");
    await expect(panel).toHaveCSS("background-color", "rgb(37, 44, 54)");
    await expect(panel).toHaveCSS("overflow-y", "hidden");
    await expect(content).toHaveCSS("overflow-y", "hidden");
    await expect(content).toHaveCSS("overscroll-behavior", "contain");
    const bounds = await panel.boundingBox();
    expect(bounds!.y).toBe(0);
    expect(bounds!.height).toBe(viewport.height);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    const grain = await panel.evaluate((element) => {
      const style = getComputedStyle(element, "::before");
      return {
        height: parseFloat(style.height),
        opacity: style.opacity,
        image: style.backgroundImage,
      };
    });
    expect(grain.height).toBe(viewport.height);
    expect(grain.opacity).toBe("0.12");
    expect(grain.image).toContain("feTurbulence");
    expect(await page.evaluate(() => document.body.scrollHeight)).toBeLessThanOrEqual(
      before.bodyHeight,
    );
    const email = dialog.getByRole("link", { name: "rcpremierph@gmail.com" });
    const closeBounds = await dialog
      .getByRole("button", { name: "Close", exact: true })
      .boundingBox();
    expect(closeBounds!.y).toBeGreaterThanOrEqual(16);
    expect(closeBounds!.y + closeBounds!.height).toBeLessThan(80);
    const emailBounds = await email.boundingBox();
    expect(emailBounds!.y).toBeGreaterThan(0);
    expect(
      viewport.height - emailBounds!.y - emailBounds!.height,
    ).toBeGreaterThanOrEqual(15);
    expect(viewport.height - emailBounds!.y - emailBounds!.height).toBeLessThanOrEqual(
      25,
    );
    const image = dialog.getByRole("img", {
      name: "RC Premier residential property with a pool",
    });
    await image.evaluate((element) => (element as HTMLImageElement).decode());
    const imageBounds = await image.boundingBox();
    expect(imageBounds!.height).toBeGreaterThanOrEqual(72);
    expect(imageBounds!.y + imageBounds!.height).toBeLessThan(emailBounds!.y);
    expect(
      await content.evaluate((element) => element.scrollHeight <= element.clientHeight),
    ).toBe(true);
    expect(
      await content.evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    await expect(dialog.locator('[class*="menuLogo"]')).toHaveCSS("opacity", "1");
    await expect(
      dialog
        .getByRole("navigation", { name: "Primary navigation" })
        .locator("li")
        .last(),
    ).toHaveCSS("opacity", "1");
    await page.screenshot({
      path: `node_modules/.cache/menu-fit/${viewport.width}-${viewport.height}.png`,
    });
    await expect(page.locator("html")).toHaveClass(/lenis-stopped/);
    const properties = dialog.getByRole("link", { name: "Properties", exact: true });
    await expect(properties).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(
      dialog.getByRole("button", { name: "Close", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(email).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      dialog.getByRole("button", { name: "Close", exact: true }),
    ).toBeFocused();
    await page.mouse.move(viewport.width / 2, viewport.height - 40);
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(150);
    expect(await content.evaluate((element) => element.scrollTop)).toBe(0);
    expect(await panel.evaluate((element) => element.scrollTop)).toBe(0);
    expect(await hero.evaluate((element) => element.getBoundingClientRect().top)).toBe(
      before.heroTop,
    );
    await page.keyboard.press("Escape");
    await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
    await expect(page.locator("html")).not.toHaveClass(/lenis-stopped/);
    await expect(menu).toBeFocused();
    expect(await page.evaluate(() => scrollY)).toBe(before.position);
    expect(await page.evaluate(() => document.body.scrollHeight)).toBe(
      before.bodyHeight,
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await menu.evaluate((element) => (element as HTMLButtonElement).click());
    await expect(properties).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
  });
}

test("extremely short menu scrolls content while its full-screen surface stays fixed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 400 });
  await page.goto("/");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  const panel = page.locator("#mobile-navigation-panel");
  const content = panel.locator('[class*="menuContent"]');
  await expect(panel).toHaveCSS("opacity", "1");
  await expect(panel).toHaveCSS("overflow-y", "hidden");
  await expect(content).toHaveCSS("overflow-y", "auto");
  await page.mouse.move(160, 350);
  await page.mouse.wheel(0, 900);
  await expect
    .poll(() => content.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  await content.evaluate((element) =>
    element.scrollTo({ top: element.scrollHeight, behavior: "instant" }),
  );
  const email = panel.getByRole("link", { name: "rcpremierph@gmail.com" });
  const emailBounds = await email.boundingBox();
  expect(400 - emailBounds!.y - emailBounds!.height).toBeCloseTo(16, 0);
  expect(
    await panel.evaluate((element) => getComputedStyle(element, "::before").height),
  ).toBe("400px");
  expect(await panel.evaluate((element) => element.scrollTop)).toBe(0);
  await page.keyboard.press("Escape");
  await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
});
