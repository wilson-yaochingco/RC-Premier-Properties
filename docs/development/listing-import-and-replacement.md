# Listing Import and Replacement

Status: **six listings are imported as unpublished drafts into `rc_premier_prod`**
(`PREMIER_PROPERTY_3`, `_7`, `_8`, `_9`, `_10`, `_11`), referencing 66 Cloudinary photographs.
The live catalog still contains only the two legacy published records; no new listing has been
published. A fresh full export on 2026-11-08 verified all eight properties and three inquiries
against the backup, including the inquiry linked to `PREMIER_PROPERTY_21`.

Normal local development keeps `MONGODB_URI` on the `rc_premier` database; every operation on
production names it explicitly with `--database rc_premier_prod` (and, for writes,
`--expect-database rc_premier_prod`).

## What is prepared

Six source folders (`RC-Premier-Properties-Asstes/property-1` … `property-6`, kept untouched) are
described in `backend/src/scripts/rc-premier-listings.ts`. Specifications come only from each
caption. Every listing remains a **draft** until its publication review is complete.

| Source     | Draft                             | ID                  | City status                            | Price                    | Photos |
| ---------- | --------------------------------- | ------------------- | -------------------------------------- | ------------------------ | ------ |
| property-1 | Modern Asian Smart Home Bungalow  | PREMIER_PROPERTY_3  | Mabalacat City — owner-confirmed       | ₱20,500,000              | 17     |
| property-2 | Modern Filipino Smart Home        | PREMIER_PROPERTY_7  | City of San Fernando — owner-confirmed | ₱17,800,000              | 10     |
| property-3 | Furnished Korean-Inspired Home    | PREMIER_PROPERTY_8  | Porac — owner-confirmed                | ₱18,500,000 (negotiable) | 10     |
| property-4 | Furnished Brand-New Modern Home   | PREMIER_PROPERTY_9  | Angeles City — owner-confirmed         | ₱16,000,000              | 10     |
| property-5 | Brand New Modern Two-Storey House | PREMIER_PROPERTY_10 | Angeles City — owner-confirmed         | ₱10,800,000              | 9      |
| property-6 | Brand New Modern Family Home      | PREMIER_PROPERTY_11 | Angeles City — owner-confirmed         | ₱13,500,000              | 10     |

Two near-duplicate exteriors from property 1 (`636936110`, `639727623`) are not used. Source
folders keep every original.

Properties 2–6 carry a contact strip baked into the lower edge of each 1536×1920 photo. The
import crops an in-memory copy to 1536×1688, which removes the strip and its icon discs and keeps
every pixel of the photograph above them. Property 1 has no overlay and is uploaded unmodified.

## Current state

| Check       | Result                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database    | connection reports `rc_premier_prod`; every write is guarded by `--expect-database`                                                                                 |
| Collections | `properties`, `inquiries`, `staffidentities`, `authsessions`, `oidctransactions`, `securityauditevents`, `propertymediacleanuptasks`, each with its schema indexes  |
| Properties  | 2 legacy published (`PREMIER_PROPERTY_21`, `_60`) and 6 RC Premier drafts (`_3`, `_7`, `_8`, `_9`, `_10`, `_11`)                                                    |
| Images      | 66 references across the six draft collections; source originals remain untouched                                                                                   |
| Public API  | Live `/properties` has the two legacy records only. The local database-free preview exposes the six drafts for visual review; production drafts return 404 by slug. |
| Admin API   | routes return 401 without a staff session                                                                                                                           |
| Audit       | Imports are unattributed until an Auth0-backed staff identity is provisioned (see below).                                                                           |

## Commands

Run from the repository root. The workspace scripts run inside `backend/`, so they read
`backend/.env`. The `--target` is the environment of the runtime (`development` here).

