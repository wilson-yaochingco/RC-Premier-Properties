/** Development-only design data, imported exclusively behind the loader's environment guard. */
import { FEATURED_FIXTURE_PROPERTIES } from "../home/featured-properties.fixtures";
import type { LocationsInventory } from "./featured-locations";
import type { LocationsFixtureScenario } from "./locations-inventory";

export function fixtureLocationsInventory(
  scenario: LocationsFixtureScenario,
): LocationsInventory {
  if (scenario === "unavailable") return { collection: { status: "unavailable" } };
  const base = FEATURED_FIXTURE_PROPERTIES.three.map((property, index) => ({
    ...property,
    title: property.title.replace(/^Fixture /, ""),
    location: {
      ...property.location,
      city: ["Angeles City", "Mabalacat City", "Magalang"][index]!,
      development: undefined,
    },
  }));
  // Extra listings exist only to prove the collection caps at three.
  const extra = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      ...base[index % base.length]!,
      id: `fixture-extra-${index}`,
      slug: `fixture-extra-${index}`,
    }));
  const items =
    scenario === "0"
      ? []
      : scenario === "1"
        ? [base[2]!]
        : scenario === "2"
          ? [base[0]!, base[2]!]
          : scenario === "4"
            ? [...base, ...extra(1)]
            : [...base, ...extra(5)];
  return {
    collection: {
      status: "ready",
      items,
      total: scenario === "many" ? 28 : items.length,
    },
  };
}
