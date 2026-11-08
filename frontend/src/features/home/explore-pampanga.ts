import {
  publicLocationPath,
  publicLocationSlug,
  shortPublicLocation,
} from "../../lib/public-location";
import { PAMPANGA_MAP_AREAS } from "../locations/pampanga-map-data";

export interface LocationCount {
  location: string;
  count: number;
}

export interface ExploreLocation {
  slug: string;
  name: string;
  count: number;
  href: string;
  countLabel: string;
}

/** The map highlights every active area; the index beneath it stays short. */
export const EXPLORE_INDEX_LIMIT = 4;

const MAP_SLUGS = new Set(PAMPANGA_MAP_AREAS.map((area) => area.slug));

export function propertyCountLabel(count: number): string {
  return `${count} ${count === 1 ? "property" : "properties"}`;
}

/**
 * Turns facet counts into map locations. A label is kept only if its slug names exactly one
 * map area (no fuzzy matching); highest count first, ties by name so the default selection
 * is stable.
 */
export function buildExploreLocations(
  counts: readonly LocationCount[],
): ExploreLocation[] {
  const bySlug = new Map<string, ExploreLocation>();
  for (const { location, count } of counts) {
    const slug = publicLocationSlug(location);
    if (count < 1 || !MAP_SLUGS.has(slug) || bySlug.has(slug)) continue;
    bySlug.set(slug, {
      slug,
      name: shortPublicLocation(location),
      count,
      href: publicLocationPath(location),
      countLabel: propertyCountLabel(count),
    });
  }
  return [...bySlug.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}
