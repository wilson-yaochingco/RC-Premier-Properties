import { expect, test } from "@playwright/test";

test("About uses its own optimized video without changing the hero layout", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /hydration|hydrating/i.test(message.text()))
      errors.push(message.text());
  });
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/about");
    const hero = page.locator("section[data-about-hero]");
    const video = hero.locator("video");
    await expect(video).toHaveCount(1);
    await expect(video.locator("source")).toHaveAttribute(
      "src",
      "/media/about-hero.mp4",
    );
    await expect
      .poll(() =>
        video.evaluate(
          (element: HTMLVideoElement) => element.readyState >= 2 && !element.paused,
        ),
      )
      .toBe(true);
    const state = await video.evaluate((element: HTMLVideoElement) => ({
      muted: element.muted,
      loop: element.loop,
      inline: element.playsInline,
      poster: element.poster,
      width: element.videoWidth,
      height: element.videoHeight,
      fit: getComputedStyle(element).objectFit,
    }));
    expect(state).toEqual({
      muted: true,
      loop: true,
      inline: true,
      poster: "",
      width: 1920,
      height: 1080,
      fit: "cover",
    });
    await expect(hero.locator("img")).toHaveCount(0);
    const frame = (await hero.boundingBox())!;
    const film = (await video.boundingBox())!;
    expect(film.width).toBeGreaterThanOrEqual(frame.width);
    expect(film.height).toBeGreaterThanOrEqual(frame.height);
    await expect(hero.getByRole("heading", { level: 1 })).toContainText(
      "Rooted in Pampanga.",
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await hero.evaluate((element) =>
      Promise.all(
        element
          .getAnimations({ subtree: true })
          .map((animation) => animation.finished.catch(() => {})),
      ),
    );
    await page.screenshot({ path: testInfo.outputPath(`about-video-${width}.png`) });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const video = page.locator("section[data-about-hero] video");
  await expect
    .poll(() =>
      video.evaluate(
        (element: HTMLVideoElement) =>
          element.readyState >= 2 && element.paused && element.currentTime === 0,
      ),
    )
    .toBe(true);
  await expect(video).toHaveAttribute("data-ready", "true");
  expect(errors).toEqual([]);
});
