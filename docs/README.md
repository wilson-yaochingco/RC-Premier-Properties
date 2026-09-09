# RC Premier Properties — Documentation

**This directory is the single source of truth for persistent project documentation.**

If a document is worth keeping, it belongs here — not scattered as loose `.md` files
under `frontend/`, `backend/`, `src/`, `components/` or `modules/`. The only files that
legitimately live beside code are per-app READMEs (a short quickstart) and
`frontend/AGENTS.md` / `frontend/CLAUDE.md`, which Next.js generates and rewrites
automatically.

Working conventions for AI agents and new contributors are in the root
[`AGENTS.md`](../AGENTS.md).

## Start here

[`ROADMAP.md`](ROADMAP.md) is the master implementation map: what the product is
becoming, which phase it is in, what to build next, and what must **not** be built yet.
Read it before starting any feature. A roadmap entry means _planned_ — not _implement
now_.

## Where things go

| Directory                        | Put this here                                                       |
| -------------------------------- | ------------------------------------------------------------------- |
| [`architecture/`](architecture/) | Long-lived architecture and the decisions behind it                 |
| [`features/`](features/)         | One spec per feature: purpose, rules, behavior, responsibilities    |
| [`api/`](api/)                   | Endpoint conventions, request/response formats, versioning          |
| [`database/`](database/)         | Data models, relationships, indexes, schema and migration decisions |
| [`development/`](development/)   | Setup, environment variables, workflow, deployment                  |
| [`audits/`](audits/)             | Forensic readiness reports, findings, gates and remediation plans   |

---

### `architecture/`

System, frontend, backend, authentication and deployment architecture, plus the
reasoning behind significant structural decisions.

- **Belongs here:** why the backend is organized by domain module; why the API contract
  lives in `shared/`; how authentication will be structured when it is built.
- **Does not belong here:** temporary implementation notes, TODOs, or a description of
  what a single function does.

Current:

- [`overview.md`](architecture/overview.md) — package, backend, frontend and runtime
  architecture
- [`authentication-and-authorization.md`](architecture/authentication-and-authorization.md)
  — implemented Phase 3A backend identity, session and permission architecture; live
  provider and production gates remain open
- [`oidc-provider-selection.md`](architecture/oidc-provider-selection.md) — Auth0 Free
  selection, provider comparison, configuration baseline and provisioning gates
- [`brand-and-public-experience.md`](architecture/brand-and-public-experience.md) —
  visual system, information architecture and public-experience rules
- [`geographic-data-and-maps.md`](architecture/geographic-data-and-maps.md) — Leaflet
  loading, tile/boundary attribution, map filtering and listing-location privacy
- [`property-media.md`](architecture/property-media.md) — ordered image metadata,
  development-sample policy, rendering boundary and production-storage blocker
- [`deployment-topology.md`](architecture/deployment-topology.md) — Level 11 public edge,
  same-site session, proxy, provider, CSP, and deployment trust boundaries

- [`operational-resilience.md`](architecture/operational-resilience.md) — Level 12 health,
  structured logging, notification retry, media cleanup-debt, integrity, and scheduler
  boundaries

### `features/`

One document per feature, written when that feature is being designed or implemented —
not before. A feature spec should cover purpose, requirements, user-facing behavior,
business rules, important edge cases, and the split of responsibility between frontend
and backend.

Current:

- [`properties.md`](features/properties.md) — published catalog, filters and property
  detail behavior
- [`property-administration.md`](features/property-administration.md) — protected admin
  shell, property lifecycle, draft content and image-reference workflow
- [`inquiries.md`](features/inquiries.md) — contact, seller and viewing-request behavior
- [`production-content-and-media.md`](features/production-content-and-media.md) — approved
  Level 7 business content, supplied design media, device uploads and provider gates
- [`seo-and-social-discovery.md`](features/seo-and-social-discovery.md) — metadata,
  canonicals, location indexing, social previews, structured data, robots and sitemap
  policy
