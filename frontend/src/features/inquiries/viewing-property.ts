import { resolvePropertyMedia } from "../properties/development-sample-media";
import { propertyTypeLabel } from "../properties/property-format";
import { getProperties } from "../properties/property.service";
import type { ViewingPropertyState } from "./ViewingScheduler";

/** Same shape the property and inquiry APIs accept; anything else cannot match a listing. */
const PROPERTY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;

/**
 * Resolves `?propertyId=` through the public property search, so the scheduler only shows
 * a title, image and status that the API actually returned. A failed request is reported
 * as unavailable rather than guessed; the backend still validates the ID on submission.
 */
export async function resolveViewingProperty(
  raw: string | undefined,
): Promise<ViewingPropertyState> {
  const propertyId = raw?.trim() ?? "";
  if (!propertyId) return { status: "none" };
  if (!PROPERTY_ID_PATTERN.test(propertyId)) return { status: "not-found", propertyId };

  try {
    const { items } = await getProperties({ propertyId }, undefined, 1);
    const match = items.find(
      (item) => item.propertyId.toUpperCase() === propertyId.toUpperCase(),
    );
    if (!match) return { status: "not-found", propertyId };

    const media = resolvePropertyMedia(match.coverMedia, match.id);
    return {
      status: "resolved",
      property: {
        propertyId: match.propertyId,
        title: match.title,
        slug: match.slug,
        availability: match.availability,
        typeLabel: propertyTypeLabel(match.propertyType),
        locationLabel: [match.location.city, match.location.province]
          .filter(Boolean)
          .join(", "),
        ...(media ? { media } : {}),
      },
    };
  } catch {
    return { status: "unavailable", propertyId };
  }
}
