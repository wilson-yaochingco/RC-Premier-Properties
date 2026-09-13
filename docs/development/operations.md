# Monitoring and incident operations

Status: **Level 12 local engineering complete; live operational acceptance blocked**.
No uptime/error/log/RUM provider, alert destination, hosting platform, production Atlas
tier, storage/CDN, mail provider, map provider, staging environment, or production traffic
has been supplied. Recommendations below are targets for approval, not configured facts.

See [operational architecture](../architecture/operational-resilience.md),
[deployment and release](deployment-and-release.md), and
[disaster recovery](disaster-recovery.md).

## Pre-implementation audit and classification

The audit started from clean Level 11 commit `f3b96b4` on
`feature/deployment-staging`; `stash@{0}` was present and was not applied, popped,
deleted, or modified. Classification terms are: **existing** (verified and preserved),
**implemented** (Level 12 repository work), **documented** (operator policy),
**provider/deployment/live** (external acceptance), **manual** (human approval), and
**deferred** (unsafe or unjustified now).

| Req  | Classification and result                                       | Req  | Classification and result                                 |
| ---- | --------------------------------------------------------------- | ---- | --------------------------------------------------------- |
| 12A  | Documented role ownership                                       | 12B  | Existing health split verified                            |
| 12C  | Documented; provider/deployment blocked                         | 12D  | Implemented safe boundary; provider blocked               |
| 12E  | Implemented allowlisted JSON logs                               | 12F  | Existing UUID request IDs verified                        |
| 12G  | Implemented validated levels                                    | 12H  | Documented; final retention unapproved                    |
| 12I  | Existing audit coverage reviewed                                | 12J  | Documented no-outbox decision                             |
| 12K  | Existing persistence order preserved; state implemented         | 12L  | Implemented bounded backoff design                        |
| 12M  | Implemented provider-neutral worker; scheduler/provider blocked | 12N  | Implemented terminal state/reporting                      |
| 12O  | Implemented stable delivery identity                            | 12P  | Implemented distinct safe failure events                  |
| 12Q  | Documented reconciliation rules                                 | 12R  | Documented safe scan; provider listing blocked            |
| 12S  | Deferred automatic delete as unsafe                             | 12T  | Implemented durable cleanup debt                          |
| 12U  | Documented; provider/live blocked                               | 12V  | Provider-selection requirement                            |
| 12W  | Documented; Atlas tier blocked                                  | 12X  | Documented role/provider ownership                        |
| 12Y  | Documented supplementary export only                            | 12Z  | Documented isolated restore sequence                      |
| 12AA | Documented validation plus local integrity command              | 12AB | Documented recommended cadence; actual schedule blocked   |
| 12AC | Documented decision framework; guarantees unapproved            | 12AD | Documented separate media recovery                        |
| 12AE | Documented originals as source requirement                      | 12AF | Documented DB/object reconciliation                       |
| 12AG | Documented Auth0/application ownership                          | 12AH | Documented forced reauthentication policy                 |
| 12AI | Documented three-level severity                                 | 12AJ | Documented incident workflow                              |
| 12AK | Documented database runbook                                     | 12AL | Documented Auth0 runbook                                  |
| 12AM | Documented email runbook                                        | 12AN | Documented storage runbook                                |
| 12AO | Documented map runbook                                          | 12AP | Existing rollback integrated                              |
| 12AQ | Documented actionable categories                                | 12AR | Provider/route blocked; no destination invented           |
| 12AS | Existing signals plus provider aggregation required             | 12AT | Implemented 429 logs; aggregation provider blocked        |
| 12AU | Provider status procedures pending selection                    | 12AV | Documented alert requirement; provider blocked            |
| 12AW | Documented alert requirement; live exercise blocked             | 12AX | Implemented scan-only integrity checks                    |
| 12AY | Implemented duplicate/invalid reference detection               | 12AZ | Implemented relationship/history detection                |
| 12BA | Implemented read-only command                                   | 12BB | Documented external scheduler boundary                    |
| 12BC | Implemented notification DB leases                              | 12BD | Implemented bounded delayed retry                         |
| 12BE | Existing external-secret policy preserved                       | 12BF | Implemented ignore rules and documented protection        |
| 12BG | Documented restricted recovery environment                      | 12BH | Documented mail suppression requirement                   |
| 12BI | Documented staging Auth0 isolation                              | 12BJ | Documented provider-neutral ingestion requirements        |
| 12BK | Documented privacy-preserving RUM handoff                       | 12BL | Implemented/documented monitoring minimization            |
| 12BM | Implemented allowlist; no body/header serialization             | 12BN | Documented backup security                                |
| 12BO | Custom dashboard intentionally deferred                         | 12BP | Existing minimal public health preserved                  |
| 12BQ | Implemented deterministic failure tests                         | 12BR | Implemented CLI/config safety tests; live restore blocked |
| 12BS | Documented recovery exercise                                    | 12BT | Disaster-recovery runbook added                           |
| 12BU | Documented honest continuity matrix                             | 12BV | Recommended targets separated from actual policy          |
| 12BW | Separate retention decisions documented                         | 12BX | Implemented explicit production targeting                 |
| 12BY | Integrity/orphan policy scan-only                               | 12BZ | No deletion tooling; scan-only requirement documented     |
| 12CA | Implemented validation, exit codes, noninteractive behavior     | 12CB | Existing Level 11 controls preserved                      |
| 12CC | Existing Level 10 budgets preserved                             | 12CD | Existing Level 9 behavior preserved                       |
| 12CE | Existing Level 8 noindex/robots preserved                       | 12CF | Existing security/privacy boundaries preserved            |
| 12CG | Existing public sale-only filter plus scan preserved            | 12CH | Focused tests implemented                                 |
| 12CI | Local quality gate required before handoff                      | 12CJ | Live operational acceptance external/blocked              |
| 12CK | Documentation implemented                                       |      |                                                           |

