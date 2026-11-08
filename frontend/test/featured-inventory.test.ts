import { afterEach, describe, expect, it, vi } from "vitest";
import { formatLocation } from "../src/features/properties/property-format";
import { parseFeaturedFixtureScenario } from "../src/features/home/featured-inventory";

const ITEM = {
  id: "real-1",
  propertyId: "RCPP-1",
  slug: "real-one",
  title: "Real listing",
  purpose: "sale",
  propertyType: "house-and-lot",
  availability: "available",
  featured: true,
  price: { amount: 1_000_000, currency: "PHP", negotiable: false },
  location: {
    province: "Pampanga",
    city: "Angeles City",
    publicPrecision: "city-only",
    disclosure: "general-area",
  },
  specifications: {},
  shortDescription: "A real listing.",
  publishedAt: "2026-01-01T00:00:00.000Z",
};

function apiResponse(items: unknown[]) {
  return new Response(
    JSON.stringify({
      items,
      pagination: { page: 1, limit: 4, total: items.length, totalPages: 1 },
      appliedFilters: { featured: true, purpose: "sale" },
      sort: "newest",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

async function loader() {
  return import("../src/features/home/featured-inventory");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("loadFeaturedInventory", () => {
  it("returns ready with the API items in their given order", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(apiResponse([ITEM])));
    const { loadFeaturedInventory } = await loader();

    const result = await loadFeaturedInventory();
    expect(result.status).toBe("ready");
    expect(result.status === "ready" && result.items.map((item) => item.id)).toEqual([
      "real-1",
    ]);
  });

  it("returns empty for a successful zero-listing response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(apiResponse([])));
    const { loadFeaturedInventory } = await loader();

    expect(await loadFeaturedInventory()).toEqual({ status: "empty" });
  });

  it("returns unavailable, distinct from empty, for non-2xx and network failures", async () => {
    const { loadFeaturedInventory } = await loader();

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ status: "error", statusCode: 503, message: "down" }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          ),
        ),
    );
    expect(await loadFeaturedInventory()).toEqual({ status: "unavailable" });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    expect(await loadFeaturedInventory()).toEqual({ status: "unavailable" });
  });

  it("ignores fixture scenarios outside next dev and calls the real API", async () => {
    const fetch = vi.fn().mockResolvedValue(apiResponse([]));
    vi.stubGlobal("fetch", fetch);
    const { loadFeaturedInventory } = await loader();

    expect(await loadFeaturedInventory("three")).toEqual({ status: "empty" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("never falls back to fixtures when the real request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const { loadFeaturedInventory } = await loader();

    expect(await loadFeaturedInventory("three")).toEqual({ status: "unavailable" });
  });

  it("serves design fixtures in next dev without calling the API", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.resetModules();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { loadFeaturedInventory } = await loader();

    const three = await loadFeaturedInventory("three");
    expect(three.status === "ready" && three.items).toHaveLength(3);
    expect(await loadFeaturedInventory("empty")).toEqual({ status: "empty" });
    expect(await loadFeaturedInventory("unavailable")).toEqual({
      status: "unavailable",
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("parseFeaturedFixtureScenario", () => {
  it("accepts only known scenarios and the first array value", () => {
    expect(parseFeaturedFixtureScenario("three")).toBe("three");
    expect(parseFeaturedFixtureScenario(["two", "three"])).toBe("two");
    expect(parseFeaturedFixtureScenario("four")).toBeUndefined();
    expect(parseFeaturedFixtureScenario("seven")).toBeUndefined();
    expect(parseFeaturedFixtureScenario("")).toBeUndefined();
    expect(parseFeaturedFixtureScenario(undefined)).toBeUndefined();
  });
});

describe("featured design fixtures", () => {
  async function fixtures() {
    return (await import("../src/features/home/featured-properties.fixtures"))
      .FEATURED_FIXTURE_PROPERTIES;
  }

  it("provides 0, 1, 2 and 3 properties as prefixes of one set", async () => {
    const data = await fixtures();

    expect(Object.keys(data)).toEqual(["empty", "one", "two", "three"]);
    expect(
      [data.empty, data.one, data.two, data.three].map((items) => items.length),
    ).toEqual([0, 1, 2, 3]);
    expect(data.one).toEqual(data.three.slice(0, 1));
    expect(data.two).toEqual(data.three.slice(0, 2));
  });

  it("uses synthetic featured, unsold sale listings with unique identifiers", async () => {
    const three = (await fixtures()).three;

    for (const property of three) {
      expect(property.id).toMatch(/^fixture-featured-/);
      expect(property.propertyId).toMatch(/^RCPP-FIXTURE-/);
      expect(property.purpose).toBe("sale");
      expect(property.featured).toBe(true);
      expect(property.availability).not.toBe("sold");
    }
    expect(new Set(three.map((property) => property.slug)).size).toBe(3);
    expect(new Set(three.map((property) => property.propertyId)).size).toBe(3);
  });

  it("covers the deliberate edge cases", async () => {
    const data = await fixtures();
    const three = data.three;

    expect(data.two.some((property) => property.availability === "reserved")).toBe(
      true,
    );
    expect(three.some((property) => !property.coverMedia)).toBe(true);
    expect(three.some((property) => property.title.length > 60)).toBe(true);
    expect(
      three.some((property) => formatLocation(property.location).length > 60),
    ).toBe(true);
    expect(three.some((property) => property.specifications.floorAreaSqm)).toBe(true);
    expect(
      three.some(
        (property) =>
          property.specifications.lotAreaSqm && !property.specifications.floorAreaSqm,
      ),
    ).toBe(true);
    expect(
      three.some(
        (property) =>
          !property.specifications.bedrooms && !property.specifications.bathrooms,
      ),
    ).toBe(true);
  });
});
