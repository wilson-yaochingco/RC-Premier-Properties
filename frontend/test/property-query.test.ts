import { describe, expect, it } from "vitest";
import {
  mapLocationHref,
  paginationHref,
  propertyApiSearchParams,
  propertyMapApiSearchParams,
  rawSearchParamsFromEntries,
} from "../src/features/properties/property-query";

describe("property query URLs", () => {
  it("sends only normalized documented filters to the API", () => {
    const query = propertyApiSearchParams({
      keyword: "  family home  ",
      propertyType: "house-and-lot",
      availability: "reserved",
      sort: "price-desc",
      page: "2",
      unknown: "do-not-forward",
    });

    expect(query.toString()).toBe(
      "keyword=family+home&propertyType=house-and-lot&availability=reserved&purpose=sale&sort=price-desc&page=2&limit=9",
    );
  });

  it("preserves filters and resets pagination when the map selects an area", () => {
    const href = mapLocationHref(
      {
        keyword: "house",
        maxPrice: "15000000",
        location: "Angeles City",
        sort: "price-asc",
        page: "4",
        unknown: "discarded",
      },
      "Mabalacat City",
    );

    expect(href).toBe(
      "/properties?keyword=house&location=Mabalacat+City&purpose=sale&maxPrice=15000000&sort=price-asc",
    );
  });

  it("keeps implementation-only page size out of browser pagination URLs", () => {
    expect(paginationHref({ location: "Apalit" }, 2)).toBe(
      "/properties?location=Apalit&purpose=sale&sort=newest&page=2",
    );
  });

  it("reuses bounded pagination for a canonical location route", () => {
    expect(
      paginationHref(
        { location: "Angeles City", sort: "price-asc" },
        2,
        "/locations/angeles-city",
        true,
      ),
    ).toBe("/locations/angeles-city?purpose=sale&sort=price-asc&page=2");
  });

  it("sends map filters without exposing sort or result limits", () => {
    expect(
      propertyMapApiSearchParams({
        location: "Angeles City",
        propertyType: "house-and-lot",
        sort: "price-desc",
        page: "3",
      }).toString(),
    ).toBe("location=Angeles+City&propertyType=house-and-lot&purpose=sale");
    expect(
      propertyMapApiSearchParams({ propertyType: "commercial" }).has("propertyType"),
    ).toBe(false);
  });

  it("preserves duplicate values and consistently uses the first normalized value", () => {
    const query = new URLSearchParams();
    query.append("location", "Angeles City");
    query.append("location", "Mabalacat City");
    query.append("sort", "price-asc");
    query.append("sort", "price-desc");
    const raw = rawSearchParamsFromEntries(query);

    expect(raw).toEqual({
      location: ["Angeles City", "Mabalacat City"],
      sort: ["price-asc", "price-desc"],
    });
    expect(propertyApiSearchParams(raw).toString()).toContain("location=Angeles+City");
    expect(propertyMapApiSearchParams(raw).toString()).toContain(
      "location=Angeles+City",
    );
  });

  it.each([
    ["keyword", "garden", "pool"],
    ["propertyId", "RCPP-001", "RCPP-002"],
    ["location", "Angeles City", "Mabalacat City"],
    ["propertyType", "house-and-lot", "lot"],
    ["availability", "available", "reserved"],
    ["minPrice", "1000000", "2000000"],
    ["maxPrice", "9000000", "8000000"],
    ["bedrooms", "2", "3"],
    ["bathrooms", "1", "2"],
    ["minLotArea", "100", "200"],
    ["minFloorArea", "80", "120"],
  ] as const)(
    "normalizes repeated %s filters to the first value",
    (key, first, second) => {
      const raw = rawSearchParamsFromEntries(
        new URLSearchParams(
          `${key}=${encodeURIComponent(first)}&${key}=${encodeURIComponent(second)}`,
        ),
      );

      expect(propertyApiSearchParams(raw).get(key)).toBe(first);
      expect(propertyMapApiSearchParams(raw).get(key)).toBe(first);
    },
  );

  it("normalizes repeated sort and page values consistently for list navigation", () => {
    const raw = rawSearchParamsFromEntries(
      new URLSearchParams("sort=price-asc&sort=price-desc&page=2&page=3"),
    );

    expect(propertyApiSearchParams(raw).get("sort")).toBe("price-asc");
    expect(propertyApiSearchParams(raw).get("page")).toBe("2");
    expect(paginationHref(raw, 4)).toContain("sort=price-asc");
  });

  it("preserves an empty first repeated value instead of replacing it", () => {
    const raw = rawSearchParamsFromEntries(
      new URLSearchParams("location=&location=Angeles+City"),
    );

    expect(raw.location).toEqual(["", "Angeles City"]);
    expect(propertyApiSearchParams(raw).has("location")).toBe(false);
    expect(propertyMapApiSearchParams(raw).has("location")).toBe(false);
  });

  it("uses an explicit bounded page size only for trusted internal callers", () => {
    expect(propertyApiSearchParams({ page: "1", limit: "999" }, 48).get("limit")).toBe(
      "48",
    );
    expect(() => propertyApiSearchParams({}, 49)).toThrow();
  });
});
