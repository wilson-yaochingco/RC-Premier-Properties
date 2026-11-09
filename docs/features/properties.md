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
- `/locations` — a curated editorial location index
- `/properties?location=<short name>` — one canonical location with its filtered published inventory
- `/` — sales-focused entry, up to three featured published listings in an editorial
  rail, and inventory-derived location links/counts

The browser renders API data only. There is no decorative property array, seed command
or production listing bundled with the repository. An empty database therefore produces
honest empty states rather than invented inventory. The one exception is a
development-only design fixture module for the home Featured section, reachable only under
`next dev` through `?featuredFixture=…`; it is excluded from every production and test
build and is never a fallback when the API fails.

The home Featured section requests the first three (`FEATURED_PROPERTIES_LIMIT`)
`featured=true`, published sale listings. Sold, unpublished, and archived records are excluded; reserved listings
remain eligible. Results use staff-assigned descending Featured priority, then
`publishedAt` and the stable database ID as deterministic tie breakers. The existing
public property summary and media renderer remain the only card data source.

## Catalog behavior

The search surface supports Property ID, location, property type,
availability, minimum price and maximum price fields. A progressively disclosed region
adds keyword, minimum bedrooms, minimum bathrooms, minimum lot/floor areas and sort. The
public experience is sales-only: the frontend always requests `purpose=sale`, and public
backend list, map, facet, detail, related, and viewing-eligibility queries independently
enforce sale plus the shared `SALE_PROPERTY_TYPES`: `house-and-lot`, `townhouse`, `lot`,
`industrial`, `commercial`, and `condominium`. Existing stored type names are preserved.
Historical rentals and other unsupported types remain excluded from public workflows.

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
- filters the API rejects (a 400, such as a malformed price, an inverted price range or
  a negative room count) render "Some filters aren't valid." with a clear-filters action;
- an API or database failure explains that results are unavailable and preserves the
  query in the URL;
- route loading and error boundaries provide non-empty transition and recovery states.

Cards expose only fields supplied by the public summary: reference, location, type,
sale purpose, PHP price, availability and up to three available specifications. Missing
values are omitted rather than guessed; no popularity or recommendation badge exists.

### Properties editorial page

The Properties page opens with a full-bleed hero and a compact desktop search bar
containing Location, Bedrooms, Price Range and Search. Each field is a separate white box;
the charcoal action is 140-160px wide. Desktop popovers match their trigger width and open
12px above it. Content-sized chips wrap naturally. Choosing a location or bedroom count
closes its popover and restores trigger focus; price editing stays open until Escape,
outside click or the trigger dismisses it. Search applies all draft choices together.

The curated Angeles City, Mabalacat City, Magalang and Porac choices remain available even
with zero inventory. Bedrooms chips select exact counts from 1 through 5, plus All.
The Properties form submits `bedroomsMatch=exact` alongside `bedrooms`; pagination,
sorting and refresh retain that mode. Other API consumers that omit the mode retain
minimum-count semantics. Studio is omitted. Existing additional URL filters, removable chips,
sorting, nine-item pagination and detail-page results context remain supported.

On mobile, the content-width Start Search button opens a full-screen native modal using the shared Lenis/body
scroll lock. It uses the same filter state and controls as desktop, a scrollable body and
a centered Filters header and fixed Reset filters/Search footer with safe-area padding. It covers the viewport with
square corners and an off-screen initial transform, enters upward over 650ms with an ease-out curve, closes over 450ms, and tracks the visual viewport during keyboard
resizing. A translucent backdrop fades in as the white drawer rises, leaving the hero
visible until covered. Closing restores the page's exact previous scroll position. Escape, Close search and the
backdrop dismiss it and return focus. Draft selections persist after dismissal. Reset
clears draft filters; Search applies them. Reduced motion skips the sheet transition.

