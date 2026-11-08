/** DEVELOPMENT ONLY. Design fixtures for the homepage map; never real counts. */
import type { LocationCount } from "./explore-pampanga";

export const LOCATION_FIXTURE_COUNTS = {
  empty: [],
  one: [{ location: "Angeles City, Pampanga", count: 3 }],
  two: [
    { location: "Angeles City, Pampanga", count: 3 },
    { location: "Mabalacat City, Pampanga", count: 2 },
  ],
  four: [
    { location: "Angeles City, Pampanga", count: 3 },
    { location: "Mabalacat City, Pampanga", count: 2 },
    { location: "City of San Fernando, Pampanga", count: 2 },
    { location: "Porac, Pampanga", count: 1 },
  ],
} satisfies Record<string, LocationCount[]>;
