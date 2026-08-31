# Setting up RC Premier Properties in VS Code

A step-by-step guide for new team members. Start to finish, expect about 10 minutes.

---

## 1. Install the prerequisites

| Tool    | Version                                  | Where                         |
| ------- | ---------------------------------------- | ----------------------------- |
| Node.js | **20 or newer** (22 LTS recommended)     | https://nodejs.org            |
| Git     | any recent version                       | https://git-scm.com/downloads |
| VS Code | latest                                   | https://code.visualstudio.com |
| MongoDB | 6 or newer — **or** a free Atlas cluster | see step 5                    |

Check that Node and Git are on your PATH:

```bash
node -v     # must print v20.x or higher
npm -v
git --version
```

If `node -v` prints nothing or an old version, close and reopen your terminal after
installing, then try again.

---

## 2. Clone the repository

```bash
git clone https://github.com/wilson-yaochingco/RC-Premier-Properties.git
cd RC-Premier-Properties
```

---

## 3. Open the project in VS Code

```bash
code .
```

Open the **repository root** — not `frontend/` or `backend/` on their own. The shared
workspace settings in `.vscode/` only apply to the root folder.

VS Code will show a notification: **"This workspace has extension recommendations."**
Click **Install All**. If you miss it, open the Extensions panel (`Ctrl+Shift+X`) and
type `@recommended`.

The recommended extensions are:

| Extension                                               | Why                                             |
| ------------------------------------------------------- | ----------------------------------------------- |
| ESLint (`dbaeumer.vscode-eslint`)                       | Shows lint errors inline and auto-fixes on save |
| Prettier (`esbenp.prettier-vscode`)                     | Consistent formatting on save                   |
| Tailwind CSS IntelliSense (`bradlc.vscode-tailwindcss`) | Class autocomplete in the frontend              |
| MongoDB for VS Code (`mongodb.mongodb-vscode`)          | Browse the database without leaving the editor  |
| Path IntelliSense                                       | Autocompletes import paths                      |
| GitLens                                                 | Inline blame and history                        |

### Use the workspace TypeScript version

So everyone sees identical type errors, press `Ctrl+Shift+P` → **TypeScript: Select
TypeScript Version** → **Use Workspace Version**. The workspace already suggests this;
you only need to accept it once.

---

## 4. Install dependencies

This is an **npm workspaces monorepo**: one install at the repository root covers all
three packages (`shared`, `backend`, `frontend`). Open a VS Code terminal with
`Ctrl+backtick` and run it from the root:

```bash
npm install
```

Do **not** run `npm install` inside `frontend/` or `backend/` — that creates a stray
lockfile and breaks the workspace links.

This takes a few minutes the first time. It also runs a `postinstall` step that compiles
`shared/` into `shared/dist/`, which the other two packages import as `@rc/shared`.

---

## 5. Set up MongoDB

Pick **one** of the two options.

### Option A — MongoDB Atlas (easiest, no local install)

1. Create a free account at https://www.mongodb.com/cloud/atlas and make an **M0** cluster.
2. Under **Database Access**, add a database user with a password.
3. Under **Network Access**, add your current IP address.
4. Click **Connect → Drivers** and copy the connection string. It looks like
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/rc_premier`
5. Use that as your `MONGODB_URI` in the next step, replacing `<user>` and `<password>`.

### Option B — MongoDB locally

Install **MongoDB Community Server** from https://www.mongodb.com/try/download/community
and make sure the service is running. Your connection string is then:

```
mongodb://127.0.0.1:27017/rc_premier
```

On Windows, confirm the service is up with:

```powershell
Get-Service MongoDB
```

---

## 6. Create your environment files

These hold per-developer configuration and are **git-ignored** — every person creates
their own from the committed templates. **Never commit a real `.env`, and never put a
real password in a file that is tracked by git.**

```bash
# from the repository root
cd backend
cp .env.example .env

cd ../frontend
cp .env.example .env.local
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

Now open `backend/.env` and set `MONGODB_URI` to the string from step 5:

```ini
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/rc_premier
CORS_ORIGIN=http://localhost:3000
```

`frontend/.env.local` normally needs no changes:

```ini
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 7. Run both apps

You need **two terminals** running at the same time. In VS Code, click the **split
terminal** icon, or press `Ctrl+Shift+5`. Both commands run from the **repository
root**, and each rebuilds `shared/` first so your types are never stale.

**Terminal 1 — backend:**

```bash
npm run dev:backend
```

Expected output:

```
[db] connected to rc_premier
[server] rc-premier-backend listening on http://localhost:5000 (development)
[server] health check: http://localhost:5000/api/v1/health
```

**Terminal 2 — frontend:**

```bash
npm run dev:frontend
```

Expected output:

```
▲ Next.js 16.3.3
- Local:  http://localhost:3000
✓ Ready in 589ms
```

---

## 8. Confirm it works

Open **http://localhost:3000**. You should see the RC Premier Properties page with a
green dot and **"Backend reachable — database: connected"**.

You can also check the API directly:

```bash
curl http://localhost:5000/api/v1/health
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

If `database.status` says `"connected"`, your setup is complete.

---

## Troubleshooting

**The dot is amber or red — "Backend unreachable."**
The backend isn't running, or it's on a different port. Confirm terminal 1 shows the
`listening on http://localhost:5000` line, and that `NEXT_PUBLIC_API_URL` in
`frontend/.env.local` matches that port. Restart the frontend dev server after changing
any `.env` file — Next.js only reads them at startup.

