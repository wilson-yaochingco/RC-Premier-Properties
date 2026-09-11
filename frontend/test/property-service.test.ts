import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getFeaturedProperties,
  getProperties,
} from "../src/features/properties/property.service";

afterEach(() => vi.unstubAllGlobals());

describe("property service request sizing", () => {
  it("sends the trusted sitemap page size through the real service serializer", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [],
          pagination: { page: 3, limit: 48, total: 0, totalPages: 0 },
          appliedFilters: {},
          sort: "newest",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetch);

    await getProperties({ page: "3", limit: "999" }, undefined, 48);

    const requested = new URL(String(fetch.mock.calls[0]?.[0]));
    expect(requested.searchParams.get("page")).toBe("3");
    expect(requested.searchParams.get("limit")).toBe("48");
  });

  it("requests only the bounded explicitly curated homepage inventory", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [],
          pagination: { page: 1, limit: 3, total: 0, totalPages: 0 },
          appliedFilters: { featured: true, purpose: "sale" },
          sort: "newest",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetch);

    await getFeaturedProperties();

    const requested = new URL(String(fetch.mock.calls[0]?.[0]));
    expect(requested.searchParams.get("featured")).toBe("true");
    expect(requested.searchParams.get("purpose")).toBe("sale");
    expect(requested.searchParams.get("limit")).toBe("3");
    expect(requested.searchParams.get("page")).toBe("1");
  });
});
