import type { PublicPropertySummary } from "@rc/shared";
import { hasRenderableImage } from "../properties/property-media-support";

/** Published properties shown in the "Homes worth exploring" showcase (one lead + three). */
export const COLLECTION_LIMIT = 4;

export interface Showcase {
  lead: PublicPropertySummary;
  supporting: PublicPropertySummary[];
}

/**
 * Chooses the showcase from the real API response, deterministically and without any
 * "featured" flag: the lead is the newest listing that has a renderable photograph (or the
 * newest listing when none has one), and the rest keep the API's newest-first order. No
 * listing is ever repeated and nothing is padded to fill slots.
 */
export function pickShowcase(
  items: readonly PublicPropertySummary[],
): Showcase | undefined {
  const unique = items.filter(
    (item, index) => items.findIndex(({ id }) => id === item.id) === index,
  );
  const lead = unique.find((item) => hasRenderableImage(item.coverMedia)) ?? unique[0];
  if (!lead) return undefined;
  return {
    lead,
    supporting: unique
      .filter(({ id }) => id !== lead.id)
      .slice(0, COLLECTION_LIMIT - 1),
  };
}
