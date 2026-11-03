import { expect, test, type Page } from "@playwright/test";

const TOURS = 'section[aria-labelledby="property-tours-heading"]';

async function visibleTourRows(page: Page): Promise<number[][]> {
  return page.locator(`${TOURS} li`).evaluateAll((items) => {
    const rows = new Map<number, number[]>();
    for (const item of items) {
      if (getComputedStyle(item).display === "none") continue;
      const box = item.getBoundingClientRect();
      const top = Math.round(box.top + window.scrollY);
      rows.set(top, [...(rows.get(top) ?? []), Math.round(box.width)]);
    }
    return [...rows.values()];
  });
}

test("Property Tours keeps three equal portrait cards in one row from 768px", async ({
  page,
}) => {
  for (const width of [768, 815, 906, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const rows = await visibleTourRows(page);
    expect(rows, `${width}px rows`).toHaveLength(1);
    expect(rows[0], `${width}px cards`).toHaveLength(3);
    expect(new Set(rows[0]).size, `${width}px equal widths`).toBe(1);
    expect(rows[0][0], `${width}px width`).toBeGreaterThan(200);
  }
});

test("Property Tours expands to a 3 + 3 grid on tablet", async ({ page }) => {
  await page.setViewportSize({ width: 815, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Show more property tours" }).click();
  const rows = await visibleTourRows(page);
  expect(rows.map((row) => row.length)).toEqual([3, 3]);
});

test("Property Tours becomes a swipe rail below 704px", async ({ page }) => {
  for (const width of [570, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const list = page.locator(`${TOURS} ul`);
    await expect(list).toHaveCSS("scroll-snap-type", "x mandatory");
    await expect(list).toHaveCSS("overflow-x", "auto");
    const cards = await page.locator(`${TOURS} li`).evaluateAll((items) =>
      items.map((item) => {
        const box = item.getBoundingClientRect();
        return { width: box.width, ratio: box.height / box.width };
      }),
    );
    expect(cards.length).toBeGreaterThan(3);
    expect(cards[0].width).toBeLessThanOrEqual(width * 0.8);
    expect(cards[0].ratio).toBeGreaterThan(1.5);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }
});

test("A Closer Look has a straight image edge up to 1024px", async ({ page }) => {
  for (const width of [390, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const media = page
      .getByRole("region", { name: "What to look for in a home" })
      .locator("div")
      .filter({ has: page.locator("img") })
      .first();
    await expect(media, `${width}px`).toHaveCSS("clip-path", "none");

    const panel = page.getByRole("region", { name: "What to look for in a home" });
    const [photo, copy] = await panel.evaluate((node) => {
      const [mediaBox, contentBox] = [node.children[0], node.children[1]].map(
        (child) => {
          const box = child.getBoundingClientRect();
          return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
        },
      );
      return [mediaBox, contentBox];
    });
    // Image over copy on one straight horizontal line, both full panel width.
    expect(Math.abs(photo.bottom - copy.top), `${width}px seam`).toBeLessThan(1);
    expect(Math.abs(photo.left - copy.left)).toBeLessThan(1);
    expect(Math.abs(photo.right - copy.right)).toBeLessThan(1);
  }
});

test("the CTA artwork is never faded: full clarity or hidden", async ({ page }) => {
  for (const width of [390, 570, 768, 815, 906, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const houses = page.locator('section[aria-labelledby="home-cta-heading"] img');
    await expect(houses).toHaveCount(2);
    for (const house of await houses.all()) {
      const display = await house.evaluate((node) => getComputedStyle(node).display);
      if (display === "none") {
        expect(width, `${width}px hidden`).toBeLessThan(768);
        continue;
      }
      await expect(house).toHaveCSS("opacity", "1");
      await expect(house).toHaveCSS("mask-image", "none");
    }
  }
});

const INTRO_HEADINGS = [
  "intro-heading",
  "routes-heading",
  "featured-heading",
  "closer-look-heading",
  "explore-pampanga-heading",
];

test("homepage editorial intros are centered at 768px and below, left-aligned above", async ({
  page,
}) => {
  for (const [width, expected] of [
    [390, "center"],
    [700, "center"],
    [768, "center"],
    [1024, /^(left|start)$/],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    for (const id of INTRO_HEADINGS) {
      await expect(page.locator(`#${id}`), `${id} streamed in once`).toHaveCount(1);
      await expect(page.locator(`#${id}`), `${id} at ${width}px`).toHaveCSS(
        "text-align",
        expected,
      );
    }
  }
});

test("the card content inside centered sections stays left-aligned on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const slide = page
    .getByRole("region", { name: "What to look for in a home" })
    .locator('[role="group"][data-active="true"]');
  await expect(slide).toHaveCSS("text-align", /^(left|start)$/);
  await expect(page.locator("[data-featured-property-card]").first()).toHaveCSS(
    "text-align",
    /^(left|start)$/,
  );
});

test("the hero keeps its own alignment", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("#home-heading")).toHaveCSS("text-align", /^(left|start)$/);
});

test("a swipe rail's indicator reaches its final index at the end", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const rail = page.locator("#route-rail");
  await rail.scrollIntoViewIfNeeded();
  const counter = page
    .locator('section[aria-labelledby="routes-heading"] [class*="counter"]')
    .first();
  await expect(counter).toHaveText(/^01\s*\/\s*04$/);

  await rail.evaluate((node) =>
    node.scrollTo({ left: node.scrollWidth - node.clientWidth, behavior: "instant" }),
  );
  await expect(counter).toHaveText(/^04\s*\/\s*04$/);
  await rail.evaluate((node) => node.scrollTo({ left: 0, behavior: "instant" }));
  await expect(counter).toHaveText(/^01\s*\/\s*04$/);
});

test("the homepage never scrolls horizontally, with the menu closed or open", async ({
  page,
}) => {
  for (const width of [375, 390, 430, 570, 640, 733, 768]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    for (const menu of ["closed", "open"] as const) {
      if (menu === "open") {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.getByRole("button", { name: /menu/i }).first().click();
        await page.waitForTimeout(250);
      }
      const { scrollWidth, clientWidth } = await page.evaluate(async () => {
        const root = document.documentElement;
        let widest = 0;
        for (let y = 0; y <= root.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 30));
          widest = Math.max(widest, root.scrollWidth);
        }
        return { scrollWidth: widest, clientWidth: root.clientWidth };
      });
      expect(
        scrollWidth - clientWidth,
        `${width}px menu ${menu}: scrollWidth ${scrollWidth} vs clientWidth ${clientWidth}`,
      ).toBeLessThanOrEqual(1);
      if (menu === "open") await page.keyboard.press("Escape");
    }
  }
});

test("intentional rails still scroll inside their own container", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const overflows = await page
    .locator("#route-rail")
    .evaluate((rail) => rail.scrollWidth > rail.clientWidth);
  expect(overflows).toBe(true);
});

