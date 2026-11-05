import { getProperties, getPropertyFacets } from "../properties/property.service";
import { publicLocationSlug } from "../../lib/public-location";
import { COLLECTION_LIMIT } from "./location-collection";
import { searchFiltersFromFacets } from "./location-search";
import {
  FEATURED_LOCATIONS,
  type CollectionState,
  type LocationsInventory,
} from "./featured-locations";

export const LOCATIONS_FIXTURE_SCENARIOS = [
  "0",
  "1",
  "2",
  "4",
  "many",
  "unavailable",
] as const;

export type LocationsFixtureScenario = (typeof LOCATIONS_FIXTURE_SCENARIOS)[number];

export function parseLocationsFixtureScenario(
  value: string | string[] | undefined,
): LocationsFixtureScenario | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return LOCATIONS_FIXTURE_SCENARIOS.find((scenario) => scenario === candidate);
}

async function loadCollection(): Promise<CollectionState> {
  try {
    const { items, pagination } = await getProperties(
      { sort: "newest" },
      undefined,
      COLLECTION_LIMIT,
    );
    return { status: "ready", items, total: pagination.total };
  } catch {
    return { status: "unavailable" };
  }
}

/**
 * The single data boundary for `/locations`. Counts come from the public facets (every
 * published property, the same figure each location page shows) and the showcase from the
 * public property search (newest published properties). The two requests are independent:
 * a failed facets request makes counts unavailable but the showcase can still load, and the
 * reverse, so an outage is never presented as an empty area.
 *
 * Fixtures are reachable only under `next dev` and a failed real request never falls back
 * to them. The literal `NODE_ENV` check is deliberate: Next only folds that exact
 * expression, so production builds drop the fixtures chunk.
 */
export async function loadLocationsInventory(
  scenario?: LocationsFixtureScenario,
): Promise<LocationsInventory> {
  if (scenario && process.env.NODE_ENV === "development") {
    const { fixtureLocationsInventory } = await import("./locations.fixtures");
    return fixtureLocationsInventory(scenario);
  }

  const [facets, collection] = await Promise.all([
    getPropertyFacets().then(
      (value) => value,
      () => undefined,
    ),
    loadCollection(),
  ]);
  // A response without counts is unavailable, never an empty area.
  if (!facets?.locationCounts) return { status: "unavailable", collection };

  const counts: Record<string, number> = {};
  for (const { slug } of FEATURED_LOCATIONS) counts[slug] = 0;
  for (const { location, count } of facets.locationCounts) {
    const slug = publicLocationSlug(location);
    if (slug in counts) counts[slug] = (counts[slug] ?? 0) + count;
  }

  return {
    status: "ready",
    counts,
    filters: searchFiltersFromFacets(facets),
    collection,
  };
}
