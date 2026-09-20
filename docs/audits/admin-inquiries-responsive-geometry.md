# Admin Inquiries responsiveness and corner consistency

Date: 2026-09-15. Scope: the Inquiries queue layout and Admin surface corners only.

## Findings and root cause

The supplied attachment contains the written request, without a screenshot file. The
investigation therefore used the existing source, local changes, and before/after Edge
captures against the isolated Playwright fixture.

The shell already correctly allocates `17rem` to the expanded sidebar and `5rem` to
the collapsed sidebar, with a `minmax(0, 1fr)` content track. Its column and page already
have `min-width: 0`. No sidebar sizing or interaction change was needed.

The width pressure originates inside that track:

- The original Inquiries filter grid requires a `14rem` Search track, six `8.5rem`
  tracks, seven gaps, panel padding, and an intrinsic-width submit button. Those track
  minimums exceed the content width on ordinary laptops after subtracting the sidebar.
- Existing local repairs already add an auto-fit override and long-content wrapping.
  Other viewport-based overrides still make Search either an entire row or the same
  width as a select, regardless of the actual sidebar-adjusted space. In the baseline
  capture, Search drops to about 194 pixels even at a 1920-pixel viewport.
- Non-wrapping table headings and status pills determine large intrinsic column
  widths. Long names and email addresses can then receive very little space: the
  baseline stress fixture gives Contact approximately 94 pixels at 1366 pixels,
  causing an excessively tall row and sideways navigation to reach remaining columns.
- The header lacks a wrapping desktop arrangement for its title block and export
  button.

The initial working tree already prevented document overflow at the sampled widths.
That partial repair was preserved and completed; it was not attributed to this change.

## Resulting layout contract

Only the full Inquiries queue receives the new `inquiryQueuePage` class. The shared
Viewings list retains its previous layout, including its existing local auto-fit repair.
All filters, form names, labels, result text, columns, status colors, and actions remain.
The current export label remains **Export current page CSV**.

The queue uses wrapping Flexbox for filters. Search has a `24rem` basis and twice the
growth weight; Property ID has a `16rem` basis and a 1.5 growth weight; selects have a
`13rem` basis. Field minimums are capped at the available width, and inputs/selects
can shrink within their labels. Above `90rem`, select labels are capped at `18rem` so a
partially filled last row does not stretch a dropdown excessively. The submit button
wraps as needed. Existing gaps, padding, typography, and native form semantics remain.

The header wraps; above `50rem`, its title block has a `28rem` basis and the export
button keeps its intrinsic size where space permits. Existing smaller-screen header
stacking remains. Direct queue children receive `min-width: 0`.

The desktop table keeps automatic column sizing and removes the shared `50rem` minimum
only for this queue. Contact receives 20% width with a `12rem` minimum; Property and
Requested Schedule receive 14% with an `8rem` minimum. Received and Actions have
`6rem` minimums. Headings wrap between words. Names, email addresses, and property
references can wrap long tokens; type, schedule, date, and action words retain normal
wrapping. Cell padding becomes `0.75rem 0.65rem` inside this queue.

The existing focusable, named table region remains the only horizontal scroll area.
It stays bounded at the queue width with `contain: inline-size` and
`overflow-x: auto`. Its new `position: relative` anchors absolutely positioned hidden
table labels. Paint containment is unnecessary here, so it is removed from this
wrapper. The Inquiries shell explicitly uses `overflow-x: visible`; document-width
checks therefore cannot pass by masking overflow at the shell. Existing shell overflow
rules for other Admin pages are preserved.

Desktop retains all nine columns and may require table-local scrolling when their
readable intrinsic widths exceed the available space. Wider screens use the full table.
For the long-name/email/reference fixture with the longest viewing and inquiry statuses,
the desktop table naturally measures about 1211 pixels. At 1366 pixels, its expanded-sidebar
wrapper is about 998 pixels; at 1440 pixels, the wrapper is about 1067 pixels. This
scrolling remains local to the table. At 1920 pixels, the full table fits without scrolling.
At `64rem` and below, the established labeled record-card presentation remains, with
all nine fields and the details action. Tablet uses its existing two-column label/value
rows; mobile uses its existing stacked labels. No new mobile presentation was introduced.

Status pills stay compact and keep their colors and `999px` radius. On smaller screens,
they use their intrinsic width rather than stretching across the value column. Wrapping
is allowed when extreme text enlargement makes a single line impossible.

Sidebar expansion/collapse uses the original interaction and sizing without a refresh.
Content grows with the available track until it reaches the existing `100rem` shell
maximum. Mobile and tablet retain the original menu drawer.