## Ownership

Names are intentionally not invented. One person may hold multiple roles, but assignment
must be recorded outside this repository before traffic is enabled.

| Area                                         | Accountable role     | Required action                                              |
| -------------------------------------------- | -------------------- | ------------------------------------------------------------ |
| Frontend/API availability, errors, releases  | Application operator | Review checks/logs, triage, coordinate rollback              |
| Deployment, DNS, edge, build/config revision | Deployment owner     | Deploy/rollback known builds and maintain platform access    |
| MongoDB health, backups, restores, integrity | Database owner       | Configure least privilege, backup policy, restore rehearsals |
| Auth0 tenant and MFA                         | Deployment owner     | Tenant configuration/export, provider incident work          |
| Staff authorization and customer follow-up   | Business/admin owner | Staff allowlist, terminal notifications, inquiry continuity  |
| Media storage/CDN and recovery               | Deployment owner     | Provider controls, versions, object restore, reconciliation  |
| Transactional email and maps                 | Application operator | Provider status, credentials, failure escalation             |
| Incidents and evidence                       | Application operator | Incident lead until a named owner is assigned                |

## Monitoring policy

Recommended target, not configured policy:

- Check the public frontend `/`, API `/api/v1/health`, and readiness
  `/api/v1/health/ready` every five minutes from outside the hosting environment.
- Alert after three consecutive failures. Resolve a single transient failure in the
  dashboard without paging; immediately escalate confirmed widespread failure or a
  security/data-integrity signal.
- Check `robots.txt` and `sitemap.xml` daily for status/content regressions. These are SEO
  checks, not critical uptime pages.
- Keep liveness and readiness alerts distinct. Liveness failure means the process/path is
  unavailable. Readiness-only failure points first to MongoDB/connectivity/configuration.
- Aggregate unexpected 5xx, sustained 429 rates, auth failures/forbidden/CSRF-origin
  denials, email retry/terminal failures, media failures, cleanup debt, backup failures,
  and restore-test failures. Never alert on every individual 4xx or blocked request.
- A future RUM setup should collect Core Web Vitals and coarse device/network/browser
  context only after privacy review and real traffic. Session replay, form values, exact
  location, persistent advertising identifiers, and customer contact data are out.

Provider status links, alert channels, on-call contacts, and escalation timeouts remain
**BLOCKED / EXTERNAL**. `rcpremierph@gmail.com` is a business inquiry destination and is
not an incident-alert inbox unless the business explicitly approves it.

## Severity and incident workflow

- **SEV-1:** broad public/admin outage, credible security compromise, material data loss
  or corruption, or backup/restore failure during an active recovery.
- **SEV-2:** major degraded workflow or provider outage with a safe workaround, including
  sustained readiness, email, storage, or authentication failure.
- **SEV-3:** limited defect, isolated failed job, or integrity warning without immediate
  customer/data impact.

For every incident: identify the alert and request/build IDs; assess impact and severity;
preserve logs/audits/provider evidence; stabilize without weakening security; assign an
incident lead and communicate internally; recover using the provider/runbook boundary;
verify health, security, data, and user journeys; record timeline, cause, corrective work,
and unresolved risks. Never delete evidence or run cleanup/restore merely to clear an
alert.

## Provider outage runbooks

### MongoDB

Readiness should fail while liveness can remain healthy. Confirm provider status,
network/allowlist/TLS, credentials through the secret store (without printing them),
connection metrics, and the most recent build/config change. Authentication and all
database workflows fail closed; there is no production memory fallback. Roll back code or
configuration only when evidence identifies the release. Restore only for confirmed data
loss/corruption and follow the isolated procedure—not for an ordinary outage.

### Auth0

Public browsing remains available where MongoDB is healthy; staff login/callback may be
unavailable. Check provider status and tenant configuration. Do not add a bypass, accept
email-only identity, weaken MFA, or mint a local emergency session. After recovery,
verify signed OIDC, MFA, local `StaffIdentity`, CSRF, logout, and revocation.

### Transactional email

