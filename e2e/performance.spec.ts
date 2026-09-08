import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __rcPerformance?: {
      cls: number;
      longestTask: number;
    };
  }
}

test("public entry routes stay layout-stable and within a practical initial JS budget", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.__rcPerformance = { cls: 0, longestTask: 0 };

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          hadRecentInput?: boolean;
          value?: number;
        };
        if (!shift.hadRecentInput) {
          window.__rcPerformance!.cls += shift.value ?? 0;
        }
      }
    }).observe({ type: "layout-shift", buffered: true });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__rcPerformance!.longestTask = Math.max(
          window.__rcPerformance!.longestTask,
          entry.duration,
        );
      }
    }).observe({ type: "longtask", buffered: true });
  });

  for (const path of [
    "/",
    "/properties",
    "/properties/clark-garden-residence",
  ] as const) {
    if (path.includes("clark-garden-residence")) {
      await page.route("**/_next/image?url=%2Fmedia%2Fproperties%2F**", (route) =>
        route.fulfill({
          status: 200,
          contentType: "image/png",
          body: Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            "base64",
          ),
        }),
      );
    }
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (path === "/") {
      await expect(
        page.getByRole("heading", { name: "Clark Garden Residence" }),
      ).toBeVisible();
    }
    if (path.includes("clark-garden-residence")) {
      await expect(
        page.getByRole("heading", { level: 1, name: "Clark Garden Residence" }),
      ).toBeVisible();
    }

    const metrics = await page.evaluate(() => {
      const scripts = performance
        .getEntriesByType("resource")
        .filter(
          (entry): entry is PerformanceResourceTiming =>
            entry instanceof PerformanceResourceTiming &&
            entry.initiatorType === "script",
        );
      return {
        cls: window.__rcPerformance?.cls ?? 0,
        longestTask: window.__rcPerformance?.longestTask ?? 0,
        scriptBytes: scripts.reduce(
          (total, entry) => total + (entry.encodedBodySize || entry.transferSize),
          0,
        ),
        domNodes: document.getElementsByTagName("*").length,
        boundaryRequests: performance
          .getEntriesByType("resource")
          .filter((entry) => entry.name.includes("pampanga-admin3.geojson")).length,
        youtubeRequests: performance
          .getEntriesByType("resource")
          .filter((entry) => /youtube|ytimg|googlevideo/.test(entry.name)).length,
        directPngSourceRequests: performance
          .getEntriesByType("resource")
          .filter((entry) => {
            const url = new URL(entry.name);
            return (
              url.pathname.includes("/_next/static/media/") &&
              url.pathname.endsWith(".png")
            );
          }).length,
      };
    });

    expect(metrics.cls, `${path} cumulative layout shift`).toBeLessThanOrEqual(0.1);
    expect(metrics.longestTask, `${path} longest main-thread task`).toBeLessThan(500);
    expect(metrics.scriptBytes, `${path} initial encoded JavaScript`).toBeLessThan(
      1_000_000,
    );
    expect(metrics.domNodes, `${path} initial DOM complexity`).toBeLessThan(1_500);
    expect(
      metrics.boundaryRequests,
      `${path} should not eagerly load map geometry`,
    ).toBe(0);
    expect(metrics.youtubeRequests, `${path} should not contact YouTube`).toBe(0);
    expect(
      metrics.directPngSourceRequests,
      `${path} should use optimized image delivery instead of raw PNG sources`,
    ).toBe(0);
  }
});

test("critical images are singular and gallery media stays progressive", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const hero = page.getByAltText(
    "Modern Pampanga home with a sloping roof and landscaped frontage",
  );
  await expect(hero).toHaveAttribute("sizes", "(max-width: 800px) 92vw, 52vw");
  await expect(hero).not.toHaveAttribute("loading", "lazy");
  await expect(
    page.getByAltText("Residential courtyard with a tiled pool and blue sky"),
  ).toHaveAttribute("loading", "lazy");
  await expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(1);
  await expect(page.locator("iframe")).toHaveCount(0);

  await page.route("**/_next/image?url=%2Fmedia%2Fproperties%2F**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  await page.goto("/properties/clark-garden-residence");

  const gallery = page.getByRole("region", { name: "Property gallery" });
  await expect(gallery).toBeVisible();
  await expect(gallery.locator('img[loading="lazy"]')).toHaveCount(1);
  await expect(gallery.locator('img:not([loading="lazy"])')).toHaveCount(1);
  await expect(page.getByRole("dialog", { name: "Property photo viewer" })).toHaveCount(
    0,
  );
  await expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(1);
});
