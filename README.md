# RC Premier Properties

Full-stack real estate web application.

> **Status: foundation only.** No product features are implemented yet — no listings,
> search, filters, auth, messaging, favorites, bookings, admin, payments, or uploads.
> The only endpoint is a health check, and there are no database models.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Backend | Node.js, Express 5, TypeScript (ESM), Mongoose 9 |
| Database | MongoDB |
| Tooling | ESLint (flat config) on both apps, `tsx` for backend dev |

## Layout

```
RC-Premier/
├── frontend/    Next.js app  → http://localhost:3000
└── backend/     Express API  → http://localhost:5000
```

The two apps are installed and run independently; there is no root `package.json`
and no workspace tooling. A single git repository covers both.

## Getting started

**New to the project? Follow [SETUP.md](SETUP.md)** — a step-by-step VS Code guide
with prerequisites, MongoDB options, and troubleshooting.

The short version, for anyone already set up. Requires Node.js 20+ and a MongoDB
instance (local or Atlas).

```bash
# Backend
cd backend
npm install
cp .env.example .env          # edit MONGODB_URI if needed
npm run dev                   # http://localhost:5000

# Frontend (second terminal)
cd frontend
npm install
cp .env.example .env.local
npm run dev                   # http://localhost:3000
```

Then open http://localhost:3000 — the page reports whether the backend is reachable.

Check the API directly:

```bash
curl http://localhost:5000/api/health
```

```json
{
  "status": "ok",
  "service": "rc-premier-backend",
  "timestamp": "2026-08-31T01:52:53.458Z",
  "uptime": 17.51,
  "environment": "development",
  "database": { "status": "connected", "readyState": 1 }
}
```

## Environment variables

Real `.env` / `.env.local` files are git-ignored. The committed `.env.example` files
are the templates — **never put real credentials in the repository.**

| App | Variable | Purpose |
| --- | --- | --- |
| frontend | `NEXT_PUBLIC_API_URL` | Base URL of the backend API |
| backend | `PORT` | Port the API listens on (default `5000`) |
| backend | `NODE_ENV` | `development` / `test` / `production` |
| backend | `MONGODB_URI` | MongoDB connection string (**required**) |
| backend | `CORS_ORIGIN` | Origin allowed to call the API |

## How the apps communicate

The frontend calls the backend directly over HTTP at `NEXT_PUBLIC_API_URL`; it does
not proxy through Next.js API routes. All backend routes live under `/api`, and CORS
is restricted to `CORS_ORIGIN` — never `*`.

On the frontend, import `API_BASE_URL` / `apiUrl()` from `src/lib/env.ts` rather than
reading `process.env` directly.

## MongoDB behaviour

In `development`, a failed MongoDB connection logs a warning and the HTTP server still
starts, so the API is workable before Mongo is installed; `/api/health` then reports
`database.status: "disconnected"`. In any other environment a failed connection exits
with code 1.

## Documentation

- [`SETUP.md`](SETUP.md) — full VS Code setup guide for new team members
- [`frontend/README.md`](frontend/README.md)
- [`backend/README.md`](backend/README.md)

## Contributing

Run `npm run lint` and `npm run typecheck` in both apps before pushing. Real `.env`
files stay local — only `.env.example` is committed.
