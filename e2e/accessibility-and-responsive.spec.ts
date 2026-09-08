import { expect, test, type Page, type TestInfo } from "@playwright/test";

const CORE_ROUTES = [
  { path: "/", artifact: "home" },
  { path: "/properties", artifact: "properties" },
  {
    path: "/properties/clark-garden-residence",
    artifact: "property-detail",
  },
  { path: "/about", artifact: "about" },
  { path: "/contact", artifact: "contact" },
  { path: "/sell", artifact: "sell" },
  { path: "/book-viewing", artifact: "book-viewing" },
  { path: "/not-a-public-route", artifact: "not-found" },
] as const;

const VIEWPORT_WIDTHS = [
  320, 360, 375, 390, 412, 414, 430, 480, 640, 768, 820, 1024, 1280, 1366, 1440, 1600,
  1920,
] as const;

async function expectSemanticShell(page: Page) {
  await expect(page.locator('main#main-content:not([aria-busy="true"])')).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("banner")).toHaveCount(1);
  await expect(page.locator("main#main-content")).toHaveCount(1);
  await expect(page.getByRole("contentinfo")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "Footer navigation" })).toHaveCount(
    1,
  );
  const structure = await page.evaluate(() => {
    const headingLevels = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(
      (heading) => Number(heading.tagName.slice(1)),
    );
    const skippedHeading = headingLevels.some(
      (level, index) => index > 0 && level > (headingLevels[index - 1] ?? 0) + 1,
    );
    const duplicateIds = [...document.querySelectorAll<HTMLElement>("[id]")]
      .map((element) => element.id)
      .filter((id, index, ids) => ids.indexOf(id) !== index);
    const unlabeledControls = [
      ...document.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >('input:not([type="hidden"]), select, textarea'),
    ]
      .filter((control) => !control.closest('[aria-hidden="true"]'))
      .filter(
        (control) =>
          control.labels?.length === 0 &&
          !control.getAttribute("aria-label") &&
          !control.getAttribute("aria-labelledby"),
      )
      .map((control) => `${control.tagName.toLowerCase()}#${control.id}`);
    const unnamedButtons = [...document.querySelectorAll<HTMLButtonElement>("button")]
      .filter((button) => !button.closest('[aria-hidden="true"]'))
      .filter(
        (button) =>
          !button.innerText.trim() &&
          !button.getAttribute("aria-label") &&
          !button.getAttribute("aria-labelledby"),
      ).length;
    return {
      duplicateIds,
      headingLevels,
      skippedHeading,
      unlabeledControls,
      unnamedButtons,
    };
  });
  expect(structure.headingLevels[0]).toBe(1);
  expect(structure.skippedHeading).toBe(false);
  expect(structure.duplicateIds).toEqual([]);
  expect(structure.unlabeledControls).toEqual([]);
  expect(structure.unnamedButtons).toBe(0);
}

test("core routes expose one semantic shell and a working skip link", async ({
  page,
}) => {
  for (const route of CORE_ROUTES) {
    await page.goto(route.path);
    await expectSemanticShell(page);
  }

  await page.goto("/");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main-content$/);
  await expect(page.locator("main#main-content")).toBeFocused();
});

test("form controls retain a visible keyboard focus indicator", async ({ page }) => {
  await page.goto("/contact");
  const name = page.getByLabel("Name");
  await name.focus();
  const focusStyle = await name.evaluate((control) => {
    const style = getComputedStyle(control);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  expect(focusStyle.outlineStyle).not.toBe("none");
  expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(2);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/properties");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const propertyId = page.getByLabel("Property ID");
  await expect(propertyId).toBeVisible();
  await page.locator("main#main-content").focus();
  await page.keyboard.press("Tab");
  await expect(propertyId).toBeFocused();
  expect(
    await propertyId.evaluate((control) => getComputedStyle(control).outlineStyle),
  ).not.toBe("none");
});

test("reduced motion and 200 percent text sizing preserve core content", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
  expect(
    Number.parseFloat(
      await page
        .locator(".home-hero__content h1")
        .evaluate((heading) => getComputedStyle(heading).animationDuration),
    ),
  ).toBeLessThanOrEqual(0.001);

  for (const path of [
    "/",
    "/properties",
    "/properties/clark-garden-residence",
    "/contact",
  ]) {
    await page.goto(path);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    const layout = await inspectHorizontalOverflow(page);
    expect(
      layout.documentWidth,
      `${path} overflow at 200% text: ${JSON.stringify(layout.offenders)}`,
    ).toBeLessThanOrEqual(layout.viewportWidth + 1);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

async function inspectHorizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((element) => {
        const style = window.getComputedStyle(element);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          element.closest('[aria-hidden="true"]')
        ) {
          return false;
        }
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > viewportWidth + 1;
      })
      .slice(0, 8)
      .map((element) => ({
        element: element.tagName.toLowerCase(),
        className: element.className.toString().slice(0, 100),
        left: Math.round(element.getBoundingClientRect().left),
        right: Math.round(element.getBoundingClientRect().right),
      }));

    return {
      viewportWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      offenders,
    };
  });
}

async function captureViewport(
  page: Page,
  testInfo: TestInfo,
  artifact: string,
  width: number,
) {
  // testInfo.outputPath guarantees every visual artifact stays inside outputDir.
  await page.screenshot({
    path: testInfo.outputPath(`${artifact}-${width}px.png`),
    animations: "disabled",
    caret: "initial",
    fullPage: false,
  });
}

for (const width of VIEWPORT_WIDTHS) {
  test(`core layouts have no horizontal overflow at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });

    for (const route of CORE_ROUTES) {
      await page.goto(route.path);
      await expect(
        page.locator('main#main-content:not([aria-busy="true"])'),
      ).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const layout = await inspectHorizontalOverflow(page);
      expect(
        layout.documentWidth,
        `${route.path} document overflow at ${width}px: ${JSON.stringify(layout.offenders)}`,
      ).toBeLessThanOrEqual(layout.viewportWidth + 1);
      expect(
        layout.bodyWidth,
        `${route.path} body overflow at ${width}px: ${JSON.stringify(layout.offenders)}`,
      ).toBeLessThanOrEqual(layout.viewportWidth + 1);
      expect(
        layout.offenders,
        `${route.path} visible elements outside ${width}px viewport`,
      ).toEqual([]);
      await captureViewport(page, testInfo, route.artifact, width);
    }
  });
}
