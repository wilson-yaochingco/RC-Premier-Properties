# Public Locations

Status: Part 2 inventory-backed location index and detail routes implemented. Real
production inventory and location-specific editorial media remain external. Last
reviewed 2026-09-11.

## Routes and source of truth

- `/locations` lists only positive-count locations returned by the bounded public
  property facets endpoint.
- `/locations/[location]` resolves a stable lowercase slug back to one of those current
  facet values and renders its published residential-sale inventory.

There is no manual popular-location list, ranking, neighborhood copy, or count. A facet
failure produces an unavailable state rather than invented content; an unsupported slug
returns the public not-found surface.

## Discovery behavior

The index uses the supplied Part 2 location-grid reference for composition and cycles
only existing approved RC Premier design photography as decorative tile media. Those
photographs are not represented as documentary images of a specific municipality. The
reference site's photographs and location claims are not copied.

Location detail reuses the existing property query normalization, bounded nine-record
page size, strict first-value handling for repeated scalar filters, active filter chips,
sort options, pagination, invalid-page recovery, property cards, and lazy Leaflet map.
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
