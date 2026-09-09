# Inquiry Administration API

Status: implemented lightweight staff workflow. All routes are private, return
`Cache-Control: no-store`, and use shared contracts from `@rc/shared`.

## Authorization

All routes require a valid application session. Reads require `inquiry:read`. Writes
require `inquiry:update`, the configured frontend origin, the session-bound
`X-CSRF-Token`, and `application/json`. Frontend button visibility is not an
authorization control.

| Method  | Route                           | Purpose                         |
| ------- | ------------------------------- | ------------------------------- |
| `GET`   | `/admin/inquiries`              | Search and paginate queues      |
| `GET`   | `/admin/inquiries/:id`          | Read private inquiry details    |
| `PATCH` | `/admin/inquiries/:id/status`   | Change workflow status          |
| `PATCH` | `/admin/inquiries/:id/viewing`  | Transition a viewing request    |
| `POST`  | `/admin/inquiries/:id/notes`    | Append an internal note         |
| `POST`  | `/admin/inquiries/:id/spam`     | Move to spam quarantine         |
| `POST`  | `/admin/inquiries/:id/not-spam` | Restore the pre-spam status     |
| `POST`  | `/admin/inquiries/:id/archive`  | Recoverably archive the inquiry |
| `POST`  | `/admin/inquiries/:id/restore`  | Restore an archived inquiry     |

## List query

`page` defaults to 1 and is capped at 10,000; `limit` defaults to 20 and is capped at 100. `queue` is `active` (default), `spam`, `archived` or `all`. Optional exact filters
are `status`, `viewingStatus`, `inquiryType`, `source` and normalized `propertyId`. `query` is a trimmed,
escaped, maximum-100-character search over name, email, phone, Property ID and subject.
Unknown, repeated/object-style or invalid parameters return `400` with field issues.

List responses deliberately omit message bodies, phone numbers, consent timestamps,
internal notes and history. Detail responses include the operational private fields,
created/updated timestamps, archive time, current version, notes and status history.

## Writes and concurrency

Every write includes `expectedVersion`, the non-negative version returned by the latest
read. A stale version returns `409` and no success audit event. Status bodies also contain
one of `new`, `in-progress`, `viewing-scheduled`, `closed` or `lost`. Spam uses its
dedicated action so it can preserve and restore the previous status. Note bodies contain
`note`, trimmed and limited to 1,000 characters.

Viewing bodies contain `status`, `requestedDate`, `requestedTime` and `expectedVersion`.
Confirmation and reschedule require a future real calendar date and valid `HH:mm`
Philippine time. Completion and cancellation ignore replacement schedule values and copy
the current recorded schedule into the terminal history entry; they may occur after it.
Invalid or terminal transitions return `409`.

Viewing confirmation synchronizes inquiry status to `viewing-scheduled` only from `new`
or `in-progress`. Reschedule, completion and cancellation return `viewing-scheduled` to
`in-progress`; all other inquiry states are preserved.

Archive is the deletion policy exposed by this API. There is no `DELETE` route. Archived
records can be restored and are discoverable through the archive queue while an approved
retention duration and purge process remain outstanding.

## Audit boundary

Successful mutations emit `inquiry.status-changed`, `inquiry.marked-spam`,
`inquiry.restored-from-spam`, `inquiry.note-added`, `inquiry.archived` or
`inquiry.restored`. Events include safe actor/entity/request metadata only; inquiry and
note content is excluded.

Viewing transitions emit `viewing.confirmed`, `viewing.reschedule-requested`,
`viewing.completed` or `viewing.canceled`. Requested schedules and personal data are not
copied into audit events.
