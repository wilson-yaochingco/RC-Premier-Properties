import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FEATURED_LOCATIONS,
  inventoryLabel,
  resolveLocationFacet,
} from "../src/features/locations/featured-locations";
import { fixtureLocationsInventory } from "../src/features/locations/locations.fixtures";
import {
  LOCATIONS_FIXTURE_SCENARIOS,
  parseLocationsFixtureScenario,
} from "../src/features/locations/locations-inventory";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const page = (items: unknown[]) =>
  json({
    items,
    pagination: { page: 1, limit: 3, total: items.length, totalPages: 1 },
  });

const load = () => import("../src/features/locations/locations-inventory");

describe("featured locations", () => {
  it("are the four curated destinations with real routes and attributed photos", () => {
    expect(FEATURED_LOCATIONS.map(({ slug, href }) => [slug, href])).toEqual([
      ["angeles-city", "/locations/angeles-city"],
      ["mabalacat-city", "/locations/mabalacat-city"],
      ["magalang", "/locations/magalang"],
      ["porac", "/locations/porac"],
    ]);
    for (const { scenery } of FEATURED_LOCATIONS) {
      expect(scenery.imagePath).toMatch(/^\/images\/locations\/.+\.jpg$/);
      expect(scenery.creator).not.toBe("");
      expect(scenery.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
    }
  });

  it("stay valid destinations with no inventory, but unknown slugs do not", () => {
    expect(resolveLocationFacet("porac", [])).toEqual({ location: "Porac", count: 0 });
    expect(
      resolveLocationFacet("angeles-city", [
        { location: "Angeles City, Pampanga", count: 4 },
      ]),
    ).toEqual({ location: "Angeles City, Pampanga", count: 4 });
    expect(resolveLocationFacet("atlantis", [])).toBeUndefined();
    expect(resolveLocationFacet("apalit", [])).toBeUndefined();
  });

  it("labels a confirmed zero differently from an unavailable inventory", () => {
    const ready = fixtureLocationsInventory("1");
    expect(inventoryLabel(ready, "angeles-city")).toBe("3 properties");
    expect(inventoryLabel(ready, "porac")).toBe("0 properties");
    expect(inventoryLabel({ status: "unavailable" }, "porac")).toBe(
      "Inventory unavailable",
    );
  });
});

describe("location fixtures", () => {
  it("cover 0, 1, 2, 4 and a larger distribution, never more than three homes", () => {
    const active = LOCATIONS_FIXTURE_SCENARIOS.filter(
      (scenario) => scenario !== "unavailable",
    ).map((scenario) => {
      const inventory = fixtureLocationsInventory(scenario);
      if (inventory.status !== "ready") throw new Error("fixture should be ready");
      for (const homes of Object.values(inventory.homes)) {
        expect(Array.isArray(homes) ? homes.length : 0).toBeLessThanOrEqual(3);
      }
      return Object.values(inventory.counts).filter((count) => count > 0).length;
    });
    expect(active).toEqual([0, 1, 2, 4, 4]);
    expect(fixtureLocationsInventory("many").status).toBe("ready");
  });

  it("parses only known scenarios", () => {
    expect(parseLocationsFixtureScenario("many")).toBe("many");
    expect(parseLocationsFixtureScenario(["unavailable"])).toBe("unavailable");
    expect(parseLocationsFixtureScenario("real")).toBeUndefined();
  });
});

describe("loadLocationsInventory", () => {
  function api(
    facets: unknown,
    homes: (location: string) => Response | Promise<Response> = () => page([]),
  ) {
    return vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/properties/facets")) {
        return facets instanceof Response ? facets : json(facets);
      }
      const location = new URL(url).searchParams.get("location") ?? "";
      return homes(location);
    });
  }
  const base = { locations: [], propertyTypes: [], priceRange: {} };

  it("reports a confirmed empty area as 0, not unavailable", async () => {
    const fetchMock = api(
      { ...base, locationCounts: [{ location: "Angeles City, Pampanga", count: 2 }] },
      () =>
        page([
          { id: "a", slug: "a" },
          { id: "b", slug: "b" },
        ]),
    );
    vi.stubGlobal("fetch", fetchMock);
    const inventory = await (await load()).loadLocationsInventory();
    expect(inventory).toMatchObject({
      status: "ready",
      counts: { "angeles-city": 2, "mabalacat-city": 0, magalang: 0, porac: 0 },
    });
    // Only the area with published homes triggers a property request.
    const homesRequests = fetchMock.mock.calls.filter(
      ([input]) => !String(input).includes("/facets"),
    );
    expect(homesRequests).toHaveLength(1);
    expect(String(homesRequests[0]?.[0])).toContain("location=Angeles+City");
  });

  it("is unavailable when the counts cannot be retrieved", async () => {
    vi.stubGlobal("fetch", api(json({}, 500)));
    expect(await (await load()).loadLocationsInventory()).toEqual({
      status: "unavailable",
    });
    vi.stubGlobal("fetch", api({ ...base }));
    expect(await (await load()).loadLocationsInventory()).toEqual({
      status: "unavailable",
    });
  });

  it("marks only the area whose homes request failed as unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      api(
        {
          ...base,
          locationCounts: [
            { location: "Angeles City, Pampanga", count: 3 },
            { location: "Porac, Pampanga", count: 1 },
          ],
        },
        (location) =>
          location === "Porac" ? json({}, 500) : page([{ id: "a", slug: "a" }]),
      ),
    );
    const inventory = await (await load()).loadLocationsInventory();
    if (inventory.status !== "ready") throw new Error("expected ready");
    expect(inventory.homes["angeles-city"]).toHaveLength(1);
    expect(inventory.homes.porac).toBe("unavailable");
    expect(inventory.homes.magalang).toEqual([]);
    expect(inventory.counts.porac).toBe(1);
  });

  it("never serves fixtures in production, even when a scenario is requested", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const fetchMock = api(json({}, 500));
    vi.stubGlobal("fetch", fetchMock);
    const inventory = await (await load()).loadLocationsInventory("4");
    expect(inventory).toEqual({ status: "unavailable" });
    expect(fetchMock).toHaveBeenCalled();
  });
});