Inquiry persistence continues when MongoDB is healthy. Inspect aggregate failure codes,
retry backlog, terminal failures, provider status, sender/domain verification, and quota.
The business/admin owner reviews new inquiries directly in the protected queue and
performs manual follow-up while notification is delayed. Do not tell the customer the
inquiry failed after it was persisted. Retry only through the leased bounded worker.

### Media storage/CDN

Textual property content, inquiry, and viewing routes remain usable with existing image
fallbacks. Stop upload/reconciliation jobs during provider-wide read failures. Do not
delete metadata or classify objects as orphaned based on temporary 404/5xx/DNS failure.
Check provider status, DNS, latency, small representative derivatives, write failures, and
cleanup debt. Recover objects/versions first, then run reconciliation and public checks.

### Map provider

Property cards, textual locations, inquiries, and viewing remain usable. Check provider
status, DNS, tile response, attribution, CSP, and recent config. Preserve retry and
non-map alternatives; never reveal private coordinates as a fallback.

### Deployment

Rollback triggers include sustained readiness/5xx, broken auth/session/CSRF, severe
frontend/accessibility regression, critical CSP blockage, or incompatible API release.
Use the Level 11 rollback procedure and last-known-good build/config revisions. Do not
restore MongoDB, delete media, or weaken a security control for a code rollback. Re-run
health, smoke, privacy, sales-only, SEO, and critical user checks afterward.

## Alert categories and continuity

| Signal                     | Initial response                                      | Continuity                                                   |
| -------------------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| Frontend/API liveness down | SEV-1/2 by breadth; deployment/host check             | No web service while unavailable                             |
| Readiness/MongoDB down     | Database runbook                                      | Static shell may load; dynamic/public/admin work unavailable |
| Auth0 down                 | Auth0 runbook                                         | Public site remains; staff login unavailable                 |
| Email failures/backlog     | Email runbook; terminal state needs human review      | Inquiry persistence and protected queue continue             |
| Storage/CDN failures       | Storage runbook; suspend cleanup                      | Text and forms continue with media fallbacks                 |
| Map failures               | Map runbook                                           | Cards/text/forms remain usable                               |
| Backup missed/failed       | Database owner investigates now; do not silently wait | Application may continue, recovery risk elevated             |
| Restore rehearsal failed   | Treat at least SEV-2 until recovery is credible       | Do not claim backups proven                                  |
| Integrity errors           | Preserve evidence, scope records, manual review       | Do not auto-repair/delete/renumber                           |

## Commands and scheduling

Build the backend first, then run from repository root:

```text
npm run build --workspace shared
npm run build --workspace backend
npm run ops:check-integrity --workspace backend -- --target development
npm run ops:retry-inquiry-notifications --workspace backend -- --target staging --limit 50
```

The integrity command is always scan-only. It requires an explicit target, emits a
PII-free JSON report, exits `2` for serious findings and `1` for execution/configuration
failure. `--limit` selects the database cursor batch size from 1 through 500; it never
limits how many records are inspected. Complete severity counts are retained while the
serialized finding list is capped at 500 with an `omittedFindings` count. It has no repair
flag.

The retry command mutates notification state and may send mail. Production additionally
requires `--confirm-production`; it refuses to claim work unless a real notifier reports
itself configured. A deployment scheduler should invoke bounded batches and alert on
nonzero exit, overdue backlog, or terminal failures. Do not run this as an Express timer.

Recommended scheduling framework, pending provider selection: notification retry at or
more frequently than the shortest five-minute delay; integrity scan daily; orphan report
weekly after a provider-approved age/grace rule; backup status checked after every planned
backup; restore rehearsal reminder quarterly. Actual schedules and concurrency limits
must be recorded when hosting and data-loss targets are approved.

## Retention decisions

There is no approved legal/business retention schedule, so the application does not add
TTL deletion for inquiries, audits, cleanup debt, or notification state. Recommended
targets for approval are deliberately separate:

| Data                             | Recommended target                                                                  | Actual configured policy              |
| -------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------- |
| Application logs                 | Short operational window such as 14–30 days; longer only for investigated incidents | No centralized provider/configuration |
| Security audit records           | Business/security-approved multi-month period; preserve incident holds              | MongoDB, no TTL                       |
| Provider/deployment logs         | At least the diagnostic/release window, minimized at ingestion                      | Provider not selected                 |
| Notification state               | Retain with the inquiry until follow-up and inquiry retention allow disposal        | Retained with inquiry; no delete job  |
| Cleanup debt                     | Until reviewed/resolved under approved object policy                                | Pending-review records retained       |
| Database backups/object versions | Tiered daily/weekly/monthly proposal in recovery runbook                            | No production provider/configuration  |

Deletion after an approved period must be a separate reviewed change with legal/business
input, incident holds, dry run, explicit production targeting, and audit evidence.

## Live acceptance blockers

Uptime probes, log/error ingestion, alert delivery, provider status links, real email
delivery and failure, storage/CDN health and orphan listing, Atlas backup/PITR, backup
completion, isolated restore, media recovery, restore rehearsal, field RUM, and real
traffic behavior are **BLOCKED / EXTERNAL**. No local fake or mock result satisfies them.
