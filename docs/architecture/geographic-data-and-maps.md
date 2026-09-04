# Geographic Data and Public Maps

Status: implemented Phase 2A public discovery baseline; production provider and expanded
map capabilities remain deferred to Phase 2B. Last reviewed 2026-09-04.

The public map helps visitors understand where published properties are in Pampanga
without turning an internal address or coordinate into public data. It is a discovery
aid, not cadastral, survey, title or legal-boundary evidence.

## Runtime architecture

The map uses Leaflet with `leaflet.markercluster`. The Leaflet canvas, boundary GeoJSON
and map-wide property request are all deferred until the map is near the viewport or a
visitor explicitly chooses the Map view. Home and ordinary catalogue rendering therefore
do not download map geometry or initialize Leaflet.

The catalogue remains server-rendered and usable without JavaScript map support. The map
adds a progressively enhanced view:

1. The current URL supplies the canonical property filters.
2. The already-fetched, server-rendered result page supplies markers for cards that have
   an independently approved public point, keeping the visible list and pins identical.
3. Selecting a city or municipality writes its name to the same `location` query
   parameter, clears pagination and refreshes both cards and map pins.
4. Card hover/focus highlights the matching marker. Marker popups expose the public
   Property ID, title, general location, price and detail link.
5. Nearby pins cluster so dense results remain legible.

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
secret client credential. This default is not the selected production provider.

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

The artifact embeds its source URL, revision, PSA crosswalk source/date, licence URL,
transformation note and disclaimer as top-level metadata. `scripts/build-pampanga-boundaries.mjs`
reproduces it from the pinned source and fails if the expected area match is ambiguous.
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
effective date, identifiers, licence and topology have been verified; it should remain a
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
entry needs a staff-facing review workflow before using it.

## API and capacity boundary

`GET /api/v1/properties/map` accepts the same allowlisted discovery filters as the list
route, but rejects caller-supplied `sort`, `page` and `limit`. It counts all matching
published records, counts the mappable subset, and returns at most 200 newest approved
map items. `truncated` tells a caller when that cap was reached. Records without a public
point contribute to `matchingTotal` but never appear as pins.

The endpoint returns a deliberately reduced marker/preview shape. It does not expose
description, gallery, internal address, internal coordinates, owner references or notes.
The current catalogue UI deliberately does not call this endpoint: it maps the nine-item
result page so every marker always has a matching visible card. The bounded endpoint is
available for a future dedicated full-results map or another public client. Such a UI
should use viewport/bounds queries or a spatial index at greater scale rather than simply
raising the cap.

## Verification and remaining blockers

Automated tests verify the 22-area artifact, licence metadata, coordinate envelope,
public/private serialization boundary, map query validation, lazy loading, URL/card/map
synchronization, marker behaviour, responsive fallback, failure isolation and the
absence of eager boundary requests on public entry routes.

The following remain external or deliberately deferred to Phase 2B or launch preparation:

- production map-provider selection and its account/domain configuration;
- production inventory with business-approved `publicPrecision` and `publicPoint` values;
- a certified, licence-compatible barangay boundary source;
- a verified project MongoDB persistence run; and
- nearby-landmark data and routing, which are not part of this public MVP map.
