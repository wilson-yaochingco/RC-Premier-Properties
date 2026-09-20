# Property Media Architecture

Status: device upload and development storage implemented on the provider-neutral Level 4
metadata model; production object storage/CDN remains blocked. Last reviewed 2026-09-08.

## Boundary

Website design media and listing media are separate systems. Supplied UI photography is
source-controlled under `frontend/src/assets` and may compose the public site without
claiming to depict a specific listing. Listing media belongs to exactly one property and
is persisted through the protected property administration workflow. Real listing
galleries are never hardcoded into the website-design asset set.

The property document stores ordered metadata, not image bytes. Each image has a stable
server-controlled `id`, public delivery `url`, alternative text, optional caption,
`source`, and optional `{x, y}` focal point percentages. Array position is gallery order;
`coverMedia` is the selected entry copied for efficient cards and map previews. The
gallery and cover update atomically under optimistic concurrency. The maximum is 24.

## Upload flow

```text
staff device
  → authenticated POST of one raw image
  → exact-origin + CSRF + property:write checks
  → declared MIME/signature/decode/size/dimension validation
  → provider-neutral storage adapter
  → atomic MongoDB gallery + cover update
  → minimized security audit
```

The UI supports multi-select and drag/drop by queueing individual uploads. This makes
progress, retry, and errors accurate per file while each successful upload receives a new
optimistic version. Accepted inputs are PNG, JPEG, and WebP, at most 12 MB, one decoded
frame, 12,000 pixels per side, and 80 million input pixels. No client filename becomes a
path or key; unknown metadata, traversal attempts, MIME mismatch, executable masquerading,
damaged files, and animation are rejected.

Normal administration exposes only this device-upload path for adding an image. Once
uploaded, staff can preview, reorder, edit alt/caption/focal metadata, select any existing
gallery image as cover, and remove it safely. Stored provider-neutral references remain
readable and renderable but are read-only in the form; the old “Add production image
reference” control is not part of the normal workflow.

The protected endpoint is:

`POST /api/v1/admin/properties/:id/media/uploads?expectedVersion=…&alt=…&caption=…`

The body is the raw image bytes with `Content-Type: image/png`, `image/jpeg`, or
`image/webp`. It returns the updated private property. Existing JSON
`PUT /api/v1/admin/properties/:id/media` remains the ordered metadata, cover, focal-point,
and removal mutation.

## Storage adapters

Development uses `LocalDevelopmentPropertyMediaStorage`. It retains the source privately
under `frontend/.local-media-sources/`, auto-orients and bounds the display copy to 3200
pixels, strips metadata, and writes an 88-quality WebP under
`frontend/public/media/properties/`. Both paths are ignored. UUID storage names are
created by the server. Locally generated files removed from metadata are deleted only
after the database mutation succeeds. A failed owned-object deletion does not re-add
metadata: it creates private `pending-review` cleanup debt. If upload storage succeeds
but metadata persistence fails, failed compensating deletion creates the same durable
debt without hiding the original database error.

Audit insertion is a separate durable boundary. A newly uploaded object is compensated
only after a repository-wide gallery/cover reference check proves that metadata did not
commit anywhere. A post-commit audit failure therefore never deletes an object referenced
by the property, including a commit-then-throw persistence result. Removal orders
metadata, audit, reference reconciliation, then physical cleanup. The same reconciliation
protects legacy cross-property references. If the reference check or audit fails after
removal metadata commits, the object is retained as cleanup debt for operator review.
Development transformation compensation reports its own cleanup-failure code when
source/derivative removal fails. The metadata-only endpoint rejects attempts to introduce
a new adapter-owned reference; validated upload is the sole creation path for such
references.

Production selects `UnavailablePropertyMediaStorage` and returns 503 with the reviewed
static message “Production property media storage is not configured.” Unexpected storage
and server failures remain masked in production and retain private operational logs.
This fail-closed
choice makes it impossible to deploy local filesystem storage accidentally. Selecting a
real provider still requires approved credentials/bucket topology, an exact delivery
hostname, signed-upload/lifecycle decisions, retention/orphan policy, CDN caching, and
live acceptance. It must also define a reviewed owned namespace and stable non-secret
object references. Orphan work remains report/quarantine/recheck/operator approval; no
automatic cleanup path exists. No provider or credential has been invented.

Level 11 adds one optional exact delivery-origin boundary. Backend
`MEDIA_PUBLIC_ORIGIN` governs accepted production image references; frontend
`NEXT_PUBLIC_MEDIA_ORIGIN` must match it and drives rendering, Next Image, metadata, and
CSP allowlisting. Both require HTTPS in a public deployment. With no configured origin,
external production URLs remain rejected rather than widening to arbitrary hosts.
Uploads continue through Express, so object storage needs no browser write CORS.

## Public rendering

`next/image` reserves the media ratio and emits responsive formats. Focal points affect
fixed-ratio cover/card crops without modifying originals. Fullscreen presentation uses
`object-fit: contain`, preserves portrait aspect ratio, provides index/count,
previous/next, arrow keys, Escape, mobile swipe, and accessible controls. Missing media
uses a restrained neutral fallback.

The old normal-admin development-sample picker is removed. Development fixture code may
remain for isolated tests, but optimized and production builds refuse to render a sample
as real listing media. No sample is seeded or used as production output.
