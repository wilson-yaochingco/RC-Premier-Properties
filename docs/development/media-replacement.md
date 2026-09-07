# Media and Brand Asset Replacement

Status: property image-reference workflow implemented; all production assets and binary
storage/upload remain external blockers. Last reviewed 2026-09-07.

The repository ships no downloaded photographs, videos, or AI-generated property
imagery. It includes four centralized remote Unsplash references for conspicuously
labelled development use only. During `next dev`, property surfaces select one of them as
a deterministic, presentation-only fallback only when the property has no assigned
media. The supplied project attachment contains requirements but no usable RC Premier
Properties logo or media files. Public contact details and real listing records were not
supplied either.

This guide identifies every current replacement point without treating placeholder
content as finished media.

## Asset rules

1. Confirm that RC Premier Properties owns or is licensed to publish each asset.
2. Keep secrets, signed storage URLs and private seller media out of the frontend.
3. Preserve the existing container/aspect-ratio class so replacing an asset does not
   reflow the page.
4. Give every informative image property-specific alternative text. Decorative media
   should use an empty alternative, not a generic filename.
5. Use `next/image` for images and provide responsive `sizes`; use a deliberate video
   component for video rather than passing a video file to an image renderer.
6. Verify 320, 360, 375, 390, 412, 430, 768, 820, 1024, 1280, 1366, 1440, 1600 and 1920
   pixel widths after replacement, including crop focal points and reduced-motion
   behaviour.
7. Never expose a private street address or exact map pin merely because media metadata
   contains it.

For repository-owned assets, place optimized files beneath `frontend/public/` and refer
to them with a root-relative path such as `/media/properties/example/cover.webp`. Do not
commit original camera masters. A remote media provider has not been selected; choosing
one requires environment, host allow-list, privacy and operational decisions first.

## Replacement inventory

| Visible placeholder or slot                | Owner file                                                                      | Expected replacement                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| text-only RC Premier Properties brand slot | `frontend/src/components/layout/SiteHeader.tsx` and `SiteFooter.tsx`            | approved logo asset plus accessible home link                               |
| `[HOME HERO VIDEO]`                        | `frontend/src/app/page.tsx`                                                     | supplied hero video with poster/fallback and non-disruptive playback policy |
| `[PAMPANGA LOCATION IMAGE]`                | `frontend/src/app/page.tsx`                                                     | supplied location/lifestyle image                                           |
| `[ABOUT IMAGE]`                            | `frontend/src/app/about/page.tsx`                                               | supplied brand or team-context image                                        |
| `[PAMPANGA LOCATION MAP]`                  | `frontend/src/app/about/page.tsx`                                               | approved general-area map treatment                                         |
| `[PROPERTY IMAGE]`                         | `frontend/src/features/properties/PropertyCard.tsx` through `PropertyMedia.tsx` | listing `coverMedia` image                                                  |
| `[PROPERTY GALLERY IMAGE 01–03]`           | `frontend/src/app/properties/[slug]/page.tsx` through `PropertyMedia.tsx`       | first three approved listing gallery images                                 |
| `[PROPERTY MAP / GENERAL AREA]`            | `frontend/src/app/properties/[slug]/page.tsx`                                   | approved general-area map; no exact pin by default                          |
| `[AGENT PHOTO]`                            | `frontend/src/app/properties/[slug]/page.tsx`                                   | approved agent photo only after a verified public profile is supplied       |

`frontend/src/components/ui/MediaPlaceholder.tsx` owns the neutral placeholder
presentation. Do not remove it globally after adding one asset: it remains the correct
production fallback for listings whose media is absent or withheld.

## Property-record media

The shared property contract supports an ordered gallery and selected cover with stable
ID, kind, URL, alt, optional caption and production/sample provenance. `PropertyMedia`
renders safe local `/media/properties/...` raster paths and the narrowly configured
Unsplash development-sample host through `next/image`; absent, protocol-relative,
unapproved remote, executable, or otherwise unsupported URLs remain placeholders.

The automatic sample fallback never mutates the property response, calls the media API,
or persists metadata. It is enabled only when Next.js reports the development runtime.
The property ID produces a stable catalogue index, so a listing does not change images
between renders. Assigned media bypasses this fallback immediately. Optimized production
builds keep the neutral placeholder when media is absent.

Although the schema reserves `video` and `floor-plan` kinds, no video player or floor-plan
viewer is implemented. Add explicit rendering and accessibility behaviour before storing
those URLs in real records. Do not label a video URL as an image to bypass the boundary.

No real listings or seed data are provided. Live MongoDB persistence is verified. Staff
introduce media metadata through the authorized, CSRF-protected property editor. Add
actual files below `frontend/public/media/properties/<property>/` and enter their
root-relative paths, or replace references after an approved provider integration. Never
reclassify a sample as production; replace its URL, alt/caption and source metadata with
the verified RC asset.

The sample picker and exact provenance are documented in
[`property-media.md`](../architecture/property-media.md). No AI-generated property image
was created for this level.

## Map and contact dependencies

No production map provider, API key, office address or public contact channel has been
approved. Map placeholders therefore describe only Angeles City/Pampanga or the public
listing's general area. The Phase 2A map uses configurable evaluation tiles only. Any
future provider key must follow that provider's server/browser-key guidance and must not
be embedded as an unrestricted secret.

The footer and contact page deliberately say that business contact details are pending.
Replace that copy only when the business supplies and approves the exact phone, email,
office hours, messaging links and address to publish.

## Acceptance checklist

- Approved logo remains legible in header, mobile navigation context and footer.
- Images do not distort, overflow or cause unexpected layout shift.
- Video has a poster/fallback, does not require sound and respects reduced motion.
- Alternative text describes the specific asset rather than its visual placeholder.
- Property cards and detail pages still have a working missing-media fallback.
- Development samples appear only in development, remain visibly labelled, and disappear
  as soon as assigned media exists.
- Maps disclose only approved location precision.
- Production build and responsive browser checks pass after asset replacement.
