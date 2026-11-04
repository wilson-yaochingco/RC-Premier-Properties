import type { PublicPropertySummary } from "@rc/shared";
import { getProperties, getPropertyFacets } from "../properties/property.service";
import { publicLocationSlug } from "../../lib/public-location";
import {
  FEATURED_LOCATIONS,
  LOCATION_HOMES_LIMIT,
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

/**
 * The single data boundary for `/locations`. Counts come from the public facets (every
 * published property, the same figure each location page shows); homes come from the
 * public property search. A failed facets request makes the whole inventory unavailable,
 * and a failed request for one area makes only that area unavailable, so an outage is
 * never presented as an empty area.
 *
 * Fixtures are reachable only under `next dev` and a failed real request never falls back
 * to them. The literal `NODE_ENV` check is deliberate: Next only folds that exact
 * expression, so production builds drop the fixtures chunk.
 */
export async function loadLocationsInventory(
  scenario?: LocationsFixtureScenario,
): Promise<LocationsInventory> {
  if (scenario && process.env.NODE_ENV === "development") {
    if (scenario === "unavailable") return { status: "unavailable" };
    const { fixtureLocationsInventory } = await import("./locations.fixtures");
    return fixtureLocationsInventory(scenario);
  }

  let locationCounts: Array<{ location: string; count: number }> | undefined;
  try {
    ({ locationCounts } = await getPropertyFacets());
  } catch {
    return { status: "unavailable" };
  }
  // A response without counts is unavailable, never an empty area.
  if (!locationCounts) return { status: "unavailable" };

  const counts: Record<string, number> = {};
  for (const { slug } of FEATURED_LOCATIONS) counts[slug] = 0;
  for (const { location, count } of locationCounts) {
    const slug = publicLocationSlug(location);
    if (slug in counts) counts[slug] = (counts[slug] ?? 0) + count;
  }

  const entries = await Promise.all(
    FEATURED_LOCATIONS.map(
      async ({
        slug,
        name,
      }): Promise<[string, readonly PublicPropertySummary[] | "unavailable"]> => {
        if ((counts[slug] ?? 0) < 1) return [slug, []];
        try {
          const { items } = await getProperties(
            { sort: "newest", location: name },
            undefined,
            LOCATION_HOMES_LIMIT,
          );
          return [slug, items];
        } catch {
          return [slug, "unavailable"];
        }
      },
    ),
  );

  return { status: "ready", counts, homes: Object.fromEntries(entries) };
}