**`database.status` is `"disconnected"` and the log says `ECONNREFUSED 127.0.0.1:27017`.**
MongoDB isn't running. This is expected, and the server deliberately keeps running so you
can still work on the app. Start your local MongoDB service, or switch `MONGODB_URI` to
an Atlas string.

**`Missing required environment variable: MONGODB_URI`.**
You skipped step 6, or the file is still named `.env.example`. The backend needs
`backend/.env`; the frontend needs `frontend/.env.local`.

**`Error: listen EADDRINUSE: address already in use :::5000`.**
Something else holds the port. Either stop it, or change `PORT` in `backend/.env` and
update `NEXT_PUBLIC_API_URL` in `frontend/.env.local` to match.

**Atlas: `MongoServerError: bad auth`, or a connection timeout.**
Re-check the username and password in the connection string, and confirm your current IP
is allowed under **Network Access**. Home and office IPs differ — you may need to add both.

**TypeScript says `Cannot find module '@rc/shared'`, or your types look out of date.**
`shared/dist` is missing or stale. Rebuild it from the repository root with
`npm run build --workspace shared`, or just `npm install` again. If you are actively
editing `shared/src/`, run `npm run dev:shared` in a third terminal to rebuild on save.

**`npm install` created a lockfile inside `frontend/` or `backend/`.**
You ran it in the wrong directory. Delete that `package-lock.json` and the local
`node_modules/`, then run `npm install` from the repository root.

**ESLint isn't highlighting anything.**
You probably opened `frontend/` or `backend/` directly instead of the repository root.
Reopen the root folder, then run **Developer: Reload Window** from the command palette.

**Windows: `cp` or `curl` is not recognized.**
Those are Unix commands. In PowerShell use `Copy-Item` and `Invoke-RestMethod`, or run
your commands in Git Bash instead.

---

## Everyday commands

Run these from the **repository root** — they fan out across all three workspaces.

| Command                | What it does                                     |
| ---------------------- | ------------------------------------------------ |
| `npm run dev:backend`  | Start the API in watch mode                      |
| `npm run dev:frontend` | Start the web app in watch mode                  |
| `npm run dev:shared`   | Rebuild the shared contract on save              |
| `npm run lint`         | ESLint, backend + frontend                       |
| `npm run typecheck`    | TypeScript across all three workspaces           |
| `npm run build`        | Build shared, then backend, then frontend        |
| `npm run format`       | Apply Prettier to the whole repo                 |
| `npm run format:check` | Verify formatting without writing (what CI runs) |

Before pushing, run `npm run format:check`, `npm run lint` and `npm run typecheck`.
CI runs exactly these on every pull request, so a green local run means a green PR.

To run a script inside one workspace only, use `npm run <script> --workspace backend`.

---

## Where things live

```
RC-Premier-Properties/
├── package.json      npm workspaces root — all dev commands live here
├── .vscode/          Shared editor settings (committed — please don't remove)
├── .github/workflows CI: lint, typecheck, build on every PR
│
├── shared/           @rc/shared — the API contract both apps compile against
│   └── src/api.ts    Request/response types + API_PREFIX. Change it here, once.
│
├── frontend/
│   └── src/
│       ├── app/         Pages and layouts (App Router)
│       ├── components/  Shared UI — colocate route-specific pieces under app/
│       ├── hooks/       Custom React hooks
│       ├── lib/         Helpers — env config lives here
│       ├── services/    Functions that call the backend API
│       └── types/       Frontend-only types (anything shared goes in shared/)
│
└── backend/
    └── src/
        ├── server.ts    Entry point
        ├── app.ts       Express app assembly
        ├── routes.ts    Mounts each module under /api/v1
        ├── config/      env + database connection
        ├── middleware/  notFound, errorHandler, rateLimit
        ├── lib/         Cross-domain helpers
        └── modules/     One folder per feature
            └── health/  health.routes.ts + health.controller.ts
```

The backend is organized **feature-first**: everything for one domain lives in a single
folder under `modules/`, rather than being scattered across `controllers/`, `services/`
and `models/`. To add a resource:

```
backend/src/modules/properties/
├── properties.routes.ts       URL → controller
├── properties.controller.ts   request/response handling
├── properties.service.ts      business logic
└── properties.model.ts        mongoose schema
```

Then register it with one line in `backend/src/routes.ts`, and put any type the frontend
also needs in `shared/src/api.ts`.

**Note:** the project is currently a foundation only — the health endpoint is the sole
route and there are no database models yet.

---

## Conventions

- **Anything that crosses the network goes in `shared/src/api.ts`.** Never redeclare a
  response shape in the frontend — import it from `@rc/shared` so a backend change shows
  up as a compile error instead of a runtime surprise.
- Build URLs from `API_PREFIX` (also from `@rc/shared`) rather than hardcoding
  `/api/v1`, so the version can be bumped in one place.
- The backend is an **ESM** project: relative imports must end in `.js`, even in
  TypeScript files, as in `import { env } from "./config/env.js"`. This is correct —
  do not remove the extension.
- On the frontend, import `API_BASE_URL` or `apiUrl()` from `src/lib/env.ts`. Don't read
  `process.env` directly in components.
- Only variables prefixed `NEXT_PUBLIC_` reach the browser. Never put a secret in one.
- Formatting is enforced by Prettier and checked in CI. Let format-on-save handle it, or
  run `npm run format` before committing.
- The repository stores all text files with LF line endings (`.gitattributes`). Don't
  change your editor to CRLF.
