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
| Request a Tour dialog             | viewing with property context when available       | `viewing-page` |
| `/book-viewing`                   | opens the shared Request a Tour dialog             | `viewing-page` |
| `/sell`                           | selling                                            | `sell-page`    |

`/contact` accepts `propertyId` in the URL and prefills the form. `/book-viewing` remains
a direct entry point and opens the same Request a Tour dialog used by the header,
homepage and eligible property detail pages.

Approved public contact details are `rcpropertiesss@gmail.com` and
`+63 918 429 1873`. The approved Facebook, Instagram, YouTube and TikTok profiles appear
in the Contact page and shared footer. The repository contains no approved office address
or business hours, so neither is displayed.

## Form behavior

The general form collects name, email, optional phone, inquiry type, optional Property ID,
optional subject, message and explicit privacy consent. The Sell page instead fixes the
type to `selling`, removes the visible type and Property ID controls, and asks for the
seller's property area and relevant details. The viewing dialog fixes the type to
`viewing`, requires full name, phone, email, property context and structured requested
date and time, and keeps optional notes without a Subject field. A known property is
displayed rather than requested again; the generic tour entry asks for a Property ID.
The two-step dialog selects the schedule before collecting contact details. It has
persistent labels, native input
constraints, pending state, an accessible live success/error message and field issues
returned by the API. A successful response shows the opaque inquiry reference and repeats
that staff confirmation is still required.

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
time in append-only viewing history. Terminal mutations copy the current schedule and
ignore replacement date/time values, so completion or cancellation cannot rewrite the
recorded appointment. `no-show` is deliberately not modeled because the current
operational requirement does not justify another terminal state.

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
request with a filled honeypot receives the normal acknowledgment but is not persisted,
preventing bots from learning the trap; invalid fields are still rejected first. Inquiry
creation also has a five-per-IP, 15-minute limit in addition to the general API limit.
The route accepts JSON only and rejects malformed, oversized or unsupported body formats
through the common API error contract.

The browser supplies a random `Idempotency-Key` for each submission attempt and retains
it across uncertain network/server failures. The backend stores only its SHA-256 hash.
A retry with the same key returns the original opaque acknowledgment instead of creating
a duplicate inquiry. Validation failures clear the key so corrected input can be
submitted normally; there is no heuristic matching that might discard a legitimate
second inquiry from the same person.

## Request a Tour presentation

Request a Tour remains the same two-step inquiry workflow and retains property context,
date, Philippine time, name, email, phone, consent, optional notes, validation, focus
trapping, Escape, and opener-focus restoration. The dialog uses a wider desktop surface,
compact media and date controls, paired schedule columns where space permits, and a
three-column phone date row. At normal supported desktop and phone viewport heights, each
step fits without a dedicated internal scrollbar.

The dialog keeps bounded vertical overflow as an accessibility fallback. Very short
viewports, 200% text, browser zoom, and on-screen keyboards may scroll inside the native
dialog so no required field or action is clipped merely to preserve the normal-height
composition.

On a property detail route, the shared header and mobile-navigation action resolve the
current server-rendered property context before opening the dialog. The title, Premier
Property number and available cover media are carried into the presentation, and a sold
listing cannot open the request. Other public routes retain the generic flow. This is
display/context behavior only and does not weaken backend publication or availability
validation.

## Persistence and privacy boundary

Valid submissions are written through the Mongoose inquiry service with a consent
timestamp and initial `new` status. The API response returns only an identifier,
`received` acknowledgment and creation time; it never echoes personal data.

There is deliberately no `GET /inquiries` or other public read route. Staff reads and
updates live only under `/admin/inquiries` and require backend authentication plus the
named `inquiry:read` or `inquiry:update` permission. There is likewise no public
update/delete route and no external CRM or messaging service that the UI pretends is
active. A supplied property reference must resolve to a current property for every
inquiry type. A provider-neutral email notification is constructed only after persistence;
its disabled adapter now fails explicitly until a production provider is approved, while
the already accepted inquiry retains durable retry state.

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

Level 15 adds notification-delivery visibility to list/detail, actual last status-change
times from history, accessible copy controls for authorized contact fields, and
formula-neutralized export of the already loaded current page without phone, message,
consent, notes, or history. Legacy records without notification state are explicitly
`untracked`; absent inquiry or viewing history is shown as unavailable instead of being
fabricated from creation timestamps. The viewing page also includes a 42-day,
200-record-per-page Philippine-time calendar with an equivalent list; all pages remain
reachable, and the view does not create availability or confirmation.

The broad admin search uses a dedicated bounded inquiry projection. It may match private
identity/contact fields server-side but returns only the opaque inquiry ID, type, status,
and optional Premier Property number. Full contact data remains exclusive to the
permission-protected detail route.

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

All staff-facing instant timestamps are formatted deterministically in `Asia/Manila` and
retain their original ISO instant in `<time dateTime>`. Viewing wall-clock requests are
also explicitly Philippine time; neither display behavior depends on the browser or host
timezone.

## Notification boundary and current blockers

- No approved privacy policy has been supplied, so the consent UI is not linked to an
  invented legal document. **PRODUCTION PRIVACY/LEGAL REVIEW REQUIRED.**
- The official public email remains `rcpropertiesss@gmail.com`. It must not be replaced
  with a domain address until the owner supplies and verifies that replacement.
- Production abuse-control review is still required; no CAPTCHA or step-up challenge
  provider has been selected beyond the implemented honeypot and rate limits.
- Live inquiry reads and updates against the development Auth0 tenant and project
  MongoDB remain part of the existing manual admin acceptance gate.
- A requested time still requires staff confirmation; there is no live calendar or
  availability provider.
- MongoDB/Admin Inquiries remain authoritative. After persistence, the application builds
  a provider-neutral notification for `rcpropertiesss@gmail.com`. Delivery failure is caught
  and cannot roll back the accepted inquiry. The initial sender persists and owns a
  five-minute lease before sending, which excludes the retry worker until success,
  failure, or lease expiry. A stable non-sensitive identity, 5/30/120/360-minute backoff,
  five-attempt maximum, and terminal-failure state make retries bounded and observable
  without an in-process scheduler.
- A production transactional-mail provider and credentials are not selected. The current
  disabled adapter performs no external delivery, embeds no Gmail password, and makes the
  compiled retry command fail closed before claiming work.
