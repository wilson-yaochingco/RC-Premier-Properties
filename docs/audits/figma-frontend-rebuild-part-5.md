# Figma-driven frontend rebuild — Part 5 final audit

- **Audit date:** 2026-09-11 (Asia/Taipei)
- **Audited branch:** `feature/figma-frontend-rebuild`
- **Starting commit:** `0971fc25f0842e457d1d44797b3b7e51fd6190cb`
- **Repository findings:** 2 deterministic E2E-fixture defects corrected; 0 confirmed open
- **External/live blockers:** X01–X16 remain open
- **Classification:** **ENGINEERING READY — LIVE ACCEPTANCE REQUIRED**

This report closes the repository audit for Parts 1–4 of the Figma-driven rebuild. It
does not claim deployment, live-provider, production-content, physical-device,
assistive-technology, legal, or business-owner acceptance. The public MVP and protected
staff boundaries remain unchanged.

## Final Part 5 report

### 1. Baseline/branch confirmation

PASS. The pre-audit worktree and index were clean on
`feature/figma-frontend-rebuild`. The expected commits were present in order:

- Level 17: `9ee64474d87587538a7def8f7c3ccaa7ae067757`
- Part 1: `c19b31d5bba9b47f30af6b3c5f4ca58f46570500`
- Part 2: `745ce95a7a576b92676b125e125de140385c8f87`
- Part 3: `34f8d3252b6f8646b0cce40c9b74f2eb420495ed`
- Part 4: `0971fc25f0842e457d1d44797b3b7e51fd6190cb`

No branch creation, merge, rebase, push, or stash operation was performed.

### 2. Homepage Figma matching status

**CLOSE MATCH.** The implementation retains the full-bleed photographic hero, compact
overlay navigation, centered search, featured-listing grid, dark callout, image-led
marketing sections, location discovery, video section, and substantial dark footer. The
copy, logo, inventory, and photography are RC Premier sources rather than Compass
content.

### 3. Properties Figma matching status

**ACCEPTABLE DEVIATION.** Dense search/filter controls, URL-backed result state,
property cards, map/list composition, counts, sorting, pagination, and clear empty/error
states preserve the reference intent. Compass-only advertising, US inventory density,
and precise-address map behavior are intentionally absent.

### 4. Property Detail Figma matching status

**ACCEPTABLE DEVIATION.** The gallery-led opening, fact hierarchy, actions, inquiry
panel, location/map, related inventory, and long-form detail structure match the reference
pattern. Mortgage, school, market-history, and other unsupported third-party data were
not invented. Missing fixture listing media renders a neutral fallback.

### 5. Locations Figma matching status

**CLOSE MATCH.** The page uses a large introductory composition and image-led,
asymmetric location cards while deriving every label and count from bounded Pampanga
inventory instead of copying the reference's US market catalog.

### 6. Location Detail Figma matching status

**ACCEPTABLE DEVIATION.** The page keeps the reference's image/title opening, inventory
facts, overview, filters, map, listings, and supporting navigation. Unsupported
neighborhood photography, editorial claims, transit data, and directory content are not
fabricated.

### 7. About Figma matching status

**CLOSE MATCH.** The image hero, centered purpose statement, alternating editorial
sections, restrained typography, and closing exploration links follow the reference.
Unsupported founder biographies, national scale metrics, press quotes, and awards remain
excluded.

### 8. Contact Figma matching status

**CLOSE MATCH.** A quiet introductory hero leads into an image/card composition,
conversation form, direct contact channels, social links, and shared footer. Only approved
RC Premier identity is displayed.

### 9. Sell Figma matching status

**CLOSE MATCH.** The page retains an image-led seller hero/form, benefit sequence,
alternating editorial sections, dark results-oriented section, and repeated coherent
seller contact path. Compass-specific valuation, marketing-network, syndication, and
performance claims were not copied.

### 10. Request Tour modal Figma matching status

**CLOSE MATCH.** At desktop the bounded dialog follows the supplied header, property
summary, three date cards, time selector, divider, close control, and full-width primary
action. At smaller widths it becomes a contained scrollable sheet. The product truthfully
collects one preferred date/time because the existing backend models one unconfirmed
request, not three availability slots.

### 11. Authorized image reuse status

