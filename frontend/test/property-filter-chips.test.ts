import { describe, expect, it } from "vitest";
import { propertyFilterChips } from "../src/features/properties/PropertyFilterChips";
import {
  propertyFormValues,
  removePropertyFilterHref,
} from "../src/features/properties/property-query";

describe("active property filters", () => {
  it("labels only normalized, real filters and sorting", () => {
    const values = propertyFormValues({
      location: "Angeles City",
      propertyType: "house-and-lot",
      availability: "reserved",
      minPrice: "5000000",
      bedrooms: "3",
      sort: "price-asc",
    });

    expect(propertyFilterChips(values)).toEqual([
      { key: "location", label: "Angeles City" },
      { key: "propertyType", label: "House & lot" },
      { key: "availability", label: "Reserved" },
      { key: "minPrice", label: "From ₱5,000,000" },
      { key: "bedrooms", label: "3+ bedrooms" },
      { key: "sort", label: "Price: low to high" },
    ]);
  });

  it("removes one filter, resets pagination, and preserves the remaining URL state", () => {
    const href = removePropertyFilterHref(
      {
        location: "Angeles City",
        availability: "sold",
        maxPrice: "9000000",
        sort: "price-desc",
        page: "4",
      },
      "availability",
    );

    expect(href).toBe(
      "/properties?location=Angeles+City&purpose=sale&maxPrice=9000000&sort=price-desc",
    );
  });
});
