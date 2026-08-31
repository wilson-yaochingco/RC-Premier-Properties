# RC Premier Properties — Frontend

Next.js (App Router) + React + TypeScript + Tailwind CSS.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3000
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |

## Structure

```
src/
├── app/          App Router routes, layouts, global styles
├── components/   Reusable UI components
├── hooks/        Custom React hooks
├── lib/          Framework-agnostic helpers (env config lives here)
├── services/     API clients that call the backend
└── types/        Shared TypeScript types
```

The backend base URL comes from `NEXT_PUBLIC_API_URL`; read it via
`API_BASE_URL` / `apiUrl()` in `src/lib/env.ts` rather than `process.env`.
