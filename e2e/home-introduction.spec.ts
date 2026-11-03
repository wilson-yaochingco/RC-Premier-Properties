import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]) {
  test(`editorial second section at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const section = page.locator('section[aria-labelledby="intro-heading"]');
    expect((await section.boundingBox())?.y).toBe(viewport.height);
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveAttribute("data-reveal", "visible");
    await expect(section).toHaveCSS("background-color", "rgb(248, 246, 241)");
    const heading = section.getByRole("heading", { level: 2 });
    await expect(heading).toHaveText(
      "We help buyers and sellers across Pampanga find the right property, understand its value, and move forward with confidence.",
    );
    await expect(heading).toHaveCSS("font-weight", "600");
    expect(
      await heading.evaluate((element) => getComputedStyle(element).fontFamily),
    ).toContain("Manrope");
    await expect(section.getByRole("img")).toHaveCount(1);
    await expect(section.getByRole("img")).toHaveAttribute("src", /home-hero-1/);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    ).toBe(false);
    await expect(section.getByText("A clearer way to find home")).toBeVisible();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(section.locator("figure > div")).toHaveCSS(
      "transition-duration",
      "0s",
    );
    await expect(section.getByRole("img")).toHaveCSS("transform", "none");
    await expect(
      page.getByRole("heading", { name: "What makes a home worth a closer look." }),
    ).toBeAttached();
  });
}

test("second section is visible without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL!);
  const section = page.locator('section[aria-labelledby="intro-heading"]');
  await expect(section).toHaveAttribute("data-reveal", "visible");
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByRole("heading")).toHaveCSS("opacity", "1");
  await expect(section.getByRole("heading", { level: 2 })).toBeVisible();
  await context.close();
});
