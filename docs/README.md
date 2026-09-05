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
| [`features/`](features/)         | One spec per feature: purpose, rules, behaviour, responsibilities   |
| [`api/`](api/)                   | Endpoint conventions, request/response formats, versioning          |
| [`database/`](database/)         | Data models, relationships, indexes, schema and migration decisions |
| [`development/`](development/)   | Setup, environment variables, workflow, deployment                  |

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
  — accepted Phase 3A staff identity, session and permission architecture; implementation
  gates remain open
- [`oidc-provider-selection.md`](architecture/oidc-provider-selection.md) — Auth0 Free
  selection, provider comparison, configuration baseline and provisioning gates
- [`brand-and-public-experience.md`](architecture/brand-and-public-experience.md) —
  visual system, information architecture and public-experience rules
- [`geographic-data-and-maps.md`](architecture/geographic-data-and-maps.md) — Leaflet
  loading, tile/boundary attribution, map filtering and listing-location privacy

### `features/`

One document per feature, written when that feature is being designed or implemented —
not before. A feature spec should cover purpose, requirements, user-facing behaviour,
business rules, important edge cases, and the split of responsibility between frontend
and backend.

Current:

- [`properties.md`](features/properties.md) — published catalogue, filters and property
  detail behaviour
- [`inquiries.md`](features/inquiries.md) — contact, seller and viewing-request behaviour

Authentication, staff administration and confirmed appointments are not implemented,
so they do not yet have feature specifications.

### `api/`

Endpoint conventions, authentication requirements, request/response formats, error
conventions, and versioning decisions.

Document endpoints that exist. Do not write reference documentation for endpoints that
have not been built.

Current:

- [`conventions.md`](api/conventions.md) — cross-endpoint rules
- [`public-api.md`](api/public-api.md) — implemented public endpoints and parameters

### `database/`

Data models, relationships between collections, indexing decisions, schema decisions,
and notes on migrations or data changes.

Current: [`property-and-inquiry-models.md`](database/property-and-inquiry-models.md).
Property and inquiry schemas exist. Their production persistence path still needs a real
MongoDB verification run; there is no production inventory or seed data.

### `development/`

How to work on the project: local setup, environment variables, git workflow, testing
conventions, deployment instructions, coding conventions.

Current:

- [`setup.md`](development/setup.md) — the full VS Code onboarding guide
- [`git-workflow.md`](development/git-workflow.md) — branching, commits and pull requests
- [`testing.md`](development/testing.md) — automated and manual verification boundaries
- [`media-replacement.md`](development/media-replacement.md) — logo, image, video and
  agent-placeholder replacement guide plus map/contact launch dependencies

---

## Rules

1. **Check `/docs` before changing behaviour.** Existing architectural decisions are
   binding until deliberately revisited.
2. **Update documentation when behaviour or architecture materially changes** — in the
   same change, not later.
3. **Document decisions, contracts and behaviour** — not things the code already makes
   obvious. If a paragraph only restates a function, delete it.
4. **Do not create a document to fill a directory.** An empty directory with a clear
   purpose is better than a page of speculation.