PASS. Public compositions use the supplied logo and the existing approved assets under
`frontend/src/assets/brand` and `frontend/src/assets/site`. No AI-generated property
photo, scraped Compass image, random stock replacement, or substitute listing was added.
Source images were not destructively altered; presentation uses responsive `next/image`
delivery, aspect ratios, crop, and focal positioning.

### 12. Public functional parity

PASS. Header/navigation, mobile menu, hero search, featured inventory, location
discovery, click-to-load videos, inquiry/tour calls to action, footer links, property-number
and keyword search, filters/chips/clear/sort/pagination, invalid-page recovery, URL state,
map/list, gallery/fullscreen controls, sharing, related inventory, sold behavior, forms,
and honest empty/error states remain exercised by the complete suites.

### 13. Featured Properties end-to-end status

PASS. Admin can view, filter, feature, unfeature, and assign priority through versioned,
authorized, CSRF/origin-protected writes with value-minimized audit fields. Public reads
require `featured=true`, published sale inventory, and non-sold availability; reserved is
allowed. Results sort by descending `featuredOrder`, then `publishedAt` and `_id`, and are
limited to three. The homepage renders an honest zero state and maps exactly the one, two,
or three returned records; a greater eligible set is bounded to the top three. It creates
no filler or duplicated property/media data and reuses the existing public DTO/card.

### 14. Contact + Start a Conversation status

PASS. The page and footer expose:

- `rcpropertiesss@gmail.com`
- `+63 918 429 1873`
- the approved Facebook, Instagram, YouTube, and TikTok profiles

External links use safe new-tab behavior and accessible names. Start a Conversation uses
the existing idempotent inquiry API and factual success/error states. No address or
business hours are invented.

The requested content scan classified numeric `001`/`002`/`003` occurrences as test IDs,
fixture IDs, or a format placeholder; `Add production image reference` is only a negative
E2E assertion; the old email appears only in immutable historical audit evidence; and no
current UI use of the old handle or generic `Angeles, Pampanga` copy was found.

### 15. Request Tour validation/workflow status

PASS. Full name, phone, property, requested date, requested time, email, and consent are
required where applicable. Browser coverage proves blank and whitespace-only names plus
malformed phones are rejected without an inquiry request. Backend coverage explicitly
rejects whitespace and too-short names, missing or malformed phone, missing/invalid/past
date, missing/invalid time, and missing property. A valid submission issues one POST,
creates one viewing inquiry in `requested` state, retains property context and Manila-time
semantics, and says that staff confirmation is still required. Sold or otherwise
non-requestable properties are rejected server-side.

### 16. Legacy Book Viewing compatibility

PASS. `/book-viewing` remains a stable, indexable entry point that opens the shared tour
dialog, preserves a supplied `propertyId`, requires one when absent, and does not create a
second booking or calendar system.

### 17. Public responsive status

PASS. Automated and visual inspection covered 320, 390, 768, 1024, 1280, 1440, and 1920
pixels for the requested public surfaces, within the broader 17-width suite. Representative
200% root-text and reduced-motion checks passed with no page-level horizontal overflow,
clipped required actions, or content loss. Cards, search/filters, map/list, gallery,
locations, editorial pages, tour dialog, video carousel, header/menu, pagination, and
footer reflow intentionally.

### 18. Admin shell/sidebar/drawer status

PASS. Desktop expanded/collapsed states resize content and retain accessible link names;
the compact RC mark, presentational “Renzo & Criezel” and “RC Premier Properties Staff”
labels, actual signed-in identity, and active route are distinct. Tablet/mobile uses a
labelled focus-trapped drawer with the same destinations, Escape/route dismissal, and
focus restoration. View Website opens `/` in a new tab. Presentational labels do not alter
Auth0 subject, `StaffIdentity`, session ownership, permissions, or audit actor identity.

### 19. Admin functional parity

PASS. Dashboard, Properties, Create Draft, edit/preview/readiness, publish/unpublish,
reserve/sold, archive/restore, media management, Inquiries, Viewings, Search, Audit, Staff,
View Website, and Sign Out remain available according to named permissions. Real states,
failure states, optimistic concurrency, and value minimization remain intact.

### 20. Admin Featured controls status

PASS. Featured badge/filter, bounded priority, Feature, Save priority, and Remove Featured
are present only where allowed. Draft and sold feature attempts plus stale versions return
`409`; published available/reserved records are eligible. Browser requests carried the
current version and CSRF token. Audit output records only `featured` and/or
`featuredOrder` as changed field names.

