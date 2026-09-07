# Property Media Architecture

Status: provider-neutral image metadata administration and public rendering implemented.
Production storage/upload and real RC Premier Properties media remain external blockers.
Last reviewed 2026-09-07.

## Capability boundary

The verified production-capable part of this slice is the property document contract,
authorized metadata workflow, public delivery behavior, and missing-image fallback. It
does not claim that production binary upload is available. No storage provider, bucket,
credentials, transformation service, or deletion API has been approved.

Staff can manage image references on draft or unpublished properties. The complete
ordered list is replaced atomically through one versioned request. The first-class media
metadata is:

- stable `id`;
- `kind` (`image` in the current admin workflow);
- provider-neutral `url` or storage reference;
- descriptive `alt` text;
- optional `caption`;
- `source` (`production` or `development-sample`);
- sample-only `sourceUrl` and `attribution`.

Array position is display order. `coverMedia` is a denormalized copy of the selected
gallery entry so catalogue/map summaries do not need the full gallery. The mutation
service writes the gallery and cover together, and clearing the gallery also clears the
cover. Existing legacy media records remain readable; the next authorized media save
adds stable identifiers and source classification.

## Production capability

Production references are currently restricted to root-relative raster paths below
`/media/properties/`, with `.avif`, `.jpg`, `.jpeg`, `.png`, or `.webp` extensions. This
is suitable for repository-owned development/staging assets and keeps executable SVG,
HTML, script, protocol-relative, traversal, and arbitrary remote references out of the
trusted image surface.

Selecting a real storage provider will require a focused follow-up that:

1. approves the provider and account/bucket topology;
2. implements authenticated server-side upload and provider-side deletion;
3. validates content by actual bytes/MIME, not filename alone;
4. applies size, pixel-dimension, filename/key, and metadata limits;
5. adds only the exact delivery hostname/path to both backend validation and Next.js
   `remotePatterns`;
6. records upload/replacement/removal audit events without signed URLs or file bytes; and
7. verifies lifecycle, retention, cache, and orphan-cleanup behavior.

No upload endpoint exists before those decisions, so arbitrary executable content cannot
be uploaded and publicly served by this application.

## Development sample capability

The admin editor offers four manually selected Unsplash photographs. They are never
seeded, never attached to a property by the presentation fallback, and never used to
infer listing facts. During `next dev`, a property with no assigned media receives one
of these references in memory for rendering only. A stable identifier hash makes the
selection deterministic across its card, detail gallery and protected admin preview.
The fallback does not call the API or change MongoDB.

Assigned media always takes precedence. Optimized/test builds do not activate the
automatic fallback, so a production property without media retains the neutral
placeholder. Every sample—whether manually selected in the editor or used as a
development fallback—carries `source: development-sample`, its public source page and
attribution. Every renderer overlays “Development sample — not this listing.”

Sources:

- [Damien Schneider — modern house and pool](https://unsplash.com/photos/a-house-with-a-pool-in-front-of-it-GvOcpTNAHFo)
- [rawkkim — patio and pool](https://unsplash.com/photos/a-house-with-a-patio-and-a-pool-OgUcsFltXOo)
- [Roberto Nickson — contemporary living room](https://unsplash.com/photos/rEJxpBskj3Q)
- [GoodLifeConstruction — modern house exterior](https://unsplash.com/photos/modern-garage-doors-on-a-white-house-3qRx6B4cT6g)
- [Unsplash License](https://unsplash.com/license)

Only `https://images.unsplash.com/photo-...` is admitted for development samples. The
backend permits a small query-parameter allowlist and requires provenance on
`https://unsplash.com/photos/...`; Next.js permits only HTTPS on `images.unsplash.com`
under `/photo-**`. There is no broad remote wildcard.

No AI-generated property imagery was created or included.

## Admin and public behavior

The existing `property:write` permission protects the media mutation; the route also
requires authentication, exact origin, session-bound CSRF, JSON, a current optimistic
version, unique IDs, bounded text, at most 24 images, and a cover ID belonging to the
submitted list. Published records must be unpublished before media changes. A successful
mutation emits `property.media-updated` with actor/property/request metadata only—never
image URLs or raw data.

The admin editor provides an empty state, image preview, add-reference and sample picker,
cover radio, move up/down controls, editable URL/alt/caption, confirmation before removal,
pending/error/success states, and a protected gallery preview. Editing the URL replaces
an image reference; removal changes only property metadata because no provider asset
exists to delete.

Public cards use `coverMedia`; when absent during development, they use the deterministic
presentation-only sample. Property details provide one selected image, keyboard buttons
for other images, the full ordered thumbnail rail, captions/provenance, and the same
development-only fallback when no media is assigned. Production retains stable neutral
fallback slots. `next/image` reserves the established aspect-ratio containers, uses
responsive `sizes`, preloads only the detail hero, and leaves other images lazy by
default.

Video links, floor plans, and PDF brochures remain future media types. Existing kind
vocabulary is preserved, but no fake player, viewer, upload button, or brochure control
is exposed.

## Verification

Automated backend coverage exercises metadata normalization and rejection, approved URL
boundaries, unique IDs, cover membership, ordering, removal, stale versions, lifecycle
restrictions, audit minimization, and anonymous/forbidden/origin/CSRF HTTP failures. The
browser fixture covers adding licensed samples, reordering, cover selection, saving,
protected preview, visible sample labelling, and media-editor overflow checks at mobile,
tablet, and desktop widths. Unit coverage verifies deterministic selection and the
non-development gate. The production browser fixture verifies that an unassigned
property keeps its neutral placeholder. Upload MIME/size tests do not exist because no
upload endpoint accepts bytes.
