import { PUBLIC_PROPERTY_AREAS } from "@rc/shared";
import { describe, expect, it } from "vitest";
import {
  PAMPANGA_MAP_AREAS,
  PAMPANGA_MAP_HEIGHT,
  PAMPANGA_MAP_WIDTH,
} from "../src/features/locations/pampanga-map-data";
import { publicLocationSlug } from "../src/lib/public-location";

describe("generated Pampanga map data", () => {
  it("has exactly one area per canonical public area, with unique slugs", () => {
    expect(PAMPANGA_MAP_AREAS).toHaveLength(22);
    expect(new Set(PAMPANGA_MAP_AREAS.map((a) => a.slug)).size).toBe(22);
    expect(PAMPANGA_MAP_AREAS.map((a) => a.slug).sort()).toEqual(
      PUBLIC_PROPERTY_AREAS.map(publicLocationSlug).sort(),
    );
  });

  it("gives every area a distinct path and an anchor inside the viewBox", () => {
    for (const area of PAMPANGA_MAP_AREAS) {
      expect(area.d).toMatch(/^M[\d. LZ-]+$/);
      expect(area.slug).toBe(publicLocationSlug(area.name));
      const [x, y] = area.anchor;
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(PAMPANGA_MAP_WIDTH);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(PAMPANGA_MAP_HEIGHT);
    }
    expect(new Set(PAMPANGA_MAP_AREAS.map((a) => a.d)).size).toBe(22);
  });

  it.each([
    ["Angeles City, Pampanga", "angeles-city"],
    ["Mabalacat City, Pampanga", "mabalacat-city"],
    ["City of San Fernando, Pampanga", "city-of-san-fernando"],
    ["Porac, Pampanga", "porac"],
  ])("maps %s to exactly one geometry", (label, slug) => {
    const matches = PAMPANGA_MAP_AREAS.filter(
      (a) => a.slug === publicLocationSlug(label),
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]?.slug).toBe(slug);
  });
});