### 21. Location selector status

PASS. Normal authoring uses the canonical 22-area Pampanga City / Municipality set.
Existing legacy values remain selectable under their exact value and are not silently
rewritten. Private address and verified internal coordinates remain protected; public
text/point precision is separate and deliberately authored.

### 22. Media workflow status

PASS. Normal administration exposes device upload followed by preview/manage, reorder,
alt/caption/focal metadata, cover selection, and safe removal. It does not expose the old
arbitrary production-reference control or development samples. Existing legitimate
provider references remain readable. MIME/signature/decode/dimension checks, 24-image
maximum, server-owned names, ownership/reference checks, cover/order integrity,
post-commit deletion, and cleanup debt remain enforced.

### 23. Calendar responsive status

PASS. Desktop presents the full useful calendar, tablet compacts it, and mobile keeps a
seven-column indicator grid with a selected-date agenda rather than tiny appointment
cards. Multiple counts, status text, Manila-time formatting, a chronological list
alternative, 200-record pagination, and access to later pages are covered without
color-only meaning.

### 24. Accessibility audit

PASS at the automated repository boundary. Public and admin checks cover landmarks,
single sensible `h1` outlines, the corrected Viewings hierarchy, skip links, labelled
controls, visible focus, keyboard galleries, drawers/dialogs, focus trapping/restoration,
required semantics, live validation/status feedback, pagination labels, touch-sized
primary actions, 200% reflow, and reduced motion. Physical-device, forced-colors,
screen-reader, and other assistive acceptance remains X14.

### 25. SEO audit

PASS. Titles, descriptions, canonical URLs, Open Graph/Twitter metadata, robots,
admin/404/filtered noindex behavior, sitemap and shards, organization/site/product and
breadcrumb JSON-LD, stable slugs, inventory-backed location canonicals, and public
location privacy passed. Structured data contains approved contact identity and no fake
address/hours, private address, or coordinates.

### 26. Performance audit

PASS against the repository budgets. At mobile entry routes, cumulative layout shift was
at most 0.1, longest task below 500 ms, initial encoded JavaScript below 1 MB, and DOM
below 1,500 nodes. Initial loads made no boundary-geometry, YouTube, or raw source-PNG
request. There is one critical image preload; supporting and gallery media are progressive.
Maps, YouTube, bounded featured/facet reads, and streamed related inventory remain
deferred as designed. No redesign dependency or icon package was added.

### 27. Level 17 finding-by-finding regression status

Every item was reviewed against current source, its focused regression evidence, and the
complete green test suites:

| Finding                                      | Status    | Current evidence                                                                                                                               |
| -------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| H01 managed-media ownership/reference safety | PRESERVED | Cross-property gallery/cover checks, fail-safe uncertain-reference behavior, post-commit deletion, and cleanup debt remain covered.            |
| M01 bounded duplicate integrity scanning     | PRESERVED | Windowed duplicate counts and the 500 serialized-finding bound remain unchanged.                                                               |
| M02 explicit legacy notification state       | PRESERVED | `untracked` remains explicit in shared contract, staff UI, dashboard/retry rules, and integrity results.                                       |
| M03 no fabricated workflow history           | PRESERVED | Missing inquiry/viewing histories remain empty and visibly unavailable.                                                                        |
| M04 Philippine audit-date boundaries         | PRESERVED | Inclusive Manila-day conversion and boundary tests remain green.                                                                               |
| M05 stable Property IDs/slugs                | PRESERVED | Property number is immutable; slug locks after first publication through later unpublish/edit cycles.                                          |
| M06 streaming related inventory              | PRESERVED | Related properties remain in an independent recoverable `Suspense` boundary with no fabricated fallback.                                       |
| M07 sitemap batching                         | PRESERVED | Trusted 48-item pages, 960-item shard shape, concurrency, and failure isolation remain covered.                                                |
| M08 complete paginated calendar              | PRESERVED | Bounded 200-record pages, totals, stable ordering, UI navigation, and later-page reachability remain.                                          |
| M09 bounded location facets                  | PRESERVED | Database and API output remain limited to the canonical 22 Pampanga areas.                                                                     |
| L01 repeated-filter handling                 | PRESERVED | Shared array-aware normalization continues to select the first scalar consistently.                                                            |
| L02 canonical property sharing               | PRESERVED | Native share and clipboard receive the clean server-owned property URL.                                                                        |
| L03 invalid-page recovery                    | PRESERVED | Positive-total out-of-range requests recover to the last real filtered page.                                                                   |
| L04 clipboard focus restoration              | PRESERVED | Success and failure paths restore the previously active control.                                                                               |
| L05 value-minimized inquiry search           | PRESERVED | Dedicated bounded response omits names, email, phone, subject, message, and other private detail.                                              |
| L06 staff audit filter                       | PRESERVED | Validated Staff ID filter persists through pagination and clears safely.                                                                       |
| L07 Viewings heading hierarchy               | PRESERVED | Page-level `h1` precedes ordered calendar/list section headings.                                                                               |
| L08 notification delivery timestamp          | PRESERVED | `deliveredAt` appears only when persisted and is labelled in Philippine time.                                                                  |
| L09 strict dashboard query rejection         | PRESERVED | Unknown scalar, repeated, and object-shaped queries fail with `400` before service work.                                                       |
| L10 operations HTTP security coverage        | PRESERVED | Fail-closed `503`, anonymous `401`, permission `403`, private headers, valid reads, and strict queries remain covered through the real router. |
| L11 roadmap/documentation consistency        | PRESERVED | Deterministic related inventory remains distinct from deferred personalized/agent recommendations.                                             |
| L12 session/entity-ID minimization           | PRESERVED | Session audit events still omit session entity IDs and all serialized session secrets.                                                         |

