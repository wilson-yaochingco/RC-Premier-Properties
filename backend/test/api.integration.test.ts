import type { RequestHandler } from "express";
import type {
  CreateInquiryRequest,
  CreateInquiryResponse,
  PropertyFacetsResponse,
  PropertyMapResponse,
  PropertySearchRequest,
  PropertySearchResponse,
  PublicPropertyDetail,
} from "@rc/shared";
import { API_PREFIX } from "@rc/shared";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { InquiryService } from "../src/modules/inquiries/inquiry.types.js";
import type { PropertyService } from "../src/modules/properties/property.types.js";

const DETAIL: PublicPropertyDetail = {
  id: "507f1f77bcf86cd799439011",
  propertyId: "RC-100",
  slug: "modern-home-angeles-city",
  title: "Modern home in Angeles City",
  purpose: "sale",
  propertyType: "house-and-lot",
  availability: "available",
  featured: true,
  price: { amount: 8_500_000, currency: "PHP", negotiable: true },
  location: {
    province: "Pampanga",
    city: "Angeles City",
    publicPrecision: "city-only",
    disclosure: "general-area",
  },
  specifications: { bedrooms: 3, bathrooms: 2, lotAreaSqm: 180 },
  shortDescription: "A bright family home.",
  publishedAt: "2026-08-20T00:00:00.000Z",
  description: "A detailed property description.",
  highlights: ["Quiet neighborhood"],
  amenities: ["Pool"],
  features: ["Covered parking"],
  gallery: [],
  updatedAt: "2026-08-21T00:00:00.000Z",
};

const FACETS: PropertyFacetsResponse = {
  locations: ["Angeles City, Pampanga"],
  propertyTypes: ["house-and-lot"],
  priceRange: { min: 8_500_000, max: 8_500_000, currency: "PHP" },
};

const passThrough: RequestHandler = (_req, _res, next) => next();

function makePropertyService() {
  const searches: PropertySearchRequest[] = [];
  const maps: PropertySearchRequest[] = [];
  const service: PropertyService = {
    async search(search): Promise<PropertySearchResponse> {
      searches.push(search);
      return {
        items: [DETAIL],
        pagination: { page: search.page, limit: search.limit, total: 1, totalPages: 1 },
        appliedFilters: search,
        sort: search.sort,
      };
    },
    async map(search): Promise<PropertyMapResponse> {
      maps.push(search);
      const { sort, page, limit, ...appliedFilters } = search;
      void sort;
      void page;
      void limit;
      return {
        items: [],
        matchingTotal: 1,
        mappableTotal: 0,
        returned: 0,
        truncated: false,
        appliedFilters,
      };
    },
    async findPublishedBySlug(slug) {
      return slug === DETAIL.slug ? DETAIL : null;
    },
    async getFacets() {
      return FACETS;
    },
  };
  return { maps, searches, service };
}

function makeInquiryService() {
  const submissions: Array<Omit<CreateInquiryRequest, "website">> = [];
  const response: CreateInquiryResponse = {
    inquiryId: "507f191e810c19729de860ea",
    status: "received",
    message: "Thank you. Your inquiry has been received.",
    createdAt: "2026-09-01T00:00:00.000Z",
  };
  const service: InquiryService = {
    async create(inquiry) {
      submissions.push(inquiry);
      return response;
    },
  };
  return { response, service, submissions };
}

