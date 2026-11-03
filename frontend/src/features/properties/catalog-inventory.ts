import type { PropertyFacetsResponse, PropertySearchResponse } from "@rc/shared";
import { getProperties } from "./property.service";
import type { RawSearchParams } from "./property-query";

export const CATALOG_FIXTURE_SCENARIOS = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "unavailable",
] as const;

export type CatalogFixtureScenario = (typeof CATALOG_FIXTURE_SCENARIOS)[number];

/**
 * `ready` with zero items (no match) is deliberately distinct from `unavailable`. A `fixture`
 * source (development only) carries its own `facets`, so the filters always describe the
 * same dataset as the results; a `live` source leaves facets to `/properties/facets`.
 */
export type CatalogInventory =
  | { source: "live"; status: "ready"; response: PropertySearchResponse }
  | { source: "live"; status: "unavailable" }
  | {
      source: "fixture";
      status: "ready";
      response: PropertySearchResponse;
      facets: PropertyFacetsResponse;
    }
  | { source: "fixture"; status: "unavailable" };

export function parseCatalogFixtureScenario(
  value: string | string[] | undefined,
): CatalogFixtureScenario | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return CATALOG_FIXTURE_SCENARIOS.find((scenario) => scenario === candidate);
}

/** The requested fixture, only under `next dev`; always undefined in production. */
export function activeCatalogFixture(
  value: string | string[] | undefined,
): CatalogFixtureScenario | undefined {
  return process.env.NODE_ENV === "development"
    ? parseCatalogFixtureScenario(value)
    : undefined;
}

/** Keep the fixture selected across the page's own navigation links (development only). */
export function withCatalogFixture(
  href: string,
  scenario: CatalogFixtureScenario | undefined,
): string {
  if (!scenario) return href;
  const url = new URL(href, "http://local");
  url.searchParams.set("catalogFixture", scenario);
  return `${url.pathname}${url.search}`;
}

/**
 * The single data boundary for the `/properties` catalog. Fixtures are reachable only under
 * `next dev` (the literal `NODE_ENV` check is what lets production builds drop the fixtures
 * chunk), and a failed real request never falls back to them.
 */
export async function loadCatalogInventory(
  searchParams: RawSearchParams,
  scenario?: CatalogFixtureScenario,
): Promise<CatalogInventory> {
  if (scenario && process.env.NODE_ENV === "development") {
    if (scenario === "unavailable") return { source: "fixture", status: "unavailable" };
    const { catalogFixtureResult } = await import("./catalog.fixtures");
    return {
      source: "fixture",
      status: "ready",
      ...catalogFixtureResult(Number(scenario), searchParams),
    };
  }

  try {
    return {
      source: "live",
      status: "ready",
      response: await getProperties(searchParams),
    };
  } catch {
    return { source: "live", status: "unavailable" };
  }
}