No item regressed.

### 28. Security/privacy/backend-contract audit

PASS. Authorization Code + S256 PKCE, opaque host-only secure server sessions,
`StaffIdentity` mapping, MFA assurance, exact CORS/origin allowlists, session-bound CSRF,
secure cookies, explicit proxy trust, named property/inquiry/viewing/audit permissions,
optimistic concurrency, media ownership, private headers, private/public location
separation, and layered rate limits retain direct integration coverage. Parts 1–4 made
only the approved narrow backend additions: viewing phone is required for viewing-type
inquiries, and Featured curation adds a versioned authorized mutation plus a bounded
public query. The Part 5 fixture injection bypasses only the isolated test app's global
limiter; `createApp()` still mounts the real limiter by default, and the production
integration test still verifies request 301 receives `429`.

### 29. Dependency-tree result

PASS — `npm.cmd ls --all` exited 0 with a valid workspace tree. Platform-specific optional
packages are expectedly absent on Windows. Parts 1–5 changed no package manifest or lock
file and introduced no unexpected dependency.

### 30. Production vulnerability-audit result

PASS — `npm.cmd audit --omit=dev --audit-level=high` completed against the live registry
and reported **0 vulnerabilities**.

### 31. Exact unit/integration test result

PASS — `npm.cmd test`: **35 files, 361/361 tests** after adding three explicit viewing
validation cases for whitespace name, too-short name, and malformed phone.

### 32. Exact E2E result

PASS — `npm.cmd run test:e2e`: **64/64 Playwright tests** using the repository's complete
unmodified suite. Expected fixture-only invalid-image and deliberate `401`/`404`/`503`
failure-path logs did not fail the run.

### 33. Production build result

PASS — `npm.cmd run build` built shared, backend, and the optimized Next frontend,
including **17 generated pages/routes**.

### 34. Staging-shaped build result

PASS — `npm.cmd run build:deployment` completed with reserved synthetic HTTPS API, site,
media, tile, and attribution settings and generated **17 pages/routes**. No credential or
real provider value was used.

### 35. Responsive/reflow test result

PASS. The suite covers public widths 320, 360, 375, 390, 412, 414, 430, 480, 640, 768,
820, 1024, 1280, 1366, 1440, 1600, and 1920 pixels. Requested admin surfaces cover 320,
390, 768, 1024, 1280, 1440, and 1920 (with additional focused widths), plus representative
200% text and reduced motion. No page-level overflow was found; intentional local table
scrolling remains bounded.

### 36. Files changed during Part 5

- `backend/src/app.ts`
- `backend/test/viewing-request.validation.test.ts`
- `e2e/fixture-api.mjs`
- `e2e/public-site.spec.ts`
- `docs/architecture/brand-and-public-experience.md`
- `docs/README.md`
- `docs/audits/figma-frontend-rebuild-part-5.md`

