import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LOCATION_EDITORIAL_CONTENT } from "../src/features/locations/location-content";
import { publicLocationSlug } from "../src/lib/public-location";

function jpegDimensions(buffer: Buffer): { width: number; height: number } {
  for (let offset = 2; offset + 8 < buffer.length;) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1] ?? 0;
    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + segmentLength;
  }
  throw new Error("JPEG dimensions could not be read.");
}

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
    expect(
      new Set(LOCATION_EDITORIAL_CONTENT.map((entry) => entry.scenery.sourceUrl)).size,
    ).toBe(22);
    expect(
      new Set(LOCATION_EDITORIAL_CONTENT.map((entry) => entry.scenery.imagePath)).size,
    ).toBe(22);
    const assetHashes = new Set<string>();

    for (const entry of LOCATION_EDITORIAL_CONTENT) {
      expect(entry.scenery.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
      expect(entry.scenery.license).toMatch(
        /^(?:CC0 1\.0|CC BY 3\.0|CC BY-SA 4\.0|Public domain)$/,
      );
      expect(entry.scenery.licenseUrl).toMatch(/^https:\/\/creativecommons\.org\//);
      expect(entry.scenery.creator.trim()).not.toBe("");
      expect(
        [entry.scenery.title, entry.scenery.caption, entry.scenery.alt].join(" "),
      ).not.toMatch(/church|chapel|parish|capitol/i);
      expect(entry.scenery.imagePath).toMatch(/^\/images\/locations\/.+\.jpg$/);
      const asset = path.join(
        process.cwd(),
        "frontend/public",
        entry.scenery.imagePath,
      );
      const image = fs.readFileSync(asset);
      const dimensions = jpegDimensions(image);
      expect(image.byteLength).toBeGreaterThan(100_000);
      expect(dimensions.width).toBeGreaterThanOrEqual(1600);
      expect(dimensions.height).toBeGreaterThanOrEqual(900);
      assetHashes.add(createHash("sha256").update(image).digest("hex"));
    }
    expect(assetHashes.size).toBe(22);
  });
});
