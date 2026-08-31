# RC Premier Properties — Backend

Node.js + Express 5 + TypeScript (ESM) + Mongoose.

> Architecture and API conventions live in [`/docs`](../docs/README.md), not here.
> See [architecture overview](../docs/architecture/overview.md) and
> [API conventions](../docs/api/conventions.md).

## Run it

This is an npm workspaces monorepo — install and run from the **repository root**.

```bash
npm install                  # at the repo root
cp .env.example .env         # then set MONGODB_URI
npm run dev:backend          # at the repo root → http://localhost:5000
```

Verify: `curl http://localhost:5000/api/v1/health`

Full setup instructions: [`docs/development/setup.md`](../docs/development/setup.md).

## Scripts

Run via `npm run <script> --workspace backend`, or use the root shortcuts.

| Script      | Purpose                       |
| ----------- | ----------------------------- |
| `dev`       | Watch mode via `tsx`          |
| `build`     | Compile TypeScript to `dist/` |
| `start`     | Run the compiled build        |
| `lint`      | ESLint                        |
| `typecheck` | TypeScript, no emit           |

## Layout

```text
src/
├── server.ts       Bootstrap: env, DB connect, listen, shutdown
├── app.ts          Express assembly — exported without listening
├── routes.ts       Mounts each module under API_PREFIX
├── config/         env.ts, database.ts
├── middleware/     errorHandler, notFound, rateLimit
├── lib/            Infrastructure owned by no single domain
└── modules/        One folder per business domain
    └── health/
```

Organized by domain: a feature's routes, controller, service and model live together
under `modules/<domain>/`. Create a module when its feature begins — not before.

## Gotchas

- ESM project: relative imports must end in `.js`. This is correct.
- `app.ts` must never call `listen()` — that is `server.ts`'s job.
- Import network types from `@rc/shared`; never redeclare a response shape here.
- In development a failed MongoDB connection logs a warning and the server still starts,
  reporting `database.status: "disconnected"`. In production it exits 1.
