import type { Metadata, MetadataRoute } from "next";
import type { PublicPropertySummary } from "@rc/shared";
import { SITE_URL } from "./env";

export const SITE_NAME = "RC Premier Properties";
export const OFFICIAL_EMAIL = "rcpremierph@gmail.com";
export const OFFICIAL_PHONE = "+63 918 429 1873";
export const OFFICIAL_FACEBOOK_URL =
  "https://www.facebook.com/people/RC-Premier-Properties/61588365958516/";

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
        sameAs: [OFFICIAL_FACEBOOK_URL],
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
): MetadataRoute.Sitemap {
  if (!siteUrl) return [];

  const staticRoutes = [
    { path: "", changeFrequency: "weekly", priority: 1 },
    { path: "/properties", changeFrequency: "weekly", priority: 0.9 },
    { path: "/about", changeFrequency: "monthly", priority: 0.7 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.7 },
    { path: "/sell", changeFrequency: "monthly", priority: 0.7 },
    { path: "/book-viewing", changeFrequency: "monthly", priority: 0.7 },
  ] as const;
  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
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
