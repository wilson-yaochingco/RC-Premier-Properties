import { expect, test, type Locator, type Page } from "@playwright/test";

const REGION = "What to look for in a home";

function panel(page: Page): Locator {
  return page.getByRole("region", { name: REGION });
}

async function step(page: Page): Promise<string> {
  const text = await panel(page).locator('[class*="step"]').first().textContent();
  return (text ?? "").replace(/\s+/g, "");
}

interface Timers {
  /** Every progress animation that currently exists; there must never be more than one. */
  total: number;
  running: number;
  /** Elapsed playback of the single timer in ms, or -1 when there is none. */
  time: number;
}

function timers(page: Page): Promise<Timers> {
  return panel(page)
    .locator("i")
    .evaluateAll((fills) => {
      const all = fills.flatMap((fill) => fill.getAnimations());
      return {
        total: all.length,
        running: all.filter((animation) => animation.playState === "running").length,
        time: all.length ? Number(all[0].currentTime) : -1,
      };
    });
}

async function hideTab(page: Page, hidden: boolean): Promise<void> {
  await page.evaluate((value) => {
    Object.defineProperty(document, "hidden", { value, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}

async function openPanel(page: Page, width = 1440): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/");
  await panel(page).scrollIntoViewIfNeeded();
  await page.mouse.move(2, 2);
}

/** Wait until the single timer has played at least `ms`. */
async function playedAtLeast(page: Page, ms: number): Promise<void> {
  await expect
    .poll(async () => (await timers(page)).time, { timeout: 15_000 })
    .toBeGreaterThanOrEqual(ms);
}

test("each step owns one timer; finishing it advances the step", async ({ page }) => {
  await openPanel(page);
  await expect.poll(async () => (await timers(page)).running).toBe(1);
  expect((await timers(page)).total).toBe(1);
  expect(await step(page)).toBe("01/04");

  await expect.poll(() => step(page), { timeout: 15_000 }).toBe("02/04");
  await expect.poll(async () => (await timers(page)).running).toBe(1);
  expect((await timers(page)).total).toBe(1);
  await expect(
    panel(page).locator('[role="group"][data-active="true"]'),
  ).toHaveAttribute("aria-label", "2 of 4");
});

test("a hidden tab pauses the timer and returning continues it, not restarts it", async ({
  page,
}) => {
  await openPanel(page);
  await playedAtLeast(page, 2500);

  await hideTab(page, true);
  await expect.poll(async () => (await timers(page)).running).toBe(0);
  const held = (await timers(page)).time;
  expect(held).toBeGreaterThanOrEqual(2500);

  // Time spent hidden does not count: the timer is where it stopped, on the same step.
  await page.waitForTimeout(2500);
  const stillHeld = (await timers(page)).time;
  expect(Math.abs(stillHeld - held)).toBeLessThan(50);
  expect(await step(page)).toBe("01/04");

  await hideTab(page, false);
  await expect.poll(async () => (await timers(page)).running).toBe(1);
  expect((await timers(page)).total).toBe(1);
  const resumed = (await timers(page)).time;
  expect(resumed).toBeGreaterThanOrEqual(held - 50);
  expect(resumed).toBeLessThan(held + 1500);
  expect(await step(page)).toBe("01/04");
});

test("a manual arrow switches at once and restarts the timer; 04 loops to 01", async ({
  page,
}) => {
  await openPanel(page);
  await playedAtLeast(page, 2500);

  const next = page.getByRole("button", { name: "Next step" });
  await next.click();
  await expect.poll(() => step(page)).toBe("02/04");
  expect((await timers(page)).time).toBeLessThan(800);

  for (const expected of ["03/04", "04/04"]) {
    await next.click();
    await expect.poll(() => step(page)).toBe(expected);
  }
  await expect.poll(async () => (await timers(page)).running).toBe(1);
  await expect.poll(() => step(page), { timeout: 15_000 }).toBe("01/04");
  await expect(
    panel(page).locator('[role="group"][data-active="true"]'),
  ).toHaveAttribute("aria-label", "1 of 4");
  await expect.poll(async () => (await timers(page)).running).toBe(1);
  expect((await timers(page)).total).toBe(1);

  await page.getByRole("button", { name: "Previous step" }).click();
  await expect.poll(() => step(page)).toBe("04/04");
});

test("rapid clicks leave exactly one progress animation", async ({ page }) => {
  await openPanel(page);
  await playedAtLeast(page, 500);
  const next = page.getByRole("button", { name: "Next step" });
  for (let i = 0; i < 7; i += 1) await next.click({ delay: 0 });
  await expect.poll(() => step(page)).toBe("04/04");
  expect((await timers(page)).total).toBe(1);
  await page.mouse.move(2, 2);
  await expect.poll(async () => (await timers(page)).running).toBe(1);
  expect((await timers(page)).total).toBe(1);
});

test("reduced motion creates no timer but keeps the arrows working", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPanel(page);
  expect((await timers(page)).total).toBe(0);
  expect(await step(page)).toBe("01/04");
  // The active segment is rendered full and static.
  const transform = await panel(page)
    .locator('span[data-state="active"] i')
    .evaluate((fill) => getComputedStyle(fill).transform);
  expect(transform).toBe("matrix(1, 0, 0, 1, 0, 0)");

  await page.getByRole("button", { name: "Next step" }).click();
  await expect.poll(() => step(page)).toBe("02/04");
  expect((await timers(page)).total).toBe(0);
});

test("the timer is paused while the panel is off screen", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, 0));
  expect((await timers(page)).running).toBe(0);
});

