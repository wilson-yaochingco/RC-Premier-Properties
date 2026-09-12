# Public Properties

Status: implemented public read, Level 15 discovery/detail enhancements, Phase 2A
interactive-map experience, and Part 2 visual reconstruction. Live Atlas persistence
verified; real inventory remains unsupplied. Last reviewed 2026-09-11.

## Purpose and routes

The property feature lets a visitor discover and evaluate published listings without
exposing internal records:

- `/properties` — searchable, sortable, paginated catalog
- `/properties/[slug]` — one published listing with specifications, content, gallery
  slots, general-area location and inquiry actions
- `/locations` — a bounded, inventory-derived location index
- `/locations/[location]` — one canonical location with its filtered published inventory
- `/` — sales-focused entry, up to three featured published listings, and
  inventory-derived location links/counts

The browser renders API data only. There is no decorative property array, seed command
or production listing bundled with the repository. An empty database therefore produces
honest empty states rather than invented inventory.

The home Featured section requests exactly the first three `featured=true`, published
sale listings. Sold, unpublished, and archived records are excluded; reserved listings
remain eligible. Results use staff-assigned descending Featured priority, then
`publishedAt` and the stable database ID as deterministic tie breakers. The existing
public property summary and media renderer remain the only card data source.

## Catalog behavior

The search surface supports Property ID, location, residential property type,
availability, minimum price and maximum price fields. A progressively disclosed region
adds keyword, minimum bedrooms, minimum bathrooms, minimum lot/floor areas and sort. The
public experience is sales-only: the frontend always requests `purpose=sale`, and public
backend list, map, facet, detail, related, and viewing-eligibility queries independently
enforce sale plus the approved `house-and-lot`, `townhouse`, and `lot` types. Historical
rental, condominium, apartment, and commercial values remain readable only for deliberate
private reconciliation; they cannot enter production-visible workflows.

Search state lives in the URL, so filtered pages can be linked, reloaded and traversed
with normal browser controls. The frontend keeps only documented scalar keys before
calling the API and consistently uses the first value when a scalar parameter is
repeated. The catalog requests nine items per page and retains active filters
when pagination links change pages. Active filters and non-default sort render as
keyboard-accessible removable chips; removing one resets pagination while retaining the
other normalized URL state, and **Clear all** returns to the unfiltered catalog.

If a once-valid filtered URL points beyond the current last page after inventory changes,
the server redirects to that last real page instead of presenting a false zero-match
state. Page size is an internal call-site policy: browser query strings cannot override
the nine-item catalog bound. The sitemap traversal explicitly requests the supported
48-item maximum and therefore does not silently serialize catalog-sized pages.

Location and property-type choices come only from real eligible inventory facets. The
location aggregation is bounded to the canonical 22 Pampanga areas before values enter
the response, rather than accumulating every legacy location in one document. If
facets fail, free-text location and all numeric/status controls remain usable; no manual
"popular" locations or property types are substituted. A facet failure never substitutes
property results. Catalog outcomes are distinct:

- published matches render responsive cards and a live result count;
- zero matches render a clear-filters action;
- an API or database failure explains that results are unavailable and preserves the
  query in the URL;
- route loading and error boundaries provide non-empty transition and recovery states.

Cards expose only fields supplied by the public summary: reference, location, type,
sale purpose, PHP price, availability and up to three available specifications. Missing
values are omitted rather than guessed; no popularity or recommendation badge exists.

The Part 2 catalog reskin uses a compact Figma-led search toolbar and split map/list
composition on wide screens. Every original filter remains present: secondary filters
sit in a native disclosure panel, sort remains directly reachable, active chips retain
their one-filter removal behavior, and mobile switches intentionally between full-width
list and map views.

## Map discovery behavior

The map is progressive enhancement around the same URL-backed catalog, not a second
search state. Selecting one of the 22 city/municipality areas writes its public name to
the `location` query parameter, resets the page and updates both cards and the map-wide
pin request. Clearing the map location removes that same filter. Card hover/focus
highlights an available marker, and marker popups link to the published detail route.

Mobile defaults to List and requires an explicit Map selection. Tablet layouts stack the
views and wide desktop layouts use a split surface. The area selector provides a
keyboard/screen-reader path independent of polygon clicking. Below zoom 11 one accessible
locality marker appears for each of the 22 real boundaries and displays the filtered
published count, including zero. Selecting it fits the area and crosses into approved
public property pins; zooming back out deterministically restores aggregate markers.
Popup cards add public cover media, available specifications and availability while the
list remains the accessible primary path.

Leaflet, the boundary artifact and `GET /properties/map` are dynamically/lazily loaded;
public entry routes do not eagerly request the boundary file. The catalog initially has
its already-fetched result page as a safe fallback. Its lazy public map endpoint then
applies allowlisted filters to all published inventory, returns only records with
separately approved points, caps output at 200, reports matching and mappable totals, and
returns bounded public-city counts for aggregation. Boundary and tile failures do not
remove the listing cards.

