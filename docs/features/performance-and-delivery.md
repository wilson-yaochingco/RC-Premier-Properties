# Performance, Core Web Vitals, and Delivery Efficiency

Status: Level 10 engineering complete. Production field validation, a live domain,
production media/CDN selection, and the production map-tile decision remain external
launch work; this document does not claim a field Core Web Vitals pass.

## Scope and principles

Level 10 improves the existing public and staff application without changing the visual
design, sales-only rules, public/private location contract, authentication architecture,
SEO behavior, or accessibility semantics. Measurement came before implementation. An
area that was already efficient was kept instead of being replaced with a second
architecture.

The application continues to favor fresh inventory over aggressive caching. Public
property reads remain dynamic and `no-store` at the Next.js fetch boundary because the
current system has no provider-neutral publish/edit/media invalidation channel. Private,
session, inquiry, viewing, and admin reads remain `no-store` without exception.

## Reproducible local baseline

The baseline and comparison run used the production Next.js build and the isolated
Playwright fixture API on Windows, Microsoft Edge, a 390 by 844 CSS-pixel viewport, and
loopback networking. Each measured route used a fresh browser context. Resource figures
are encoded body sizes reported by the Resource Timing API. They are useful for local
before/after comparison, not hosting or Philippine mobile-network predictions.

The build completed with Next.js 16.3.3 and Turbopack. Static client-reference manifest
sizes before implementation were approximately:

| Route                | Referenced JS | Referenced CSS |
| -------------------- | ------------: | -------------: |
| `/`                  |      46,463 B |       56,619 B |
| `/properties`        |      60,362 B |       56,619 B |
| `/properties/[slug]` |      63,790 B |       90,055 B |
| `/contact`           |      54,238 B |       44,047 B |
| `/book-viewing`      |      54,238 B |       44,047 B |

The independently split Leaflet path was about 190,577 bytes of uncompressed build JS
plus 12,222 bytes of CSS. It was absent from initial public entry requests. The checked-in
Pampanga administrative boundary artifact is 74,149 bytes.

Representative pre-change browser observations were:

| Route                                | Encoded resources | Encoded script |   CLS | Local LCP observation                                        |
| ------------------------------------ | ----------------: | -------------: | ----: | ------------------------------------------------------------ |
| `/`                                  |         382,532 B |      146,692 B |     0 | hero image, about 324 ms                                     |
| `/properties`                        |         343,612 B |      150,769 B |     0 | H1, about 120 ms                                             |
| `/properties/clark-garden-residence` |         390,653 B |      151,457 B | 0.210 | invalid fixture media made this LCP result nonrepresentative |
| `/contact`                           |         366,236 B |      148,579 B |     0 | editorial image, about 116 ms                                |
| `/book-viewing`                      |         374,811 B |      148,579 B |     0 | editorial image, about 108 ms                                |

The property-detail shift was repeatable: the shared streamed loading state reserved only
70 percent of the viewport, briefly exposing the footer before the detail content arrived.
The fixture intentionally points at unavailable local property media outside tests that
intercept the optimizer, so its pre-change footer LCP and transfer weight are not a photo
quality measurement.

## Implemented optimizations and evidence

### LCP and responsive images

The homepage's wide exterior photo is the observed mobile LCP. It remains the only
homepage image with preload priority. The header logo no longer emits a competing preload;
native lazy loading still fetched it immediately while it was in the initial viewport in
the local run. Secondary homepage hero, below-fold editorial, card, thumbnail, footer,
and admin-preview images remain lazy; route-specific LCP images retain intentional
priority.

Mobile `sizes` values now represent the content gutter rather than claiming a full
viewport. At 390 CSS pixels, Edge selected the 384-pixel homepage hero derivative instead
of the 640-pixel derivative. Contact and viewing imagery made the same 640-to-384 change.
Source PNG files remain authoritative and unchanged; browser requests go through the
Next.js optimizer and negotiate AVIF/WebP. Automated coverage rejects direct requests for
the raw hashed PNG photographs on representative entry routes.

No quality setting, crop policy, focal point, source aspect ratio, or fullscreen fit was
reduced. The optimization changes requested derivative width, not source quality.

### Gallery delivery

Only the current detail image is preloaded. A two-image desktop gallery no longer renders
the selected main photo again in the side choice, avoiding a second responsive variant of
the same source. Remaining choices and the `10rem` thumbnail rail use lazy responsive
images. Fullscreen media remains absent until the dialog opens and then uses the current
source at fullscreen sizing. Keyboard arrows, swipe, focus trapping/restoration, photo
position, alt text, focal points, and contain-fit fullscreen presentation are unchanged.

