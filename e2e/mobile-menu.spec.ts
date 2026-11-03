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
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/lenis/);
    await page.evaluate(() => window.scrollTo(0, 120));
    const before = await page.evaluate(() => scrollY);
    const menu = page.getByRole("button", { name: "Menu", exact: true });
    await menu.evaluate((button: HTMLButtonElement) => button.click());
    const dialog = page.getByRole("dialog", { name: "Primary navigation" });
    const panel = page.locator("#mobile-navigation-panel");
    await expect(dialog).toBeVisible();
    await expect(panel).toHaveCSS("background-color", "rgb(32, 38, 48)");
    await expect(panel).toHaveCSS("opacity", "1");
    await expect(
      dialog.getByRole("link", { name: "Properties", exact: true }),
    ).toBeFocused();
    await expect(dialog.getByRole("link", { name: "Book a viewing" })).toHaveAttribute(
      "href",
      "/book-viewing",
    );
    await expect(
      dialog.getByRole("link", { name: "rcpremierph@gmail.com" }),
    ).toBeVisible();
    await expect(page.locator("body")).toHaveCSS("position", "fixed");
    const bounds = await panel.boundingBox();
    expect(bounds!.y).toBe(0);
    expect(bounds!.height).toBe(viewport.height);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    expect(
      await panel.evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    await page.keyboard.press("Shift+Tab");
    await expect(
      dialog.getByRole("button", { name: "Close", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(menu).toBeFocused();
    await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
    expect(await page.evaluate(() => scrollY)).toBe(before);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await menu.click();
    await expect(dialog).toBeVisible();
    await expect(panel).toHaveCSS("transition-duration", "0s");
    await page.keyboard.press("Escape");
  });
}

test("short mobile menu scrolls while the page stays fixed", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 400 });
  await page.goto("/");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  const panel = page.locator("#mobile-navigation-panel");
  await expect(panel).toHaveCSS("overflow-y", "auto");
  await panel.evaluate((element) =>
    element.scrollTo({ top: element.scrollHeight, behavior: "instant" }),
  );
  await expect
    .poll(() => panel.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  await expect(
    panel.getByRole("link", { name: "rcpremierph@gmail.com" }),
  ).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("position", "fixed");
  await page.keyboard.press("Escape");
  await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
});