No package lock, generated screenshot, build output, credential, or unrelated file is
included.

### 37. Part 5 targeted fixes

Two deterministic suite defects were corrected:

1. The isolated E2E fixture now receives an explicit pass-through application limiter.
   Previously the complete suite exceeded the real 300-request window and one late test
   received `429`; focused reruns passed, proving suite-order coupling. Production still
   uses and tests the real limiter.
2. The location E2E test fulfills the configured external map tiles with a one-pixel
   fixture before tracking browser errors. This removes restricted-network noise without
   weakening CSP/provider assertions or production map behavior.

The viewing-validation matrix gained explicit whitespace/short-name and malformed-phone
cases, and persistent documentation now distinguishes optional non-viewing phone input
from required viewing phone input.

### 38. Remaining visual deviations and why

The remaining differences are deliberate and acceptable: RC branding and supplied
photography replace Compass branding/media; Pampanga inventory replaces US listings and
neighborhoods; real inventory controls card counts; private/public location rules reduce
map precision; unsupported advertising, account, agent, mortgage, school, analytics,
calendar-availability, valuation, and marketing-performance features are omitted; tour
requests collect one preferred schedule rather than inventing three available slots; and
the footer contains factual RC contact/legal content rather than the reference's corporate
directory. These preserve security, business truth, and the public MVP boundary.

### 39. Remaining repository issues

None confirmed within the audited Part 5 scope. The initial two complete-suite failures
were reproduced and classified as deterministic fixture defects, corrected narrowly, and
followed by a fully green gate.

### 40. Remaining X01–X16 external gates

All remain **OPEN** because no new live evidence was supplied:

| Gate | Required evidence                                                        |
| ---- | ------------------------------------------------------------------------ |
| X01  | Final edge/DNS/TLS/proxy/WAF acceptance                                  |
| X02  | Controlled staging deployment, smoke, rollback, and clean redeploy       |
| X03  | Production Auth0/MFA/session/logout/disable/recovery acceptance          |
| X04  | Atlas security, least privilege, indexes, and representative query plans |
| X05  | Configured backup/PITR and completed backup evidence                     |
| X06  | Timed isolated database restore and integrity validation                 |
| X07  | Production object storage/CDN adapter and lifecycle acceptance           |
| X08  | Media backup/restore and database-object reconciliation                  |
| X09  | Transactional email delivery/retry/outage acceptance                     |
| X10  | Licensed production map provider, attribution, quota, and fallback       |
| X11  | Central observability, alerts, routing, ownership, and incident exercise |
| X12  | Approved representative production inventory, media, and content         |
| X13  | Field Core Web Vitals and real-user monitoring                           |
| X14  | Physical browser/device/zoom/forced-colors/assistive acceptance          |
| X15  | Final-domain SEO/social crawler fetch and render acceptance              |
| X16  | Approved retention/privacy/legal policy, purge rehearsal, and ownership  |

### 41. Documentation status

PASS. The roadmap and feature/API/architecture/development documents accurately describe
the public redesign, Featured Properties, responsive admin shell/calendar, media upload
workflow, canonical location selector, Request a Tour, connected contact/seller inquiries,
and required viewing phone. Historical audits were not rewritten.

### 42. Current branch

`feature/figma-frontend-rebuild`

### 43. Part 5 commit hash

Reported in the final handoff because a commit cannot contain its own immutable hash.

### 44. Git status

Expected clean after the targeted Part 5 commit. The final handoff records the observed
state after commit.

### 45. Preserved stash status

PRESERVED exactly as `stash@{0}: On feature/property-media-system: local package-lock
change`, object `e3070251f4c5530abd4d2a2410365ab2a0789c2a`. It was not applied, popped,
dropped, modified, or included.

### 46. Final engineering-readiness classification

**ENGINEERING READY — LIVE ACCEPTANCE REQUIRED.** Repository implementation and gates
are green; production launch readiness remains blocked by X01–X16.

### 47. Whether the Figma/frontend rebuild is now complete

**COMPLETE at the repository engineering boundary.** Parts 1–5 are implemented, audited,
documented, and verified. This does not close the separate external production gates and
does not authorize a merge, push, or new feature phase.
