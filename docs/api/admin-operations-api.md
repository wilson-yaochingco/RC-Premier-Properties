# Admin Operations API

Status: Level 15 read-only operations endpoints implemented. All paths are relative to
`API_PREFIX` from `@rc/shared`.

Every route requires a valid backend-owned staff session, returns `Cache-Control:
no-store` and the private-route noindex header, and uses shared response contracts. These
routes do not mutate state; CSRF applies unchanged to the separate mutation APIs.

| Method | Path                                  | Permission(s)                              | Bound                            |
| ------ | ------------------------------------- | ------------------------------------------ | -------------------------------- |
| `GET`  | `/admin/operations/dashboard`         | `property:read-private` and `inquiry:read` | six upcoming records plus counts |
| `GET`  | `/admin/operations/viewings/calendar` | `inquiry:read`                             | 42 days; 200 records             |
| `GET`  | `/admin/operations/audit-events`      | `audit:read`                               | paginated; maximum 100           |
| `GET`  | `/admin/operations/staff`             | administrator-only `staff:manage`          | paginated; maximum 50            |

## Dashboard

The dashboard accepts no query parameters. It returns residential-sale property counts,
non-archived active/new inquiry counts, notification retry/terminal-failure counts, the
pending media-cleanup-debt count, and upcoming viewing identifiers/schedules. It never
returns customer contact or message data.

## Viewing calendar

`start` and `end` are required real `YYYY-MM-DD` dates. The inclusive range must be one
through 42 days. Unknown, missing, malformed, reversed, or repeated values return `400`.
The response contains only inquiry ID, optional Premier Property number, status,
requested date, and requested time. `truncated: true` means more than 200 records matched.

## Audit events

Optional filters are `action`, `entityType`, `outcome`, `actorStaffIdentityId`, `from`,
and `to`. Enum values come from the shared contract; dates are inclusive real UTC
calendar dates for this event-instant filter. `page` defaults to 1 and is capped at
10,000; `limit` defaults to 25 and is capped at 100. The response deliberately excludes
event details, customer content, property values, private locations, tokens, cookies, and
session identifiers.

## Staff identities

Optional `query` is a trimmed maximum-100-character escaped name/email search and
`status` is `active` or `disabled`. `page` defaults to 1 and is capped at 10,000; `limit`
defaults to 25 and is capped at 50. The response includes local ID, display name, email,
role, status, authorization version, and lifecycle/login times. Auth0 issuer/subject and
session records are excluded. Provisioning and deactivation remain the documented CLI
operations; this endpoint is not an Auth0 or password-management API.

Unknown parameters, arrays/repeated values, objects, invalid identifiers, and invalid
pagination return the shared safe `400` error envelope.
