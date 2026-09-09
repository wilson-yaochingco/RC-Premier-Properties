import type {
  PropertyFacetsResponse,
  PropertySearchResponse,
  PublicPropertySummary,
} from "@rc/shared";
import { describe, expect, it, vi } from "vitest";
import {
  getSitemapIndexUrls,
  getSitemapShard,
  serializeSitemapIndex,
  sitemapApiPages,
  sitemapShardCount,
} from "../src/features/properties/property-sitemap";

const FACETS: PropertyFacetsResponse = {
  locations: [],
  locationCounts: [],
  propertyTypes: [],
  priceRange: { min: null, max: null, currency: "PHP" },
};

function property(slug: string): PublicPropertySummary {
  return {
    slug,
    purpose: "sale",
    publishedAt: "2026-09-09T00:00:00.000Z",
  } as PublicPropertySummary;
}

function page(pageNumber: number, totalPages: number): PropertySearchResponse {
  return {
    items: [property(`property-${pageNumber}`)],
    pagination: {
      page: pageNumber,
      limit: 48,
      total: totalPages * 48,
      totalPages,
    },
    appliedFilters: {},
    sort: "newest",
  };
}

describe("bounded sitemap sharding", () => {
  it("caps every shard at twenty bounded API pages", () => {
    expect(sitemapShardCount(0)).toBe(1);
    expect(sitemapShardCount(21)).toBe(2);
    expect(sitemapApiPages(0, 0)).toEqual([]);
    expect(sitemapApiPages(0, 45)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(sitemapApiPages(2, 45)).toEqual([41, 42, 43, 44, 45]);
    expect(sitemapApiPages(999_999)).toHaveLength(20);
  });

  it("serializes a stable escaped sitemap index", () => {
    const xml = serializeSitemapIndex([
      "https://example.test/sitemaps/0.xml?one=1&two=2",
    ]);
    expect(xml).toContain("<sitemapindex");
    expect(xml).toContain("one=1&amp;two=2");
  });

  it("builds a stable index with one bounded discovery request", async () => {
    const getProperties = vi.fn().mockResolvedValue(page(1, 41));

    await expect(
      getSitemapIndexUrls({
        siteUrl: "https://example.test",
        getProperties,
        getPropertyFacets: vi.fn().mockResolvedValue(FACETS),
      }),
    ).resolves.toEqual([
      "https://example.test/sitemaps/0.xml",
      "https://example.test/sitemaps/1.xml",
      "https://example.test/sitemaps/2.xml",
    ]);
    expect(getProperties).toHaveBeenCalledOnce();
  });

  it("bounds each shard to twenty pages and isolates a later-shard failure", async () => {
    const getProperties = vi.fn(async ({ page: requested }: { page?: string }) => {
      const pageNumber = Number(requested);
      if (pageNumber === 25) throw new Error("isolated page failure");
      return page(pageNumber, 40);
    });
    const dependencies = {
      siteUrl: "https://example.test",
      getProperties,
      getPropertyFacets: vi.fn().mockResolvedValue(FACETS),
    };

    const firstShard = await getSitemapShard(0, dependencies);
    expect(
      firstShard.filter(({ url }) => url.includes("/properties/property-")),
    ).toHaveLength(20);
    expect(getProperties).toHaveBeenCalledTimes(20);

    getProperties.mockClear();
    await expect(getSitemapShard(1, dependencies)).rejects.toThrow(
      "isolated page failure",
    );
    expect(getProperties.mock.calls.length).toBeLessThanOrEqual(8);

    getProperties.mockClear();
    await expect(getSitemapShard(0, dependencies)).resolves.toEqual(firstShard);
    expect(getProperties).toHaveBeenCalledTimes(20);
  });

  it("uses one read for an out-of-range shard", async () => {
    const getProperties = vi.fn().mockResolvedValue({
      ...page(20_000_001, 40),
      items: [],
    });

    await expect(
      getSitemapShard(1_000_000, {
        siteUrl: "https://example.test",
        getProperties,
        getPropertyFacets: vi.fn().mockResolvedValue(FACETS),
      }),
    ).resolves.toEqual([]);
    expect(getProperties).toHaveBeenCalledOnce();
  });
});
