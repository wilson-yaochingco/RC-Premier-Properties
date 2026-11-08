import { resolvePropertyMedia } from "../properties/development-sample-media";
import type { PublicPropertySummary } from "@rc/shared";
import { formatPrice, propertyTypeLabel } from "../properties/property-format";
import { getProperties } from "../properties/property.service";
import type {
  ViewingProperty,
  ViewingPropertyOptions,
  ViewingPropertyState,
} from "./ViewingScheduler";

/** Picker size: enough for a curated choice; "Browse all properties" covers the rest. */
const OPTION_LIMIT = 24;

export function toViewingProperty(item: PublicPropertySummary): ViewingProperty {
  const media = resolvePropertyMedia(item.coverMedia, item.id);
  return {
    propertyId: item.propertyId,
    title: item.title,
    slug: item.slug,
    availability: item.availability,
    propertyType: item.propertyType,
    typeLabel: propertyTypeLabel(item.propertyType),
    locationLabel: [item.location.city, item.location.province]
      .filter(Boolean)
      .join(", "),
    priceLabel: formatPrice(item.price.amount, item.price.currency),
    ...(media ? { media } : {}),
  };
}

/**
 * Current listings a visitor can choose from when the page has no property context. Sold
 * listings are left out because the backend rejects viewing requests for them; reserved
 * listings stay, matching the backend rule.
 */
export async function loadViewingOptions(
  fixture?: string,
): Promise<ViewingPropertyOptions> {
  // The literal `NODE_ENV` check lets production builds drop the fixtures chunk entirely.
  if (fixture && process.env.NODE_ENV === "development") {
    const { VIEWING_LISTING_FIXTURES, fixtureViewingOptions } =
      await import("./viewing.fixtures");
    const scenario = VIEWING_LISTING_FIXTURES.find((value) => value === fixture);
    if (scenario) return fixtureViewingOptions(scenario);
  }
  try {
    const { items } = await getProperties({ sort: "newest" }, undefined, OPTION_LIMIT);
    return {
      status: "ready",
      items: items
        .filter((item) => item.availability !== "sold")
        .map(toViewingProperty),
    };
  } catch {
    return { status: "unavailable" };
  }
}

/** Same shape the property and inquiry APIs accept; anything else cannot match a listing. */
const PROPERTY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;

/**
 * Resolves `?propertyId=` through the public property search, so the scheduler only shows
 * a title, image and status that the API actually returned. A failed request is reported
 * as unavailable rather than guessed; the backend still validates the ID on submission.
 */
export async function resolveViewingProperty(
  raw: string | undefined,
  fixture?: string,
): Promise<ViewingPropertyState> {
  if (fixture && process.env.NODE_ENV === "development") {
    const { VIEWING_PROPERTY_FIXTURES, fixtureViewingProperty } =
      await import("./viewing.fixtures");
    const scenario = VIEWING_PROPERTY_FIXTURES.find((value) => value === fixture);
    if (scenario) return fixtureViewingProperty(scenario);
  }
  const propertyId = raw?.trim() ?? "";
  if (!propertyId) return { status: "none" };
  if (!PROPERTY_ID_PATTERN.test(propertyId)) return { status: "not-found", propertyId };

  try {
    const { items } = await getProperties({ propertyId }, undefined, 1);
    const match = items.find(
      (item) => item.propertyId.toUpperCase() === propertyId.toUpperCase(),
    );
    if (!match) return { status: "not-found", propertyId };

    return { status: "resolved", property: toViewingProperty(match) };
  } catch {
    return { status: "unavailable", propertyId };
  }
}
