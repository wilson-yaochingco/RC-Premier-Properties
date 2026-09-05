# Public API Reference

Status: implemented public MVP contract. Last reviewed 2026-09-05.

All paths are relative to `API_PREFIX` from `@rc/shared`, currently `/api/v1`. Request
and response types live in [`shared/src/api.ts`](../../shared/src/api.ts); this document
explains behaviour and intentionally does not create a second TypeScript contract.

## Endpoint summary

| Method | Path                 | Purpose                                             | Success |
| ------ | -------------------- | --------------------------------------------------- | ------- |
| `GET`  | `/health`            | Process and MongoDB connection health               | `200`   |
| `GET`  | `/properties`        | Search published properties                         | `200`   |
| `GET`  | `/properties/facets` | Values derived from published inventory             | `200`   |
| `GET`  | `/properties/map`    | Filtered, approved public property pins for the map | `200`   |
| `GET`  | `/properties/:slug`  | Read one published property                         | `200`   |
| `POST` | `/inquiries`         | Store a public inquiry or viewing request           | `201`   |

There are no public property writes and no public inquiry reads. Staff authentication
uses a separate backend session boundary documented in
[`authentication-api.md`](authentication-api.md); no administration APIs are exposed.

## `GET /health`

Returns the service name, ISO timestamp, process uptime, validated environment and the
current readable Mongoose connection state. The HTTP status remains `200` when the
development server has started with MongoDB disconnected; callers must inspect
`database.status` rather than infer database health from the HTTP code.

The connected Atlas response was verified through this endpoint on 2026-09-05.

## `GET /properties`

Only records with `publicationStatus: "published"` are eligible. Publication status is
not a user-controlled filter. Private addresses, internal coordinates, owner references
and internal notes are excluded from the public projection. An optional public point is
a separate, explicitly approved field governed by `publicPrecision`; it is never derived
from an internal coordinate.

### Query parameters

| Parameter                    | Meaning                                                            | Constraint                                              |
| ---------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| `keyword`                    | Partial title, short description, Property ID or development match | up to 120 characters                                    |
| `propertyId`                 | Exact public reference                                             | up to 40 letters, numbers, hyphens or underscores       |
| `location`                   | Partial province, city, barangay or development match              | up to 120 characters                                    |
| `propertyType`               | Listing category                                                   | one of `PROPERTY_TYPES`                                 |
| `purpose`                    | Sale or rent                                                       | `sale` or `rent`                                        |
| `minPrice`, `maxPrice`       | Inclusive PHP price range                                          | 0–1,000,000,000,000; minimum cannot exceed maximum      |
| `bedrooms`, `bathrooms`      | Minimum room count                                                 | whole number from 0 to 100                              |
| `minLotArea`, `minFloorArea` | Inclusive minimum square metres                                    | 0–100,000,000                                           |
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
- `appliedFilters` — normalized filters shared with the catalogue URL state.

The endpoint is requested only after the progressive map experience loads. It is not an
unbounded replacement for the paginated property list.

## `GET /properties/facets`

Returns sorted location labels and property types plus the minimum and maximum PHP price
derived from published records. With no published inventory, the arrays are empty and
both price bounds are `null`.

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

## `POST /inquiries`

Accepts `CreateInquiryRequest` as JSON. The request must use an
`application/json`-compatible content type:

| Field            | Requirement                                                                |
| ---------------- | -------------------------------------------------------------------------- |
| `name`           | required, 2–100 characters                                                 |
| `email`          | required valid address, up to 254 characters; normalized to lowercase      |
| `phone`          | optional, up to 30 characters, validated as a phone-like value             |
| `inquiryType`    | required: `general`, `property`, `viewing` or `selling`                    |
| `source`         | required: `contact-page`, `property-detail`, `viewing-page` or `sell-page` |
| `propertyId`     | optional public reference, normalized to uppercase                         |
| `subject`        | optional, up to 150 characters                                             |
| `message`        | required, 10–3,000 characters                                              |
| `privacyConsent` | must be the boolean `true`                                                 |
| `website`        | optional honeypot; legitimate clients leave it empty                       |

Unknown fields are rejected. A valid request returns only an opaque inquiry identifier,
`received` status, acknowledgement text and creation time; submitted personal data is
not echoed. An otherwise-valid request with a populated honeypot receives the normal
acknowledgement without creating a record. Invalid fields are still rejected before the
honeypot decision. The route is limited to 5 submissions per IP per 15 minutes in
addition to the general API budget.

A viewing inquiry is a request for follow-up only. The response does not confirm a date,
availability or appointment.

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
otherwise-valid honeypot behaviour, throttling and the absence of inquiry reads by
injecting test services. The Mongoose schemas and services are wired, but an end-to-end
create/read run against a real project MongoDB instance has not yet been verified.
Database-backed endpoints require a working `MONGODB_URI`; they do not fall back to
fixture data.
