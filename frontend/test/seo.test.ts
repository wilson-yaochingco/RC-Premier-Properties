import type {
  PropertyFacetsResponse,
  PublicPropertyDetail,
  PublicPropertySummary,
} from "@rc/shared";
import { describe, expect, it } from "vitest";
import { resolveSiteUrl } from "../src/lib/env";
import {
  buildPageMetadata,
  buildPublicSitemap,
  buildSiteStructuredData,
  OFFICIAL_EMAIL,
  OFFICIAL_FACEBOOK_URL,
  OFFICIAL_PHONE,
  serializeJsonLd,
} from "../src/lib/seo";
import {
  buildPropertiesMetadata,
  buildPropertyMetadata,
  buildPropertyStructuredData,
  publicPropertyImageUrl,
  resolveLocationSeoState,
  schemaAvailability,
} from "../src/features/properties/property-seo";

const property: PublicPropertyDetail = {
  id: "public-record-id",
  propertyId: "RCPP-025",
  slug: "premier-property-25",
  title: "Premier Property 25",
  purpose: "sale",
  propertyType: "house-and-lot",
  availability: "available",
  featured: true,
  price: { amount: 12_500_000, currency: "PHP", negotiable: false },
  location: {
    province: "Pampanga",
    city: "Angeles City",
    barangay: "Private test barangay",
    publicPrecision: "city-only",
    disclosure: "general-area",
    publicPoint: { type: "Point", coordinates: [120.5, 15.1] },
  },
  specifications: { bedrooms: 4, bathrooms: 3, lotAreaSqm: 280 },
  shortDescription: "A published residential property in Angeles City.",
  description: "Public property description.",
  highlights: [],
  amenities: [],
  features: [],
  coverMedia: {
    kind: "image",
    url: "https://media.example.test/properties/25.webp",
    alt: "Premier Property 25 exterior",
    source: "production",
  },
  gallery: [],
  publishedAt: "2026-08-20T08:00:00.000Z",
  updatedAt: "2026-08-22T08:00:00.000Z",
};

describe("public site origin", () => {
  it("allows local development while refusing missing or localhost production origins", () => {
    expect(resolveSiteUrl(undefined, "development")).toBe("http://localhost:3000");
    expect(resolveSiteUrl(undefined, "production")).toBeUndefined();
    expect(resolveSiteUrl("http://localhost:3000", "production")).toBeUndefined();
    expect(resolveSiteUrl("https://example.com/", "production")).toBe(
      "https://example.com",
    );
  });

  it("rejects credentials, paths and non-HTTP origins", () => {
    expect(
      resolveSiteUrl("https://user:pass@example.com", "production"),
    ).toBeUndefined();
    expect(resolveSiteUrl("https://example.com/site", "production")).toBeUndefined();
    expect(resolveSiteUrl("javascript:alert(1)", "production")).toBeUndefined();
  });
});

describe("page and location metadata", () => {
  it("builds canonical Open Graph and Twitter metadata from one source", () => {
    const metadata = buildPageMetadata({
      title: "Contact",
      description: "Contact RC Premier Properties.",
      canonicalPath: "/contact",
      imagePath: "/approved.jpg",
    });

    expect(metadata.alternates?.canonical).toBe("http://localhost:3000/contact");
    expect(metadata.openGraph?.url).toBe("http://localhost:3000/contact");
    expect(JSON.stringify(metadata.twitter)).toContain("summary_large_image");
    expect(metadata.robots).toBeUndefined();
  });

  it("indexes only a stable location backed by published facet counts", () => {
    const facets: PropertyFacetsResponse = {
      locations: ["Angeles City, Pampanga"],
      locationCounts: [{ location: "Angeles City, Pampanga", count: 2 }],
      propertyTypes: ["house-and-lot"],
      priceRange: { min: 1, max: 2, currency: "PHP" },
    };
    const state = resolveLocationSeoState({ location: "Angeles City" }, facets);
    const metadata = buildPropertiesMetadata(state, "/approved.jpg");

    expect(state).toEqual({
      indexable: true,
      location: "Angeles City, Pampanga",
      count: 2,
      canonicalPath: "/properties?location=Angeles+City%2C+Pampanga",
    });
    expect(metadata.title).toBe("Properties for Sale in Angeles City, Pampanga");
    expect(metadata.robots).toBeUndefined();
  });

  it("canonicalizes arbitrary, unsupported and thin filter states to the catalog", () => {
    const state = resolveLocationSeoState(
      { location: "Imaginary City", minPrice: "1000000", page: "7" },
      {
        locations: [],
        locationCounts: [],
        propertyTypes: [],
        priceRange: { min: null, max: null, currency: "PHP" },
      },
    );
    const metadata = buildPropertiesMetadata(state, "/approved.jpg");

    expect(state).toEqual({ indexable: false, canonicalPath: "/properties" });
    expect(metadata.alternates?.canonical).toBe("http://localhost:3000/properties");
    expect(metadata.robots).toMatchObject({ index: false, follow: true });
  });

  it("does not index duplicate location parameters", () => {
    expect(
      resolveLocationSeoState(
        { location: ["Angeles City", "Injected City"] },
        {
          locations: ["Angeles City, Pampanga"],
          locationCounts: [{ location: "Angeles City, Pampanga", count: 2 }],
          propertyTypes: [],
          priceRange: { min: null, max: null, currency: "PHP" },
        },
      ),
    ).toEqual({ indexable: false, canonicalPath: "/properties" });
  });
});

