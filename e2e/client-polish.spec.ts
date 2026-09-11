import { expect, test } from "@playwright/test";

test("About uses a subdued motion-aware video and the real Pampanga boundary", async ({
  page,
}) => {
  await page.goto("/about");

  const video = page.locator("video");
  await expect(video).toHaveAttribute("data-start-time", "4");
  await expect(video).toHaveAttribute("loop", "");
  await expect(video).toHaveAttribute("playsinline", "");
  await expect(video).toHaveJSProperty("muted", true);
  await expect(video).toHaveAttribute("src", /videos\.ctfassets\.net/);
  await expect(
    page.getByRole("img", { name: /Still two-dimensional map of Pampanga/ }),
  ).toBeVisible();
  await expect(page.locator("figure svg path")).toHaveCount(22);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(video).toHaveCSS("display", "none");
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
    page.getByRole("heading", { name: "A documented local landmark." }),
  ).toBeVisible();
  await expect(
    page.getByAltText("Facade of the Holy Rosary Parish Church in Angeles City"),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Wikimedia Commons" })).toHaveAttribute(
    "href",
    /commons\.wikimedia\.org/,
  );
});
