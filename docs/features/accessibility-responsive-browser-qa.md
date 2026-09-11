# Accessibility, Responsive and Browser QA

## Scope and target

Level 9 applies a practical WCAG 2.2 Level AA engineering target to the existing public
MVP and protected administration surfaces. It is not a certification. Automated checks,
semantic inspection and one desktop browser cannot replace testing with disabled users,
real assistive technology, physical mobile devices or every supported browser.

This work changes presentation and interaction quality only. It does not add product
features, alter public/private data boundaries, select production providers or begin the
Level 10 performance phase.

## Pre-implementation audit

The classifications below describe the state before Level 9 changes: **present** means
the requirement already had a sound implementation, **partial** means it needed a
targeted correction or stronger coverage, **missing** means the required behavior was
absent, and **external** means acceptance requires equipment or services unavailable in
the local environment.

| Requirement                                     | Before   | Audit finding and Level 9 disposition                                                                                                                                     |
| ----------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9A Semantic page structure                      | Present  | Public pages already used a single main and logical headings; automated landmark, H1 and heading-level checks were retained.                                              |
| 9B Landmarks and skip navigation                | Partial  | Public skip navigation worked. The admin skip target included its header/navigation; the content main is now a separate focusable target.                                 |
| 9C Keyboard navigation                          | Partial  | Public links, controls and the mobile menu worked; gallery trapping, media reorder focus and horizontal admin table access were strengthened.                             |
| 9D Visible focus states                         | Partial  | Global focus styling existed, but legacy form CSS removed the native outline and the upload proxy had no visible state; both were corrected.                              |
| 9E Focus order                                  | Partial  | Normal document order was sound. Tests now exercise real keyboard traversal and stable focus after reorder, video activation and dialog close.                            |
| 9F Modals/dialogs                               | Partial  | The mobile menu trapped/restored focus. The gallery dialog did not; it now traps focus, closes with Escape and restores the opener.                                       |
| 9G Property gallery                             | Partial  | Buttons and arrow-key changes existed; dialog focus handling and visible/announced position were incomplete and are now covered.                                          |
| 9H Media alt text                               | Partial  | API media carried contextual alt text. Runtime image failures now retain that label while presenting a neutral fallback.                                                  |
| 9I Forms                                        | Present  | Explicit labels, suitable input types, autocomplete and supporting instructions existed; field associations were audited.                                                 |
| 9J Validation and form errors                   | Partial  | A summary existed, but fields did not reference individual errors and the summary was not focused. Both behaviors are now implemented.                                    |
| 9K Success/status announcements                 | Partial  | Submission/upload states existed. Live-region roles and accessible progress/count descriptions were made more precise.                                                    |
| 9L Character counters                           | Partial  | The count existed but announced every keystroke; it remains associated with the field without being a noisy live region.                                                  |
| 9M Color contrast                               | Partial  | Core ink, muted text, errors and success colors met the target. Gold is reserved for large/non-text emphasis; selection foreground was corrected.                         |
| 9N Color-only information                       | Present  | Availability, errors and workflow states use text in addition to color.                                                                                                   |
| 9O Touch targets                                | Partial  | Primary controls were adequate; property actions, map retry controls, video links and footer links now enforce approximately 44 CSS-pixel targets.                        |
| 9P Responsive width matrix                      | Partial  | A broad automated matrix existed; 414, 480 and 640 were added to close intermediate gaps. Physical-device review remains external.                                        |
| 9Q Mobile header/navigation                     | Partial  | The dialog-like menu handled keyboard focus and Escape; page scrolling is now locked while it is open.                                                                    |
| 9R Admin header/navigation                      | Partial  | Navigation existed but did not identify the current page; `aria-current` and a visual current state were added.                                                           |
| 9S Homepage responsive QA                       | Present  | Fluid sections and cards were already responsive; the expanded overflow and text-sizing tests preserve them.                                                              |
| 9T Featured video accessibility/mobile          | Partial  | Videos were click-to-load and linked externally. Focus is now transferred to the titled iframe after activation.                                                          |
| 9U Location cards/discovery                     | Present  | Link purpose and text hierarchy were already explicit and responsive.                                                                                                     |
| 9V Map accessibility                            | Partial  | A textual/list alternative and privacy-preserving points existed. The canvas now has a name and boundary/data failures expose retry controls.                             |
| 9W Property catalog responsive QA               | Partial  | Filters, URL state and mobile layout worked. Inline load failure now offers a retry that preserves the safe query URL.                                                    |
| 9X Property detail responsive QA                | Partial  | Content and gallery scaled correctly; lightbox safe-area padding and action target sizing were tightened.                                                                 |
| 9Y Mobile sticky CTA                            | Present  | The CTA already uses safe-area padding and does not obscure page completion; regression coverage was retained.                                                            |
| 9Z Admin property form responsiveness           | Present  | Field groups collapse at narrow widths and remain usable at the tested extremes.                                                                                          |
| 9AA Admin media upload accessibility            | Partial  | Native file selection, validation and progress existed; focus proxy, per-file associations and named progress were added.                                                 |
| 9AB Media reordering accessibility              | Partial  | Keyboard buttons existed; their names, status feedback and post-move focus stability are now explicit.                                                                    |
| 9AC Focal-point accessibility                   | Present  | Native labeled range inputs provide keyboard access and numeric feedback.                                                                                                 |
| 9AD Loading states                              | Partial  | Route and async loading states existed; map-boundary preparation now exposes a busy status instead of a blank transition.                                                 |
| 9AE Error states                                | Partial  | Public/admin boundaries existed. Catalog and map recovery were incomplete and now include contextual retry actions.                                                       |
| 9AF Image failure/fallback                      | Missing  | Invalid data had a placeholder, but a network/decode failure did not. Runtime property-image failures now render a labeled fallback.                                      |
| 9AG Network retry                               | Partial  | Upload and route retries existed; boundary, pin and catalog retries were added.                                                                                           |
| 9AH Empty states                                | Present  | Catalog, admin lists, media and map alternatives already provide explanatory empty states.                                                                                |
| 9AI Scroll management                           | Partial  | Dialog positioning was sound; mobile navigation now prevents background scroll and admin tables are named, keyboard-scrollable regions.                                   |
| 9AJ Reduced motion                              | Present  | The global reduced-motion query suppresses animation and smooth scrolling; automated checks were added.                                                                   |
| 9AK Hover/pointer assumptions                   | Present  | Essential interactions use links/buttons and do not depend on hover.                                                                                                      |
| 9AL Text/browser zoom                           | Partial  | Fluid layout was present; automated 200% text sizing checks now cover representative public routes. Manual browser zoom remains advisable.                                |
| 9AM Responsive typography                       | Present  | `clamp()` and wrapping rules already avoid fixed desktop-only type.                                                                                                       |
| 9AN Admin tables/dense data                     | Partial  | Tables scrolled at narrow widths; named focusable scroll regions now make that affordance keyboard accessible.                                                            |
| 9AO Date/time accessibility                     | Present  | Dates use readable text and semantic `time` values where rendered.                                                                                                        |
| 9AP Sold/reserved accessibility                 | Present  | Availability is expressed in visible text, not color alone.                                                                                                               |
| 9AQ Link purpose                                | Present  | Navigation, cards, actions and external video links have contextual accessible names.                                                                                     |
| 9AR Icon buttons                                | Present  | Icon-only controls already have accessible labels; new controls follow the same rule.                                                                                     |
| 9AS ARIA discipline                             | Partial  | Native elements remain preferred; new ARIA is limited to relationships, current state, regions and async feedback. Redundant/noisy announcements were removed.            |
| 9AT Browser QA                                  | External | Local automated QA can exercise installed Microsoft Edge only. CI is configured for system Chrome but was not run for this local branch.                                  |
| 9AU Browser-specific issues                     | Partial  | Clipboard absence now has an accurate legacy/failure path; safe-area and dynamic-viewport fallbacks were retained or strengthened.                                        |
| 9AV JavaScript disabled/progressive enhancement | Partial  | Server-rendered content, links and external video fallbacks remain useful; filters, inquiries, maps, dialogs and admin editing require JavaScript by design.              |
| 9AW Accessibility automation                    | Partial  | Targeted Playwright semantics, labeling, keyboard, overflow, reduced-motion and zoom assertions were expanded. No axe scanner was added; automation is not certification. |
| 9AX SEO preservation                            | Present  | Server metadata, canonicals, structured data, robots and sitemap contracts are unchanged.                                                                                 |
| 9AY Security/privacy preservation               | Present  | Public/private location separation, fixture isolation, session/CSRF behavior and map privacy remain unchanged.                                                            |
| 9AZ Performance boundary                        | Present  | Changes reuse existing components and lazy video/map behavior. No Level 10 optimization work was started.                                                                 |
| 9BA No new product features                     | Present  | Work is limited to accessibility, responsive behavior, recovery and tests.                                                                                                |
| 9BB Automated testing                           | Partial  | Existing coverage was strong; Level 9 adds interaction and failure-path regressions. Final results belong in the change handoff.                                          |
| 9BC Responsive browser acceptance               | Partial  | Automated Edge coverage spans 320–1920 CSS pixels. Physical devices and other engines remain external acceptance work.                                                    |
| 9BD Manual accessibility acceptance             | External | Keyboard and visual inspection can be performed locally; a complete expert/user acceptance audit has not been performed.                                                  |
| 9BE Screen-reader QA                            | External | No real screen reader was available, so screen-reader acceptance is not claimed.                                                                                          |
| 9BF Quality gate                                | Partial  | The repository gate must pass after implementation before handoff.                                                                                                        |
| 9BG Documentation                               | Missing  | This policy and the testing/roadmap references complete the project documentation gap.                                                                                    |

