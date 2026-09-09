# Operational resilience architecture

Status: Level 12 architecture with Level 14 reliability remediation implemented; live
monitoring, backup, restore, and provider acceptance remain blocked until infrastructure
is selected and provisioned.

This document records the application boundaries that make failures visible without
turning observability into a second store of customer data. Operator procedures and
recovery steps are in [operations](../development/operations.md) and
[disaster recovery](../development/disaster-recovery.md).

## Health and request observability

`GET /api/v1/health` is process liveness and always returns 200 while Express can serve
requests. Its MongoDB state is informational and never changes the liveness result.
`GET /api/v1/health/ready` is traffic readiness and returns 200 only for Mongoose ready
state 1; otherwise it returns 503. Email, Auth0, maps, and storage are deliberately not
hard readiness dependencies because their outages do not make every public workflow
unusable. Both responses are `no-store`, contain no connection strings or credentials,
and remain distinct monitoring signals.

Every request receives a new server-generated UUID in `X-Request-ID`; caller-supplied
IDs are ignored. Completed-request and unexpected-error logs use that ID. Runtime logs
are newline-delimited JSON with timestamp, severity, event, environment, optional build
ID, and allowlisted event fields. Request logging includes method, path without query,
status, and duration. It never serializes headers, cookies, query values, bodies, tokens,
customer messages, private addresses, or coordinates. Unexpected exceptions contribute
only a bounded error name/code, not an arbitrary error message or stack. `LOG_LEVEL`
supports `debug`, `info`, `warn`, and `error`; production defaults to `info` and test to
`warn`. Production rejects `debug` at startup.

No log/error provider is selected. A future provider must ingest stdout/stderr JSON,
preserve request IDs, apply the privacy restrictions above, support environment/build
facets and retention controls, and provide rate/error alerts. Provider SDK request-body,
session-replay, user-contact, header, and query capture must remain disabled unless a
separate privacy decision explicitly approves a minimized field.

## Inquiry notification delivery

MongoDB inquiry persistence remains the acceptance boundary:

```text
persist inquiry + owned `sending` notification identity and five-minute lease
  -> attempt email
     -> delivered
     -> retry-pending -> leased sending -> retry-pending or terminal-failure
```

Each new inquiry embeds a private notification record with a random stable notification
ID, state, attempt count, safe error code, and database lease. The initial request owns a
five-minute `sending` lease before delivery begins, so a retry worker cannot claim the
same notification while that send is in flight. The ID
is distinct from the public inquiry idempotency key and contains no customer data. A mail
adapter must pass it to its provider as the provider idempotency key where supported.

The initial attempt happens only after the inquiry is durable. Failure never rolls the
inquiry back or changes the public success response. Retries are bounded at five total
attempts, with 5, 30, 120, then 360 minute spacing. A five-minute MongoDB lease and
conditional state transitions prevent two workers from intentionally owning one attempt;
an expired lease can be reclaimed after a crash. A send that succeeds immediately before
a process crash can still be retried, so provider idempotency remains a production
adapter requirement. The fifth failed attempt becomes `terminal-failure` and requires
operator review.

The repository does not contain a fake mail queue or a long-lived in-process scheduler.
The compiled retry command fails closed while the notifier is unconfigured. Once a real
adapter exists, the deployment provider must invoke it as a single bounded scheduled job;
database leasing keeps overlapping invocations safe.

Existing inquiries created before Level 12 have no notification state. The integrity
scan reports those records for review; it does not invent delivery history or resend them.
Level 15 exposes safe notification status/count/timing fields to authorized staff and
dashboard aggregates. Notification identity, lease state, provider credentials, and
customer content remain private. No manual retry endpoint or second scheduler was added;
the bounded leased CLI architecture remains authoritative.

## Media failure and consistency boundary

Media validation, transformation, storage write, MongoDB metadata save, storage delete,
and public delivery are separate failure categories. Public/admin messages remain
concise, while structured logs carry only the safe category, request ID, and property
record ID.

The database remains authoritative for gallery order and cover choice. After metadata
removes an adapter-owned object, a storage deletion failure does not re-add the media.
Instead, a private `PropertyMediaCleanupTask` upserts cleanup debt by a SHA-256 reference
hash. The stable adapter reference is excluded from normal selection, the task records
only reason, attempts, safe error code, and dates, and status stays `pending-review`.
Likewise, if an upload reaches storage but metadata persistence fails, failed compensating
deletion becomes cleanup debt without masking the original database error.

Metadata persistence, value-minimized audit insertion, and external-object deletion have
an explicit order. Upload compensation may delete a newly stored object only if metadata
did not commit. Once metadata commits, an audit failure is surfaced and the referenced
object is retained. Removal commits metadata, then audit, then deletion; an audit failure
therefore records cleanup debt without deleting, and a later deletion failure also records
debt without restoring removed metadata. Local transformation cleanup failures expose a
distinct safe error code instead of being silently discarded.

No cleanup worker or automatic deletion exists. A future provider adapter must define a
reviewed owned namespace and stable non-secret object references before removal. Object
listing and orphan detection must produce a report only after excluding in-progress
uploads and objects younger than the approved grace period. A failed database read,
temporary CDN outage, or first missing-object result must never trigger deletion.
The Level 15 dashboard may count pending-review cleanup records but cannot reveal object
references or mutate debt. Orphan scanning therefore remains scan-only and CLI-owned.

## Audit and integrity decisions

Security audit events remain value-minimized, append-only MongoDB records without a TTL.
Level 12 deliberately does not add an event bus or outbox: current project scale and the
absence of a centralized audit destination do not justify a second delivery system.
Audit insertion failures remain operational errors correlated by request ID. Before
production, the database owner and business/admin owner must approve retention and the
monitoring provider must alert on those failures. A future outbox is reconsidered only if
independent audit durability or centralized delivery becomes a verified requirement.

`ops:check-integrity` reads only lifecycle/reference metadata through bounded database
cursors. Database-side aggregations preserve duplicate and missing-reference detection
across cursor batches. `--limit` is the cursor batch size (1–500), not a record cap; every
record is checked. JSON retains complete severity counts but serializes at most 500
PII-free findings and reports the omitted count. It reports duplicate or
invalid property IDs/slugs, non-sale records, gallery/cover inconsistencies,
inquiry/property/viewing/history inconsistencies, notification failures, and media
cleanup debt. Output contains entity IDs and codes, not PII, addresses, coordinates, or
media URLs. It is scan-only and contains no repair or delete mode. Property numbers and
customer workflow history are never rewritten automatically.

## Bounded I/O deadlines

MongoDB applies a 10-second socket/default operation deadline in addition to server
selection. The HTTP server bounds request/socket inactivity at 15 seconds and headers at
10 seconds. The browser API client defaults to 15 seconds, public reads/map assets use an
8-second boundary, and image uploads use 30 seconds. Caller cancellation remains distinct
from a deadline so route teardown does not display a false timeout. Inquiry retries reuse
the same browser idempotency key after uncertain failures.

## Scheduled work boundary

The eventual scheduler needs separate jobs for notification retries, integrity scans,
orphan reports, backup completion checks, and restore-rehearsal reminders. Hosting is not
selected, so no reliability claim is made for cron, serverless timers, or in-process
intervals. Mutating commands require an explicit environment target and production
confirmation; read-only commands still require an explicit target. Credentials remain in
the deployment/provider secret store.
