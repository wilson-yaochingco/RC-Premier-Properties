import { expect, test, type Page } from "@playwright/test";

/** Book a Viewing is an inline page; the dialog is opened from a listing's inquiry panel. */
async function openPropertyTour(page: Page, navigate = true) {
  if (navigate) await page.goto("/properties/clark-garden-residence");
  await page
    .getByRole("complementary", { name: "Property inquiry" })
    .getByRole("button", { name: "Request a Tour" })
    .click();
}

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
  await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, window.innerHeight + 200));
  await expect(header).toHaveAttribute("data-sticky", "true");
  await expect(header).toHaveAttribute("data-hidden", "true");
  await expect
    .poll(() =>
      header
        .locator("button")
        .first()
        .evaluate((element) => element.getBoundingClientRect().bottom),
    )
    .toBeLessThanOrEqual(0);

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
  await expect(page.getByRole("dialog", { name: "Primary navigation" })).toBeVisible();

  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    Number.parseFloat(
      await header.evaluate((element) => getComputedStyle(element).transitionDuration),
    ),
  ).toBeLessThanOrEqual(0.001);

  for (const path of ["/locations"]) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    await expect(page.locator("html")).toHaveClass(/lenis/);
    await page
      .locator("main#main-content")
      .last()
      .evaluate((main) => {
        main.style.minHeight = "140rem";
      });
    await expect(header).toHaveAttribute("data-hidden", "false");
    await page.evaluate(() => window.scrollTo(0, 900));
    await expect(header, `header should hide on ${path}`).toHaveAttribute(
      "data-hidden",
      "true",
    );
    // Editorial routes share the homepage header, whose controls slide out of view.
    await expect
      .poll(() =>
        header
          .locator("button")
          .first()
          .evaluate((element) => element.getBoundingClientRect().bottom),
      )
      .toBeLessThanOrEqual(0);
    await page.evaluate(() => window.scrollBy(0, -100));
    await expect(header).toHaveAttribute("data-hidden", "false");
  }
});

