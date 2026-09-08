import type {
  PropertyAvailability,
  PropertyFacetsResponse,
  PublicPropertyDetail,
  PublicPropertyMedia,
} from "@rc/shared";
import type { Metadata } from "next";
import { absoluteSiteUrl, buildPageMetadata, SITE_NAME } from "../../lib/seo";
import { isApprovedProductionMediaUrl } from "../../lib/env";
import { propertyTypeLabel } from "./property-format";
import type { RawSearchParams } from "./property-query";

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

  const [{ location, count }] = matches;
  return {
    indexable: true,
    location,
    count,
    canonicalPath: `/properties?${new URLSearchParams({ location }).toString()}`,
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
    ? `Browse published residential properties for sale in ${state.location} with RC Premier Properties.`
    : "Browse published houses and residential properties for sale across Pampanga with RC Premier Properties.";

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
  if (media.url.startsWith("/")) {
    return absoluteSiteUrl(media.url);
  }
  return media.url;
}

function propertyImageUrls(property: PublicPropertyDetail): string[] {
  return [property.coverMedia, ...property.gallery]
    .map(publicPropertyImageUrl)
    .filter((url): url is string => Boolean(url))
    .filter((url, index, urls) => urls.indexOf(url) === index);
}

export function buildPropertyMetadata(
  property: PublicPropertyDetail,
  defaultImagePath: string,
): Metadata {
  const propertyImage = propertyImageUrls(property)[0];
  const metadata = buildPageMetadata({
    title: property.title,
    description: property.shortDescription.slice(0, 160),
    canonicalPath: `/properties/${property.slug}`,
    imagePath: propertyImage ?? defaultImagePath,
  });

  if (propertyImage && metadata.openGraph && !Array.isArray(metadata.openGraph)) {
    metadata.openGraph.images = [
      { url: propertyImage, alt: property.coverMedia?.alt ?? property.title },
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

export function buildPropertyStructuredData(property: PublicPropertyDetail) {
  const propertyUrl = absoluteSiteUrl(`/properties/${property.slug}`);
  const propertiesUrl = absoluteSiteUrl("/properties");
  const homeUrl = absoluteSiteUrl("/");
  if (!propertyUrl || !propertiesUrl || !homeUrl) return undefined;

  const images = propertyImageUrls(property);
  const additionalProperty = [
    property.specifications.bedrooms === undefined
      ? undefined
      : {
          "@type": "PropertyValue",
          name: "Bedrooms",
          value: property.specifications.bedrooms,
        },
    property.specifications.bathrooms === undefined
      ? undefined
      : {
          "@type": "PropertyValue",
          name: "Bathrooms",
          value: property.specifications.bathrooms,
        },
    property.specifications.lotAreaSqm === undefined
      ? undefined
      : {
          "@type": "PropertyValue",
          name: "Lot area",
          value: property.specifications.lotAreaSqm,
          unitCode: "MTK",
        },
    property.specifications.floorAreaSqm === undefined
      ? undefined
      : {
          "@type": "PropertyValue",
          name: "Floor area",
          value: property.specifications.floorAreaSqm,
          unitCode: "MTK",
        },
  ].filter((item) => item !== undefined);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${propertyUrl}#property`,
        name: property.title,
        description: property.shortDescription,
        sku: property.propertyId,
        category: propertyTypeLabel(property.propertyType),
        url: propertyUrl,
        ...(images.length > 0 ? { image: images } : {}),
        areaServed: {
          "@type": "AdministrativeArea",
          name: `${property.location.city}, ${property.location.province}`,
        },
        ...(additionalProperty.length > 0 ? { additionalProperty } : {}),
        offers: {
          "@type": "Offer",
          price: property.price.amount,
          priceCurrency: property.price.currency,
          availability: schemaAvailability(property.availability),
          url: propertyUrl,
          seller: { "@id": `${homeUrl}#organization` },
        },
      },
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
            name: `Premier Property #${property.propertyId}`,
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
