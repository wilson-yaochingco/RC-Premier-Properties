# Public API Reference

Status: implemented public MVP and Level 15 discovery contract. Last reviewed 2026-09-10.

All paths are relative to `API_PREFIX` from `@rc/shared`, currently `/api/v1`. Request
and response types live in [`shared/src/api.ts`](../../shared/src/api.ts); this document
explains behavior and intentionally does not create a second TypeScript contract.

## Endpoint summary

| Method | Path                        | Purpose                                             | Success   |
| ------ | --------------------------- | --------------------------------------------------- | --------- |
| `GET`  | `/health`                   | Process and MongoDB connection health               | `200`     |
| `GET`  | `/health/ready`             | MongoDB-backed deployment traffic readiness         | `200/503` |
| `GET`  | `/properties`               | Search published properties                         | `200`     |
| `GET`  | `/properties/facets`        | Values derived from published inventory             | `200`     |
| `GET`  | `/properties/map`           | Filtered, approved public property pins for the map | `200`     |
| `GET`  | `/properties/:slug`         | Read one published property                         | `200`     |
| `GET`  | `/properties/:slug/related` | Read up to three related published properties       | `200`     |
| `POST` | `/inquiries`                | Store a public inquiry or viewing request           | `201`     |

There are no public property writes and no public inquiry reads. Staff authentication
uses a separate backend session boundary documented in
[`authentication-api.md`](authentication-api.md). Protected private property reads and
draft writes are documented separately in
[`property-administration-api.md`](property-administration-api.md); they never widen the
public visibility rules below.

## `GET /health`

This liveness endpoint returns the service name, ISO timestamp, process uptime, validated
environment, and current readable Mongoose state. It is `no-store` and may include an
optional sanitized deployment `buildId`. HTTP remains `200` when MongoDB is disconnected;
traffic routing must use readiness below.

The connected Atlas response was verified through this endpoint on 2026-09-05.

## `GET /health/ready`

Returns `200` with `status: "ready"` only while Mongoose is actively connected. It
returns `503` with `status: "not-ready"` while MongoDB is connecting, disconnected,
disconnecting, or unknown. The response is `no-store`, is exempt from API rate limiting,
and exposes no URI, credential, or private infrastructure detail.

## `GET /properties`

Only records with `publicationStatus: "published"`, `purpose: "sale"`, and an approved
residential sale type (`house-and-lot`, `townhouse`, or `lot`) are eligible. None of these
boundaries is user-controlled. Private addresses, internal coordinates, owner references
and internal notes are excluded from the public projection. An optional public point is a
separate, explicitly approved field governed by `publicPrecision`; it is never derived
from an internal coordinate.

### Query parameters

| Parameter                    | Meaning                                                            | Constraint                                              |
| ---------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| `keyword`                    | Partial title, short description, Property ID or development match | up to 120 characters                                    |
| `propertyId`                 | Exact public reference                                             | up to 40 letters, numbers, hyphens or underscores       |
| `location`                   | Partial province, city, barangay or development match              | up to 120 characters                                    |
| `propertyType`               | Residential sale category                                          | `house-and-lot`, `townhouse`, or `lot`                  |
| `purpose`                    | Compatibility input; public inventory remains sales-only           | `sale`; `rent` returns no public matches                |
| `availability`               | Market state                                                       | `available`, `reserved`, or `sold`                      |
| `minPrice`, `maxPrice`       | Inclusive PHP price range                                          | 0–1,000,000,000,000; minimum cannot exceed maximum      |
| `bedrooms`, `bathrooms`      | Minimum room count                                                 | whole number from 0 to 100                              |
| `minLotArea`, `minFloorArea` | Inclusive minimum square meters                                    | 0–100,000,000                                           |
| `featured`                   | Featured state                                                     | literal `true` or `false`                               |
| `sort`                       | Ordering                                                           | `newest`, `price-asc` or `price-desc`; default `newest` |
| `page`                       | One-based page                                                     | whole number from 1–100,000; default 1                  |
| `limit`                      | Page size                                                          | 1–48; default 12                                        |

Unknown fields, repeated/array values, nested objects and operator-style keys are
rejected with `400`, as are malformed values. Text used in partial matching is escaped
before a regular expression is constructed.

The response contains public summary items, pagination metadata, normalized applied
filters and the active sort. A valid search with no matches returns `200`, an empty
`items` array, and `totalPages: 0`.

Each public location contains `province`, `city`, `publicPrecision` and the compatibility
field `disclosure`. Optional text and point fields are redacted by precision:

| Precision       | Additional location text allowed | Public point meaning                   |
| --------------- | -------------------------------- | -------------------------------------- |
| `exact`         | barangay and development         | separately approved exact public point |
| `approximate`   | barangay and development         | deliberately approximate point         |
| `subdivision`   | barangay and development         | subdivision/general-development point  |
| `barangay-area` | barangay; development is omitted | barangay-area point                    |
| `city-only`     | neither barangay nor development | city-level point                       |

`publicPoint`, when present, is GeoJSON `{ type: "Point", coordinates: [longitude,
latitude] }`. A missing or invalid explicit precision falls back to `city-only` text and
sends no point. See
[`geographic-data-and-maps.md`](../architecture/geographic-data-and-maps.md) for the
storage and privacy boundary.

## `GET /properties/map`

Accepts the same discovery filter fields as `GET /properties`. `sort`, `page` and
`limit` are server-owned on this route and are rejected when supplied. The service always
applies the published-only predicate and returns at most 200 newest matching records with
a valid, separately approved public point.

