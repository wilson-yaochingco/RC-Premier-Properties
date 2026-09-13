import type { AdminPropertyMediaInput, PublicPropertyMedia } from "@rc/shared";
import { DEVELOPMENT_SAMPLE_MEDIA_ENABLED } from "../../lib/env";

/**
 * Reusable photography offered only as clearly labelled development media.
 * These records are never seeded or associated with a real listing. In development,
 * one may be selected as a presentation-only fallback for a property with no media.
 */
export const DEVELOPMENT_SAMPLE_MEDIA = [
  {
    id: "sample-unsplash-gvocptnahfo",
    kind: "image",
    url: "https://images.unsplash.com/photo-1695593116063-843e813fee6f?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=80&w=2000",
    alt: "White modern house reflected in a swimming pool",
    caption: "Development sample photography; not an RC Premier Properties listing.",
    source: "development-sample",
    sourceUrl:
      "https://unsplash.com/photos/a-house-with-a-pool-in-front-of-it-GvOcpTNAHFo",
    attribution: "Photo by Damien Schneider on Unsplash",
  },
  {
    id: "sample-unsplash-ogucsfltxoo",
    kind: "image",
    url: "https://images.unsplash.com/photo-1668588147695-c7924dacd374?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=80&w=2000",
    alt: "Contemporary patio beside a swimming pool",
    caption: "Development sample photography; not an RC Premier Properties listing.",
    source: "development-sample",
    sourceUrl:
      "https://unsplash.com/photos/a-house-with-a-patio-and-a-pool-OgUcsFltXOo",
    attribution: "Photo by rawkkim on Unsplash",
  },
  {
    id: "sample-unsplash-rejxpbskj3q",
    kind: "image",
    url: "https://images.unsplash.com/photo-1564078516393-cf04bd966897?auto=format&fit=crop&fm=jpg&q=80&w=2000",
    alt: "Bright contemporary living room with neutral furnishings",
    caption: "Development sample photography; not an RC Premier Properties listing.",
    source: "development-sample",
    sourceUrl: "https://unsplash.com/photos/rEJxpBskj3Q",
    attribution: "Photo by Roberto Nickson on Unsplash",
  },
  {
    id: "sample-unsplash-3qrx6b4ct6g",
    kind: "image",
    url: "https://images.unsplash.com/photo-1770756051811-1612ac8bedfa?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=80&w=2000",
    alt: "Minimal white house exterior with contemporary garage doors",
    caption: "Development sample photography; not an RC Premier Properties listing.",
    source: "development-sample",
    sourceUrl:
      "https://unsplash.com/photos/modern-garage-doors-on-a-white-house-3qRx6B4cT6g",
    attribution: "Photo by GoodLifeConstruction on Unsplash",
  },
] as const satisfies readonly AdminPropertyMediaInput[];

function stableIndex(identifier: string): number {
  let hash = 2_166_136_261;

  for (const character of identifier) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }

  return (hash >>> 0) % DEVELOPMENT_SAMPLE_MEDIA.length;
}

/** Select a stable sample without mutating or persisting property data. */
export function selectDevelopmentSampleMedia(identifier: string): PublicPropertyMedia {
  return DEVELOPMENT_SAMPLE_MEDIA[stableIndex(identifier)];
}

/** Return a presentation-only fallback during `next dev`; all other modes opt out. */
export function getDevelopmentSampleMedia(
  identifier: string,
): PublicPropertyMedia | undefined {
  return DEVELOPMENT_SAMPLE_MEDIA_ENABLED
    ? selectDevelopmentSampleMedia(identifier)
    : undefined;
}

/** Preserve assigned media; consult the development fallback only when it is absent. */
export function resolvePropertyMedia(
  assignedMedia: PublicPropertyMedia | undefined,
  identifier: string,
): PublicPropertyMedia | undefined {
  return assignedMedia ?? getDevelopmentSampleMedia(identifier);
}