Runtime image failure stores the failed URL in component state and replaces it with a
same-slot neutral placeholder. It therefore makes one failed attempt per rendered URL,
does not retry in a loop, and does not request an external substitute. The shared loading
and error state now reserves the viewport below the header, preventing streamed route
content from pulling an initially visible footer out of view.

### JavaScript, video, and maps

The homepage stays mostly server-rendered. The mobile menu, media fallback, and the small
video facade are the intentional client boundaries. No heavy animation or icon library is
present, and system font stacks avoid font downloads and font-swap layout shifts.

All three YouTube Shorts still render as local CSS/button facades. The measured homepage
had zero iframes and zero YouTube, ytimg, or googlevideo requests before activation. A
privacy-enhanced iframe is created only for the selected video, and existing tests retain
focus transfer and the external link fallback. No speculative YouTube preconnect was
added.

Leaflet, marker clustering, map CSS, boundary parsing, tiles, and map-pin API reads remain
behind the existing dynamic import plus viewport/user-intent gate. Home and catalog entry
measurements made zero boundary requests. The static boundary retains its source
attribution and its existing public cache policy:
`max-age=3600, s-maxage=86400, stale-while-revalidate=604800`. It is already a small
derived presentation artifact; no geometry or legal/source metadata was changed.

### Data fetching, API payloads, and sitemap

The catalog metadata and page body can both require facets for an indexable location.
They now share one request-scoped React cache entry instead of issuing the same API read
twice. This is request deduplication only; it does not persist stale inventory between
requests.

Sitemap inventory reads previously used the default 12-item page and fetched every page
serially. They now use the existing server maximum of 48 and fetch subsequent pages in
batches of four. This preserves bounded pagination while removing the avoidable
one-request-per-page waterfall and avoiding unbounded concurrency.

The public Mongo projection previously used the detail field set for list, map, and
detail reads. List queries fetched `description`, `highlights`, `amenities`, `features`,
the full `gallery`, and `updatedAt`, then discarded them. Map reads discarded even more.
The list projection is now 19 field paths instead of 25; the map projection is 16 field
paths; detail alone retains all 25 public field paths. Response contracts do not change,
private `select: false` fields remain excluded, and all three paths remain lean reads.
Projection tests lock this boundary.

### Database and index review

Critical public reads use lean documents. Search performs the bounded result read and
count concurrently; map performs its bounded pin read and two counts concurrently;
facets run their independent aggregates concurrently. Admin property and inquiry lists
are bounded, projected, lean, and perform data/count reads concurrently. No per-result
database query was found in public search, map, details, facets, or admin lists.

The property schema already has unique property-ID and slug indexes plus indexes for
publication/newest sorting, purpose/type/price, province/city, bedroom/bathroom filters,
and featured/newest reads. Inquiry indexes cover creation order, email, property,
workflow status, archive state, viewing state/date, and idempotency. Auth/session indexes
cover their exact lookup, TTL, and concurrent-session paths.

No index was changed. Production inventory and an approved production database workload
are unavailable, so an `explain("executionStats")` comparison would be synthetic. Adding
another compound index without cardinality and scan evidence would increase write and
storage cost speculatively. Revisit index order with production-shaped data during staging.

### Admin media and upload safety

Admin gallery previews now advertise a maximum desktop display width of approximately
20rem rather than the generic card width, so the optimizer does not select unnecessarily
large preview derivatives. Original-quality access and public fullscreen delivery remain
available through their own contexts.

Uploads stay intentionally sequential. Each upload depends on the prior optimistic
version and can contain up to 12 MB; parallelizing 24 Sharp decodes would increase memory
and CPU risk. The server continues to validate signatures and dimensions with an
80-million-pixel decode limit, stores an isolated original in development, creates one
bounded 3,200-pixel WebP delivery derivative, and fails closed in production until real
storage is selected.

## Before and after comparison

The same local production-build method produced these post-change observations:

| Route                                | Before resources | After resources | Before CLS | After CLS |
| ------------------------------------ | ---------------: | --------------: | ---------: | --------: |
| `/`                                  |        382,532 B |       367,994 B |          0 |         0 |
| `/properties`                        |        343,612 B |       343,612 B |          0 |         0 |
| `/properties/clark-garden-residence` |        390,653 B |       352,588 B |      0.210 |         0 |
| `/contact`                           |        366,236 B |       351,446 B |          0 |         0 |
| `/book-viewing`                      |        374,811 B |       352,363 B |          0 |         0 |