The response contains:

- `items` — the reduced marker/preview shape; records without an approved point are
  omitted;
- `matchingTotal` — all matching published records, including records without pins;
- `mappableTotal` — matching records with approved public points;
- `returned` and `truncated` — the actual item count and whether the 200-item cap was
  reached; and
- `appliedFilters` — normalized filters shared with the catalog URL state.

The endpoint is requested only after the progressive map experience loads. It is not an
unbounded replacement for the paginated property list.

## `GET /properties/facets`

Returns sorted location labels and property types plus the minimum and maximum PHP price
derived only from published residential sale records. With no eligible inventory, the
arrays are empty and both price bounds are `null`.

This route does not supply example listings. The repository intentionally contains no
seed data or real inventory.

## `GET /properties/:slug`

Accepts a lowercase, hyphen-separated slug up to 160 characters. It returns the public
detail shape only when the matching record is published. Missing or unpublished records
return the same `404 Property not found` response, so draft existence is not disclosed.

The public detail uses the same precision-aware location projection as the list. A
listing with a valid approved `publicPoint` can render the interactive map; otherwise the
detail retains a general-area placeholder. Internal address/coordinate fields are never
used as a fallback.

Summary responses may contain `coverMedia`; detail responses additionally contain the
ordered `gallery`. Media entries carry image metadata and production/sample provenance.
The frontend renders only supported image URLs and keeps its stable fallback for missing
or unapproved entries. Development samples are always visibly marked as not depicting
the listing. See [`property-media.md`](../architecture/property-media.md).

## `GET /properties/:slug/related`

Uses the same slug validation and visibility predicate as detail. A missing, unpublished,
rental, condominium, apartment, or commercial record returns `404`. The service excludes
the current record, queries at most 12 eligible candidates using same city, same type, or
a price within 20 percent, and deterministically returns at most three public summaries.
Availability, similarity score, publication time, and record ID provide stable ordering.
Insufficient inventory returns fewer items or an empty array; no result is fabricated.

## `POST /inquiries`

Accepts `CreateInquiryRequest` as JSON. The request must use an
`application/json`-compatible content type:

| Field            | Requirement                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| `name`           | required, 2–100 characters                                                                     |
| `email`          | required valid address, up to 254 characters; normalized to lowercase                          |
| `phone`          | optional, up to 30 characters, validated as a phone-like value                                 |
| `inquiryType`    | required: `general`, `property`, `viewing` or `selling`                                        |
| `source`         | required: `contact-page`, `property-detail`, `viewing-page` or `sell-page`                     |
| `propertyId`     | optional; if supplied it must exist; viewing also requires a published, not-sold sale property |
| `subject`        | optional, up to 150 characters                                                                 |
| `message`        | required normally; optional for viewing; 10–3,000 characters when supplied                     |
| `requestedDate`  | viewing only; required real future `YYYY-MM-DD` Philippine date                                |
| `requestedTime`  | viewing only; required valid 24-hour `HH:mm` Philippine time                                   |
| `privacyConsent` | must be the boolean `true`                                                                     |
| `website`        | optional honeypot; legitimate clients leave it empty                                           |

Unknown fields are rejected. A valid request returns only an opaque inquiry identifier,
`received` status, acknowledgment text and creation time; submitted personal data is
not echoed. An otherwise-valid request with a populated honeypot receives the normal
acknowledgment without creating a record. Invalid fields are still rejected before the
honeypot decision. The route is limited to 5 submissions per IP per 15 minutes in
addition to the general API budget.

Clients may send an `Idempotency-Key` header containing 16–200 allowlisted ASCII
characters. The backend stores only its SHA-256 hash under a unique sparse index. A
retry with the same key returns the original acknowledgment and does not create a
second inquiry. The connected browser form generates and reuses this key across
uncertain failures.

A viewing inquiry creates structured `requested` appointment state. Its source must be
`viewing-page`, its date/time must be in the future, and its Property ID must identify a
published residential sale property that is not sold. The acknowledgment explicitly says
the requested schedule still needs staff confirmation; the endpoint does not expose
calendar availability or confirm an appointment.

For every inquiry type, a supplied `propertyId` is a relational reference rather than
free text and must identify a current property. This keeps accepted inquiries aligned
with the scan-only integrity contract. Viewing applies the stricter publication,
sales-purpose, and availability rules above.

## Errors

Every non-2xx response follows `ApiErrorResponse`:

```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Invalid inquiry.",
  "issues": [{ "field": "email", "message": "Enter a valid email address." }]
}
```

Field issues are safe for accessible client feedback. Production `5xx` responses hide
internal messages. See [`conventions.md`](conventions.md) for CORS, security headers,
versioning and rate-limit rules.

Malformed JSON or an otherwise invalid body returns `400`; a body above the 1 MB JSON
limit returns `413`; and an unsupported inquiry content type returns `415`.

## Verification boundary

HTTP integration tests cover routing, normalization, published-only disclosure,
precision-aware map serialization and query limits, validation, content/body errors,
otherwise-valid honeypot behavior, throttling and the absence of inquiry reads by
injecting test services. The public Mongoose create/read/delete path was verified against
the project Atlas database on 2026-09-05; the new staff workflow still requires its
manual live acceptance pass.
Database-backed endpoints require a working `MONGODB_URI`; they do not fall back to
fixture data.