Prices display and submit whole pesos with comma separators in the controls. Decimal
input rounds to the nearest peso, and existing decimal/exponent price URLs redirect to
canonical whole-peso filters before inventory loads. Listing records are never changed.
The slider spans 0-100,000,000 pesos. The first half of its track represents 0-10M,
the next quarter 10-30M and the final quarter 30-100M. Dragging snaps to 250,000 pesos
below 10M, 500,000 below 30M and 1,000,000 above that. Keyboard arrows use the same
increments; exact whole-peso manual entry remains supported, including API-supported
amounts above the slider limit with an explicit range hint. Blank minimum and maximum
values remain unset and display Any price; no slider endpoints are automatically applied.

The API does not expose a complete published price distribution. A sparse charcoal bar
motif above the slider has thin navy bars with prominent peaks concentrated on the left and is decorative and hidden from assistive technology; it represents
no listing counts or market statistics. The track uses a fine neutral dashed line without a selected-range fill. Bars outside
the selected interval are muted. Thumbs use one pointer-captured controller, with no native continuous thumb movement.
Track clicks, dragging and keyboard controls share
the fixed stepped price path; manual values remain exact until a handle is adjusted.
No price-scale labels appear below the track.
Clear price range sits beside the heading, is disabled for a blank range, and clears both
values without closing the panel. Location chips are ordered All Locations, Angeles City, Porac,
Magalang, Mabalacat City, arranged as three / two on desktop when space permits.

The first four results form a large two-column showcase. Remaining results on the same
page appear once in a smaller three-column grid under "More homes to explore" Both grids
preserve API order, including explicit price sorting. "Featured Properties" is the fixed
editorial section title and does not change listing eligibility or imply a new API filter.
The result count is available to assistive technology without appearing beside the heading.
Four or fewer results flow directly into Explore Pampanga without an empty secondary grid.

Explore Pampanga reuses the Home section, curated locations, geographic visual and
keyboard/hover highlighting. The positioning rows, four-step property journey and unchanged
shared EditorialCta follow. Properties uses Manrope throughout, without decorative trailing
periods or section-level dividers; internal row/card dividers remain. Viewing requests
require staff follow-up and do not imply confirmed calendar availability or transactions.

`features/properties/PropertiesHero.tsx` uses HomeHeroVideo and the optimized
`/media/properties-hero.mp4` (about 6.46 MB), with the Homepage gradient. There is no image
layer or image poster: the neutral charcoal background remains until the first frame loads.
The video covers the complete hero and uses Home's paused first frame for reduced motion.
Home's component and behavior are unchanged. The dedicated Properties source is passed
to the shared playback component. The hero retains its scoped GSAP masked-line entrance;
below-fold sections retain PageMotion's existing photo/caption sequences and staggered
groups. The shared header overlays the hero and retains its sticky scroll behavior.
Journey cards are single full-card links. The second card opens the first real result
with its results context; with no results it points to Explore Pampanga instead.

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
published approved sale inventory. Regex input is escaped, unknown or operator-style
parameters are rejected, page size is bounded and only newest, price-low-to-high, and
price-high-to-low deterministic sorts are accepted. Unpublished, disallowed historical,
and missing slugs all resolve as public 404s.

Public projections exclude private street address, internal coordinates, owner
references and internal notes. A listing can expose a separately stored, approved
GeoJSON `publicPoint`; `publicPrecision` controls which textual fields remain visible and
whether that point is published at all. Only `exact`, `approximate` and `subdivision`
(`PUBLIC_POINT_PRECISIONS`) serialize a point; `barangay-area` and `city-only` never do,
even when one is stored, and are excluded from map results. The serializer never derives
a public point from the internal coordinate, and draft validation rejects a public point
identical to the private coordinates unless precision is `exact`. See the
[public API reference](../api/public-api.md) and
[model contract](../database/property-and-inquiry-models.md) for the complete boundary.

There are no public property create/update/delete endpoints. The Phase 3A staff UI now
uses separate authenticated private-read and draft create/edit routes; those routes do
not weaken this published-only boundary. See
[`property-administration.md`](property-administration.md).

