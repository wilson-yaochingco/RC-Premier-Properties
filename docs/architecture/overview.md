# Architecture Overview

This records decisions that are **already in force** and verifiable in the code. It is
not a plan for future work.

Status: the foundation and public MVP vertical slice are implemented. The API exposes
health, published-property reads and inquiry creation; Mongoose models exist for
properties and inquiries. Authentication, administration and confirmed appointments
remain outside the implemented system.

---

## Repository shape

Three packages in one repository, tied together by npm workspaces:

```text
shared/     @rc/shared — types and constants that cross the network
backend/    Express API
frontend/   Next.js web app
```

`frontend` and `backend` remain **independent applications**: separate `package.json`
files, separate build outputs, separate deployment targets. Workspaces only unify
installation (one `npm install`, one lockfile) and let both depend on `shared`.

### Why there is a workspace root

The original sketch of this repo had two independent apps and no root `package.json`.
That was changed deliberately. Without a shared package, every API response shape had to
be written twice — once where the backend built it, once where the frontend consumed it
— with nothing keeping the copies in agreement. The health response had already drifted
into an anonymous object literal on one side and a hand-written inline type on the
other.

The cost is one extra root `package.json` and a build step for `shared`. The benefit is
in the next section.

---

## The API contract is compiler-enforced

`shared/src/api.ts` is the single definition of anything that crosses the network:
response shapes, the error envelope, and `API_VERSION` / `API_PREFIX`.

Both apps import from `@rc/shared` rather than declaring their own copies. Renaming a
field there fails the build on whichever side was not updated. The contract now includes
health, property taxonomy and public listing shapes, search/facet responses, inquiry
requests and acknowledgements, and the common error envelope.

**Rule:** if it travels over the network, it goes in `shared/src/api.ts`. Types only one
app cares about stay local — `frontend/src/types/` or the relevant backend module.

`shared` compiles to `shared/dist/` with declarations. Consumers import compiled JS plus
`.d.ts`, which is what lets `backend`'s `tsc` build and `node dist/server.js` work.
Consuming raw TypeScript source would break `rootDir`/`outDir`, which is why
`transpilePackages` is not used in `next.config.ts`.

---

## Backend: organized by domain

```text
backend/src/
├── server.ts       Bootstrap: env, DB connect, listen, graceful shutdown
├── app.ts          Express assembly — exported without listening
├── routes.ts       Mounts each module under API_PREFIX
├── config/         env.ts (validated config), database.ts (mongoose lifecycle)
├── middleware/     Cross-cutting: errorHandler, notFound, rateLimit
├── lib/            Backend infrastructure owned by no single domain
└── modules/        One folder per business domain
    ├── health/
    ├── properties/
    └── inquiries/
```

Each domain owns its routes, controller, service, model, validation and types in one
folder. The alternative — global `controllers/`, `services/`, `models/`, `routes/`
directories — was used initially and abandoned: with ten domains it scatters four files
across four directories per feature and funnels every change through one shared
`routes/index.ts`.

**`app.ts` never listens.** It builds and returns a configured Express app; `server.ts`
starts it. This keeps startup concerns out of app configuration and lets Supertest use
dependency-injected property and inquiry services without opening a network port.

**Middleware order matters** and is fixed in `app.ts`: `trust proxy` (production only) →
helmet → CORS → body parsers (1 MB limit) → rate limiter and routes on `API_PREFIX` →
`notFound` → `errorHandler`. The last two must stay last, in that order.

---

## Frontend: shared vs. feature code

```text
frontend/src/
├── app/          Routes, layouts, loading and error boundaries (App Router)
├── components/
│   ├── ui/       Generic primitives — Button, Input, Modal
│   └── layout/   Structural — Header, Footer, Navbar, containers
├── features/     Domain code, one folder per feature
├── hooks/        Globally reusable hooks only
├── lib/          Shared utilities and configuration helpers
├── services/     API infrastructure spanning multiple features
└── types/        Genuinely global types
```

