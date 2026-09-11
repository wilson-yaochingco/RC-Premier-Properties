# Geographic Data and Public Maps

Status: locality aggregation, public-pin discovery and protected location administration
implemented; production provider remains external. Last reviewed 2026-09-12.

The public map helps visitors understand where published properties are in Pampanga
without turning an internal address or coordinate into public data. It is a discovery
aid, not cadastral, survey, title or legal-boundary evidence.

## Runtime architecture

The map uses Leaflet with `leaflet.markercluster`. The Leaflet canvas, boundary GeoJSON
and map-wide property request are all deferred until the map is near the viewport or a
visitor explicitly chooses the Map view. Home and ordinary catalog rendering therefore
do not download map geometry or initialize Leaflet.

The catalog remains server-rendered and usable without JavaScript map support. The map
adds a progressively enhanced view:

1. The current URL supplies the canonical property filters.
2. The already-fetched, server-rendered result page supplies an immediate safe marker
   fallback. Once loaded, the bounded map endpoint supplies all matching approved pins
   while the property list remains paginated.
3. Selecting a city or municipality writes its name to the same `location` query
   parameter, clears pagination and refreshes both cards and map pins.
4. Below zoom 11 the catalog shows one gold teardrop count marker for each locality with
   a positive count. Zero-count localities are omitted. Counts describe the complete
   filtered public result set, not only records that have pins.
5. Selecting a boundary or locality marker fits that area, updates the shared URL filter
   and crosses the deterministic zoom threshold into individual approved public pins.
   Zooming out below that threshold restores the aggregate markers.
6. Card focus highlights and focuses its approved marker. Popup cards use the public map
   DTO for cover media, Property ID, title, public location, price, available bed/bath
   values, availability and the stable detail link.

Every `/locations/[location]` inventory view mounts this same `PropertyMap` and
`PropertyMapCanvas` catalog engine rather than a parallel map implementation. It starts
focused on the validated route locality, requests the map endpoint with the identical
normalized route-and-query filters, shares marker/card activation, and uses the area
selector to navigate to canonical location routes. This keeps filtering, privacy,
failure isolation, lazy loading, popup content, and marker rendering on one code path and
does not duplicate a Leaflet bundle or map data request.

On small screens the List view is the default and Map is an explicit choice. Tablet
layouts stack the map and cards; wide desktop layouts use a split discovery surface. An
accessible area `<select>` remains available alongside pointer interaction with boundary
polygons.

Map, boundary and tile failures are isolated from property cards. If the map cannot
initialize, the UI provides a retryable explanation. If base tiles fail, boundaries and
property results remain usable.

## Base tiles and attribution

The local/test evaluation default is Stadia Maps' Alidade Smooth raster style. The map
visibly attributes Stadia Maps, OpenMapTiles and OpenStreetMap as required by that style.
The public template URL is configured through `NEXT_PUBLIC_MAP_TILE_URL`; it contains no
secret client credential. This default is not the selected production provider. Level 11
also pairs the URL with `NEXT_PUBLIC_MAP_ATTRIBUTION_TEXT` and
`NEXT_PUBLIC_MAP_ATTRIBUTION_URL`, escaping the plain-text value before Leaflet renders
it. Staging and production fail their build unless all three approved HTTPS provider
values are supplied; the evaluation defaults are development/test only.

Local evaluation is not production authorization. Commercial production use requires an
appropriate Stadia Maps plan and registration of the deployed frontend domain. That
account/domain setup is one option to evaluate in Phase 2B, not a committed vendor
decision. A replacement tile service must be reviewed for terms, Philippine coverage,
availability and privacy, and its required attribution must be changed with the provider.
Changing only the URL to an unrelated provider would leave incorrect attribution and is
not an approved configuration.

## Administrative boundary artifact

The checked-in
`frontend/public/geo/pampanga-admin3.geojson` artifact contains 22 web-simplified
city/municipality polygons: the 21 Pampanga local government areas plus Angeles City as
a separate highly urbanized-city scope.

| Item                                 | Recorded value                                                                                                                                |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Source                               | geoBoundaries `gbOpen` Philippines ADM3 simplified GeoJSON                                                                                    |
| Pinned revision                      | `wmgeolab/geoBoundaries@9469f09`                                                                                                              |
| Source agencies named by the dataset | NAMRIA, PSA and OCHA Philippines                                                                                                              |
| Boundary year reported by the source | 2020                                                                                                                                          |
| Name/code crosswalk                  | PSA Philippine Standard Geographic Code city/municipality listing for Pampanga, reviewed as of 2026-06-30                                     |
| License                              | Creative Commons Attribution 3.0 IGO (`CC BY 3.0 IGO`)                                                                                        |
| Local transformation                 | extract 22 reviewed features, replace source properties with the application name/PSGC crosswalk, retain the source's web-simplified geometry |

The artifact embeds its source URL, revision, PSA crosswalk source/date, license URL,
transformation note and disclaimer as top-level metadata. `scripts/build-pampanga-boundaries.mjs`
reproduces it from the pinned source and fails if the expected area match is ambiguous.
It is the single authoritative generator and writes only the consumed
`frontend/public/geo/pampanga-admin3.geojson` path; the obsolete alternate-output script
was removed in Level 14.
Regeneration requires network access and must be followed by review of the artifact diff
and the boundary-data tests.

