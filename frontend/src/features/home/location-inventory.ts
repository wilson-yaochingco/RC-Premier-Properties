import { getPropertyFacets } from "../properties/property.service";
import { buildExploreLocations, type ExploreLocation } from "./explore-pampanga";

export const LOCATION_FIXTURE_SCENARIOS = [
  "empty",
  "unavailable",
  "one",
  "two",
  "four",
] as const;

export type LocationFixtureScenario = (typeof LOCATION_FIXTURE_SCENARIOS)[number];

/** `empty` (a successful response with no active areas) is distinct from `unavailable`. */
export type LocationInventory =
  | { status: "ready"; locations: ExploreLocation[] }
  | { status: "empty" }
  | { status: "unavailable" };

export function parseLocationFixtureScenario(
  value: string | string[] | undefined,
): LocationFixtureScenario | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return LOCATION_FIXTURE_SCENARIOS.find((scenario) => scenario === candidate);
}

function toInventory(
  counts: Parameters<typeof buildExploreLocations>[0],
): LocationInventory {
  const locations = buildExploreLocations(counts);
  return locations.length ? { status: "ready", locations } : { status: "empty" };
}

/**
 * The data boundary for the homepage map. Counts cover available and reserved homes only
 * (`activeLocationCounts`); a response without that field is treated as unavailable rather
 * than guessed from the all-inclusive counts. Fixtures are reachable only under `next dev`
 * and a failed real request never falls back to them. The literal `NODE_ENV` check is
 * deliberate: Next only folds that exact expression, so production drops the fixtures chunk.
 */
export async function loadLocationInventory(
  scenario?: LocationFixtureScenario,
): Promise<LocationInventory> {
  if (scenario && process.env.NODE_ENV === "development") {
    if (scenario === "unavailable") return { status: "unavailable" };
    const { LOCATION_FIXTURE_COUNTS } = await import("./location-inventory.fixtures");
    return toInventory(LOCATION_FIXTURE_COUNTS[scenario]);
  }

  try {
    const { activeLocationCounts } = await getPropertyFacets();
    return activeLocationCounts
      ? toInventory(activeLocationCounts)
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}
