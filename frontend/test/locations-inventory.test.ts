import { pickCollection } from "../src/features/locations/location-collection";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FEATURED_LOCATIONS,
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
});

describe("location fixtures", () => {
  it("preserves every scenario without repeated homes or unrelated locations", () => {
    for (const scenario of LOCATIONS_FIXTURE_SCENARIOS) {
      const inventory = fixtureLocationsInventory(scenario);
      if (inventory.collection.status !== "ready") continue;
      const items = inventory.collection.items;
      expect(new Set(items.map(({ id }) => id)).size).toBe(items.length);
      expect(pickCollection(items).length).toBeLessThanOrEqual(3);
      if (scenario === "4" || scenario === "many")
        expect(items.length).toBeGreaterThan(3);
      for (const item of items)
        expect(FEATURED_LOCATIONS.map(({ name }) => name)).toContain(
          item.location.city,
        );
    }
  });
  it("parses only known scenarios", () => {
    expect(parseLocationsFixtureScenario("many")).toBe("many");
    expect(parseLocationsFixtureScenario(["unavailable"])).toBe("unavailable");
    expect(parseLocationsFixtureScenario("real")).toBeUndefined();
  });
});

describe("loadLocationsInventory", () => {
  it("requests only the four curated locations and merges newest first", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const query = new URL(String(input)).searchParams;
      expect(query.get("sort")).toBe("newest");
      expect(query.get("limit")).toBe("3");
      const city = query.get("location")!.replace(", Pampanga", "");
      const index = FEATURED_LOCATIONS.findIndex(({ name }) => city === name);
      expect(index).toBeGreaterThanOrEqual(0);
      return page([
        { id: city, location: { city }, publishedAt: `2026-10-0${index + 1}` },
        { id: "unrelated", location: { city: "Apalit" }, publishedAt: "2026-11-01" },
      ]);
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await (await load()).loadLocationsInventory();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(result.collection.status).toBe("ready");
    if (result.collection.status === "ready")
      expect(result.collection.items.map(({ id }) => id)).toEqual([
        "Porac",
        "Magalang",
        "Mabalacat City",
        "Angeles City",
      ]);
  });
  it("distinguishes any failed location request from confirmed zero", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => page([])),
    );
    expect(await (await load()).loadLocationsInventory()).toEqual({
      collection: { status: "ready", items: [], total: 0 },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).includes("Porac") ? json({}, 500) : page([]),
      ),
    );
    expect(await (await load()).loadLocationsInventory()).toEqual({
      collection: { status: "unavailable" },
    });
  });
  it("ignores fixture parameters in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => page([])),
    );
    expect(await (await load()).loadLocationsInventory("4")).toEqual({
      collection: { status: "ready", items: [], total: 0 },
    });
  });
});