describe("property SEO", () => {
  it("uses a real production cover for social metadata and rejects sample media", () => {
    expect(publicPropertyImageUrl(property.coverMedia)).toBe(
      "https://media.example.test/properties/25.webp",
    );
    expect(
      publicPropertyImageUrl({
        kind: "image",
        url: "https://images.unsplash.com/photo-sample",
        alt: "Development sample",
        source: "development-sample",
      }),
    ).toBeUndefined();
    expect(JSON.stringify(buildPropertyMetadata(property, "/approved.jpg"))).toContain(
      "https://media.example.test/properties/25.webp",
    );
  });

  it("maps supported availability states accurately", () => {
    expect(schemaAvailability("available")).toBe("https://schema.org/InStock");
    expect(schemaAvailability("reserved")).toBe(
      "https://schema.org/LimitedAvailability",
    );
    expect(schemaAvailability("sold")).toBe("https://schema.org/SoldOut");
  });

  it("emits Product and BreadcrumbList data without private location details", () => {
    const structuredData = buildPropertyStructuredData(property);
    const serialized = serializeJsonLd(structuredData);

    expect(serialized).toContain('"@type":"Product"');
    expect(serialized).toContain('"@type":"BreadcrumbList"');
    expect(serialized).toContain('"priceCurrency":"PHP"');
    expect(serialized).toContain("Angeles City, Pampanga");
    expect(serialized).not.toContain("Private test barangay");
    expect(serialized).not.toContain("coordinates");
    expect(serialized).not.toContain("public-record-id");
  });
});

describe("site structured data and sitemap", () => {
  it("uses exact approved business information and omits unsupported claims", () => {
    const serialized = JSON.stringify(buildSiteStructuredData("/logo.png"));

    expect(serialized).toContain(OFFICIAL_EMAIL);
    expect(serialized).toContain(OFFICIAL_PHONE);
    expect(serialized).toContain(OFFICIAL_FACEBOOK_URL);
    expect(serialized).not.toContain("streetAddress");
    expect(serialized).not.toContain("openingHours");
    expect(serialized).not.toContain("aggregateRating");
    expect(serialized).not.toContain("SearchAction");
  });

  it("includes only valid sales property and inventory-backed location URLs", () => {
    const rental = { ...property, slug: "rental-fixture", purpose: "rent" };
    const invalid = { ...property, slug: "INVALID_SLUG" };
    const sitemap = buildPublicSitemap(
      [property, rental, invalid] as PublicPropertySummary[],
      [
        { location: "Angeles City, Pampanga", count: 2 },
        { location: "Empty City, Pampanga", count: 0 },
      ],
      "https://www.example.test",
    );
    const urls = sitemap.map((entry) => entry.url);

    expect(urls).toContain("https://www.example.test/properties/premier-property-25");
    expect(urls).toContain(
      "https://www.example.test/properties?location=Angeles+City%2C+Pampanga",
    );
    expect(urls).toContain("https://www.example.test/locations");
    expect(urls).toContain("https://www.example.test/locations/angeles-city");
    expect(urls.some((url) => url.includes("rental-fixture"))).toBe(false);
    expect(urls.some((url) => url.includes("INVALID_SLUG"))).toBe(false);
    expect(urls.some((url) => url.includes("Empty+City"))).toBe(false);
    expect(urls.some((url) => url.includes("/admin") || url.includes("/api"))).toBe(
      false,
    );
  });
});
