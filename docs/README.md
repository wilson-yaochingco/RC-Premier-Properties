# RC Premier Properties — Documentation

**This directory is the single source of truth for persistent project documentation.**

If a document is worth keeping, it belongs here — not scattered as loose `.md` files
under `frontend/`, `backend/`, `src/`, `components/` or `modules/`. The only files that
legitimately live beside code are per-app READMEs (a short quickstart) and
`frontend/AGENTS.md` / `frontend/CLAUDE.md`, which Next.js generates and rewrites
automatically.

Working conventions for AI agents and new contributors are in the root
[`AGENTS.md`](../AGENTS.md).

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

Current: [`overview.md`](architecture/overview.md).

### `features/`

One document per feature, written when that feature is being designed or implemented —
not before. A feature spec should cover purpose, requirements, user-facing behaviour,
business rules, important edge cases, and the split of responsibility between frontend
and backend.

Expected eventually: `properties.md`, `inquiries.md`, `authentication.md`,
`appointments.md`.

**Currently empty on purpose.** No features exist yet.

### `api/`

Endpoint conventions, authentication requirements, request/response formats, error
conventions, and versioning decisions.

Document endpoints that exist. Do not write reference documentation for endpoints that
have not been built.

Current: [`conventions.md`](api/conventions.md).

### `database/`

Data models, relationships between collections, indexing decisions, schema decisions,
and notes on migrations or data changes.

**Currently empty on purpose.** There are no Mongoose models yet — only a connection.
Do not invent schemas for features that do not exist.

### `development/`

How to work on the project: local setup, environment variables, git workflow, testing
conventions, deployment instructions, coding conventions.

Current: [`setup.md`](development/setup.md) — the full VS Code onboarding guide.

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