test("home hero fills the viewport with its brand and browse action", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const hero = page.locator("[data-home-hero]");
  const image = hero.getByRole("img", { name: /Modern luxury home at twilight/ });
  await expect(
    hero.getByRole("heading", { level: 1, name: "Find a home worth coming home to." }),
  ).toBeVisible();
  await expect(hero.getByRole("img", { name: "RC Premier Properties" })).toBeVisible();
  await expect(image).toHaveCSS("object-fit", "cover");
  await expect(hero.getByRole("link", { name: "Browse properties" })).toHaveAttribute(
    "href",
    "/properties",
  );
  expect(await hero.evaluate((element) => element.getBoundingClientRect().height)).toBe(
    900,
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(hero.getByRole("link", { name: "Browse properties" })).toBeVisible();
  await expect(image).toBeVisible();
  expect(
    await hero.evaluate((element) => element.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(844);
});

test("location guide opens with a centred architectural hero and no photograph", async ({
  page,
}) => {
  const doodle = page.getByAltText(
    "Line drawing of homes, trees, a bicycle, and neighborhood streets",
  );

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/locations");
  await page.waitForFunction(() => !document.querySelector('[id^="S:"]'));
  await expect(doodle).toHaveCount(0);
  const hero = page.locator('section[aria-labelledby="locations-title"]');
  await expect(hero.getByRole("heading", { level: 1 })).toHaveText(
    "Find the right place for your next home.",
  );
  await expect(hero.getByText("Location guide · Pampanga")).toBeVisible();
  // The supplied villa is decorative: hidden from assistive tech, inert and text-free.
  const art = hero.locator(":scope > div[aria-hidden='true']");
  await expect(art).toHaveCount(1);
  await expect(art).toHaveCSS("pointer-events", "none");
  expect(
    await art.evaluate((element) => getComputedStyle(element).backgroundImage),
  ).toContain("/images/locations/hero-elevation.svg");
  await expect(hero.locator("img, svg:not([aria-hidden='true'])")).toHaveCount(0);
  const asset = await page.request.get("/images/locations/hero-elevation.svg");
  expect(asset.status()).toBe(200);
  expect(asset.headers()["content-type"]).toContain("image/svg+xml");
  expect(await asset.text()).not.toMatch(/<text|<script|<image/);
  const heroBox = (await hero.boundingBox())!;
  expect(heroBox.height).toBeLessThanOrEqual(900);
  expect(heroBox.height).toBeGreaterThan(450);

  // The call to action scrolls to the featured locations.
  const cta = hero.getByRole("link", { name: "Explore locations" });
  await expect(cta).toHaveAttribute("href", "#featured-locations");
  await cta.click();
  await expect(page.locator("#featured-locations")).toBeInViewport();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/locations");
  await page.waitForFunction(() => !document.querySelector('[id^="S:"]'));
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Find the right place for your next home.",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
  ).toBeLessThanOrEqual(0);
});

test("contact opens with an editorial introduction and the shared modern header", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/contact");
  await expect(page.getByText("Say hello", { exact: true })).toHaveCount(0);
  const intro = page.locator("main > section").first();
  await expect(intro.getByRole("heading", { level: 1 })).toHaveText(
    "Let’s talk about your next move.",
  );
  await expect(intro.locator("img")).toHaveCount(0);
  await expect(page.locator("main img")).toHaveCount(0);
  await expect(intro.getByRole("link", { name: /\+63 918 429 1873/ })).toHaveAttribute(
    "href",
    "tel:+639184291873",
  );

  // Same header as Home's sticky state, Properties and Book Viewing: no classic nav bar.
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: /Book a viewing/i })).toBeVisible();
  await expect(header.getByRole("button", { name: "Menu", exact: true })).toBeVisible();
  await expect(header.getByRole("button", { name: "Request a Tour" })).toHaveCount(0);
  await expect(page.locator(".desktop-navigation")).toHaveCount(0);

  // The old three-column section and duplicate social links are gone.
  await expect(page.getByRole("heading", { name: "Need a direct line?" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("heading", { name: "Follow along" })).toHaveCount(0);
  await expect(
    page
      .getByRole("navigation", { name: "Other ways to get started" })
      .getByRole("link"),
  ).toHaveCount(2);
});

test("contact headline is upright and its actions share one arrow and roll interaction", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/contact");

  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveText("Let’s talk about your next move.");
  await expect(heading.locator("em")).toHaveCount(0);
  await expect(heading).toHaveCSS("font-style", "normal");
  await expect(
    page.getByText("Your details are used to respond to this inquiry.", {
      exact: true,
    }),
  ).toBeVisible();

  const main = page.locator("main#main-content");
  const actions = [
    main.getByRole("link", { name: /\+63 918 429 1873/ }),
    main.getByRole("link", { name: /rcpremierph@gmail\.com/ }),
    main.getByRole("link", { name: "Book a viewing" }),
    main.getByRole("link", { name: /Sell a property/ }),
  ];
  // Angle of the arrow in degrees: -45 is up-right, 0 is a plain right arrow.
  const rotation = (link: {
    locator: (selector: string) => ReturnType<typeof page.locator>;
  }) =>
    link.locator("svg").evaluate((svg) => {
      const { transform } = getComputedStyle(svg);
      if (transform === "none") return 0;
      const matrix = new DOMMatrix(transform);
      return Math.round((Math.atan2(matrix.b, matrix.a) * 180) / Math.PI);
    });
  const rolled = (link: (typeof actions)[number]) =>
    link
      .locator(".cta-roll__track > span")
      .first()
      .evaluate((span) => {
        const { transform } = getComputedStyle(span);
        return transform === "none" ? 0 : new DOMMatrix(transform).m42;
      });

  for (const link of actions) {
    await link.scrollIntoViewIfNeeded();
    // Rolling labels keep one spoken label: the duplicate is hidden from assistive tech.
    await expect(
      link.locator(".cta-roll__track > span[aria-hidden='true']"),
    ).toHaveCount(1);
    // Default: up-right arrow. Hover: plain right arrow.
    expect(await rotation(link)).toBe(-45);
    const before = await link.boundingBox();
    await link.hover();
    await expect.poll(() => rotation(link)).toBe(0);
    await expect.poll(() => rolled(link)).toBeLessThan(0);
    const after = await link.boundingBox();
    expect(after?.width).toBeCloseTo(before!.width, 0);
    expect(after?.height).toBeCloseTo(before!.height, 0);
    await page.mouse.move(0, 0);
    await expect.poll(() => rotation(link)).toBe(-45);

    // Keyboard focus gives the same treatment.
    await link.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(link).toBeFocused();
    await expect.poll(() => rotation(link)).toBe(0);
    await link.blur();
  }

  // The submit button uses the same arrow; the labels and fields stay static.
  const submit = page.getByRole("button", { name: "Send inquiry" });
  await submit.scrollIntoViewIfNeeded();
  expect(await rotation(submit)).toBe(-45);
  await submit.hover();
  await expect.poll(() => rotation(submit)).toBe(0);
  await expect(page.locator("main label .cta-roll")).toHaveCount(0);
  await expect(heading.locator(".cta-roll")).toHaveCount(0);
});

