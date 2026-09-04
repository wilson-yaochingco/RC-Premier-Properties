# RC Premier Properties

[![CI](https://github.com/wilson-yaochingco/RC-Premier-Properties/actions/workflows/ci.yml/badge.svg)](https://github.com/wilson-yaochingco/RC-Premier-Properties/actions/workflows/ci.yml)

Full-stack real estate web application for Angeles City and the wider Pampanga market.

> **Status: public MVP vertical slice implemented.** The site includes a responsive
> public experience, published-property search and detail pages, and connected inquiry,
> seller and viewing-request forms. Property and inquiry persistence are implemented with
> Mongoose, but persistence has not yet been verified against a real project MongoDB
> instance and no production inventory or seed data is supplied.

Authentication, staff/admin tools, public inquiry reads, confirmed appointment booking,
uploads, favorites, payments and notifications are not implemented. The current viewing
flow records a request only. The approved logo, real media and public business contact
details still need to be supplied.

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

Requires Node.js 20.19.0 or newer (Node.js 22 LTS recommended) and a MongoDB
instance (local or Atlas).

```bash
npm install                        # once, at the root — also builds @rc/shared

cd backend  && cp .env.example .env       && cd ..
cd frontend && cp .env.example .env.local && cd ..

npm run dev:backend    # terminal 1 → http://localhost:5000
npm run dev:frontend   # terminal 2 → http://localhost:3000
```

Open http://localhost:3000 to use the public site. Check the API directly with:

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
| `npm test`             | Vitest unit and API integration tests  |
| `npm run test:e2e`     | Playwright browser acceptance tests    |
| `npm run build`        | Build shared → backend → frontend      |
| `npm run format`       | Apply Prettier                         |
| `npm run format:check` | Verify formatting (what CI runs)       |

## Environment variables

Real `.env` / `.env.local` files are git-ignored. The committed `.env.example` files are
the templates — **never put real credentials in the repository.**

| App      | Variable               | Purpose                                  |
| -------- | ---------------------- | ---------------------------------------- |
| frontend | `NEXT_PUBLIC_API_URL`  | Base URL of the backend API              |
| frontend | `NEXT_PUBLIC_SITE_URL` | Public frontend origin for metadata      |
| backend  | `PORT`                 | Port the API listens on (default `5000`) |
| backend  | `NODE_ENV`             | `development` / `test` / `production`    |
| backend  | `MONGODB_URI`          | MongoDB connection string (**required**) |
| backend  | `CORS_ORIGIN`          | Origin allowed to call the API           |

## Documentation

**[`/docs`](docs/README.md) is the single source of truth** for project documentation.

| Where                                      | What                                        |
| ------------------------------------------ | ------------------------------------------- |
| [`docs/ROADMAP.md`](docs/ROADMAP.md)       | Phases, MVP boundary, what not to build yet |
| [`docs/architecture/`](docs/architecture/) | System design and the decisions behind it   |
| [`docs/api/`](docs/api/)                   | Endpoint, error and versioning conventions  |
| [`docs/database/`](docs/database/)         | Data models and schema decisions            |
| [`docs/development/`](docs/development/)   | Setup, workflow, deployment                 |
| [`docs/features/`](docs/features/)         | Feature specifications                      |

Useful implementation references include the
[public API reference](docs/api/public-api.md), the
[property feature contract](docs/features/properties.md), the
[inquiry feature contract](docs/features/inquiries.md), and the
[media replacement guide](docs/development/media-replacement.md).

Contributors and AI agents should read [`AGENTS.md`](AGENTS.md) before writing code.

## Contributing

Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` and
`npm run build` before pushing. CI runs the same completion gate on every pull request.
Real `.env` files stay local; only `.env.example` is committed.
