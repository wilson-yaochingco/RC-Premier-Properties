import { getProperties } from "../properties/property.service";
import { publicLocationSlug } from "../../lib/public-location";
import { COLLECTION_LIMIT } from "./location-collection";
import { FEATURED_LOCATIONS, type LocationsInventory } from "./featured-locations";

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

export async function loadLocationsInventory(
  scenario?: LocationsFixtureScenario,
): Promise<LocationsInventory> {
  // The literal check lets Next exclude design fixtures from production builds.
  if (scenario && process.env.NODE_ENV === "development") {
    const { fixtureLocationsInventory } = await import("./locations.fixtures");
    return fixtureLocationsInventory(scenario);
  }
  try {
    // The API accepts one location per request. Three newest from each is sufficient
    // to choose the newest three across all four, without scanning the full catalog.
    const pages = await Promise.all(
      FEATURED_LOCATIONS.map(({ name }) =>
        getProperties(
          { location: `${name}, Pampanga`, sort: "newest" },
          undefined,
          COLLECTION_LIMIT,
        ),
      ),
    );
    const items = pages
      .flatMap(({ items }) => items)
      .filter(({ location }) =>
        FEATURED_LOCATIONS.some(
          ({ slug }) => slug === publicLocationSlug(location.city),
        ),
      )
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    return {
      collection: {
        status: "ready",
        items,
        total: pages.reduce((sum, page) => sum + page.pagination.total, 0),
      },
    };
  } catch {
    // An incomplete set of responses cannot establish empty inventory.
    return { collection: { status: "unavailable" } };
  }
}