test("contact arrows and labels stay still under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/contact");
  const link = page
    .locator("main#main-content")
    .getByRole("link", { name: "Book a viewing" });
  await link.scrollIntoViewIfNeeded();
  await link.hover();
  await page.waitForTimeout(400);
  expect(
    await link.locator("svg").evaluate((svg) => getComputedStyle(svg).transform),
  ).toMatch(/^matrix\(0\.70/);
  expect(
    await link
      .locator(".cta-roll__track > span")
      .first()
      .evaluate((span) => getComputedStyle(span).transform),
  ).toBe("none");
});

test("tour steps fit normal viewports and remain reachable at 200 percent text", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await openPropertyTour(page);
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
  await page.goto("/properties/clark-garden-residence");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await openPropertyTour(page, false);
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

  // The fixed header sits above the hero; together they fill the first viewport.
  const composition = await page.evaluate(() => {
    const header = document.querySelector<HTMLElement>("header[data-sticky]")!;
    const hero = document.querySelector<HTMLElement>("main section")!;
    return {
      headerBottom: header.getBoundingClientRect().bottom,
      heroTop: hero.getBoundingClientRect().top,
      heroBottom: hero.getBoundingClientRect().bottom,
    };
  });
  expect(Math.abs(composition.heroTop - composition.headerBottom)).toBeLessThanOrEqual(
    1,
  );
  expect(Math.abs(composition.heroBottom - 900)).toBeLessThanOrEqual(1);
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

test("homepage route actions and footer remain usable across viewports", async ({
  page,
}) => {
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await page.goto("/");
    const route = page.getByRole("link", { name: "Buy a home" });
    await expect(route).toBeVisible();
    await expect(route).toHaveAttribute("href", "/properties");
    await route.focus();
    await expect(route).toBeFocused();
    expect(
      await route.evaluate((link) => getComputedStyle(link).outlineStyle),
    ).not.toBe("none");
  }

  const about = page.getByRole("contentinfo").getByRole("link", { name: "About" });
  await about.click();
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

  const card = page.locator("[data-featured-property-card]").first();
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("href", /\/properties\//);

  const footer = page.getByRole("contentinfo");
  const footerPresentation = await footer.evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
  }));
  expect(footerPresentation.background).toBe("rgb(238, 234, 226)");

  const email = footer.getByRole("link", { name: "rcpremierph@gmail.com" });
  const phone = footer.getByRole("link", { name: "+63 918 429 1873" });
  await expect(email).toBeVisible();
  await expect(phone).toBeVisible();
  await email.hover();
  await expect(email).toHaveCSS("transform", "none");
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

