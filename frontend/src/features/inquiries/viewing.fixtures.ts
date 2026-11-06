/**
 * DEVELOPMENT ONLY. Design fixtures for `/book-viewing`, loaded exclusively through the
 * guarded dynamic import in `viewing-property.ts`, so they never reach a production build.
 * Listings reuse the `/properties` catalog fixtures so both pages preview the same homes.
 *
 * Fixture Property IDs are not real listings: submitting a request from a fixture state is
 * rejected by the backend, which also previews the "no longer accepting" state.
 */
import { catalogFixtureResult } from "../properties/catalog.fixtures";
import type { ViewingPropertyOptions, ViewingPropertyState } from "./ViewingScheduler";
import { toViewingProperty } from "./viewing-property";

export const VIEWING_LISTING_FIXTURES = [
  "0",
  "1",
  "2",
  "4",
  "6",
  "unavailable",
] as const;
export type ViewingListingFixture = (typeof VIEWING_LISTING_FIXTURES)[number];

export const VIEWING_PROPERTY_FIXTURES = [
  "available",
  "reserved",
  "sold",
  "not-found",
  "lookup-failed",
] as const;
export type ViewingPropertyFixture = (typeof VIEWING_PROPERTY_FIXTURES)[number];

function fixtureItems(count: number) {
  return catalogFixtureResult(count, {}).response.items;
}

/** Listings offered by the picker; sold fixtures are excluded exactly like live data. */
export function fixtureViewingOptions(
  scenario: ViewingListingFixture,
): ViewingPropertyOptions {
  if (scenario === "unavailable") return { status: "unavailable" };
  return {
    status: "ready",
    items: fixtureItems(Number(scenario))
      .filter((item) => item.availability !== "sold")
      .map(toViewingProperty),
  };
}

/** A `?propertyId=` outcome, as the server would resolve it. */
export function fixtureViewingProperty(
  scenario: ViewingPropertyFixture,
): ViewingPropertyState {
  if (scenario === "not-found") {
    return { status: "not-found", propertyId: "RCPP-FIXTURE-404" };
  }
  if (scenario === "lookup-failed") {
    return { status: "unavailable", propertyId: "RCPP-FIXTURE-1" };
  }
  const items = fixtureItems(3);
  const source =
    scenario === "reserved"
      ? (items.find((item) => item.availability === "reserved") ?? items[0]!)
      : items.find((item) => item.availability === "available")!;
  const property = toViewingProperty(source);
  return {
    status: "resolved",
    property: scenario === "sold" ? { ...property, availability: "sold" } : property,
  };
}
