import { describe, expect, it } from "vitest";
import { HttpError } from "../src/middleware/errorHandler.js";
import { PropertyModel } from "../src/modules/properties/property.model.js";
import {
  buildPublishedPropertyDetailFilter,
  buildPublishedPropertyFilter,
  toPublicPropertySummary,
} from "../src/modules/properties/property.service.js";
import type { PublicPropertyRecord } from "../src/modules/properties/property.types.js";
import {
  parsePropertyMapQuery,
  parsePropertySearchQuery,
} from "../src/modules/properties/property.validation.js";

describe("property search validation", () => {
  it("normalizes supported filters and supplies pagination defaults", () => {
    expect(
      parsePropertySearchQuery({
        keyword: "  family home ",
        propertyId: " rc-100 ",
        location: " Angeles City ",
        propertyType: "house-and-lot",
        purpose: "sale",
        minPrice: "1000000",
        maxPrice: "5000000.50",
        bedrooms: "3",
        bathrooms: "2",
        minLotArea: "120",
        minFloorArea: "80",
        featured: "false",
      }),
    ).toEqual({
      keyword: "family home",
      propertyId: "RC-100",
      location: "Angeles City",
      propertyType: "house-and-lot",
      purpose: "sale",
      minPrice: 1_000_000,
      maxPrice: 5_000_000.5,
      bedrooms: 3,
      bathrooms: 2,
      minLotArea: 120,
      minFloorArea: 80,
      featured: false,
      sort: "newest",
      page: 1,
      limit: 12,
    });
  });

  it("rejects inverted ranges, arrays, nested/operator syntax, and unknown fields", () => {
    const cases = [
      { minPrice: "20", maxPrice: "10" },
      { propertyId: ["RC-1", "RC-2"] },
      { propertyId: { $ne: "" } },
      { "propertyId[$ne]": "RC-1" },
      { featured: "yes" },
      { limit: "49" },
    ];

    for (const query of cases) {
      expect(() => parsePropertySearchQuery(query)).toThrow(HttpError);
      try {
        parsePropertySearchQuery(query);
      } catch (error) {
        expect(error).toMatchObject({ status: 400 });
        expect((error as HttpError).issues?.length).toBeGreaterThan(0);
      }
    }
  });

  it("normalizes shared map filters and rejects client-owned pagination", () => {
    expect(
      parsePropertyMapQuery({ location: " Mabalacat City ", maxPrice: "15000000" }),
    ).toEqual({
      location: "Mabalacat City",
      maxPrice: 15_000_000,
      sort: "newest",
      page: 1,
      limit: 48,
    });
    expect(() => parsePropertyMapQuery({ page: "2" })).toThrow(HttpError);
    expect(() => parsePropertyMapQuery({ limit: "1" })).toThrow(HttpError);
  });
});

