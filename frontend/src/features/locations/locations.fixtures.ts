/**
 * DEVELOPMENT ONLY. Deterministic design fixtures for `/locations`, loaded exclusively
 * through the guarded dynamic import in `locations-inventory.ts`, so they never reach a
 * production build. Counts and search options are invented; properties reuse the homepage
 * Featured fixtures (one of which deliberately has no photograph, to exercise the no-image
 * composition). Each scenario sets both the curated location counts and how many
 * properties the "Homes worth exploring" showcase receives.
 */
import type { PublicPropertySummary } from "@rc/shared";
import { FEATURED_FIXTURE_PROPERTIES } from "../home/featured-properties.fixtures";
import {
  FEATURED_LOCATIONS,
  type CollectionState,
  type LocationsInventory,
} from "./featured-locations";
import type { LocationsFixtureScenario } from "./locations-inventory";

type Counts = Record<string, number>;
type ReadyScenario = Exclude<LocationsFixtureScenario, "unavailable">;

const COUNTS: Record<ReadyScenario, Counts> = {
  "0": {},
  "1": { "angeles-city": 3 },
  "2": { "angeles-city": 3, "mabalacat-city": 2 },
  "4": { "angeles-city": 3, "mabalacat-city": 2, magalang: 1, porac: 2 },
  // The same four curated locations with larger counts (28 properties in total).
  many: { "angeles-city": 12, "mabalacat-city": 8, magalang: 5, porac: 3 },
};

/**
 * Indexes into the three base fixtures: [0] has a photograph, [1] is reserved with a
 * photograph, [2] has no photograph and a very long title. The single-property scenario
 * uses the no-photograph one so the typography-led lead is reviewable.
 */
const SHOWCASE: Record<ReadyScenario, number[]> = {
  "0": [],
  "1": [2],
  "2": [0, 2],
  "4": [0, 1, 2],
  many: [0, 1, 2, 0],
};

function showcaseItems(scenario: ReadyScenario): PublicPropertySummary[] {
  const base = FEATURED_FIXTURE_PROPERTIES.three;
  return SHOWCASE[scenario].map((sourceIndex, position) => {
    const source = base[sourceIndex]!;
    const id = `fixture-locations-${scenario}-${position + 1}`;
    return {
      ...source,
      id,
      slug: id,
      propertyId: `RCPP-FIXTURE-L${position + 1}`,
    };
  });
}

export function fixtureLocationsInventory(
  scenario: LocationsFixtureScenario,
): LocationsInventory {
  if (scenario === "unavailable") {
    return { status: "unavailable", collection: { status: "unavailable" } };
  }
  const source = COUNTS[scenario];
  const counts: Counts = {};
  for (const { slug } of FEATURED_LOCATIONS) counts[slug] = source[slug] ?? 0;
  const items = showcaseItems(scenario);
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const collection: CollectionState = {
    status: "ready",
    items,
    total: Math.max(total, items.length),
  };
  return {
    status: "ready",
    counts,
    filters: {
      locations: ["Angeles City", "City of San Fernando", "Mabalacat City"],
      propertyTypes: ["house-and-lot", "townhouse", "lot"],
      priceRange: { min: 1_000_000, max: 25_000_000 },
    },
    collection,
  };
}
