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

1. A centred, typography-led hero over a custom architectural line drawing of a two-storey
   residence (`LocationHouse`, original inline SVG: decorative, text-free, non-interactive,
   low contrast). Its call to action scrolls to the featured locations.
2. A charcoal photographic mosaic: Angeles City as the dominant tile and three supporting
   tiles, each with the documented locality photograph (credits for creator, source and
   licence beneath), a short description, an inventory line and an `Explore location`
   action. The whole tile is the link.
3. A light Pampanga explorer: real buttons choose a curated location, preview its region on
   the generated map and fill a contextual panel. The map is a pointer shortcut only and
   carries no focusable elements. Boundary-data attribution is kept.
4. Homes by location: a four-location selector over up to three published properties per
   area, rendered on the server with the existing property cards, linking to their real
   detail pages. A `View all in …` link and `Browse all properties` stay available.
5. The shared `EditorialCta` and footer.

## Inventory states

Counts are the published `locationCounts` from the public facets endpoint, the same figure
each location page shows. The page distinguishes two states and never merges them:

- **`0 properties`**: the request succeeded and the area has no published properties. The
  tile shows `0 properties`; the homes panel and the location page explain that nothing is
  published yet and offer `Browse all properties` and `Talk to RC Premier`.
- **`Inventory unavailable`**: the facets request failed (or returned no counts), or that
  area's homes request failed. Tiles keep their photographs and links; the homes panel says
  the service did not respond, offers `Try again`, and substitutes no sample homes.

A curated location with no published properties stays reachable at `/locations/[slug]`
but is `noindex` and omitted from the sitemap's inventory-backed set.

## Development previews

Under `next dev`, the shared preview toolbar adds a `Locations` row (`?locationsFixture=`):
`Real`, `0`, `1`, `2`, `4`, `Many` and `Error`: that many active locations (0, 1, 2 or all 4), `Many` being the same four locations with larger counts (12, 8, 5 and 3), and `Error` an unavailable inventory. Fixtures (`locations.fixtures.ts`) are loaded
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
