# RC Premier Properties — Backend

Node.js + Express 5 + TypeScript (ESM) + Mongoose.

The API exposes the public MVP plus the Phase 3A backend staff authentication foundation.
It has no property-management or inquiry-management endpoint, no public property writes
and no public inquiry reads.

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
Auth0 development-tenant setup and administrator provisioning:
[`docs/development/auth0-setup.md`](../docs/development/auth0-setup.md).

## Scripts

Run via `npm run <script> --workspace backend`, or use the root shortcuts.

| Script                 | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| `dev`                  | Watch mode via `tsx`                             |
| `build`                | Compile TypeScript to `dist/`                    |
| `start`                | Run the compiled build                           |
| `lint`                 | ESLint                                           |
| `typecheck`            | TypeScript, no emit                              |
| `auth:provision-admin` | Controlled local administrator create/reactivate |

The root `npm test` command runs backend unit and Supertest integration coverage with
injected services; it does not claim to verify a real MongoDB instance.

## Layout

```text
src/
├── server.ts       Bootstrap: env, DB connect, listen, shutdown
├── app.ts          Express assembly — exported without listening
├── routes.ts       Mounts each module under API_PREFIX
├── config/         env.ts, database.ts
├── middleware/     errors, request context and rate limits
├── lib/            Infrastructure owned by no single domain
└── modules/        One folder per business domain
    ├── health/
    ├── properties/
    ├── inquiries/
    └── auth/        OIDC, staff, sessions, CSRF, permissions and audit
```

Organized by domain: a feature's routes, controller, service and model live together
under `modules/<domain>/`. Create a module when its feature begins — not before.

## Public endpoints

| Method | Path                        | Behaviour                                       |
| ------ | --------------------------- | ----------------------------------------------- |
| `GET`  | `/api/v1/health`            | Process/environment/database status             |
| `GET`  | `/api/v1/properties`        | Validated, published-only search and pagination |
| `GET`  | `/api/v1/properties/facets` | Facets derived from published inventory         |
| `GET`  | `/api/v1/properties/:slug`  | One published public projection                 |
| `POST` | `/api/v1/inquiries`         | Validated create-only inquiry acknowledgement   |

See the [public API reference](../docs/api/public-api.md) for parameters, validation and
disclosure rules.

## Staff authentication endpoints

| Method | Path                    | Behaviour                                       |
| ------ | ----------------------- | ----------------------------------------------- |
| `GET`  | `/api/v1/auth/login`    | Starts Auth0 Authorization Code + PKCE login    |
| `GET`  | `/api/v1/auth/callback` | Validates callback and issues the local session |
| `GET`  | `/api/v1/auth/session`  | Returns local staff, permissions and CSRF token |
| `POST` | `/api/v1/auth/logout`   | Revokes the local session and clears cookies    |

These routes are unavailable until the complete Auth0 environment group is configured.
See the [authentication API](../docs/api/authentication-api.md) for cookies, response
contracts and failure behavior. No provider token is exposed to browser JavaScript.

## Gotchas

- ESM project: relative imports must end in `.js`. This is correct.
- `app.ts` must never call `listen()` — that is `server.ts`'s job.
- Import network types from `@rc/shared`; never redeclare a response shape here.
- In development a failed MongoDB connection logs a warning and the server still starts,
  reporting `database.status: "disconnected"`. In test and production it exits 1.
- Property queries always add `publicationStatus: "published"`; callers cannot override
  it. Public projections exclude exact address, coordinates and internal fields.
- Inquiry creation is limited to five submissions per IP per 15 minutes, has a honeypot,
  and returns no submitted personal data. There is deliberately no public inquiry read.
- Public property and inquiry persistence has been verified against the project Atlas
  database. Authentication persistence has automated schema/store coverage and still
  needs the documented development-tenant acceptance pass. No seed data or production
  listings are included.
