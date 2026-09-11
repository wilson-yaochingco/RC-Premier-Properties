import { expect, test } from "@playwright/test";

test("About uses a subdued motion-aware video and the real Pampanga boundary", async ({
  page,
}) => {
  await page.goto("/about");

  const video = page.locator("video");
  await expect(video).toHaveAttribute("data-start-time", "4");
  await expect(video).toHaveAttribute("autoplay", "");
  await expect(video).toHaveAttribute("loop", "");
  await expect(video).toHaveAttribute("playsinline", "");
  await expect(video).toHaveJSProperty("muted", true);
  await expect(video).toHaveAttribute("src", /^https:\/\/videos\.ctfassets\.net/);
  await expect(
    page.getByRole("img", { name: /Still two-dimensional map of Pampanga/ }),
  ).toBeVisible();
  await expect(page.locator("figure svg path")).toHaveCount(22);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(video).toHaveCSS("display", "none");
});

test("public header hides deliberately and remains available during interaction", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");

  const header = page.getByRole("banner");
  await expect(header).toHaveAttribute("data-hidden", "false");
  const headerGeometry = await header.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    logoWidth: element.querySelector(".brand-logo")!.getBoundingClientRect().width,
  }));
  expect(headerGeometry.height).toBeLessThanOrEqual(65);
  expect(headerGeometry.logoWidth).toBeLessThanOrEqual(97);
  await page.evaluate(() => window.scrollTo(0, 800));
  await expect(header).toHaveAttribute("data-hidden", "true");
  await expect
    .poll(() => header.evaluate((element) => element.getBoundingClientRect().bottom))
    .toBeLessThanOrEqual(0);
  await expect
    .poll(() =>
      header.evaluate(
        (element) =>
          element.querySelector(".brand-logo")!.getBoundingClientRect().bottom,
      ),
    )
    .toBeLessThanOrEqual(0);

  await page.evaluate(() => window.scrollBy(0, -100));
  await expect(header).toHaveAttribute("data-hidden", "false");
  await page.evaluate(() => window.scrollBy(0, 100));
  await expect(header).toHaveAttribute("data-hidden", "true");
  await header.getByRole("link", { name: "Home", exact: true }).focus();
  await expect(header).toHaveAttribute("data-hidden", "false");
  await page.locator("main#main-content").focus();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(header).toHaveAttribute("data-hidden", "true");
  await header.dispatchEvent("pointerdown");
  await expect(header).toHaveAttribute("data-hidden", "false");
  await page.evaluate(() => window.dispatchEvent(new PointerEvent("pointerup")));

  await page.evaluate(() => window.scrollBy(0, -100));
  await expect(header).toHaveAttribute("data-hidden", "false");
  await page.evaluate(() => window.scrollBy(0, 100));
  await expect(header).toHaveAttribute("data-hidden", "true");
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Contact", exact: true })
    .click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(header).toHaveAttribute("data-hidden", "false");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Menu" }).click();
  await page.evaluate(() => window.scrollTo(0, 900));
  await expect(header).toHaveAttribute("data-hidden", "false");
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toBeVisible();

  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    Number.parseFloat(
      await header.evaluate((element) => getComputedStyle(element).transitionDuration),
    ),
  ).toBeLessThanOrEqual(0.001);
});

test("home hero uses the viewport on desktop and a wider mobile photo composition", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const desktopGeometry = await page.evaluate(() => {
    const header = document.querySelector<HTMLElement>(".site-header")!;
    const hero = document.querySelector<HTMLElement>(".home-hero")!;
    const search = document.querySelector<HTMLElement>(".hero-search")!;
    const heroRect = hero.getBoundingClientRect();
    const searchRect = search.getBoundingClientRect();
    return {
      compositionBottom: header.getBoundingClientRect().height + heroRect.height,
      heroCenter: heroRect.left + heroRect.width / 2,
      imageFit: getComputedStyle(document.querySelector(".home-hero__image")!)
        .objectFit,
      searchCenter: searchRect.left + searchRect.width / 2,
    };
  });
  expect(Math.abs(desktopGeometry.compositionBottom - 900)).toBeLessThanOrEqual(1);
  expect(desktopGeometry.searchCenter).toBeCloseTo(desktopGeometry.heroCenter, 0);
  expect(desktopGeometry.imageFit).toBe("cover");

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileGeometry = await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>(".home-hero")!;
    const backdrop = document.querySelector<HTMLElement>(".home-hero__backdrop")!;
    const search = document.querySelector<HTMLElement>(".hero-search")!;
    const heroRect = hero.getBoundingClientRect();
    const searchRect = search.getBoundingClientRect();
    return {
      backdropRatio: backdrop.getBoundingClientRect().height / heroRect.height,
      heroCenter: heroRect.left + heroRect.width / 2,
      searchCenter: searchRect.left + searchRect.width / 2,
    };
  });
  expect(mobileGeometry.backdropRatio).toBeLessThan(0.7);
  expect(mobileGeometry.searchCenter).toBeCloseTo(mobileGeometry.heroCenter, 0);
  await expect(page.getByLabel("Location, Property ID, or keyword")).toBeVisible();
});