## Corner reference and updated surfaces

The source of truth is the public `:root` token `--radius-card: 0` in
`frontend/src/app/globals.css`. Public buttons also already use a zero radius. That file
and every public component remain unchanged by this task.

The Admin-only `0.4rem` card-token override is removed. Its rectangular surfaces now
inherit the public token. The former `0.2rem`, `0.25rem`, and `0.3rem` surface/control
radii also use this token. This covers cards, panels, filter/search containers, text
inputs, selects, textareas, buttons, table wrappers and mobile record surfaces, detail
and workflow panels, property fieldsets, preview/media/upload surfaces, notices,
featured controls, calendar day controls/events, and the drawer Close button.

Circular logos, sidebar collapse/menu icon controls, status/featured/muted pills,
calendar count circles, and native checkbox/range controls retain their functional
shapes. Sidebar navigation retains its exact existing `0.4rem` radius, preserving its
styling independently of the content-surface token. Colors, fonts, shadows, focus rings,
navigation behavior, and sidebar behavior are unchanged.

Representative pages reviewed: Dashboard, Properties, Inquiries, Viewings, Search,
Audit, Staff, and Create Draft. Corner assertions and captures cover these pages at
320, 768, 1366, 1440, and 1920 pixels. Inquiry detail surfaces are also checked.

## Verification

Windows uses `npm.cmd`/`npx.cmd` to invoke the existing commands without changing
PowerShell execution policy.

| Check                  | Result                                                        |
| ---------------------- | ------------------------------------------------------------- |
| `npm run format:check` | Passed                                                        |
| `npm run lint`         | Passed, backend and frontend                                  |
| `npm run typecheck`    | Passed, all workspaces; frontend regenerated Next route types |
| `npm test`             | 38 test files, 417 tests passed                               |
| `npm run build`        | Passed, all three workspaces                                  |
| `npm run test:e2e`     | 93 tests passed, local Microsoft Edge                         |

After the final wide-dropdown cap, the focused Admin/Inquiries suite was rerun against
a freshly built frontend: nine tests passed. The full suite had already passed with the
same workflows, corner changes, and other queue layout rules.

The focused queue regression covers 320, 375, 430, 768, 1024, 1280, 1366, 1440, 1536,
and 1920 pixels. Every desktop width with a supported visible sidebar is tested expanded
and collapsed. Captures include 1366×768, 1440×900, and 1920×900; the diagnostic desktop
capture also uses 1920×1080. Mobile long records are checked again at 200% root text.

Assertions require the document scroll width to be no greater than its client width,
with Inquiries shell overflow visible. They also check filter bounds, non-overlapping
controls, selected status text plus native dropdown-arrow space, export bounds, cell
overflow, readable desktop Contact width, sidebar separation, all nine fields,
long name/email/property values, details-action visibility and keyboard focus after
scrolling the table, and zero document horizontal scroll position.

A functional regression checks all seven filter parameters, trimming, unchanged
pagination parameters and limits, current-page CSV contents, and the details URL.
Existing browser coverage checks inquiry/viewing status updates, notes, spam restoration,
archive confirmation, notification rendering, and session/CSRF behavior. No API request
semantics or workflow implementation changed.

Captures and machine-readable layout measurements remain under the ignored
`node_modules/.cache/playwright-test-results` and
`node_modules/.cache/admin-layout-baseline` directories. Public homepage before/after
captures are byte-identical. Browser evidence uses local Microsoft Edge and injected
fixtures; it does not claim live Auth0/MongoDB acceptance or physical-device testing.

## Diff and preservation

Task changes are limited to:

- `frontend/src/features/admin/AdminInquiryList.tsx` — queue-only style class;
- `frontend/src/features/admin/admin.module.css` — queue layout and Admin corners;
- `e2e/admin-inquiries.spec.ts` — layout, detail-corner, filter, pagination and CSV checks;
- `e2e/admin-operations.spec.ts` — representative Admin corner checks;
- this report.

The working tree began with substantial unrelated changes. File hashes and a full diff
were recorded before editing. Unrelated modified and untracked files retain their
original hashes. Existing work in the touched Admin/test files is preserved, including
the previous inquiry wrapping test and availability styles. The existing stash remains
unchanged. No stash was applied, popped, or removed.

No public/client implementation, Auth0, authentication/session/security configuration,
backend business logic, database schema, API, or deployment setting was changed by this
task. Work remains uncommitted on `fix/admin-inquiries-responsive-geometry`.
