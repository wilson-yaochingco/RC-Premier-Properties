import type { PublicPropertyMedia } from "@rc/shared";
import {
  DEVELOPMENT_SAMPLE_MEDIA_ENABLED,
  isApprovedProductionMediaUrl,
} from "../../lib/env";

/** A development-only Unsplash sample, accepted only under `next dev`. */
export function isDevelopmentSampleUrl(
  media: PublicPropertyMedia | undefined,
): boolean {
  if (
    !DEVELOPMENT_SAMPLE_MEDIA_ENABLED ||
    media?.source !== "development-sample" ||
    !media.url
  )
    return false;
  try {
    const url = new URL(media.url);
    return (
      url.protocol === "https:" &&
      url.hostname === "images.unsplash.com" &&
      /^\/photo-[a-zA-Z0-9-]+$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

/**
 * Whether `PropertyMedia` would render a real image for this media record (as opposed to
 * its neutral placeholder). Layouts use it to choose an intentional no-image composition
 * instead of showing an empty image slot.
 */
export function hasRenderableImage(media: PublicPropertyMedia | undefined): boolean {
  return (
    media?.kind === "image" &&
    Boolean(media.url) &&
    (isApprovedProductionMediaUrl(media.url) || isDevelopmentSampleUrl(media))
  );
}