test("the Sell statement is about 10% smaller on small phones only", async ({
  page,
}) => {
  const size = async (width: number) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    return page
      .locator("#sell-statement")
      .evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize));
  };
  const small = await size(390);
  expect(small).toBeGreaterThan(31);
  expect(small).toBeLessThan(35); // was ~37px
  // Unchanged above the small-phone breakpoint.
  expect(await size(600)).toBeCloseTo(42, 0);
  expect(await size(768)).toBeCloseTo(43, 0);
  expect(await size(1440)).toBeCloseTo(57.6, 0);
});

test("the homepage reflows without horizontal overflow at enlarged text", async ({
  page,
}) => {
  for (const [width, scale] of [
    [320, 100],
    [320, 200],
    [375, 200],
    [390, 200],
    [430, 200],
  ] as const) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await page.evaluate((percent) => {
      document.documentElement.style.fontSize = `${percent}%`;
    }, scale);
    const result = await page.evaluate(async () => {
      const root = document.documentElement;
      let widest = 0;
      for (let y = 0; y <= root.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 30));
        widest = Math.max(widest, root.scrollWidth);
      }
      // Wide, unclipped elements are the real overflow culprits.
      const offenders: string[] = [];
      for (const element of document.querySelectorAll("body *")) {
        const box = element.getBoundingClientRect();
        if (!box.width || getComputedStyle(element).position === "fixed") continue;
        if (box.right <= root.clientWidth + 1 && box.left >= -1) continue;
        let clipped = false;
        for (
          let node = element.parentElement;
          node && node !== document.body;
          node = node.parentElement
        ) {
          if (getComputedStyle(node).overflowX !== "visible") {
            clipped = true;
            break;
          }
        }
        if (!clipped) {
          offenders.push(
            `${element.tagName.toLowerCase()}.${String(element.className).slice(-28)}`,
          );
        }
      }
      return { scrollWidth: widest, clientWidth: root.clientWidth, offenders };
    });
    expect(
      result.scrollWidth - result.clientWidth,
      `${width}px at ${scale}%: ${JSON.stringify(result)}`,
    ).toBeLessThanOrEqual(1);
    expect(result.offenders, `${width}px at ${scale}%`).toEqual([]);
  }
});

test("enlarged CTA labels are never clipped and never expose their roll duplicate", async ({
  page,
}) => {
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    const problems = await page.evaluate(() => {
      const found: string[] = [];
      for (const roll of document.querySelectorAll(".cta-roll")) {
        if (!roll.getClientRects().length) continue; // not rendered (e.g. mobile-only)
        const cell = roll.getBoundingClientRect();
        const [label, duplicate] = roll.querySelectorAll(".cta-roll__track > span");
        const name = (label?.textContent ?? "").trim();
        // Nothing may be cut off, sideways or vertically.
        if (roll.scrollWidth > roll.clientWidth + 1)
          found.push(`clipped sideways: ${name}`);
        if (roll.scrollHeight > roll.clientHeight + 1 && duplicate) {
          const dup = duplicate.getBoundingClientRect();
          // ...except the duplicate, which must sit wholly below the visible cell.
          if (dup.top < cell.bottom - 1) found.push(`duplicate exposed: ${name}`);
        }
        const text = label?.getBoundingClientRect();
        if (text && (text.bottom > cell.bottom + 1 || text.right > cell.right + 1)) {
          found.push(`label overflows its cell: ${name}`);
        }
      }
      return found;
    });
    expect(problems, `${width}px at 200%`).toEqual([]);
  }
});
