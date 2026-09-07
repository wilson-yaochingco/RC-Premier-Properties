# Property Administration API

Status: Phase 3A property lifecycle API implemented.

All paths are relative to `API_PREFIX` from `@rc/shared`. Request and response shapes live only in `shared/src/api.ts`.

## Routes and permissions

| Method  | Path                                 | Permission                     | Purpose                             |
| ------- | ------------------------------------ | ------------------------------ | ----------------------------------- |
| `GET`   | `/admin/properties`                  | `property:read-private`        | Search and paginate private records |
| `GET`   | `/admin/properties/:id`              | `property:read-private`        | Read private detail / preview data  |
| `POST`  | `/admin/properties`                  | `property:write`               | Create an available draft           |
| `PATCH` | `/admin/properties/:id`              | `property:write`               | Edit draft or unpublished content   |
| `POST`  | `/admin/properties/:id/publish`      | `property:publish`             | Publish                             |
| `POST`  | `/admin/properties/:id/unpublish`    | `property:publish`             | Withdraw from public reads          |
| `POST`  | `/admin/properties/:id/archive`      | `property:publish`             | Archive safely                      |
| `POST`  | `/admin/properties/:id/restore`      | `property:publish`             | Restore privately                   |
| `PATCH` | `/admin/properties/:id/availability` | `property:change-availability` | Change market state                 |

Every route requires a valid local staff session and returns `Cache-Control: no-store` plus `X-Robots-Tag: noindex, nofollow`. Every write additionally requires the exact configured `Origin`, JSON content, and the session token in `X-CSRF-Token`.

## Private list

`GET /admin/properties` accepts optional `query`, `publicationStatus`, and `availability` filters plus bounded `page` and `limit` values. Search is case-insensitive across Premier Property number, slug, title, and city. The default page size is 25 and maximum is 50. Unknown query parameters are rejected.

List and detail responses include `version`. They exclude private addresses, internal coordinates, owner references, internal notes, and media-management fields.

## Writes and concurrency

Create accepts `CreateDraftPropertyRequest`, assigns `draft`, `available`, and PHP, and rejects lifecycle or private fields. Unique indexes protect both Premier Property number and slug; a collision returns `409`.

Every other write requires a non-negative integer `expectedVersion` from the latest private response. Content updates include it alongside at least one allowlisted content field. Transition bodies contain only `expectedVersion`. Availability bodies contain `expectedVersion` and `availability`. Unknown fields are rejected.

The mutation matches ID, current state, and version in one MongoDB operation and increments the version. A stale version or intervening state change returns `409`; no newer content is overwritten.

Invalid transitions also return `409`. Missing records return `404`. Malformed IDs or bodies return `400`.

## Visibility and deletion

Public property endpoints always impose `publicationStatus: published`. Draft, unpublished, and archived records cannot be read publicly. No hard-delete route exists; archive/restore is the safe retention policy.

## Audit events

Successful actions emit `property.created`, `property.edited`, `property.published`, `property.unpublished`, `property.reserved`, `property.sold`, `property.availability-changed`, `property.archived`, or `property.restored`. Audit details never contain listing values or authentication secrets.
