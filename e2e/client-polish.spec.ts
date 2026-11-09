import { expect, test, type Page } from "@playwright/test";

/** Book a Viewing is an inline page; the dialog is opened from a listing's inquiry panel. */
async function openPropertyTour(page: Page, navigate = true) {
  if (navigate) await page.goto("/properties/clark-garden-residence");
  await page
    .getByRole("complementary", { name: "Property inquiry" })
    .getByRole("button", { name: "Book a Viewing" })
    .click();
}

test("About uses a static hero photograph and an editorial gallery", async ({
  page,
}) => {
  const mediaRequests: string[] = [];
  page.on("request", (request) => {
    if (/\.(mp4|webm)(\?|$)/.test(request.url())) mediaRequests.push(request.url());
  });
  await page.goto("/about");

  await expect(page.locator("section[data-about-hero] video")).toHaveCount(1);
  await expect(page.locator("video")).toHaveCount(1);
  expect(mediaRequests.every((url) => url.includes("/media/about-hero.mp4"))).toBe(
    true,
  );
  await expect(page.locator("main > section")).toHaveCount(6);
  await expect(page.locator("#about-gallery a")).toHaveCount(5);
  await expect(
    page.getByRole("link", { name: "Talk to RC Premier" }).first(),
  ).toHaveAttribute("href", "/contact");
});

test("About gallery supports mouse dragging without activating a destination", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/about");
  const rail = page.locator("#about-gallery");
  await rail.scrollIntoViewIfNeeded();
  await expect(rail.locator("a")).toHaveCount(5);
  await expect(page.getByRole("button", { name: /destinations/ })).toHaveCount(0);
  await expect(rail).toHaveCSS("scrollbar-width", "none");
  await rail.focus();
  for (let index = 0; index < 5; index++) await page.keyboard.press("ArrowRight");
  await expect
    .poll(() =>
      rail.evaluate((element) =>
        Math.abs(element.scrollWidth - element.clientWidth - element.scrollLeft),
      ),
    )
    .toBeLessThanOrEqual(2);
  await rail.evaluate((element) => element.scrollTo({ left: 0, behavior: "instant" }));
  const box = (await rail.boundingBox())!;
  const x = box.x + 350;
  const y = Math.max(110, box.y + 180);
  await page.mouse.move(x, y);
  const tip = page.locator('[class*="dragTip"]');
  await expect(tip).toBeVisible();
  await expect(tip).toHaveCSS("pointer-events", "none");
  // The tip follows the pointer from just above and to the right, never covering it.
  expect(
    await tip.evaluate(
      (element, point) => {
        const box = element.getBoundingClientRect();
        const gapX = box.left - point.x;
        const gapY = point.y - box.bottom;
        return gapX >= 0 && gapX <= 8 && gapY >= 0 && gapY <= 8;
      },
      { x, y },
    ),
  ).toBe(true);
  await page.mouse.down();
  await page.mouse.move(x - 140, y, { steps: 10 });
  await page.mouse.up();
  await expect
    .poll(() => rail.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(30);
  await expect(page).toHaveURL(/\/about$/);
  await page.mouse.move(5, 100);
  await expect(tip).not.toBeVisible();
  await rail.locator("a").nth(1).click();
  await expect(page).toHaveURL(/\/locations$/);
});

