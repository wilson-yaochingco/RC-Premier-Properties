import { expect, test } from "@playwright/test";

const SITE_ORIGIN = "http://127.0.0.1:3100";
const FACEBOOK_URL =
  "https://www.facebook.com/people/RC-Premier-Properties/61588365958516/";

test("optimized frontend sends the reviewed provider-aware CSP", async ({ page }) => {
  const response = await page.goto("/");
  const policy = response?.headers()["content-security-policy"] ?? "";

  expect(policy).toContain("default-src 'self'");
  expect(policy).toContain("connect-src 'self' http://127.0.0.1:5051");
  expect(policy).toContain("https://tiles.stadiamaps.com");
  expect(policy).toContain("frame-src https://www.youtube-nocookie.com");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).not.toContain("unsafe-eval");
  expect(policy).not.toContain("https://hostile.invalid");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("public pages render canonical and social metadata", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("RC Premier Properties | Houses for Sale in Pampanga");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    SITE_ORIGIN,
  );
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
    "content",
    "RC Premier Properties",
  );
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
    "content",
    "en_PH",
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /^http:\/\/127\.0\.0\.1:3100\/_next\/static\/media\//,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );

  for (const [path, title] of [
    ["/properties", "Properties for Sale in Pampanga | RC Premier Properties"],
    ["/about", "About | RC Premier Properties"],
    ["/contact", "Contact | RC Premier Properties"],
    ["/book-viewing", "Request a Property Tour | RC Premier Properties"],
  ] as const) {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${SITE_ORIGIN}${path}`,
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      `${SITE_ORIGIN}${path}`,
    );
  }
});

test("location discovery is indexable only for inventory-backed stable states", async ({
  page,
}) => {
  await page.goto("/properties?location=Angeles+City");
  await expect(page).toHaveTitle(
    "Properties for Sale in Angeles City, Pampanga | RC Premier Properties",
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Properties for sale in Angeles City, Pampanga",
    }),
  ).toBeVisible();
  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  expect(new URL(canonical ?? "").searchParams.get("location")).toBe(
    "Angeles City, Pampanga",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

  await page.goto(
    "/properties?location=Angeles+City&minPrice=1000000&sort=price-desc&page=2",
  );
  await expect.poll(() => new URL(page.url()).searchParams.get("page")).toBe("1");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${SITE_ORIGIN}/properties`,
  );
  const filteredRobots = await page
    .locator('meta[name="robots"]')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("content")),
    );
  expect(filteredRobots.length).toBeGreaterThan(0);
  expect(filteredRobots.every((content) => content?.includes("noindex"))).toBe(true);
});

test("homepage and property JSON-LD are factual and privacy-safe", async ({ page }) => {
  await page.goto("/");
  const siteJsonLd = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  expect(siteJsonLd).toContain('"@type":"Organization"');
  expect(siteJsonLd).toContain('"@type":"WebSite"');
  expect(siteJsonLd).toContain("rcpropertiesss@gmail.com");
  expect(siteJsonLd).toContain("+63 918 429 1873");
  expect(siteJsonLd).toContain(FACEBOOK_URL);
  expect(siteJsonLd).not.toContain("streetAddress");
  expect(siteJsonLd).not.toContain("openingHours");
  expect(siteJsonLd).not.toContain("SearchAction");

  await page.goto("/properties/clark-garden-residence?from=%2Fproperties");
  await expect(page).toHaveTitle("Clark Garden Residence | RC Premier Properties");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${SITE_ORIGIN}/properties/clark-garden-residence`,
  );
  const propertyJsonLd = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  expect(propertyJsonLd).toContain('"@type":"Product"');
  expect(propertyJsonLd).toContain('"@type":"BreadcrumbList"');
  expect(propertyJsonLd).toContain('"availability":"https://schema.org/InStock"');
  expect(propertyJsonLd).toContain('"priceCurrency":"PHP"');
  expect(propertyJsonLd).not.toContain("coordinates");
  expect(propertyJsonLd).not.toContain("privateAddress");
});

test("robots, noindex headers, sitemap, and property 404s preserve public boundaries", async ({
  page,
  request,
}) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  const robotsText = await robots.text();
  expect(robotsText).toContain("Disallow: /admin");
  expect(robotsText).toContain("Disallow: /api");
  expect(robotsText).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`);

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  const sitemapText = await sitemap.text();
  expect(sitemapText).toContain(`${SITE_ORIGIN}/sitemaps/0.xml`);
  const sitemapShard = await request.get("/sitemaps/0.xml");
  expect(sitemapShard.ok()).toBe(true);
  const sitemapShardText = await sitemapShard.text();
  expect(sitemapShardText).toContain(
    `${SITE_ORIGIN}/properties/clark-garden-residence`,
  );
  expect(sitemapShardText).toContain("location=Angeles+City%2C+Pampanga");
  expect(sitemapShardText).toContain(`${SITE_ORIGIN}/locations/angeles-city`);
  expect(sitemapShardText).not.toContain("mabalacat-skyline-condominium");
  expect(sitemapShardText).not.toContain("/admin");
  expect(sitemapShardText).not.toContain("/api");
  expect(sitemapShardText).not.toContain("minPrice");

  const adminResponse = await page.goto("/admin");
  expect(adminResponse?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );

  await page.goto("/properties/missing-property");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "This published property could not be found.",
    }),
  ).toBeVisible();
  const notFoundRobots = await page
    .locator('meta[name="robots"]')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("content")),
    );
  expect(notFoundRobots.length).toBeGreaterThan(0);
  expect(notFoundRobots.every((content) => content?.includes("noindex"))).toBe(true);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});