## Interaction policy

Every page exposes one main content landmark and one primary H1. Public and admin shells
offer a first-focus skip link to a programmatically focusable main target. Heading levels
must not skip. Controls use native links, buttons and form elements wherever possible;
icon-only buttons need an accessible name.

All essential actions must work from the keyboard with a visible focus indicator and a
logical document order. Opening a modal moves focus into it, Tab and Shift+Tab remain in
the modal, Escape closes it, and close restores the initiating control. Gallery position
is visible and politely announced. Mobile navigation follows the same focus behavior and
locks background scrolling while open.

Forms keep persistent labels and associate supporting text and field-level errors through
`aria-describedby`. Failed submission focuses a linked summary without discarding entered
values. Pending forms identify their busy state; completion, upload progress, retries and
reordering use concise status or alert feedback. Character counts are associated but are
not live on every keystroke.

## Media, color and touch policy

Property media uses editorial alt text from the shared API. Decorative imagery uses an
empty alt attribute only when it contributes no information. Invalid or failed images
show a neutral, labeled fallback without exposing private data. Upload errors and progress
are associated with their file; keyboard reorder controls name both image and direction,
retain focus after a move and announce the result. Focal points remain labeled native
range controls with keyboard and numeric feedback.

Normal text uses combinations that meet 4.5:1 and large text/non-text indicators target
3:1. Gold on white is not used for normal text; verified examples include ink on white
`10.13:1`, muted gray on white `5.38:1`, dark gold on white `5.81:1`, and light gold on
dark slate `5.58:1`. State never relies on color alone. Interactive targets should be at
least about 44 by 44 CSS pixels where layout permits, with a visible focus ring that is
not dependent on color fill alone.

