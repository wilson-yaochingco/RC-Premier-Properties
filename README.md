# RC Premier Properties

[![CI](https://github.com/wilson-yaochingco/RC-Premier-Properties/actions/workflows/ci.yml/badge.svg)](https://github.com/wilson-yaochingco/RC-Premier-Properties/actions/workflows/ci.yml)

Full-stack real estate web application.

> **Status: foundation only.** No product features are implemented yet — no listings,
> search, filters, auth, messaging, favorites, bookings, admin, payments, or uploads.
> The only endpoint is a health check, and there are no database models.

## Stack

| Layer    | Technology                                                            |
| -------- | --------------------------------------------------------------------- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4        |
| Backend  | Node.js, Express 5, TypeScript (ESM), Mongoose 9                      |
| Database | MongoDB                                                               |
| Shared   | `@rc/shared` — API types both apps compile against                    |
| Tooling  | npm workspaces, ESLint (flat config), Prettier, `tsx`, GitHub Actions |

## Layout

```
RC-Premier-Properties/
├── shared/      @rc/shared — the API contract
├── frontend/    Next.js app  → http://localhost:3000
└── backend/     Express API  → http://localhost:5000/api/v1
```

One npm workspaces monorepo: a single `npm install` at the root covers all three
packages, and all day-to-day commands are root-level scripts.

## Getting started

**New to the project? Follow [SETUP.md](SETUP.md)** — a step-by-step VS Code guide
with prerequisites, MongoDB options, and troubleshooting.

The short version, for anyone already set up. Requires Node.js 20+ and a MongoDB
instance (local or Atlas).

```bash
npm install                        # once, at the root — builds @rc/shared too

cd backend  && cp .env.example .env       && cd ..
cd frontend && cp .env.example .env.local && cd ..

npm run dev:backend    # terminal 1 → http://localhost:5000
npm run dev:frontend   # terminal 2 → http://localhost:3000
```

Then open http://localhost:3000 — the page reports whether the backend is reachable.

Check the API directly:

```bash
curl http://localhost:5000/api/v1/health
```

```json
{
  "status": "ok",
  "service": "rc-premier-backend",
  "timestamp": "2026-08-31T02:27:48.959Z",
  "uptime": 20.73,
  "environment": "development",
  "database": { "status": "connected", "readyState": 1 }
}
```

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

Real `.env` / `.env.local` files are git-ignored. The committed `.env.example` files
are the templates — **never put real credentials in the repository.**

| App      | Variable              | Purpose                                  |
| -------- | --------------------- | ---------------------------------------- |
| frontend | `NEXT_PUBLIC_API_URL` | Base URL of the backend API              |
| backend  | `PORT`                | Port the API listens on (default `5000`) |
| backend  | `NODE_ENV`            | `development` / `test` / `production`    |
| backend  | `MONGODB_URI`         | MongoDB connection string (**required**) |
| backend  | `CORS_ORIGIN`         | Origin allowed to call the API           |

## Architecture

**The API contract lives in one place.** `shared/src/api.ts` defines every
request/response type plus `API_PREFIX`. Both apps import it, so renaming a field there
fails the build on whichever side wasn't updated — drift is caught by the compiler, not
in production.

**The backend is feature-first.** Each domain owns one folder under
`backend/src/modules/`, containing its routes, controller, service and model. Adding a
feature touches one directory and adds one line to `backend/src/routes.ts`.

**The frontend calls the backend directly** over HTTP at `NEXT_PUBLIC_API_URL` — it does
not proxy through Next.js API routes. All routes are served under `/api/v1`, CORS is
pinned to `CORS_ORIGIN` (never `*`), and responses carry helmet's security headers with
rate limiting applied to everything except the health check.

## MongoDB behaviour

In `development`, a failed MongoDB connection logs a warning and the HTTP server still
starts, so the API is workable before Mongo is installed; `/api/v1/health` then reports
`database.status: "disconnected"`. In any other environment a failed connection exits
with code 1.

## Documentation

- [`SETUP.md`](SETUP.md) — full VS Code setup guide for new team members
- [`frontend/README.md`](frontend/README.md)
- [`backend/README.md`](backend/README.md)

## Contributing

Run `npm run format:check`, `npm run lint` and `npm run typecheck` before pushing — CI
runs exactly these on every pull request. Real `.env` files stay local; only
`.env.example` is committed.
