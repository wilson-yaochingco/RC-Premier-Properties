import { expect, test } from "@playwright/test";

for (const width of [1920, 1440, 1024, 768, 390, 320]) {
  test(`Sell editorial layout at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/sell");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("main > section")).toHaveCount(5);
    await expect(page.locator("#sell-heading")).toHaveText(
      "Your property, thoughtfully presented",
    );
    await expect(page.locator("video")).toHaveCount(1);
    await expect(page.locator("video source")).toHaveAttribute(
      "src",
      "/media/sell-hero.mp4",
    );
    await expect(page.locator("video")).toHaveAttribute("data-ready", "true");
    expect(
      await page
        .locator("video")
        .evaluate((video) => (video as HTMLVideoElement).paused),
    ).toBe(true);
    await expect(
      page
        .getByRole("link", { name: "Tell us about your property", exact: true })
        .first(),
    ).toHaveAttribute("href", "#sell-inquiry");
    await expect(page.locator("main figure")).toHaveCount(4);
    await expect(page.locator("details")).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBe(0);
    await page.screenshot({ path: testInfo.outputPath(`sell-${width}-hero.png`) });
    await page.locator("#preparation-heading").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath(`sell-${width}-preparation.png`),
    });
    await page.locator("#gallery-heading").scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`sell-${width}-journey.png`) });
    await page.locator("#sell-inquiry").scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`sell-${width}-form.png`) });
    expect(errors).toEqual([]);
  });
}

for (const width of [320, 390, 768, 1024]) {
  test(`About headline keeps its geometry through the reveal at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const measure = () =>
      page.locator("#drives-heading").evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return {
          height: el.getBoundingClientRect().height,
          width: el.getBoundingClientRect().width,
          lines: [...range.getClientRects()]
            .filter((r) => r.width > 0)
            .map((r) => r.height),
          html: el.innerHTML,
        };
      });
    for (const mode of ["direct", "refresh", "navigation"]) {
      if (mode === "direct") await page.goto("/about");
      if (mode === "refresh") await page.reload();
      if (mode === "navigation") {
        await page.goto("/sell");
        await page.locator('footer a[href="/about"]').click();
        await expect(page).toHaveURL(/\/about$/);
      }
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator("#drives-heading")).toHaveAttribute(
        "data-motion-ready",
        "",
      );
      const before = await measure();
      await page.evaluate(() => {
        const heading = document.querySelector("#drives-heading")!;
        window.scrollTo(
          0,
          heading.getBoundingClientRect().top + scrollY - innerHeight * 0.75,
        );
      });
      for (const [index, delay] of [0, 180, 280, 600].entries()) {
        await page.waitForTimeout(delay);
        const frame = await measure();
        expect(frame.height).toBeCloseTo(before.height, 1);
        expect(frame.width).toBeCloseTo(before.width, 1);
        expect(frame.html).toBe(before.html);
        if (mode === "direct")
          await page.screenshot({
            path: testInfo.outputPath(`about-${width}-reveal-${index}.png`),
          });
      }
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator("#drives-heading")).toBeVisible();
    await expect
      .poll(() =>
        page.locator("#drives-heading").evaluate((el) => getComputedStyle(el).opacity),
      )
      .toBe("1");
  });
}

test("Sell retains honest pending, error, retry and success submission behavior", async ({
  page,
}) => {
  await page.goto("/sell");
  await page
    .getByRole("link", { name: "Tell us about your property", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/#sell-inquiry$/);
  await page.getByRole("button", { name: "Send seller inquiry" }).click();
  expect(
    await page
      .locator("form")
      .evaluate((form) => (form as HTMLFormElement).checkValidity()),
  ).toBe(false);
  await page.getByLabel("Full name").fill("Browser Test Seller");
  await page.getByLabel("Email address").fill("seller@example.test");
  await page.getByLabel("Phone number").fill("+63 917 555 0110");
  await page.getByLabel(/Property location or area/).fill("Angeles City");
  await page.getByLabel(/Property type/).selectOption("Townhouse");
  await page
    .getByLabel(/Property details and message/)
    .fill("Asking price PHP 8,750,000. A synthetic browser inquiry.");
  await page.getByRole("checkbox").check();
  let attempt = 0;
  await page.route("**/inquiries", async (route) => {
    const payload = route.request().postDataJSON();
    expect(payload).toMatchObject({
      inquiryType: "selling",
      source: "sell-page",
      subject: "Townhouse \u00b7 Angeles City",
    });
    expect(payload.message).toContain("8,750,000");
    await new Promise((resolve) => setTimeout(resolve, 300));
    attempt++;
    await route.fulfill({
      status: attempt === 1 ? 503 : 201,
      contentType: "application/json",
      body: JSON.stringify(
        attempt === 1
          ? { status: "error", statusCode: 503, message: "Temporarily unavailable" }
          : {
              inquiryId: "browser-seller-test",
              status: "received",
              message: "Received",
              createdAt: new Date().toISOString(),
            },
      ),
    });
  });
  await page.getByRole("button", { name: "Send seller inquiry" }).click();
  await expect(page.getByRole("button", { name: /Sending/ })).toBeDisabled();
  await expect(page.locator('[role="alert"]')).toBeVisible();
  await expect(page.getByLabel("Full name")).toHaveValue("Browser Test Seller");
  await page.getByRole("button", { name: "Send seller inquiry" }).click();
  await expect(page.getByRole("heading", { name: /inquiry/i }).last()).toBeVisible();
  await expect(page.getByText("browser-seller-test")).toBeVisible();
});

test("Sell film and motion survive navigation, scroll and reduced-motion changes", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/sell");
  await expect(page.locator("video")).toHaveAttribute("data-ready", "true");
  await expect
    .poll(() =>
      page
        .locator("video")
        .evaluate((video) => (video as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThan(0.2);
  const film = await page.locator("video").evaluate((video) => ({
    muted: (video as HTMLVideoElement).muted,
    loop: (video as HTMLVideoElement).loop,
    inline: (video as HTMLVideoElement).playsInline,
    fit: getComputedStyle(video).objectFit,
  }));
  expect(film).toEqual({ muted: true, loop: true, inline: true, fit: "cover" });
  await expect(page.locator('header[data-sell-hero="true"]')).toHaveAttribute(
    "data-sticky",
    "false",
  );
  await expect(page.locator('header[data-sell-hero="true"] .brand-logo')).toBeVisible();
  await page.waitForTimeout(1400);
  await page.screenshot({ path: testInfo.outputPath("sell-playing-hero.png") });
  await page.locator("#preparation-heading").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: testInfo.outputPath("sell-photo-reveal.png") });
  await page.locator("#gallery-heading").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: testInfo.outputPath("sell-journey-reveal.png") });
  await page.locator('footer a[href="/about"]').click();
  await expect(page).toHaveURL(/\/about$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/sell$/);
  await expect(page.locator("video")).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      page.locator("video").evaluate((video) => (video as HTMLVideoElement).paused),
    )
    .toBe(true);
  expect(errors).toEqual([]);
});
