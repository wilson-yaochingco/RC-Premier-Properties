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
  await expect(video).toHaveAttribute("src", "/media/about_video.mp4");
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState))
    .toBeGreaterThanOrEqual(2);
  await expect(video).toHaveJSProperty("error", null);
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

  for (const path of [
    "/properties",
    "/properties/clark-garden-residence",
    "/locations",
    "/locations/angeles-city",
    "/about",
    "/contact",
    "/sell",
    "/book-viewing",
    "/not-a-public-route",
  ]) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    const routeDialog = page.getByRole("dialog", { name: "Request a Tour" });
    if (await routeDialog.count()) await page.keyboard.press("Escape");
    await page
      .locator("main#main-content")
      .last()
      .evaluate((main) => {
        main.style.minHeight = "140rem";
      });
    await expect(header).toHaveAttribute("data-hidden", "false");
    await page.evaluate(() => window.scrollTo(0, 900));
    await expect(header).toHaveAttribute("data-hidden", "true");
    await expect
      .poll(() => header.evaluate((element) => element.getBoundingClientRect().bottom))
      .toBeLessThanOrEqual(0);
    await page.evaluate(() => window.scrollBy(0, -100));
    await expect(header).toHaveAttribute("data-hidden", "false");
  }
});

test("home hero uses the viewport on desktop and keeps the mobile search over its image", async ({
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
  await expect(page.locator(".home-hero__image")).toHaveAttribute("src", /home_hero/);
  await expect(page.locator(".hero-search nav")).toHaveCount(0);
  await expect(page.locator(".home-hero__shade")).toHaveCount(1);

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
  expect(mobileGeometry.backdropRatio).toBeCloseTo(1, 2);
  expect(mobileGeometry.searchCenter).toBeCloseTo(mobileGeometry.heroCenter, 0);
  await expect(page.getByLabel("Location, Property ID, or keyword")).toBeVisible();
});

test("location guide fills its introduction without a doodle", async ({ page }) => {
  const doodle = page.getByAltText(
    "Line drawing of homes, trees, a bicycle, and neighborhood streets",
  );

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/locations");
  await expect(doodle).toHaveCount(0);
  const desktopPanels = await page.evaluate(() => {
    const statement = document.querySelector<HTMLElement>("[class*='introStatement']")!;
    const grid = document.querySelector<HTMLElement>("[class*='introGrid']")!;
    return {
      gridWidth: grid.getBoundingClientRect().width,
      statementWidth: statement.getBoundingClientRect().width,
    };
  });
  expect(desktopPanels.gridWidth).toBeCloseTo(desktopPanels.statementWidth, 0);

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
  // Keep real metadata from completing the one-time seek before the controlled
  // loadedmetadata fixture below.
  await page.route("**/media/about_video.mp4", (route) => route.abort());
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
  await expect(video).toHaveJSProperty("currentTime", 0);
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
  await expect(page.getByText("Keep exploring Pampanga properties.")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Similar properties" })).toBeVisible();
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

  const footerContact = footer.locator("[class*='site-footer__contact']");
  const [email, phone] = await footerContact.locator("a").evaluateAll((links) =>
    links.map((link) => ({
      top: link.getBoundingClientRect().top,
      bottom: link.getBoundingClientRect().bottom,
      transform: getComputedStyle(link).transform,
    })),
  );
  expect(email).toBeDefined();
  expect(phone).toBeDefined();
  expect(phone!.top - email!.bottom).toBeGreaterThanOrEqual(5);
  await footerContact.getByRole("link", { name: "rcpremierph@gmail.com" }).hover();
  await expect(
    footerContact.getByRole("link", { name: "rcpremierph@gmail.com" }),
  ).toHaveCSS("transform", "none");
});

test("property gallery keeps secondary imagery compact at tablet widths", async ({
  page,
}) => {
  for (const width of [640, 768, 1023]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/properties/clark-garden-residence");
    const geometry = await page.evaluate(() => {
      const main = document.querySelector<HTMLElement>("[class*='galleryMain']")!;
      const side = document.querySelector<HTMLElement>("[class*='gallerySide']")!;
      const title = document.querySelector<HTMLElement>("#property-title")!;
      return {
        mainHeight: main.getBoundingClientRect().height,
        sideHeight: side.getBoundingClientRect().height,
        titleTop: title.getBoundingClientRect().top + window.scrollY,
      };
    });
    expect(geometry.mainHeight).toBeLessThan(width * 0.62);
    expect(geometry.sideHeight).toBeLessThan(190);
    expect(geometry.titleTop).toBeLessThan(width * 1.2);
  }
});

test("paired mobile property actions share intentional geometry", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/properties/clark-garden-residence");
  await expect(page.locator("#property-title")).toBeVisible();
  const actions = page.locator("[class*='mobileActions'] .button");
  await expect(actions).toHaveCount(2);
  const boxes = await actions.evaluateAll((buttons) =>
    buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      return { width: rect.width, height: rect.height, top: rect.top };
    }),
  );
  expect(boxes[0]!.width).toBeCloseTo(boxes[1]!.width, 0);
  expect(boxes[0]!.height).toBeCloseTo(boxes[1]!.height, 0);
  expect(boxes[0]!.top).toBeCloseTo(boxes[1]!.top, 0);
  expect(boxes[0]!.height).toBeGreaterThanOrEqual(44);
});

test("seller page uses four purposeful sections and a simplified typed form", async ({
  page,
}) => {
  await page.goto("/sell");
  await expect(page.locator("main#main-content > section")).toHaveCount(4);
  await expect(page.getByLabel("Inquiry type")).toHaveCount(0);
  await expect(page.getByLabel(/^Property ID/)).toHaveCount(0);
  await expect(page.getByLabel(/Property location or area/)).toBeVisible();
  await expect(page.getByLabel(/Property details and message/)).toBeVisible();
  await expect(
    page.getByText(/not a valuation, listing agreement/i).first(),
  ).toBeVisible();

  await page.getByLabel("Name").fill("Playwright Seller");
  await page.getByLabel("Email").fill("seller@example.test");
  await page.getByLabel("Phone", { exact: true }).fill("+63 917 555 0110");
  await page.getByLabel(/Property location or area/).fill("Angeles City");
  await page
    .getByLabel(/Property details and message/)
    .fill("A synthetic seller inquiry used only for browser testing.");
  await page.getByRole("checkbox").check();
  const response = page.waitForResponse(
    (candidate) =>
      candidate.url().endsWith("/api/v1/inquiries") &&
      candidate.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Start the conversation" }).click();
  const request = (await response).request().postDataJSON();
  expect(request).toMatchObject({
    inquiryType: "selling",
    source: "sell-page",
    subject: "Angeles City",
  });
  expect(request).not.toHaveProperty("propertyId");
});

test("location discovery omits the doodle and keeps documented local photography", async ({
  page,
}) => {
  await page.goto("/locations");
  await expect(
    page.getByAltText(
      "Line drawing of homes, trees, a bicycle, and neighborhood streets",
    ),
  ).toHaveCount(0);

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
    page.getByRole("heading", { name: "Find a property in Angeles City." }),
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
