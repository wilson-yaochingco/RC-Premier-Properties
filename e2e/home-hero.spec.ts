import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
]) {
  test(`cinematic home hero and menu at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const hero = page.locator('section[aria-labelledby="home-heading"]');
    await expect(hero.getByRole("heading", { level: 1 })).toHaveText(
      "Find a homeworth cominghome to.",
    );
    const bounds = await hero.boundingBox();
    expect(bounds?.y).toBe(0);
    expect(bounds?.height).toBe(viewport.height);
    if (viewport.width > 768) {
      const markerTravel = await hero
        .locator('div[aria-hidden="true"] > span')
        .evaluate((dot) => {
          const animation = dot.getAnimations()[0];
          animation.pause();
          animation.currentTime = 0;
          const outline = dot.parentElement!.getBoundingClientRect();
          const top = dot.getBoundingClientRect().top;
          animation.currentTime = 1800;
          const bottom = dot.getBoundingClientRect().bottom;
          const travel = dot.getBoundingClientRect().top - top;
          const stable = dot.parentElement!.getBoundingClientRect().top === outline.top;
          animation.play();
          return {
            topClearance: top - outline.top - 1,
            bottomClearance: outline.bottom - bottom - 1,
            travel,
            stable,
            opacity: getComputedStyle(dot).opacity,
          };
        });
      expect(markerTravel.topClearance).toBe(6);
      expect(markerTravel.bottomClearance).toBe(6);
      expect(markerTravel.travel).toBe(viewport.width <= 768 ? 13 : 21);
      expect(markerTravel.stable).toBe(true);
      expect(markerTravel.opacity).toBe("1");
    } else
      await expect(hero.locator('div[aria-hidden="true"]:has(> span)')).toBeHidden();
    expect(
      await hero.evaluate(
        (element) => element.nextElementSibling!.getBoundingClientRect().top,
      ),
    ).toBe(viewport.height);
    if (viewport.width >= 640)
      await expect(
        page.getByRole("banner").getByRole("link", { name: "Book a viewing" }),
      ).toHaveAttribute("href", "/book-viewing");
    const menu = page.getByRole("button", { name: "Menu", exact: true });
    await menu.click();
    const dialog = page.getByRole("dialog", { name: "Primary navigation" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("link", { name: "Properties", exact: true }),
    ).toBeFocused();
    await expect(
      dialog.getByRole("navigation", { name: "Primary navigation" }).getByRole("link"),
    ).toHaveText(["Properties", "Locations", "Sell", "About", "Contact"]);
    await page.keyboard.press("Shift+Tab");
    if (viewport.width >= 640) {
      await expect(dialog.getByRole("link", { name: "Book a viewing" })).toBeFocused();
      await page.keyboard.press("Shift+Tab");
    }
    await expect(
      page.getByRole("button", { name: "Close", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(
      dialog.getByRole("link", { name: "rcpremierph@gmail.com" }),
    ).toBeFocused();
    await expect(page.locator("main")).toHaveAttribute("inert", "");
    await expect(dialog.getByRole("link", { name: "Book a viewing" })).toBeVisible();
    await expect(page.locator("html")).toHaveCSS("overflow-y", "scroll");
    await expect(page.locator("body")).toHaveCSS("position", "fixed");
    await expect(
      dialog.getByRole("link", { name: "Properties", exact: true }),
    ).toHaveCSS("text-transform", "uppercase");
    await expect(
      dialog.getByText(`© ${new Date().getFullYear()} RC PREMIER PROPERTIES`, {
        exact: true,
      }),
    ).toBeVisible();
    const socials = dialog.getByRole("navigation", { name: "Social media" });
    await expect(socials.getByRole("link")).toHaveCount(4);
    await expect(
      socials.getByRole("link", { name: "Facebook", exact: true }),
    ).toHaveAttribute(
      "href",
      "https://www.facebook.com/people/RC-Premier-Properties/61588365958516/",
    );
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(menu).toBeFocused();
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
    await expect(page.locator("main")).not.toHaveAttribute("inert");
    await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
  });
}

test("hero interactions preserve layout and respect reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const hero = page.locator('section[aria-labelledby="home-heading"]');
  const logo = hero.getByRole("img", { name: "RC Premier Properties", exact: true });
  await expect(logo).toBeVisible();
  await expect(logo).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  const browse = hero.getByRole("link", { name: "Browse properties" });
  const viewing = page
    .getByRole("banner")
    .getByRole("link", { name: "Book a viewing" });
  const view = hero.getByRole("link", { name: "Explore locations" });
  for (const link of [browse, viewing, view]) {
    await page.mouse.move(0, 0);
    const bounds = await link.boundingBox();
    const arrow = link.locator("svg");
    const label = link.locator("span").first();
    await expect(arrow).toHaveCSS(
      "transform",
      "matrix(0.707107, -0.707107, 0.707107, 0.707107, 0, 0)",
    );
    const center = await arrow.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });
    await link.hover();
    await expect(arrow).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
    if (link !== viewing)
      await expect(label).toHaveCSS("transform", "matrix(1.015, 0, 0, 1.015, 0, 0)");
    const hoveredCenter = await arrow.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });
    expect(hoveredCenter.x).toBeCloseTo(center.x, 3);
    // The supporting card retains its existing three-pixel lift.
    expect(hoveredCenter.y).toBeCloseTo(center.y - (link === view ? 3 : 0), 3);
    expect((await link.boundingBox())?.width).toBe(bounds?.width);
    expect((await link.boundingBox())?.height).toBe(bounds?.height);
    if (link === viewing) expect(await link.boundingBox()).toEqual(bounds);
    await page.mouse.move(0, 0);
    await link.focus();
    if (link !== viewing)
      await expect(arrow).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
    if (link !== viewing)
      await expect(label).toHaveCSS("transform", "matrix(1.015, 0, 0, 1.015, 0, 0)");
    await link.evaluate((element) => (element as HTMLElement).blur());
  }
  const card = hero.getByRole("complementary");
  await card.hover();
  await expect(card).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, -3)");
  await expect(card.getByRole("img")).toHaveCSS(
    "transform",
    "matrix(1.025, 0, 0, 1.025, 0, 0)",
  );
  const dot = hero.locator('div[aria-hidden="true"] > span');
  await expect(dot).toHaveCSS("animation-duration", "1.8s");
  await expect(dot).toHaveCSS("animation-direction", "alternate");
  await expect(dot).toHaveCSS("opacity", "1");
  expect(
    await dot.evaluate((element) => {
      const animation = element.getAnimations()[0];
      return (animation.effect as KeyframeEffect).getKeyframes().map((frame) => ({
        transform: frame.transform,
        opacity: frame.opacity,
      }));
    }),
  ).toEqual([
    { transform: "translateY(0px)", opacity: undefined },
    { transform: "translateY(21px)", opacity: undefined },
  ]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(dot).toHaveCSS("animation-name", "none");
  await expect(card).toHaveCSS("transform", "none");
  await expect(card.getByRole("img")).toHaveCSS("transform", "none");
  for (const link of [browse, viewing, view]) {
    await link.focus();
    if (link !== viewing)
      await expect(link.locator("svg")).toHaveCSS(
        "transform",
        "matrix(1, 0, 0, 1, 0, 0)",
      );
    expect(
      await link
        .locator("svg")
        .evaluate((element) =>
          parseFloat(getComputedStyle(element).transitionDuration),
        ),
    ).toBeLessThanOrEqual(0.001);
    if (link !== viewing)
      await expect(link.locator("span").first()).toHaveCSS("transform", "none");
  }
});

test("menu keeps the scrollbar gutter and freezes the saved page position", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(() => window.scrollTo({ top: 120, behavior: "instant" }));
  const hero = page.locator('section[aria-labelledby="home-heading"]');
  const before = await hero.boundingBox();
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  await menu.evaluate((element) => (element as HTMLButtonElement).click());
  const panel = page.locator("#mobile-navigation-panel");
  await expect(panel).toHaveCSS("opacity", "1");
  await expect(page.locator("html")).toHaveCSS("overflow-y", "scroll");
  await expect(page.locator("body")).toHaveCSS("position", "fixed");
  expect(await hero.boundingBox()).toEqual(before);
  expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(width);
  await page.mouse.move(700, 500);
  await page.mouse.wheel(0, 600);
  await page.keyboard.press("PageDown");
  expect(await hero.boundingBox()).toEqual(before);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Primary navigation" })).toBeHidden();
  expect(await page.evaluate(() => window.scrollY)).toBe(120);
  expect(await hero.boundingBox()).toEqual(before);
  expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(width);
});

test("editorial menu reveal, interrupted close, and reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  const panel = page.locator("#mobile-navigation-panel");
  const viewing = page
    .getByRole("banner")
    .getByRole("link", { name: "Book a viewing" });
  const viewingBounds = await viewing.boundingBox();
  await menu.click();
  const dialog = page.getByRole("dialog", { name: "Primary navigation" });
  await expect(panel).toHaveCSS("opacity", "1");
  await expect(panel).toHaveCSS("background-color", "rgb(32, 38, 48)");
  await expect(panel).toHaveCSS("transform", "none");
  await expect(panel.locator("svg[aria-hidden='true']").first()).toBeVisible();
  expect(await viewing.boundingBox()).toEqual(viewingBounds);
  await expect(
    dialog.getByRole("navigation", { name: "Primary navigation" }).getByRole("link"),
  ).toHaveText(["Properties", "Locations", "Sell", "About", "Contact"]);
  const socials = dialog.getByRole("navigation", { name: "Social media" });
  await expect(socials.getByRole("link")).toHaveCount(4);
  await expect(
    dialog.getByRole("link", { name: "rcpremierph@gmail.com" }),
  ).toBeVisible();
  const close = page.getByRole("button", { name: "Close", exact: true });
  await close.click();
  await expect(page.locator("body")).toHaveCSS("position", "fixed");
  await expect(dialog).toBeHidden();
  await expect(menu).toBeFocused();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");

  // Interrupt opening before the stagger and surface transition finish.
  await menu.evaluate((element) => (element as HTMLButtonElement).click());
  await close.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(dialog).toBeHidden();
  await expect(page.locator("main")).not.toHaveAttribute("inert");
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await menu.click();
  const properties = dialog.getByRole("link", { name: "Properties", exact: true });
  await expect(properties).toBeFocused();
  await expect(properties.locator("..")).toHaveCSS("transform", "none");
  await expect(properties.locator("..")).toHaveCSS("transition-delay", "0s");
  await expect(panel).toHaveCSS("transition-duration", "0s");
  await properties.hover();
  await expect(properties).toHaveCSS("transform", "none");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(menu).toBeFocused();
});

test("interior mobile navigation retains its existing controls", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/locations/angeles-city");
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  await menu.click();
  const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(
    navigation.getByRole("link", { name: "Properties", exact: true }),
  ).toBeFocused();
  await expect(
    page
      .locator(".mobile-navigation__footer")
      .getByRole("button", { name: "Request a Tour" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(navigation).toBeHidden();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});
