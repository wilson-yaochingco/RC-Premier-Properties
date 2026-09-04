/**
 * TEST-ONLY API process used by Playwright.
 *
 * It mounts the real compiled Express application with in-memory service doubles.
 * Production middleware, routing, validation and error handling are exercised without
 * connecting to MongoDB or loading synthetic records into a production data path.
 */
import { PROPERTY_TYPES } from "@rc/shared";
import { createApp } from "../backend/dist/app.js";

const FIXTURE_HOST = "127.0.0.1";
const FIXTURE_PORT = 5051;

const PRIMARY_FIXTURES = [
  {
    id: "fixture-property-001",
    propertyId: "RCPP-E2E-001",
    slug: "clark-garden-residence",
    title: "Clark Garden Residence",
    purpose: "sale",
    propertyType: "house-and-lot",
    availability: "available",
    featured: true,
    price: { amount: 12_500_000, currency: "PHP", negotiable: true },
    location: {
      province: "Pampanga",
      city: "Angeles City",
      barangay: "Balibago",
      development: "Clark Garden",
      publicPrecision: "approximate",
      // Synthetic, independently public test point; never reuse for real inventory.
      publicPoint: { type: "Point", coordinates: [120.59, 15.15] },
      disclosure: "general-area",
    },
    specifications: {
      bedrooms: 4,
      bathrooms: 3,
      parkingSpaces: 2,
      lotAreaSqm: 280,
      floorAreaSqm: 220,
      storeys: 2,
      furnishing: "Semi-furnished",
    },
    shortDescription: "A synthetic Playwright fixture residence near the Clark area.",
    description:
      "This clearly synthetic listing exists only to verify the public property-detail experience in automated browser tests.",
    highlights: ["Test-only listing", "General-area location"],
    amenities: ["Fixture garden"],
    features: ["Two-storey layout", "Covered parking"],
    gallery: [
      { kind: "image", alt: "Synthetic fixture residence exterior" },
      { kind: "image", alt: "Synthetic fixture residence living area" },
      { kind: "floor-plan", alt: "Synthetic fixture residence floor plan" },
    ],
    publishedAt: "2026-08-20T08:00:00.000Z",
    updatedAt: "2026-08-22T08:00:00.000Z",
  },
  {
    id: "fixture-property-002",
    propertyId: "RCPP-E2E-002",
    slug: "mabalacat-skyline-condominium",
    title: "Mabalacat Skyline Condominium",
    purpose: "rent",
    propertyType: "condominium",
    availability: "available",
    featured: true,
    price: { amount: 55_000, currency: "PHP", negotiable: false },
    location: {
      province: "Pampanga",
      city: "Mabalacat City",
      development: "Clark Freeport area",
      publicPrecision: "approximate",
      // Synthetic, independently public test point; never reuse for real inventory.
      publicPoint: { type: "Point", coordinates: [120.575, 15.223] },
      disclosure: "general-area",
    },
    specifications: {
      bedrooms: 2,
      bathrooms: 2,
      parkingSpaces: 1,
      floorAreaSqm: 85,
      furnishing: "Furnished",
    },
    shortDescription:
      "A synthetic rental fixture used to exercise URL-backed search filters.",
    description:
      "This non-production condominium record lets Playwright verify rental pricing, specifications, and inquiry links.",
    highlights: ["Test-only listing", "Clark-area fixture"],
    amenities: ["Fixture lobby", "Fixture pool"],
    features: ["One parking space"],
    gallery: [],
    publishedAt: "2026-08-18T08:00:00.000Z",
    updatedAt: "2026-08-19T08:00:00.000Z",
  },
  {
    id: "fixture-property-003",
    propertyId: "RCPP-E2E-003",
    slug: "san-fernando-commercial-lot",
    title: "San Fernando Commercial Lot",
    purpose: "sale",
    propertyType: "commercial",
    availability: "reserved",
    featured: false,
    price: { amount: 8_750_000, currency: "PHP", negotiable: false },
    location: {
      province: "Pampanga",
      city: "City of San Fernando",
      barangay: "Dolores",
      publicPrecision: "barangay-area",
      // Synthetic, independently public test point; never reuse for real inventory.
      publicPoint: { type: "Point", coordinates: [120.685, 15.028] },
      disclosure: "general-area",
    },
    specifications: { lotAreaSqm: 500 },
    shortDescription:
      "A synthetic commercial fixture for price, location, and empty-state tests.",
    description:
      "This test-only commercial lot is not real inventory and is never persisted.",
    highlights: ["Test-only listing"],
    amenities: [],
    features: ["Five-hundred-square-metre fixture lot"],
    gallery: [],
    publishedAt: "2026-08-10T08:00:00.000Z",
    updatedAt: "2026-08-12T08:00:00.000Z",
  },
];

const PAGINATION_FIXTURES = Array.from({ length: 8 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return {
    id: `fixture-pagination-${number}`,
    propertyId: `RCPP-PAGE-${number}`,
    slug: `pagination-fixture-${number}`,
    title: `Pagination Fixture ${number}`,
    purpose: "sale",
    propertyType: "lot",
    availability: "available",
    featured: false,
    price: {
      amount: 1_000_000 + index * 500_000,
      currency: "PHP",
      negotiable: false,
    },
    location: {
      province: "Pampanga",
      city: "Angeles City",
      publicPrecision: "city-only",
      disclosure: "general-area",
    },
    specifications: { lotAreaSqm: 150 + index * 10 },
    shortDescription: "Synthetic inventory used only to verify pagination.",
    description:
      "This generated Playwright fixture is not real inventory and is never persisted.",
    highlights: ["Test-only listing"],
    amenities: [],
    features: [],
    gallery: [],
    publishedAt: `2026-07-${String(20 - index).padStart(2, "0")}T08:00:00.000Z`,
    updatedAt: "2026-08-01T08:00:00.000Z",
  };
});