test("location guide removes the mobile doodle without weakening the desktop pairing", async ({
  page,
}) => {
  const doodle = page.getByAltText(
    "Line drawing of homes, trees, a bicycle, and neighborhood streets",
  );

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/locations");
  await expect(doodle).toBeVisible();
  const desktopPanels = await page.evaluate(() => {
    const statement = document.querySelector<HTMLElement>("[class*='introStatement']")!;
    const media = document.querySelector<HTMLElement>("[class*='introMedia']")!;
    return {
      mediaHeight: media.getBoundingClientRect().height,
      statementHeight: statement.getBoundingClientRect().height,
    };
  });
  expect(desktopPanels.mediaHeight).toBeCloseTo(desktopPanels.statementHeight, 0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(doodle).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Explore the places behind the properties." }),
  ).toBeVisible();
});

test("contact starts with its image hero and social links expose motion-aware interaction", async ({
  page,
}) => {
  await page.goto("/contact");
  await expect(page.getByText("Say hello", { exact: true })).toHaveCount(0);
  const firstSection = page.locator("main > section").first();
  await expect(firstSection.getByRole("heading", { level: 1 })).toHaveText(
    "Looking for the right next step?",
  );
  await expect(
    firstSection.getByAltText(
      "Dining area with warm wood finishes and sculptural lighting",
    ),
  ).toBeVisible();

  const socialSection = page
    .getByRole("heading", { name: "Follow along" })
    .locator("..");

  for (const platform of ["Facebook", "Instagram", "YouTube", "TikTok"]) {
    const link = socialSection.getByRole("link", { name: new RegExp(platform) });
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link.locator("svg")).toHaveCount(1);
  }

  const facebook = socialSection.getByRole("link", { name: /Facebook/ });
  const facebookIcon = facebook.locator("span").first();
  await facebook.hover();
  expect(await facebook.evaluate((link) => getComputedStyle(link).transform)).not.toBe(
    "none",
  );
  await expect(facebookIcon).toHaveCSS("background-color", "rgb(180, 137, 61)");
  await facebook.focus();
  await expect(facebook).toBeFocused();
  expect(
    await facebook.evaluate((link) => getComputedStyle(link).outlineStyle),
  ).not.toBe("none");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const reducedFacebook = page.getByRole("link", {
    name: /Facebook — RC Premier Properties/,
  });
  expect(
    Number.parseFloat(
      await reducedFacebook.evaluate(
        (link) => getComputedStyle(link).transitionDuration,
      ),
    ),
  ).toBeLessThanOrEqual(0.001);
});

test("tour steps fit normal viewports and remain reachable at 200 percent text", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/book-viewing?propertyId=RCPP-E2E-001");
    const dialog = page.getByRole("dialog", { name: "Request a Tour" });
    await expect(dialog).toBeVisible();
    expect(
      await dialog.evaluate(
        (element) => element.scrollHeight <= element.clientHeight + 1,
      ),
    ).toBe(true);
    await dialog.getByRole("button", { name: "Next" }).click();
    expect(
      await dialog.evaluate(
        (element) => element.scrollHeight <= element.clientHeight + 1,
      ),
    ).toBe(true);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/book-viewing?propertyId=RCPP-E2E-001");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  const dialog = page.getByRole("dialog", { name: "Request a Tour" });
  await dialog.getByRole("button", { name: "Next" }).click();
  const submit = dialog.getByRole("button", { name: "Submit request" });
  await submit.scrollIntoViewIfNeeded();
  await expect(submit).toBeVisible();
});

test("About video requests playback once and the hero fills the desktop composition", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = { playCalls: 0 };
    Object.defineProperty(window, "__aboutVideoState", { value: state });
    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      value() {
        state.playCalls += 1;
        return Promise.resolve();
      },
    });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/about");

  await expect
    .poll(() =>
      page.evaluate(() => {
        return (window as Window & { __aboutVideoState: { playCalls: number } })
          .__aboutVideoState.playCalls;
      }),
    )
    .toBe(1);
  const video = page.locator("video");
  await video.evaluate((element) => {
    Object.defineProperties(element, {
      currentTime: { configurable: true, value: 0, writable: true },
      duration: { configurable: true, get: () => 30 },
      readyState: {
        configurable: true,
        get: () => HTMLMediaElement.HAVE_METADATA,
      },
    });
    element.dispatchEvent(new Event("loadedmetadata"));
  });
  expect(await video.evaluate((element) => element.currentTime)).toBe(4);
  await video.dispatchEvent("canplay");
  await video.dispatchEvent("canplay");
  expect(
    await page.evaluate(() => {
      return (window as Window & { __aboutVideoState: { playCalls: number } })
        .__aboutVideoState.playCalls;
    }),
  ).toBe(1);

  const compositionBottom = await page.evaluate(() => {
    const header = document.querySelector<HTMLElement>(".site-header")!;
    const hero = document.querySelector<HTMLElement>("main section")!;
    return header.getBoundingClientRect().height + hero.getBoundingClientRect().height;
  });
  expect(Math.abs(compositionBottom - 900)).toBeLessThanOrEqual(1);
});

