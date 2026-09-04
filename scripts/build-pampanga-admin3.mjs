import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { inflateRawSync } from "node:zlib";

const ARCHIVE_URL =
  "https://data.humdata.org/dataset/caf116df-f984-4deb-85ca-41b349d3f313/resource/0120c30e-ba8b-487d-83f5-a664eddd3a8e/download/phl_admin_boundaries.geojson.zip";
const OUTPUT_PATH = resolve(
  "frontend/public/data/geography/pampanga-angeles-admin3.geojson",
);
const MAPSHAPER_VERSION = "0.7.56";

const OFFICIAL_AREAS = new Map([
  [
    "Angeles City",
    { name: "City of Angeles", psgcCode: "0330100000", scope: "angeles" },
  ],
  ["Apalit", { name: "Apalit", psgcCode: "0305402000", scope: "pampanga" }],
  ["Arayat", { name: "Arayat", psgcCode: "0305403000", scope: "pampanga" }],
  ["Bacolor", { name: "Bacolor", psgcCode: "0305404000", scope: "pampanga" }],
  ["Candaba", { name: "Candaba", psgcCode: "0305405000", scope: "pampanga" }],
  [
    "City of San Fernando (Capital)",
    {
      name: "City of San Fernando",
      psgcCode: "0305416000",
      scope: "pampanga",
    },
  ],
  [
    "Floridablanca",
    { name: "Floridablanca", psgcCode: "0305406000", scope: "pampanga" },
  ],
  ["Guagua", { name: "Guagua", psgcCode: "0305407000", scope: "pampanga" }],
  ["Lubao", { name: "Lubao", psgcCode: "0305408000", scope: "pampanga" }],
  [
    "Mabalacat City",
    { name: "Mabalacat City", psgcCode: "0305409000", scope: "pampanga" },
  ],
  ["Macabebe", { name: "Macabebe", psgcCode: "0305410000", scope: "pampanga" }],
  ["Magalang", { name: "Magalang", psgcCode: "0305411000", scope: "pampanga" }],
  ["Masantol", { name: "Masantol", psgcCode: "0305412000", scope: "pampanga" }],
  ["Mexico", { name: "Mexico", psgcCode: "0305413000", scope: "pampanga" }],
  ["Minalin", { name: "Minalin", psgcCode: "0305414000", scope: "pampanga" }],
  ["Porac", { name: "Porac", psgcCode: "0305415000", scope: "pampanga" }],
  ["San Luis", { name: "San Luis", psgcCode: "0305417000", scope: "pampanga" }],
  ["San Simon", { name: "San Simon", psgcCode: "0305418000", scope: "pampanga" }],
  ["Santa Ana", { name: "Santa Ana", psgcCode: "0305419000", scope: "pampanga" }],
  ["Santa Rita", { name: "Santa Rita", psgcCode: "0305420000", scope: "pampanga" }],
  ["Sasmuan (Sexmoan)", { name: "Sasmuan", psgcCode: "0305422000", scope: "pampanga" }],
  ["Sto. Tomas", { name: "Sto. Tomas", psgcCode: "0305421000", scope: "pampanga" }],
]);

function findEndOfCentralDirectory(buffer) {
  for (let index = buffer.length - 22; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === 0x06054b50) {
      return index;
    }
  }

  throw new Error("The ZIP end-of-central-directory record was not found.");
}

