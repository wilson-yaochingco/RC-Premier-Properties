import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_URL =
  "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/PHL/ADM3/geoBoundaries-PHL-ADM3_simplified.geojson";
const PSGC_SOURCE_URL = "https://psa.gov.ph/classification/psgc/citimuni/0305400000";

const locations = [
  { name: "Angeles City", psgcCode: "0330100000", scope: "angeles" },
  { name: "Apalit", psgcCode: "0305402000", scope: "pampanga" },
  { name: "Arayat", psgcCode: "0305403000", scope: "pampanga" },
  { name: "Bacolor", psgcCode: "0305404000", scope: "pampanga" },
  { name: "Candaba", psgcCode: "0305405000", scope: "pampanga" },
  { name: "Floridablanca", psgcCode: "0305406000", scope: "pampanga" },
  { name: "Guagua", psgcCode: "0305407000", scope: "pampanga" },
  { name: "Lubao", psgcCode: "0305408000", scope: "pampanga" },
  { name: "Mabalacat City", psgcCode: "0305409000", scope: "pampanga" },
  { name: "Macabebe", psgcCode: "0305410000", scope: "pampanga" },
  { name: "Magalang", psgcCode: "0305411000", scope: "pampanga" },
  { name: "Masantol", psgcCode: "0305412000", scope: "pampanga" },
  { name: "Mexico", psgcCode: "0305413000", scope: "pampanga" },
  { name: "Minalin", psgcCode: "0305414000", scope: "pampanga" },
  { name: "Porac", psgcCode: "0305415000", scope: "pampanga" },
  {
    name: "City of San Fernando",
    psgcCode: "0305416000",
    scope: "pampanga",
  },
  { name: "San Luis", psgcCode: "0305417000", scope: "pampanga" },
  { name: "San Simon", psgcCode: "0305418000", scope: "pampanga" },
  { name: "Santa Ana", psgcCode: "0305419000", scope: "pampanga" },
  { name: "Santa Rita", psgcCode: "0305420000", scope: "pampanga" },
  { name: "Santo Tomas", psgcCode: "0305421000", scope: "pampanga" },
  { name: "Sasmuan", psgcCode: "0305422000", scope: "pampanga" },
];

// This envelope identifies Pampanga and adjacent Angeles among duplicate Philippine
// place names. It selects source features; it never replaces or modifies their shapes.
const discoveryEnvelope = {
  west: 120.2,
  south: 14.7,
  east: 121,
  north: 15.6,
};

function coordinatePairs(value, pairs = []) {
  if (!Array.isArray(value)) return pairs;
  if (
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    pairs.push(value);
    return pairs;
  }
  for (const nested of value) coordinatePairs(nested, pairs);
  return pairs;
}

function centerOf(feature) {
  const pairs = coordinatePairs(feature.geometry?.coordinates);
  if (pairs.length === 0) throw new Error("A candidate feature has no coordinates.");

  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [longitude, latitude] of pairs) {
    west = Math.min(west, longitude);
    south = Math.min(south, latitude);
    east = Math.max(east, longitude);
    north = Math.max(north, latitude);
  }

  return { longitude: (west + east) / 2, latitude: (south + north) / 2 };
}

function isInDiscoveryEnvelope(feature) {
  const center = centerOf(feature);
  return (
    center.longitude >= discoveryEnvelope.west &&
    center.longitude <= discoveryEnvelope.east &&
    center.latitude >= discoveryEnvelope.south &&
    center.latitude <= discoveryEnvelope.north
  );
}

async function build() {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Boundary download failed with HTTP ${response.status}.`);
  }

  const source = await response.json();
  if (source?.type !== "FeatureCollection" || !Array.isArray(source.features)) {
    throw new Error("The boundary source is not a GeoJSON FeatureCollection.");
  }

  const features = locations.map((location) => {
    const matches = source.features.filter(
      (feature) =>
        feature?.properties?.shapeName === location.name &&
        isInDiscoveryEnvelope(feature),
    );

    if (matches.length !== 1) {
      throw new Error(
        `Expected one Pampanga-area boundary for ${location.name}; found ${matches.length}.`,
      );
    }

    const [match] = matches;
    if (!["Polygon", "MultiPolygon"].includes(match.geometry?.type)) {
      throw new Error(`${location.name} does not have polygon geometry.`);
    }

    return {
      type: "Feature",
      properties: {
        name: location.name,
        filterValue: location.name,
        psgcCode: location.psgcCode,
        scope: location.scope,
        sourceId: match.properties.shapeID,
      },
      geometry: match.geometry,
    };
  });

  if (new Set(features.map((feature) => feature.properties.psgcCode)).size !== 22) {
    throw new Error("The reviewed PSGC crosswalk contains duplicates.");
  }

  const output = {
    type: "FeatureCollection",
    metadata: {
      title: "Pampanga and Angeles City approximate administrative areas",
      source:
        "geoBoundaries gbOpen PHL ADM3; source agencies NAMRIA, PSA and OCHA Philippines",
      sourceUrl: SOURCE_URL,
      sourceRevision: "wmgeolab/geoBoundaries@9469f09",
      psgcSourceUrl: PSGC_SOURCE_URL,
      psgcCrosswalkAsOf: "2026-06-30",
      boundaryYearReported: "2020",
      license: "CC BY 3.0 IGO",
      licenseUrl: "https://creativecommons.org/licenses/by/3.0/igo/",
      modifications:
        "Extracted 22 reviewed city/municipality features, replaced source properties with a current application crosswalk, and used the source's web-simplified geometry.",
      disclaimer:
        "Approximate administrative areas for property discovery; not cadastral or legal boundaries.",
    },
    features,
  };

  const scriptDirectory = dirname(fileURLToPath(import.meta.url));
  const outputPath = resolve(
    scriptDirectory,
    "../frontend/public/geo/pampanga-admin3.geojson",
  );
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output)}\n`, "utf8");
  console.log(`Wrote ${features.length} boundaries to ${outputPath}.`);
}

await build();
