# RC Premier Properties — Working Conventions

Instructions for AI coding agents and new contributors. Read this before writing code.

---

## Scope: this is a foundation, not a product

The repository currently contains **no product features**. One endpoint exists
(`GET /api/v1/health`) and there are **no database models**.

Do not implement any of the following unless explicitly asked for that specific feature:
property listings, cards, detail pages, search, filtering, authentication, user or agent
accounts, agent profiles, inquiries, contact forms, appointments, favorites, an admin
dashboard, image uploads, payments, notifications, seed data, or AI features.

Do not create database schemas for features that do not exist. Do not fabricate
functionality to demonstrate architecture.

Build only what was asked. Prefer the smallest change that does the job.

---

## Check the roadmap before building

[`docs/ROADMAP.md`](docs/ROADMAP.md) states which phase the project is in, what belongs
in the current phase, and what is deliberately deferred.

**A roadmap entry means "this is planned." It does not mean "implement this now."** Do
not build a later phase early because it is documented there. Confirm the dependencies of
an item are actually finished before starting it, and work only on the phase or feature
currently requested.

A phase with unchecked Definition of Done items is not finished, however much of it
appears to work.

---

## Where code belongs

| What you're writing                              | Where it goes                                    |
| ------------------------------------------------ | ------------------------------------------------ |
| A type or constant sent over the network         | `shared/src/api.ts`                              |
| A page, layout, route, loading or error boundary | `frontend/src/app/`                              |
| A generic UI primitive (Button, Modal, Input)    | `frontend/src/components/ui/`                    |
| Header, Footer, Navbar, page container           | `frontend/src/components/layout/`                |
| Anything specific to one frontend domain         | `frontend/src/features/<feature>/`               |
| A hook used across many features                 | `frontend/src/hooks/`                            |
| Shared frontend utilities and config helpers     | `frontend/src/lib/`                              |
| API infrastructure spanning multiple features    | `frontend/src/services/`                         |
| A backend business domain                        | `backend/src/modules/<domain>/`                  |
| Express middleware used by multiple modules      | `backend/src/middleware/`                        |
| Environment or database configuration            | `backend/src/config/`                            |
| Backend infrastructure owned by no domain        | `backend/src/lib/`                               |
| Persistent documentation                         | `docs/` — see [`docs/README.md`](docs/README.md) |

**Feature code stays with its feature.** A component, hook, service or type used by one
feature belongs in `features/<name>/` (frontend) or `modules/<name>/` (backend) — not in
the global directories. Those globals exist to stay small; they are not dumping grounds.

Create a feature or module folder only when that feature actually begins development,
and only with the files it genuinely needs. Not every module needs a service, and not
every feature needs a hooks folder.

A backend module may contain:

```text
modules/properties/
├── property.model.ts
├── property.controller.ts
├── property.service.ts
├── property.routes.ts
├── property.validation.ts
└── property.types.ts
```

Register its router with one line in `backend/src/routes.ts`.

---

## Documentation

**Persistent project documentation belongs in `/docs`.** It is the single source of
truth.

When implementing or significantly changing a feature:

1. Check `/docs` for relevant existing documentation first.
2. Follow the architectural decisions already recorded there.
3. Update documentation when behaviour or architecture materially changes — in the same
   change, not later.
4. Feature documentation → `docs/features/`
5. Architectural decisions → `docs/architecture/`
6. API documentation → `docs/api/`
7. Database documentation → `docs/database/`
8. Developer and workflow documentation → `docs/development/`

Do not scatter `.md` files through `frontend/`, `backend/`, `src/`, `components/` or
`modules/` unless the file has a legitimate reason to sit beside the code. The current
legitimate exceptions are the per-app READMEs (short quickstarts) and
`frontend/AGENTS.md` / `frontend/CLAUDE.md`.

Do not document trivial implementation details. Document decisions, contracts, behaviour
and architecture — not what the code already makes obvious.

---

## Conventions that will bite you

- **The backend is ESM.** Relative imports must end in `.js`, even in TypeScript:
  `import { env } from "./config/env.js"`. This is correct — do not "fix" it.
- **Never redeclare an API shape.** Import it from `@rc/shared`. Two copies of one type
  is the exact problem `shared/` exists to prevent.
- **Never hardcode `/api/v1`.** Build URLs from `API_PREFIX` in `@rc/shared`.
- **Never read `process.env` directly.** Backend: `config/env.ts`. Frontend:
  `lib/env.ts`. Only `NEXT_PUBLIC_`-prefixed variables reach the browser, so no secret
  may ever carry that prefix.
- **`app.ts` must not start the server.** It builds and returns the Express app;
  `server.ts` listens. Keep that split.
- **Error middleware stays last**, after `notFound`, and keeps all four parameters —
  Express identifies error handlers by arity.
- **Throw `HttpError`, don't hand-build error responses.** Express 5 forwards rejected
  promises from async handlers automatically; no wrapper needed.
- **`frontend/AGENTS.md` and `frontend/CLAUDE.md` are generated by `next dev`.** Leave
  them alone — deleting them just recreates them as uncommitted noise.
- Real `.env` files are git-ignored and must never be committed. Only `.env.example`
  is tracked.

---

## Commands

Run everything from the **repository root** — it is an npm workspaces monorepo. Running
`npm install` inside `frontend/` or `backend/` creates a stray lockfile and breaks the
workspace links.

```bash
npm install              # once — also builds shared/
npm run dev:backend      # http://localhost:5000
npm run dev:frontend     # http://localhost:3000
npm run dev:shared       # rebuild the contract on save, while editing shared/src
```

Before claiming work is complete, run and confirm:

```bash
npm run format:check && npm run lint && npm run typecheck && npm run build
```

Two things worth knowing about verification:

- `shared/` must be built before the other packages typecheck. `npm install` and the
  `dev:*` scripts do this for you; `npm run build --workspace shared` does it manually.
- The frontend `typecheck` script runs `next typegen` first, because `LayoutProps` and
  friends are types Next.js **generates** into `.next/types/`. A check that passes
  against a warm `.next/` proves less than it appears — if in doubt, delete
  `frontend/.next` and run it again.

---

## Further reading

- [`docs/ROADMAP.md`](docs/ROADMAP.md) — phases, MVP boundary, deferred decisions
- [`docs/README.md`](docs/README.md) — documentation conventions
- [`docs/architecture/overview.md`](docs/architecture/overview.md) — why the repo is shaped this way
- [`docs/api/conventions.md`](docs/api/conventions.md) — endpoint, error and versioning rules
- [`docs/development/setup.md`](docs/development/setup.md) — local setup from scratch
