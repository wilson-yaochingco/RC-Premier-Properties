import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LOCATION_EDITORIAL_CONTENT } from "../src/features/locations/location-content";
import { publicLocationSlug } from "../src/lib/public-location";

describe("location editorial content", () => {
  it("covers every supported locality with a local, attributed reusable image", () => {
    expect(LOCATION_EDITORIAL_CONTENT).toHaveLength(22);
    expect(new Set(LOCATION_EDITORIAL_CONTENT.map((entry) => entry.slug)).size).toBe(
      22,
    );
    const boundaryPath = path.join(
      process.cwd(),
      "frontend/public/geo/pampanga-admin3.geojson",
    );
    const boundaryData = JSON.parse(fs.readFileSync(boundaryPath, "utf8")) as {
      features: Array<{ properties: { filterValue: string } }>;
    };
    expect(LOCATION_EDITORIAL_CONTENT.map((entry) => entry.slug).sort()).toEqual(
      boundaryData.features
        .map((feature) => publicLocationSlug(feature.properties.filterValue))
        .sort(),
    );

    for (const entry of LOCATION_EDITORIAL_CONTENT) {
      expect(entry.landmark.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
      expect(entry.landmark.license).toMatch(/^(CC0|CC BY-SA|Public domain)/);
      expect(entry.landmark.imagePath).toMatch(/^\/images\/locations\/.+\.jpg$/);
      const asset = path.join(
        process.cwd(),
        "frontend/public",
        entry.landmark.imagePath,
      );
      expect(fs.statSync(asset).size).toBeGreaterThan(100_000);
    }
  });
});