const TEST_PROPERTIES = [...PRIMARY_FIXTURES, ...PAGINATION_FIXTURES];

function includes(value, query) {
  return value?.toLocaleLowerCase().includes(query.toLocaleLowerCase()) ?? false;
}

function searchFixtureProperties(request) {
  const filtered = TEST_PROPERTIES.filter((property) => {
    if (request.propertyId && property.propertyId !== request.propertyId) return false;
    if (request.propertyType && property.propertyType !== request.propertyType) {
      return false;
    }
    if (request.purpose && property.purpose !== request.purpose) return false;
    if (request.featured !== undefined && property.featured !== request.featured) {
      return false;
    }
    if (request.minPrice !== undefined && property.price.amount < request.minPrice) {
      return false;
    }
    if (request.maxPrice !== undefined && property.price.amount > request.maxPrice) {
      return false;
    }
    if (
      request.bedrooms !== undefined &&
      (property.specifications.bedrooms ?? -1) < request.bedrooms
    ) {
      return false;
    }
    if (
      request.bathrooms !== undefined &&
      (property.specifications.bathrooms ?? -1) < request.bathrooms
    ) {
      return false;
    }
    if (
      request.minLotArea !== undefined &&
      (property.specifications.lotAreaSqm ?? -1) < request.minLotArea
    ) {
      return false;
    }
    if (
      request.minFloorArea !== undefined &&
      (property.specifications.floorAreaSqm ?? -1) < request.minFloorArea
    ) {
      return false;
    }
    if (request.location) {
      const matchesLocation = [
        property.location.province,
        property.location.city,
        property.location.barangay,
        property.location.development,
      ].some((part) => includes(part, request.location));
      if (!matchesLocation) return false;
    }
    if (request.keyword) {
      const matchesKeyword = [
        property.title,
        property.shortDescription,
        property.propertyId,
        property.location.development,
      ].some((part) => includes(part, request.keyword));
      if (!matchesKeyword) return false;
    }
    return true;
  }).sort((left, right) => {
    if (request.sort === "price-asc") return left.price.amount - right.price.amount;
    if (request.sort === "price-desc") return right.price.amount - left.price.amount;
    return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
  });

  const start = (request.page - 1) * request.limit;
  const { sort, page, limit, ...appliedFilters } = request;
  return {
    items: filtered.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total: filtered.length,
      totalPages: filtered.length === 0 ? 0 : Math.ceil(filtered.length / limit),
    },
    appliedFilters,
    sort,
  };
}

function mapFixtureProperties(request) {
  const search = searchFixtureProperties({
    ...request,
    sort: "newest",
    page: 1,
    limit: TEST_PROPERTIES.length,
  });
  const mappable = search.items.filter((property) => property.location.publicPoint);
  const items = mappable.map((property) => ({
    id: property.id,
    propertyId: property.propertyId,
    slug: property.slug,
    title: property.title,
    purpose: property.purpose,
    propertyType: property.propertyType,
    availability: property.availability,
    price: property.price,
    location: property.location,
    specifications: property.specifications,
    ...(property.coverMedia ? { coverMedia: property.coverMedia } : {}),
  }));

  return {
    items,
    matchingTotal: search.pagination.total,
    mappableTotal: mappable.length,
    returned: items.length,
    truncated: false,
    appliedFilters: search.appliedFilters,
  };
}

const propertyService = {
  async search(request) {
    return searchFixtureProperties(request);
  },
  async map(request) {
    return mapFixtureProperties(request);
  },
  async findPublishedBySlug(slug) {
    return TEST_PROPERTIES.find((property) => property.slug === slug) ?? null;
  },
  async getFacets() {
    return {
      locations: [
        ...new Set(
          TEST_PROPERTIES.map(
            (property) => `${property.location.city}, ${property.location.province}`,
          ),
        ),
      ].sort((left, right) => left.localeCompare(right)),
      propertyTypes: PROPERTY_TYPES.filter((type) =>
        TEST_PROPERTIES.some((property) => property.propertyType === type),
      ),
      priceRange: {
        min: Math.min(...TEST_PROPERTIES.map((property) => property.price.amount)),
        max: Math.max(...TEST_PROPERTIES.map((property) => property.price.amount)),
        currency: "PHP",
      },
    };
  },
};

const inquiryService = {
  async create() {
    return {
      inquiryId: "E2E-INQUIRY-001",
      status: "received",
      message: "Your test inquiry has been received for fixture-only follow-up.",
      createdAt: "2026-09-01T00:00:00.000Z",
    };
  },
};

const passThrough = (_request, _response, next) => next();
const app = createApp({
  propertyService,
  inquiryService,
  inquiryRateLimit: passThrough,
});

export function startFixtureApi() {
  return new Promise((resolve, reject) => {
    const server = app.listen(FIXTURE_PORT, FIXTURE_HOST);

    server.once("error", reject);
    server.once("listening", () => {
      server.off("error", reject);
      console.log(
        `[playwright fixture only] RC Express app listening on http://${FIXTURE_HOST}:${FIXTURE_PORT}`,
      );
      resolve(server);
    });
  });
}
