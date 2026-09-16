# Production Content, Branding, and Media

Status: Level 7 engineering implemented; production object storage and transactional
email delivery remain deployment gates. Last reviewed 2026-09-08.

This document describes the user-requested Level 7 delivery slice. “Level 7” here is not
the roadmap's post-launch Phase 7 and does not authorize any later roadmap functionality.

## Approved public information

- Business name: RC Premier Properties
- Email: `rcpremierph@gmail.com`
- Phone: `+63 918 429 1873` (`tel:+639184291873`)
- Facebook Page:
  `https://www.facebook.com/people/RC-Premier-Properties/61588365958516/`
- Primary service area: Pampanga, Philippines, with Angeles City as a primary focus

No office address, business hours, additional social account, personal administrator
profile, company history, founder biography, award, or sales claim is approved.

Approved About copy:

> RC Premier Properties offers houses and residential properties for sale in Pampanga.
> Browse available listings, explore locations, inquire about properties, and schedule a
> viewing to find a home that suits your needs.

Public and staff copy uses standard American English. Stable internal field names are not
renamed solely for spelling when doing so would create compatibility risk.

## Brand and website media

The approved logo and favicon are stored with their source PNGs. Display derivatives only
remove transparent outer margins; the artwork is not redrawn or recolored. The replaced
legacy `favicon.ico` is recoverable from Git history.

Website design media is source-controlled under `frontend/src/assets/`. It is separate
from property listing media and must never be represented as one listing's gallery. The
assignments are:

| Asset                | Use                                  |
| -------------------- | ------------------------------------ |
| `home-hero-1.png`    | Homepage hero exterior               |
| `home-hero-2.png`    | Homepage hero pool/courtyard         |
| `home-hero-3.png`    | Homepage hero interior               |
| `properties.png`     | Featured-properties editorial image  |
| `location.png`       | Explore-by-location section          |
| `why-rc-premier.png` | Why RC Premier section               |
| `book-viewing.png`   | Homepage and viewing-request imagery |
| `contact.png`        | Contact imagery                      |
| `about.png`          | About page imagery                   |
| `footer.png`         | Restrained footer background         |

The current Home hero uses the exact supplied `frontend/src/assets/site/home_hero.jpg`
through its existing static Next Image import. The About hero video uses the exact
supplied `frontend/public/media/about_video.mp4`. Neither source file is edited or
re-encoded. Existing media overlays, gradients, filters, cropping, responsive layout,
and video playback/reduced-motion behavior are preserved.

All optional assets named in the Level 7 request were supplied. No random web or
AI-generated substitute is used. Source PNGs remain unchanged; `next/image` supplies
intrinsic dimensions, responsive `sizes`, lazy loading outside the LCP image, and WebP or
AVIF delivery. Portrait images use portrait grids and entire-image gallery presentation.
They are never stretched or generatively outpainted.

The homepage location list and counts come from published property aggregation. Empty and
unavailable states do not imply inventory. The three supplied YouTube Shorts use a local
lightweight facade; no player loads before interaction and the original Shorts links remain
available.

## Listing uploads

The existing property gallery metadata remains authoritative. On an editable draft or
unpublished property, staff can select or drag multiple device images, preview them, enter
alternative text and an optional caption, observe per-file progress/errors, retry failed
uploads, and then reorder, choose a cover, set non-destructive focal-point percentages, or
remove media. The existing maximum remains 24 images.

Each upload is a protected mutation. It requires an active application session,
`property:write`, exact allowed origin, session CSRF, and the current optimistic version.
The backend accepts PNG, JPEG, and WebP up to 12 MB. It compares declared MIME with file
signatures, decodes with a bounded pixel limit, rejects damaged/animated/oversized images,
ignores no client path, and rejects unknown upload metadata. Storage keys are UUIDs created
by the server. Audit events contain no file bytes, URLs, CSRF values, or customer data.

In development only, the adapter retains the original under
`frontend/.local-media-sources/` and writes a metadata-stripped, auto-oriented, maximum
3200-pixel WebP derivative under `frontend/public/media/properties/`. Both directories are
ignored. Removed locally generated media is cleaned up after a successful metadata update.
The adapter checks production mode and cannot be used there. Production fails closed with
503 until an object-storage/CDN provider is explicitly selected and configured.

The “Add licensed development sample” control is absent from normal administration.
Legacy sample fixtures remain isolated to development tests, and optimized/production
frontend builds refuse to render them as listing media.

## Inquiry and notification behavior

MongoDB and Admin → Inquiries remain the source of truth. The sequence is validate, store,
acknowledge persistence, and attempt a provider-neutral notification to
`rcpremierph@gmail.com`. Notification construction includes only appropriate contact and
listing context plus the protected admin URL. A send failure is caught after persistence
and cannot roll back or invalidate the inquiry.

No mail provider or credentials are configured. `DisabledInquiryNotifier` is the explicit
boundary until a production transactional-mail provider is approved; a normal Gmail
password must never be used. Provider configuration and live delivery acceptance remain a
deployment gate.

## Navigation and public interactions

Admin routes render one admin header. Dashboard, Properties, Inquiries, Viewings, and Create
Draft remain under `/admin`; only “View Website” and “View Public Listing” intentionally
leave it. Public Contact stays separate from the single Request a Tour modal, which is
prominent and remains connected to the existing viewing-inquiry workflow.
Property-detail viewing links preselect the existing property-aware viewing request, and
sold properties do not show a viewing action.

Property details include availability, quick facts, photo count/index, fullscreen
portrait-safe viewing, keyboard and swipe navigation, property-number copy, native share
with copy fallback, trustworthy last-updated date, a privacy explanation matching location
disclosure, filtered Back to Results state, and a safe-area-aware mobile inquiry/viewing
bar.

## Acceptance boundary

Automated checks cover file formats and byte validation, size and path rejection, upload
authorization/CSRF/origin boundaries, metadata persistence, server-controlled naming,
focal-point validation, source-of-truth notification order/failure, production sample
gating, admin navigation, and existing Levels 1–6 regressions. Browser acceptance can
exercise the local adapter. Live object storage/CDN and email delivery are blocked until
providers and credentials are supplied; they must not be reported as passed.

The local browser pass verifies the public/admin shell boundary, responsive layouts from
320 through 1920 pixels, supplied branding and photography, sales-only inventory,
inventory-derived locations, lazy video facades, property-aware inquiry/viewing links,
portrait-safe fullscreen controls, copy/share feedback, and the device-file upload UI.
Rendered desktop and mobile captures are reviewed for proportion and overflow. Live Auth0
administration, real MongoDB inventory, a physical phone/device picker, production storage
and CDN delivery, and transactional email receipt remain external manual checks.
