import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface BoundaryFeature {
  type: "Feature";
  properties: {
    name: string;
    filterValue: string;
    psgcCode: string;
    scope: "pampanga" | "angeles";
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: unknown[];
  };
}

interface BoundaryCollection {
  type: "FeatureCollection";
  metadata: {
    license: string;
    sourceRevision: string;
    psgcSourceUrl: string;
    psgcCrosswalkAsOf: string;
  };
  features: BoundaryFeature[];
}

const boundaryPath = resolve(
  process.cwd(),
  "frontend/public/geo/pampanga-admin3.geojson",
);

function numericCoordinates(value: unknown, result: number[][] = []): number[][] {
  if (!Array.isArray(value)) return result;
  if (
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    result.push([value[0], value[1]]);
    return result;
  }
  for (const nested of value) numericCoordinates(nested, result);
  return result;
}

describe("Pampanga discovery boundaries", () => {
  it("ships a small, attributed, reviewed 22-area extract", async () => {
    const [contents, file] = await Promise.all([
      readFile(boundaryPath, "utf8"),
      stat(boundaryPath),
    ]);
    const collection = JSON.parse(contents) as BoundaryCollection;

    expect(collection.type).toBe("FeatureCollection");
    expect(collection.metadata.license).toBe("CC BY 3.0 IGO");
    expect(collection.metadata.sourceRevision).toBe("wmgeolab/geoBoundaries@9469f09");
    expect(collection.metadata.psgcSourceUrl).toBe(
      "https://psa.gov.ph/classification/psgc/citimuni/0305400000",
    );
    expect(collection.metadata.psgcCrosswalkAsOf).toBe("2026-06-30");
    expect(collection.features).toHaveLength(22);
    expect(file.size).toBeLessThan(100_000);

    const names = collection.features.map((feature) => feature.properties.name);
    const codes = collection.features.map((feature) => feature.properties.psgcCode);
    expect(new Set(names).size).toBe(22);
    expect(new Set(codes).size).toBe(22);
    expect(names).toContain("Angeles City");
    expect(names).toContain("City of San Fernando");
    expect(
      collection.features.find(({ properties }) => properties.name === "Angeles City")
        ?.properties.psgcCode,
    ).toBe("0330100000");
    expect(
      collection.features.find(({ properties }) => properties.name === "Apalit")
        ?.properties.psgcCode,
    ).toBe("0305402000");
    expect(
      collection.features.find(({ properties }) => properties.name === "Arayat")
        ?.properties.psgcCode,
    ).toBe("0305403000");
    expect(
      collection.features.find(({ properties }) => properties.name === "Bacolor")
        ?.properties.psgcCode,
    ).toBe("0305404000");
    expect(
      collection.features.filter(({ properties }) => properties.scope === "angeles"),
    ).toHaveLength(1);
  });

  it("contains only valid polygon coordinates in the reviewed discovery envelope", async () => {
    const collection = JSON.parse(
      await readFile(boundaryPath, "utf8"),
    ) as BoundaryCollection;

    for (const feature of collection.features) {
      expect(["Polygon", "MultiPolygon"]).toContain(feature.geometry.type);
      const coordinates = numericCoordinates(feature.geometry.coordinates);
      expect(coordinates.length).toBeGreaterThan(3);
      for (const [longitude, latitude] of coordinates) {
        expect(longitude).toBeGreaterThanOrEqual(120.1);
        expect(longitude).toBeLessThanOrEqual(121.1);
        expect(latitude).toBeGreaterThanOrEqual(14.6);
        expect(latitude).toBeLessThanOrEqual(15.7);
      }
    }
  });
});