```bash
# 1. read-only: inventory + full backup to backups/
npm run ops:export-properties --workspace backend -- --target development --database rc_premier_prod

# 2. one-time: create collections and build indexes (additive, never drops anything)
npm run ops:init-database --workspace backend -- --target development --expect-database rc_premier

# 3. dry run: validates listings and photos, writes nothing
npm run ops:import-rc-listings --workspace backend -- --target development --source "<path>/RC-Premier-Properties-Asstes" --database rc_premier_prod

# 4. apply: creates only missing drafts; an existing ID or slug is skipped, never updated
npm run ops:import-rc-listings --workspace backend -- --target development --source "<path>" --database rc_premier_prod --expect-database rc_premier_prod --apply --unattributed

# 5. retirement dry run: verifies the named legacy records, linked inquiry and replacement gate
npm run ops:retire-obsolete-listings --workspace backend -- --target development --database rc_premier_prod --backup backups/<fresh-export>.json
```

`--apply` refuses to run unless the connected database name equals `--expect-database`, and
requires exactly one of `--actor-staff-id` or `--unattributed`. Production also needs
`NODE_ENV=production`, `--target production` and `--confirm-production`.

## Retiring the two legacy records

`PREMIER_PROPERTY_21` and `PREMIER_PROPERTY_60` are not deleted. The prepared retirement command
archives only those two IDs and records an auditable lifecycle transition. An archived record can
be restored through the staff workflow as **unpublished**, so a restoration never accidentally
returns it to the public catalog. Inquiries are never touched; the command verifies that the
existing inquiry for property 21 is present before it can write and that its count is unchanged
afterwards.

The command defaults to a read-only plan. Its `--apply` mode requires all six replacement IDs to
already be `published`, a freshly verified backup containing the current legacy records and linked
inquiry, `--expect-database` exactly matching `--database`, and an audit actor (or the explicit
temporary `--unattributed` mode). It refuses to publish anything. Because all six replacements are
currently drafts, retirement is deliberately blocked:

```bash
npm run ops:retire-obsolete-listings --workspace backend -- --target development --database rc_premier_prod --expect-database rc_premier_prod --backup backups/<fresh-export>.json --apply --unattributed
```

**Audit actor.** No staff identity exists in the new database yet (creating one needs the admin's
Auth0 `subject`), so this import ran `--unattributed`: audit rows have no actor and carry a
`rc-listings-import-<uuid>` batch id as their request id. To enable the admin workflow, provision
the admin and then use `--actor-staff-id` for any later import:

```bash
npm run auth:provision-admin --workspace backend -- --issuer <AUTH0_ISSUER_URL> --subject <auth0 user id> --email <email> --name "<name>"
```

**Node DNS on Windows.** `mongodb+srv://` lookups can fail with `querySrv ECONNREFUSED` even when
the cluster is healthy: Node's resolver may default to `127.0.0.1` while the system resolver works
(`Resolve-DnsName -Type SRV _mongodb._tcp.<cluster host>` succeeds). Either point Windows DNS at a
working resolver, run Node with a `--require` file calling `require("dns").setServers([...])`, or use
Atlas's standard (non-SRV) connection string.

## Before publishing any listing

Confirm each item in the listing's `confirm` list (in `rc-premier-listings.ts`). The owner confirmed
all six cities on 2026-11-08 (properties 3, 7, 8, 9, 10 and 11); barangay and street address were
not supplied and are never shown publicly. Bedrooms and bathrooms for properties 3 and 8 were also
owner-confirmed and the source now carries them; production drafts still need the matching update.

- **Public contact email.** The business confirmed `rcpropertiesss@gmail.com` as the correct
  public address (it is what the source captions and photo overlays show), so
  `frontend/src/lib/public-contact.ts` now uses it. The inquiry-notification mailbox
  (`BUSINESS_NOTIFICATION_EMAIL`, default `rcpremierph@gmail.com`) and the Auth0 staff identity are
  separate settings and were **not** changed; confirm whether inquiries should now be delivered to
  the new address.
- **Property IDs** follow the source numbering ("Premier Property #3" → `PREMIER_PROPERTY_3`)
  and were verified in the eight-record production inventory on 2026-11-08.
- **Counts.** Review totals derived from caption room lists before publication. The current
  import source and local preview omit property 8's ambiguous bedroom total and property 11's
  unconfirmed bathroom total. Existing production drafts were not updated by this presentation
  change; staff must reconcile their specifications against the source before publishing.
- **Source claims the photos do not show:** Jeju Island stairwell bricks, the karaoke system and
  Korean-style foyer (property 3). They appear in the text as "according to the listing".

Source captions are kept verbatim in `sourceCaption` as the internal record.
