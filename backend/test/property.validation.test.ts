import {
  PROPERTY_AVAILABILITY,
  PROPERTY_PUBLICATION_STATUSES,
  type CreateDraftPropertyRequest,
} from "@rc/shared";
import { describe, expect, it } from "vitest";
import { HttpError } from "../src/middleware/errorHandler.js";
import { PropertyModel } from "../src/modules/properties/property.model.js";
import {
  buildAdminPropertyFilter,
  buildPublishedPropertyDetailFilter,
  buildPublishedPropertyFilter,
  toPublicPropertySummary,
} from "../src/modules/properties/property.service.js";
import type { PublicPropertyRecord } from "../src/modules/properties/property.types.js";
import {
  parseAdminPropertyId,
  parseAdminPropertyAvailabilityBody,
  parseAdminPropertyListQuery,
  parseAdminPropertyTransitionBody,
  parseCreateDraftPropertyBody,
  parsePropertyMapQuery,
  parsePropertySearchQuery,
  parseUpdateDraftPropertyBody,
  parseUpdatePropertyMediaBody,
} from "../src/modules/properties/property.validation.js";

const DRAFT_REQUEST: CreateDraftPropertyRequest = {
  propertyId: "RCPP-ADMIN-001",
  slug: "admin-draft-fixture",
  title: "Admin draft fixture",
  purpose: "sale",
  propertyType: "house-and-lot",
  featured: false,
  price: { amount: 7_500_000, negotiable: true },
  location: {
    province: "Pampanga",
    city: "Angeles City",
    barangay: "Balibago",
    publicPrecision: "barangay-area",
  },
  specifications: { bedrooms: 3, bathrooms: 2, lotAreaSqm: 180 },
  shortDescription: "A test-only private draft.",
  description: "Detailed content for the test-only private draft.",
  highlights: ["First highlight"],
  amenities: [],
  features: ["Covered parking"],
};

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

describe("admin property validation", () => {
  it("keeps the approved lifecycle sales-only and omits an unused review state", () => {
    expect(PROPERTY_AVAILABILITY).toEqual(["available", "reserved", "sold"]);
    expect(PROPERTY_PUBLICATION_STATUSES).toEqual([
      "draft",
      "published",
      "unpublished",
      "archived",
    ]);
    expect(() =>
      parseAdminPropertyAvailabilityBody({
        expectedVersion: 0,
        availability: "rented",
      }),
    ).toThrow(HttpError);
    expect(() => parseAdminPropertyListQuery({ publicationStatus: "pending" })).toThrow(
      HttpError,
    );
  });

  it("normalizes an allowlisted draft request without adding lifecycle fields", () => {
    expect(
      parseCreateDraftPropertyBody({
        ...DRAFT_REQUEST,
        propertyId: " rcpp-admin-001 ",
        title: " Admin draft fixture ",
        highlights: [" First highlight ", "First highlight"],
      }),
    ).toEqual(DRAFT_REQUEST);
  });

  it.each([
    { ...DRAFT_REQUEST, publicationStatus: "published" },
    { ...DRAFT_REQUEST, availability: "sold" },
    { ...DRAFT_REQUEST, publishedAt: "2026-09-06T00:00:00.000Z" },
    { ...DRAFT_REQUEST, internalNotes: "mass assignment" },
    { ...DRAFT_REQUEST, price: { ...DRAFT_REQUEST.price, currency: "PHP" } },
    {
      ...DRAFT_REQUEST,
      location: { ...DRAFT_REQUEST.location, privateAddress: "private" },
    },
    { ...DRAFT_REQUEST, propertyType: "castle" },
    { ...DRAFT_REQUEST, price: { amount: -1, negotiable: false } },
    { ...DRAFT_REQUEST, specifications: { bedrooms: 1.5 } },
  ])("rejects invalid or unknown create fields", (body) => {
    expect(() => parseCreateDraftPropertyBody(body)).toThrowError(
      expect.objectContaining({ status: 400 }),
    );
  });

  it("accepts a partial content edit and rejects empty or lifecycle edits", () => {
    expect(
      parseUpdateDraftPropertyBody({
        expectedVersion: 3,
        title: " Updated title ",
        description: " Updated draft description. ",
      }),
    ).toEqual({
      title: "Updated title",
      description: "Updated draft description.",
      expectedVersion: 3,
    });
    expect(() => parseUpdateDraftPropertyBody({ expectedVersion: 3 })).toThrow(
      HttpError,
    );
    expect(() =>
      parseUpdateDraftPropertyBody({
        expectedVersion: 3,
        publicationStatus: "published",
      }),
    ).toThrow(HttpError);
    expect(() =>
      parseUpdateDraftPropertyBody({ expectedVersion: 3, availability: "sold" }),
    ).toThrow(HttpError);
    expect(parseAdminPropertyTransitionBody({ expectedVersion: 3 })).toEqual({
      expectedVersion: 3,
    });
    expect(
      parseAdminPropertyAvailabilityBody({
        expectedVersion: 3,
        availability: "reserved",
      }),
    ).toEqual({ expectedVersion: 3, availability: "reserved" });
    expect(() =>
      parseAdminPropertyAvailabilityBody({
        expectedVersion: -1,
        availability: "reserved",
      }),
    ).toThrow(HttpError);
  });

  it("validates private list pagination, status, unknown query fields, and IDs", () => {
    expect(
      parseAdminPropertyListQuery({
        publicationStatus: "draft",
        availability: "available",
        query: "RCPP-001",
        page: "2",
        limit: "10",
      }),
    ).toEqual({
      query: "RCPP-001",
      publicationStatus: "draft",
      availability: "available",
      page: 2,
      limit: 10,
    });
    expect(() => parseAdminPropertyListQuery({ owner: "any" })).toThrow(HttpError);
    expect(() => parseAdminPropertyListQuery({ limit: "51" })).toThrow(HttpError);
    expect(parseAdminPropertyId("507f1f77bcf86cd799439011")).toBe(
      "507f1f77bcf86cd799439011",
    );
    expect(() => parseAdminPropertyId("not-an-object-id")).toThrow(HttpError);
  });

  it("builds combined private search and lifecycle filters", () => {
    const filter = buildAdminPropertyFilter({
      query: "RCPP-001",
      publicationStatus: "published",
      availability: "reserved",
      page: 2,
      limit: 20,
    });
    expect(filter).toMatchObject({
      publicationStatus: "published",
      availability: "reserved",
    });
    expect(filter.$or).toHaveLength(4);
    expect(String((filter.$or?.[0] as { propertyId: RegExp }).propertyId)).toBe(
      "/RCPP-001/i",
    );
  });
});

