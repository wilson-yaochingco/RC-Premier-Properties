import express, { type RequestHandler } from "express";
import type {
  AuthPermission,
  CurrentSessionResponse,
  PropertyFacetsResponse,
  PropertyMapResponse,
  PropertySearchResponse,
} from "@rc/shared";
import { API_PREFIX, AUTH_PERMISSIONS } from "@rc/shared";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { requestContext } from "../src/middleware/requestContext.js";
import { createAuthCookieSettings } from "../src/modules/auth/auth.cookies.js";
import { AuthCrypto } from "../src/modules/auth/auth.crypto.js";
import { OidcVerificationError } from "../src/modules/auth/auth.oidc.js";
import { requirePermission } from "../src/modules/auth/auth.middleware.js";
import { AuthService } from "../src/modules/auth/auth.service.js";
import { assertProtectedResourceVisible } from "../src/modules/auth/auth.service.js";
import type {
  AuthSessionRecord,
  AuthStore,
  CreateAuthSessionResult,
  CreateAuthSessionInput,
  CreateOidcTransactionInput,
  OidcAuthorizationRequest,
  OidcProvider,
  OidcTransactionRecord,
  RevokedSessionRecord,
  SecurityAuditEventInput,
  SessionRevocationReason,
  StaffIdentityRecord,
  VerifiedOidcIdentity,
} from "../src/modules/auth/auth.types.js";
import type { PropertyService } from "../src/modules/properties/property.types.js";

const NOW = new Date("2026-09-05T08:00:00.000Z");
const ISSUER = "https://rc-premier-dev.us.auth0.com/";
const CALLBACK_URL = `http://localhost:5000${API_PREFIX}/auth/callback`;
const RETURN_URL = "http://localhost:3000/admin";
const ORIGIN = "http://localhost:3000";
const SECRET = "test-only-auth-session-secret-32-characters";
const passThrough: RequestHandler = (_req, _res, next) => next();

function cloneStaff(staff: StaffIdentityRecord): StaffIdentityRecord {
  return { ...staff };
}

class MemoryAuthStore implements AuthStore {
  readonly staff = new Map<string, StaffIdentityRecord>();
  readonly transactions = new Map<string, OidcTransactionRecord>();
  readonly sessions = new Map<string, AuthSessionRecord>();
  readonly audits: SecurityAuditEventInput[] = [];
  private nextId = 1;

  constructor() {
    this.addStaff("admin", "active", "admin");
    this.addStaff("disabled", "disabled", "admin");
    this.addStaff("unassigned", "active", null);
  }

  addStaff(
    subject: string,
    status: StaffIdentityRecord["status"],
    role: StaffIdentityRecord["role"],
  ): StaffIdentityRecord {
    const id = `staff-${this.nextId++}`;
    const staff: StaffIdentityRecord = {
      id,
      issuer: ISSUER,
      subject,
      displayName: `RC Test ${subject}`,
      email: `${subject}@example.test`,
      role,
      status,
      authorizationVersion: 1,
      createdAt: NOW,
      updatedAt: NOW,
    };
    this.staff.set(id, staff);
    return staff;
  }

  async createOidcTransaction(input: CreateOidcTransactionInput): Promise<void> {
    const id = `transaction-${this.nextId++}`;
    this.transactions.set(input.transactionHash, { id, ...input });
  }

  async consumeOidcTransaction(
    transactionHash: string,
    now: Date,
  ): Promise<OidcTransactionRecord | null> {
    const transaction = this.transactions.get(transactionHash);
    if (
      !transaction ||
      transaction.consumedAt ||
      transaction.expiresAt.getTime() <= now.getTime()
    ) {
      return null;
    }
    transaction.consumedAt = now;
    return { ...transaction };
  }

  async findStaffByExternalIdentity(
    issuer: string,
    subject: string,
  ): Promise<StaffIdentityRecord | null> {
    const staff = [...this.staff.values()].find(
      (candidate) => candidate.issuer === issuer && candidate.subject === subject,
    );
    return staff ? cloneStaff(staff) : null;
  }

  async findStaffById(id: string): Promise<StaffIdentityRecord | null> {
    const staff = this.staff.get(id);
    return staff ? cloneStaff(staff) : null;
  }

