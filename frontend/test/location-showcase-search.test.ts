import type { PublicPropertySummary } from "@rc/shared";
import { describe, expect, it } from "vitest";
import { pickShowcase } from "../src/features/locations/location-collection";
import {
  BUDGET_BANDS,
  buildSearchHref,
  buildSearchOptions,
} from "../src/features/locations/location-search";
import {
  propertyFormValues,
  rawSearchParamsFromEntries,
} from "../src/features/properties/property-query";

const withPhoto = {
  kind: "image",
  url: "/media/properties/sample/cover.jpg",
  alt: "Front elevation",
} as const;

function property(id: string, photo: boolean): PublicPropertySummary {
  return {
    id,
    slug: id,
    coverMedia: photo ? withPhoto : { kind: "placeholder", alt: "" },
  } as unknown as PublicPropertySummary;
}

describe("pickShowcase", () => {
  it("is empty without listings", () => {
    expect(pickShowcase([])).toBeUndefined();
  });

  it("leads with the newest listing that has a photograph and keeps API order", () => {
    const showcase = pickShowcase([
      property("a", false),
      property("b", true),
      property("c", true),
      property("d", false),
    ]);
    expect(showcase?.lead.id).toBe("b");
    expect(showcase?.supporting.map(({ id }) => id)).toEqual(["a", "c", "d"]);
  });

  it("falls back to the newest listing when none has a photograph", () => {
    const showcase = pickShowcase([property("a", false), property("b", false)]);
    expect(showcase?.lead.id).toBe("a");
    expect(showcase?.supporting.map(({ id }) => id)).toEqual(["b"]);
  });

  it("never repeats a listing and never pads", () => {
    const showcase = pickShowcase([property("a", true), property("a", true)]);
    expect(showcase?.lead.id).toBe("a");
    expect(showcase?.supporting).toEqual([]);
  });
});

describe("location search", () => {
  it("offers curated locations, supported types and budgets within the price range", () => {
    const options = buildSearchOptions({
      locations: ["Angeles City, Pampanga", "City of San Fernando, Pampanga"],
      propertyTypes: ["house-and-lot", "lot"],
      priceRange: { min: 4_000_000, max: 8_000_000 },
    });
    expect(options.locations).toEqual(
      expect.arrayContaining(["Angeles City", "Mabalacat City", "Magalang", "Porac"]),
    );
    expect(options.propertyTypes.map(({ value }) => value)).toEqual([
      "house-and-lot",
      "lot",
    ]);
    expect(options.budgets.map(({ id }) => id)).toEqual(["3-6", "6-10"]);
  });

  it("falls back to every curated option and band when facets are unavailable", () => {
    const options = buildSearchOptions({});
    expect(options.budgets).toHaveLength(BUDGET_BANDS.length);
    expect(options.locations.length).toBeGreaterThanOrEqual(4);
    expect(options.propertyTypes.length).toBeGreaterThan(0);
  });

  it("serializes only chosen filters", () => {
    expect(
      buildSearchHref({ location: "", propertyType: "", budget: "", bedrooms: "" }),
    ).toBe("/properties");
    expect(
      buildSearchHref({
        location: "Porac",
        propertyType: "house-and-lot",
        budget: "u3",
        bedrooms: "",
      }),
    ).toBe("/properties?location=Porac&propertyType=house-and-lot&maxPrice=3000000");
  });

  it("round-trips through the catalog's own query parser", () => {
    const href = buildSearchHref({
      location: "Angeles City",
      propertyType: "townhouse",
      budget: "6-10",
      bedrooms: "3",
    });
    const params = new URL(href, "https://example.test").searchParams;
    expect(propertyFormValues(rawSearchParamsFromEntries(params))).toMatchObject({
      location: "Angeles City",
      propertyType: "townhouse",
      minPrice: "6000000",
      maxPrice: "10000000",
      bedrooms: "3",
    });
  });
});
