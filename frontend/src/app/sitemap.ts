import type { MetadataRoute } from "next";
import {
  getProperties,
  getPropertyFacets,
} from "@/features/properties/property.service";
import { SITE_URL } from "@/lib/env";
import { buildPublicSitemap } from "@/lib/seo";

export const dynamic = "force-dynamic";

async function getPublishedSitemapProperties() {
  const firstPage = await getProperties({ page: "1" });
  const pages = [firstPage];
  for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
    pages.push(await getProperties({ page: String(page) }));
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