The homepage comparison is about 14.5 KB (3.8 percent) lower, contact about 14.8 KB
(4.0 percent) lower, and viewing about 22.4 KB (6.0 percent) lower in this local run. The
detail transfer difference is not treated as a stable percentage because its intentionally
missing fixture images changed which fallback/footer resources entered the timing window;
the repeatable finding is CLS `0.210` to `0` and an H1 rather than the footer as LCP.

Post-change route client-reference JS remained effectively flat: homepage 46,398 bytes,
catalog 60,297 bytes, and detail 63,795 bytes. This phase did not pretend that tiny bundle
movement was a win. Its significant JavaScript result is preservation of the existing
deferred 190 KB Leaflet split. Timings (roughly 100 to 316 ms local LCP starts) are recorded
only as loopback diagnostics and are not performance promises.

## Performance budgets and regression coverage

The deterministic browser budgets remain deliberately coarse across local and CI hosts:

- CLS at or below `0.1` for home, catalog, and representative property detail.
- Longest observed main-thread task below 500 ms.
- Initial encoded JavaScript below 1 MB.
- Fewer than 1,500 initial DOM elements.
- Zero initial boundary downloads, YouTube requests, and direct raw PNG photo requests on
  the representative entry routes.
- Exactly one homepage image preload, with the hero eager and secondary imagery lazy.
- Exactly one initial property-detail image preload, lazy nonselected gallery media, and
  no fullscreen dialog/media before activation.

These are regression ceilings, not claimed production targets. Timing assertions tighter
than this would be flaky in the current cross-machine environment. Production should use
field p75 targets for LCP, INP, and CLS after the final domain, hosting, CDN, media,
analytics, and consent behavior exist.

## Caching and provider boundaries

Next.js owns hashed static-asset caching and image transformation. The application owns
the boundary cache header above. Public property API reads remain fresh/no-store because
publish, unpublish, availability, content, and media changes do not yet emit a reliable
cross-process invalidation event. Authenticated routes apply backend `noStore()` plus
frontend `private, no-store, max-age=0`; frontend admin requests also explicitly use
`cache: "no-store"`.

Level 11 must select and validate the production domain, hosting/proxy compression,
object storage/CDN, and map-tile provider. A future media provider must support HTTPS,
versioned cacheable objects, responsive derivatives without upscaling, portrait-safe
source fidelity, efficient Philippine delivery, and explicit invalidation/versioning.
No provider, credential, hostname, compression layer, or CDN was invented in Level 10.

## Complete Level 10 classification

