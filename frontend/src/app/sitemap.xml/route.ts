import {
  getSitemapIndexUrls,
  serializeSitemapIndex,
  SITEMAP_RESPONSE_HEADERS,
} from "@/features/properties/property-sitemap";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    return new Response(serializeSitemapIndex(await getSitemapIndexUrls()), {
      headers: SITEMAP_RESPONSE_HEADERS,
    });
  } catch {
    return new Response("Sitemap index is temporarily unavailable.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
