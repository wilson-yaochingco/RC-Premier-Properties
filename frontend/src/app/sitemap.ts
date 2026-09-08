import type { MetadataRoute } from "next";
import {
  getProperties,
  getPropertyFacets,
} from "@/features/properties/property.service";
import { SITE_URL } from "@/lib/env";
import { buildPublicSitemap } from "@/lib/seo";

export const dynamic = "force-dynamic";

const SITEMAP_PAGE_SIZE = "48";
const SITEMAP_FETCH_CONCURRENCY = 4;

async function getPublishedSitemapProperties() {
  const firstPage = await getProperties({ page: "1", limit: SITEMAP_PAGE_SIZE });
  const pages = [firstPage];
  for (
    let firstPendingPage = 2;
    firstPendingPage <= firstPage.pagination.totalPages;
    firstPendingPage += SITEMAP_FETCH_CONCURRENCY
  ) {
    const lastPendingPage = Math.min(
      firstPage.pagination.totalPages,
      firstPendingPage + SITEMAP_FETCH_CONCURRENCY - 1,
    );
    const batch = await Promise.all(
      Array.from({ length: lastPendingPage - firstPendingPage + 1 }, (_, index) =>
        getProperties({
          page: String(firstPendingPage + index),
          limit: SITEMAP_PAGE_SIZE,
        }),
      ),
    );
    pages.push(...batch);
  }
  return pages.flatMap((result) => result.items);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!SITE_URL) return [];

  try {
    const [properties, facets] = await Promise.all([
      getPublishedSitemapProperties(),
      getPropertyFacets(),
    ]);
    return buildPublicSitemap(properties, facets.locationCounts ?? [], SITE_URL);
  } catch {
    // Static public routes remain discoverable when the inventory API is temporarily
    // unavailable; no guessed property or location URL is emitted.
    return buildPublicSitemap([], [], SITE_URL);
  }
}