test("seller page opens with the inquiry form and maps its fields into the contract", async ({
  page,
}) => {
  await page.goto("/sell");
  const sections = page.locator("main#main-content > section");
  await expect(sections).toHaveCount(5);
  await expect(sections.nth(1)).toHaveAttribute("id", "seller-inquiry");
  await expect(page.getByRole("link", { name: "Start your inquiry" })).toHaveAttribute(
    "href",
    "#seller-inquiry",
  );
  await expect(page.getByLabel("Inquiry type")).toHaveCount(0);
  await expect(page.getByLabel(/^Property ID/)).toHaveCount(0);
  await expect(page.getByLabel(/Property location or area/)).toBeVisible();
  await expect(page.getByLabel(/Property details and message/)).toBeVisible();
  await expect(page.getByText("A first conversation, not a commitment.")).toBeVisible();
  await expect(
    page.getByText("Your details are used to respond to this inquiry.", {
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page.getByText(/^Residential properties in Pampanga$/i)).toHaveCount(0);

  await page.getByLabel("Full name").fill("Playwright Seller");
  await page.getByLabel("Email address").fill("seller@example.test");
  await page.getByLabel("Phone number").fill("+63 917 555 0110");
  await page.getByLabel(/Property location or area/).fill("Angeles City");
  await page.getByLabel(/Property type/).selectOption("Townhouse");
  await page
    .getByLabel(/Property details and message/)
    .fill("A synthetic seller inquiry used only for browser testing.");
  await page.getByRole("checkbox").check();
  const response = page.waitForResponse(
    (candidate) =>
      candidate.url().endsWith("/api/v1/inquiries") &&
      candidate.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Send seller inquiry" }).click();
  const request = (await response).request().postDataJSON();
  expect(request).toMatchObject({
    inquiryType: "selling",
    source: "sell-page",
    subject: "Townhouse · Angeles City",
  });
  expect(request).not.toHaveProperty("propertyId");
});

test("featured locations and the curated collection lead to real routes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/locations");
  await page.waitForFunction(() => !document.querySelector('[id^="S:"]'));
  await expect(
    page.getByAltText(
      "Line drawing of homes, trees, a bicycle, and neighborhood streets",
    ),
  ).toHaveCount(0);

  // Four curated tiles, each a real photograph and a link to its location page.
  const featured = page.locator("#featured-locations");
  for (const [name, slug] of [
    ["Angeles City", "angeles-city"],
    ["Mabalacat City", "mabalacat-city"],
    ["Magalang", "magalang"],
    ["Porac", "porac"],
  ] as const) {
    await expect(
      featured.getByRole("link", { name: new RegExp(`${name}`) }).first(),
    ).toHaveAttribute("href", `/locations/${slug}`);
  }
  await expect(
    featured.getByAltText(
      "Angeles City skyline and Mount Arayat beneath a pale sunset sky",
    ),
  ).toBeVisible();

  // The four destinations stay available without a search section on this page.
  await expect(page.locator("#explore-modes")).toHaveCount(0);
  await expect(
    page.getByRole("search", { name: /Search properties by location/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Browse all properties" }).first(),
  ).toHaveAttribute("href", "/properties");
  await expect(page.locator("[data-featured-property-card]").first()).toHaveAttribute(
    "href",
    /^\/properties\//,
  );

  await page.goto("/locations/angeles-city");
  await page.waitForFunction(() => !document.querySelector('[id^="S:"]'));
  await expect(
    page.getByRole("heading", { name: "Find a property in Angeles City." }),
  ).toBeVisible();
  await expect(
    page
      .locator('section[aria-labelledby="location-title"]')
      .getByAltText("Angeles City skyline and Mount Arayat beneath a pale sunset sky"),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Wikimedia Commons" })).toHaveAttribute(
    "href",
    /commons\.wikimedia\.org/,
  );
});