| Area                    | Classification and outcome                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 10A baseline            | Measurable baseline completed with production build, manifests, Resource Timing, and documented limits.             |
| 10B Core Web Vitals     | Safe optimization applied; local LCP/CLS and long tasks reviewed, while field status remains blocked by deployment. |
| 10C homepage LCP        | Measurable bottleneck fixed: one true hero preload and a smaller mobile derivative.                                 |
| 10D image quality       | Already efficient; quality, aspect ratios, focal points, and fullscreen fit preserved.                              |
| 10E responsive images   | Safe optimization applied to public/editorial/card/gallery/admin `sizes`.                                           |
| 10F gallery             | Safe optimization applied; current image only is preloaded and duplicate side variant removed.                      |
| 10G fallback            | Already efficient; one-attempt-per-URL neutral fallback preserved.                                                  |
| 10H PNG sources         | Already efficient; raw sources retained, browser delivery verified through the optimizer.                           |
| 10I YouTube             | Already efficient; zero pre-intent third-party/player requests verified.                                            |
| 10J connection hints    | Acceptable/no change; none are justified before user intent.                                                        |
| 10K Leaflet             | Already efficient; dynamic, route-specific, and intent/viewport gated.                                              |
| 10L GeoJSON             | Already efficient; 74,149-byte cached derived artifact, parsed only after map load.                                 |
| 10M homepage JS         | Acceptable/no change; narrow client boundaries and no heavy homepage dependency.                                    |
| 10N catalog JS          | Acceptable/no change; URL-backed server search retained and map code stays split.                                   |
| 10O detail JS           | Acceptable/no change; content remains server-rendered and clients own interactions only.                            |
| 10P code splitting      | Already efficient; the significant Leaflet path is independently split.                                             |
| 10Q dependencies        | Acceptable/no change; Leaflet is the only material specialized public client dependency and is deferred.            |
| 10R icons               | Not applicable; no shipped icon collection was found.                                                               |
| 10S fonts               | Already efficient; system stacks make no font requests.                                                             |
| 10T CSS                 | Acceptable/no change; route CSS is scoped and no rewrite was justified.                                             |
| 10U animation           | Already efficient; transforms/opacity and reduced-motion handling are preserved.                                    |
| 10V React rendering     | Acceptable/no change; no blanket memoization or demonstrated rerender hot path.                                     |
| 10W duplicate fetching  | Measurable bottleneck fixed for catalog facets; independent homepage reads remain concurrent.                       |
| 10X caching             | Acceptable/no change for dynamic inventory; private no-store remains mandatory.                                     |
| 10Y public cache        | Intentionally deferred until a provider-neutral invalidation design exists; correctness wins over stale inventory.  |
| 10Z API response size   | Measurable database-fetch bottleneck fixed with route-specific projections; wire contract unchanged.                |
| 10AA pagination         | Already efficient; public max 48, admin max 50, map max 200.                                                        |
| 10AB query audit        | Completed for public, property admin, inquiry/viewing, and auth/session paths.                                      |
| 10AC indexes            | Acceptable/no change; existing query-oriented indexes retained, speculative additions rejected.                     |
| 10AD projections        | Measurable bottleneck fixed for list/map; privacy projections preserved.                                            |
| 10AE lean/serialization | Already efficient; read-only critical queries already use lean documents.                                           |
| 10AF N+1                | Acceptable/no change; no critical per-result query path found.                                                      |
| 10AG API computation    | Acceptable/no change; only bounded mapping/formatting occurs on reads.                                              |
| 10AH compression        | Intentionally deferred to Level 11 proxy/hosting selection; no double compression added.                            |
| 10AI cache headers      | Already efficient for hashed/static and boundary assets; private no-store preserved.                                |
| 10AJ waterfalls         | Measurable sitemap waterfall fixed with maximum pages and bounded batches.                                          |
| 10AK server response    | Safe optimization applied through narrower Mongo reads; middleware/security retained.                               |
| 10AL admin              | Already efficient; bounded projected lists and no-store behavior preserved.                                         |
| 10AM media previews     | Safe optimization applied with admin-specific responsive preview sizing.                                            |
| 10AN upload pipeline    | Acceptable/no change; sequential bounded processing is the safer resource policy.                                   |
| 10AO media provider     | Blocked by production provider and intentionally left for Level 11.                                                 |
| 10AP CDN readiness      | Blocked by production provider; requirements documented without a fake CDN.                                         |
| 10AQ map provider       | Intentionally deferred to Level 11; existing configured boundary preserved.                                         |
| 10AR error safety       | Already efficient; retries, errors, map fallback, and form state retained.                                          |
| 10AS prefetch           | Acceptable/no change; no global disable or heavy speculative prefetch added.                                        |
| 10AT mobile network     | Safe optimization applied through smaller image candidates and zero pre-intent map/video payload.                   |
| 10AU layout stability   | Measurable bottleneck fixed; streamed route state now reserves the viewport.                                        |
| 10AV placeholders       | Safe optimization applied to the existing route state; no decorative skeleton system added.                         |
| 10AW SEO                | Already efficient/preserved; SSR, metadata, canonicals, JSON-LD, robots, and sitemap rules remain.                  |
| 10AX accessibility      | Already efficient/preserved; focus, labels, dialog, retry, and reduced-motion behavior remain.                      |
| 10AY security/privacy   | Already efficient/preserved; auth, CSRF, origins, projections, and private no-store unchanged.                      |
| 10AZ artifacts          | Acceptable/no change; temporary measurement spec and generated outputs are not committed.                           |
| 10BA budgets            | Safe opportunity completed with documented, defensible regression budgets.                                          |
| 10BB regression tests   | Safe opportunity completed with projection, media policy, third-party, raw-PNG, and CLS assertions.                 |
| 10BC focused tests      | Passed: three projection tests and two production-build browser performance tests.                                  |
| 10BD measurement        | Completed for home, catalog, detail, contact, and viewing; admin manifests were reviewed separately.                |
| 10BE before/after       | Completed where comparable; nonrepresentative fixture data is called out.                                           |
| 10BF quality gate       | Passed: format, lint, typecheck, 240 unit/integration tests, production build, and 45 Playwright tests.             |
| 10BG manual acceptance  | Local production-build Edge inspection completed; real devices/networks remain external.                            |
| 10BH documentation      | Completed here and in the roadmap/testing index.                                                                    |

## Remaining validation

Production field Core Web Vitals require real traffic or controlled staging measurement.
Physical low-end phones, Philippine mobile networks, Safari/iOS, Android browsers,
Firefox/WebKit, production inventory with full galleries, image fidelity on real media,
live map tiles, provider CDN behavior, and production Mongo `explain` evidence remain
external. These are not reasons to weaken or replace the verified Level 10 architecture.
