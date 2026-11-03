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
    const hero = page.locator("[data-home-hero]");
    const header = page.getByRole("banner");
    const menu = header.getByRole("button", { name: "Menu", exact: true });

    await expect(
      hero.getByRole("heading", {
        level: 1,
        name: "Find a home worth coming home to.",
      }),
    ).toBeVisible();
    await expect(
      hero.getByRole("img", { name: "RC Premier Properties" }),
    ).toBeVisible();
    await expect(hero.getByRole("link", { name: "Browse properties" })).toHaveAttribute(
      "href",
      "/properties",
    );
    await expect(header).toHaveAttribute("data-sticky", "false");
    expect((await hero.boundingBox())!.height).toBeGreaterThanOrEqual(viewport.height);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    if (viewport.width >= 640) {
      await expect(header.getByRole("link", { name: "Book a viewing" })).toBeVisible();
    } else {
      await expect(header.getByRole("link", { name: "Book a viewing" })).toBeHidden();
    }

    await page.evaluate(() => window.scrollTo(0, innerHeight + 220));
    await expect(header).toHaveAttribute("data-sticky", "true");
    await expect(header).toHaveAttribute("data-hidden", "true");
    await page.evaluate(() => window.scrollBy(0, -100));
    await expect(header).toHaveAttribute("data-hidden", "false");
    await expect(
      header.getByRole("link", { name: "RC Premier Properties home" }),
    ).toBeVisible();

    await menu.click();
    const dialog = page.getByRole("dialog", { name: "Primary navigation" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("link", { name: "Properties", exact: true }),
    ).toBeFocused();
    await expect(dialog.getByRole("link", { name: "Book a viewing" })).toHaveAttribute(
      "href",
      "/book-viewing",
    );
    await expect(page.locator("body")).toHaveCSS("position", "fixed");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(menu).toBeFocused();
    await expect(page.locator("body")).not.toHaveCSS("position", "fixed");

    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(
      Number.parseFloat(
        await header.evaluate(
          (element) => getComputedStyle(element).transitionDuration,
        ),
      ),
    ).toBeLessThanOrEqual(0.001);
  });
}
