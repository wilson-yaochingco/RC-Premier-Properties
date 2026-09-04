import { describe, expect, it } from "vitest";
import {
  mapLocationHref,
  paginationHref,
  propertyApiSearchParams,
  propertyMapApiSearchParams,
} from "../src/features/properties/property-query";

describe("property query URLs", () => {
  it("sends only normalized documented filters to the API", () => {
    const query = propertyApiSearchParams({
      keyword: "  family home  ",
      propertyType: "house-and-lot",
      sort: "price-desc",
      page: "2",
      unknown: "do-not-forward",
    });

    expect(query.toString()).toBe(
      "keyword=family+home&propertyType=house-and-lot&sort=price-desc&page=2&limit=9",
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
      "/properties?keyword=house&location=Mabalacat+City&maxPrice=15000000&sort=price-asc",
    );
  });

  it("keeps implementation-only page size out of browser pagination URLs", () => {
    expect(paginationHref({ location: "Apalit" }, 2)).toBe(
      "/properties?location=Apalit&sort=newest&page=2",
    );
  });

  it("sends map filters without exposing sort or result limits", () => {
    expect(
      propertyMapApiSearchParams({
        location: "Angeles City",
        propertyType: "commercial",
        sort: "price-desc",
        page: "3",
      }).toString(),
    ).toBe("location=Angeles+City&propertyType=commercial");
  });
});
