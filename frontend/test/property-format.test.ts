import { describe, expect, it } from "vitest";
import {
  formatLocation,
  formatPrice,
  visibleSpecifications,
} from "../src/features/properties/property-format";
import {
  paginationHref,
  propertyApiSearchParams,
  propertyFormValues,
} from "../src/features/properties/property-query";

describe("property formatting", () => {
  it("formats PHP without insignificant decimals", () => {
    expect(formatPrice(12_500_000)).toBe("₱12,500,000");
  });

  it("builds a concise general-area label without duplicate parts", () => {
    expect(
      formatLocation({
        province: "Pampanga",
        city: "Angeles City",
        barangay: "Angeles City",
        publicPrecision: "barangay-area",
        disclosure: "general-area",
      }),
    ).toBe("Angeles City, Pampanga");
  });

  it("does not invent missing specifications", () => {
    expect(visibleSpecifications({ lotAreaSqm: 420 })).toEqual([
      { label: "Lot area", value: "420 sqm" },
    ]);
  });

  it("shows known room, parking, and floor counts including zero", () => {
    expect(
      visibleSpecifications({
        bathrooms: 2,
        powderRooms: 0,
        parkingSpaces: 1,
        storeys: 3,
      }),
    ).toEqual([
      { label: "Bathrooms", value: "2" },
      { label: "Parking Space", value: "1" },
      { label: "Powder Room", value: "0" },
      { label: "Floor/Level", value: "3" },
    ]);
  });
});

describe("property URL state", () => {
  it("keeps only supported scalar filters", () => {
    const query = propertyApiSearchParams({
      propertyId: ["RCPP-001", "ignored"],
      propertyType: "house-and-lot",
      minPrice: "5000000",
      operator: "$ne",
    });

    expect(query.get("propertyId")).toBe("RCPP-001");
    expect(query.get("propertyType")).toBe("house-and-lot");
    expect(query.get("minPrice")).toBe("5000000");
    expect(query.has("operator")).toBe(false);
  });

  it("falls back from unknown enum values", () => {
    expect(propertyFormValues({ propertyType: "$ne", sort: "sideways" })).toMatchObject(
      { propertyType: "", sort: "newest" },
    );
  });

  it("preserves filters while changing pages", () => {
    expect(paginationHref({ location: "Angeles City" }, 2)).toContain(
      "location=Angeles+City",
    );
    expect(paginationHref({ location: "Angeles City" }, 2)).toContain("page=2");
  });
});
