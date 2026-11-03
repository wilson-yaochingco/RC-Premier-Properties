/**
 * Generates frontend/src/features/locations/pampanga-map-data.ts, the SVG path data behind
 * the homepage "Explore Pampanga" map.
 *
 *   node scripts/build-pampanga-map-data.mjs
 *
 * Input is the reviewed, committed extract frontend/public/geo/pampanga-admin3.geojson
 * (see docs/architecture/geographic-data-and-maps.md); no network and no dependencies.
 * Projects with a latitude correction, splits rings into arcs by edge ownership, simplifies
 * every shared arc once, and rebuilds each ring from those arcs so neighbours keep identical
 * borders.
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(root, "frontend/public/geo/pampanga-admin3.geojson");
const OUTPUT = join(root, "frontend/src/features/locations/pampanga-map-data.ts");
const { publicLocationSlug } = await import(
  pathToFileURL(join(root, "frontend/src/lib/public-location.ts")).href
);

const WIDTH = 1000;
const PAD = 12;
const TOLERANCE = 2;

/**
 * Label anchors default to each area's pole of inaccessibility (the point farthest from
 * any edge), which stays inside concave shapes. Override here only after reviewing a render.
 */
const ANCHOR_OVERRIDES = {};

const geojson = JSON.parse(await readFile(SOURCE, "utf8"));
const vkey = (p) => `${p[0]},${p[1]}`;
const ekey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

const areas = geojson.features.map((feature, index) => {
  const polygons =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
  return {
    index,
    name: feature.properties.name,
    rings: polygons.flat().map((ring) => ring.slice(0, -1)),
  };
});

const edgeOwners = new Map();
for (const area of areas) {
  for (const ring of area.rings) {
    for (let i = 0; i < ring.length; i++) {
      const key = ekey(vkey(ring[i]), vkey(ring[(i + 1) % ring.length]));
      if (!edgeOwners.has(key)) edgeOwners.set(key, new Set());
      edgeOwners.get(key).add(area.index);
    }
  }
}
const ownerOf = (a, b) =>
  [...edgeOwners.get(ekey(vkey(a), vkey(b)))].sort((x, y) => x - y).join(",");

const points = areas.flatMap((a) => a.rings.flat());
const west = Math.min(...points.map((p) => p[0]));
const east = Math.max(...points.map((p) => p[0]));
const south = Math.min(...points.map((p) => p[1]));
const north = Math.max(...points.map((p) => p[1]));
const kx = Math.cos((((south + north) / 2) * Math.PI) / 180);
const scale = WIDTH / ((east - west) * kx);
const project = (p) => [PAD + (p[0] - west) * kx * scale, PAD + (north - p[1]) * scale];
const HEIGHT = Math.ceil((north - south) * scale + PAD * 2);

function simplify(pts, tolerance) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0];
  const [bx, by] = pts[pts.length - 1];
  const dx = bx - ax;
  const dy = by - ay;
  const length = Math.hypot(dx, dy);
  let best = -1;
  let bestDistance = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i];
    const distance =
      length === 0
        ? Math.hypot(px - ax, py - ay)
        : Math.abs(dy * px - dx * py + bx * ay - by * ax) / length;
    if (distance > bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  if (bestDistance <= tolerance) return [pts[0], pts[pts.length - 1]];
  return [
    ...simplify(pts.slice(0, best + 1), tolerance).slice(0, -1),
    ...simplify(pts.slice(best), tolerance),
  ];
}