  async markStaffLogin(id: string, at: Date): Promise<void> {
    const staff = this.staff.get(id);
    if (staff) staff.lastLoginAt = at;
  }

  async createSession(
    input: CreateAuthSessionInput,
    maxConcurrentSessions: number,
  ): Promise<CreateAuthSessionResult> {
    const session: AuthSessionRecord = {
      id: `session-${this.nextId++}`,
      ...input,
    };
    this.sessions.set(session.id, session);
    const active = [...this.sessions.values()]
      .filter(
        (candidate) =>
          candidate.staffIdentityId === input.staffIdentityId &&
          !candidate.revokedAt &&
          candidate.expiresAt.getTime() > input.createdAt.getTime(),
      )
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    const revokedSessionIds: string[] = [];
    for (const excess of active.slice(maxConcurrentSessions)) {
      if (this.revoke(excess, input.createdAt, "concurrent-limit")) {
        revokedSessionIds.push(excess.id);
      }
    }
    return { session: { ...session }, revokedSessionIds };
  }

  async findSessionByHash(sessionHash: string): Promise<AuthSessionRecord | null> {
    const session = [...this.sessions.values()].find(
      (candidate) => candidate.sessionHash === sessionHash,
    );
    return session ? { ...session } : null;
  }

  async touchSession(
    id: string,
    lastActivityAt: Date,
    idleExpiresAt: Date,
    expiresAt: Date,
  ): Promise<void> {
    const session = this.sessions.get(id);
    if (session && !session.revokedAt) {
      session.lastActivityAt = lastActivityAt;
      session.idleExpiresAt = idleExpiresAt;
      session.expiresAt = expiresAt;
    }
  }

  async revokeSessionByHash(
    sessionHash: string,
    at: Date,
    reason: SessionRevocationReason,
  ): Promise<RevokedSessionRecord | null> {
    const session = [...this.sessions.values()].find(
      (candidate) => candidate.sessionHash === sessionHash,
    );
    return this.revoke(session, at, reason) && session
      ? { id: session.id, staffIdentityId: session.staffIdentityId }
      : null;
  }

  async revokeSessionById(
    id: string,
    at: Date,
    reason: SessionRevocationReason,
  ): Promise<boolean> {
    return this.revoke(this.sessions.get(id), at, reason);
  }

  async revokeSessionsForStaff(
    staffIdentityId: string,
    at: Date,
    reason: SessionRevocationReason,
  ): Promise<string[]> {
    const revokedSessionIds: string[] = [];
    for (const session of this.sessions.values()) {
      if (
        session.staffIdentityId === staffIdentityId &&
        this.revoke(session, at, reason)
      ) {
        revokedSessionIds.push(session.id);
      }
    }
    return revokedSessionIds;
  }

  async disableStaff(id: string, at: Date): Promise<StaffIdentityRecord | null> {
    const staff = this.staff.get(id);
    if (!staff) return null;
    staff.status = "disabled";
    staff.authorizationVersion += 1;
    staff.updatedAt = at;
    return cloneStaff(staff);
  }

  async recordAudit(event: SecurityAuditEventInput): Promise<void> {
    this.audits.push({ ...event });
  }

  private revoke(
    session: AuthSessionRecord | undefined,
    at: Date,
    reason: SessionRevocationReason,
  ): boolean {
    if (!session || session.revokedAt) return false;
    session.revokedAt = at;
    session.revocationReason = reason;
    return true;
  }
}

class FakeOidcProvider implements OidcProvider {
  private counter = 0;

  async createAuthorizationRequest(): Promise<OidcAuthorizationRequest> {
    this.counter += 1;
    const state = `state-${this.counter}`;
    return {
      authorizationUrl: `https://rc-premier-dev.us.auth0.com/authorize?state=${state}&code_challenge_method=S256`,
      state,
      nonce: `nonce-${this.counter}`,
      codeVerifier: `verifier-${this.counter}`,
    };
  }