describe("Phase 2A public API", () => {
  let properties: ReturnType<typeof makePropertyService>;
  let inquiries: ReturnType<typeof makeInquiryService>;

  beforeEach(() => {
    properties = makePropertyService();
    inquiries = makeInquiryService();
  });

  function app() {
    return createApp({
      propertyService: properties.service,
      inquiryService: inquiries.service,
      inquiryRateLimit: passThrough,
    });
  }

  it("lists properties with normalized, typed filters", async () => {
    const response = await request(app()).get(`${API_PREFIX}/properties`).query({
      propertyId: "rc-100",
      location: " Angeles City ",
      propertyType: "house-and-lot",
      minPrice: "1000000",
      maxPrice: "9000000",
      featured: "true",
      sort: "price-desc",
      page: "2",
      limit: "6",
    });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(properties.searches).toEqual([
      {
        propertyId: "RC-100",
        location: "Angeles City",
        propertyType: "house-and-lot",
        minPrice: 1_000_000,
        maxPrice: 9_000_000,
        featured: true,
        sort: "price-desc",
        page: 2,
        limit: 6,
      },
    ]);
  });

  it("returns facets and published detail responses", async () => {
    const facets = await request(app()).get(`${API_PREFIX}/properties/facets`);
    const detail = await request(app()).get(`${API_PREFIX}/properties/${DETAIL.slug}`);

    expect(facets.status).toBe(200);
    expect(facets.body).toEqual(FACETS);
    expect(detail.status).toBe(200);
    expect(detail.body.location).toEqual({
      province: "Pampanga",
      city: "Angeles City",
      publicPrecision: "city-only",
      disclosure: "general-area",
    });
  });

  it("returns a bounded map response using the same normalized filters", async () => {
    const response = await request(app())
      .get(`${API_PREFIX}/properties/map`)
      .query({ location: " Angeles City ", maxPrice: "9000000" });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      items: [],
      matchingTotal: 1,
      mappableTotal: 0,
      returned: 0,
      truncated: false,
      appliedFilters: { location: "Angeles City", maxPrice: 9_000_000 },
    });
    expect(properties.maps).toEqual([
      {
        location: "Angeles City",
        maxPrice: 9_000_000,
        sort: "newest",
        page: 1,
        limit: 48,
      },
    ]);
  });

  it("keeps map result limits server-owned", async () => {
    const response = await request(app()).get(`${API_PREFIX}/properties/map?limit=1`);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: "error",
      statusCode: 400,
      message: "Invalid property map parameters.",
    });
    expect(properties.maps).toHaveLength(0);
  });

  it("returns the common 404 envelope for missing properties and routes", async () => {
    const missingProperty = await request(app()).get(
      `${API_PREFIX}/properties/not-found`,
    );
    const missingRoute = await request(app()).get(`${API_PREFIX}/not-a-route`);

    expect(missingProperty.status).toBe(404);
    expect(missingProperty.body).toMatchObject({
      status: "error",
      statusCode: 404,
      message: "Property not found.",
    });
    expect(missingRoute.status).toBe(404);
    expect(missingRoute.body).toMatchObject({ status: "error", statusCode: 404 });
  });

  it("rejects operator-style query input with field-level issues", async () => {
    const response = await request(app()).get(
      `${API_PREFIX}/properties?propertyId%5B%24ne%5D=RC-100`,
    );

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: "error",
      statusCode: 400,
      message: "Invalid property search parameters.",
    });
    expect(response.body.issues).toContainEqual({
      field: "propertyId[$ne]",
      message: "Unknown query parameter.",
    });
    expect(properties.searches).toHaveLength(0);
  });

  it("persists a normalized inquiry and exposes no public read route", async () => {
    const response = await request(app()).post(`${API_PREFIX}/inquiries`).send({
      name: "  Maria Santos ",
      email: " MARIA@EXAMPLE.COM ",
      phone: "+63 917 555 1234",
      inquiryType: "property",
      source: "property-detail",
      propertyId: "rc-100",
      subject: "Viewing request",
      message: "I would like to learn more about this property.",
      privacyConsent: true,
      website: "",
    });
    const readResponse = await request(app()).get(`${API_PREFIX}/inquiries`);

    expect(response.status).toBe(201);
    expect(response.body).toEqual(inquiries.response);
    expect(inquiries.submissions).toEqual([
      {
        name: "Maria Santos",
        email: "maria@example.com",
        phone: "+63 917 555 1234",
        inquiryType: "property",
        source: "property-detail",
        propertyId: "RC-100",
        subject: "Viewing request",
        message: "I would like to learn more about this property.",
        privacyConsent: true,
      },
    ]);
    expect(readResponse.status).toBe(404);
  });

  it("returns accessible inquiry validation issues without calling persistence", async () => {
    const response = await request(app()).post(`${API_PREFIX}/inquiries`).send({
      name: "A",
      email: "not-an-email",
      inquiryType: "unknown",
      source: "contact-page",
      message: "short",
      privacyConsent: false,
      $where: "this.password",
    });

    expect(response.status).toBe(400);
    expect(response.body.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "email" }),
        expect.objectContaining({ field: "inquiryType" }),
        expect.objectContaining({ field: "privacyConsent" }),
        expect.objectContaining({ field: "$where" }),
      ]),
    );
    expect(inquiries.submissions).toHaveLength(0);
  });

  it("rejects non-JSON inquiry requests without persistence", async () => {
    const response = await request(app())
      .post(`${API_PREFIX}/inquiries`)
      .type("form")
      .send({
        name: "Maria Santos",
        email: "maria@example.com",
        inquiryType: "general",
        source: "contact-page",
        message: "Please contact me about a property.",
        privacyConsent: "true",
      });

    expect(response.status).toBe(415);
    expect(response.body).toMatchObject({
      status: "error",
      statusCode: 415,
      message: "Inquiry requests must use application/json.",
    });
    expect(inquiries.submissions).toHaveLength(0);
  });

  it("preserves parser status codes for malformed and oversized JSON", async () => {
    const malformed = await request(app())
      .post(`${API_PREFIX}/inquiries`)
      .set("Content-Type", "application/json")
      .send('{"name":');
    const oversized = await request(app())
      .post(`${API_PREFIX}/inquiries`)
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ message: "x".repeat(1_100_000) }));

    expect(malformed.status).toBe(400);
    expect(malformed.body).toMatchObject({
      status: "error",
      statusCode: 400,
      message: "Malformed JSON request body.",
    });
    expect(oversized.status).toBe(413);
    expect(oversized.body).toMatchObject({
      status: "error",
      statusCode: 413,
      message: "Request body exceeds the 1 MB limit.",
    });
    expect(inquiries.submissions).toHaveLength(0);
  });

  it("silently accepts a honeypot submission without persisting it", async () => {
    const response = await request(app()).post(`${API_PREFIX}/inquiries`).send({
      name: "Automated Sender",
      email: "bot@example.com",
      inquiryType: "general",
      source: "contact-page",
      message: "This appears to be a valid-length message.",
      privacyConsent: true,
      website: "https://spam.invalid",
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ status: "received" });
    expect(inquiries.submissions).toHaveLength(0);
  });
});

describe("inquiry spam throttling", () => {
  it("limits repeated submissions independently of the general API budget", async () => {
    const properties = makePropertyService();
    const inquiries = makeInquiryService();
    const app = createApp({
      propertyService: properties.service,
      inquiryService: inquiries.service,
    });
    const body = {
      name: "Maria Santos",
      email: "maria@example.com",
      inquiryType: "general",
      source: "contact-page",
      message: "Please contact me about your property services.",
      privacyConsent: true,
    };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request(app).post(`${API_PREFIX}/inquiries`).send(body);
      expect(response.status).toBe(201);
    }
    const limited = await request(app).post(`${API_PREFIX}/inquiries`).send(body);

    expect(limited.status).toBe(429);
    expect(limited.body).toMatchObject({ status: "error", statusCode: 429 });
  });
});