describe("published property query construction", () => {
  it("always pins public list filters to published records and uses fixed operators", () => {
    const filter = buildPublishedPropertyFilter({
      keyword: "pool.*$where",
      location: "Angeles (City)",
      propertyId: "RC-9",
      propertyType: "house-and-lot",
      purpose: "sale",
      minPrice: 1,
      maxPrice: 10,
      bedrooms: 2,
      bathrooms: 1,
      minLotArea: 50,
      minFloorArea: 40,
      featured: true,
      sort: "price-asc",
      page: 1,
      limit: 12,
    });

    expect(filter).toMatchObject({
      publicationStatus: "published",
      propertyId: "RC-9",
      propertyType: "house-and-lot",
      purpose: "sale",
      featured: true,
      "price.amount": { $gte: 1, $lte: 10 },
      "specifications.bedrooms": { $gte: 2 },
      "specifications.bathrooms": { $gte: 1 },
      "specifications.lotAreaSqm": { $gte: 50 },
      "specifications.floorAreaSqm": { $gte: 40 },
    });

    const serialized = String(filter.$and?.[0]?.$or?.[0]?.title);
    expect(serialized).toContain("pool\\.\\*\\$where");
    expect(buildPublishedPropertyDetailFilter("stable-slug")).toEqual({
      publicationStatus: "published",
      slug: "stable-slug",
    });
  });

  it("serializes only the approved public projection", () => {
    const record = {
      _id: "507f1f77bcf86cd799439011",
      propertyId: "RCPP-PRIVATE-TEST",
      slug: "public-projection-test",
      title: "Public projection test",
      purpose: "sale",
      propertyType: "house-and-lot",
      availability: "available",
      publicationStatus: "published",
      featured: false,
      price: { amount: 1_000_000, currency: "PHP", negotiable: false },
      location: {
        province: "Pampanga",
        city: "Angeles City",
        barangay: "Balibago",
        development: "Private development name",
        privateAddress: "Never expose this street address",
        coordinates: { latitude: 15.1, longitude: 120.6 },
      },
      specifications: {},
      shortDescription: "Projection boundary fixture.",
      description: "Projection boundary fixture detail.",
      highlights: [],
      amenities: [],
      features: [],
      gallery: [],
      internalNotes: "Never expose internal notes",
      ownerReference: "Never expose owner data",
      publishedAt: new Date("2026-08-20T00:00:00.000Z"),
      createdAt: new Date("2026-08-19T00:00:00.000Z"),
      updatedAt: new Date("2026-08-21T00:00:00.000Z"),
    } as unknown as PublicPropertyRecord;

    const summary = toPublicPropertySummary(record);

    expect(summary.location).toEqual({
      province: "Pampanga",
      city: "Angeles City",
      publicPrecision: "city-only",
      disclosure: "general-area",
    });
    expect(summary).not.toHaveProperty("publicationStatus");
    expect(summary).not.toHaveProperty("internalNotes");
    expect(summary).not.toHaveProperty("ownerReference");
    expect(summary.location).not.toHaveProperty("privateAddress");
    expect(summary.location).not.toHaveProperty("coordinates");
  });

  it.each([
    {
      publicPrecision: "city-only" as const,
      expectedText: {},
      disclosure: "general-area" as const,
    },
    {
      publicPrecision: "barangay-area" as const,
      expectedText: { barangay: "Balibago" },
      disclosure: "general-area" as const,
    },
    {
      publicPrecision: "subdivision" as const,
      expectedText: {
        barangay: "Balibago",
        development: "Approved public development",
      },
      disclosure: "general-area" as const,
    },
    {
      publicPrecision: "approximate" as const,
      expectedText: {
        barangay: "Balibago",
        development: "Approved public development",
      },
      disclosure: "general-area" as const,
    },
    {
      publicPrecision: "exact" as const,
      expectedText: {
        barangay: "Balibago",
        development: "Approved public development",
      },
      disclosure: "exact" as const,
    },
  ])(
    "redacts textual granularity for $publicPrecision public locations",
    ({ publicPrecision, expectedText, disclosure }) => {
      const record = {
        _id: "507f1f77bcf86cd799439011",
        propertyId: "RCPP-PRECISION-TEST",
        slug: `public-${publicPrecision}-test`,
        title: "Public location precision test",
        purpose: "sale",
        propertyType: "house-and-lot",
        availability: "available",
        publicationStatus: "published",
        featured: false,
        price: { amount: 1_000_000, currency: "PHP", negotiable: false },
        location: {
          province: "Pampanga",
          city: "Angeles City",
          barangay: "Balibago",
          development: "Approved public development",
          publicPrecision,
          publicPoint: {
            type: "Point",
            coordinates: [120.61, 15.15],
          },
          privateAddress: "Never expose this street address",
          coordinates: { latitude: 15.1, longitude: 120.6 },
        },
        specifications: {},
        shortDescription: "Projection boundary fixture.",
        description: "Projection boundary fixture detail.",
        highlights: [],
        amenities: [],
        features: [],
        gallery: [],
        internalNotes: "Never expose internal notes",
        ownerReference: "Never expose owner data",
        publishedAt: new Date("2026-08-20T00:00:00.000Z"),
        createdAt: new Date("2026-08-19T00:00:00.000Z"),
        updatedAt: new Date("2026-08-21T00:00:00.000Z"),
      } as unknown as PublicPropertyRecord;

      expect(toPublicPropertySummary(record).location).toEqual({
        province: "Pampanga",
        city: "Angeles City",
        ...expectedText,
        publicPrecision,
        publicPoint: { type: "Point", coordinates: [120.61, 15.15] },
        disclosure,
      });
    },
  );

  it("never exposes an orphan public point from a legacy record without precision", () => {
    const record = {
      _id: "507f1f77bcf86cd799439011",
      propertyId: "RCPP-LEGACY-TEST",
      slug: "legacy-location-test",
      title: "Legacy location test",
      purpose: "sale",
      propertyType: "house-and-lot",
      availability: "available",
      featured: false,
      price: { amount: 1_000_000, currency: "PHP", negotiable: false },
      location: {
        province: "Pampanga",
        city: "Angeles City",
        publicPoint: { type: "Point", coordinates: [120.61, 15.15] },
      },
      specifications: {},
      shortDescription: "Legacy fixture.",
      description: "Legacy fixture detail.",
      highlights: [],
      amenities: [],
      features: [],
      gallery: [],
      publishedAt: new Date("2026-08-20T00:00:00.000Z"),
      createdAt: new Date("2026-08-19T00:00:00.000Z"),
      updatedAt: new Date("2026-08-21T00:00:00.000Z"),
    } as unknown as PublicPropertyRecord;

    expect(toPublicPropertySummary(record).location).toEqual({
      province: "Pampanga",
      city: "Angeles City",
      publicPrecision: "city-only",
      disclosure: "general-area",
    });
  });
});

describe("property public map point schema", () => {
  const baseProperty = {
    propertyId: "RCPP-MAP-SCHEMA",
    slug: "map-schema-test",
    title: "Map schema test",
    purpose: "sale",
    propertyType: "house-and-lot",
    availability: "available",
    publicationStatus: "draft",
    featured: false,
    price: { amount: 1_000_000, currency: "PHP", negotiable: false },
    specifications: {},
    shortDescription: "Map schema fixture.",
    description: "Map schema fixture detail.",
  };

  it("defaults legacy/new records to city-only without creating a public point", async () => {
    const property = new PropertyModel({
      ...baseProperty,
      location: { province: "Pampanga", city: "Angeles City" },
    });

    await expect(property.validate()).resolves.toBeUndefined();
    expect(property.location.publicPrecision).toBe("city-only");
    expect(property.location.publicPoint).toBeUndefined();
  });

  it("rejects malformed or out-of-range public GeoJSON coordinates", async () => {
    const property = new PropertyModel({
      ...baseProperty,
      location: {
        province: "Pampanga",
        city: "Angeles City",
        publicPrecision: "approximate",
        publicPoint: { type: "Point", coordinates: [181, 15.15] },
      },
    });

    await expect(property.validate()).rejects.toThrow(
      "Public map coordinates must be [longitude, latitude] within valid ranges.",
    );
  });
});
