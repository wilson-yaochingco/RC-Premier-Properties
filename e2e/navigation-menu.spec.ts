import { expect, test, type Page } from "@playwright/test";

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;

function menu(page: Page) {
  return {
    trigger: page.getByRole("button", { name: /^(Menu|Close)$/ }),
    dialog: page.getByRole("dialog", { name: "Primary navigation" }),
  };
}

async function open(page: Page) {
  const { trigger, dialog } = menu(page);
  await trigger.click();
  await expect(dialog).toBeVisible();
}

async function expectMenuClosed(page: Page) {
  const { trigger, dialog } = menu(page);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("#mobile-navigation-panel")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  // Scroll lock and the inert background are fully restored.
  await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
  await expect(page.locator("main")).not.toHaveJSProperty("inert", true);
  await expect(page.getByRole("contentinfo")).not.toHaveJSProperty("inert", true);
}

for (const { name, width, height } of VIEWPORTS) {
  test.describe(`${name} navigation menu`, () => {
    test.use({ viewport: { width, height } });

    test("Book a viewing closes the menu and navigates", async ({ page }) => {
      await page.goto("/properties");
      await open(page);
      await menu(page).dialog.getByRole("link", { name: "Book a viewing" }).click();
      await expect(page).toHaveURL(/\/book-viewing$/);
      await expectMenuClosed(page);
      // The destination starts at the top, not at the previous page's scroll offset.
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
    });

    test("clicking the current route closes the menu", async ({ page }) => {
      await page.goto("/book-viewing");
      await open(page);
      await menu(page).dialog.getByRole("link", { name: "Book a viewing" }).click();
      await expect(page).toHaveURL(/\/book-viewing$/);
      await expectMenuClosed(page);

      await page.goto("/properties");
      await open(page);
      await menu(page)
        .dialog.getByRole("link", { name: "Properties", exact: true })
        .click();
      await expect(page).toHaveURL(/\/properties$/);
      await expectMenuClosed(page);
    });

    test("a navigation link closes the menu and keeps it usable on the next page", async ({
      page,
    }) => {
      await page.goto("/properties");
      await open(page);
      await menu(page)
        .dialog.getByRole("link", { name: "Contact", exact: true })
        .click();
      await expect(page).toHaveURL(/\/contact$/);
      await expectMenuClosed(page);

      await open(page);
      await page.keyboard.press("Escape");
      await expectMenuClosed(page);
      await expect(menu(page).trigger).toBeFocused();
    });

    test("browser back and forward never leave a stale open menu", async ({ page }) => {
      await page.goto("/properties");
      await open(page);
      await menu(page).dialog.getByRole("link", { name: "Sell", exact: true }).click();
      await expect(page).toHaveURL(/\/sell$/);

      await open(page);
      await page.goBack();
      await expect(page).toHaveURL(/\/properties$/);
      await expectMenuClosed(page);

      await open(page);
      await page.goForward();
      await expect(page).toHaveURL(/\/sell$/);
      await expectMenuClosed(page);

      // Returning to the route the menu was last opened on must not reopen it.
      await page.goBack();
      await expectMenuClosed(page);
    });

    test("reduced motion closes the menu immediately", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/about");
      await open(page);
      await menu(page).dialog.getByRole("link", { name: "Book a viewing" }).click();
      await expect(page).toHaveURL(/\/book-viewing$/);
      await expectMenuClosed(page);
    });
  });
}

test("the header Book a viewing link works without opening the menu", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/properties");
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Book a viewing" })
    .first()
    .click();
  await expect(page).toHaveURL(/\/book-viewing$/);
  await expectMenuClosed(page);
  // Clicking the CTA while the menu is closed must not steal focus to the menu button.
  await expect(menu(page).trigger).not.toBeFocused();
});
