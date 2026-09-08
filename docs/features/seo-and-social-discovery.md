# SEO and Social Discovery

Status: Level 8 engineering implemented; the final production origin, live inventory,
production property media/CDN, and deployment-only crawler validation remain external
gates. Last reviewed 2026-09-08.

This document describes the user-requested Level 8 delivery slice. It does not authorize
Level 9 accessibility/browser work or any deferred roadmap feature.

## Metadata and canonical architecture

Next.js App Router metadata remains the only metadata system. `frontend/src/lib/env.ts`
normalizes `NEXT_PUBLIC_SITE_URL`; `frontend/src/lib/seo.ts` uses that one origin for
canonical URLs, Open Graph URLs and images, Twitter cards, JSON-LD, robots sitemap
references, and sitemap entries. Page metadata shares one builder so title, description,
canonical, Open Graph, and Twitter values cannot drift into parallel implementations.

Local development and tests may use HTTP localhost origins. In an optimized production
runtime, a missing, malformed, credential-bearing, path-bearing, or literal localhost
site URL resolves to no public origin. URL-bearing metadata, JSON-LD, and sitemap entries
are then omitted instead of advertising a development host. This safe state keeps builds
possible while making the unresolved production domain a visible deployment blocker.
Production must set an approved HTTPS origin at build time and rebuild the frontend;
the final domain has not been supplied and is not invented here.

Indexable public routes are `/`, `/properties`, inventory-backed location discovery,
`/properties/[slug]`, `/about`, `/contact`, `/sell`, and `/book-viewing`. Contact and
viewing `propertyId` query values prefill the existing forms but canonicalize to their
base pages; no submission or customer state enters metadata. Invalid and nonpublic
property routes return 404 and `noindex` metadata.

React request memoization shares the published-property read between metadata and page
rendering. Invalid/nonpublic detail requests render the existing framework not-found
surface with `noindex` and no stale canonical or property metadata; the public API lookup
itself returns 404.

## Search and location policy

The unfiltered catalog is canonical at `/properties`. Keyword, price, type, bedroom,
bathroom, area, sort, non-default pagination, unknown parameters, and combined-filter
states canonicalize to the base catalog and receive `noindex, follow`. This prevents a
crawl surface for arbitrary query combinations while preserving links to property
details.

Location discovery is the only filter exception. A location state is indexable only when
the public sales-only facets contain exactly one matching city/location with a positive
published count and the URL has no substantive filter beyond location. Default
`purpose=sale`, `sort=newest`, and `page=1` values may be normalized away. The canonical
query uses the API's inventory-derived `City, Province` label. Its title, description,
heading, and count are derived from that facet; unsupported or ambiguous locations are
`noindex` and canonicalize to `/properties`. No location route, count, or coordinate is
fabricated.

## Social previews

General pages use the most relevant existing, authorized Level 7 website photograph as a
large-card fallback. No new logo artwork, AI imagery, random web image, competitor media,
or development sample is used. Property previews prefer a safe production cover image,
then other legitimate property image metadata, then the approved catalog photograph.
Local property URLs are made absolute through the public origin; remote listing media
must be HTTPS and cannot contain credentials. Media explicitly marked
`development-sample` is rejected from social output.

Open Graph includes site name, `en_PH`, canonical URL, title, description, and image when
an absolute safe image URL is available. Twitter uses the same source and a large card
when an image is available. The official Facebook Page is represented only as the
Organization `sameAs` URL. No Facebook App ID, Messenger ID, or personal profile is
invented.

## Structured data

The homepage emits one JSON-LD graph containing `Organization` and `WebSite`. It uses only
the approved name, email, telephone, Pampanga service area, official logo, canonical
origin, and exact supplied Facebook Page. It intentionally omits address, coordinates,
hours, founder, awards, ratings, reviews, and `SearchAction`.

Published property details emit `Product` with the public title, Property ID, property
type, short description, public URL, price/currency, supported availability, optional
safe production images, selected public specifications, and city/province service area.
Availability maps to `InStock`, `LimitedAvailability`, or `SoldOut` for Available,
Reserved, or Sold. Unknown fields are omitted. A matching `BreadcrumbList` represents
the real Home -> Properties -> property hierarchy. Exact/private addresses, barangays,
public or private coordinates, internal IDs/notes, owners, staff, and customer data are
never selected for JSON-LD.

The three supplied YouTube Shorts retain crawlable external links, useful player labels,
semantic section context, and the Level 7 click-to-load privacy facade. `VideoObject` is
intentionally omitted because verified names, thumbnails, upload dates, and durations
were not supplied in repository-owned metadata; those values are not fabricated.

## Robots, noindex, and sitemap

`robots.txt` allows intended public routes and disallows `/admin` and `/api`. It includes
the absolute sitemap reference only when the public origin is safe. This is discovery
guidance, not access control: application authentication and authorization remain the
security boundary.

The admin layout supplies explicit `noindex, nofollow, noarchive`; production response
headers independently add `X-Robots-Tag` and private/no-store caching to `/admin/**`.
Global and property not-found surfaces are also noindex. The public backend returns only
published sales records, so draft, unpublished, archived, rental, missing, and malformed
slugs cannot render indexable property content.

`sitemap.xml` is generated at request time. It contains the canonical static public
routes, positive-count location canonicals from public facets, and every sales-only
published property returned across public API pagination. Property `publishedAt` is the
only listing timestamp used for `lastModified`; invalid or unavailable timestamps are
omitted. Slugs are validated and deduplicated. Admin, API, auth, previews, arbitrary
filters, rentals, and guessed inventory are never included. If inventory retrieval
fails, generation returns static public routes only rather than exposing nonpublic or
fabricated data.

## Independent public-data boundary

SEO helpers filter sitemap records to `purpose=sale` even though the public frontend
always requests sales inventory. More importantly, the backend public search, facets,
map, and slug-detail paths independently enforce `publicationStatus=published` and
`purpose=sale`. Their projection/serializer omit private address, internal coordinates,
owner references, internal notes, customer inquiries/viewings, staff data, and auth or
session state. SEO output consumes only that public contract.

## Verification coverage and external gates

Focused Vitest coverage exercises origin refusal, canonical generation, crawl-explosion
policy, real location matching, social-media selection, availability mapping, structured
data privacy, exact business data, and sales-only sitemap filtering. Playwright inspects
rendered titles, descriptions, canonicals, Open Graph/Twitter tags, JSON-LD, robots,
admin noindex response/header behavior, runtime sitemap inclusion/exclusion, and safe
property not-found output. Existing backend/API and Levels 1-7 tests remain part of the
full gate.

External launch gates remain:

- supply and configure the approved production HTTPS origin;
- supply real published inventory and listing-specific property media;
- select/configure the production object-storage/CDN host;
- validate deployed pages with search-engine and Facebook sharing tools after DNS and
  public deployment exist.

No third-party rich-result, crawler, or social-preview validator is claimed as passed.
