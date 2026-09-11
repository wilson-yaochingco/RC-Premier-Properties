# Admin Operations

Status: Level 15 operational workspace and Part 4 responsive admin presentation
implemented. Live Auth0, Atlas, provider, retention, and physical-device acceptance
remain external gates.

## Scope

The protected staff shell adds small operational views over the existing property,
inquiry, viewing, audit, notification, cleanup-debt, and `StaffIdentity` records:

- `/admin` — bounded real-data counts, new-inquiry visibility, upcoming viewings, and
  retry/cleanup attention counts;
- `/admin/viewings` — a six-week calendar and equivalent chronological list over the
  existing viewing-request state;
- `/admin/search` — at most five property and five value-minimized inquiry results from
  dedicated bounded reads;
- `/admin/audit` — paginated, filterable, value-minimized audit events; and
- `/admin/staff` — paginated read-only visibility into existing local staff identities.

This is not a CRM, analytics platform, scheduling engine, or second identity system. It
does not create clients, agents, calendar availability, revenue metrics, popularity,
notifications, or provider configuration.

## Shell and navigation

The public MVP supplies the admin visual language: warm neutral surfaces, navy structure,
gold accents, compact serif headings, consistent controls, and visible focus states. On
desktop, the ordered navigation lives in a collapsible sidebar whose presentation state
is stored locally in the browser. Collapsed links keep programmatic names. On tablet and
mobile, the same destinations move into a labelled modal drawer that traps keyboard focus,
closes on Escape or route selection, and restores focus to the menu trigger. Reduced-motion
preferences disable shell transitions.

At widths through 1024 CSS pixels, the drawer always renders the full icon-and-label
navigation even when the separately persisted desktop sidebar preference is collapsed.
All permitted destinations, Create Draft, View Website, and Sign Out remain visible;
the current route retains `aria-current="page"`. The modal backdrop uses a simple
translucent fill without a costly blur, while the desktop sidebar keeps its independent
compact mode above the tablet breakpoint.

The shell does not replace identity or authorization. “Renzo & Criezel” and “RC Premier
Properties Staff” are presentational labels; the current local staff display name remains
separate. Search, Audit, and Staff links still follow existing permissions, Sign Out uses
the established CSRF-protected session endpoint, and View Website opens the public root
in a new tab.

## Dashboard and viewing calendar

Dashboard property counts include residential sale records only. Publication counts are
draft, published, and unpublished; market counts are available, reserved, and sold among
published records. Inquiry counts use actual non-archived workflow status. Notification
counts use persisted retry-pending and terminal-failure states. Cleanup debt is the count
of existing pending-review records; no cleanup mutation is available.

Upcoming viewings use `Asia/Manila` date/time semantics, exclude archived and terminal
inquiry/viewing states, and return six records plus an independent count. The calendar
accepts a real inclusive range of at most 42 days and pages through every matching
record in chunks of at most 200. It
contains inquiry and Premier Property identifiers, status, requested date, and requested
time—never names, email addresses, phone numbers, or message text. A keyboard-focusable
table and equivalent schedule list are both present. Wide screens show concise events in
the full calendar. Tablet uses a compact calendar, while mobile keeps a seven-column date
grid with textual viewing counts and renders the selected date's appointment links in an
agenda below instead of squeezing cards into cells. This visualizes requests that staff
may confirm through the established inquiry workflow; it does not expose slots or confirm
appointments.

## Search, audit, and staff boundaries

Cross-admin search delegates to the bounded property list and a dedicated inquiry-search
endpoint whose database projection returns only opaque inquiry identifier, type, status,
and optional Premier Property number. Names, email addresses, phone numbers, subjects,
messages, and other inquiry values are neither transported nor rendered. Opening the
protected inquiry detail remains the deliberate path to contact data.

Audit responses select only actor staff ID, allowlisted action, entity type/ID, outcome,
request ID, and occurrence time. Filters cover available action/entity/outcome/date/staff
fields; date fields use Philippine calendar-day bounds. Session authentication events
redact the session entity ID, while other operational entity IDs remain visible. Page
size defaults to 25 and is capped at 100. Event details and before/after payloads are not
returned.

Staff visibility uses the existing `StaffIdentity` collection and administrator-only
`staff:manage` permission. The response omits Auth0 issuer/subject and all session data.
It is intentionally read-only: provisioning and deactivation remain existing deliberate
CLI workflows because they already provide session revocation and value-minimized audit
behavior. Level 15 does not add role mutation, passwords, Auth0 management, or a risky
final-administrator workflow.

## Current-page CSV and contact convenience

The property and inquiry lists can export only the records already returned on the
current protected page. No unbounded export endpoint was added. Every cell is quoted,
UTF-8 output carries a BOM, and values beginning with `=`, `+`, `-`, or `@` after optional
leading whitespace are prefixed with an apostrophe to prevent spreadsheet formula
interpretation. Property export contains public/list operational fields. Inquiry export
contains name and email needed for staff operations but excludes phone, message,
consent, notes, history, and notification internals.

Authorized inquiry detail adds accessible copy controls for the already-visible email and
phone, plus actual inquiry/viewing history timestamps. Notification status, attempts, and
available attempt/delivery times are visible; provider credentials and notification IDs
are not.

## Query and security review

All routes require the backend-owned session and named permissions and return `no-store`.
They are read-only, so they do not need or bypass CSRF/optimistic concurrency. Existing
mutable property, inquiry, viewing, staff CLI, retry CLI, and media workflows retain their
version, origin, CSRF, audit, lease, and cleanup rules.

The dashboard uses one property aggregation, one inquiry aggregation, a six-record
projected viewing query, and count operations concurrently. Calendar, audit, and staff
queries are paginated and projected. Related public inventory uses one current-record
query and one 12-candidate query, then returns at most three; the detail route streams
without waiting for that secondary read. No per-row query is issued, so no N+1 path was
introduced.

No index was added in Level 15. Existing indexes cover published property
purpose/type/price, viewing status/date, notification status, audit actor/action/time,
staff status/role/email, and cleanup status. The small dashboard aggregations intentionally
favor one server-side scan over loading documents. Representative Atlas
`executionStats`, cardinality, and latency remain external gate X04; an index should be
added only if that evidence identifies a real bottleneck.

## Deliberately deferred

- Draft autosave: conflict-safe autosave would require more UX/state work around the
  existing optimistic-concurrency token; weakening 409 protection is not acceptable.
- Duplicate warnings: property number and slug uniqueness already block exact collisions;
  no evidence supports a reliable non-fuzzy heuristic for broader warnings.
- Bulk availability: per-record versions, confirmation, authorization, audit, and partial
  failure semantics outweigh the demonstrated need; individual safe transitions remain.
- Staff mutations, manual email retry, cleanup mutation, and orphan deletion UI: existing
  CLI/operator boundaries are safer and already bounded; no automatic orphan deletion is
  introduced.
- QR code: the canonical URL is printed as accessible text; dependency/implementation
  weight is not justified for an optional enhancement.
