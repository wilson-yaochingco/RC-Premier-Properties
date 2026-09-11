import type { Metadata, MetadataRoute } from "next";
import type { PublicPropertySummary } from "@rc/shared";
import { SITE_URL } from "./env";
import {
  OFFICIAL_EMAIL,
  OFFICIAL_FACEBOOK_URL,
  OFFICIAL_PHONE,
  OFFICIAL_SOCIAL_LINKS,
} from "./public-contact";
import { publicLocationPath } from "./public-location";

export const SITE_NAME = "RC Premier Properties";
export { OFFICIAL_EMAIL, OFFICIAL_FACEBOOK_URL, OFFICIAL_PHONE };

export interface PageMetadataInput {
  title: string;
  description: string;
  canonicalPath: string;
  imagePath?: string;
  noIndex?: boolean;
}

export function absoluteSiteUrl(
  path: string,
  siteUrl: string | undefined = SITE_URL,
): string | undefined {
  if (!siteUrl) return undefined;
  try {
    return new URL(path, `${siteUrl}/`).toString();
  } catch {
    return undefined;
  }
}

export function buildPageMetadata({
  title,
  description,
  canonicalPath,
  imagePath,
  noIndex = false,
}: PageMetadataInput): Metadata {
  const canonical = absoluteSiteUrl(canonicalPath);
  const image = imagePath ? absoluteSiteUrl(imagePath) : undefined;
  const socialTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    ...(canonical ? { alternates: { canonical } } : {}),
    ...(noIndex ? { robots: { index: false, follow: true, noarchive: true } } : {}),
    openGraph: {
      title: socialTitle,
      description,
      type: "website",
      siteName: SITE_NAME,
      locale: "en_PH",
      ...(canonical ? { url: canonical } : {}),
      ...(image ? { images: [{ url: image, alt: SITE_NAME }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: socialTitle,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export function buildSiteStructuredData(logoPath: string) {
  const siteUrl = SITE_URL;
  const logo = absoluteSiteUrl(logoPath);
  if (!siteUrl || !logo) return undefined;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: SITE_NAME,
        url: siteUrl,
        logo,
        email: OFFICIAL_EMAIL,
        telephone: OFFICIAL_PHONE,
        areaServed: {
          "@type": "AdministrativeArea",
          name: "Pampanga, Philippines",
        },
        sameAs: OFFICIAL_SOCIAL_LINKS.map((link) => link.href),
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: SITE_NAME,
        inLanguage: "en-PH",
        publisher: { "@id": `${siteUrl}/#organization` },
      },
    ],
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

const PUBLIC_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function buildPublicSitemap(
  properties: PublicPropertySummary[],
  locations: Array<{ location: string; count: number }>,
  siteUrl: string | undefined = SITE_URL,
  options: { includeStaticRoutes?: boolean } = {},
): MetadataRoute.Sitemap {
  if (!siteUrl) return [];

  const staticRoutes = [
    { path: "", changeFrequency: "weekly", priority: 1 },
    { path: "/properties", changeFrequency: "weekly", priority: 0.9 },
    { path: "/locations", changeFrequency: "weekly", priority: 0.85 },
    { path: "/about", changeFrequency: "monthly", priority: 0.7 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.7 },
    { path: "/sell", changeFrequency: "monthly", priority: 0.7 },
    { path: "/book-viewing", changeFrequency: "monthly", priority: 0.7 },
  ] as const;
  const entries: MetadataRoute.Sitemap =
    options.includeStaticRoutes === false
      ? []
      : staticRoutes.map((route) => ({
          url: `${siteUrl}${route.path}`,
          changeFrequency: route.changeFrequency,
          priority: route.priority,
        }));

  const seenLocations = new Set<string>();
  for (const item of locations) {
    const location = item.location.trim();
    const key = location.toLocaleLowerCase("en-US");
    if (!location || item.count < 1 || seenLocations.has(key)) continue;
    seenLocations.add(key);
    const query = new URLSearchParams({ location });
    entries.push({
      url: `${siteUrl}/properties?${query.toString()}`,
      changeFrequency: "weekly",
      priority: 0.8,
    });
    entries.push({
      url: `${siteUrl}${publicLocationPath(location)}`,
      changeFrequency: "weekly",
      priority: 0.85,
    });
  }

  const seenSlugs = new Set<string>();
  for (const property of properties) {
    if (
      property.purpose !== "sale" ||
      !PUBLIC_SLUG.test(property.slug) ||
      seenSlugs.has(property.slug)
    ) {
      continue;
    }
    seenSlugs.add(property.slug);
    const publishedAt = new Date(property.publishedAt);
    entries.push({
      url: `${siteUrl}/properties/${property.slug}`,
      ...(Number.isNaN(publishedAt.valueOf()) ? {} : { lastModified: publishedAt }),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  return entries;
}
