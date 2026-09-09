# Property Administration API

Status: Phase 3A property lifecycle API implemented.

All paths are relative to `API_PREFIX` from `@rc/shared`. Request and response shapes live only in `shared/src/api.ts`.

## Routes and permissions

| Method  | Path                                  | Permission                     | Purpose                               |
| ------- | ------------------------------------- | ------------------------------ | ------------------------------------- |
| `GET`   | `/admin/properties`                   | `property:read-private`        | Search and paginate private records   |
| `GET`   | `/admin/properties/:id`               | `property:read-private`        | Read private detail / preview data    |
| `POST`  | `/admin/properties`                   | `property:write`               | Create an available draft             |
| `PATCH` | `/admin/properties/:id`               | `property:write`               | Edit draft or unpublished content     |
| `PUT`   | `/admin/properties/:id/media`         | `property:write`               | Replace ordered image metadata        |
| `POST`  | `/admin/properties/:id/media/uploads` | `property:write`               | Validate, store, and attach one image |
| `POST`  | `/admin/properties/:id/publish`       | `property:publish`             | Publish                               |
| `POST`  | `/admin/properties/:id/unpublish`     | `property:publish`             | Withdraw from public reads            |
| `POST`  | `/admin/properties/:id/archive`       | `property:publish`             | Archive safely                        |
| `POST`  | `/admin/properties/:id/restore`       | `property:publish`             | Restore privately                     |
| `PATCH` | `/admin/properties/:id/availability`  | `property:change-availability` | Change market state                   |

Every route requires a valid local staff session and returns `Cache-Control: no-store` plus `X-Robots-Tag: noindex, nofollow`. Every write additionally requires the exact configured `Origin` and the session token in `X-CSRF-Token`. Writes use JSON except the raw-byte upload route.

## Private list

`GET /admin/properties` accepts optional `query`, `publicationStatus`, and `availability` filters plus bounded `page` and `limit` values. Search is case-insensitive across Premier Property number, slug, title, and city. The default page size is 25 and maximum is 50. Unknown query parameters are rejected.

List and detail responses include `version`. Lists exclude media and sensitive location
details. Protected details include the ordered `gallery`, selected `coverMedia`, optional
`privateAddress`, optional verified internal `coordinates`, and optional approved
`publicPoint` for editing/preview. Owner references and internal notes remain excluded.

## Writes and concurrency

Create accepts the sales-only `CreateDraftPropertyRequest`, assigns `draft`, `available`,
and PHP, and rejects rental purpose, lifecycle, and unknown fields. Edit and publish also
fail closed for a legacy non-sale record; the UI presents it read-only for deliberate
integrity reconciliation rather than silently converting it. Location authoring may include a private address,
a complete private `{ latitude, longitude }` pair, public precision, and a separate
GeoJSON `{ type: "Point", coordinates: [longitude, latitude] }` public point. Latitude is
bounded to -90 through 90 and longitude to -180 through 180. Values must be finite JSON
numbers; incomplete pairs, numeric strings, malformed objects, and extra nested fields
return `400`. Unique indexes protect both Premier Property number and slug; a collision
returns `409`.

Every other write requires a non-negative integer `expectedVersion` from the latest private response. Content updates include it alongside at least one allowlisted content field. Transition bodies contain only `expectedVersion`. Availability bodies contain `expectedVersion` and `availability`. Unknown fields are rejected.

The mutation matches ID, current state, and version in one MongoDB operation and increments the version. A stale version or intervening state change returns `409`; no newer content is overwritten.

Invalid transitions also return `409`. Missing records return `404`. Malformed IDs or bodies return `400`.

## Media replacement

`PUT /admin/properties/:id/media` accepts `UpdatePropertyMediaRequest`. `media` contains
at most 24 image entries and its array order is display order. Every entry requires a
unique stable ID, `kind: image`, an approved URL/reference, meaningful bounded alt text,
and a source classification. A non-empty list requires `coverMediaId` matching one of its
IDs; an empty list omits the cover. The gallery and denormalized cover are updated in one
version-matched MongoDB operation.

Production references accept only safe raster paths below `/media/properties/`.
Development samples remain fixture-only and cannot be saved in production. Unknown hosts,
SVG/executable paths, future media kinds, duplicate IDs, malformed metadata, stale
versions and media changes to published/archived records are rejected. This JSON endpoint
never accepts file bytes.

## Device image upload

`POST /admin/properties/:id/media/uploads` accepts one raw PNG, JPEG, or WebP body up to
12 MB. `expectedVersion` and required `alt` plus optional `caption` are query parameters;
unknown parameters are rejected. Declared MIME must match the bytes, the image must decode
as one frame, and dimensions are bounded. The server generates the storage ID and ignores
no client filename because filenames are not accepted at all. A successful storage write
and version-matched gallery update returns the updated private property with status 201.
If MongoDB persistence fails, the newly written development object is removed.

Metadata commit and audit insertion are separate durable boundaries. A post-commit audit
failure is surfaced and never deletes an object still referenced by the property. For a
media removal, metadata and audit complete before physical deletion; failed deletion is
recorded as cleanup debt and never makes removed media reappear.

Development retains the original privately and serves an optimized WebP derivative.
Production returns 503 until an object-storage/CDN adapter is selected.

## Visibility and deletion

Public property endpoints always impose `publicationStatus: published` and `purpose: sale`. Draft, unpublished, archived, and rental records cannot be read publicly. No hard-delete route exists; archive/restore is the safe retention policy.

## Audit events

Successful actions emit `property.created`, `property.edited`,
`property.media-updated`, `property.published`, `property.unpublished`,
`property.reserved`, `property.sold`, `property.availability-changed`,
`property.archived`, or `property.restored`. Audit details never contain listing values,
media URLs, raw data, or authentication secrets.
Location edits reuse `property.edited` with `changedFields: ["location"]`; audit records
never include a private address or any coordinate value.
