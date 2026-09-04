# Public Properties

Status: implemented public read and Phase 2A interactive-map experience. Last reviewed
2026-09-04.

## Purpose and routes

The property feature lets a visitor discover and evaluate published listings without
exposing internal records:

- `/properties` — searchable, sortable, paginated catalogue
- `/properties/[slug]` — one published listing with specifications, content, gallery
  slots, general-area location and inquiry actions
- `/` — five-field search entry, property-category links and up to three featured
  published listings

The browser renders API data only. There is no decorative property array, seed command
or production listing bundled with the repository. An empty database therefore produces
honest empty states rather than invented inventory.

## Catalogue behaviour

The prominent search surface supports the required Property ID, location, property type,
minimum price and maximum price fields. A progressively disclosed region adds keyword,
sale/rent purpose, minimum bedrooms, minimum bathrooms, minimum lot/floor areas and sort.

Search state lives in the URL, so filtered pages can be linked, reloaded and traversed
with normal browser controls. The frontend keeps only documented scalar keys before
calling the API. The catalogue requests nine items per page and retains active filters
when pagination links change pages.

Facet data augments the location suggestions. If facets fail, the search remains usable
with the core Angeles City/Pampanga suggestions. A facet failure never substitutes
property results. Catalogue outcomes are distinct:

- published matches render responsive cards and a live result count;
- zero matches render a clear-filters action;
- an API or database failure explains that results are unavailable and preserves the
  query in the URL;
- route loading and error boundaries provide non-empty transition and recovery states.

Cards expose only fields supplied by the public summary: reference, location, type,
purpose, price, availability and up to three available specifications. Missing values
are omitted rather than guessed.

## Map discovery behaviour

The map is progressive enhancement around the same URL-backed catalogue, not a second
search state. Selecting one of the 22 city/municipality areas writes its public name to
the `location` query parameter, resets the page and updates both cards and the map-wide
pin request. Clearing the map location removes that same filter. Card hover/focus
highlights an available marker, and marker popups link to the published detail route.

Mobile defaults to List and requires an explicit Map selection. Tablet layouts stack the
views and wide desktop layouts use a split surface. The area selector provides a
keyboard/screen-reader path independent of polygon clicking. Pins cluster when close.

Leaflet, the boundary artifact and `GET /properties/map` are dynamically/lazily loaded;
public entry routes do not eagerly request the boundary file. The catalogue maps only the
already-fetched nine-item result page, so each marker always corresponds to a visible
card. The separate public map endpoint applies allowlisted filters to all published
inventory, returns only records with separately approved points, caps output at 200 and
reports both matching and mappable totals; it is retained for future dedicated map
clients but is not consumed by the current catalogue UI. Boundary and tile failures do
not remove the listing cards.

The checked-in boundary layer contains approximate city/municipality geometry only.
Certified barangay geometry has not been supplied, so no barangay polygons are invented.
Source, licensing and regeneration details are in
[`geographic-data-and-maps.md`](../architecture/geographic-data-and-maps.md).

## API and publication rules

The backend owns validation and always constrains list/detail/facet queries to
`publicationStatus: "published"`. Regex input is escaped, unknown or operator-style
parameters are rejected, page size is bounded and only fixed sort choices are accepted.
Unpublished and missing slugs both resolve as public 404s.

Public projections exclude private street address, internal coordinates, owner
references and internal notes. A listing can expose a separately stored, approved
GeoJSON `publicPoint`; `publicPrecision` controls which textual fields remain visible and
what that point means. The serializer never derives a public point from the internal
coordinate. See the
[public API reference](../api/public-api.md) and
[model contract](../database/property-and-inquiry-models.md) for the complete boundary.

There are no public property create/update/delete endpoints. Authentication,
authorization, staff administration and inventory-management UI are later work and must
precede any such endpoint.

## Property detail behaviour

The stable public route uses the listing slug. The page provides:

- breadcrumbs, title, Property ID, purpose, type, price and general location;
- up to three gallery positions with explicit fallbacks;
- the full description and only the specifications supplied by the record;
- deduplicated highlights, amenities and features when present;
- an interactive map for a separately approved public point, otherwise a stable
  general-area placeholder, plus the listing's precision/privacy explanation;
- links to property-aware inquiry and viewing-request forms; and
- property-specific metadata plus JSON-LD based on the public record.

The viewing action creates no appointment by itself. It carries the Property ID into the
viewing-request form for staff follow-up.

## Media behaviour

When media is absent or its URL is not a local `/...` path, property cards and galleries
render labelled placeholders with stable aspect ratios. The current `PropertyMedia`
renderer supports approved local image paths through `next/image`; it does not yet render
video or floor-plan viewers even though the data contract reserves those media kinds.
See the [media replacement guide](../development/media-replacement.md) before adding
assets.

## Current blockers and exclusions

- No real listings or seed data have been supplied.
- MongoDB schemas and services are implemented, but real project persistence is not yet
  verified.
- No approved logo, property imagery or agent profiles have been supplied.
- Production map-provider selection remains deferred to Phase 2B. Retaining the current
  evaluation tiles would require an appropriate Stadia Maps plan and registered frontend
  domain.
- No certified, licence-compatible barangay boundary dataset has been approved.
- No production listing has a business-reviewed public precision or public point; only
  clearly synthetic browser fixtures exercise markers.
- No auth/admin property-management phase is implemented.
