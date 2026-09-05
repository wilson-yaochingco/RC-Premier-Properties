# API Conventions

Rules every endpoint in the RC Premier Properties API follows. Types referenced here are
defined in [`shared/src/api.ts`](../../shared/src/api.ts) and imported by both apps.

> **Scope:** these conventions apply to the implemented health, public-property,
> inquiry-create and authentication endpoints. See [`public-api.md`](public-api.md) and
> [`authentication-api.md`](authentication-api.md) for endpoint references.

---

## Base path and versioning

All routes are served under a version prefix:

```
/api/v1
```

The prefix is **not** hardcoded. It comes from `API_PREFIX` in `@rc/shared`, which the
backend mounts in `app.ts` and the frontend uses to build URLs:

```ts
import { API_PREFIX } from "@rc/shared";

app.use(API_PREFIX, apiRateLimit, routes); // backend
fetch(apiUrl(`${API_PREFIX}/health`)); // frontend
```

To cut a new version, change `API_VERSION` in `shared/src/api.ts` — both sides follow.
Never write `/api/v1` as a literal string.

Bump the version for **breaking** changes only: removing or renaming a field, changing a
field's type, or changing the meaning of an existing value. Adding an optional field is
not breaking.

---

## Response conventions

**Success** — return the resource shape directly, typed by an interface in
`shared/src/api.ts`. Do not wrap successful responses in a `{ data: ... }` envelope;
the status code already carries success or failure.

```ts
export function getHealth(_req: Request, res: Response<HealthResponse>): void {
  const body: HealthResponse = {/* ... */};
  res.status(200).json(body);
}
```

Typing the `Response<T>` is what makes the contract enforceable — an incorrect body
fails the build.

**Errors** — every non-2xx response uses one envelope, produced centrally by
`middleware/errorHandler.ts`:

```json
{
  "status": "error",
  "statusCode": 404,
  "message": "Route not found: GET /api/v1/nope"
}
```

Its type is `ApiErrorResponse`. Controllers do not build error responses by hand — they
throw `HttpError`, and the error middleware formats it:

```ts
import { HttpError } from "../../middleware/errorHandler.js";

throw new HttpError(404, "Property not found");
```

Express 5 forwards rejected promises from async handlers automatically, so `throw` works
inside `async` controllers with no wrapper.

**In production, 5xx messages are replaced** with `"Internal Server Error"` so internal
detail never leaks. 4xx messages are always passed through — they are meant for the
caller.

---

## Status codes in use

| Code | When                                                              |
| ---- | ----------------------------------------------------------------- |
| 200  | Successful read                                                   |
| 201  | Inquiry accepted                                                  |
| 400  | Invalid query, slug or request body, with field issues as needed  |
| 401  | Authentication is missing, invalid, expired or unacceptable       |
| 403  | Authenticated caller lacks the required named permission          |
| 413  | JSON request body exceeds the 1 MB limit                          |
| 415  | Inquiry request is not sent with a JSON-compatible content type   |
| 404  | No route/resource, or protected existence must remain undisclosed |
| 429  | Rate limit exceeded                                               |
| 500  | Unhandled error — logged server-side with the full error object   |

Authentication errors deliberately avoid disclosing whether an external identity exists
in the local staff allowlist. Protected-resource handlers may return `404` instead of
`403` when revealing existence would disclose information outside the caller's scope.

---

## Routing

Routers are registered one line per module in `backend/src/routes.ts`:

```ts
router.use("/health", healthRoutes);
router.use("/properties", createPropertyRoutes());
router.use("/inquiries", createInquiryRoutes());
router.use("/auth", createAuthRoutes());
```

A module's own `*.routes.ts` maps paths to controller functions and nothing else — no
business logic, no data access.

---

## CORS

Restricted to a single origin from the `CORS_ORIGIN` environment variable, with
credentials enabled. **Never `*`.** A request from any other origin does not receive its
origin echoed back, so browsers block the response.

---

## Rate limiting

300 requests per 15-minute window, `standardHeaders: true` (modern `RateLimit-*`
headers), `legacyHeaders: false`.

**The health endpoint is skipped** — an uptime monitor polling it must never be
throttled into reporting a false outage. See `middleware/rateLimit.ts`.

Inquiry creation also has an independent, tighter budget of 5 submissions per IP per
15-minute window. Exceeding either limiter returns the common 429 error envelope.

Login start has a separate budget of 10 attempts per IP per 15 minutes. Authenticated
responses also use `Cache-Control: no-store` and `X-Robots-Tag: noindex, nofollow`.

Behind a reverse proxy in production, `trust proxy` is enabled so the limiter counts
real client IPs rather than the proxy's.

---

## Public exposure boundary

The public API can read published properties and create inquiries. The auth API only
establishes and revokes staff sessions; it does not create public registration or expose
business records. Property writes and inquiry reads require a separately implemented,
named-permission-protected endpoint plus a service-level authorization decision.

---

## Security headers

`helmet()` runs before every route, and it removes `X-Powered-By`. Responses carry
`X-Content-Type-Options: nosniff`, `X-Frame-Options`, and HSTS.

---

## Adding an endpoint

1. Add its request/response types to `shared/src/api.ts`.
2. Create or extend `backend/src/modules/<domain>/`.
3. Register the router in `backend/src/routes.ts`.
4. Consume it on the frontend by importing the same types from `@rc/shared` — never
   redeclare a response shape.
5. If it introduces a new convention, update this document.
