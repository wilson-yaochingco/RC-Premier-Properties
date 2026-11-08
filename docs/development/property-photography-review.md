# Property photography review

Reviewed 2026-11-08 against the 66 original photographs for the six official RC Premier listings.
The final local publishable preview contains **61 watermark-free photographs**: 16 clean originals,
30 non-destructive crops and 15 accepted localized retouches. **Five redundant views remain excluded**
by business instruction. No important views remain held.
All 66 source entries and original assets remain retained. No production data, Cloudinary original,
legacy property or deployment was changed by the photography work.

The owner subsequently approved all four remaining experimental retouches after personal visual
review. Their technical warnings remain documented below; this acceptance is a manual visual
decision, not an automated claim that obscured geometry can be independently proven.

## Owner-approved experimental retouches — 2026-11-08

The existing experimental PNGs for `638449676`, `641403547`, `641468524` and `640328490` were
copied byte for byte into the local preview. Their SHA-256 hashes, 1536 × 1688 dimensions, property
assignments and unchanged pixels outside the watermark mask were checked against the retained
review bundle. No image was regenerated, recomposited or cropped. Their original JPEGs and pinned
source hashes remain untouched. The previously accepted `641476610` WebP is unchanged.

The owner accepts the visible trim step in `638449676` and the unresolved ceiling-rib, curtain/ring
and diagonal-frame reconstruction questions in `641403547`, `641468524` and `640328490`. These
concerns are disclosed here and in the decision manifest. The four PNGs are owner-approved for the
local preview despite this uncertainty; they have not been independently validated as exact
reconstructions of the obscured architecture. The four earlier business exclusions remain in force.

## Prior resumed review — before owner approval

All five existing experimental PNGs and their unchanged source JPEGs match the recorded SHA-256
hashes and retain 1536 × 1688 dimensions. Every decoded pixel outside the 52,920-pixel watermark
mask matches its source. Full-resolution detail comparisons show no remaining watermark. At that
stage, the
bedroom/wardrobe result (`641476610`) also has a natural ceiling and air-conditioner shadow, with
no obvious repair boundary or architectural change. Its lossless WebP derivative matches the
experimental PNG pixel for pixel and was added to the local preview.

The other four were then held: `638449676` has a stepped timber trim; `641403547` infers an obscured
ceiling-rib endpoint; `641468524` has uncertain curtain, mullion and chandelier-ring continuations;
and `640328490` has unverified diagonal frame widths and junctions. Their originals and trial files
remain unchanged. No production media or data was modified. The review page is at the isolated
`photography-experimental-review/index.html` path documented below.

That prior targeted verification passed: 19 photography/SEO tests; the local preview API returned six
galleries with 58 images, including eight for property 11; the new WebP loaded over HTTP and
decoded at 1536 × 1688; and the rendered property 11 gallery opened the bedroom in its fullscreen
viewer without a page error. The other four images were absent from preview galleries at that stage.

## Findings

- `PREMIER_PROPERTY_3` has 17 clean photographs. Its assets need no watermark treatment.
- The 49 other assets are 1536 x 1688 JPEGs with the same baked-in RC Premier Properties mark at
  the top left, approximately x=40--355 and y=0--185, including the text and shadow. The current import removed a separate lower
  contact strip, not this mark.
- No alternate clean source folder is available in the workspace. Cloudinary's delivered assets
  are the only inspectable collection.

## Approved delivery treatment