The checked-in boundary layer contains approximate city/municipality geometry only.
Certified barangay geometry has not been supplied, so no barangay polygons are invented.
Source, licensing and regeneration details are in
[`geographic-data-and-maps.md`](../architecture/geographic-data-and-maps.md).

## API and publication rules

The backend owns validation and always constrains list/map/detail/facet/related queries to
published residential sale inventory. Regex input is escaped, unknown or operator-style
parameters are rejected, page size is bounded and only newest, price-low-to-high, and
price-high-to-low deterministic sorts are accepted. Unpublished, disallowed historical,
and missing slugs all resolve as public 404s.

Public projections exclude private street address, internal coordinates, owner
references and internal notes. A listing can expose a separately stored, approved
GeoJSON `publicPoint`; `publicPrecision` controls which textual fields remain visible and
what that point means. The serializer never derives a public point from the internal
coordinate. See the
[public API reference](../api/public-api.md) and
[model contract](../database/property-and-inquiry-models.md) for the complete boundary.

There are no public property create/update/delete endpoints. The Phase 3A staff UI now
uses separate authenticated private-read and draft create/edit routes; those routes do
not weaken this published-only boundary. See
[`property-administration.md`](property-administration.md).

## Property detail behavior

The stable public route uses the listing slug. The page provides:

- breadcrumbs, title, Property ID, purpose, type, price and general location;
- an ordered, keyboard-operable image gallery with captions/provenance and explicit
  fallbacks;
- the full description and only the specifications supplied by the record;
- deduplicated highlights, amenities and features when present;
- an interactive map for a separately approved public point, otherwise a stable
  general-area placeholder, plus the listing's precision/privacy explanation;
- links to property-aware inquiry and viewing-request forms; and
- property-specific metadata plus JSON-LD based on the public record;
- native share with copy/manual fallback and an explicit print action;
- a print-only, ink-conscious summary containing business identity, public facts,
  description, approved contact details, and the canonical public URL; and
- zero to three related cards selected deterministically from at most 12 real published
  residential sale candidates, excluding the current property.

The Part 2 detail composition moves the authorized gallery ahead of the title/price
summary, presents up to four supporting images beside the primary image on desktop, and
keeps the existing touch, keyboard, fullscreen, count, caption, and focus behavior. Purely
decorative section numbering was removed; Premier Property identifiers remain unchanged.
Between 640 and 1023 CSS pixels, the primary image uses a shorter controlled ratio and
supporting images become a compact thumbnail rail so the title, price and key facts arrive
earlier. The Related Properties section remains, while the redundant standalone Pampanga
exploration CTA immediately before it has been removed.

Print and related-property data use public DTOs only. They cannot expose private address,
internal coordinates, notes, customer data, or hidden records. A related-data failure is
non-fatal and shows no invented fallback. Related inventory is streamed behind a
`Suspense` boundary, so this secondary query does not delay the primary detail response.
Share always uses the canonical property URL without inbound browsing/tracking state;
the legacy clipboard fallback restores focus to the control that invoked it. A QR code
remains deliberately absent because
the printed URL is an accessible fallback and optional QR weight was not justified.

The viewing action creates no appointment by itself. Property detail registers its
published listing context with the shared header and mobile action, so Request a Tour
shows the known property rather than asking the visitor to re-enter its ID. Sold state is
blocked in the UI and revalidated by the backend. The form has no Subject field, retains
optional notes, and remains a request for staff confirmation rather than an appointment.

## Media behavior

Assigned media always wins. When a property has no assigned media, `next dev` selects a
deterministic, presentation-only Unsplash sample from the centralized catalog using the
property identifier. This value is never posted to the API or written to MongoDB. Cards,
featured-property cards, property detail galleries and protected admin previews all use
the same rule. Every sample is visibly identified as not being the listing.

Optimized production and test builds do not activate the automatic sample fallback;
properties without media render labelled neutral placeholders with stable aspect ratios.
The current `PropertyMedia` renderer supports approved local raster paths and narrowly
allowlisted Unsplash development samples through `next/image`. Only the detail hero is
preloaded; other gallery images retain lazy loading. Video and floor-plan viewers remain
unimplemented even though the data contract reserves those future kinds. See the
[media replacement guide](../development/media-replacement.md) before adding assets.

## Current blockers and exclusions

- No real listings or seed data have been supplied.
- Live MongoDB create/public-read persistence and private-field exclusion are verified
  with a temporary synthetic record; no real inventory has been supplied.
- Approved website design photography and branding are integrated. Real listing inventory,
  listing-specific photos, and agent profiles remain user/provider supplied.
- Production map-provider selection remains deferred to Phase 2B. Retaining the current
  evaluation tiles would require an appropriate Stadia Maps plan and registered frontend
  domain.
- No certified, license-compatible barangay boundary dataset has been approved.
- No production listing has a business-reviewed public precision or public point; only
  clearly synthetic browser fixtures exercise markers.
- Device upload and development storage are implemented on the existing property media
  model. Production object storage/CDN remains blocked on provider approval.