test("A Closer Look lays out cleanly at every width", async ({ page }) => {
  for (const width of [390, 570, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await panel(page).scrollIntoViewIfNeeded();
    const wide = width > 1024;
    const media = panel(page).locator("> div").first();
    await expect(media, `${width}px clip`).toHaveCSS(
      "clip-path",
      wide ? /polygon/ : "none",
    );
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
      `${width}px overflow`,
    ).toBe(true);
  }
});

/** Progress is flowing: the timer's clock moves on within ~1.5s, or the step just changed. */
async function expectAdvancing(page: Page): Promise<void> {
  const before = await timers(page);
  const stepBefore = await step(page);
  await expect
    .poll(
      async () => {
        const now = await timers(page);
        return (
          now.running === 1 &&
          (now.time > before.time + 250 ||
            now.time < before.time ||
            (await step(page)) !== stepBefore)
        );
      },
      { timeout: 2500, message: "progress stalled while playback was expected" },
    )
    .toBe(true);
}

async function expectHeld(page: Page): Promise<void> {
  await expect.poll(async () => (await timers(page)).running).toBe(0);
  const held = (await timers(page)).time;
  await page.waitForTimeout(400);
  expect(Math.abs((await timers(page)).time - held)).toBeLessThan(40);
}

test.describe("autoplay pauses only for hidden tab, off screen and reduced motion", () => {
  test("hover has no effect on autoplay", async ({ page }) => {
    await openPanel(page);
    await playedAtLeast(page, 800);
    await panel(page).hover();
    for (let i = 0; i < 4; i += 1) {
      await expectAdvancing(page);
      await page.waitForTimeout(300);
    }
    expect((await timers(page)).total).toBe(1);
  });

  test("focus has no effect on autoplay, whether from a click or the keyboard", async ({
    page,
  }) => {
    await openPanel(page);
    await playedAtLeast(page, 800);

    await page.getByRole("button", { name: "Next step" }).click(); // keeps browser focus
    await expect(page.getByRole("button", { name: "Next step" })).toBeFocused();
    await expectAdvancing(page);

    await page.getByRole("button", { name: "Previous step" }).focus();
    await page.keyboard.press("Tab"); // keyboard-visible focus on Next
    await expect(page.getByRole("button", { name: "Next step" })).toBeFocused();
    await expectAdvancing(page);
    await page.waitForTimeout(600);
    await expectAdvancing(page);
  });

  test("each real pause reason holds progress and resumes on its own", async ({
    page,
  }) => {
    await openPanel(page);
    await playedAtLeast(page, 800);
    await expectAdvancing(page);

    await page.evaluate(() => window.scrollTo(0, 0)); // out of view
    await expectHeld(page);
    await panel(page).scrollIntoViewIfNeeded();
    await expectAdvancing(page);

    await hideTab(page, true); // hidden tab
    await expectHeld(page);
    await hideTab(page, false);
    await expectAdvancing(page);
  });

  test("a returning tab stays paused only while the section is off screen", async ({
    page,
  }) => {
    await openPanel(page);
    await playedAtLeast(page, 800);

    await hideTab(page, true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await hideTab(page, false);
    await expectHeld(page); // back, but off screen
    await panel(page).scrollIntoViewIfNeeded();
    await expectAdvancing(page);

    // Hovering and focus never hold it back after a tab round trip.
    await panel(page).hover();
    await page.getByRole("button", { name: "Next step" }).focus();
    await hideTab(page, true);
    await expectHeld(page);
    await hideTab(page, false);
    await expectAdvancing(page);
  });

  test("a mouse click on an arrow never leaves it paused", async ({ page }) => {
    await openPanel(page);
    await playedAtLeast(page, 800);
    for (const name of ["Next step", "Next step", "Previous step"]) {
      await page.getByRole("button", { name }).click();
      await expectAdvancing(page);
      expect((await timers(page)).total).toBe(1);
    }
  });

  test("partial visibility: mostly off screen pauses, mostly on screen plays", async ({
    page,
  }) => {
    await openPanel(page);
    await playedAtLeast(page, 800);
    const box = await panel(page).boundingBox();
    if (!box) throw new Error("no panel");
    const top = await page.evaluate(() => window.scrollY);
    await page.evaluate((y) => window.scrollTo(0, y), top + box.y + box.height * 0.9);
    await expectHeld(page);
    await panel(page).scrollIntoViewIfNeeded();
    await expectAdvancing(page);
  });
});

test.describe("touch devices", () => {
  for (const width of [390, 570, 768]) {
    test(`tapping Next restarts the timer and it keeps running at ${width}px`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        hasTouch: true,
        isMobile: true,
      });
      const page = await context.newPage();
      await page.goto("/");
      await panel(page).scrollIntoViewIfNeeded();
      await playedAtLeast(page, 800);

      await page.getByRole("button", { name: "Next step" }).tap();
      await expect.poll(() => step(page)).toBe("02/04");
      expect((await timers(page)).time).toBeLessThan(900);
      await expectAdvancing(page);
      expect((await timers(page)).total).toBe(1);

      await page.getByRole("button", { name: "Next step" }).tap();
      await expect.poll(() => step(page)).toBe("03/04");
      await expectAdvancing(page);
      await context.close();
    });
  }
});

