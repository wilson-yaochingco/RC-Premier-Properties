import type { PublicPropertySummary } from "@rc/shared";
import type { MetadataRoute } from "next";
import { getProperties, getPropertyFacets } from "./property.service";
import { SITE_URL } from "../../lib/env";
import { buildPublicSitemap } from "../../lib/seo";

export const SITEMAP_API_PAGE_SIZE = 48;
export const SITEMAP_API_PAGES_PER_SHARD = 20;
const SITEMAP_FETCH_CONCURRENCY = 4;

export interface PropertySitemapDependencies {
  siteUrl?: string;
  getProperties: typeof getProperties;
  getPropertyFacets: typeof getPropertyFacets;
}

const propertySitemapDependencies: PropertySitemapDependencies = {
  siteUrl: SITE_URL,
  getProperties,
  getPropertyFacets,
};

export function sitemapShardCount(totalApiPages: number): number {
  return Math.max(1, Math.ceil(totalApiPages / SITEMAP_API_PAGES_PER_SHARD));
}

export function sitemapApiPages(shard: number, totalApiPages?: number): number[] {
  const first = shard * SITEMAP_API_PAGES_PER_SHARD + 1;
  const exclusiveEnd = first + SITEMAP_API_PAGES_PER_SHARD;
  const end =
    totalApiPages === undefined
      ? exclusiveEnd
      : Math.min(exclusiveEnd, totalApiPages + 1);
  return Array.from({ length: Math.max(0, end - first) }, (_, index) => first + index);
}

export async function getSitemapIndexUrls(
  dependencies: PropertySitemapDependencies = propertySitemapDependencies,
): Promise<string[]> {
  if (!dependencies.siteUrl) return [];
  const firstPage = await dependencies.getProperties(
    {
      page: "1",
    },
    undefined,
    SITEMAP_API_PAGE_SIZE,
  );
  return Array.from(
    { length: sitemapShardCount(firstPage.pagination.totalPages) },
    (_, shard) => `${dependencies.siteUrl}/sitemaps/${shard}.xml`,
  );
}

export async function getSitemapShard(
  shard: number,
  dependencies: PropertySitemapDependencies = propertySitemapDependencies,
): Promise<MetadataRoute.Sitemap> {
  if (!dependencies.siteUrl) return [];
  const pages = sitemapApiPages(shard);
  const properties: PublicPropertySummary[] = [];
  const firstPageNumber = pages[0]!;
  const firstPage = await dependencies.getProperties(
    {
      page: String(firstPageNumber),
    },
    undefined,
    SITEMAP_API_PAGE_SIZE,
  );
  properties.push(...firstPage.items);
  const remainingPages = sitemapApiPages(shard, firstPage.pagination.totalPages).slice(
    1,
  );
  for (
    let firstPending = 0;
    firstPending < remainingPages.length;
    firstPending += SITEMAP_FETCH_CONCURRENCY
  ) {
    const batch = await Promise.all(
      remainingPages
        .slice(firstPending, firstPending + SITEMAP_FETCH_CONCURRENCY)
        .map((page) =>
          dependencies.getProperties(
            {
              page: String(page),
            },
            undefined,
            SITEMAP_API_PAGE_SIZE,
          ),
        ),
    );
    properties.push(...batch.flatMap((result) => result.items));
    if (
      batch.some(
        (result) => result.pagination.totalPages < remainingPages[firstPending]!,
      )
    ) {
      break;
    }
  }

  const locations =
    shard === 0 ? ((await dependencies.getPropertyFacets()).locationCounts ?? []) : [];
  return buildPublicSitemap(properties, locations, dependencies.siteUrl, {
    includeStaticRoutes: shard === 0,
  });
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function serializeSitemapIndex(urls: string[]): string {
  const entries = urls
    .map((url) => `<sitemap><loc>${escapeXml(url)}</loc></sitemap>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</sitemapindex>`;
}

export function serializeSitemap(entries: MetadataRoute.Sitemap): string {
  const urls = entries
    .map((entry) => {
      const lastModified = entry.lastModified
        ? `<lastmod>${escapeXml(new Date(entry.lastModified).toISOString())}</lastmod>`
        : "";
      const changeFrequency = entry.changeFrequency
        ? `<changefreq>${entry.changeFrequency}</changefreq>`
        : "";
      const priority =
        entry.priority === undefined ? "" : `<priority>${entry.priority}</priority>`;
      return `<url><loc>${escapeXml(entry.url)}</loc>${lastModified}${changeFrequency}${priority}</url>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

export const SITEMAP_RESPONSE_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
} as const;