- [`accessibility-responsive-browser-qa.md`](features/accessibility-responsive-browser-qa.md)
  — practical accessibility target, interaction rules, responsive matrix, browser
  coverage and manual acceptance boundaries

- [`performance-and-delivery.md`](features/performance-and-delivery.md) - Level 10
  baseline, Core Web Vitals readiness, image/gallery/video/map delivery, API and query
  efficiency, caching policy, budgets, and field-validation boundaries

The backend authentication foundation is documented as an architectural boundary. The
first property-administration slice now has a feature specification. Structured viewing
requests and their lightweight staff lifecycle are implemented without a live calendar;
broader CRM administration remains unimplemented.

### `api/`

Endpoint conventions, authentication requirements, request/response formats, error
conventions, and versioning decisions.

Document endpoints that exist. Do not write reference documentation for endpoints that
have not been built.

Current:

- [`conventions.md`](api/conventions.md) — cross-endpoint rules
- [`public-api.md`](api/public-api.md) — implemented public endpoints and parameters
- [`inquiry-administration-api.md`](api/inquiry-administration-api.md) — protected staff
  queue, workflow, spam and archive operations
- [`authentication-api.md`](api/authentication-api.md) — staff login, current-session and
  logout contract
- [`property-administration-api.md`](api/property-administration-api.md) — protected
  private reads and draft create/edit contracts

### `database/`

Data models, relationships between collections, indexing decisions, schema decisions,
and notes on migrations or data changes.

Current:

- [`property-and-inquiry-models.md`](database/property-and-inquiry-models.md) — public MVP
  records and visibility rules
- [`authentication-models.md`](database/authentication-models.md) — staff identities,
  sessions, OIDC transactions and security audit events

Property and inquiry schemas exist and their Atlas persistence path has been verified.
The authentication collections have automated schema coverage, and an Auth0 development
passkey redirect has been reported. The backend session, protected admin operations and
logout still require the live acceptance pass. There is no production inventory or seed
data.

### `development/`

How to work on the project: local setup, environment variables, git workflow, testing
conventions, deployment instructions, coding conventions.

Current:

- [`setup.md`](development/setup.md) — the full VS Code onboarding guide
- [`git-workflow.md`](development/git-workflow.md) — branching, commits and pull requests
- [`testing.md`](development/testing.md) — automated and manual verification boundaries
- [`auth0-setup.md`](development/auth0-setup.md) — development tenant, secrets,
  administrator bootstrap and live-login acceptance
- [`authentication-operations.md`](development/authentication-operations.md) —
  production configuration gate, staff disable/revocation and recovery procedure
- [`media-replacement.md`](development/media-replacement.md) — logo, image, video and
  agent-placeholder replacement guide plus map/contact launch dependencies
- [`deployment-and-release.md`](development/deployment-and-release.md) — Level 11 audit,
  environment matrix, build/start behavior, staging acceptance, production checklist,
  rollback, external blockers, and Level 12 handoff

---

- [`operations.md`](development/operations.md) — Level 12 ownership, monitoring, alerts,
  incident/provider runbooks, retention, commands, and live blockers
- [`disaster-recovery.md`](development/disaster-recovery.md) — database/media backup,
  isolated restore, validation, provider recovery, and rehearsal procedure

### `audits/`

Point-in-time, evidence-backed audits. These reports record observed repository state,
quality-gate results, confirmed defects, external acceptance gates, and recommended
remediation without silently changing the audited application.

Current:

- [`level-13-production-readiness.md`](audits/level-13-production-readiness.md) — complete
  forensic production-readiness audit, launch score, live acceptance matrix, and unexecuted
  Level 14 remediation plan

## Rules

1. **Check `/docs` before changing behavior.** Existing architectural decisions are
   binding until deliberately revisited.
2. **Update documentation when behavior or architecture materially changes** — in the
   same change, not later.
3. **Document decisions, contracts and behavior** — not things the code already makes
   obvious. If a paragraph only restates a function, delete it.
4. **Do not create a document to fill a directory.** An empty directory with a clear
   purpose is better than a page of speculation.
