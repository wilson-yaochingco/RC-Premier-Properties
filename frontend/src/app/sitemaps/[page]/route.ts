import {
  getSitemapShard,
  serializeSitemap,
  SITEMAP_RESPONSE_HEADERS,
} from "@/features/properties/property-sitemap";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ page: string }> },
): Promise<Response> {
  const { page } = await params;
  const match = /^(0|[1-9]\d{0,5})\.xml$/.exec(page);
  if (!match?.[1]) {
    return new Response("Sitemap shard not found.", { status: 404 });
  }
  try {
    return new Response(serializeSitemap(await getSitemapShard(Number(match[1]))), {
      headers: SITEMAP_RESPONSE_HEADERS,
    });
  } catch {
    return new Response("Sitemap shard is temporarily unavailable.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
