import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import readNextConfigEnvironment from "../src/lib/next-config-env.cjs";

vi.mock("@/lib/env", () => import("../src/lib/env"));

describe("controlled beta configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_ENV", "staging");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.beta.example.test");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://beta.example.test");
    vi.stubEnv(
      "NEXT_PUBLIC_MAP_TILE_URL",
      "https://tiles.example.test/{z}/{x}/{y}.png",
    );
    vi.stubEnv("NEXT_PUBLIC_MAP_ATTRIBUTION_TEXT", "Approved beta provider");
    vi.stubEnv(
      "NEXT_PUBLIC_MAP_ATTRIBUTION_URL",
      "https://tiles.example.test/attribution",
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it.each(["", "development", "test", "production"])(
    "rejects unsafe Vercel Preview deployment mode %j before building",
    (mode) => {
      vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_ENV", mode);
      expect(() => readNextConfigEnvironment()).toThrow(/NEXT_PUBLIC_DEPLOYMENT_ENV/);
    },
  );

  it("keeps the entire staging site out of indexing and suppresses sitemap reads", async () => {
    const { default: createNextConfig } = await import("../next.config.mjs");
    const { default: robots } = await import("../src/app/robots");
    const { buildPageMetadata } = await import("../src/lib/seo");
    const { getSitemapIndexUrls, getSitemapShard } =
      await import("../src/features/properties/property-sitemap");
    const fetch = vi.spyOn(globalThis, "fetch");
    try {
      const rules = await createNextConfig("phase-production-build").headers();
      expect(rules[0].headers).toContainEqual({
        key: "X-Robots-Tag",
        value: "noindex, nofollow, noarchive",
      });
      const pageRule = rules[0];
      const matcher = new RegExp(`^${pageRule.source}$`);
      for (const page of [
        "/",
        "/properties",
        "/admin",
        "/admin/properties",
        "/geo",
        "/geo/regions",
      ])
        expect(matcher.test(page)).toBe(true);
      for (const api of ["/api", "/api/v1/health", "/api/v1/auth/login"])
        expect(matcher.test(api)).toBe(false);
      expect(pageRule.headers.map(({ key }) => key)).toEqual(
        expect.arrayContaining([
          "X-Robots-Tag",
          "X-Content-Type-Options",
          "X-Frame-Options",
          "Referrer-Policy",
          "Permissions-Policy",
          "Content-Security-Policy",
          "Strict-Transport-Security",
        ]),
      );
      expect(
        rules.find(({ source }) => source === "/admin/:path*")?.headers,
      ).toContainEqual({ key: "Cache-Control", value: "private, no-store, max-age=0" });
      expect(
        rules.find(({ source }) => source === "/geo/:path*")?.headers,
      ).toContainEqual(expect.objectContaining({ key: "Cache-Control" }));
      expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
      expect(
        buildPageMetadata({ title: "Beta", description: "Beta", canonicalPath: "/" })
          .robots,
      ).toMatchObject({ index: false, follow: false, noarchive: true });
      expect(await getSitemapIndexUrls()).toEqual([]);
      expect(await getSitemapShard(0)).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      fetch.mockRestore();
    }
  });

  it("permits an explicitly configured production deployment", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_ENV", "production");
    expect(readNextConfigEnvironment().publicDeployment).toBe(true);
  });

  it("also refuses test defaults on the Vercel production target", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    for (const mode of ["", "development", "test"]) {
      vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_ENV", mode);
      expect(() => readNextConfigEnvironment()).toThrow(/NEXT_PUBLIC_DEPLOYMENT_ENV/);
    }
  });

  it("preserves local CI artifact builds while rejecting localhost in beta", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_ENV", "test");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:5000");
    expect(readNextConfigEnvironment().publicDeployment).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_ENV", "staging");
    expect(() => readNextConfigEnvironment()).toThrow(/NEXT_PUBLIC_API_URL/);
  });
});