  async completeAuthorization(input: {
    callbackUrl: URL;
    expectedState: string;
    expectedNonce: string;
    codeVerifier: string;
  }): Promise<VerifiedOidcIdentity> {
    const code = input.callbackUrl.searchParams.get("code");
    if (
      input.callbackUrl.searchParams.get("state") !== input.expectedState ||
      !input.expectedNonce.startsWith("nonce-") ||
      !input.codeVerifier.startsWith("verifier-") ||
      !code ||
      [
        "invalid-audience",
        "invalid-signature",
        "expired-token",
        "invalid-nonce",
        "invalid-pkce",
      ].includes(code)
    ) {
      throw new OidcVerificationError();
    }

    const subject = ["unknown", "disabled", "unassigned"].includes(code)
      ? code
      : "admin";
    const authenticationMethods = ["missing-amr", "empty-amr"].includes(code)
      ? []
      : code === "password-only"
        ? ["pwd"]
        : code === "passkey-only"
          ? ["phr"]
          : code === "incorrect-assurance"
            ? ["otp"]
            : ["mfa"];
    return {
      issuer: code === "invalid-issuer" ? "https://attacker.invalid/" : ISSUER,
      subject,
      authenticationMethods,
      displayName: "Provider display name",
      email: "provider@example.test",
    };
  }
}

function makeAuth() {
  const store = new MemoryAuthStore();
  const service = new AuthService(
    store,
    new FakeOidcProvider(),
    new AuthCrypto(SECRET),
    {
      issuerUrl: ISSUER,
      callbackUrl: CALLBACK_URL,
      allowedReturnUrls: [RETURN_URL, "http://localhost:3000/admin/security"],
      allowedOrigins: [ORIGIN],
      requiredAmr: "mfa",
      sessionIdleMs: 30 * 60_000,
      sessionAbsoluteMs: 8 * 60 * 60_000,
      sessionActivityTouchMs: 5 * 60_000,
      maxConcurrentSessions: 3,
      transactionLifetimeMs: 10 * 60_000,
    },
  );
  const cookies = createAuthCookieSettings(
    false,
    service.config.sessionAbsoluteMs,
    service.config.transactionLifetimeMs,
  );
  return { cookies, service, store };
}

function makePropertyService(): PropertyService {
  return {
    async search(search): Promise<PropertySearchResponse> {
      return {
        items: [],
        pagination: { page: search.page, limit: search.limit, total: 0, totalPages: 0 },
        appliedFilters: search,
        sort: search.sort,
      };
    },
    async map(search): Promise<PropertyMapResponse> {
      return {
        items: [],
        matchingTotal: 0,
        mappableTotal: 0,
        returned: 0,
        truncated: false,
        appliedFilters: search,
      };
    },
    async findPublishedBySlug() {
      return null;
    },
    async getFacets(): Promise<PropertyFacetsResponse> {
      return {
        locations: [],
        propertyTypes: [],
        priceRange: { min: null, max: null, currency: "PHP" },
      };
    },
  };
}

function buildApp(auth: ReturnType<typeof makeAuth>) {
  return createApp({
    auth: {
      service: auth.service,
      cookies: auth.cookies,
      loginRateLimit: passThrough,
    },
    propertyService: makePropertyService(),
    inquiryRateLimit: passThrough,
  });
}

