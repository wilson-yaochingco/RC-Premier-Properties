# Property Administration API

Status: Phase 3A private read and draft-content slice implemented.

All paths are relative to `API_PREFIX` from `@rc/shared`. Request and response shapes
live only in `shared/src/api.ts`.

## Routes and permissions

| Method  | Path                    | Permission              | Success |
| ------- | ----------------------- | ----------------------- | ------- |
| `GET`   | `/admin/properties`     | `property:read-private` | `200`   |
| `GET`   | `/admin/properties/:id` | `property:read-private` | `200`   |
| `POST`  | `/admin/properties`     | `property:write`        | `201`   |
| `PATCH` | `/admin/properties/:id` | `property:write`        | `200`   |

Every route requires a valid local staff session and returns `Cache-Control: no-store`
plus `X-Robots-Tag: noindex, nofollow`. Anonymous, invalid, expired, revoked and
disabled-staff sessions return the shared `401` envelope. An authenticated session
without the named permission returns `403`.

Both writes additionally require an exact configured `Origin`, JSON content, and the
session-bound token from `GET /auth/session` in `X-CSRF-Token`. Missing, incorrect and
cross-session tokens return `403` before property persistence.

## Private reads

`GET /admin/properties` accepts optional `publicationStatus` plus bounded `page` and
`limit` values. The default is page 1 with 25 items; the maximum page size is 50.
Unknown query parameters are rejected. The private list may return draft, pending,
published and archived records and is separate from the published-only public query.

`GET /admin/properties/:id` uses the MongoDB property identifier. Malformed identifiers
return `400`; missing records return the protected `404 Property not found.` envelope.

Admin responses include listing content, publication status, availability and normal
timestamps needed by the editor. They deliberately exclude private addresses, internal
coordinates, owner references, internal notes and media-management fields from this
slice.

## Create draft

`POST /admin/properties` accepts `CreateDraftPropertyRequest`. It validates the property
ID, slug, title, purpose, property type, PHP price, public location text/precision,
specifications, descriptions and bounded string lists. Unknown top-level and nested
fields are rejected.

The server always assigns:

- `publicationStatus: "draft"`;
- `availability: "available"`; and
- `price.currency: "PHP"`.

Supplying `publicationStatus`, `availability`, `publishedAt`, private address, internal
coordinates, internal notes, owner data or another unknown field returns `400`. A client
cannot publish or change availability through this endpoint. Duplicate property IDs or
slugs return `409`.

## Edit draft content

`PATCH /admin/properties/:id` accepts a non-empty
`UpdateDraftPropertyRequest`. Only the allowlisted content fields are copied into the
update. It can update only a record whose current publication status is `draft`; a
missing or non-draft record returns the same protected `404`.

The endpoint never changes publication status, availability or `publishedAt`. Publishing,
archiving and availability transitions require future explicit endpoints and are not
implemented here.

## Audit and visibility

Successful creation records exactly one `property.created` event. Successful editing
records exactly one `property.edited` event. Events contain the local staff actor,
property database ID, request ID, timestamp and allowlisted request field names only.
They contain no descriptions, addresses, property values, request body, cookies,
session/CSRF values or provider tokens.

Property persistence and audit insertion are separate MongoDB writes, matching the
documented session-audit limitation. A failed audit insert fails the HTTP request but
does not undo a completed property write. Production must approve this limitation with
monitoring or add a replica-set transaction/outbox design.

Public `GET /properties` and `GET /properties/:slug` still add
`publicationStatus: "published"` in the service. Creating or editing a draft cannot make
it visible through either public endpoint.
