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

const LOCATION_ROUTES = [
  { path: "/locations", artifact: "locations" },
  { path: "/locations/angeles-city", artifact: "location-detail" },
] as const;

const PART_TWO_VIEWPORT_WIDTHS = [320, 390, 768, 1024, 1280, 1440, 1920] as const;

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

  for (const route of CORE_ROUTES) {
    await page.goto(route.path);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    const layout = await inspectHorizontalOverflow(page);
    expect(
      layout.documentWidth,
      `${route.path} overflow at 200% text: ${JSON.stringify(layout.offenders)}`,
    ).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(await inspectSiblingOverlaps(page, ".site-header__inner")).toEqual([]);
    expect(await inspectSiblingOverlaps(page, ".site-footer__main")).toEqual([]);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("location layouts adapt across Part 2 widths and 200 percent text", async ({
  page,
}, testInfo) => {
  for (const route of LOCATION_ROUTES) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(route.path);
    await expectSemanticShell(page);

    for (const width of PART_TWO_VIEWPORT_WIDTHS) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
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

    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    const reflowLayout = await inspectHorizontalOverflow(page);
    expect(
      reflowLayout.documentWidth,
      `${route.path} overflow at 200% text: ${JSON.stringify(reflowLayout.offenders)}`,
    ).toBeLessThanOrEqual(reflowLayout.viewportWidth + 1);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("Request a Tour remains contained and operable across Part 3 viewports and reflow", async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await page.goto("/book-viewing?propertyId=RCPP-E2E-001");
    const dialog = page.getByRole("dialog", { name: "Request a Tour" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Close Request a Tour" }),
    ).toBeVisible();
    const layout = await inspectHorizontalOverflow(page);
    expect(
      layout.documentWidth,
      `tour dialog document overflow at ${width}px: ${JSON.stringify(layout.offenders)}`,
    ).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.offenders).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/book-viewing?propertyId=RCPP-E2E-001");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  const dialog = page.getByRole("dialog", { name: "Request a Tour" });
  await expect(dialog).toBeVisible();
  const reflowLayout = await inspectHorizontalOverflow(page);
  expect(
    reflowLayout.documentWidth,
    `tour dialog overflow at 200% text: ${JSON.stringify(reflowLayout.offenders)}`,
  ).toBeLessThanOrEqual(reflowLayout.viewportWidth + 1);
  expect(reflowLayout.offenders).toEqual([]);
  await expect(
    dialog.getByRole("button", { name: "Close Request a Tour" }),
  ).toBeVisible();
});

test("admin skip link focuses the loading session-state main", async ({ page }) => {
  let releaseSession!: () => void;
  const sessionGate = new Promise<void>((resolve) => {
    releaseSession = resolve;
  });
  await page.route("**/api/v1/auth/session", async (route) => {
    await sessionGate;
    await route.fulfill({
      status: 401,
      json: {
        status: "error",
        statusCode: 401,
        message: "Authentication required.",
      },
    });
  });

  await page.goto("/admin");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect(page.locator('main#main-content[aria-busy="true"]')).toBeVisible();
  const loadingLayout = await inspectHorizontalOverflow(page);
  expect(loadingLayout.documentWidth).toBeLessThanOrEqual(
    loadingLayout.viewportWidth + 1,
  );
  await page.getByRole("link", { name: "Skip to main content" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main-content")).toBeFocused();

  releaseSession();
  await expect(page.locator('main#main-content:not([aria-busy="true"])')).toBeVisible();
  await page.unrouteAll({ behavior: "wait" });
});

test("admin skip link focuses every resolved session-state main", async ({ page }) => {
  const scenarios = [
    { kind: "response", status: 401, message: "Authentication required." },
    { kind: "network-error", status: 0, message: "" },
    { kind: "response", status: 200, message: "" },
  ] as const;

  for (const scenario of scenarios) {
    await page.route("**/api/v1/auth/session", (route) => {
      if (scenario.kind === "network-error") return route.abort("connectionfailed");
      return route.fulfill({
        status: scenario.status,
        json:
          scenario.status === 200
            ? {
                authenticated: true,
                staff: {
                  id: "fixture-admin",
                  displayName: "Accessibility Admin",
                  email: "admin@example.test",
                  role: "admin",
                },
                permissions: [],
                csrfToken: "fixture-csrf",
                idleExpiresAt: "2030-09-01T00:00:00.000Z",
                absoluteExpiresAt: "2030-09-01T08:00:00.000Z",
              }
            : {
                status: "error",
                statusCode: scenario.status,
                message: scenario.message,
              },
      });
    });
    await page.goto("/admin");
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await expect(
      page.locator('main#main-content:not([aria-busy="true"])'),
    ).toBeVisible();
    const layout = await inspectHorizontalOverflow(page);
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    await page.getByRole("link", { name: "Skip to main content" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main-content")).toBeFocused();
    await page.unrouteAll({ behavior: "wait" });
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

async function inspectSiblingOverlaps(page: Page, selector: string) {
  return page.evaluate((containerSelector) => {
    const children = [
      ...(document.querySelector(containerSelector)?.children ?? []),
    ] as HTMLElement[];
    const visible = children.filter(
      (element) =>
        getComputedStyle(element).display !== "none" &&
        element.getBoundingClientRect().width > 0 &&
        element.getBoundingClientRect().height > 0,
    );
    const overlaps: string[] = [];
    for (let first = 0; first < visible.length; first += 1) {
      const a = visible[first]!.getBoundingClientRect();
      for (let second = first + 1; second < visible.length; second += 1) {
        const b = visible[second]!.getBoundingClientRect();
        if (
          Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
        ) {
          overlaps.push(`${first}:${second}`);
        }
      }
    }
    return overlaps;
  }, selector);
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
