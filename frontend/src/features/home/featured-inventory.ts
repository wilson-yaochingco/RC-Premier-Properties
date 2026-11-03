import type { PublicPropertySummary } from "@rc/shared";
import { getFeaturedProperties } from "../properties/property.service";

export const FEATURED_FIXTURE_SCENARIOS = [
  "empty",
  "unavailable",
  "one",
  "two",
  "three",
] as const;

export type FeaturedFixtureScenario = (typeof FEATURED_FIXTURE_SCENARIOS)[number];

/** `empty` (a legitimate zero-listing response) is deliberately distinct from `unavailable`. */
export type FeaturedInventory =
  | { status: "ready"; items: PublicPropertySummary[] }
  | { status: "empty" }
  | { status: "unavailable" };

export function parseFeaturedFixtureScenario(
  value: string | string[] | undefined,
): FeaturedFixtureScenario | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return FEATURED_FIXTURE_SCENARIOS.find((scenario) => scenario === candidate);
}

/**
 * The single data boundary for the homepage Featured section.
 *
 * Design fixtures are reachable only under `next dev`; a failed real request never falls
 * back to them. The guard below is the one deliberate direct `NODE_ENV` read outside
 * `lib/env.ts`: Next only inlines the literal expression, which is what lets the
 * production build drop the fixtures chunk entirely (an imported constant does not).
 */
export async function loadFeaturedInventory(
  scenario?: FeaturedFixtureScenario,
): Promise<FeaturedInventory> {
  if (scenario && process.env.NODE_ENV === "development") {
    if (scenario === "unavailable") return { status: "unavailable" };
    const { FEATURED_FIXTURE_PROPERTIES } =
      await import("./featured-properties.fixtures");
    const items = FEATURED_FIXTURE_PROPERTIES[scenario];
    return items.length ? { status: "ready", items: [...items] } : { status: "empty" };
  }

  try {
    const { items } = await getFeaturedProperties();
    return items.length ? { status: "ready", items } : { status: "empty" };
  } catch {
    return { status: "unavailable" };
  }
}
