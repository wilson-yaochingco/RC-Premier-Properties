# Property and Inquiry Models

Status: implemented Mongoose schema and service contract with live Atlas persistence
verified. Last reviewed 2026-09-05.

The repository includes the models, indexes, projections and service queries described
here. It does not include real listings or seed data. Automated tests verify query
construction and the HTTP layer with injected services. On 2026-09-05, live Atlas checks
verified a connected health response, temporary inquiry write/read/delete, and temporary
published-property create/public-read/delete with private fields excluded.

Phase 3A authentication collections now exist, but no property-administration or
inquiry-read route has been added. Their schemas and retention rules are documented in
[`authentication-models.md`](authentication-models.md).

## Property taxonomy

The first supported property types are house and lot, condominium, townhouse, lot/land,
commercial, office and warehouse. This is deliberately smaller than every possible real
estate category and directly supports the supplied discovery requirements.

Listing purpose is either sale or rent. Currency is PHP in the public MVP.

## Workflow and market state

Two concepts are stored separately:

- `publicationStatus`: `draft`, `pending`, `published` or `archived`. Public endpoints
  always add `publicationStatus: published` themselves; callers cannot override it.
- `availability`: `available`, `reserved`, `sold` or `rented`. This is safe to show on a
  published listing and does not grant publication by itself.

Separating these prevents a reserved property from accidentally becoming public merely
because its market state changed. The vocabulary should still receive business approval
before production administration is built.

## Property fields and disclosure

| Field group             | Examples                                                  | Classification                                          |
| ----------------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| Public identity         | property ID, slug, title                                  | public when published                                   |
| Public listing          | purpose, type, availability, featured                     | public when published                                   |
| Public pricing          | PHP amount, negotiability                                 | public when published                                   |
| Public location text    | province, city, optional barangay/development             | redacted according to `publicPrecision`                 |
| Approved map location   | `publicPrecision`, optional GeoJSON `publicPoint`         | public only when independently approved                 |
| Internal exact location | private street address and internal latitude/longitude    | excluded from normal selection and public serialization |
| Specifications          | beds, baths, parking, lot/floor area, storeys, furnishing | public when supplied                                    |
| Content                 | short/full descriptions, highlights, amenities, features  | public when published                                   |
| Public media metadata   | approved URL, kind and alt text                           | public when supplied                                    |
| Workflow                | publication status, internal timestamps                   | internal; selected only as needed                       |
| Ownership               | owner details, private notes, internal references         | never serialized publicly                               |

`publicPrecision` is one of `exact`, `approximate`, `subdivision`, `barangay-area` or
`city-only`. It controls both the optional location text and the meaning of
`publicPoint`. City-only records omit barangay and development; barangay-area records
omit development; the other levels may include both when supplied. Missing or invalid
explicit precision serializes as city-only and suppresses the point.

`publicPoint` is a validated GeoJSON point in `[longitude, latitude]` order. It is not
the internal `coordinates` field, and public serialization never copies, rounds, jitters
or otherwise derives it from that internal field. A record has no public marker unless a
separate point and precision were deliberately stored. The `exact` option exists for an
explicitly approved future record; it does not make a private exact address public by
default. See
[`geographic-data-and-maps.md`](../architecture/geographic-data-and-maps.md).

Indexes follow actual Phase 2A access patterns: unique property ID and slug, published
listing recency, published price, location/type filtering and featured listing lookup.
No owner or CRM schema is introduced by this phase.

## Media

Media metadata is embedded because the public read pattern loads it with the property.
The URL is optional while storage is unselected, so missing media produces an explicit UI
placeholder. This decision does not select an upload or storage provider.

## Inquiry

An inquiry stores name, email, optional phone, inquiry type, optional property ID,
optional subject, message, source, consent timestamp, workflow status and timestamps.
The initial status is `new`. Inquiry records contain personal information and never have
an unauthenticated read endpoint.

The public API returns only a new opaque inquiry identifier, `received` acknowledgement
and creation time. It never echoes the submitted personal data. Staff retrieval waits for
authenticated, authorized administration.

The hidden honeypot value is not persisted. An otherwise-valid request with a populated
honeypot is acknowledged without creating a record so automated senders cannot tune
around the control. Invalid fields are rejected before the honeypot decision.

## Form data purpose

- Name identifies the person asking for a response.
- Email provides the required response channel.
- Phone is optional and provides an alternate response channel when voluntarily supplied.
- Property ID connects an inquiry to the listing the visitor selected.
- Inquiry type and source route the request without behavioral tracking.
- Message contains the visitor's request.
- Consent timestamp records agreement to use the supplied details to answer that request.

No identity documents, payment details or seller-ownership documents are accepted by the
public Phase 2A forms.

## Administration boundary

There is no authenticated writer or staff dashboard. Property records currently have no
public create/update/delete route, and inquiry records have no public read/update/delete
route. Those operations must wait for the authentication and authorization design; the
existence of a Mongoose model is not permission to expose it.