describe("property media validation", () => {
  it("accepts an ordered local image list and explicit cover", () => {
    expect(
      parseUpdatePropertyMediaBody({
        expectedVersion: 4,
        media: [
          {
            id: "media-exterior-0001",
            kind: "image",
            url: "/media/properties/rcpp-01/exterior.webp",
            alt: "Front exterior of the listed house",
            caption: "Front elevation",
            source: "production",
          },
          {
            id: "media-interior-0002",
            kind: "image",
            url: "/media/properties/rcpp-01/living-room.jpg",
            alt: "Living room with large windows",
            source: "production",
          },
        ],
        coverMediaId: "media-interior-0002",
      }),
    ).toEqual({
      expectedVersion: 4,
      media: [
        {
          id: "media-exterior-0001",
          kind: "image",
          url: "/media/properties/rcpp-01/exterior.webp",
          alt: "Front exterior of the listed house",
          caption: "Front elevation",
          source: "production",
        },
        {
          id: "media-interior-0002",
          kind: "image",
          url: "/media/properties/rcpp-01/living-room.jpg",
          alt: "Living room with large windows",
          source: "production",
        },
      ],
      coverMediaId: "media-interior-0002",
    });
  });

  it("accepts only attributed Unsplash development samples", () => {
    expect(
      parseUpdatePropertyMediaBody({
        expectedVersion: 0,
        media: [
          {
            id: "media-sample-0001",
            kind: "image",
            url: "https://images.unsplash.com/photo-1695593116063-843e813fee6f?auto=format&q=80&w=2000",
            alt: "White modern house reflected in a pool",
            source: "development-sample",
            sourceUrl: "https://unsplash.com/photos/GvOcpTNAHFo",
            attribution: "Photo by Damien Schneider on Unsplash",
          },
        ],
        coverMediaId: "media-sample-0001",
      }),
    ).toMatchObject({
      media: [{ source: "development-sample", attribution: expect.any(String) }],
    });
  });

  it.each([
    {
      expectedVersion: 0,
      media: [
        {
          id: "media-invalid-0001",
          kind: "video",
          url: "/media/properties/tour.mp4",
          alt: "Tour",
          source: "production",
        },
      ],
      coverMediaId: "media-invalid-0001",
    },
    {
      expectedVersion: 0,
      media: [
        {
          id: "media-invalid-0002",
          kind: "image",
          url: "https://attacker.invalid/property.svg",
          alt: "Unsafe remote image",
          source: "production",
        },
      ],
      coverMediaId: "media-invalid-0002",
    },
    {
      expectedVersion: 0,
      media: [
        {
          id: "media-duplicate-0001",
          kind: "image",
          url: "/media/properties/one.jpg",
          alt: "One",
          source: "production",
        },
        {
          id: "media-duplicate-0001",
          kind: "image",
          url: "/media/properties/two.jpg",
          alt: "Two",
          source: "production",
        },
      ],
      coverMediaId: "media-duplicate-0001",
    },
    {
      expectedVersion: 0,
      media: [
        {
          id: "media-no-cover-0001",
          kind: "image",
          url: "/media/properties/one.jpg",
          alt: "One",
          source: "production",
        },
      ],
    },
  ])("rejects unsupported, unsafe, duplicate, or coverless media", (body) => {
    expect(() => parseUpdatePropertyMediaBody(body)).toThrowError(
      expect.objectContaining({ status: 400 }),
    );
  });
});