These shapes are intentionally labelled approximate. They are appropriate for regional
property discovery, but not for resolving a disputed boundary or proving which parcel,
barangay or title contains a point. The boundary source is older than the current
application and must be re-reviewed before a production launch or after an administrative
change.

No certified, redistributable barangay boundary set has been approved for this project.
Consequently, the implementation stops at city/municipality boundaries and does not draw
invented barangay polygons. A barangay layer may be added only after its source,
effective date, identifiers, license and topology have been verified; it should remain a
separately lazy-loaded layer.

## Listing-location privacy

Internal location and public map location are different fields. `privateAddress` and the
internal latitude/longitude pair are excluded from normal Mongoose selection. A map pin
can be serialized only from `location.publicPoint`, a separately stored GeoJSON point in
longitude/latitude order, and only when an explicit valid `publicPrecision` is present.
The serializer never copies, jitters or derives a public point from the internal exact
coordinate.

| `publicPrecision` | Public text that may be returned                       | Meaning of an approved `publicPoint`              |
| ----------------- | ------------------------------------------------------ | ------------------------------------------------- |
| `exact`           | province, city, barangay and development when supplied | approved for exact public disclosure              |
| `approximate`     | province, city, barangay and development when supplied | deliberately approximate public position          |
| `subdivision`     | province, city, barangay and development when supplied | approved subdivision/general-development position |
| `barangay-area`   | province, city and barangay; development is redacted   | approved barangay-area position                   |
| `city-only`       | province and city only                                 | approved city-level position                      |

Missing or invalid precision defaults to `city-only` text and suppresses any configured
point. A listing with no approved public point has no marker; the application does not
invent one from its city name. Existing fixture points are explicitly synthetic test
data and are never production inventory.

Exact disclosure is supported by the contract for a future explicitly authorized
record, but it is never inferred from an internal exact address. Production listing
entry still needs a business approval decision before staff use it on a real listing.

## Protected location administration

Location editing stays inside the existing draft/unpublished property form and the
existing `property:write` mutation. There is no separate location route or permission.
Authorized staff can manage province, city/municipality, optional barangay and
development, the private address, a verified private latitude/longitude pair, public
precision, and a separately reviewed public GeoJSON point.

The form visually separates private fields from the public point and warns that a saved
public point is returned by public property APIs. Latitude and longitude must be supplied
together. Both browser constraints and the backend check latitude from -90 through 90
and longitude from -180 through 180; the backend also rejects strings, non-finite values,
wrong GeoJSON types, malformed arrays, extra nested fields, and incomplete pairs.

Private fields are selected only for an authenticated property-detail/edit response.
They remain absent from admin collection summaries. Updates use the property's existing
optimistic-concurrency version, origin validation, CSRF token, and `property:write`
authorization. The existing `property.edited` audit records only the changed top-level
field name `location`, never the address or coordinate values.

## API and capacity boundary

`GET /api/v1/properties/map` accepts the same allowlisted discovery filters as the list
route, but rejects caller-supplied `sort`, `page` and `limit`. It counts all matching
published records, counts the mappable subset, and returns at most 200 newest approved
map items. It also runs one bounded aggregation grouped only by the public city label and
returns `locationCounts`; its pipeline uses the identical published/filter predicate and
is capped to the 22 supported areas. `truncated` tells a caller when the pin cap was
reached. Records without a public point contribute to `matchingTotal` and locality counts
but never appear as pins.

The endpoint returns a deliberately reduced marker/preview shape plus aggregate public
city labels and counts. It does not expose
description, gallery, internal address, internal coordinates, owner references or notes.
The catalog requests it only after map activation and preserves its server-rendered,
paginated list as the accessible source of results. A marker for the current page can
highlight and reveal its card; every marker retains a concise popup and safe detail link.
At greater scale the endpoint should gain viewport/bounds queries or a spatial index
rather than simply raising the cap.

## Existing-record and migration behavior

All new location fields remain optional except province, city and public precision in a
new admin request. Existing documents without coordinates remain valid and render text
only. A missing legacy precision defaults to `city-only` during serialization and cannot
release an orphan point. No migration, backfill, coordinate derivation, or new database
index is required. Staff may add verified data during an ordinary version-checked edit;
the application never writes a regional default into a listing.

## Verification and remaining blockers

Automated tests verify the 22-area artifact, license metadata, coordinate envelope,
private/public authoring validation, protected location responses, value-free audit
metadata, public list/detail/map serialization, map query validation, lazy loading,
URL/card/map synchronization, marker behavior, responsive fallback, failure isolation
and the absence of eager boundary requests on public entry routes.

The following remain external or deliberately deferred to Phase 2B or launch preparation:

- production map-provider selection and its account/domain configuration;
- production inventory with business-approved `publicPrecision` and `publicPoint` values;
- a certified, license-compatible barangay boundary source;
- a post-change live MongoDB/admin acceptance run; and
- nearby-landmark data and routing, which are not part of this public MVP map.
