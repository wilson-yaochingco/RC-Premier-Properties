import { expect, test, type Page } from "@playwright/test";

/**
 * Soak / stress test for the A Closer Look autoplay, which once stalled only intermittently.
 * It runs ~75s of continuous, mixed use and fails on any stall. It is skipped in normal runs:
 *
 *   CLOSER_LOOK_SOAK=1 npx playwright test e2e/closer-look-soak.spec.ts
 *
 * Add `--repeat-each 10` to prove it is not a one-off pass.
 */
test.skip(!process.env.CLOSER_LOOK_SOAK, "Set CLOSER_LOOK_SOAK=1 to run the soak test");
test.setTimeout(180_000);

const REGION = "What to look for in a home";
const STALL_LIMIT_MS = 2000;

interface Probe {
  step: string;
  animations: number;
  playState: string;
  pending: boolean;
  time: number;
}

async function probe(page: Page): Promise<Probe> {
  return page.getByRole("region", { name: REGION }).evaluate((panel) => {
    const all = [...panel.querySelectorAll("i")].flatMap((fill) =>
      fill.getAnimations(),
    );
    const first = all[0];
    return {
      step: (panel.querySelector('[class*="step"]')?.textContent ?? "").replace(
        /\s+/g,
        "",
      ),
      animations: all.length,
      playState: first ? first.playState : "none",
      pending: first ? first.pending : false,
      time: first ? Number(first.currentTime ?? -1) : -1,
    };
  });
}

interface Flow {
  transitions: number;
  samples: number;
}

/**
 * Watch for `ms` while playback is expected. Fails if progress (the timer's clock or the
 * step) stops changing for longer than the stall limit, if the timer is idle or missing, or
 * if more than one progress animation ever exists.
 */
async function assertFlowing(page: Page, ms: number, label: string): Promise<Flow> {
  const end = Date.now() + ms;
  let last = await probe(page);
  let changedAt = Date.now();
  let transitions = 0;
  let samples = 0;
  const recent: Probe[] = [last];

  while (Date.now() < end) {
    await page.waitForTimeout(250);
    const now = await probe(page);
    samples += 1;
    recent.push(now);
    if (recent.length > 12) recent.shift();

    expect(now.animations, `${label}: duplicate/missing progress animation`).toBe(1);
    expect(now.playState, `${label}: timer idle`).not.toBe("idle");
    if (now.step !== last.step) transitions += 1;
    if (now.step !== last.step || now.time !== last.time) changedAt = Date.now();
    if (Date.now() - changedAt > STALL_LIMIT_MS) {
      throw new Error(
        `${label}: progress stalled for ${Date.now() - changedAt}ms. Last probes: ${JSON.stringify(recent)}`,
      );
    }
    last = now;
  }
  return { transitions, samples };
}

