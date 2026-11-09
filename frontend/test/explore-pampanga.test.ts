import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildExploreLocations,
  EXPLORE_INDEX_LIMIT,
  propertyCountLabel,
} from "../src/features/home/explore-pampanga";
import { LOCATION_FIXTURE_COUNTS } from "../src/features/home/location-inventory.fixtures";
import { parseLocationFixtureScenario } from "../src/features/home/location-inventory";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("propertyCountLabel", () => {
  it("uses singular and plural", () => {
    expect(propertyCountLabel(1)).toBe("1 property");
    expect(propertyCountLabel(3)).toBe("3 properties");
  });
});

describe("buildExploreLocations", () => {
  it("orders by count then name and builds location routes", () => {
    const result = buildExploreLocations([
      { location: "Porac, Pampanga", count: 1 },
      { location: "Mabalacat City, Pampanga", count: 2 },
      { location: "City of San Fernando, Pampanga", count: 2 },
      { location: "Angeles City, Pampanga", count: 3 },
    ]);
    expect(result.map((l) => l.name)).toEqual([
      "Angeles City",
      "City of San Fernando",
      "Mabalacat City",
      "Porac",
    ]);
    expect(result[0]).toMatchObject({
      slug: "angeles-city",
      href: "/properties?location=Angeles+City",
      countLabel: "3 properties",
    });
    expect(result[3]?.countLabel).toBe("1 property");
  });

  it("drops zero counts, unknown names and duplicates (no fuzzy matching)", () => {
    const result = buildExploreLocations([
      { location: "Porac, Pampanga", count: 0 },
      { location: "San Fernando, Pampanga", count: 4 },
      { location: "Atlantis, Pampanga", count: 9 },
      { location: "Angeles City, Pampanga", count: 1 },
      { location: "Angeles City", count: 5 },
    ]);
    expect(result.map((l) => l.slug)).toEqual(["angeles-city"]);
  });

  it("keeps every active area for the map while the index limit is separate", () => {
    const many = [
      "Angeles City",
      "Apalit",
      "Arayat",
      "Bacolor",
      "Candaba",
      "Guagua",
    ].map((city, i) => ({ location: `${city}, Pampanga`, count: 10 - i }));
    expect(buildExploreLocations(many)).toHaveLength(6);
    expect(EXPLORE_INDEX_LIMIT).toBe(4);
  });
});

describe("location fixtures", () => {
  it("covers 0, 1, 2 and 4 active locations", () => {
    const sizes = Object.values(LOCATION_FIXTURE_COUNTS).map(
      (counts) => buildExploreLocations(counts).length,
    );
    expect(sizes).toEqual([0, 1, 2, 4]);
  });

  it("parses only known scenarios", () => {
    expect(parseLocationFixtureScenario("four")).toBe("four");
    expect(parseLocationFixtureScenario(["unavailable"])).toBe("unavailable");
    expect(parseLocationFixtureScenario("real")).toBeUndefined();
  });
});

describe("loadLocationInventory", () => {
  function facets(body: unknown, status = 200) {
    return vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }
  const base = { locations: [], propertyTypes: [], priceRange: {} };
  const load = () => import("../src/features/home/location-inventory");

  it("uses active counts (sold excluded, reserved included)", async () => {
    vi.stubGlobal(
      "fetch",
      facets({
        ...base,
        locationCounts: [{ location: "Angeles City, Pampanga", count: 5 }],
        activeLocationCounts: [{ location: "Angeles City, Pampanga", count: 2 }],
      }),
    );
    const result = await (await load()).loadLocationInventory();
    expect(result).toMatchObject({
      status: "ready",
      locations: [{ slug: "angeles-city", count: 2 }],
    });
  });

  it("is empty when the request succeeds with no active areas", async () => {
    vi.stubGlobal("fetch", facets({ ...base, activeLocationCounts: [] }));
    expect(await (await load()).loadLocationInventory()).toEqual({ status: "empty" });
  });

  it("is unavailable on failure or when active counts are missing", async () => {
    vi.stubGlobal("fetch", facets({}, 500));
    expect(await (await load()).loadLocationInventory()).toEqual({
      status: "unavailable",
    });
    vi.stubGlobal("fetch", facets({ ...base, locationCounts: [] }));
    expect(await (await load()).loadLocationInventory()).toEqual({
      status: "unavailable",
    });
  });

  it("ignores fixtures outside development and never falls back to them", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubGlobal("fetch", facets({}, 500));
    expect(await (await load()).loadLocationInventory("four")).toEqual({
      status: "unavailable",
    });
  });

  it("serves fixtures under development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const loader = await load();
    const four = await loader.loadLocationInventory("four");
    expect(four.status === "ready" && four.locations).toHaveLength(4);
    expect(await loader.loadLocationInventory("empty")).toEqual({ status: "empty" });
    expect(await loader.loadLocationInventory("unavailable")).toEqual({
      status: "unavailable",
    });
  });
});