function setCookieHeaders(response: request.Response): string[] {
  const value = response.headers["set-cookie"] as string[] | string | undefined;
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function cookiePair(response: request.Response, name: string): string {
  const header = setCookieHeaders(response).find((value) =>
    value.startsWith(`${name}=`),
  );
  if (!header) throw new Error(`Missing ${name} cookie`);
  return header.split(";", 1)[0] ?? "";
}

function stateFrom(response: request.Response): string {
  return new URL(response.headers.location as string).searchParams.get("state") ?? "";
}

async function startAndComplete(
  app: ReturnType<typeof buildApp>,
  cookies: ReturnType<typeof makeAuth>["cookies"],
  code = "valid",
) {
  const start = await request(app).get(`${API_PREFIX}/auth/login`);
  const transactionCookie = cookiePair(start, cookies.transactionName);
  const callback = await request(app)
    .get(`${API_PREFIX}/auth/callback`)
    .query({ code, state: stateFrom(start) })
    .set("Cookie", transactionCookie);
  return { callback, start, transactionCookie };
}

describe("Phase 3A authentication HTTP boundary", () => {
  let auth: ReturnType<typeof makeAuth>;

  beforeEach(() => {
    auth = makeAuth();
  });

  it("starts Authorization Code + S256 PKCE with an opaque transaction cookie", async () => {
    const response = await request(buildApp(auth))
      .get(`${API_PREFIX}/auth/login`)
      .query({ returnTo: RETURN_URL });

    expect(response.status).toBe(302);
    expect(response.headers.location).toContain("code_challenge_method=S256");
    const cookie = setCookieHeaders(response).join(";");
    expect(cookie).toContain(`${auth.cookies.transactionName}=`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("Secure");
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("uses host-only secure cookies under production cookie settings", async () => {
    const secureCookies = createAuthCookieSettings(
      true,
      auth.service.config.sessionAbsoluteMs,
      auth.service.config.transactionLifetimeMs,
    );
    const app = createApp({
      auth: {
        service: auth.service,
        cookies: secureCookies,
        loginRateLimit: passThrough,
      },
      propertyService: makePropertyService(),
      inquiryRateLimit: passThrough,
    });
    const response = await request(app).get(`${API_PREFIX}/auth/login`);
    const cookie = setCookieHeaders(response).join(";");

    expect(cookie).toContain("__Host-rc_oidc_transaction=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).not.toContain("Domain=");
  });

  it("rate limits repeated login starts with the shared error envelope", async () => {
    const app = createApp({
      auth: { service: auth.service, cookies: auth.cookies },
      propertyService: makePropertyService(),
      inquiryRateLimit: passThrough,
    });

    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await request(app).get(`${API_PREFIX}/auth/login`)).status).toBe(302);
    }
    const limited = await request(app).get(`${API_PREFIX}/auth/login`);
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({
      status: "error",
      statusCode: 429,
      message: "Too many login attempts, please try again later.",
    });
    expect(limited.headers["cache-control"]).toBe("no-store");
  });

  it("rejects return URLs unless they exactly match the configured allowlist", async () => {
    const app = buildApp(auth);
    for (const returnTo of [
      "http://localhost:3000/admin/extra",
      "http://localhost:3000/admin?next=https://attacker.invalid",
      "https://attacker.invalid/admin",
    ]) {
      const response = await request(app)
        .get(`${API_PREFIX}/auth/login`)
        .query({ returnTo });
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        status: "error",
        statusCode: 400,
        message: "Invalid login return URL.",
      });
    }
  });

  it("creates an opaque hashed session and returns only local staff authorization", async () => {
    const app = buildApp(auth);
    const { callback } = await startAndComplete(app, auth.cookies);
    const sessionCookie = cookiePair(callback, auth.cookies.sessionName);
    const rawSession = sessionCookie.split("=")[1] ?? "";

    expect(callback.status).toBe(303);
    expect(callback.headers.location).toBe(RETURN_URL);
    expect(rawSession).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(JSON.stringify([...auth.store.sessions.values()])).not.toContain(rawSession);

    const current = await request(app)
      .get(`${API_PREFIX}/auth/session`)
      .set("Cookie", sessionCookie);
    const body = current.body as CurrentSessionResponse;
    expect(current.status).toBe(200);
    expect(body).toMatchObject({
      authenticated: true,
      staff: { role: "admin", email: "admin@example.test" },
      permissions: AUTH_PERMISSIONS,
    });
    expect(body.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(current.headers["cache-control"]).toBe("no-store");
    expect(JSON.stringify(current.body)).not.toContain("provider@example.test");
  });

  it.each([
    "invalid-issuer",
    "invalid-audience",
    "invalid-signature",
    "expired-token",
    "invalid-nonce",
    "invalid-pkce",
  ])("returns one generic failure for %s callback evidence", async (code) => {
    const { callback } = await startAndComplete(buildApp(auth), auth.cookies, code);
    expect(callback.status).toBe(401);
    expect(callback.body).toEqual({
      status: "error",
      statusCode: 401,
      message: "Authentication failed.",
    });
    expect(setCookieHeaders(callback).join(";")).not.toContain(
      `${auth.cookies.sessionName}=`,
    );
  });

  it("rejects invalid state and consumes the transaction to prevent replay", async () => {
    const app = buildApp(auth);
    const start = await request(app).get(`${API_PREFIX}/auth/login`);
    const transactionCookie = cookiePair(start, auth.cookies.transactionName);
    const invalid = await request(app)
      .get(`${API_PREFIX}/auth/callback`)
      .query({ code: "valid", state: "attacker-state" })
      .set("Cookie", transactionCookie);
    const replay = await request(app)
      .get(`${API_PREFIX}/auth/callback`)
      .query({ code: "valid", state: stateFrom(start) })
      .set("Cookie", transactionCookie);

    expect(invalid.status).toBe(401);
    expect(replay.status).toBe(401);
    expect(auth.store.sessions.size).toBe(0);
  });

  it("rejects a replay after a successful callback", async () => {
    const app = buildApp(auth);
    const { callback, start, transactionCookie } = await startAndComplete(
      app,
      auth.cookies,
    );
    const replay = await request(app)
      .get(`${API_PREFIX}/auth/callback`)
      .query({ code: "valid", state: stateFrom(start) })
      .set("Cookie", transactionCookie);

    expect(callback.status).toBe(303);
    expect(replay.status).toBe(401);
    expect(auth.store.sessions.size).toBe(1);
  });

  it.each([
    "unknown",
    "disabled",
    "unassigned",
    "missing-amr",
    "empty-amr",
    "password-only",
    "passkey-only",
    "incorrect-assurance",
  ])("does not issue a session for %s staff", async (code) => {
    const { callback } = await startAndComplete(buildApp(auth), auth.cookies, code);
    expect(callback.status).toBe(401);
    expect(callback.body.message).toBe("Authentication failed.");
    expect(auth.store.sessions.size).toBe(0);
  });

  it("rotates an existing session during a new login", async () => {
    const app = buildApp(auth);
    const first = await startAndComplete(app, auth.cookies);
    const oldCookie = cookiePair(first.callback, auth.cookies.sessionName);
    const oldSession = [...auth.store.sessions.values()][0];
    if (!oldSession) throw new Error("Missing old session fixture");
    const secondStart = await request(app)
      .get(`${API_PREFIX}/auth/login`)
      .set("Cookie", oldCookie);
    const secondCallback = await request(app)
      .get(`${API_PREFIX}/auth/callback`)
      .query({ code: "valid", state: stateFrom(secondStart) })
      .set("Cookie", [
        oldCookie,
        cookiePair(secondStart, auth.cookies.transactionName),
      ]);
    const newCookie = cookiePair(secondCallback, auth.cookies.sessionName);

    expect(newCookie).not.toBe(oldCookie);
    expect(
      (await request(app).get(`${API_PREFIX}/auth/session`).set("Cookie", oldCookie))
        .status,
    ).toBe(401);
    expect(
      (await request(app).get(`${API_PREFIX}/auth/session`).set("Cookie", newCookie))
        .status,
    ).toBe(200);
    expect(
      auth.store.audits.filter(
        (event) =>
          event.action === "auth.session.revoked" && event.reason === "rotation",
      ),
    ).toEqual([
      expect.objectContaining({
        entityId: oldSession.id,
        outcome: "succeeded",
      }),
    ]);
  });

  it("rejects malformed, revoked, idle-expired, and absolute-expired sessions", async () => {
    const app = buildApp(auth);
    const malformed = await request(app)
      .get(`${API_PREFIX}/auth/session`)
      .set("Cookie", `${auth.cookies.sessionName}=not-a-session`);
    expect(malformed.status).toBe(401);

    for (const state of ["revoked", "idle", "absolute"] as const) {
      const login = await startAndComplete(app, auth.cookies);
      const cookie = cookiePair(login.callback, auth.cookies.sessionName);
      const session = [...auth.store.sessions.values()].at(-1);
      if (!session) throw new Error("Missing session fixture");
      if (state === "revoked") session.revokedAt = new Date();
      if (state === "idle") session.idleExpiresAt = new Date(0);
      if (state === "absolute") session.absoluteExpiresAt = new Date(0);
      const response = await request(app)
        .get(`${API_PREFIX}/auth/session`)
        .set("Cookie", cookie);
      expect(response.status).toBe(401);
    }
  });

  it("enforces the three-session concurrent limit", async () => {
    const app = buildApp(auth);
    const cookies: string[] = [];
    for (let index = 0; index < 4; index += 1) {
      const login = await startAndComplete(app, auth.cookies);
      cookies.push(cookiePair(login.callback, auth.cookies.sessionName));
    }

    const statuses = await Promise.all(
      cookies.map(async (cookie) =>
        request(app).get(`${API_PREFIX}/auth/session`).set("Cookie", cookie),
      ),
    );
    expect(statuses.map((response) => response.status).sort()).toEqual([
      200, 200, 200, 401,
    ]);
    const evictions = auth.store.audits.filter(
      (event) =>
        event.action === "auth.session.revoked" && event.reason === "concurrent-limit",
    );
    expect(evictions).toHaveLength(1);
    expect(evictions[0]).toMatchObject({
      entityType: "session",
      outcome: "succeeded",
    });
  });

  it("requires an exact origin and a session-bound CSRF token for logout", async () => {
    const app = buildApp(auth);
    const first = await startAndComplete(app, auth.cookies);
    const firstCookie = cookiePair(first.callback, auth.cookies.sessionName);
    const firstSession = await request(app)
      .get(`${API_PREFIX}/auth/session`)
      .set("Cookie", firstCookie);
    const firstCsrf = (firstSession.body as CurrentSessionResponse).csrfToken;

    const second = await startAndComplete(app, auth.cookies);
    const secondCookie = cookiePair(second.callback, auth.cookies.sessionName);
    const secondSession = await request(app)
      .get(`${API_PREFIX}/auth/session`)
      .set("Cookie", secondCookie);
    const secondCsrf = (secondSession.body as CurrentSessionResponse).csrfToken;

    const missing = await request(app)
      .post(`${API_PREFIX}/auth/logout`)
      .set("Origin", ORIGIN)
      .set("Cookie", firstCookie);
    const invalid = await request(app)
      .post(`${API_PREFIX}/auth/logout`)
      .set("Origin", ORIGIN)
      .set("Cookie", firstCookie)
      .set("X-CSRF-Token", "invalid");
    const crossSession = await request(app)
      .post(`${API_PREFIX}/auth/logout`)
      .set("Origin", ORIGIN)
      .set("Cookie", firstCookie)
      .set("X-CSRF-Token", secondCsrf);
    const disallowed = await request(app)
      .post(`${API_PREFIX}/auth/logout`)
      .set("Origin", "https://attacker.invalid")
      .set("Cookie", firstCookie)
      .set("X-CSRF-Token", firstCsrf);
    const success = await request(app)
      .post(`${API_PREFIX}/auth/logout`)
      .set("Origin", ORIGIN)
      .set("Cookie", firstCookie)
      .set("X-CSRF-Token", firstCsrf);

    expect(missing.status).toBe(403);
    expect(invalid.status).toBe(403);
    expect(crossSession.status).toBe(403);
    expect(disallowed.status).toBe(403);
    expect(success.status).toBe(200);
    expect(success.body).toEqual({ status: "logged-out" });
    expect(
      (await request(app).get(`${API_PREFIX}/auth/session`).set("Cookie", firstCookie))
        .status,
    ).toBe(401);
    const repeated = await request(app)
      .post(`${API_PREFIX}/auth/logout`)
      .set("Origin", ORIGIN)
      .set("Cookie", firstCookie)
      .set("X-CSRF-Token", firstCsrf);
    expect(repeated.status).toBe(200);
    expect(
      auth.store.audits.filter(
        (event) => event.action === "auth.session.revoked" && event.reason === "logout",
      ),
    ).toHaveLength(1);
    expect(
      auth.store.audits.filter((event) => event.action === "auth.logout.succeeded"),
    ).toHaveLength(1);
  });

  it("does not audit a second revocation for an already-revoked session", async () => {
    const app = buildApp(auth);
    const login = await startAndComplete(app, auth.cookies);
    const sessionCookie = cookiePair(login.callback, auth.cookies.sessionName);
    const context = await auth.service.authenticate(
      sessionCookie.split("=")[1],
      "logout-context",
      NOW,
    );

    await auth.service.logout(context, "logout-first", NOW);
    await auth.service.logout(context, "logout-repeated", NOW);

    expect(
      auth.store.audits.filter(
        (event) => event.action === "auth.session.revoked" && event.reason === "logout",
      ),
    ).toHaveLength(1);
    expect(
      auth.store.audits.filter((event) => event.action === "auth.logout.succeeded"),
    ).toHaveLength(1);
  });

  it("revokes and audits every active session when staff is deactivated", async () => {
    const app = buildApp(auth);
    const firstLogin = await startAndComplete(app, auth.cookies);
    const secondLogin = await startAndComplete(app, auth.cookies);
    const cookies = [firstLogin, secondLogin].map((login) =>
      cookiePair(login.callback, auth.cookies.sessionName),
    );
    const admin = [...auth.store.staff.values()].find(
      (staff) => staff.subject === "admin",
    );
    if (!admin) throw new Error("Missing admin fixture");

    expect(
      await auth.service.deactivateStaff(admin.id, "deactivation-test", new Date()),
    ).toBe(true);
    for (const cookie of cookies) {
      expect(
        (await request(app).get(`${API_PREFIX}/auth/session`).set("Cookie", cookie))
          .status,
      ).toBe(401);
    }
    const revocations = auth.store.audits.filter(
      (event) =>
        event.action === "auth.session.revoked" && event.reason === "staff-disabled",
    );
    expect(revocations).toHaveLength(2);
    expect(new Set(revocations.map((event) => event.entityId)).size).toBe(2);
    expect(
      auth.store.audits.find((event) => event.action === "staff.deactivated"),
    ).toMatchObject({ revokedSessionCount: 2 });
  });

  it.each(["role", "status", "authorization-version"] as const)(
    "audits one revocation for a stale %s decision",
    async (change) => {
      const app = buildApp(auth);
      const login = await startAndComplete(app, auth.cookies);
      const cookie = cookiePair(login.callback, auth.cookies.sessionName);
      const admin = [...auth.store.staff.values()].find(
        (staff) => staff.subject === "admin",
      );
      if (!admin) throw new Error("Missing admin fixture");

      if (change === "role") admin.role = null;
      if (change === "status") admin.status = "disabled";
      if (change === "authorization-version") admin.authorizationVersion += 1;

      expect(
        (await request(app).get(`${API_PREFIX}/auth/session`).set("Cookie", cookie))
          .status,
      ).toBe(401);
      expect(
        (await request(app).get(`${API_PREFIX}/auth/session`).set("Cookie", cookie))
          .status,
      ).toBe(401);
      expect(
        auth.store.audits.filter(
          (event) =>
            event.action === "auth.session.revoked" &&
            event.reason === "authorization-changed",
        ),
      ).toHaveLength(1);
    },
  );

  it("keeps public property visibility unchanged", async () => {
    const app = buildApp(auth);
    const publicList = await request(app).get(`${API_PREFIX}/properties`);
    const draftGuess = await request(app).get(`${API_PREFIX}/properties/draft-listing`);
    expect(publicList.status).toBe(200);
    expect(publicList.body.items).toEqual([]);
    expect(draftGuess.status).toBe(404);
    expect(draftGuess.body.message).toBe("Property not found.");
  });

  it("keeps all audit records free of authentication secrets and inquiry content", async () => {
    const secretCode = "provider-secret-code-do-not-log";
    const app = buildApp(auth);
    const start = await request(app).get(`${API_PREFIX}/auth/login`);
    const callback = await request(app)
      .get(`${API_PREFIX}/auth/callback`)
      .query({ code: secretCode, state: stateFrom(start) })
      .set("Cookie", cookiePair(start, auth.cookies.transactionName));
    const sessionCookie = cookiePair(callback, auth.cookies.sessionName);
    const rawSessionToken = sessionCookie.split("=")[1] ?? "";
    const storedSession = [...auth.store.sessions.values()].at(-1);
    if (!storedSession) throw new Error("Missing session fixture");
    const current = await request(app)
      .get(`${API_PREFIX}/auth/session`)
      .set("Cookie", sessionCookie);
    const csrfToken = (current.body as CurrentSessionResponse).csrfToken;
    await request(app)
      .post(`${API_PREFIX}/auth/logout`)
      .set("Origin", ORIGIN)
      .set("Cookie", sessionCookie)
      .set("X-CSRF-Token", csrfToken);
    const serialized = JSON.stringify({
      audits: auth.store.audits,
    });

    expect(callback.status).toBe(303);
    expect(serialized).not.toContain(secretCode);
    expect(serialized).not.toContain(rawSessionToken);
    expect(serialized).not.toContain(storedSession.sessionHash);
    expect(serialized).not.toContain(sessionCookie);
    expect(serialized).not.toContain(csrfToken);
    expect(serialized).not.toContain("fixture-access-token");
    expect(serialized).not.toContain("private inquiry message");
  });
});

describe("named authorization decisions", () => {
  it.each(AUTH_PERMISSIONS)(
    "explicitly allows admin permission %s",
    async (permission) => {
      const auth = makeAuth();
      const admin = [...auth.store.staff.values()].find(
        (staff) => staff.subject === "admin",
      );
      if (!admin || !admin.role) throw new Error("Missing admin fixture");
      await expect(
        auth.service.authorize(
          {
            staff: { ...admin, role: admin.role },
            session: {
              id: "session-permission",
              sessionHash: "not-exposed",
              staffIdentityId: admin.id,
              staffAuthorizationVersion: 1,
              createdAt: NOW,
              lastActivityAt: NOW,
              idleExpiresAt: new Date(NOW.getTime() + 60_000),
              absoluteExpiresAt: new Date(NOW.getTime() + 60_000),
              expiresAt: new Date(NOW.getTime() + 60_000),
            },
            permissions: AUTH_PERMISSIONS,
            csrfToken: "csrf",
          },
          permission,
          "permission-test",
          NOW,
        ),
      ).resolves.toBeUndefined();
    },
  );

  it("returns 403 for an authenticated identity missing a named permission", async () => {
    const auth = makeAuth();
    const admin = [...auth.store.staff.values()].find(
      (staff) => staff.subject === "admin",
    );
    if (!admin || !admin.role) throw new Error("Missing admin fixture");
    const permission: AuthPermission = "audit:read";

    await expect(
      auth.service.authorize(
        {
          staff: { ...admin, role: admin.role },
          session: {
            id: "session-insufficient",
            sessionHash: "not-exposed",
            staffIdentityId: admin.id,
            staffAuthorizationVersion: 1,
            createdAt: NOW,
            lastActivityAt: NOW,
            idleExpiresAt: new Date(NOW.getTime() + 60_000),
            absoluteExpiresAt: new Date(NOW.getTime() + 60_000),
            expiresAt: new Date(NOW.getTime() + 60_000),
          },
          permissions: [],
          csrfToken: "csrf",
        },
        permission,
        "permission-denied-test",
        NOW,
      ),
    ).rejects.toMatchObject({ status: 403, message: "Permission denied." });
  });

  it("uses the shared 401/403/404 envelope at protected HTTP boundaries", async () => {
    const auth = makeAuth();
    const admin = [...auth.store.staff.values()].find(
      (staff) => staff.subject === "admin",
    );
    if (!admin || !admin.role) throw new Error("Missing admin fixture");
    const context = {
      staff: { ...admin, role: admin.role },
      session: {
        id: "session-http-permission",
        sessionHash: "not-exposed",
        staffIdentityId: admin.id,
        staffAuthorizationVersion: 1,
        createdAt: NOW,
        lastActivityAt: NOW,
        idleExpiresAt: new Date(NOW.getTime() + 60_000),
        absoluteExpiresAt: new Date(NOW.getTime() + 60_000),
        expiresAt: new Date(NOW.getTime() + 60_000),
      },
      permissions: [] as AuthPermission[],
      csrfToken: "csrf",
    };
    const app = express();
    app.use(requestContext);
    app.get("/anonymous", requirePermission(auth.service, "audit:read"), (_req, res) =>
      res.status(200).end(),
    );
    app.get(
      "/forbidden",
      (_req, res, next) => {
        res.locals.auth = context;
        next();
      },
      requirePermission(auth.service, "audit:read"),
      (_req, res) => res.status(200).end(),
    );
    app.get("/hidden", () => assertProtectedResourceVisible(false));
    app.use(errorHandler);

    const anonymous = await request(app).get("/anonymous");
    const forbidden = await request(app).get("/forbidden");
    const hidden = await request(app).get("/hidden");

    expect(anonymous.body).toMatchObject({ statusCode: 401, status: "error" });
    expect(forbidden.body).toMatchObject({ statusCode: 403, status: "error" });
    expect(hidden.body).toMatchObject({
      statusCode: 404,
      status: "error",
      message: "Resource not found.",
    });
  });
});
