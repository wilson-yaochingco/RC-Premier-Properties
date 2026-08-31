# RC Premier Properties — Backend

Node.js + Express 5 + TypeScript + Mongoose (MongoDB).

## Setup

```bash
npm install
cp .env.example .env      # then edit MONGODB_URI if needed
npm run dev               # http://localhost:5000
```

Verify: `curl http://localhost:5000/api/health`

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Watch mode via `tsx` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run the compiled build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |

## Structure

```
src/
├── server.ts       Entry point: env, DB connect, listen, graceful shutdown
├── app.ts          Express app assembly (exported without listening)
├── config/         env.ts (typed config), database.ts (mongoose lifecycle)
├── routes/         index.ts mounts feature routers under /api
├── controllers/    Request/response handling
├── services/       Business logic (empty — for future features)
├── models/         Mongoose schemas (empty — for future features)
└── middleware/     notFound, errorHandler
```

## Adding a resource later

`models/X.ts` → `services/x.service.ts` → `controllers/x.controller.ts` →
`routes/x.routes.ts` → one `router.use()` line in `routes/index.ts`.

## Notes

- ESM project (`"type": "module"`): relative imports must end in `.js`.
- In development a failed MongoDB connection logs a warning and the server still
  starts; `/api/health` reports `database.status: "disconnected"`. In production a
  failed connection exits with code 1.
