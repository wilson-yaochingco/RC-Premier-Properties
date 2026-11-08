import type {
  PropertyAvailability,
  PropertyFacetsResponse,
  PublicPropertyDetail,
  PublicPropertyMedia,
} from "@rc/shared";
import type { Metadata } from "next";
import { absoluteSiteUrl, buildPageMetadata, SITE_NAME } from "../../lib/seo";
import { isApprovedProductionMediaUrl } from "../../lib/env";
import { publicLocationPath } from "../../lib/public-location";
import { formatPrice, propertyTypeLabel } from "./property-format";
import type { RawSearchParams } from "./property-query";
import { orderPropertyPhotos, propertyPhotoDeliveryUrl } from "./property-photography";

export interface LocationSeoState {
  indexable: boolean;
  location?: string;
  count?: number;
  canonicalPath: string;
}

function firstValue(value: string | string[] | undefined): string {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() ?? "";
}

function hasValue(value: string | string[] | undefined): boolean {
  return Array.isArray(value)
    ? value.some((item) => item.trim() !== "")
    : Boolean(value?.trim());
}

export function resolveLocationSeoState(
  searchParams: RawSearchParams,
  facets: PropertyFacetsResponse | undefined,
): LocationSeoState {
  const activeEntries = Object.entries(searchParams).filter(([, value]) =>
    hasValue(value),
  );
  if (activeEntries.length === 0) {
    return { indexable: true, canonicalPath: "/properties" };
  }

  const locationQuery = firstValue(searchParams.location);
  const hasOnlyStableLocationState = activeEntries.every(([key, value]) => {
    if (Array.isArray(value) && value.length !== 1) return false;
    const normalized = firstValue(value);
    return (
      key === "location" ||
      (key === "purpose" && normalized === "sale") ||
      (key === "sort" && normalized === "newest") ||
      (key === "page" && normalized === "1")
    );
  });
  if (!locationQuery || !hasOnlyStableLocationState || !facets) {
    return { indexable: false, canonicalPath: "/properties" };
  }

  const normalizedQuery = locationQuery.toLocaleLowerCase("en-US");
  const matches = (facets.locationCounts ?? [])
    .filter(({ count }) => count > 0)
    .filter(({ location }) => {
      const normalizedLocation = location.toLocaleLowerCase("en-US");
      const city = normalizedLocation.split(",")[0]?.trim();
      return normalizedLocation === normalizedQuery || city === normalizedQuery;
    });
  if (matches.length !== 1) {
    return { indexable: false, canonicalPath: "/properties" };
  }

  // The location guide lists the same inventory with more context, so the filtered
  // catalog defers to it instead of competing for the same search.
  const [{ location, count }] = matches;
  return {
    indexable: true,
    location,
    count,
    canonicalPath: publicLocationPath(location),
  };
}

export function buildPropertiesMetadata(
  state: LocationSeoState,
  defaultImagePath: string,
): Metadata {
  const title = state.location
    ? `Properties for Sale in ${state.location}`
    : "Properties for Sale in Pampanga";
  const description = state.location
    ? `Browse published properties for sale in ${state.location} with RC Premier Properties.`
    : "Browse published houses, townhouses and lots for sale across Pampanga. Filter by location, type and price, then ask about a listing or request a viewing.";

  return buildPageMetadata({
    title,
    description,
    canonicalPath: state.canonicalPath,
    imagePath: defaultImagePath,
    noIndex: !state.indexable,
  });
}

export function publicPropertyImageUrl(
  media: PublicPropertyMedia | undefined,
): string | undefined {
  if (media?.kind !== "image" || !media.url || media.source === "development-sample") {
    return undefined;
  }
  if (!isApprovedProductionMediaUrl(media.url)) return undefined;
  const deliveryUrl = propertyPhotoDeliveryUrl(media.url);
  return deliveryUrl.startsWith("/") ? absoluteSiteUrl(deliveryUrl) : deliveryUrl;
}

function propertyImageUrls(property: PublicPropertyDetail): string[] {
  return orderPropertyPhotos(
    [property.coverMedia, ...property.gallery].filter(
      (media): media is PublicPropertyMedia => Boolean(media),
    ),
  )
    .map(publicPropertyImageUrl)
    .filter((url): url is string => Boolean(url))
    .filter((url, index, urls) => urls.indexOf(url) === index);
}

const DESCRIPTION_LIMIT = 160;

function clip(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,.;:–-]+$/, "")}…`;
}

/** "House and lot for sale in Angeles City", from the listing's own type, status and city. */
function listingPhrase(property: PublicPropertyDetail): string {
  const type = propertyTypeLabel(property.propertyType).replace(" & ", " and ");
  const status = property.availability === "sold" ? "sold" : "for sale";
  return `${type} ${status} in ${property.location.city}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Title and description built only from published listing fields. */
export function propertySearchCopy(property: PublicPropertyDetail) {
  const { bedrooms, bathrooms, floorAreaSqm, lotAreaSqm } = property.specifications;
  const facts = [
    bedrooms === undefined
      ? undefined
      : `${bedrooms} bedroom${bedrooms === 1 ? "" : "s"}`,
    bathrooms === undefined
      ? undefined
      : `${bathrooms} bathroom${bathrooms === 1 ? "" : "s"}`,
    floorAreaSqm === undefined ? undefined : `${floorAreaSqm} sqm floor area`,
    lotAreaSqm === undefined ? undefined : `${lotAreaSqm} sqm lot`,
  ].filter(Boolean);
  const lead = `${capitalize(listingPhrase(property))}, ${property.location.province}`;
  const price =
    property.availability === "sold"
      ? undefined
      : formatPrice(property.price.amount, property.price.currency);
  const summary = [lead, facts.join(", "), price].filter(Boolean).join(" · ");

  return {
    title: `${property.title}, ${capitalize(listingPhrase(property))}`,
    description: clip(`${summary}. ${property.shortDescription}`, DESCRIPTION_LIMIT),
  };
}

