/**
 * DEVELOPMENT ONLY. Design fixtures for the Featured Properties showcase.
 *
 * Loaded exclusively through the guarded dynamic import in `featured-inventory.ts`
 * when `FEATURED_FIXTURES_ENABLED` (`next dev`). Never a production fallback, and never
 * a source of real listings. Links point to synthetic slugs with no detail record.
 */
import type { PublicPropertySummary } from "@rc/shared";
import { DEVELOPMENT_SAMPLE_MEDIA } from "../properties/development-sample-media";
import type { FeaturedFixtureScenario } from "./featured-inventory";

function location(
  city: string,
  extras: { barangay?: string; development?: string } = {},
): PublicPropertySummary["location"] {
  return {
    province: "Pampanga",
    city,
    ...extras,
    publicPrecision: "approximate",
    disclosure: "general-area",
  };
}

function fixture(
  n: number,
  fields: Omit<
    PublicPropertySummary,
    | "id"
    | "propertyId"
    | "slug"
    | "purpose"
    | "featured"
    | "shortDescription"
    | "publishedAt"
  >,
): PublicPropertySummary {
  const id = `fixture-featured-0${n}`;
  return {
    id,
    propertyId: `RCPP-FIXTURE-00${n}`,
    slug: id,
    purpose: "sale",
    featured: true,
    shortDescription: "Development design fixture; not a real listing.",
    publishedAt: `2026-10-0${n}T08:00:00.000Z`,
    ...fields,
  };
}

const THREE: readonly PublicPropertySummary[] = [
  // Full specifications with a floor area.
  fixture(1, {
    title: "Fixture Garden Residence",
    propertyType: "house-and-lot",
    availability: "available",
    price: { amount: 12_500_000, currency: "PHP", negotiable: true },
    location: location("Angeles City", {
      barangay: "Balibago",
      development: "Fixture Gardens",
    }),
    specifications: {
      bedrooms: 4,
      bathrooms: 3,
      floorAreaSqm: 220,
      lotAreaSqm: 280,
    },
    coverMedia: DEVELOPMENT_SAMPLE_MEDIA[0],
  }),
  // Reserved: exercises the RESERVED chip.
  fixture(2, {
    title: "Fixture Courtyard Townhouse",
    propertyType: "townhouse",
    availability: "reserved",
    price: { amount: 8_900_000, currency: "PHP", negotiable: false },
    location: location("Mabalacat City", { barangay: "Dau" }),
    specifications: { bedrooms: 3, bathrooms: 2, floorAreaSqm: 140 },
    coverMedia: DEVELOPMENT_SAMPLE_MEDIA[1],
  }),
  // No cover image (placeholder), lot-area fallback, and a very long title and location
  // (line clamping) with no bedroom/bathroom specifications.
  fixture(3, {
    title:
      "Fixture Contemporary Family Residence with Landscaped Garden Courtyard and Covered Lanai",
    propertyType: "lot",
    availability: "available",
    price: { amount: 21_000_000, currency: "PHP", negotiable: false },
    location: location("City of San Fernando", {
      barangay: "Barangay Santo Domingo Extension",
      development: "Fixture Premier Estates Phase 3 Executive Village",
    }),
    specifications: { lotAreaSqm: 450 },
  }),
];

export const FEATURED_FIXTURE_PROPERTIES: Record<
  Exclude<FeaturedFixtureScenario, "unavailable">,
  readonly PublicPropertySummary[]
> = {
  empty: [],
  one: THREE.slice(0, 1),
  two: THREE.slice(0, 2),
  three: THREE,
};
