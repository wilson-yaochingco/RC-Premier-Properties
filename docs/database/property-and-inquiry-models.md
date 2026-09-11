# Property and Inquiry Models

Status: implemented Mongoose schemas and service contracts, including protected location
authoring and bounded Featured Property priority. Public persistence was verified against
Atlas on 2026-09-05; the Level 5 location changes still require a live admin acceptance
pass. Last reviewed 2026-09-11.

The repository includes the models, indexes, projections and service queries described
here. It does not include real listings or seed data. Automated tests verify query
construction and the HTTP layer with injected services. On 2026-09-05, live Atlas checks
verified a connected health response, temporary inquiry write/read/delete, and temporary
published-property create/public-read/delete with private fields excluded.

Phase 3A authentication collections plus property and inquiry administration routes now
exist. Authentication schema and retention rules are documented in
[`authentication-models.md`](authentication-models.md).

## Property taxonomy

The stable historical schema can read house and lot, condominium, townhouse, lot/land,
commercial, office and warehouse records without a migration. New administration and all
production-visible workflows accept only the approved residential sale types: house and
lot, townhouse, and lot/land. Historical condominium, apartment, rental, and commercial
records stay private and read-only for deliberate reconciliation.

The stable stored listing purpose can still read sale or rent, while every public query
and new admin write enforces sales-only inventory. Currency is PHP in the public MVP.

## Workflow and market state

Two concepts are stored separately:

- `publicationStatus`: `draft`, `published`, `unpublished` or `archived`. Public endpoints
  always add `publicationStatus: published`, `purpose: sale`, and the approved residential
  type set themselves; callers cannot override any public boundary.
- `availability`: `available`, `reserved` or `sold`. This is safe to show on a
  published listing and does not grant publication by itself.
- `featured`: a backwards-compatible boolean that defaults to false, plus optional
  integer `featuredOrder` from 1 through 999. A missing order remains valid for legacy
  Featured records and sorts after explicitly prioritized records.

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
| Public media metadata   | ID, kind, URL, alt, optional caption, source/provenance   | public when supplied                                    |
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

The private `coordinates` subdocument requires both numeric members whenever present.
Latitude is bounded to `[-90, 90]` and longitude to `[-180, 180]`; API validation also
rejects non-finite values, strings, malformed structures, and incomplete pairs before a
Mongoose write. The subdocument and `privateAddress` use `select: false` and are added
only to the authorized admin-detail projection. Admin list projections omit them.

Existing documents need no migration. Missing private/public coordinates are valid,
missing legacy precision is serialized as `city-only`, and no backfill derives or invents
location data. No geospatial index is added because current queries filter administrative
text and read explicitly approved points rather than querying by distance or bounds.

Indexes follow actual Phase 2A/Level 15/Part 4 access patterns: unique property ID and slug,
published listing recency, published purpose/type/price, location filtering,
bedroom/bathroom filtering, and a compound published/Featured/non-sold priority lookup
with `publishedAt` and `_id` tie breakers. Related inventory reuses those predicates
and caps candidates at 12. No speculative index, owner, or CRM schema is introduced.
The property ID is immutable after creation. The slug is mutable only until first
publication; `publishedAt` permanently closes that identity transition even after the
record is unpublished.

## Media

Media metadata is embedded because the public read pattern loads it with the property.
Gallery array order is display order. Each newly managed entry has a stable ID, kind,
provider-neutral URL/reference, alt text, optional caption, and production/sample source
classification. Sample records additionally carry a public source page and attribution.
`coverMedia` is the selected gallery entry copied for efficient list/map summaries; the
authorized service updates both fields atomically. Legacy URL-less entries still produce
an explicit UI placeholder. This decision does not select an upload or storage provider.

## Inquiry

An inquiry stores name, email, optional phone, inquiry type, optional property ID,
optional subject, optional viewing message, source, consent timestamp, workflow status
and timestamps.
Each new inquiry also embeds a private operational notification record: a random stable
delivery ID, `pending | sending | retry-pending | delivered | terminal-failure` state,
bounded attempt count, due/attempt/delivery dates, safe error code, and short database
lease. It is excluded from normal API selection. Existing pre-Level-12 records are not
given fabricated delivery history; the integrity scan reports missing state for review.
The delivery ID has its own unique sparse index and the due-state index supports an
external scheduled retry command. Inquiry acceptance never depends on email success.

