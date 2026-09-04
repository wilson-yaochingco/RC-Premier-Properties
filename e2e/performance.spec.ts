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

  for (const path of ["/", "/properties"] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (path === "/") {
      await expect(
        page.getByRole("heading", { name: "Clark Garden Residence" }),
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
  }
});