The 27 assets in the following original allowlist retain this non-destructive Cloudinary delivery
crop, following Cloudinary's documented [cropping and resizing
syntax](https://cloudinary.com/documentation/image_transformations#cropping_and_resizing):

```text
c_crop,w_1536,h_1448,x_0,y_240
```

It removes the full mark without retouching pixels and was reviewed asset by asset. Keep the
stored URL and MongoDB `publicId` unchanged; this is a delivery transformation only. The existing
Next image optimizer remains responsible for responsive formats and sizes. Use the crop in the
lightbox too, with `contain`.

| Listing               | Exact `y=240` allowlist                                                                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PREMIER_PROPERTY_7`  | `641499791 kitchen-dining-stairs`, `641436295 living-area-ceiling-fan`, `639696656 garage`, `641483845 entrance-door`, `641386993 bathroom`                                                    |
| `PREMIER_PROPERTY_8`  | `641393743 kitchen-dining`, `640134571 kitchen`, `639781998 bedroom-display-wall`, `640106936 bedroom-balcony-door`, `641409964 balcony`                                                       |
| `PREMIER_PROPERTY_9`  | `640111391 kitchen`, `640574952 bedroom-tv-wall`, `643319307 bedroom-balcony-door`, `640278929 bedroom-wardrobe`, `640695074 bathroom`                                                         |
| `PREMIER_PROPERTY_10` | `640217959 living-dining-stairs`, `641298956 kitchen`, `641457132 balcony`, `641392248 bedroom-balcony`, `641489585 bedroom-windows`, `640397499 bathroom-shower`, `641423098 bathroom-vanity` |
| `PREMIER_PROPERTY_11` | `641397173 living-dining-kitchen`, `641243651 kitchen-breakfast-bar`, `640390998 carport`, `641135016 balcony`, `641397342 bathroom-shower`                                                    |

Three additional images use `c_crop,w_1536,h_1488,x_0,y_200`: property 8's `641391265
exterior-front` and `641391028 balcony-power-rack`, and property 10's `641486500 exterior-front`.
The 200px crop removes 11.85% of frame height without resizing or clipping the depicted building,
rack, furniture or visible fixtures. The exterior rooflines retain clearance. No left crop is
approved: x=260 leaves lettering; a wider crop removes meaningful horizontal context.

Eleven images use versioned local lossless WebP derivatives, and four owner-approved experimental
retouches use their original lossless PNG files, under
`frontend/public/media/properties/photography-v1/`. The stored Cloudinary URL stays unchanged.
`propertyPhotoDeliveryUrl` selects a derivative only for its reviewed public ID and upload version
(or its unversioned preview alias). A different upload version falls through to its original URL.
The same resolver supplies cards, gallery, fullscreen and absolute SEO image URLs. Existing gallery
relative ordering is retained. Only the 61 accepted images enter the preview; excluded
entries remain in the original import source and review manifest.

Repairs use built-in imagegen candidates only inside a small top-left mask, followed by OpenCV
gradient-domain boundary matching. Initial rectangular tonal patches, glyph-shaped halos, broken
cables, trim steps and displaced seams were rejected. Accepted patches cover at most 2.05% of the
frame; every decoded pixel outside their mask is verified identical to the original. The full frame
remains 1536 × 1688 with its original proportions. Lossless storage avoids a second lossy encoding;
the existing Next image optimizer still provides responsive delivery. No generated whole photograph
was adopted wholesale. For the four owner-approved experiments, uncertainty about obscured structural details
remains as noted above.

The additional owner-requested exclusion is `639192476`, property 3's clean kitchen-cooktop
view. It duplicates the island kitchen angle; the original source and Cloudinary asset remain
retained. This editorial decision was added after the 22 watermark reassessments.

## Per-image decisions for the 22 reassessed photographs

All inputs are 1536 × 1688. Tokens identify the original filename; the full descriptive filename,
property mapping, upload version, source/patch SHA-256, rationale and accepted imagegen prompt are
recorded in [`property-photography/decisions.json`](property-photography/decisions.json).

| Property | Token / subject                      | Current decision and visual basis                                                                                                                                                                                                                                                                          |
| -------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7        | `641476941 exterior-front`           | **ACCEPTED RETOUCH**. Accepted after stencil-guided inpainting and boundary-matched compositing: cable trajectory is continuous at both mask boundaries; roof, other cables and facade are unchanged. Tight glyph compositing left edge transitions and was rejected in favor of the bounded 2.05% repair. |
| 7        | `639922973 living-area`              | **ACCEPTED RETOUCH**. Accept localized ceiling repair. Panel join, recessed lights and chandelier remain continuous and unchanged.                                                                                                                                                                         |
| 7        | `641476195 kitchen-wine-shelf`       | **EXCLUDED**. Excluded from local preview by explicit business decision; original retained. Reject retouch: cabinet/ceiling junction and seam mismatch. Existing kitchen-dining-stairs covers the kitchen; exclude this redundant close-up if no clean source is available.                                |
| 7        | `641448645 breeze-block-screen`      | **EXCLUDED**. Excluded from local preview by explicit business decision; original retained. Logo obscures part of a fan blade. Top crop removes that fixture; entrance-door offers partial coverage. Request an unmarked original or exclude this angle.                                                   |
| 7        | `640260096 room-garden-door`         | **ACCEPTED RETOUCH**. Accepted after stencil-guided inpainting and boundary matching: the visible square downlight perimeter, mounting angle and position remain continuous, with ceiling grain and wall junction retained. The rest of the room is unchanged.                                             |
| 8        | `641391265 exterior-front`           | **ACCEPTED CROP**. Accept y=200 crop: removes sky above the mark and keeps the entire roof, facade, plants and gate.                                                                                                                                                                                       |
| 8        | `638449676 living-room`              | **OWNER-APPROVED RETOUCH**. Owner accepts the visible timber-trim step and earlier tonal-edge warning after personal visual review; exact obscured trim geometry remains uncertain.                                                                                                                        |
| 8        | `640493026 bedroom-grey-bed`         | **ACCEPTED RETOUCH**. Accept localized plain-ceiling repair; ceiling light, trim, curtains and room remain intact.                                                                                                                                                                                         |
| 8        | `641391028 balcony-power-rack`       | **ACCEPTED CROP**. Accept y=200 crop: all rack, furniture, column, doorway and visible fan-blade fragment remain; trims only surplus ceiling.                                                                                                                                                              |
| 8        | `641403547 bathroom`                 | **OWNER-APPROVED RETOUCH**. Owner accepts the inferred upper ceiling-rib endpoint after personal visual review; its hidden geometry is not independently verified.                                                                                                                                         |
| 9        | `640073299 exterior-front`           | **ACCEPTED RETOUCH**. Accept localized cloudy-sky repair; every roof/facade pixel is outside the repair mask.                                                                                                                                                                                              |
| 9        | `640135624 living-room`              | **ACCEPTED RETOUCH**. Accept localized wood-ceiling repair; plank direction and seams remain continuous, fixtures unchanged.                                                                                                                                                                               |
| 9        | `641468524 kitchen-dining-mezzanine` | **OWNER-APPROVED RETOUCH**. Owner accepts the reconstructed curtain folds, mullion edge and chandelier-ring overlap after personal visual review; obscured details remain uncertain.                                                                                                                       |
| 9        | `641493569 stairwell-window`         | **ACCEPTED RETOUCH**. Accept localized repair: straight window-frame and upper-trim edges remain continuous; exterior view and pendant mount remain unchanged.                                                                                                                                             |
| 9        | `641298954 upstairs-hallway`         | **EXCLUDED**. Excluded from local preview by explicit business decision; original retained. Reject retouch: visible tonal/cove-edge transition. Clean stairwell-window supplies partial circulation coverage; exclude this hallway angle if no clean original is available.                                |
| 10       | `641486500 exterior-front`           | **ACCEPTED CROP**. Accept y=200 crop: preserves the highest roof point with sky clearance, both storeys, gate and boundary context.                                                                                                                                                                        |
| 10       | `641466475 bedroom-wardrobe`         | **ACCEPTED RETOUCH**. Accept localized plain-ceiling repair; wardrobe corner, shelving, windows and bed remain outside the mask.                                                                                                                                                                           |
| 11       | `640328490 exterior-carport`         | **OWNER-APPROVED RETOUCH**. Owner accepts the diagonal frame-width and junction reconstruction after personal visual review; exact obscured geometry remains uncertain.                                                                                                                                    |
| 11       | `640389791 living-room`              | **EXCLUDED**. Excluded from local preview by explicit business decision; original retained. Reject retouch: wood seams break at the patch boundary near the fan. Clean living-dining-kitchen covers the room; exclude this redundant angle if no clean source is available.                                |
| 11       | `641476610 bedroom-wardrobe`         | **ACCEPTED RETOUCH** in the resumed review. The new localized ceiling repair removes the rectangular shadow transition without changing the air-conditioner edge or other room details. The earlier rejected trial remains in the review history.                                                          |
| 11       | `641462442 second-floor-common-area` | **ACCEPTED RETOUCH**. Accept localized plain-ceiling repair; entire fan, recessed lights, wall feature and railings remain unchanged.                                                                                                                                                                      |
| 11       | `641399967 staircase`                | **ACCEPTED RETOUCH**. Accept localized plain-wall repair; all pendant lights, slat ceiling, stairs and window remain unchanged.                                                                                                                                                                            |

The five approved exclusions are `639192476`, `641476195`, `641448645`, `641298954` and
`640389791`. They do
not appear in preview cover media, cards, galleries, similar-property cards or fullscreen counts.
Their source files and Cloudinary references remain unchanged.

The four owner-approved experimental retouches are `638449676` (property 8 living room),
`641403547` (property 8 bathroom), `641468524` (property 9 kitchen/dining mezzanine) and
`640328490` (property 11 exterior/carport). Each remains tied to its original property and
source version. Their technical warnings and original files remain available for audit.

## Latest seven controlled repair attempts

The previous rectangular composites could disturb cables, trim, rail endpoints, curtain detail and
shadows; narrow glyph masks could leave halo/boundary transitions. The available built-in image-editing
tool was explicitly verified and used with the user's image-editing authorization. Each of the seven
received one new candidate using the original 768 x 512 context crop plus a watermark-selection guide.
No room or building output was adopted wholesale. Existing OpenCV/NumPy supplied bounded local
`NORMAL_CLONE` boundary matching; no package, provider or integration was added.

Tight glyph and bounded full-mark composites from the same candidate were compared. Tight masks
left visible boundary transitions and were rejected. The bounded 370 x 196 envelope with the existing
two-region stencil was selected only for the two reliable repairs. All final photographs preserve
1536 x 1688 dimensions; every pixel outside the repair mask remains identical. No crop was applied
to any of these seven in this pass.

- **Accepted `641476941`:** cable endpoints/trajectory now meet continuously, while the roof and
  all building pixels remain outside the mask. Sky texture and the full facade were visually reviewed.
- **Accepted `640260096`:** downlight frame edges, angle and position remain continuous; the original
  ceiling/wall junction, fan and garden-door composition are retained.
- **Rejected `638449676`:** timber trim still steps/changes width at the boundary.
- **Rejected `641403547`:** an extra ceiling rib/endpoint lacks photographic support.
- **Rejected `641468524`:** changed curtain/window detail and uncertain ring overlaps.
- **Rejected `640328490`:** altered frame thickness/intersections through the watermark.
- **Rejected `641476610`:** the air-conditioner shadow still has a rectangular termination.

The regenerated report's `attempts.html` and four `*-latest-attempts.png` sheets display the **actual
seven trial images, including rejected results**, labeled with property IDs, filenames and outcomes.
Full-resolution trial files and watermark-region comparisons are included. The main `index.html`
links to these and reports all 22 reassessed sources. Prompts, hashes, mask scope, reasons and cache
filenames are retained in each record's `latestAttempt` field.

## Previous experimental visual evaluation — before resumed review

A separate, user-authorized experimental pass generated one new localized candidate for each of the
five then-held images. At the time, none was accepted or added to the preview. The following
statuses record that earlier evaluation; the resumed decision above supersedes the bedroom status.

| Image                                  | Experimental status      | Visual assessment and recommendation                                                                                                                                                                                                           |
| -------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `638449676` — living room              | **reject**               | Dark timber trim still steps/changes width at the patch boundary. Keep rejected and obtain the clean original.                                                                                                                                 |
| `641403547` — bathroom                 | **borderline**           | The earlier extra rib is absent, but the restored upper-rib endpoint is inferred. Keep held unless a clean reference confirms it.                                                                                                              |
| `641468524` — kitchen/dining mezzanine | **borderline**           | Ring/curtain transitions look more plausible; hidden folds, the mullion edge and ring overlap remain uncertain. Do not approve from this result alone.                                                                                         |
| `640328490` — exterior carport         | **borderline**           | Plausible at full-frame size, but repaired frame widths/junctions still need confirmation against a clean reference.                                                                                                                           |
| `641476610` — bedroom wardrobe         | **experimental success** | The plain ceiling repair looks natural without the earlier obvious rectangular shadow termination. This is the strongest candidate for explicit manual approval after checking the air-conditioner shadow at full resolution. It remains held. |

Method: the available built-in image-editing tool produced a new 768 × 512 context candidate for each
image, with specific instructions addressing its previous rejection. Existing OpenCV tools aligned
the generated context to unmarked source pixels using bounded affine ECC registration, then applied
local `NORMAL_CLONE` boundary matching. Only the existing two-region watermark stencil was used in
the final full-size composite. All outputs are lossless 1536 × 1688 PNGs; the source JPEG bytes and
decoded pixels outside the 52,920-pixel repair mask are unchanged. No full-room output was adopted,
and no crop or alternate was needed for this comparison. Alignment scores are technical diagnostics,
not evidence that hidden geometry is accurate.

The isolated bundle is:

```text
C:/Users/iannm/AppData/Roaming/orca/chat-scratch/5290ea79eb1144a14710957dd221f81d/photography-experimental-review/
  index.html                 # summary, five side-by-side pairs, notes and detail comparisons
  originals/                 # five byte-identical source JPEGs
  experimental/              # five full-size experimental PNGs; copied approved assets are in frontend/public
  details/                   # source-resolution before/after comparisons
  verdicts.json              # current owner-approved verdicts and retained technical warnings
  experiment-metadata.json   # hashes, prompts, registration matrices, dimensions and masks
  review-verification.json   # prior baseline and final local browser/image evidence
  processing/                # retained candidates, scripts and approved-file baseline hashes
```

The review is served only on loopback at `http://127.0.0.1:8766/`. It also opens directly through
`index.html`. From the repository root, the bundle's `processing/build_experiment.py` and
`processing/build_review.py` reproduce the composites and page using retained local inputs; they do
not change gallery mappings. No API credential or additional dependency was introduced.

Validation: all 15 displayed images (five originals, five experiments and five detail comparisons)
decoded at their expected dimensions in the local browser. The review returned HTTP 200 and fit at
1440px and 390px without page errors or horizontal page overflow. Hashes of the ten approved assets
and three mapping/manifest files match their pre-experiment baseline; the running main preview still
returns 57 images. All five original hashes and outside-mask pixel identities were verified. No
unrelated test suite was rerun for this visual-only artifact.

## Final local gallery counts

| Property              | Retained original source count | Publishable preview | Excluded | Held for clean source |
| --------------------- | -----------------------------: | ------------------: | -------: | --------------------: |
| `PREMIER_PROPERTY_3`  |                             17 |                  16 |        1 |                     0 |
| `PREMIER_PROPERTY_7`  |                             10 |                   8 |        2 |                     0 |
| `PREMIER_PROPERTY_8`  |                             10 |                  10 |        0 |                     0 |
| `PREMIER_PROPERTY_9`  |                             10 |                   9 |        1 |                     0 |
| `PREMIER_PROPERTY_10` |                              9 |                   9 |        0 |                     0 |
| `PREMIER_PROPERTY_11` |                             10 |                   9 |        1 |                     0 |
| **Total**             |                         **66** |              **61** |    **5** |                 **0** |

The preview API filters held/excluded tokens from the review manifest before assigning its cover.
Each property retains at least eight accepted photographs. Remaining relative order, reviewed mosaic
priority, native mobile track and fullscreen behavior are unchanged. The original 66-image import
source remains available for staff review; this local filter does not change production publication.

## Prior local validation - before the fifth exclusion

- All 62 gallery IDs match the original listing order and property assignment after removing only
  the four approved exclusions; the six local gallery counts are 17, 8, 10, 9, 9 and 9.
- All 62 accepted images decoded in the rendered fullscreen viewers with `contain` fit. The four
  owner-approved PNGs and the previously accepted bedroom WebP were confirmed as the actual
  fullscreen image sources. The four excluded source IDs were absent from the preview API and galleries.
- Each of the six listings passed gallery checks at 390px and 320px: horizontal gallery track,
  fullscreen navigation, image decode, Escape close and no page overflow or page errors.
- The four copied experimental PNGs match their retained SHA-256 hashes and original dimensions;
  their source JPEG hashes match the pinned manifest. The previously accepted bedroom patch is
  unchanged. All 23 targeted photography/SEO tests passed.

## Checkpoint count verification — after the fifth exclusion

The owner later excluded property 3's near-duplicate `639192476 kitchen-cooktop`. The local preview
manifest now has 23 decisions: 15 retouches, three smaller crops, five exclusions and no held images.
Filtering the six original galleries by that manifest yields **16, 8, 10, 9, 9 and 9 images**, or
**61 accepted images**. The excluded source remains retained. The earlier fullscreen and responsive
checks above were performed before this last exclusion; the gallery component and image delivery
mappings were not changed by it.

## Reproduce the review and local derivatives

Run from the repository root, with an explicit output directory:

```powershell
npx tsx scripts/review-property-photography.mts --output "<review-directory>" --write-assets
```

Omit `--write-assets` for report generation without changing website assets. The utility reuses
`sharp`, downloads public originals/crops, verifies source upload hashes and exact property mappings,
applies only the eleven approved transparent PNG patches, verifies the four owner-approved PNGs
byte for byte, checks lossless outside-mask pixel
identity, and emits five labeled property PNG sheets, an HTML review (including property 3's unchanged
status), full-resolution before/after copies, seven latest trial comparisons and
`decisions-and-verification.json`. Rejected trials,
when present in the local cache, are copied to a separately named review folder and never applied.
Missing/changed sources or patches fail the run; existing differing derivatives are never overwritten.

Accepted patch files and provenance are retained beside the JSON report; the four owner-approved
full-size PNGs remain as copied files under `frontend/public/media/properties/photography-v1/`.
Full originals are retained
in the cache and generated review. To reverse a crop/repair, remove that exact allowlist entry in
`property-photography.ts`: the stored original URL is still available. New source uploads require a
fresh visual review and new version mapping. This command never reads credentials, opens MongoDB,
uploads to Cloudinary or publishes anything. No additional package or image service was introduced.

To reconstruct the bounded trial composites from retained candidate outputs (requires the already
available Python OpenCV/NumPy tools):

```powershell
python scripts/prepare-property-photo-trials.py --inputs node_modules/.cache/photo-reassessment/pass-3/outputs.json --sources node_modules/.cache/photo-reassessment --mask docs/development/property-photography/pass-3-boundary-mask.png --output node_modules/.cache/photo-reassessment/pass-3/boundary-matched
```

This prepares unreviewed trial files only and verifies source hashes and outside-mask identity. It
never changes the accepted manifest or preview. Existing accepted patch PNGs let the main TypeScript
review utility rebuild accepted derivatives without rerunning AI or Python.

## Gallery recommendations

Use these verified clean leads and supporting images before any original-only image.

| Listing               | Lead / mosaic priority                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `PREMIER_PROPERTY_3`  | `634671510 exterior-front`; `638104625 living-room`, `615713729 kitchen-island`, `640076608 dining-area`, `636868549 bathroom-vanity`       |
| `PREMIER_PROPERTY_7`  | `641499791 kitchen-dining-stairs`; `641436295 living-area-ceiling-fan`, `639696656 garage`, `641483845 entrance-door`, `641386993 bathroom` |
| `PREMIER_PROPERTY_8`  | `641393743 kitchen-dining`; `640134571 kitchen`, `639781998 bedroom-display-wall`, `640106936 bedroom-balcony-door`, `641409964 balcony`    |
| `PREMIER_PROPERTY_9`  | `640111391 kitchen`; `640574952 bedroom-tv-wall`, `643319307 bedroom-balcony-door`, `640278929 bedroom-wardrobe`, `640695074 bathroom`      |
| `PREMIER_PROPERTY_10` | `640217959 living-dining-stairs`; `641298956 kitchen`, `641457132 balcony`, `641392248 bedroom-balcony`, `640397499 bathroom-shower`        |
| `PREMIER_PROPERTY_11` | `641397173 living-dining-kitchen`; `641243651 kitchen-breakfast-bar`, `640390998 carport`, `641135016 balcony`, `641397342 bathroom-shower` |

## Prior preview verification - 2026-11-08

- All seven new trials were visually compared at the watermark region; the two accepted results
  were also reviewed as full frames. Rejected trials remain review artifacts only.
- The review utility verified all 22 pinned source hashes, all ten accepted patch hashes and exact
  outside-mask pixel identity. All 66 source mappings remain retained; four excluded and five held
  entries are omitted from the publishable preview.
- Fresh browser/API verification loaded every one of the 57 preview images and checked each
  property's exact lightbox count. All four excluded and five held source URLs were absent from
  API cover/gallery data and the rendered gallery. No page errors occurred.
- All six pages passed desktop 1440px and mobile 390px/320px checks, including image loading,
  preserved aspect ratios, touch swipes, Escape, return filters and released scroll locks.
- All 19 targeted photography/SEO tests, frontend TypeScript and frontend ESLint passed.
  Unrelated large test suites were not rerun; earlier full-suite failures remain outside this work.

## Earlier photography cleanup verification — 2026-11-08

- Visually inspected all 22 originals, both crop directions, the smaller top crops, retouch trials,
  accepted repair regions at source resolution and the five full-frame before/after sheets.
- The review utility verified all 22 original hashes against their pinned Cloudinary upload URLs,
  all eight approved patch hashes, exact dimensions, unchanged outside-mask pixels, all 66
  image-to-property mappings and retained gallery entries. The three new crop URLs returned HTTP
  200 and 1536 × 1488 images. No exclusion or rejected trial is applied.
- All 17 targeted photography/SEO tests, frontend TypeScript, frontend ESLint, changed-file
  Prettier and `git diff --check` passed.
- Fresh browser verification loaded all 66 fullscreen images on all six detail pages with
  `contain`, unique metadata and a real missing-listing 404. The redesign components and CSS were
  not changed in this cleanup.
- All six pages passed narrow-screen checks at 390px and 320px: no horizontal overflow, retained
  return filters, touch swipes, Escape closing and released background scroll locks; no page errors.
- This pass uses targeted validation. The earlier full-suite failures below were not addressed;
  no new full-suite acceptance or production deployment is claimed.

## Earlier redesign validation — 2026-11-08

- The local preview returns exactly the six official IDs and 66 assigned photographs.
- The saved viewport review passed all six pages at 1920, 1440, 1024, 768, 390 and 320px,
  including overflow, return filters, keyboard controls, mobile swipes and released scroll locks.
- A subsequent rendered-page check verified unique titles and descriptions, matching canonicals,
  breadcrumb names, asking prices and city-only structured data on all six pages. All 66
  fullscreen images decoded successfully with `contain`; a nonexistent slug returned HTTP 404.
- Formatting, ESLint, TypeScript and the production build passed. All 518 unit tests passed with
  two workers; the initial concurrent run had one notification-test timeout that passed in isolation.
- The full browser run returned 224 passed, 11 failed and 2 skipped. Three stale property-detail
  assertions were corrected; all eight targeted gallery, inquiry, scrolling and SEO checks then
  passed. The full suite was not repeated after these test-only corrections.

Eight failures outside those corrected property-detail assertions remain unresolved: three admin
layout checks, public header behavior, tour reflow at enlarged text, Home hero interactions,
Home enlarged-text overflow and a Locations navigation timeout. This is not a clean full-suite
acceptance result. Production publication and legacy retirement remain gated by the
[listing replacement review](listing-import-and-replacement.md).
