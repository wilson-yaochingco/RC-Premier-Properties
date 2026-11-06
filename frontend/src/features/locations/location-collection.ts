import type { PublicPropertySummary } from "@rc/shared";

/** Most properties the "Homes worth exploring" rail ever shows. */
export const COLLECTION_LIMIT = 3;

/** Keeps the API's newest-first order; never repeats a listing and never pads. */
export function pickCollection(
  items: readonly PublicPropertySummary[],
): PublicPropertySummary[] {
  return items
    .filter((item, index) => items.findIndex(({ id }) => id === item.id) === index)
    .slice(0, COLLECTION_LIMIT);
}