/** The scale (0..1) of every progress segment, in order. */
function segmentScales(page: Page): Promise<number[]> {
  return panel(page)
    .locator('[class*="bars"] > span i')
    .evaluateAll((fills) =>
      fills.map((fill) => {
        const matrix = getComputedStyle(fill).transform;
        return matrix === "none"
          ? 1
          : Number.parseFloat(matrix.slice(matrix.indexOf("(") + 1));
      }),
    );
}

test.describe("progress segments", () => {
  test("completed segments stay full, the active one animates, later ones are empty", async ({
    page,
  }) => {
    await openPanel(page);
    await playedAtLeast(page, 600);
    const next = page.getByRole("button", { name: "Next step" });

    // 01: [animating, empty, empty, empty]
    let [a, b, c, d] = await segmentScales(page);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(1);
    expect([b, c, d]).toEqual([0, 0, 0]);

    for (const [expected, full] of [
      ["02/04", 1],
      ["03/04", 2],
      ["04/04", 3],
    ] as const) {
      await next.click();
      await expect.poll(() => step(page)).toBe(expected);
      await page.mouse.move(2, 2);
      await expect.poll(async () => (await timers(page)).time).toBeGreaterThan(500);
      const scales = await segmentScales(page);
      scales.forEach((scale, i) => {
        if (i < full) expect(scale, `${expected} segment ${i + 1} is full`).toBe(1);
        else if (i === full) {
          expect(scale, `${expected} segment ${i + 1} is the timer`).toBeGreaterThan(0);
          expect(scale).toBeLessThan(1);
        } else expect(scale, `${expected} segment ${i + 1} is empty`).toBe(0);
      });
    }

    // 04 completes and loops: 01 animating, the rest reset to empty.
    await expect.poll(() => step(page), { timeout: 15_000 }).toBe("01/04");
    await expect.poll(async () => (await timers(page)).time).toBeGreaterThan(200);
    [a, b, c, d] = await segmentScales(page);
    expect(a).toBeLessThan(0.5);
    expect([b, c, d]).toEqual([0, 0, 0]);
  });

  test("a newly active segment never paints full before it starts from zero", async ({
    page,
  }) => {
    await openPanel(page);
    await playedAtLeast(page, 600);
    // Record the new active fill's scale at the exact moment the state changes (the state
    // the first painted frame would show) and on the next frames, for each transition.
    await panel(page).evaluate((node) => {
      const w = window as unknown as { __flash: number[] };
      w.__flash = [];
      const scaleOf = (fill: Element) => {
        const matrix = getComputedStyle(fill).transform;
        return matrix === "none"
          ? 1
          : Number.parseFloat(matrix.slice(matrix.indexOf("(") + 1));
      };
      const activeScale = () => {
        const active = node.querySelector(
          '[class*="bars"] > span[data-state="active"] i',
        );
        return active ? scaleOf(active) : -1;
      };
      const observer = new MutationObserver(() => {
        w.__flash.push(activeScale());
        let frames = 0;
        const tick = () => {
          w.__flash.push(activeScale());
          if (++frames < 6) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      node.querySelectorAll('[class*="bars"] > span').forEach((segment) =>
        observer.observe(segment, {
          attributes: true,
          attributeFilter: ["data-state"],
        }),
      );
    });

    // Manual 01 -> 02, then the automatic 02 -> 03 (the timer-driven path).
    await page.getByRole("button", { name: "Next step" }).click();
    await page.mouse.move(2, 2);
    await expect.poll(() => step(page), { timeout: 15_000 }).toBe("03/04");
    await page.waitForTimeout(300);

    const samples = await page.evaluate(
      () => (window as unknown as { __flash: number[] }).__flash,
    );
    expect(samples.length).toBeGreaterThan(8);
    // Never reads as completed: every sample taken around a transition is near zero.
    expect(Math.max(...samples), `samples ${JSON.stringify(samples)}`).toBeLessThan(
      0.1,
    );
  });
});