## Responsive and component behavior

Automated public overflow checks use widths 320, 360, 375, 390, 412, 414, 430, 480, 640,
768, 820, 1024, 1280, 1366, 1440, 1600 and 1920 CSS pixels. They cover home, catalog,
property detail and contact. Admin coverage includes 320, 360, 390, 768, 1280 and 1920.
The matrix checks absence of horizontal page overflow, visible primary headings and usable
media/forms; it supplements rather than replaces visual review on physical devices. The
targeted admin-drawer regression matrix also covers 320, 390, 768 and 1024 CSS pixels
while a separate 1280-pixel assertion preserves the collapsed desktop state.

Mobile navigation, gallery overlays and the sticky inquiry action respect safe areas.
Admin tables use named focusable horizontal-scroll regions. Filters and forms wrap rather
than compress into desktop grids. Typography remains fluid, long identifiers and URLs
wrap, and representative public pages are checked at 200% root text sizing.

## Maps, videos and recovery

The map is complementary to the property list and textual location, never the only way to
understand results. It exposes a named region, privacy-approved approximate points and
attribution. Boundary and data loading have explicit busy, error and retry states without
revealing private coordinates.

Featured videos are not loaded until the user activates them. The iframe has an explicit
title and receives focus after activation; an external YouTube link remains available.
No media autoplays with sound.

