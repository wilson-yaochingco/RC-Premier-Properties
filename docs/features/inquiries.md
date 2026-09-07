# Inquiries

Status: public intake and lightweight staff management implemented. Public Atlas
persistence was verified on 2026-09-05; the staff workflow still requires the existing
live Auth0/MongoDB acceptance pass.

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

The form collects name, email, optional phone, inquiry type, optional Property ID,
optional subject, message and explicit privacy consent. It has persistent labels, native
input constraints, pending state, an accessible live success/error message and field
issues returned by the API. A successful response shows the opaque inquiry reference.

No account is created. Public seller inquiries do not accept identity, title or ownership
documents. The submission is not a valuation, listing agreement, offer, approval or
promise that the property will be published.

The viewing route is intentionally named for the visitor's task, but its behaviour is a
**request only**. It stores preferred timing in the message for follow-up; it does not
check availability, reserve a slot or confirm an appointment. Scheduling and appointment
management have not been implemented.

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

The protected admin UI provides a paginated inquiry queue, private details, search,
queue/status/type/property filters, status history, internal notes, spam quarantine and
recoverable archiving. It uses the established statuses `new`, `in-progress` and
`closed`, extended only with `viewing-scheduled`, `lost` and `spam`. This avoids a second
overlapping status system.

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
- A viewing submission is not a confirmed booking.
- Email delivery, notifications, uploads and external CRM handoff are not implemented.
