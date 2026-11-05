# Public Locations

Status: curated four-location index, inventory-backed detail routes and the final
responsive scenery presentation are implemented. Real production property inventory
remains external. Last reviewed 2026-11-04.

## Routes and source of truth

- `/locations` presents four **curated** destinations (Angeles City, Mabalacat City,
  Magalang, Porac). They are permanent navigation targets and are always shown and linked,
  whatever the inventory says. Only their counts and homes come from the backend.
- `/locations/[location]` resolves a stable lowercase slug to a current facet value, or to
  one of the four curated locations when it has no published properties yet (count 0).
  Any other slug returns the public not-found surface.

There is no manual popular-location ranking, neighborhood copy, market statistic or
invented count. Curated descriptions use only the locality's classification, its position
on the Pampanga map and its documented photograph's caption.

## Index composition

The page is light throughout (the shared ivory ground, with one white band) and ends with
the shared `EditorialCta`.

1. A centred, typography-led hero over the supplied architectural elevation
   (`public/images/locations/hero-elevation.svg`, shown unmodified as a decorative
   background image: inert, hidden from assistive tech, text-free). Only its size, position
   and opacity are set in CSS; the hero's height follows the illustration so its roofline
   lands just under the lede at every width. Its call to action scrolls to the featured
   locations.
2. A photographic mosaic of the four curated locations: Angeles City as the dominant tile
   and three supporting tiles, each with the documented locality photograph (place
   imagery), a short description, the inventory line and an `Explore location` action. The
   whole tile is the link. The long credit line is replaced by a collapsed `Photo credits`
   disclosure (creator, licence and source links) so attribution stays available.
3. "Refine the search" (`LocationSearch`, client): eyebrow `Discover by what matters`, a
   horizontal, typography-led strip of four selects and one `Find properties` action. It
   hands the visitor's choices to the real `/properties` catalog and adds no filter of its
   own (see _Search mapping_ below). It has no purpose toggle, map or location directory.
4. "Homes worth exploring" (`LocationShowcase`, server): eyebrow `Current collection`, one
   lead property beside up to three compact supporting ones, taken from the public property
   search (see _Showcase_ below), with `Browse all properties`.

## Search mapping

Every control is a catalog filter; options come from the public facets when they loaded
and fall back to the curated and residential defaults when they did not
(`location-search.ts`).

| Control       | `/properties` parameter | Options                                                         |
| ------------- | ----------------------- | --------------------------------------------------------------- |
| Location      | `location`              | The four curated locations plus any other facet location        |
| Property type | `propertyType`          | Supported sale types from the facets (residential when absent)  |
| Budget        | `minPrice` / `maxPrice` | Fixed PHP bands; bands outside the facet price range are hidden |
| Bedrooms      | `bedrooms` (minimum)    | 2+, 3+, 4+                                                      |

Only chosen filters are serialized, so an empty search opens a clean `/properties`. The
catalog reads the same parameters back into its own form. Without JavaScript the native
GET form still submits location, type and bedrooms.

## Showcase

`pickShowcase` chooses deterministically from the newest published properties (API order,
`sort=newest`, limit 4): the lead is the first listing with a renderable photograph (or the
first listing when none has one) and the rest keep API order. No listing repeats and no
"featured" flag is invented. Cards show only API data (price, location, type, bedrooms,
bathrooms, floor or lot area, non-available status) and link to the real detail page.

- **No photograph** (`hasRenderableImage` false): the lead becomes a typographic plate
  over the villa line art, compact cards become text-led; no development sample photograph
  is substituted.
- **1, 2, 3 or 4 listings**: the grid adapts (single horizontal lead, two equal columns,
  lead plus 2 or 3); a note states `Showing the latest N of M` when more are published.
- **Zero listings** (request succeeded): a compact state with `Browse all properties` and
  `Talk to RC Premier`.
- **Unavailable** (request failed): a distinct state with `Try again` (refreshes the
  route); never shown as zero.

## Inventory states

Counts are the published `locationCounts` from the public facets endpoint, the same figure
each location page shows. The page distinguishes two states and never merges them:

- **`0 properties`**: the request succeeded and the area has no published properties. The
  tile shows `0 properties`; the showcase and the location page explain that nothing is
  published yet and offer `Browse all properties` and `Talk to RC Premier`.
- **`Inventory unavailable`**: the facets request failed (or returned no counts). Tiles
  keep their photographs and links and read `Inventory unavailable`; the search falls back
  to its default options.

The facets and the showcase collection are separate requests, so one failing never
presents the other as empty.

A curated location with no published properties stays reachable at `/locations/[slug]`
but is `noindex` and omitted from the sitemap's inventory-backed set.

## Development previews

Under `next dev`, the shared preview toolbar adds a `Locations` row (`?locationsFixture=`):
`Real`, `0`, `1`, `2`, `4`, `Many` and `Error`: that many active locations (0, 1, 2 or all 4), `Many` being the same four locations with larger counts (12, 8, 5 and 3), and `Error` an unavailable inventory and collection. The showcase receives 0, 1 (no photograph), 2, 3, 4 listings for `0`, `1`, `2`, `4` and `Many`. Fixtures (`locations.fixtures.ts`) are loaded
only through a guarded dynamic import behind the literal `process.env.NODE_ENV ===
"development"` check, so production builds drop them, a failed real request never falls
back to them, and production ignores the parameter. The four curated tiles render in every
scenario.

## Location detail

Every supported detail route uses its reusable locality scenery as the lead hero image,
with visible creator/source/license attribution. A typed slug-to-content structure owns
the factual title/caption, local path, alternative text, creator, source and license. The
short introduction leads with the place, current published inventory and available next
steps. It deliberately avoids popularity, neighborhood, travel, history and market claims
that are not supported by project data, and keeps only one concise public-location/privacy
disclosure. The inventory facts beside the hero remain derived from the current facet
count. Asset
provenance is recorded in
[`location-editorial-assets.md`](location-editorial-assets.md).

Location detail reuses the existing property query normalization, bounded nine-record
page size, strict first-value handling for repeated scalar filters, active filter chips,
sort options, pagination, invalid-page recovery, property cards, and the exact same lazy
Leaflet catalog-map engine used by `/properties`. The route location is the initial map
focus and fixed request filter; map markers and cards share active state, and selecting a
different area navigates to that area's canonical location route while retaining other
safe filters.
The route fixes its location from the validated path and never accepts a query value as
the location source of truth. Property links may carry a validated location-results URL
for Back to Results without changing the property's canonical URL.

## Privacy, SEO, and responsive behavior

Location pages consume public facet and property DTOs only. They never receive or render
`privateAddress`, internal coordinates, staff notes, or other private property data. Map
markers remain limited to independently approved `publicPoint` values and the established
public precision contract.

The location index and positive-count detail routes are canonical and included in the
bounded sitemap; curated locations with no published properties are `noindex`. Filtered detail states are `noindex, follow`; invalid locations have no
canonical. Detail JSON-LD is a breadcrumb containing public names and URLs only.

Wide screens use editorial image/text compositions and a map/list split. Tablet layouts
stack usable full-width surfaces. Mobile uses single-column cards, naturally sized maps,
touch-sized filters and controls, and no page-level horizontal scrolling. The shared
light visual system, focus indicators, reduced-motion behavior, header, and footer remain
the Part 1 implementation.