## Property detail behavior

The stable public route uses the listing slug. The page provides:

- a Back to Results link with a secondary breadcrumb, title, purpose, type, availability,
  price and general location (the property number and last-updated date are internal and
  not shown to buyers);
- an ordered, keyboard-operable image gallery with captions/provenance and explicit
  fallbacks;
- the full description and only the specifications supplied by the record;
- deduplicated highlights, amenities and features when present, sorted by keyword into
  Smart home and security, Living spaces and amenities, Bedrooms and service areas, and
  Furniture and inclusions, then balanced over two columns (`property-feature-groups.ts`);
- an interactive map for a separately approved public point, otherwise a stable
  general-area placeholder, plus the listing's precision/privacy explanation;
- links to property-aware inquiry and viewing-request forms; and
- property-specific metadata plus JSON-LD based on the public record;
- a Share control (native share with copy/manual fallback) beside the key facts; browser
  print still works through the print stylesheet, but there is no Print button;
- an integrated contact-agent panel (see below);
- a print-only, ink-conscious summary containing business identity, public facts,
  description, approved contact details, and the canonical public URL; and
- zero to three related cards selected deterministically from at most 12 real published
  approved sale candidates, excluding the current property.

The detail page uses the site's responsive editorial gutters without a desktop maximum
width for photography. A navigation row places Home / Properties / the listing title above
the gallery. Back to Results preserves a supplied catalog or location-results URL, including
filters, and falls back to `/properties` for direct visits or unsafe return paths.

At 1024 CSS pixels and above, the gallery is a mosaic of a lead photograph (2fr) and four
supporting tiles that share one proportion, using `object-fit: cover`. Below that width, the
same ordered collection becomes a native swipe track with a photo counter. "View all N photos"
opens a centered modal gallery over a dark backdrop: a sticky header with Close, the property
title, Share and Book a Viewing, and a vertically scrolling two-column photo grid (one column
below 48rem). There is no zoom or nested viewer. It is a native modal dialog portalled to
the document body, so the page behind it is inert; Escape, Close or a click on the backdrop
closes it, shared scroll locking applies, and focus returns to the opener. Book a Viewing
closes the gallery and opens the existing viewing request.

The contact-agent panel reads `frontend/src/lib/public-agent.ts`: name, role, the approved
public phone and email, an optional photograph (a neutral architectural mark is shown until
one is supplied) and an optional viewing-hours line. No viewing hours are approved, so none
are shown; the panel states that the visitor picks a preferred date and time and that the
agent confirms the request. The agent is one site-wide default: there is no agent
management feature, so editing it is a code change. Per-listing agents would need a backend
field and an admin control.

Everything on the page is rendered from the published property record, so a listing created in
admin appears with the same layout. Missing specifications, features or media simply
disappear. Descriptions keep a comfortable reading width beside a desktop sticky contact
panel; on mobile that panel follows the key facts. General Sans headings use restrained
Playfair italic accents. Related Properties remains below the location section.

The six-listing, database-free preview is derived from the import source, not a separate
static catalog. It does not publish production drafts. Reviewed photo ordering and delivery
crops are shared by the gallery and its full-resolution viewer; metadata also selects a
reviewed lead. Original assets and stored identifiers remain unchanged. See the
[photography review](../development/property-photography-review.md) for the 30 approved
crops, ten localized repairs, four approved preview exclusions and five views held for clean sources, and the
[listing replacement guide](../development/listing-import-and-replacement.md) for publication
and legacy-retirement gates.

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

The dedicated Properties film is `/media/properties-hero.mp4`: 20 seconds, 1920?1080,
30fps H.264/yuv420p, approximately 6.46 MB, silent and MP4 fast-start enabled. It is a
web-optimized copy of the verified Voogle export; the original remains outside the repo.
Home and About retain their separate video assets and playback behavior.