const arcCache = new Map();
function simplifyRing(ring) {
  const n = ring.length;
  const owners = ring.map((p, i) => ownerOf(p, ring[(i + 1) % n]));
  const junctions = owners
    .map((o, i) => (o !== owners[(i - 1 + n) % n] ? i : -1))
    .filter((i) => i >= 0);
  const starts = junctions.length ? junctions : [0];
  const out = [];
  starts.forEach((start, k) => {
    const end = junctions.length ? starts[(k + 1) % starts.length] : start;
    const raw = [];
    let i = start;
    do {
      raw.push(ring[i]);
      i = (i + 1) % n;
    } while (i !== end);
    raw.push(ring[end]);

    const forward = raw.map(vkey).join(">");
    const backward = [...raw].reverse().map(vkey).join(">");
    const canonical = forward <= backward ? forward : backward;
    const reversed = canonical !== forward;
    if (!arcCache.has(canonical)) {
      const base = (reversed ? [...raw].reverse() : raw).map(project);
      let simplified;
      if (!junctions.length) {
        // A ring without junctions: split at the vertex farthest from the start.
        let far = 1;
        let farDistance = -1;
        base.forEach((p, idx) => {
          const d = Math.hypot(p[0] - base[0][0], p[1] - base[0][1]);
          if (idx > 0 && idx < base.length - 1 && d > farDistance) {
            farDistance = d;
            far = idx;
          }
        });
        simplified = [
          ...simplify(base.slice(0, far + 1), TOLERANCE).slice(0, -1),
          ...simplify(base.slice(far), TOLERANCE),
        ];
      } else {
        simplified = simplify(base, TOLERANCE);
      }
      arcCache.set(canonical, { points: simplified, owner: owners[start] });
    }
    const arc = arcCache.get(canonical).points;
    out.push(...(reversed ? [...arc].reverse() : arc).slice(0, -1));
  });
  return out;
}

const fmt = (n) => Number(n.toFixed(1)).toString();
const ringPath = (ring) =>
  `M${ring.map((p) => `${fmt(p[0])} ${fmt(p[1])}`).join("L")}Z`;
const signedArea = (ring) =>
  ring.reduce((sum, [x1, y1], i) => {
    const [x2, y2] = ring[(i + 1) % ring.length];
    return sum + (x1 * y2 - x2 * y1);
  }, 0) / 2;

function insideRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function edgeDistance(x, y, ring) {
  let best = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const [ax, ay] = ring[i];
    const [bx, by] = ring[(i + 1) % ring.length];
    const dx = bx - ax;
    const dy = by - ay;
    const t =
      dx || dy
        ? Math.max(
            0,
            Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)),
          )
        : 0;
    best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
  }
  return best;
}

function labelAnchor(ring) {
  const xs = ring.map((p) => p[0]);
  const ys = ring.map((p) => p[1]);
  let best = { distance: -1, x: 0, y: 0 };
  for (let x = Math.min(...xs); x <= Math.max(...xs); x += 2) {
    for (let y = Math.min(...ys); y <= Math.max(...ys); y += 2) {
      if (!insideRing(x, y, ring)) continue;
      const distance = edgeDistance(x, y, ring);
      if (distance > best.distance) best = { distance, x, y };
    }
  }
  return [Number(best.x.toFixed(1)), Number(best.y.toFixed(1))];
}

const mapAreas = areas
  .map((area) => {
    const rings = area.rings.map(simplifyRing);
    const largest = [...rings].sort(
      (a, b) => Math.abs(signedArea(b)) - Math.abs(signedArea(a)),
    )[0];
    const slug = publicLocationSlug(area.name);
    return {
      name: area.name,
      slug,
      anchor: ANCHOR_OVERRIDES[slug] ?? labelAnchor(largest),
      d: rings.map(ringPath).join(""),
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const outline = [...arcCache.values()]
  .filter(({ owner }) => !owner.includes(","))
  .map(({ points: arc }) => `M${arc.map((p) => `${fmt(p[0])} ${fmt(p[1])}`).join("L")}`)
  .join("");

const source = `/**
 * GENERATED by scripts/build-pampanga-map-data.mjs; do not edit by hand.
 *
 * Simplified SVG geometry for Pampanga's 21 cities and municipalities plus Angeles City.
 * Boundaries: OCHA/NAMRIA/PSA via geoBoundaries gbOpen (wmgeolab/geoBoundaries@9469f09),
 * CC BY 3.0 IGO, simplified and projected for display. Approximate; not legal boundaries.
 */
export interface PampangaMapArea {
  name: string;
  slug: string;
  /** Label anchor in viewBox units. */
  anchor: readonly [number, number];
  d: string;
}

export const PAMPANGA_MAP_WIDTH = ${WIDTH + PAD * 2};
export const PAMPANGA_MAP_HEIGHT = ${HEIGHT};
export const PAMPANGA_MAP_OUTLINE = ${JSON.stringify(outline)};

export const PAMPANGA_MAP_AREAS: readonly PampangaMapArea[] = ${JSON.stringify(mapAreas, null, 2)};
`;

await writeFile(OUTPUT, source);
console.log(
  `Wrote ${mapAreas.length} areas, ${Buffer.byteLength(source)} bytes → ${OUTPUT}`,
);
