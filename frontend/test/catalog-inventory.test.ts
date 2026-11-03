import { afterEach, describe, expect, it, vi } from "vitest";
import { sortHref } from "../src/features/properties/property-query";

function apiResponse(total: number) {
  return new Response(
    JSON.stringify({
      items: [],
      pagination: { page: 1, limit: 9, total, totalPages: 0 },
      appliedFilters: { purpose: "sale" },
      sort: "newest",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

async function loader() {
  return import("../src/features/properties/catalog-inventory");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("loadCatalogInventory", () => {
  it("returns ready for a zero-result response, distinct from unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(apiResponse(0)));
    const { loadCatalogInventory } = await loader();

    const result = await loadCatalogInventory({});
    expect(result.status).toBe("ready");
  });

  it("returns unavailable when the request fails and never falls back to fixtures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const { loadCatalogInventory } = await loader();

    expect(await loadCatalogInventory({}, "3")).toEqual({
      source: "live",
      status: "unavailable",
    });
  });

  it("ignores fixture scenarios outside next dev", async () => {
    const fetch = vi.fn().mockResolvedValue(apiResponse(0));
    vi.stubGlobal("fetch", fetch);
    const { loadCatalogInventory } = await loader();

    await loadCatalogInventory({}, "6");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("serves exact fixture counts in next dev without calling the API", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.resetModules();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { loadCatalogInventory } = await loader();

    for (const count of [0, 1, 2, 3, 4, 5, 6]) {
      const result = await loadCatalogInventory({}, String(count) as "0");
      expect(result.status === "ready" && result.response.items).toHaveLength(count);
    }
    expect(await loadCatalogInventory({}, "unavailable")).toEqual({
      source: "fixture",
      status: "unavailable",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("derives fixture facets from the fixture properties themselves", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn());
    const { loadCatalogInventory } = await loader();

    const six = await loadCatalogInventory({}, "6");
    if (six.source !== "fixture" || six.status !== "ready")
      throw new Error("not ready");
    expect(
      six.facets.activeLocationCounts?.map(({ location }) => location).sort(),
    ).toEqual(["Angeles City", "City of San Fernando", "Mabalacat City"]);
    expect(six.facets.propertyTypes).toEqual(["house-and-lot", "lot", "townhouse"]);

    const none = await loadCatalogInventory({}, "0");
    if (none.source !== "fixture" || none.status !== "ready")
      throw new Error("not ready");
    expect(none.facets.locations).toEqual([]);
    expect(none.facets.propertyTypes).toEqual([]);

    const one = await loadCatalogInventory({}, "1");
    if (one.source !== "fixture" || one.status !== "ready")
      throw new Error("not ready");
    expect(one.facets.locations).toEqual(["Angeles City"]);
  });

  it("filters fixture results by the selected location and type", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn());
    const { loadCatalogInventory } = await loader();

    const byLocation = await loadCatalogInventory({ location: "Mabalacat City" }, "6");
    if (byLocation.status !== "ready") throw new Error("not ready");
    expect(byLocation.response.items).toHaveLength(2);
    expect(byLocation.response.pagination.total).toBe(2);
    expect(
      byLocation.response.items.every(
        ({ location }) => location.city === "Mabalacat City",
      ),
    ).toBe(true);

    const byType = await loadCatalogInventory({ propertyType: "lot" }, "6");
    if (byType.status !== "ready") throw new Error("not ready");
    expect(byType.response.items.map(({ propertyType }) => propertyType)).toEqual([
      "lot",
      "lot",
    ]);

    const noMatch = await loadCatalogInventory({ location: "Mabalacat City" }, "1");
    if (noMatch.status !== "ready") throw new Error("not ready");
    expect(noMatch.response.items).toEqual([]);
  });

  it("never exposes fixtures or fixture facets outside next dev", async () => {
    const fetch = vi.fn().mockResolvedValue(apiResponse(0));
    vi.stubGlobal("fetch", fetch);
    const { activeCatalogFixture, loadCatalogInventory } = await loader();

    expect(activeCatalogFixture("6")).toBeUndefined();
    const result = await loadCatalogInventory({}, "6");
    expect(result.source).toBe("live");
    expect("facets" in result).toBe(false);
  });

  it("parses only known fixture scenarios", async () => {
    const { parseCatalogFixtureScenario } = await loader();
    expect(parseCatalogFixtureScenario("6")).toBe("6");
    expect(parseCatalogFixtureScenario("7")).toBeUndefined();
  });
});

describe("sortHref", () => {
  it("keeps filters, sets the sort and resets the page", () => {
    const href = sortHref({ location: "Angeles City", page: "3" }, "price-asc");
    const query = new URL(href, "http://x").searchParams;
    expect(query.get("location")).toBe("Angeles City");
    expect(query.get("sort")).toBe("price-asc");
    expect(query.has("page")).toBe(false);
  });
});
