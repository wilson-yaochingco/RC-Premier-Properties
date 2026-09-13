# Disaster recovery

This is the authoritative Level 12 recovery runbook. It defines safe steps and required
evidence; it does not claim a production backup or restore exists. Live execution is
**BLOCKED / EXTERNAL** until hosting, Atlas tier, storage/CDN, credentials, alert routing,
staging, and responsible operators are supplied.

## Recovery objectives and backup policy

RPO (acceptable data loss) and RTO (acceptable service interruption) are business and
operator decisions. No zero-loss or minute-level guarantee is made.

Recommended target for approval: classify inquiries/viewings and listing lifecycle as
high-value changing data, media originals as high-value slower-changing data, and
regenerable derivatives as lower recovery priority. Choose an Atlas tier whose managed
snapshot/PITR capability can meet the approved database RPO; use provider-managed backup
as the primary mechanism. A controlled logical export may be supplementary but must not
be the only production backup. Select object storage with independently protected
originals, versioning or equivalent accidental-deletion recovery, and documented restore
access. CDN cache is never a backup.

Actual configured policy: none. Snapshot frequency, PITR window, daily/weekly/monthly
retention, object-version retention, geographic/account separation, immutability, and
recovery time are unverified. The database owner must record the actual provider settings
and compare them to the approved RPO/RTO before launch.

Backup jobs/providers must encrypt in transit and at rest, restrict read/restore rights,
audit restore-capable access, separate staging/production credentials, alert immediately
on missed/failed backups, and keep artifacts outside Git and public web roots. Never pass
credentials on a command line, print a URI, or store an export on an unmanaged shared
device. `backups/`, `recovery/`, BSON, archive, metadata-export, and mongodump artifacts
are ignored as a last defense, not as permission to create them in the repository.

## Database restore procedure

1. Declare an incident/rehearsal, identify the database owner and restore point, record
   evidence of why it was selected, and freeze nonessential mutation/cleanup jobs.
2. Provision a new isolated recovery database and restricted application environment.
   Never target the active production database or overwrite it in place.
3. Disable outbound customer email at the provider/adapter boundary; use no provider or a
   controlled sink. Use staging Auth0 callbacks/tenant and block public/search access.
4. Restore the selected managed snapshot/PITR point into the new database using the
   provider's reviewed restore operation. If using an approved logical export, restore to
   the explicitly named new database with credentials from the secret store.
5. Attach or restore the matching media originals/object versions to an isolated storage
   namespace. Do not point an unverified database at the production public bucket.
6. Deploy the exact reviewed application build and recovery configuration. Use a new
   session-hash secret so restored `AuthSession` records cannot authenticate; require all
   staff to log in again after cutover.
7. Verify collections/indexes, run the scan-only integrity command against the explicit
   recovery target, and perform the validation checklist below.
8. If validation fails, preserve evidence, reject that restore, choose another restore
   point or correct the isolated environment, and alert the incident lead. Do not repair
   production records from assumptions.
9. For an actual production cutover, obtain explicit incident lead, database owner, and
   business/admin approval. Quiesce writes, account for changes after the restore point,
   switch connection/traffic through the deployment provider, and keep the old database
   inaccessible but preserved for rollback/evidence. No repository command automates
   this step.
10. Re-run readiness, smoke/security/privacy checks, representative public/admin reads,
    and media reconciliation before enabling normal traffic or notifications. Monitor
    closely and document the result.

## Restore validation

Record pass/fail and counts without copying customer values into the exercise record:

- MongoDB opens through least-privilege recovery credentials and expected collections
  and indexes exist, including unique property ID/slug/notification indexes.
- Representative counts and newest/oldest timestamps for properties, inquiries,
  viewings, staff identities, and audit events are plausible against backup evidence.
- `ops:check-integrity` has no unexplained errors: property identifiers remain stable;
  sale/publication lifecycles are valid; inquiry/property and viewing histories agree;
  notification and media cleanup states are accounted for.
- The application reads catalog, property detail, inquiry queue, and a representative
  viewing without exposing private address/coordinates or inquiry data publicly.
- Archived/sold/unpublished states remain correct; nothing is republished or renumbered.
- Media cover/order/URLs agree with objects; originals and required derivatives exist;
  small public derivatives load through the recovery path; orphans/missing objects are
  reported, never deleted during validation.
- Auth0 staging login and local authorization work only after deliberate configuration;
  restored sessions do not authenticate; revoked/disabled staff remain denied.
- No real customer email, search indexing, public staging access, or production callback
  occurs. Run the read-only deployment smoke checks only after the isolated endpoints are
  intentionally reachable to the operator.

A provider saying “backup complete” is not restore evidence. A restore is proven only
when this checklist passes in the isolated environment.

## Media recovery and reconciliation

Retained validated originals are the required source of truth for generated WebP/other
derivatives. Provider selection must establish whether derivatives can be deterministically
regenerated, how object keys map to public URLs, and how versions are recovered. Do not
delete originals merely to save space without an approved recovery policy.

Reconcile database metadata to storage inventory in both directions: metadata pointing
to missing objects; objects with no metadata; missing derivatives with an original;
derivatives without an original; retained objects for archived properties; temporary
upload remnants; and older replacement versions. Candidate orphans require a successful
known-namespace listing, metadata/reference check, exclusion of in-progress/temp states,
an approved age/grace period, report/quarantine, a later recheck, and operator approval.
Provider/read errors suspend classification. Automatic orphan deletion is not enabled.

## Auth0, sessions, and other providers

MongoDB backup preserves `StaffIdentity`, local roles/authorization versions, application
sessions, and audit records; it does not preserve Auth0 users, factors, tenant settings,
Actions, or provider logs. The deployment owner must separately maintain/review Auth0
tenant configuration/export/recovery capabilities once the tenant plan is selected.
Never bypass authentication during recovery. Rotate the session-hash secret or otherwise
invalidate sessions and require reauthentication; active sessions are not critical
recovery data.

For mail outage, keep inquiries durable, suspend/observe bounded retries if the outage is
prolonged, and use protected queue follow-up. For map outage, keep cards/text/forms and
privacy-preserving fallback. For storage outage, keep metadata, text, and fallbacks; do
not run orphan cleanup. For application regression, use the Level 11 build rollback and
do not couple it to database/media rollback unless data evidence independently requires
recovery.

## Recovery exercise

Recommended target: run an isolated restore rehearsal at least quarterly and after a
material database/storage/provider architecture change. Actual cadence and scheduler are
not configured. Exercise checklist:

1. assign incident/recovery roles and an approved synthetic or access-restricted restore;
2. provision isolated database, storage, network, frontend/API, Auth0 staging config, and
   mail-disabled environment;
3. restore database and matching media;
4. start the reviewed build with new session secret;
5. run index/count/integrity, privacy, sales-only, and relationship checks;
6. verify representative public/admin/property/inquiry/viewing and media fallback paths;
7. verify no real mail, production Auth0 callback, public indexing, or production writes;
8. run smoke tests and record RPO/RTO observations as measurements, not guarantees;
9. record failures and alert the operational owner—restore-test failure is significant;
10. destroy the isolated environment through the provider's approved process only after
    evidence and required retention are secured.

No recovery exercise was performed in Level 12 because no live backup, storage, or
isolated staging environment exists.