Loading states identify busy content without trapping focus. Errors explain the failed
operation and offer retry where recovery is possible. Empty states distinguish a valid
empty result from failure. Runtime image failure falls back without collapsing layout.

## Motion, compatibility and progressive enhancement

`prefers-reduced-motion: reduce` disables smooth scrolling and non-essential transitions
or animation. Essential actions do not depend on hover, fine pointer accuracy, swipe or a
particular clipboard/share API. The interface provides clipboard failure feedback and CSS
fallbacks for dynamic viewport and safe-area behavior.

Public editorial content, ordinary navigation, links, contact details and external video
links remain useful in server-rendered HTML. Interactive filters, inquiry submission,
map controls, dialogs and protected admin editing require JavaScript and expose loading
or error boundaries when enhancement fails.

The final public header direction threshold ignores tiny scroll changes. Focus capture,
an open mobile menu, and an active pointer interaction force it visible; keyboard users
can therefore enter the header even when it was previously translated out of view. The
About background video remains decorative and unfocusable, is muted before playback, and
is removed in favor of its poster under reduced motion. Contact social links combine
recognizable inline marks with visible platform names and explicit new-tab accessible
names.

The contact page begins with its existing local image as the page hero, keeps one H1,
and removes the former introductory “Say hello” composition without leaving a spacer.
Its named social links expose equivalent hover and keyboard-focus feedback, and their
decorative transforms and transitions are disabled under reduced motion.

The targeted final matrix covers 320, 390, 768, 1024, 1280, 1440, and 1920 CSS pixels for
the viewport-derived Home/About heroes, mobile Home crop, Locations illustration,
compact footer, tour dialog, public overflow, and protected-admin layout. At 200% text,
the tour dialog is permitted to scroll so every required field and action remains
reachable.

## Browser and manual acceptance boundary

Local Windows Playwright uses installed Microsoft Edge. The CI configuration uses system
Chrome, but configuration is not evidence that CI ran for a particular branch. Firefox,
WebKit, physical Safari/iOS, Android browsers, high-contrast/forced-colors modes, real
screen readers and physical phone/tablet file pickers require separate manual acceptance.
Record the exact browser, version, device and assistive technology when those checks are
performed.

Automated assertions can detect regressions in landmarks, labels, focus mechanics,
duplicate IDs, viewport overflow and selected computed styles. They cannot judge writing
quality, cognitive load, pronunciation, reading experience, gesture ergonomics or formal
WCAG conformance.

## Preserved boundaries

Level 9 does not change metadata, canonicals, structured data, robots or sitemap behavior.
It does not weaken published-only visibility, private-location separation, session/CSRF
controls, upload validation, fixture isolation or inquiry privacy. Map and video loading
remain deferred/lazy. Production inventory, media, provider credentials and business
approval remain external dependencies.
