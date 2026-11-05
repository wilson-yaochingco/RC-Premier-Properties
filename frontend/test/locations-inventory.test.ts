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
    expect(
      inventoryLabel(
        { status: "unavailable", collection: { status: "unavailable" } },
        "porac",
      ),
    ).toBe("Inventory unavailable");
  });
});

describe("location fixtures", () => {
  it("cover 0, 1, 2, 4 and a larger distribution, with showcases of 0 to 4 listings", () => {
    const rows = LOCATIONS_FIXTURE_SCENARIOS.filter(
      (scenario) => scenario !== "unavailable",
    ).map((scenario) => {
      const inventory = fixtureLocationsInventory(scenario);
      if (inventory.status !== "ready") throw new Error("fixture should be ready");
      if (inventory.collection.status !== "ready") throw new Error("collection ready");
      const ids = inventory.collection.items.map(({ id }) => id);
      expect(new Set(ids).size).toBe(ids.length);
      return [
        Object.values(inventory.counts).filter((count) => count > 0).length,
        ids.length,
      ];
    });
    expect(rows).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
      [4, 3],
      [4, 4],
    ]);
  });

  it("makes the error scenario unavailable for both counts and the collection", () => {
    expect(fixtureLocationsInventory("unavailable")).toEqual({
      status: "unavailable",
      collection: { status: "unavailable" },
    });
  });

  it("parses only known scenarios", () => {
    expect(parseLocationsFixtureScenario("many")).toBe("many");
    expect(parseLocationsFixtureScenario(["unavailable"])).toBe("unavailable");
    expect(parseLocationsFixtureScenario("real")).toBeUndefined();
  });
});

describe("loadLocationsInventory", () => {
  const base = { locations: [], propertyTypes: [], priceRange: {} };
  const facetsBody = {
    ...base,
    locationCounts: [
      { location: "Angeles City, Pampanga", count: 2 },
      { location: "Porac, Pampanga", count: 1 },
    ],
  };

  function api(facets: Response, collection: Response) {
    return vi.fn(async (input: RequestInfo | URL) =>
      String(input).includes("/properties/facets") ? facets : collection,
    );
  }

  it("reports a confirmed empty area as 0 and keeps the real collection", async () => {
    const fetchMock = api(
      json(facetsBody),
      page([
        { id: "a", slug: "a" },
        { id: "b", slug: "b" },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);
    const inventory = await (await load()).loadLocationsInventory();
    expect(inventory).toMatchObject({
      status: "ready",
      counts: { "angeles-city": 2, "mabalacat-city": 0, magalang: 0, porac: 1 },
      collection: { status: "ready", total: 2 },
    });
    // One facets request and one bounded newest-first collection request.
    const collectionCalls = fetchMock.mock.calls.filter(
      ([input]) => !String(input).includes("/facets"),
    );
    expect(collectionCalls).toHaveLength(1);
    const query = new URL(String(collectionCalls[0]?.[0])).searchParams;
    expect(query.get("limit")).toBe("4");
    expect(query.get("sort")).toBe("newest");
  });

  it("is unavailable when the counts cannot be retrieved, yet keeps the collection", async () => {
    vi.stubGlobal("fetch", api(json({}, 500), page([{ id: "a", slug: "a" }])));
    expect(await (await load()).loadLocationsInventory()).toMatchObject({
      status: "unavailable",
      collection: { status: "ready", items: [{ id: "a" }] },
    });
    vi.stubGlobal("fetch", api(json({ ...base }), page([])));
    expect(await (await load()).loadLocationsInventory()).toMatchObject({
      status: "unavailable",
    });
  });

  it("keeps counts when only the collection fails, and tells it apart from empty", async () => {
    vi.stubGlobal("fetch", api(json(facetsBody), json({}, 500)));
    expect(await (await load()).loadLocationsInventory()).toMatchObject({
      status: "ready",
      collection: { status: "unavailable" },
    });
    vi.stubGlobal("fetch", api(json(facetsBody), page([])));
    expect(await (await load()).loadLocationsInventory()).toMatchObject({
      status: "ready",
      collection: { status: "ready", items: [], total: 0 },
    });
  });

  it("never serves fixtures in production, even when a scenario is requested", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const fetchMock = api(json({}, 500), json({}, 500));
    vi.stubGlobal("fetch", fetchMock);
    const inventory = await (await load()).loadLocationsInventory("4");
    expect(inventory).toEqual({
      status: "unavailable",
      collection: { status: "unavailable" },
    });
    expect(fetchMock).toHaveBeenCalled();
  });
});