async function fetchRange(url, start, end) {
  const response = await fetch(url, {
    headers: { Range: `bytes=${start}-${end}` },
  });

  if (response.status !== 206) {
    throw new Error(
      `Expected HTTP 206 for range ${start}-${end}; got ${response.status}.`,
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

async function resolveArchive() {
  const response = await fetch(ARCHIVE_URL, {
    headers: { Range: "bytes=0-0" },
  });

  if (response.status !== 206) {
    throw new Error(`HDX archive range probe failed with HTTP ${response.status}.`);
  }

  const contentRange = response.headers.get("content-range");
  const contentLength = Number(contentRange?.match(/\/(\d+)$/)?.[1]);
  if (!Number.isSafeInteger(contentLength) || contentLength <= 0) {
    throw new Error("HDX archive did not return a valid Content-Range header.");
  }

  return { url: response.url, contentLength };
}

async function findAdmin3Entry(url, contentLength) {
  const tailStart = Math.max(0, contentLength - 131_072);
  const tail = await fetchRange(url, tailStart, contentLength - 1);
  const endRecordOffset = findEndOfCentralDirectory(tail);
  const centralDirectorySize = tail.readUInt32LE(endRecordOffset + 12);
  const centralDirectoryOffset = tail.readUInt32LE(endRecordOffset + 16);
  const centralDirectory = await fetchRange(
    url,
    centralDirectoryOffset,
    centralDirectoryOffset + centralDirectorySize - 1,
  );

  for (let offset = 0; offset < centralDirectory.length;) {
    if (centralDirectory.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`Invalid ZIP central-directory entry at byte ${offset}.`);
    }

    const compressionMethod = centralDirectory.readUInt16LE(offset + 10);
    const compressedSize = centralDirectory.readUInt32LE(offset + 20);
    const uncompressedSize = centralDirectory.readUInt32LE(offset + 24);
    const fileNameLength = centralDirectory.readUInt16LE(offset + 28);
    const extraLength = centralDirectory.readUInt16LE(offset + 30);
    const commentLength = centralDirectory.readUInt16LE(offset + 32);
    const localHeaderOffset = centralDirectory.readUInt32LE(offset + 42);
    const fileName = centralDirectory
      .subarray(offset + 46, offset + 46 + fileNameLength)
      .toString("utf8");

    if (/admin3.*\.geojson$/i.test(fileName) && !/line/i.test(fileName)) {
      return {
        fileName,
        compressionMethod,
        compressedSize,
        uncompressedSize,
        localHeaderOffset,
      };
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  throw new Error("No admin-3 GeoJSON entry was found in the HDX archive.");
}

async function readZipEntry(url, entry) {
  const header = await fetchRange(
    url,
    entry.localHeaderOffset,
    entry.localHeaderOffset + 65_535,
  );

  if (header.readUInt32LE(0) !== 0x04034b50) {
    throw new Error(`Invalid local ZIP header for ${entry.fileName}.`);
  }

  const fileNameLength = header.readUInt16LE(26);
  const extraLength = header.readUInt16LE(28);
  const dataStart = entry.localHeaderOffset + 30 + fileNameLength + extraLength;
  const compressed = await fetchRange(
    url,
    dataStart,
    dataStart + entry.compressedSize - 1,
  );
  const uncompressed =
    entry.compressionMethod === 8
      ? inflateRawSync(compressed)
      : entry.compressionMethod === 0
        ? compressed
        : null;

  if (!uncompressed) {
    throw new Error(`Unsupported ZIP compression method ${entry.compressionMethod}.`);
  }
  if (uncompressed.length !== entry.uncompressedSize) {
    throw new Error(
      `ZIP size check failed for ${entry.fileName}: expected ${entry.uncompressedSize}, got ${uncompressed.length}.`,
    );
  }

  return uncompressed;
}

function extractTargetAreas(source) {
  if (source.type !== "FeatureCollection" || !Array.isArray(source.features)) {
    throw new Error("The HDX admin-3 resource is not a GeoJSON FeatureCollection.");
  }

  const matchedNames = new Set();
  const features = [];

  for (const feature of source.features) {
    const sourceName = feature.properties?.adm3_name;
    const officialArea = OFFICIAL_AREAS.get(sourceName);
    if (!officialArea) continue;

    if (matchedNames.has(sourceName)) {
      throw new Error(`Duplicate admin-3 feature found for ${sourceName}.`);
    }

    matchedNames.add(sourceName);
    features.push({
      type: "Feature",
      properties: officialArea,
      geometry: feature.geometry,
    });
  }

  const missing = [...OFFICIAL_AREAS.keys()].filter((name) => !matchedNames.has(name));
  if (missing.length > 0) {
    throw new Error(`Missing expected admin-3 areas: ${missing.join(", ")}`);
  }
  if (features.length !== 22) {
    throw new Error(`Expected 22 admin-3 areas; found ${features.length}.`);
  }

  return {
    type: "FeatureCollection",
    features: features.sort((left, right) =>
      left.properties.name.localeCompare(right.properties.name, "en"),
    ),
  };
}

function validateFinalArtifact(collection) {
  if (collection.type !== "FeatureCollection" || collection.features?.length !== 22) {
    throw new Error(
      "The simplified artifact must contain exactly 22 GeoJSON features.",
    );
  }

  const expectedCodes = new Set(
    [...OFFICIAL_AREAS.values()].map(({ psgcCode }) => psgcCode),
  );
  const observedCodes = new Set();

  for (const feature of collection.features) {
    const { name, psgcCode, scope } = feature.properties ?? {};
    if (!name || !expectedCodes.has(psgcCode)) {
      throw new Error(
        `Unexpected final feature metadata: ${JSON.stringify(feature.properties)}.`,
      );
    }
    if (scope !== "pampanga" && scope !== "angeles") {
      throw new Error(`Unexpected scope for ${name}: ${scope}.`);
    }
    if (
      !feature.geometry ||
      !["Polygon", "MultiPolygon"].includes(feature.geometry.type)
    ) {
      throw new Error(
        `Unexpected geometry type for ${name}: ${feature.geometry?.type}.`,
      );
    }
    if (observedCodes.has(psgcCode)) {
      throw new Error(`Duplicate PSGC code in final artifact: ${psgcCode}.`);
    }
    observedCodes.add(psgcCode);
  }
}

const metadata = {
  title: "Pampanga and Angeles City administrative level 3 boundaries",
  administrativeLevel: 3,
  featureCount: 22,
  sourceDataset: "Philippines - Subnational Administrative Boundaries",
  sourceUrl: "https://data.humdata.org/dataset/cod-ab-phl",
  sourceAgencies: [
    "National Mapping and Resource Information Authority (NAMRIA)",
    "Philippine Statistics Authority (PSA)",
    "United Nations Office for the Coordination of Humanitarian Affairs (OCHA)",
  ],
  sourceVersion: "v03",
  sourceReviewDate: "2024-04-01",
  license: "Creative Commons Attribution 3.0 IGO (CC BY 3.0 IGO)",
  licenseUrl: "https://creativecommons.org/licenses/by/3.0/igo/",
  psgcReference: "Philippine Standard Geographic Code, second quarter 2026",
  psgcReferenceUrl: "https://psa.gov.ph/classification/psgc",
  modifications: [
    "Extracted the 22 city and municipality features covering Pampanga and Angeles City.",
    "Reconciled public names and identifiers to PSA PSGC Q2 2026 without changing source geometry.",
    "Detached Angeles City from the Pampanga administrative hierarchy and labeled it as a separate map scope.",
    "Simplified shared polygon topology to 8% retained detail with Mapshaper 0.7.56 using keep-shapes.",
    "Rounded coordinates to five decimal places for web delivery.",
  ],
  disclaimer:
    "Operational, approximate administrative boundaries for property discovery; not cadastral, survey, title, or legal boundary evidence.",
};

async function main() {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "rc-boundaries-"));
  const extractedPath = join(temporaryDirectory, "pampanga-admin3-source.geojson");
  const simplifiedPath = join(temporaryDirectory, "pampanga-admin3-simplified.geojson");

  try {
    const archive = await resolveArchive();
    const entry = await findAdmin3Entry(archive.url, archive.contentLength);
    const source = JSON.parse(
      (await readZipEntry(archive.url, entry)).toString("utf8"),
    );
    const extracted = extractTargetAreas(source);
    await writeFile(extractedPath, JSON.stringify(extracted), "utf8");

    const npxExecutable = process.platform === "win32" ? "npx.cmd" : "npx";
    execFileSync(
      npxExecutable,
      [
        "--yes",
        `mapshaper@${MAPSHAPER_VERSION}`,
        extractedPath,
        "-clean",
        "-simplify",
        "8%",
        "keep-shapes",
        "-o",
        "format=geojson",
        "precision=0.00001",
        simplifiedPath,
      ],
      { stdio: "inherit" },
    );

    const simplified = JSON.parse(await readFile(simplifiedPath, "utf8"));
    validateFinalArtifact(simplified);
    const artifact = { ...simplified, metadata };
    await mkdir(resolve("frontend/public/data/geography"), { recursive: true });
    await writeFile(OUTPUT_PATH, `${JSON.stringify(artifact)}\n`, "utf8");

    const bytes = Buffer.byteLength(JSON.stringify(artifact));
    console.log(
      `Wrote ${OUTPUT_PATH} (${bytes.toLocaleString("en-US")} bytes, 22 areas).`,
    );
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

await main();