export function buildPropertyMetadata(
  property: PublicPropertyDetail,
  defaultImagePath: string,
): Metadata {
  const propertyImage = propertyImageUrls(property)[0];
  const copy = propertySearchCopy(property);
  const metadata = buildPageMetadata({
    title: copy.title,
    description: copy.description,
    canonicalPath: `/properties/${property.slug}`,
    imagePath: propertyImage ?? defaultImagePath,
  });

  if (propertyImage && metadata.openGraph && !Array.isArray(metadata.openGraph)) {
    const primaryMedia = [property.coverMedia, ...property.gallery].find(
      (media) => publicPropertyImageUrl(media) === propertyImage,
    );
    metadata.openGraph.images = [
      {
        url: propertyImage,
        alt: primaryMedia?.alt ?? property.title,
      },
    ];
  }
  if (propertyImage && metadata.twitter && !Array.isArray(metadata.twitter)) {
    metadata.twitter.images = [propertyImage];
  }
  return metadata;
}

export function schemaAvailability(availability: PropertyAvailability): string {
  if (availability === "available") return "https://schema.org/InStock";
  if (availability === "reserved") {
    return "https://schema.org/LimitedAvailability";
  }
  return "https://schema.org/SoldOut";
}

/** Schema.org entity for the property itself; only residential types carry room counts. */
const RESIDENCE_TYPES: Partial<Record<PublicPropertyDetail["propertyType"], string>> = {
  "house-and-lot": "SingleFamilyResidence",
  townhouse: "House",
  condominium: "Apartment",
};

function squareMetres(value: number | undefined) {
  return value === undefined
    ? undefined
    : { "@type": "QuantitativeValue", value, unitCode: "MTK" };
}

/**
 * A RealEstateListing page about the property, with the asking price as its Offer. Google
 * shows no rich result for this type; it exists so search engines and answer engines read
 * the listing as what it is rather than as a shippable product.
 */
export function buildPropertyStructuredData(property: PublicPropertyDetail) {
  const propertyUrl = absoluteSiteUrl(`/properties/${property.slug}`);
  const propertiesUrl = absoluteSiteUrl("/properties");
  const homeUrl = absoluteSiteUrl("/");
  if (!propertyUrl || !propertiesUrl || !homeUrl) return undefined;

  const images = propertyImageUrls(property);
  const { bedrooms, bathrooms, floorAreaSqm, lotAreaSqm } = property.specifications;
  const residenceType = RESIDENCE_TYPES[property.propertyType];
  const datePosted = new Date(property.publishedAt);
  const dateModified = new Date(property.updatedAt);

  const residence = {
    "@type": residenceType ?? "Place",
    "@id": `${propertyUrl}#property`,
    name: property.title,
    description: property.shortDescription,
    identifier: property.propertyId,
    address: {
      "@type": "PostalAddress",
      addressLocality: property.location.city,
      addressRegion: property.location.province,
      addressCountry: "PH",
    },
    ...(images.length > 0 ? { image: images } : {}),
    ...(residenceType
      ? {
          ...(bedrooms === undefined ? {} : { numberOfBedrooms: bedrooms }),
          ...(bathrooms === undefined ? {} : { numberOfBathroomsTotal: bathrooms }),
          ...(floorAreaSqm === undefined
            ? {}
            : { floorSize: squareMetres(floorAreaSqm) }),
        }
      : {}),
    ...(lotAreaSqm === undefined
      ? {}
      : {
          additionalProperty: [
            {
              "@type": "PropertyValue",
              name: "Lot area",
              value: lotAreaSqm,
              unitCode: "MTK",
            },
          ],
        }),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "RealEstateListing",
        "@id": `${propertyUrl}#listing`,
        url: propertyUrl,
        name: property.title,
        description: property.shortDescription,
        inLanguage: "en-PH",
        ...(Number.isNaN(datePosted.valueOf())
          ? {}
          : { datePosted: datePosted.toISOString() }),
        ...(Number.isNaN(dateModified.valueOf())
          ? {}
          : { dateModified: dateModified.toISOString() }),
        ...(images.length > 0 ? { primaryImageOfPage: images[0] } : {}),
        isPartOf: { "@id": `${homeUrl}#website` },
        about: { "@id": `${propertyUrl}#property` },
        offers: {
          "@type": "Offer",
          price: property.price.amount,
          priceCurrency: property.price.currency,
          availability: schemaAvailability(property.availability),
          businessFunction: "http://purl.org/goodrelations/v1#Sell",
          url: propertyUrl,
          itemOffered: { "@id": `${propertyUrl}#property` },
          offeredBy: { "@id": `${homeUrl}#organization` },
        },
      },
      residence,
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: homeUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Properties",
            item: propertiesUrl,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: property.title,
            item: propertyUrl,
          },
        ],
      },
    ],
  };
}

export function nonpublicPropertyMetadata(): Metadata {
  return {
    title: "Property not found",
    description: `The requested published listing is not available on ${SITE_NAME}.`,
    alternates: { canonical: null },
    robots: { index: false, follow: false, noarchive: true },
  };
}
