# Public Inquiries

Status: implemented create-only workflow with live Atlas persistence verified. Last
reviewed 2026-09-05.

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

## Persistence and privacy boundary

Valid submissions are written through the Mongoose inquiry service with a consent
timestamp and initial `new` status. The API response returns only an identifier,
`received` acknowledgement and creation time; it never echoes personal data.

There is deliberately no `GET /inquiries` or other public read route. Inquiry records
must not be exposed until authentication, staff authorization and operational retention
rules are designed. There is likewise no public update/delete route and no email,
messaging or CRM integration that the UI pretends is active.

The schema, service and HTTP workflow are implemented and covered with injected-service
tests. On 2026-09-05, a temporary synthetic inquiry was written to the project Atlas
database, read back and deleted by its exact identifier. This verifies live Mongoose
persistence without retaining test personal data.

## Current blockers and exclusions

- Public business contact details and response expectations have not been supplied.
- Production abuse-control review is still required; no CAPTCHA or step-up challenge
  provider has been selected beyond the implemented honeypot and rate limits.
- Inquiry reads and management require the absent auth/admin phase.
- A viewing submission is not a confirmed booking.
- Email delivery, notifications, uploads and external CRM handoff are not implemented.
