# Public Locations

Status: inventory-backed index/detail routes and the final responsive scenery
presentation are implemented. Real production property inventory remains external. Last
reviewed 2026-09-12.

## Routes and source of truth

- `/locations` lists only positive-count locations returned by the bounded public
  property facets endpoint.
- `/locations/[location]` resolves a stable lowercase slug back to one of those current
  facet values and renders its published residential-sale inventory.

There is no manual popular-location list, ranking, neighborhood copy, or count. A facet
failure produces an unavailable state rather than invented content; an unsupported slug
returns the public not-found surface.

## Discovery behavior

The index introduction uses one full-width text panel at every breakpoint. The removed
line drawing has no remaining grid slot or fixed-height gap; the existing brand surface,
typography, and content spacing carry the introduction. Every inventory-backed card uses the locality's
documented reusable photograph with a brand-color hover/focus overlay; required names and
counts are always visible. The homepage uses the same content lookup for up to six real
facet locations.

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
bounded sitemap. Filtered detail states are `noindex, follow`; invalid locations have no
canonical. Detail JSON-LD is a breadcrumb containing public names and URLs only.

Wide screens use editorial image/text compositions and a map/list split. Tablet layouts
stack usable full-width surfaces. Mobile uses single-column cards, naturally sized maps,
touch-sized filters and controls, and no page-level horizontal scrolling. The shared
light visual system, focus indicators, reduced-motion behavior, header, and footer remain
the Part 1 implementation.
