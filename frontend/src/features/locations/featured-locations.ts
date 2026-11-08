import type { PublicPropertySummary } from "@rc/shared";
import {
  findPublicLocationBySlug,
  publicLocationPath,
} from "../../lib/public-location";
import { getLocationEditorialContent, type LocationScenery } from "./location-content";

/**
 * The four curated destinations on `/locations`. They are permanent navigation targets,
 * so they stay visible and linkable with zero published properties. Descriptions use only
 * what the repository already states about each place (its classification, its position on the Pampanga map and its approved
 * photograph's caption); nothing here is a market claim.
 */
export interface FeaturedLocation {
  slug: string;
  name: string;
  href: string;
  description: string;
  scenery: LocationScenery;
}

const FEATURED_SOURCE = [
  {
    name: "Angeles City",
    description: "A city in northern Pampanga, with Mount Arayat on its horizon.",
  },
  {
    name: "Mabalacat City",
    description:
      "A city at Pampanga’s northern edge, with Mount Arayat ahead along its roads.",
  },
  {
    name: "Magalang",
    description:
      "A municipality in northern Pampanga, with everyday routes like San Ildefonso Road.",
  },
  {
    name: "Porac",
    description:
      "A municipality in western Pampanga, with daily activity along Jose Abad Santos Avenue.",
  },
] as const;

export const FEATURED_LOCATIONS: readonly FeaturedLocation[] = FEATURED_SOURCE.map(
  ({ name, description }) => {
    const content = getLocationEditorialContent(name);
    if (!content) throw new Error(`Missing editorial content for ${name}`);
    return {
      slug: content.slug,
      name,
      href: publicLocationPath(name),
      description,
      scenery: content.scenery,
    };
  },
);

export function findFeaturedLocation(slug: string): FeaturedLocation | undefined {
  return FEATURED_LOCATIONS.find((location) => location.slug === slug);
}

/**
 * Resolves a `/locations/[slug]` request: a location with published inventory, or one of the
 * curated four with none yet (count 0). Any other slug is not a public location. Callers
 * must only use this once the inventory request itself has succeeded.
 */
export function resolveLocationFacet(
  slug: string,
  locationCounts: readonly { location: string; count: number }[],
): { location: string; count: number } | undefined {
  const match = findPublicLocationBySlug(slug, locationCounts);
  if (match) return match;
  const featured = findFeaturedLocation(slug);
  return featured ? { location: featured.name, count: 0 } : undefined;
}

/** The collection is independent of the permanent location navigation. */
export interface LocationsInventory {
  collection: CollectionState;
}

export type CollectionState =
  | { status: "ready"; items: readonly PublicPropertySummary[]; total: number }
  | { status: "unavailable" };
