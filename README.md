# RC Premier Properties

[![CI](https://github.com/wilson-yaochingco/RC-Premier-Properties/actions/workflows/ci.yml/badge.svg)](https://github.com/wilson-yaochingco/RC-Premier-Properties/actions/workflows/ci.yml)

Full-stack real estate web application.

> **Status: foundation only.** No product features are implemented yet — no listings,
> search, filters, auth, messaging, favorites, bookings, admin, payments, or uploads.
> The only endpoint is a health check, and there are no database models.

## Stack

| Layer    | Technology                                                     |
| -------- | -------------------------------------------------------------- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Backend  | Node.js, Express 5, TypeScript (ESM), Mongoose 9               |
| Database | MongoDB                                                        |
| Shared   | `@rc/shared` — API types both apps compile against             |
| Tooling  | npm workspaces, ESLint, Prettier, `tsx`, GitHub Actions        |

## Structure

```text
RC-Premier-Properties/
├── docs/         All persistent project documentation
├── shared/       @rc/shared — types and constants that cross the network
├── backend/      Express API      → http://localhost:5000/api/v1
├── frontend/     Next.js web app  → http://localhost:3000
├── AGENTS.md     Working conventions for contributors and AI agents
└── package.json  npm workspaces root — run all commands from here
```

`frontend/` and `backend/` are **independent applications** with their own
dependencies, builds and deployment targets. npm workspaces only unifies installation
and lets both depend on `shared/`.

The backend is organized by business domain under `backend/src/modules/`; the frontend
keeps domain code under `frontend/src/features/`. Feature code stays with its feature
rather than accumulating in global directories.

## Getting started

Requires Node.js 20+ and a MongoDB instance (local or Atlas).

```bash
npm install                        # once, at the root — also builds @rc/shared

cd backend  && cp .env.example .env       && cd ..
cd frontend && cp .env.example .env.local && cd ..

npm run dev:backend    # terminal 1 → http://localhost:5000
npm run dev:frontend   # terminal 2 → http://localhost:3000
```

Open http://localhost:3000 — the page reports whether the backend is reachable. Or check
the API directly:

```bash
curl http://localhost:5000/api/v1/health
```

**New to the project?** [`docs/development/setup.md`](docs/development/setup.md) is a
step-by-step VS Code guide with prerequisites, MongoDB options and troubleshooting.

## Commands

All run from the repository root.

| Command                | What it does                           |
| ---------------------- | -------------------------------------- |
| `npm run dev:backend`  | API in watch mode                      |
| `npm run dev:frontend` | Web app in watch mode                  |
| `npm run dev:shared`   | Rebuild the shared contract on save    |
| `npm run lint`         | ESLint across backend + frontend       |
| `npm run typecheck`    | TypeScript across all three workspaces |
| `npm run build`        | Build shared → backend → frontend      |
| `npm run format`       | Apply Prettier                         |
| `npm run format:check` | Verify formatting (what CI runs)       |

## Environment variables

Real `.env` / `.env.local` files are git-ignored. The committed `.env.example` files are
the templates — **never put real credentials in the repository.**

| App      | Variable              | Purpose                                  |
| -------- | --------------------- | ---------------------------------------- |
| frontend | `NEXT_PUBLIC_API_URL` | Base URL of the backend API              |
| backend  | `PORT`                | Port the API listens on (default `5000`) |
| backend  | `NODE_ENV`            | `development` / `test` / `production`    |
| backend  | `MONGODB_URI`         | MongoDB connection string (**required**) |
| backend  | `CORS_ORIGIN`         | Origin allowed to call the API           |

## Documentation

**[`/docs`](docs/README.md) is the single source of truth** for project documentation.

| Where                                      | What                                       |
| ------------------------------------------ | ------------------------------------------ |
| [`docs/architecture/`](docs/architecture/) | System design and the decisions behind it  |
| [`docs/api/`](docs/api/)                   | Endpoint, error and versioning conventions |
| [`docs/database/`](docs/database/)         | Data models and schema decisions           |
| [`docs/development/`](docs/development/)   | Setup, workflow, deployment                |
| [`docs/features/`](docs/features/)         | Feature specifications                     |

Contributors and AI agents should read [`AGENTS.md`](AGENTS.md) before writing code.

## Contributing

Run `npm run format:check`, `npm run lint` and `npm run typecheck` before pushing — CI
runs exactly these on every pull request. Real `.env` files stay local; only
`.env.example` is committed.
