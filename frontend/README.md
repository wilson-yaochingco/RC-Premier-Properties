# RC Premier Properties — Frontend

Next.js (App Router) + React + TypeScript + Tailwind CSS.

Part of an npm workspaces monorepo — install and run from the **repository root**, not
from this folder.

## Setup

```bash
npm install                  # at the repo root
cp .env.example .env.local
npm run dev:frontend         # at the repo root → http://localhost:3000
```

## Scripts

Run with `npm run <script> --workspace frontend`, or use the root shortcuts.

| Script      | Purpose                    |
| ----------- | -------------------------- |
| `dev`       | Start the dev server       |
| `build`     | Production build           |
| `start`     | Serve the production build |
| `lint`      | ESLint                     |
| `typecheck` | TypeScript, no emit        |

## Structure

```
src/
├── app/          App Router routes, layouts, global styles
├── components/   Shared UI components
├── hooks/        Custom React hooks
├── lib/          Framework-agnostic helpers (env config lives here)
├── services/     API clients that call the backend
└── types/        Frontend-only TypeScript types
```

Colocate route-specific components inside their route folder under `src/app/`, and
reserve `src/components/` for UI genuinely shared across routes. This keeps
`components/` from turning into a flat dump as the app grows.

## Talking to the backend

Import the response types and the version prefix from the shared package — never
redeclare a response shape here:

```ts
import { API_PREFIX, type HealthResponse } from "@rc/shared";
import { apiUrl } from "@/lib/env";

const res = await fetch(apiUrl(`${API_PREFIX}/health`));
const body: HealthResponse = await res.json();
```

`API_BASE_URL` and `apiUrl()` in `src/lib/env.ts` are the only places that read
`NEXT_PUBLIC_API_URL`. Don't touch `process.env` directly in components.

Types shared with the backend belong in `shared/src/api.ts`, not in `src/types/` — that
folder is for types the frontend alone cares about.

## Notes

- Only variables prefixed `NEXT_PUBLIC_` reach the browser. Never put a secret in one.
- Next.js reads `.env.local` at startup — restart the dev server after changing it.