The initial status is `new`. Staff management adds append-only status history, bounded
internal notes, a recoverable archive timestamp, the pre-spam status and an
optimistic-concurrency version. Inquiry records contain personal information and never
have an unauthenticated read endpoint. Legacy records that predate history are not
backfilled at read time; missing inquiry or viewing history remains explicit and is
reported by the integrity scan.

Viewing inquiries embed a one-to-one `viewingRequest` subdocument containing status,
requested `YYYY-MM-DD` date, requested `HH:mm` Philippine time and append-only status
history snapshots. This avoids duplicating customer and consent data in an appointment
collection while keeping appointment state separate from inquiry follow-up state. The
compound viewing-status/requested-date index supports the staff queue and Level 15
calendar. The related Property ID is accepted only when it resolves to a published,
not-sold residential sale property.

The public API returns only a new opaque inquiry identifier, `received` acknowledgment
and creation time. It never echoes the submitted personal data. Staff retrieval waits for
authenticated, authorized administration.

The hidden honeypot value is not persisted. An otherwise-valid request with a populated
honeypot is acknowledged without creating a record so automated senders cannot tune
around the control. Invalid fields are rejected before the honeypot decision.

Public clients may supply an `Idempotency-Key`. Only its SHA-256 hash is stored under a
unique sparse index, allowing a retry to recover the original acknowledgment without
storing the raw key or suppressing legitimate repeat inquiries heuristically.

## Form data purpose

- Name identifies the person asking for a response.
- Email provides the required response channel.
- Phone is optional and provides an alternate response channel when voluntarily supplied.
- Property ID connects an inquiry to the listing the visitor selected.
- Inquiry type and source route the request without behavioral tracking.
- Message contains the visitor's request.
- Requested date and time are collected only for a viewing and represent a preference,
  not live availability or confirmation.
- Consent timestamp records agreement to use the supplied details to answer that request.

No identity documents, payment details or seller-ownership documents are accepted by the
public Phase 2A forms.

## Administration boundary

Authenticated administrators can search and paginate private property DTOs, create an
available draft, preview it and edit content while the record is a draft or intentionally
unpublished. Collection responses omit private address and internal coordinates; an
authorized detail/edit response includes them because the existing editor manages those
fields. Owner reference and internal notes remain excluded. Create assigns `publicationStatus: draft` and
`availability: available`. Every mutation predicates on the returned `__v` value and
increments it atomically, preventing a stale administrator view from overwriting newer
work. Legacy records created before versioning are treated as version zero and acquire
version one on their first successful mutation, so no one-time data migration is needed.

Publishing, unpublishing, archiving, restoring and availability changes use separate
permission-protected endpoints. Archived records retain whether they should restore to
`draft` or `unpublished`; restoring never republishes a listing. Sold is a terminal
availability state. There is no hard-delete property endpoint: archiving is
the recoverable deletion policy and preserves inquiry and audit references.

Featured curation is a separate `property:write` mutation with the same version predicate.
Only published available/reserved records can be featured; unfeature remains possible
after a record becomes sold, unpublished, or archived. Lifecycle changes intentionally
retain the stored flag/order, while the public query independently excludes ineligible
records. Existing documents need no migration because missing `featured` serializes as
false and missing `featuredOrder` is supported.

Inquiry list queries use indexes on status/creation, Property ID/creation and
archive/creation. The default active queue excludes spam and archived records. Archived
records are retained and restorable; `archivedAt` is the future retention-selection
boundary, but no retention duration or hard-delete job exists until policy is approved.

Level 15 dashboard counts use server-side property/inquiry aggregations rather than
loading collections. Upcoming/calendar reads project only schedule identifiers and are
bounded at six and paginated in 200-record calendar pages. Audit/staff reads use their existing time, actor,
action, status/role, and email indexes with bounded pages. No new index was added without
representative `executionStats`; that evidence remains production/staging gate X04.

There is still no public update/delete route and no public inquiry read. Authorized image
metadata administration and validated binary device upload are implemented. The
development adapter is isolated locally; production storage/CDN remains blocked on
provider approval and fails closed.

Failed deletion of an adapter-owned object after a successful metadata change is stored
as a private `PropertyMediaCleanupTask`. Tasks contain a property reference, selected-off
by-default stable object reference, SHA-256 reference hash, failure reason/code, attempt
count, and dates. They remain `pending-review`; no TTL, repair, or automatic deletion job
exists. The unique hash/status index coalesces repeated failures without losing the need
for operator review.
