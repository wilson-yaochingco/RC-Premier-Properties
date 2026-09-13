import type { Metadata } from "next";
import { absoluteSiteUrl, buildPageMetadata, SITE_NAME } from "@/lib/seo";
import { publicLocationPath, shortPublicLocation } from "@/lib/public-location";

export function buildLocationsMetadata(imagePath: string): Metadata {
  return buildPageMetadata({
    title: "Locations",
    description:
      "Explore Pampanga locations represented by current published RC Premier Properties inventory.",
    canonicalPath: "/locations",
    imagePath,
  });
}

export function buildLocationMetadata({
  location,
  count,
  imagePath,
  noIndex,
}: {
  location: string;
  count: number;
  imagePath: string;
  noIndex: boolean;
}): Metadata {
  const name = shortPublicLocation(location);
  return buildPageMetadata({
    title: `Properties for Sale in ${name}`,
    description: `Browse ${count.toLocaleString("en-PH")} published residential ${count === 1 ? "property" : "properties"} for sale in ${location}.`,
    canonicalPath: publicLocationPath(location),
    imagePath,
    noIndex,
  });
}

export function nonpublicLocationMetadata(): Metadata {
  return {
    title: "Location not found",
    description: `The requested published location is not available on ${SITE_NAME}.`,
    alternates: { canonical: null },
    robots: { index: false, follow: false, noarchive: true },
  };
}

export function buildLocationStructuredData(location: string) {
  const homeUrl = absoluteSiteUrl("/");
  const locationsUrl = absoluteSiteUrl("/locations");
  const locationUrl = absoluteSiteUrl(publicLocationPath(location));
  if (!homeUrl || !locationsUrl || !locationUrl) return undefined;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: homeUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Locations",
        item: locationsUrl,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: shortPublicLocation(location),
        item: locationUrl,
      },
    ],
  };
}