test("public header hides deliberately and remains available during interaction", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  // The first-visit brand intro holds the page still; this test is about the header.
  await page.addInitScript(() => sessionStorage.setItem("rc-intro-seen", "1"));
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
    .getByRole("link", { name: "Contact Us", exact: true })
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
    await page.evaluate(() => window.scrollTo(0, 1600));
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
  const video = hero.locator("video");
  await expect(
    hero.getByRole("heading", { level: 1, name: "Find a home worth coming home to." }),
  ).toBeVisible();
  await expect(hero.getByRole("img", { name: "RC Premier Properties" })).toBeVisible();
  await expect(video.locator("source")).toHaveAttribute(
    "src",
    "/media/homepage-hero.mp4",
  );
  await expect(video).toHaveAttribute("data-ready", "true");
  await expect(video).toHaveJSProperty("muted", true);
  await expect(video).toHaveJSProperty("loop", true);
  await expect(video).toHaveJSProperty("playsInline", true);
  await expect(video).toHaveCSS("object-fit", "cover");
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
  await expect(video).toBeVisible();
  expect(
    await hero.evaluate((element) => element.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(844);
});

test("location guide opens with a full-height video hero and no photograph", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/locations");
  await page.waitForFunction(() => !document.querySelector('[id^="S:"]'));
  const hero = page.locator('section[aria-labelledby="locations-title"]');
  await expect(hero.getByRole("heading", { level: 1 })).toHaveText(
    "Find the right place for your next home in Pampanga",
  );
  await expect(hero.getByText(/Explore communities across Pampanga/)).toBeVisible();
  // The backdrop is a muted, decorative video; the hero carries no photograph.
  const video = hero.locator("video");
  await expect(video).toHaveCount(1);
  await expect(video).toHaveAttribute("aria-hidden", "true");
  expect(await video.evaluate((element: HTMLVideoElement) => element.muted)).toBe(true);
  await expect(hero.locator("img")).toHaveCount(0);
  const heroBox = (await hero.boundingBox())!;
  expect(heroBox.height).toBe(900);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/locations");
  await page.waitForFunction(() => !document.querySelector('[id^="S:"]'));
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Find the right place for your next home in Pampanga",
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
  // The heading stays upright; only the editorial accent word is italic.
  await expect(heading.locator("em")).toHaveText("move");
  await expect(heading).toHaveCSS("font-style", "normal");
  await expect(
    page.getByText("Your details are used to respond to this inquiry.", {
      exact: true,
    }),
  ).toBeVisible();

  const main = page.locator("main#main-content");
  const actions = [
    main.getByRole("link", { name: /\+63 918 429 1873/ }),
    main.getByRole("link", { name: /rcpropertiesss@gmail\.com/ }),
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

test("About hero fills the desktop composition", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/about");

  // About overlays the header on the photograph, which fills the entire viewport.
  const composition = await page.evaluate(() => {
    const header = document.querySelector<HTMLElement>("header[data-sticky]")!;
    const hero = document.querySelector<HTMLElement>("main section")!;
    return {
      headerBottom: header.getBoundingClientRect().bottom,
      heroTop: hero.getBoundingClientRect().top,
      heroBottom: hero.getBoundingClientRect().bottom,
    };
  });
  expect(composition.heroTop).toBe(0);
  await expect(page.locator("header[data-sticky]")).toHaveAttribute(
    "data-sticky",
    "false",
  );
  await page.evaluate(() => window.scrollTo({ top: 180, behavior: "instant" }));
  await expect(page.locator("header[data-sticky]")).toHaveAttribute(
    "data-sticky",
    "false",
  );
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
  expect(footerPresentation.background).toBe("rgb(37, 44, 54)");

  const email = footer.getByRole("link", { name: "rcpropertiesss@gmail.com" });
  const phone = footer.getByRole("link", { name: "+63 918 429 1873" });
  await expect(email).toBeVisible();
  await expect(phone).toBeVisible();
  await email.hover();
  await expect(email).toHaveCSS("transform", "none");
});

test("property gallery preserves portraits in a swipe track at tablet widths", async ({
  page,
}) => {
  for (const width of [640, 768, 1023]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/properties/clark-garden-residence");
    const geometry = await page.evaluate(() => {
      const track = document.querySelector<HTMLElement>("[data-gallery-track]")!;
      const title = document.querySelector<HTMLElement>("#property-title")!;
      return {
        trackHeight: track.getBoundingClientRect().height,
        scrolls: getComputedStyle(track).overflowX,
        imageFit: getComputedStyle(track.querySelector("img")!).objectFit,
        titleTop: title.getBoundingClientRect().top + window.scrollY,
      };
    });
    expect(geometry.scrolls).toBe("auto");
    expect(geometry.imageFit).toBe("cover");
    expect(geometry.trackHeight).toBeLessThan(width);
    expect(geometry.titleTop).toBeLessThan(width * 1.5);
  }
});

test("mobile property inquiry stays in flow with comfortable actions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/properties/clark-garden-residence");
  await expect(page.locator("#property-title")).toBeVisible();
  const inquiry = page.getByRole("complementary", { name: "Property inquiry" });
  await expect(inquiry).toHaveCSS("position", "static");
  const actions = inquiry.locator(".button");
  await expect(actions).toHaveCount(2);
  const boxes = await actions.evaluateAll((buttons) =>
    buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      return { width: rect.width, height: rect.height, top: rect.top };
    }),
  );
  expect(boxes[0]!.width).toBeCloseTo(boxes[1]!.width, 0);
  expect(boxes[0]!.height).toBeCloseTo(boxes[1]!.height, 0);
  expect(boxes[1]!.top).toBeGreaterThanOrEqual(boxes[0]!.top + boxes[0]!.height);
  expect(boxes[0]!.height).toBeGreaterThanOrEqual(44);
});

test("seller editorial page retains its inquiry form and maps its fields into the contract", async ({
  page,
}) => {
  await page.goto("/sell");
  const sections = page.locator("main#main-content > section");
  await expect(sections).toHaveCount(5);
  await expect(sections.nth(3)).toHaveAttribute("id", "sell-inquiry");
  await expect(page.getByRole("link", { name: "Start your inquiry" })).toHaveAttribute(
    "href",
    "#sell-inquiry",
  );
  await expect(page.getByLabel("Inquiry type")).toHaveCount(0);
  await expect(page.getByLabel(/^Property ID/)).toHaveCount(0);
  await expect(page.getByLabel(/Property location or area/)).toBeVisible();
  await expect(page.getByLabel(/Property details and message/)).toBeVisible();
  await expect(
    page.getByText(/This is preparation guidance, not a list of required documents/),
  ).toBeVisible();
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

  // Four static curated tiles, each with approved property photography.
  const featured = page.locator("#featured-locations");
  for (const [name, slug] of [
    ["Angeles City", "angeles-city"],
    ["Mabalacat City", "mabalacat-city"],
    ["Magalang", "magalang"],
    ["Porac", "porac"],
  ] as const) {
    await expect(featured.locator(`[data-tile="${slug}"] h3`)).toHaveText(name);
  }
  await expect(
    featured.getByAltText("Two-storey modern home with timber-slat balcony screens"),
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

  await expect(featured.getByRole("link")).toHaveCount(0);
  const response = await page.goto("/locations/angeles-city");
  expect(response?.status()).toBe(404);
});
