/**
 * DEVELOPMENT ONLY. Deterministic design fixtures for `/locations`, loaded exclusively
 * through the guarded dynamic import in `locations-inventory.ts`, so they never reach a
 * production build. Counts are invented; homes reuse the homepage Featured fixtures
 * relabelled with the curated city so cards look right in each area.
 */
import type { PublicPropertySummary } from "@rc/shared";
import { FEATURED_FIXTURE_PROPERTIES } from "../home/featured-properties.fixtures";
import {
  FEATURED_LOCATIONS,
  LOCATION_HOMES_LIMIT,
  type LocationsInventory,
} from "./featured-locations";
import type { LocationsFixtureScenario } from "./locations-inventory";

type Counts = Record<string, number>;

const COUNTS: Record<Exclude<LocationsFixtureScenario, "unavailable">, Counts> = {
  "0": {},
  "1": { "angeles-city": 3 },
  "2": { "angeles-city": 3, "mabalacat-city": 2 },
  "4": { "angeles-city": 3, "mabalacat-city": 2, magalang: 1, porac: 2 },
  // The same four curated locations with larger counts (28 properties in total).
  many: { "angeles-city": 12, "mabalacat-city": 8, magalang: 5, porac: 3 },
};

function homesFor(slug: string, name: string, count: number): PublicPropertySummary[] {
  const base = FEATURED_FIXTURE_PROPERTIES.three;
  return Array.from({ length: Math.min(count, LOCATION_HOMES_LIMIT) }, (_, index) => {
    const source = base[index % base.length]!;
    const id = `fixture-locations-${slug}-${index + 1}`;
    return {
      ...source,
      id,
      slug: id,
      propertyId: `RCPP-FIXTURE-${slug.toUpperCase()}-${index + 1}`,
      location: { ...source.location, city: name },
    };
  });
}

export function fixtureLocationsInventory(
  scenario: Exclude<LocationsFixtureScenario, "unavailable">,
): LocationsInventory {
  const source = COUNTS[scenario];
  const counts: Counts = {};
  const homes: Record<string, PublicPropertySummary[]> = {};
  for (const { slug, name } of FEATURED_LOCATIONS) {
    counts[slug] = source[slug] ?? 0;
    homes[slug] = homesFor(slug, name, counts[slug]);
  }
  return { status: "ready", counts, homes };
}