async function setHidden(page: Page, hidden: boolean): Promise<void> {
  await page.evaluate((value) => {
    Object.defineProperty(document, "hidden", { value, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}

test("A Closer Look autoplay survives ~75s of mixed use", async ({ page }) => {
  let totalTransitions = 0;
  const log: string[] = [];
  const phase = async (label: string, ms: number) => {
    const { transitions } = await assertFlowing(page, ms, label);
    totalTransitions += transitions;
    log.push(`${label}: ${transitions} step change(s)`);
    return transitions;
  };

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const panel = page.getByRole("region", { name: REGION });
  await panel.scrollIntoViewIfNeeded();
  await page.mouse.move(2, 2);
  await expect
    .poll(async () => (await probe(page)).time, { timeout: 8000 })
    .toBeGreaterThan(0);

  // 1. Pointer parked on the card for 30s: hover must have no effect (>= 4 automatic cycles).
  await panel.hover();
  const hovered = await phase("hover 30s", 30_000);
  expect(
    hovered,
    "slides must keep advancing under a parked pointer",
  ).toBeGreaterThanOrEqual(3);

  // 2. A focused arrow must not pause anything.
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByRole("button", { name: "Next step" })).toBeFocused();
  const focused = await phase("focused Next 10s", 10_000);
  expect(
    focused,
    "slides must keep advancing with a focused button",
  ).toBeGreaterThanOrEqual(1);

  // 3. Rapid manual navigation leaves one correct, running timer.
  const next = page.getByRole("button", { name: "Next step" });
  const previous = page.getByRole("button", { name: "Previous step" });
  const before = Number((await probe(page)).step.slice(0, 2));
  await next.click({ delay: 0 });
  await next.click({ delay: 0 });
  await previous.click({ delay: 0 });
  await next.click({ delay: 0 });
  const expected = ((before - 1 + 2) % 4) + 1; // +1 +1 -1 +1 = +2
  await expect
    .poll(async () => Number((await probe(page)).step.slice(0, 2)))
    .toBe(expected);
  expect((await probe(page)).animations).toBe(1);
  await phase("after rapid clicks", 4_000);

  // 4. Off screen pauses and holds progress; back on screen resumes it.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(async () => (await probe(page)).playState).toBe("paused");
  const held = (await probe(page)).time;
  await page.waitForTimeout(2500);
  expect(Math.abs((await probe(page)).time - held)).toBeLessThan(60);
  await panel.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await probe(page)).playState).toBe("running");
  expect((await probe(page)).time).toBeGreaterThanOrEqual(held - 60);
  await phase("back in view", 3_000);

  // 5. Resize across the 1024px geometry change, repeatedly. One carousel must survive.
  for (let round = 0; round < 2; round += 1) {
    for (const width of [1000, 1030, 990, 1050, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(250);
      expect((await probe(page)).animations, `resize to ${width}`).toBe(1);
    }
  }
  await panel.scrollIntoViewIfNeeded();
  await phase("after resize stress", 5_000);

  // 6. Ten hidden/visible cycles: progress is held, then flows again, every time.
  for (let cycle = 0; cycle < 10; cycle += 1) {
    await setHidden(page, true);
    await expect.poll(async () => (await probe(page)).playState).toBe("paused");
    const heldTime = (await probe(page)).time;
    await page.waitForTimeout(150);
    expect(
      Math.abs((await probe(page)).time - heldTime),
      `hidden cycle ${cycle}`,
    ).toBeLessThan(60);
    await setHidden(page, false);
    await expect.poll(async () => (await probe(page)).playState).toBe("running");
  }
  await phase("after 10 tab cycles", 4_000);

  // 7. Final stretch: at least one more automatic step.
  const final = await phase("final", 9_500);
  expect(final, "a final automatic advance").toBeGreaterThanOrEqual(1);

  console.log(
    `soak OK: ${totalTransitions} automatic/manual step changes\n${log.join("\n")}`,
  );
  expect(totalTransitions).toBeGreaterThanOrEqual(7);
});

/**
 * The original intermittent stall: when frames are starved the Web Animations clock never
 * starts, so a carousel that advanced on animation events simply stopped. The step must follow
 * wall time instead. Judged by in-page step timestamps only, never by animation progress. At
 * 20x throttling the timer can run late (long tasks block it) but must never stop.
 */
test("autoplay keeps its schedule when the page is heavily CPU-throttled", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const panel = page.getByRole("region", { name: REGION });
  await panel.scrollIntoViewIfNeeded();
  await expect
    .poll(async () => (await probe(page)).animations, { timeout: 8000 })
    .toBe(1);

  // Record step changes with in-page timestamps: outside probes are themselves starved by the
  // throttle, so they cannot time anything.
  await panel.evaluate((node) => {
    const w = window as unknown as { __steps: number[] };
    w.__steps = [];
    const label = node.querySelector('[class*="step"]');
    if (!label) return;
    new MutationObserver(() => w.__steps.push(performance.now())).observe(label, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  });

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 20 });
  try {
    await page.waitForTimeout(42_000);
  } finally {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  }
  {
    const times = await page.evaluate(
      () => (window as unknown as { __steps: number[] }).__steps,
    );
    expect(
      times.length,
      `step changes at ${JSON.stringify(times.map(Math.round))}ms`,
    ).toBeGreaterThanOrEqual(3);
    const gaps = times.slice(1).map((at, i) => Math.round(at - times[i]));
    // On schedule (7s) plus however long the starved main thread blocks the timer; never stopped.
    for (const gap of gaps) {
      expect(gap, `gaps ${JSON.stringify(gaps)}`).toBeGreaterThan(5500);
      expect(gap, `gaps ${JSON.stringify(gaps)}`).toBeLessThan(16_000);
    }
    expect((await probe(page)).animations).toBe(1);
  }
});