test("About reduced-motion entry remains on the static poster", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const state = { playCalls: 0 };
    Object.defineProperty(window, "__aboutReducedMotionState", { value: state });
    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      value() {
        state.playCalls += 1;
        return Promise.resolve();
      },
    });
  });
  await page.goto("/about");

  const video = page.locator("video");
  await expect(video).toHaveAttribute("data-reduced-motion", "true");
  await expect(video).not.toHaveAttribute("autoplay", "");
  await expect(video).toHaveCSS("display", "none");
  expect(
    await page.evaluate(() => {
      return (window as Window & { __aboutReducedMotionState: { playCalls: number } })
        .__aboutReducedMotionState.playCalls;
    }),
  ).toBe(0);
});

test("the targeted Home action stays usable while the duplicate property action is removed", async ({
  page,
}) => {
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await page.goto("/");
    await expect(page.getByRole("link", { name: "View all properties" })).toHaveCount(
      0,
    );

    const learn = page.getByRole("link", { name: "Learn about us" });
    await learn.scrollIntoViewIfNeeded();
    await expect(learn).toBeVisible();
    await expect(learn).toHaveAttribute("href", "/about");
    await expect(learn).toHaveCSS("border-radius", "0px");
    const bounds = await learn.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    await learn.focus();
    expect(
      await learn.evaluate((link) => getComputedStyle(link).outlineStyle),
    ).not.toBe("none");
  }

  const learn = page.getByRole("link", { name: "Learn about us" });
  await learn.hover();
  await expect(learn).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await learn.click();
  await expect(page).toHaveURL(/\/about$/);

  await page.goto("/properties/clark-garden-residence");
  const browse = page.getByRole("link", { name: "Browse all properties" }).last();
  await browse.scrollIntoViewIfNeeded();
  await expect(browse).toHaveAttribute("href", "/properties");
  await browse.click();
  await expect(page).toHaveURL(/\/properties$/);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const card = page.locator("[data-property-card]").first();
  await expect(card).toBeVisible();
  await expect(card).toHaveCSS("border-radius", "0px");

  const footer = page.getByRole("contentinfo");
  const footerPresentation = await footer.evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    height: element.getBoundingClientRect().height,
  }));
  expect(footerPresentation.background).toBe("rgb(58, 66, 79)");
  expect(footerPresentation.height).toBeLessThan(560);
});

test("seller photography behaves as a three-card keyboard and swipe stack", async ({
  page,
}) => {
  await page.goto("/sell");
  const stack = page.getByRole("group", { name: "Seller experience photography" });

  await expect(stack.getByText("One connected inquiry workflow")).toBeVisible();
  await page.getByRole("button", { name: "Next seller photo" }).click();
  await expect(stack.getByText("Property context before assumptions")).toBeVisible();

  await stack.press("ArrowRight");
  await expect(stack.getByText("Direct follow-up with the team")).toBeVisible();

  await stack.dispatchEvent("pointerdown", { clientX: 200, pointerId: 1 });
  await stack.dispatchEvent("pointerup", { clientX: 100, pointerId: 1 });
  await expect(stack.getByText("One connected inquiry workflow")).toBeVisible();
});

test("location discovery uses the supplied drawing and documented local photography", async ({
  page,
}) => {
  await page.goto("/locations");
  await expect(
    page.getByAltText(
      "Line drawing of homes, trees, a bicycle, and neighborhood streets",
    ),
  ).toBeVisible();

  const firstLocation = page.locator("[data-location-card]").first();
  await firstLocation.getByRole("link").focus();
  await expect(firstLocation.getByRole("link")).toBeFocused();
  await expect
    .poll(() =>
      firstLocation
        .locator("img")
        .evaluate((image) => getComputedStyle(image).transform),
    )
    .not.toBe("none");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  expect(
    Number.parseFloat(
      await firstLocation
        .locator("img")
        .evaluate((image) => getComputedStyle(image).transitionDuration),
    ),
  ).toBeLessThanOrEqual(0.001);

  await page.goto("/locations/angeles-city");
  await expect(
    page.getByRole("heading", { name: "A view of the local setting." }),
  ).toBeVisible();
  await expect(
    page.getByAltText(
      "Angeles City skyline and Mount Arayat beneath a pale sunset sky",
    ),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Wikimedia Commons" })).toHaveAttribute(
    "href",
    /commons\.wikimedia\.org/,
  );
});
