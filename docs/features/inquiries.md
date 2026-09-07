# Inquiries

Status: public intake, structured viewing requests and lightweight staff management are
implemented. Public Atlas persistence was verified on 2026-09-05; the viewing extension
and staff workflow still require the existing live Auth0/MongoDB acceptance pass.

## Entry points

One connected form supports the public entry points currently exposed by the UI:

| Route or action                   | Default type                                       | Source         |
| --------------------------------- | -------------------------------------------------- | -------------- |
| `/contact`                        | general, or property when a Property ID is present | `contact-page` |
| property-detail “Send an inquiry” | links to `/contact` with its Property ID           | `contact-page` |
| `/book-viewing`                   | viewing                                            | `viewing-page` |
| `/sell`                           | selling                                            | `sell-page`    |

`/contact` and `/book-viewing` accept `propertyId` in the URL and prefill the form. The
form remains editable so a visitor can correct a mistyped reference.

The repository contains no approved phone number, email address, messaging account or
office address. Until those business details are supplied, the connected form is the
only claimed contact channel; the UI says so rather than inventing details.

## Form behaviour

The general form collects name, email, optional phone, inquiry type, optional Property ID,
optional subject, message and explicit privacy consent. The viewing form locks the type,
requires a Property ID plus structured requested date and time, and makes the additional
message optional. It has persistent labels, native input constraints, pending state, an
accessible live success/error message and field issues returned by the API. A successful
response shows the opaque inquiry reference.

No account is created. Public seller inquiries do not accept identity, title or ownership
documents. The submission is not a valuation, listing agreement, offer, approval or
promise that the property will be published.

The viewing route remains a **request only**. Times are interpreted in Philippine time.
The backend verifies that the referenced sale property is published and not sold, but it does
not expose or invent calendar availability. Submission creates `requested` state and the
success copy explicitly says staff confirmation is still required.

## Viewing lifecycle and inquiry relationship

A structured viewing is embedded one-to-one inside its inquiry instead of duplicating
the customer, consent, Property ID, notes, archive or concurrency data in another
collection. Its separate status is one of `requested`, `confirmed`,
`reschedule-requested`, `completed` or `canceled`:

```text
requested -> confirmed -> completed
    |             |
    +-> reschedule-requested -> confirmed
    |             |
    +-------------+-> canceled
```

`completed` and `canceled` are terminal. Reschedule updates retain the requested date and
time in append-only viewing history. `no-show` is deliberately not modeled because the
current operational requirement does not justify another terminal state.

Viewing status describes the appointment request; inquiry status describes lead
follow-up. Confirmation changes `new` or `in-progress` to `viewing-scheduled`.
Reschedule, completion or cancellation changes `viewing-scheduled` back to
`in-progress`. Other inquiry states, including staff-selected `closed` or `lost`, are
preserved so appointment updates do not destroy staff intent.

## Validation and abuse controls

The backend revalidates every value independently of browser constraints, trims text,
normalizes email and Property ID casing, rejects unknown fields and returns the common
field-issue envelope for invalid input. Privacy consent must be the boolean `true`.

An off-screen `website` honeypot is left empty by legitimate clients. An otherwise-valid
request with a filled honeypot receives the normal acknowledgement but is not persisted,
preventing bots from learning the trap; invalid fields are still rejected first. Inquiry
creation also has a five-per-IP, 15-minute limit in addition to the general API limit.
The route accepts JSON only and rejects malformed, oversized or unsupported body formats
through the common API error contract.

The browser supplies a random `Idempotency-Key` for each submission attempt and retains
it across uncertain network/server failures. The backend stores only its SHA-256 hash.
A retry with the same key returns the original opaque acknowledgement instead of creating
a duplicate inquiry. Validation failures clear the key so corrected input can be
submitted normally; there is no heuristic matching that might discard a legitimate
second inquiry from the same person.

## Persistence and privacy boundary

Valid submissions are written through the Mongoose inquiry service with a consent
timestamp and initial `new` status. The API response returns only an identifier,
`received` acknowledgement and creation time; it never echoes personal data.

There is deliberately no `GET /inquiries` or other public read route. Staff reads and
updates live only under `/admin/inquiries` and require backend authentication plus the
named `inquiry:read` or `inquiry:update` permission. There is likewise no public
update/delete route and no email, messaging or external CRM integration that the UI
pretends is active.

The schema, service and HTTP workflow are implemented and covered with injected-service
tests. On 2026-09-05, a temporary synthetic inquiry was written to the project Atlas
database, read back and deleted by its exact identifier. This verifies live Mongoose
persistence without retaining test personal data.

## Staff workflow

The protected admin UI provides a paginated inquiry queue and a direct viewing-request
queue, private details, search, queue/inquiry-status/viewing-status/type/property filters,
status histories, internal notes, spam quarantine and recoverable archiving. Viewing
details show the requested Philippine date/time and allow only valid confirmation,
reschedule, completion or cancellation transitions. Cancellation requires explicit
browser confirmation. The established inquiry statuses remain `new`, `in-progress`,
`viewing-scheduled`, `closed`, `lost` and `spam`.

Spam is excluded from the default active queue. Marking an inquiry as spam remembers its
previous non-spam status; **Mark not spam** restores that status. Archived records leave
active and spam queues but remain available in the archive queue. Every mutation uses
the version from the latest read so a stale staff page cannot silently overwrite newer
work.

Internal notes are append-only through the API, limited to 1,000 characters each and 100
per inquiry. List responses omit message bodies, phone numbers, consent timestamps,
notes and history; those fields appear only in the authorized detail response.

## Privacy, audit and retention

Successful status, spam, note, archive and restore actions emit append-only security
audit events with actor, inquiry database ID, request ID, action and timestamp. Audit
events never contain names, contact details, message/subject text, note text, cookies,
session values or authentication secrets.

Viewing transitions emit `viewing.confirmed`, `viewing.reschedule-requested`,
`viewing.completed` or `viewing.canceled` against the containing inquiry. The event does
not contain customer details, message text, requested date or requested time; those
values remain available only in the permission-protected record and its viewing history.

There is no hard-delete endpoint. Archive is recoverable and records `archivedAt`, which
makes the collection ready for a future retention job once the owner approves a
retention period and legal/business deletion procedure. No automatic purge or retention
duration is invented in this level.

## Current blockers and exclusions

- Public business contact details and response expectations have not been supplied.
- Production abuse-control review is still required; no CAPTCHA or step-up challenge
  provider has been selected beyond the implemented honeypot and rate limits.
- Live inquiry reads and updates against the development Auth0 tenant and project
  MongoDB remain part of the existing manual admin acceptance gate.
- A requested time still requires staff confirmation; there is no live calendar or
  availability provider.
- Email delivery, notifications, uploads and external CRM handoff are not implemented.
