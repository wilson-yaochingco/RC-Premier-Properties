import { describe, expect, it } from "vitest";
import {
  findPublicLocationBySlug,
  publicLocationPath,
  publicLocationSlug,
  shortPublicLocation,
} from "../src/lib/public-location";

describe("public location routes", () => {
  const locations = [
    { location: "Angeles City, Pampanga", count: 3 },
    { location: "City of San Fernando, Pampanga", count: 2 },
  ];

  it("builds stable Pampanga location slugs without exposing query state", () => {
    expect(shortPublicLocation("Angeles City, Pampanga")).toBe("Angeles City");
    expect(publicLocationSlug("City of San Fernando, Pampanga")).toBe(
      "city-of-san-fernando",
    );
    expect(publicLocationPath("Angeles City, Pampanga")).toBe(
      "/locations/angeles-city",
    );
  });

  it("resolves only a valid slug backed by bounded facet data", () => {
    expect(findPublicLocationBySlug("angeles-city", locations)).toEqual(locations[0]);
    expect(findPublicLocationBySlug("../private", locations)).toBeUndefined();
    expect(findPublicLocationBySlug("missing-city", locations)).toBeUndefined();
  });
});
