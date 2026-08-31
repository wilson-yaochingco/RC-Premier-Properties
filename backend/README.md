# RC Premier Properties — Backend

Node.js + Express 5 + TypeScript (ESM) + Mongoose (MongoDB).

Part of an npm workspaces monorepo — install and run from the **repository root**, not
from this folder.

## Setup

```bash
npm install                  # at the repo root
cp .env.example .env         # then edit MONGODB_URI if needed
npm run dev:backend          # at the repo root → http://localhost:5000
```

Verify: `curl http://localhost:5000/api/v1/health`

## Scripts

Run with `npm run <script> --workspace backend`, or use the root shortcuts.

| Script      | Purpose                       |
| ----------- | ----------------------------- |
| `dev`       | Watch mode via `tsx`          |
| `build`     | Compile TypeScript to `dist/` |
| `start`     | Run the compiled build        |
| `lint`      | ESLint                        |
| `typecheck` | TypeScript, no emit           |

## Structure

Organized **feature-first**: a domain's routes, controller, service and model live
together in one folder, rather than scattered across four sibling directories.

```
src/
├── server.ts       Entry point: env, DB connect, listen, graceful shutdown
├── app.ts          Express app assembly (exported without listening)
├── routes.ts       Mounts each module under API_PREFIX
├── config/         env.ts (typed config), database.ts (mongoose lifecycle)
├── middleware/     notFound, errorHandler, rateLimit
├── lib/            Cross-domain helpers
└── modules/
    └── health/     health.routes.ts, health.controller.ts
```

## Adding a resource

1. Create `src/modules/<name>/` with `<name>.routes.ts`, `<name>.controller.ts`,
   `<name>.service.ts`, `<name>.model.ts`.
2. Register it in `src/routes.ts` with one line: `router.use("/<name>", <name>Routes)`.
3. Put any type the frontend also needs in `shared/src/api.ts` and import it from
   `@rc/shared` on both sides — never redeclare a response shape.

## Middleware order

`app.ts` applies, in this order: `trust proxy` (production only), helmet, CORS, body
parsers with a 1 MB limit, then the rate limiter and routes on `API_PREFIX`, then
`notFound` and `errorHandler`. The last two must stay last, and in that order.

The rate limiter allows 300 requests per 15 minutes and **skips the health endpoint**, so
uptime monitors can't be throttled into reporting a false outage.

## Notes

- ESM project (`"type": "module"`): relative imports must end in `.js`.
- Express 5 forwards rejected promises from async handlers to `errorHandler`
  automatically — no `express-async-handler` wrapper is needed.
- `createApp()` is exported without listening, so integration tests can import it.
- In development a failed MongoDB connection logs a warning and the server still starts;
  `/api/v1/health` reports `database.status: "disconnected"`. In production a failed
  connection exits with code 1.