The same principle as the backend: feature-specific components, hooks, services and
types live inside `features/<name>/`, not in the global directories. `components/`,
`hooks/`, `services/` and `types/` are for things genuinely shared across features, and
exist to stay small.

`app/` holds routing concerns. Reusable logic does not move into `app/` merely because a
page uses it.

The implemented routes are `/`, `/properties`, `/properties/[slug]`, `/about`,
`/contact`, `/sell` and `/book-viewing`, plus loading, error and not-found boundaries,
`robots.txt` and `sitemap.xml`. Property and inquiry code lives under matching feature
folders. A small shared API client normalizes non-2xx, network and malformed-response
failures into the shared error contract.

Global and route metadata use `NEXT_PUBLIC_SITE_URL` as their public origin. Static
routes appear in `sitemap.xml`; `robots.txt` allows the public site and reserves `/admin`
and `/api`. Property detail pages derive canonical/Open Graph metadata and JSON-LD from
the published record. Dynamic listing URLs are not fabricated into the static sitemap
while no production inventory source is available.

---

## Configuration and environment

`backend/src/config/env.ts` reads the environment once at startup, applies defaults,
throws a clear error if `MONGODB_URI` is missing, and exports a frozen typed object. No
other backend module reads `process.env`.

On the frontend, `src/lib/env.ts` is the only reader of `NEXT_PUBLIC_API_URL` and
`NEXT_PUBLIC_SITE_URL`. It exports the normalized API and public-site origins. Only
`NEXT_PUBLIC_`-prefixed variables reach the browser, so no secret may ever use that
prefix.

Real `.env` / `.env.local` files are git-ignored; the committed `.env.example` files are
the templates.

---

## MongoDB connection behaviour

`config/database.ts` connects with a 5-second server-selection timeout and exposes
`getDatabaseStatus()`, derived from `mongoose.connection.readyState`.

Connection failure is handled differently by environment, deliberately:

- **development** — log a warning and start the HTTP server anyway, so the API is
  workable before MongoDB is installed. `/api/v1/health` honestly reports
  `database.status: "disconnected"`.
- **test and production** — exit with code 1. A production process should not serve
  traffic it cannot fulfil, and tests should not silently use an unavailable database.

`server.ts` handles `SIGINT`/`SIGTERM` by closing the HTTP server and the mongoose
connection before exiting.

The schemas, query builders and service wiring are implemented, but real MongoDB
persistence has not yet been verified with project credentials. Automated API tests
inject services and therefore prove routing, normalization, validation and disclosure
behaviour without claiming that external persistence works. No seed records are shipped.

---

## Public data and workflow boundaries

Every public property query adds `publicationStatus: "published"` within the service;
clients cannot request drafts. Public projections omit exact addresses, coordinates,
owner references and internal notes. Property reads are available as list, facet and
slug-detail endpoints. There are no public property write endpoints.

Inquiry creation accepts contact, property, seller and viewing-request submissions. It
returns an opaque acknowledgement without echoing personal data. There is deliberately
no public inquiry read endpoint. A viewing submission is a request for staff follow-up,
not a booking or confirmed appointment.

No authentication or authorization layer exists yet. Consequently, staff/admin routes,
property management and inquiry retrieval have not been exposed. The approved company
logo, production media, public contact details and actual listings have also not been
supplied; the public UI represents those gaps explicitly instead of inventing data.

---

## Language and module conventions

The backend is **ESM** (`"type": "module"`) with `module: NodeNext`. Relative imports
must carry a `.js` extension even in TypeScript source:

```ts
import { env } from "./config/env.js";
```

This is correct and required — not a mistake to clean up.

Express 5 forwards rejected promises from async handlers to the error middleware
automatically, so no `express-async-handler` wrapper is needed.

---

## Tooling

ESLint flat config per app; Prettier and line-ending normalization at the root; Vitest
for unit/API integration tests; Supertest for in-process Express requests; and Playwright
for browser acceptance. CI runs `format:check`, `lint`, `typecheck`, `test` and `build` on
pushes to `main` and pull requests. Browser acceptance remains a separate command until a
stable CI browser strategy is adopted.
