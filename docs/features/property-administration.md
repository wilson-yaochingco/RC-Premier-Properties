# Property Administration

Status: property lifecycle, Level 15 publish-readiness/current-page export, provider-neutral
image administration, and privacy-conscious location administration implemented.
Production upload remains blocked; inquiry administration is documented separately in
[`inquiries.md`](inquiries.md).

## Staff experience

The protected `/admin` shell checks the local staff session, keeps its CSRF token only in React memory, and exposes no cached or indexed private response. The property workspace provides:

- `/admin/properties` — server-paginated results with search, publication, and availability filters;
- `/admin/properties/new` — create an available private draft;
- `/admin/properties/[id]/edit` — edit draft or unpublished content; and
- `/admin/properties/[id]/preview` — protected pre-publication preview using the configured public location precision.

Search covers the Premier Property number, slug, title, and city. Results show loading, error, forbidden, empty, success, and pagination states. Lifecycle controls adapt to smaller screens and are hidden when the session lacks the relevant permission; Express remains the authorization boundary.

List and detail records expose backend-derived publication readiness. Staff see Complete
or Incomplete plus the exact current missing requirements, and cannot invoke Publish from
the list while incomplete. The backend remains authoritative and rejects the same case.
New/edit controls accept only house-and-lot, townhouse, and lot; historical non-residential
records are read-only for deliberate reconciliation. The list can export its already
authorized current page as formula-neutralized CSV without private coordinates or notes.

## Lifecycle

Publication and market availability remain separate:

```text
publication: draft -> published -> unpublished -> archived
availability: available -> reserved -> sold
```

- Publish accepts draft or unpublished records.
- Unpublish accepts only published records and produces `unpublished`.
- Archive accepts any non-archived record and immediately removes a published listing from public reads.
- Restore returns a never-published record to draft and a previously public record to unpublished. It never republishes automatically.
- Availability changes are accepted only while published. Available may become reserved or sold, reserved may return to available or become sold, and sold is terminal.
- Content is editable only while draft or unpublished.
- The Premier Property number is fixed after creation. The slug may change before first
  publication, then remains fixed through unpublish/edit cycles to preserve issued URLs.
- Image references, ordering, cover selection, alt text, captions and removals are
  editable only while draft or unpublished. Staff unpublish before changing live media.
- Location text, private address, verified exact coordinates, public disclosure precision,
  and an independently approved public map point use the same draft/unpublished edit.

## Location workflow

The location fieldset explains which data is private and which can appear publicly.
`privateAddress` and the internal latitude/longitude pair are returned only by protected
detail/edit responses. Admin list summaries omit them. `publicPoint` is a separate
GeoJSON `[longitude, latitude]` pair; it is never populated or derived from the private
pair. Staff must intentionally supply a reviewed point and select its public precision.

Both coordinate pairs are optional, but either pair must be complete. Server validation
accepts only finite JSON numbers in valid latitude/longitude ranges. Invalid, malformed,
partial, string, `NaN`, or infinite values are rejected. A property with no public point
continues to expose useful precision-filtered text and has no public marker.

Every mutation includes the version from the latest private read. The MongoDB update matches both ID and version, then increments the version atomically. A stale operation returns `409` and instructs staff to refresh.

## Safe deletion policy

There is no property hard-delete endpoint. Staff archive a record after an explicit confirmation. This keeps the action recoverable and preserves property references held by inquiries and security audit events.

## Authorization and auditing

Private reads and preview require `property:read-private`. Create, content edit and media
management require `property:write`. Publish, unpublish, archive, and restore require
`property:publish`. Availability transitions require `property:change-availability`.
Every write also requires the configured origin, session-bound CSRF token, and JSON
content.

Successful create, edit, media update, publish, unpublish, reserve, sold, general
availability change, archive, and restore actions emit allowlisted audit events. Events
contain actor, property database ID, request ID, timestamp, outcome, and content field
names when relevant; they contain no property values, media URLs, request body, cookies,
CSRF data, provider tokens, private addresses, or coordinate values. A location edit is
recorded only as the changed top-level field `location`.

Property persistence and audit insertion remain separate MongoDB writes, matching the documented session-audit limitation. A failed audit insert fails the HTTP request but does not roll back a completed property mutation.

For media compensation and removal, the database is also the ownership authority. Before
deleting an adapter-owned reference, the service checks every gallery and cover reference;
a still-referenced object is retained, and an unavailable reference check fails safe into
private cleanup debt. Client metadata updates cannot introduce a new adapter-owned
reference outside the validated device-upload path.

## Deferred boundaries

Production object storage/provider deletion, staff mutation, and hard deletion remain
deferred or blocked. Level 15 adds only read-only staff identity visibility through the
existing architecture; provisioning/deactivation remain the audited CLI workflows.
Validated device upload uses the existing media metadata model and an
isolated development adapter; production fails closed until a provider is approved. See
[`property-media.md`](../architecture/property-media.md).
Inquiry administration was added in the next scoped level. The Auth0 development tenant
still requires the manual end-to-end acceptance steps in
[auth0-setup.md](../development/auth0-setup.md).
