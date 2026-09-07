import express, { type RequestHandler } from "express";
import type {
  AdminInquiryDetail,
  AdminInquiryListRequest,
  AdminPropertyDetail,
  AdminPropertyListRequest,
  CreateDraftPropertyRequest,
  AuthPermission,
  CurrentSessionResponse,
  PropertyFacetsResponse,
  PropertyMapResponse,
  PropertySearchResponse,
  UpdateDraftPropertyRequest,
  UpdatePropertyMediaRequest,
} from "@rc/shared";
import { API_PREFIX, AUTH_PERMISSIONS } from "@rc/shared";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { errorHandler, HttpError } from "../src/middleware/errorHandler.js";
import { requestContext } from "../src/middleware/requestContext.js";
import { createAuthCookieSettings } from "../src/modules/auth/auth.cookies.js";
import { AuthCrypto } from "../src/modules/auth/auth.crypto.js";
import { OidcVerificationError } from "../src/modules/auth/auth.oidc.js";
import { requirePermission } from "../src/modules/auth/auth.middleware.js";
import { createAuthRoutes } from "../src/modules/auth/auth.routes.js";
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
import type {
  AdminInquiryService,
  InquiryMutationContext,
} from "../src/modules/inquiries/inquiry.types.js";
import type {
  AdminPropertyService,
  PropertyMutationContext,
  PropertyService,
} from "../src/modules/properties/property.types.js";

const NOW = new Date("2026-09-05T08:00:00.000Z");
const ISSUER = "https://rc-premier-dev.us.auth0.com/";
const CALLBACK_URL = `http://localhost:5000${API_PREFIX}/auth/callback`;
const RETURN_URL = "http://localhost:3000/admin";
const ORIGIN = "http://localhost:3000";
const SECRET = "test-only-auth-session-secret-32-characters";
const ADMIN_PROPERTY_ID = "507f1f77bcf86cd799439011";
const ADMIN_INQUIRY_ID = "507f191e810c19729de860ea";
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

    const subject =
      code === "email-match-only"
        ? "different-subject"
        : ["unknown", "disabled", "unassigned"].includes(code)
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
      passkeyAuthenticated: code === "passkey-only",
      displayName: "Provider display name",
      email:
        code === "email-match-only" ? "admin@example.test" : "provider@example.test",
    };
  }
}

function makeAuth(options: { allowPasskeyOnly?: boolean } = {}) {
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
      allowPasskeyOnly: options.allowPasskeyOnly ?? true,
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

const ADMIN_PROPERTY: AdminPropertyDetail = {
  id: ADMIN_PROPERTY_ID,
  propertyId: "RCPP-ADMIN-001",
  slug: "private-draft-fixture",
  title: "Private draft fixture",
  purpose: "sale",
  propertyType: "house-and-lot",
  availability: "available",
  publicationStatus: "draft",
  featured: false,
  price: { amount: 7_500_000, currency: "PHP", negotiable: true },
  location: {
    province: "Pampanga",
    city: "Angeles City",
    publicPrecision: "city-only",
  },
  specifications: { bedrooms: 3, bathrooms: 2 },
  shortDescription: "A private test-only draft.",
  version: 0,
  description: "A private draft used only by the authentication integration suite.",
  highlights: [],
  amenities: [],
  features: [],
  gallery: [],
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
};

function makeAdminPropertyService() {
  const listRequests: AdminPropertyListRequest[] = [];
  const creates: Array<{
    input: CreateDraftPropertyRequest;
    context: PropertyMutationContext;
  }> = [];
  const updates: Array<{
    id: string;
    input: UpdateDraftPropertyRequest;
    context: PropertyMutationContext;
  }> = [];
  const mediaUpdates: Array<{
    id: string;
    input: UpdatePropertyMediaRequest;
    context: PropertyMutationContext;
  }> = [];
  let property = structuredClone(ADMIN_PROPERTY);
  const service: AdminPropertyService = {
    async listPrivate(listRequest) {
      listRequests.push(listRequest);
      const {
        description,
        specifications,
        highlights,
        amenities,
        features,
        coverMedia,
        gallery,
        createdAt,
        publishedAt,
        ...summary
      } = property;
      void description;
      void specifications;
      void highlights;
      void amenities;
      void features;
      void coverMedia;
      void gallery;
      void createdAt;
      void publishedAt;
      return {
        items: [summary],
        pagination: {
          page: listRequest.page,
          limit: listRequest.limit,
          total: 1,
          totalPages: 1,
        },
      };
    },
    async findPrivateById(id) {
      return id === property.id ? structuredClone(property) : null;
    },
    async createDraft(input, context) {
      creates.push({ input, context });
      property = {
        ...ADMIN_PROPERTY,
        ...input,
        price: { ...input.price, currency: "PHP" },
        availability: "available",
        publicationStatus: "draft",
      };
      return structuredClone(property);
    },
    async updateDraft(id, input, context) {
      updates.push({ id, input, context });
      if (id !== property.id || property.publicationStatus !== "draft") return null;
      property = {
        ...property,
        ...input,
        ...(input.price ? { price: { ...input.price, currency: "PHP" } } : {}),
        availability: property.availability,
        publicationStatus: property.publicationStatus,
        version: property.version + 1,
      };
      return structuredClone(property);
    },
    async updateMedia(id, input, context) {
      mediaUpdates.push({ id, input, context });
      if (id !== property.id || input.expectedVersion !== property.version) return null;
      const coverMedia = input.coverMediaId
        ? input.media.find((item) => item.id === input.coverMediaId)
        : undefined;
      property = {
        ...property,
        gallery: structuredClone(input.media),
        coverMedia: coverMedia ? structuredClone(coverMedia) : undefined,
        version: property.version + 1,
      };
      return structuredClone(property);
    },
    async publish(id, input) {
      if (id !== property.id || input.expectedVersion !== property.version) return null;
      property = {
        ...property,
        publicationStatus: "published",
        publishedAt: NOW.toISOString(),
        version: property.version + 1,
      };
      return structuredClone(property);
    },
    async unpublish(id, input) {
      if (id !== property.id || input.expectedVersion !== property.version) return null;
      property = {
        ...property,
        publicationStatus: "unpublished",
        version: property.version + 1,
      };
      return structuredClone(property);
    },
    async archive(id, input) {
      if (id !== property.id || input.expectedVersion !== property.version) return null;
      property = {
        ...property,
        publicationStatus: "archived",
        version: property.version + 1,
      };
      return structuredClone(property);
    },
    async restore(id, input) {
      if (id !== property.id || input.expectedVersion !== property.version) return null;
      property = {
        ...property,
        publicationStatus: "draft",
        version: property.version + 1,
      };
      return structuredClone(property);
    },
    async changeAvailability(id, input) {
      if (id !== property.id || input.expectedVersion !== property.version) return null;
      property = {
        ...property,
        availability: input.availability,
        version: property.version + 1,
      };
      return structuredClone(property);
    },
  };
  return { creates, listRequests, mediaUpdates, service, updates };
}

const ADMIN_INQUIRY: AdminInquiryDetail = {
  id: ADMIN_INQUIRY_ID,
  name: "Maria Inquiry",
  email: "maria@example.test",
  phone: "+63 917 555 0101",
  inquiryType: "property",
  source: "property-detail",
  propertyId: "RCPP-ADMIN-001",
  subject: "Private inquiry fixture",
  message: "Private inquiry message used only by the integration suite.",
  privacyConsentAt: NOW.toISOString(),
  status: "new",
  statusHistory: [{ toStatus: "new", changedAt: NOW.toISOString() }],
  internalNotes: [],
  version: 0,
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
};

function makeAdminInquiryService() {
  const listRequests: AdminInquiryListRequest[] = [];
  const mutations: Array<{ action: string; context: InquiryMutationContext }> = [];
  let inquiry = structuredClone(ADMIN_INQUIRY);
  let preSpamStatus: Exclude<AdminInquiryDetail["status"], "spam"> = "new";
  const update = (status: AdminInquiryDetail["status"]) => {
    const previous = inquiry.status;
    inquiry = {
      ...inquiry,
      status,
      statusHistory: [
        ...inquiry.statusHistory,
        { fromStatus: previous, toStatus: status, changedAt: NOW.toISOString() },
      ],
      version: inquiry.version + 1,
    };
    return structuredClone(inquiry);
  };
  const service: AdminInquiryService = {
    async list(request) {
      listRequests.push(request);
      const {
        phone,
        message,
        privacyConsentAt,
        internalNotes,
        statusHistory,
        ...summary
      } = inquiry;
      void phone;
      void message;
      void privacyConsentAt;
      void internalNotes;
      void statusHistory;
      return {
        items: [summary],
        pagination: {
          page: request.page,
          limit: request.limit,
          total: 1,
          totalPages: 1,
        },
      };
    },
    async detail(id) {
      return id === inquiry.id ? structuredClone(inquiry) : null;
    },
    async updateStatus(id, input, context) {
      mutations.push({ action: "status", context });
      return id === inquiry.id && input.expectedVersion === inquiry.version
        ? update(input.status)
        : null;
    },
    async updateViewingRequest(id, input, context) {
      mutations.push({ action: "viewing", context });
      return id === inquiry.id && input.expectedVersion === inquiry.version
        ? structuredClone(inquiry)
        : null;
    },
    async markSpam(id, input, context) {
      mutations.push({ action: "spam", context });
      if (id !== inquiry.id || input.expectedVersion !== inquiry.version) return null;
      if (inquiry.status !== "spam") preSpamStatus = inquiry.status;
      return update("spam");
    },
    async markNotSpam(id, input, context) {
      mutations.push({ action: "not-spam", context });
      return id === inquiry.id && input.expectedVersion === inquiry.version
        ? update(preSpamStatus)
        : null;
    },
    async addNote(id, input, context) {
      mutations.push({ action: "note", context });
      if (id !== inquiry.id || input.expectedVersion !== inquiry.version) return null;
      inquiry = {
        ...inquiry,
        internalNotes: [
          ...inquiry.internalNotes,
          {
            id: "507f191e810c19729de860eb",
            note: input.note,
            createdAt: NOW.toISOString(),
          },
        ],
        version: inquiry.version + 1,
      };
      return structuredClone(inquiry);
    },
    async archive(id, input, context) {
      mutations.push({ action: "archive", context });
      if (id !== inquiry.id || input.expectedVersion !== inquiry.version) return null;
      inquiry = {
        ...inquiry,
        archivedAt: NOW.toISOString(),
        version: inquiry.version + 1,
      };
      return structuredClone(inquiry);
    },
    async restore(id, input, context) {
      mutations.push({ action: "restore", context });
      if (id !== inquiry.id || input.expectedVersion !== inquiry.version) return null;
      const { archivedAt, ...restored } = inquiry;
      void archivedAt;
      inquiry = { ...restored, version: inquiry.version + 1 };
      return structuredClone(inquiry);
    },
  };
  return { listRequests, mutations, service };
}

function buildApp(
  auth: ReturnType<typeof makeAuth>,
  options: {
    adminProperties?: ReturnType<typeof makeAdminPropertyService>;
    readPermission?: RequestHandler;
    writePermission?: RequestHandler;
    publishPermission?: RequestHandler;
    availabilityPermission?: RequestHandler;
    adminInquiries?: ReturnType<typeof makeAdminInquiryService>;
    inquiryReadPermission?: RequestHandler;
    inquiryUpdatePermission?: RequestHandler;
  } = {},
) {
  return createApp({
    auth: {
      service: auth.service,
      cookies: auth.cookies,
      loginRateLimit: passThrough,
    },
    propertyService: makePropertyService(),
    adminPropertyService:
      options.adminProperties?.service ?? makeAdminPropertyService().service,
    ...(options.readPermission
      ? { adminPropertyReadPermission: options.readPermission }
      : {}),
    ...(options.writePermission
      ? { adminPropertyWritePermission: options.writePermission }
      : {}),
    ...(options.publishPermission
      ? { adminPropertyPublishPermission: options.publishPermission }
      : {}),
    ...(options.availabilityPermission
      ? { adminPropertyAvailabilityPermission: options.availabilityPermission }
      : {}),
    adminInquiryService:
      options.adminInquiries?.service ?? makeAdminInquiryService().service,
    ...(options.inquiryReadPermission
      ? { adminInquiryReadPermission: options.inquiryReadPermission }
      : {}),
    ...(options.inquiryUpdatePermission
      ? { adminInquiryUpdatePermission: options.inquiryUpdatePermission }
      : {}),
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

  it("fails safely when authentication is unavailable or no session exists", async () => {
    const unavailable = express();
    unavailable.use(
      `${API_PREFIX}/auth`,
      createAuthRoutes(
        {},
        {
          service: null,
          loginRateLimit: passThrough,
        },
      ),
    );
    unavailable.use(errorHandler);

    const notConfigured = await request(unavailable).get(`${API_PREFIX}/auth/session`);
    const anonymous = await request(buildApp(auth)).get(`${API_PREFIX}/auth/session`);

    expect(notConfigured.status).toBe(503);
    expect(notConfigured.body.message).toBe("Authentication is not configured.");
    expect(notConfigured.headers["cache-control"]).toBe("no-store");
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.message).toBe("Authentication required.");
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

  it("allows credentialed CORS only for the configured exact origin", async () => {
    const app = buildApp(auth);
    const allowed = await request(app)
      .options(`${API_PREFIX}/admin/properties`)
      .set("Origin", ORIGIN)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type,x-csrf-token");
    const hostile = await request(app)
      .options(`${API_PREFIX}/admin/properties`)
      .set("Origin", "https://attacker.invalid")
      .set("Access-Control-Request-Method", "POST");

    expect(allowed.status).toBe(204);
    expect(allowed.headers["access-control-allow-origin"]).toBe(ORIGIN);
    expect(allowed.headers["access-control-allow-credentials"]).toBe("true");
    expect(allowed.headers["access-control-allow-origin"]).not.toBe("*");
    expect(hostile.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("rejects return URLs unless they exactly match the configured allowlist", async () => {
    const app = buildApp(auth);
    for (const returnTo of [
      "http://localhost:3000/admin/extra",
      "http://localhost:3000/admin?next=https://attacker.invalid",
      "https://attacker.invalid/admin",
      "http://localhost:3000.evil.invalid/admin",
      "//attacker.invalid/admin",
      "javascript:alert(1)",
      "%2F%2Fattacker.invalid%2Fadmin",
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

  it("rejects missing, duplicate, and expired stateful login transactions", async () => {
    const app = buildApp(auth);

    const missingStart = await request(app).get(`${API_PREFIX}/auth/login`);
    const missing = await request(app)
      .get(`${API_PREFIX}/auth/callback`)
      .query({ code: "valid" })
      .set("Cookie", cookiePair(missingStart, auth.cookies.transactionName));

    const duplicateStart = await request(app).get(`${API_PREFIX}/auth/login`);
    const duplicate = await request(app)
      .get(`${API_PREFIX}/auth/callback`)
      .query({ code: "valid", state: [stateFrom(duplicateStart), "attacker-state"] })
      .set("Cookie", cookiePair(duplicateStart, auth.cookies.transactionName));

    const expiredStart = await request(app).get(`${API_PREFIX}/auth/login`);
    const transaction = [...auth.store.transactions.values()].find(
      (candidate) =>
        candidate.stateHash ===
        new AuthCrypto(SECRET).hashState(stateFrom(expiredStart)),
    );
    if (!transaction) throw new Error("Missing transaction fixture");
    transaction.expiresAt = new Date(0);
    const expired = await request(app)
      .get(`${API_PREFIX}/auth/callback`)
      .query({ code: "valid", state: stateFrom(expiredStart) })
      .set("Cookie", cookiePair(expiredStart, auth.cookies.transactionName));

    for (const response of [missing, duplicate, expired]) {
      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Authentication failed.");
    }
    expect(auth.store.sessions.size).toBe(0);
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
    "incorrect-assurance",
    "email-match-only",
  ])("does not issue a session for %s staff", async (code) => {
    const { callback } = await startAndComplete(buildApp(auth), auth.cookies, code);
    expect(callback.status).toBe(401);
    expect(callback.body.message).toBe("Authentication failed.");
    expect(auth.store.sessions.size).toBe(0);
  });

  it("accepts signed passkey evidence only when the non-production policy allows it", async () => {
    const development = makeAuth({ allowPasskeyOnly: true });
    const developmentResult = await startAndComplete(
      buildApp(development),
      development.cookies,
      "passkey-only",
    );
    expect(developmentResult.callback.status).toBe(303);

    const production = makeAuth({ allowPasskeyOnly: false });
    const productionResult = await startAndComplete(
      buildApp(production),
      production.cookies,
      "passkey-only",
    );
    expect(productionResult.callback.status).toBe(401);
    expect(production.store.sessions.size).toBe(0);
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

  it("extends idle activity only up to the immutable absolute lifetime", async () => {
    const app = buildApp(auth);
    const login = await startAndComplete(app, auth.cookies);
    const sessionToken = cookiePair(login.callback, auth.cookies.sessionName).split(
      "=",
    )[1];
    const session = [...auth.store.sessions.values()].at(-1);
    if (!sessionToken || !session) throw new Error("Missing session fixture");

    for (let minutes = 6; minutes < 8 * 60; minutes += 6) {
      await auth.service.authenticate(
        sessionToken,
        `activity-${minutes}`,
        new Date(session.createdAt.getTime() + minutes * 60_000),
      );
      expect(session.expiresAt.getTime()).toBeLessThanOrEqual(
        session.absoluteExpiresAt.getTime(),
      );
    }

    await expect(
      auth.service.authenticate(
        sessionToken,
        "absolute-boundary",
        new Date(session.absoluteExpiresAt),
      ),
    ).rejects.toMatchObject({ status: 401, message: "Authentication required." });
  });

  it("fails closed when the session or staff store is unavailable", async () => {
    const databaseCredential = "database-password-must-not-escape";
    auth.store.findSessionByHash = async () => {
      throw new Error(`MongoDB unavailable: mongodb://staff:${databaseCredential}@db`);
    };

    const response = await request(buildApp(auth))
      .get(`${API_PREFIX}/auth/session`)
      .set(
        "Cookie",
        `${auth.cookies.sessionName}=${new AuthCrypto(SECRET).randomToken()}`,
      );

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: "error",
      statusCode: 503,
      message: "Authentication service is unavailable.",
    });
    expect(JSON.stringify(response.body)).not.toContain(databaseCredential);
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

const ADMIN_CREATE_REQUEST: CreateDraftPropertyRequest = {
  propertyId: "RCPP-ADMIN-NEW",
  slug: "new-private-draft",
  title: "New private draft",
  purpose: "sale",
  propertyType: "house-and-lot",
  featured: false,
  price: { amount: 6_500_000, negotiable: false },
  location: {
    province: "Pampanga",
    city: "Angeles City",
    publicPrecision: "city-only",
  },
  specifications: { bedrooms: 3, bathrooms: 2 },
  shortDescription: "A new test-only property draft.",
  description: "Detailed content for the new test-only property draft.",
  highlights: [],
  amenities: [],
  features: [],
};

const ADMIN_LOCATION_UPDATE = {
  expectedVersion: 0,
  location: {
    province: "Pampanga",
    city: "Angeles City",
    barangay: "Synthetic Barangay",
    publicPrecision: "approximate" as const,
    privateAddress: "99 Synthetic Test Street",
    coordinates: { latitude: 15.101, longitude: 120.601 },
    publicPoint: {
      type: "Point" as const,
      coordinates: [120.61, 15.15] as [number, number],
    },
  },
};

async function authenticatedAdmin(
  app: ReturnType<typeof buildApp>,
  auth: ReturnType<typeof makeAuth>,
) {
  const login = await startAndComplete(app, auth.cookies);
  const cookie = cookiePair(login.callback, auth.cookies.sessionName);
  const session = await request(app)
    .get(`${API_PREFIX}/auth/session`)
    .set("Cookie", cookie);
  return {
    cookie,
    csrfToken: (session.body as CurrentSessionResponse).csrfToken,
  };
}

describe("Phase 3A admin property HTTP boundary", () => {
  it("returns 401 for anonymous access to every private property endpoint", async () => {
    const auth = makeAuth();
    const app = buildApp(auth);
    const responses = await Promise.all([
      request(app).get(`${API_PREFIX}/admin/properties`),
      request(app).get(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}`),
      request(app).post(`${API_PREFIX}/admin/properties`).send(ADMIN_CREATE_REQUEST),
      request(app)
        .patch(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}`)
        .send({ title: "Anonymous edit" }),
      request(app)
        .put(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}/media`)
        .send({ expectedVersion: 0, media: [] }),
      request(app)
        .post(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}/publish`)
        .send({ expectedVersion: 0 }),
      request(app)
        .post(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}/unpublish`)
        .send({ expectedVersion: 0 }),
      request(app)
        .post(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}/archive`)
        .send({ expectedVersion: 0 }),
      request(app)
        .post(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}/restore`)
        .send({ expectedVersion: 0 }),
      request(app)
        .patch(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}/availability`)
        .send({ expectedVersion: 0, availability: "reserved" }),
    ]);

    expect(responses.map((response) => response.status)).toEqual([
      401, 401, 401, 401, 401, 401, 401, 401, 401, 401,
    ]);
    for (const response of responses) {
      expect(response.body).toMatchObject({ status: "error", statusCode: 401 });
    }
  });

  it("returns 403 for authenticated sessions denied by the injected permission boundary", async () => {
    const auth = makeAuth();
    const deny: RequestHandler = (_req, _res, next) =>
      next(new HttpError(403, "Permission denied."));
    const app = buildApp(auth, {
      readPermission: deny,
      writePermission: deny,
      publishPermission: deny,
      availabilityPermission: deny,
    });
    const session = await authenticatedAdmin(app, auth);
    const readResponses = await Promise.all([
      request(app).get(`${API_PREFIX}/admin/properties`).set("Cookie", session.cookie),
      request(app)
        .get(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}`)
        .set("Cookie", session.cookie),
    ]);
    const writeResponses = await Promise.all([
      request(app)
        .post(`${API_PREFIX}/admin/properties`)
        .set("Cookie", session.cookie)
        .set("Origin", ORIGIN)
        .set("X-CSRF-Token", session.csrfToken)
        .send(ADMIN_CREATE_REQUEST),
      request(app)
        .patch(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}`)
        .set("Cookie", session.cookie)
        .set("Origin", ORIGIN)
        .set("X-CSRF-Token", session.csrfToken)
        .send({ title: "Denied edit" }),
      request(app)
        .put(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}/media`)
        .set("Cookie", session.cookie)
        .set("Origin", ORIGIN)
        .set("X-CSRF-Token", session.csrfToken)
        .send({ expectedVersion: 0, media: [] }),
      request(app)
        .post(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}/publish`)
        .set("Cookie", session.cookie)
        .set("Origin", ORIGIN)
        .set("X-CSRF-Token", session.csrfToken)
        .send({ expectedVersion: 0 }),
      request(app)
        .patch(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}/availability`)
        .set("Cookie", session.cookie)
        .set("Origin", ORIGIN)
        .set("X-CSRF-Token", session.csrfToken)
        .send({ expectedVersion: 0, availability: "reserved" }),
    ]);

    for (const response of [...readResponses, ...writeResponses]) {
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ status: "error", statusCode: 403 });
    }
  });

  it("rejects missing, invalid, and cross-session CSRF tokens on every write", async () => {
    const auth = makeAuth();
    const adminProperties = makeAdminPropertyService();
    const app = buildApp(auth, { adminProperties });
    const first = await authenticatedAdmin(app, auth);
    const second = await authenticatedAdmin(app, auth);
    const writes = [
      () =>
        request(app)
          .post(`${API_PREFIX}/admin/properties`)
          .set("Cookie", first.cookie)
          .set("Origin", ORIGIN)
          .send(ADMIN_CREATE_REQUEST),
      () =>
        request(app)
          .patch(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}`)
          .set("Cookie", first.cookie)
          .set("Origin", ORIGIN)
          .send(ADMIN_LOCATION_UPDATE),
      () =>
        request(app)
          .put(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}/media`)
          .set("Cookie", first.cookie)
          .set("Origin", ORIGIN)
          .send({ expectedVersion: 0, media: [] }),
    ];

    for (const write of writes) {
      expect((await write()).status).toBe(403);
    }
    for (const csrfToken of ["incorrect-csrf", second.csrfToken]) {
      for (const write of writes) {
        const response = await write().set("X-CSRF-Token", csrfToken);
        expect(response.status).toBe(403);
      }
    }
    expect(adminProperties.creates).toHaveLength(0);
    expect(adminProperties.updates).toHaveLength(0);
    expect(adminProperties.mediaUpdates).toHaveLength(0);
  });

  it("rejects a disallowed origin on every write", async () => {
    const auth = makeAuth();
    const adminProperties = makeAdminPropertyService();
    const app = buildApp(auth, { adminProperties });
    const session = await authenticatedAdmin(app, auth);
    const responses = await Promise.all([
      request(app)
        .post(`${API_PREFIX}/admin/properties`)
        .set("Cookie", session.cookie)
        .set("Origin", "https://attacker.invalid")
        .set("X-CSRF-Token", session.csrfToken)
        .send(ADMIN_CREATE_REQUEST),
      request(app)
        .patch(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}`)
        .set("Cookie", session.cookie)
        .set("Origin", "https://attacker.invalid")
        .set("X-CSRF-Token", session.csrfToken)
        .send(ADMIN_LOCATION_UPDATE),
      request(app)
        .put(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}/media`)
        .set("Cookie", session.cookie)
        .set("Origin", "https://attacker.invalid")
        .set("X-CSRF-Token", session.csrfToken)
        .send({ expectedVersion: 0, media: [] }),
    ]);

    expect(responses.map((response) => response.status)).toEqual([403, 403, 403]);
    expect(adminProperties.creates).toHaveLength(0);
    expect(adminProperties.updates).toHaveLength(0);
    expect(adminProperties.mediaUpdates).toHaveLength(0);
  });

  it("allows administrators to list, read, create, and edit drafts", async () => {
    const auth = makeAuth();
    const adminProperties = makeAdminPropertyService();
    const app = buildApp(auth, { adminProperties });
    const session = await authenticatedAdmin(app, auth);

    const list = await request(app)
      .get(`${API_PREFIX}/admin/properties`)
      .query({ publicationStatus: "draft", page: "1", limit: "25" })
      .set("Cookie", session.cookie);
    const detail = await request(app)
      .get(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}`)
      .set("Cookie", session.cookie);
    const created = await request(app)
      .post(`${API_PREFIX}/admin/properties`)
      .set("Cookie", session.cookie)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", session.csrfToken)
      .send(ADMIN_CREATE_REQUEST);
    const edited = await request(app)
      .patch(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}`)
      .set("Cookie", session.cookie)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", session.csrfToken)
      .send({ title: "Edited private draft", expectedVersion: 0 });
    const media = await request(app)
      .put(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}/media`)
      .set("Cookie", session.cookie)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", session.csrfToken)
      .send({
        expectedVersion: 1,
        media: [
          {
            id: "media-http-0001",
            kind: "image",
            url: "/media/properties/http-test.webp",
            alt: "HTTP boundary test image",
            source: "production",
          },
        ],
        coverMediaId: "media-http-0001",
      });

    expect(list.status).toBe(200);
    expect(list.headers["cache-control"]).toBe("no-store");
    expect(list.body.items[0]).toMatchObject({ publicationStatus: "draft" });
    expect(detail.status).toBe(200);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      publicationStatus: "draft",
      availability: "available",
    });
    expect(edited.status).toBe(200);
    expect(edited.body.title).toBe("Edited private draft");
    expect(media.status).toBe(200);
    expect(media.body).toMatchObject({
      coverMedia: { id: "media-http-0001" },
      gallery: [{ id: "media-http-0001" }],
      version: 2,
    });
    expect(adminProperties.creates[0]?.input).not.toHaveProperty("publicationStatus");
    expect(adminProperties.creates[0]?.context.actorStaffIdentityId).toMatch(/^staff-/);
    expect(adminProperties.updates[0]?.input).toEqual({
      title: "Edited private draft",
      expectedVersion: 0,
    });
    expect(adminProperties.mediaUpdates[0]?.input.coverMediaId).toBe("media-http-0001");
  });

  it("returns private location only through the authenticated detail/edit workflow", async () => {
    const auth = makeAuth();
    const adminProperties = makeAdminPropertyService();
    const app = buildApp(auth, { adminProperties });
    const session = await authenticatedAdmin(app, auth);
    const headers = {
      Cookie: session.cookie,
      Origin: ORIGIN,
      "X-CSRF-Token": session.csrfToken,
    };

    const edited = await request(app)
      .patch(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}`)
      .set(headers)
      .send(ADMIN_LOCATION_UPDATE);
    const detail = await request(app)
      .get(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}`)
      .set("Cookie", session.cookie);

    expect(edited.status).toBe(200);
    expect(edited.headers["cache-control"]).toBe("no-store");
    expect(edited.body.location).toEqual(ADMIN_LOCATION_UPDATE.location);
    expect(detail.body.location).toEqual(ADMIN_LOCATION_UPDATE.location);
    expect(adminProperties.updates[0]?.input).toEqual(ADMIN_LOCATION_UPDATE);
  });

  it("rejects unknown, invalid, lifecycle, and non-JSON write bodies", async () => {
    const auth = makeAuth();
    const adminProperties = makeAdminPropertyService();
    const app = buildApp(auth, { adminProperties });
    const session = await authenticatedAdmin(app, auth);
    const headers = {
      Cookie: session.cookie,
      Origin: ORIGIN,
      "X-CSRF-Token": session.csrfToken,
    };
    const attempts = await Promise.all([
      request(app)
        .post(`${API_PREFIX}/admin/properties`)
        .set(headers)
        .send({ ...ADMIN_CREATE_REQUEST, publicationStatus: "published" }),
      request(app)
        .post(`${API_PREFIX}/admin/properties`)
        .set(headers)
        .send({ ...ADMIN_CREATE_REQUEST, unknown: "raw value" }),
      request(app)
        .patch(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}`)
        .set(headers)
        .send({ availability: "sold" }),
      request(app)
        .patch(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}`)
        .set(headers)
        .send({ price: { amount: -1, negotiable: false } }),
    ]);
    const nonJson = await request(app)
      .post(`${API_PREFIX}/admin/properties`)
      .set(headers)
      .type("form")
      .send({ title: "Not JSON" });

    expect(attempts.map((response) => response.status)).toEqual([400, 400, 400, 400]);
    expect(nonJson.status).toBe(415);
    expect(adminProperties.creates).toHaveLength(0);
    expect(adminProperties.updates).toHaveLength(0);
  });

  it("supports authorized publish, availability, unpublish, archive, and restore actions", async () => {
    const auth = makeAuth();
    const adminProperties = makeAdminPropertyService();
    const app = buildApp(auth, { adminProperties });
    const session = await authenticatedAdmin(app, auth);
    const headers = {
      Cookie: session.cookie,
      Origin: ORIGIN,
      "X-CSRF-Token": session.csrfToken,
    };

    const published = await request(app)
      .post(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}/publish`)
      .set(headers)
      .send({ expectedVersion: 0 });
    const reserved = await request(app)
      .patch(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}/availability`)
      .set(headers)
      .send({ expectedVersion: 1, availability: "reserved" });
    const unpublished = await request(app)
      .post(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}/unpublish`)
      .set(headers)
      .send({ expectedVersion: 2 });
    const archived = await request(app)
      .post(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}/archive`)
      .set(headers)
      .send({ expectedVersion: 3 });
    const restored = await request(app)
      .post(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}/restore`)
      .set(headers)
      .send({ expectedVersion: 4 });

    expect(published.body).toMatchObject({
      publicationStatus: "published",
      version: 1,
    });
    expect(reserved.body).toMatchObject({ availability: "reserved", version: 2 });
    expect(unpublished.body).toMatchObject({
      publicationStatus: "unpublished",
      version: 3,
    });
    expect(archived.body).toMatchObject({ publicationStatus: "archived", version: 4 });
    expect(restored.body).toMatchObject({ publicationStatus: "draft", version: 5 });
  });

  it("keeps a privately readable draft unavailable through public property routes", async () => {
    const auth = makeAuth();
    const app = buildApp(auth);
    const session = await authenticatedAdmin(app, auth);
    const privateDetail = await request(app)
      .get(`${API_PREFIX}/admin/properties/${ADMIN_PROPERTY_ID}`)
      .set("Cookie", session.cookie);
    const publicDetail = await request(app).get(
      `${API_PREFIX}/properties/${ADMIN_PROPERTY.slug}`,
    );

    expect(privateDetail.status).toBe(200);
    expect(publicDetail.status).toBe(404);
  });

  it.each(["malformed", "expired", "revoked", "disabled"] as const)(
    "rejects a %s session at the private property boundary",
    async (state) => {
      const auth = makeAuth();
      const app = buildApp(auth);
      let cookie = `${auth.cookies.sessionName}=malformed`;
      if (state !== "malformed") {
        const session = await authenticatedAdmin(app, auth);
        cookie = session.cookie;
        const stored = [...auth.store.sessions.values()].at(-1);
        if (!stored) throw new Error("Missing session fixture");
        if (state === "expired") stored.idleExpiresAt = new Date(0);
        if (state === "revoked") stored.revokedAt = new Date();
        if (state === "disabled") {
          const staff = auth.store.staff.get(stored.staffIdentityId);
          if (!staff) throw new Error("Missing staff fixture");
          staff.status = "disabled";
        }
      }

      const response = await request(app)
        .get(`${API_PREFIX}/admin/properties`)
        .set("Cookie", cookie);
      expect(response.status).toBe(401);
    },
  );
});

describe("staff inquiry management HTTP boundary", () => {
  it("rejects anonymous access to every private inquiry operation", async () => {
    const app = buildApp(makeAuth());
    const responses = await Promise.all([
      request(app).get(`${API_PREFIX}/admin/inquiries`),
      request(app).get(`${API_PREFIX}/admin/inquiries/${ADMIN_INQUIRY_ID}`),
      request(app)
        .patch(`${API_PREFIX}/admin/inquiries/${ADMIN_INQUIRY_ID}/status`)
        .send({ status: "in-progress", expectedVersion: 0 }),
      request(app)
        .patch(`${API_PREFIX}/admin/inquiries/${ADMIN_INQUIRY_ID}/viewing`)
        .send({
          status: "confirmed",
          requestedDate: "2030-09-20",
          requestedTime: "10:30",
          expectedVersion: 0,
        }),
      request(app)
        .post(`${API_PREFIX}/admin/inquiries/${ADMIN_INQUIRY_ID}/notes`)
        .send({ note: "Private note", expectedVersion: 0 }),
      request(app)
        .post(`${API_PREFIX}/admin/inquiries/${ADMIN_INQUIRY_ID}/spam`)
        .send({ expectedVersion: 0 }),
      request(app)
        .post(`${API_PREFIX}/admin/inquiries/${ADMIN_INQUIRY_ID}/not-spam`)
        .send({ expectedVersion: 0 }),
      request(app)
        .post(`${API_PREFIX}/admin/inquiries/${ADMIN_INQUIRY_ID}/archive`)
        .send({ expectedVersion: 0 }),
      request(app)
        .post(`${API_PREFIX}/admin/inquiries/${ADMIN_INQUIRY_ID}/restore`)
        .send({ expectedVersion: 0 }),
    ]);
    expect(responses.map((response) => response.status)).toEqual([
      401, 401, 401, 401, 401, 401, 401, 401, 401,
    ]);
  });

  it("enforces read and update permissions after authentication", async () => {
    const auth = makeAuth();
    const deny: RequestHandler = (_req, _res, next) =>
      next(new HttpError(403, "Permission denied."));
    const app = buildApp(auth, {
      inquiryReadPermission: deny,
      inquiryUpdatePermission: deny,
    });
    const session = await authenticatedAdmin(app, auth);
    const read = await request(app)
      .get(`${API_PREFIX}/admin/inquiries`)
      .set("Cookie", session.cookie);
    const write = await request(app)
      .post(`${API_PREFIX}/admin/inquiries/${ADMIN_INQUIRY_ID}/spam`)
      .set("Cookie", session.cookie)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", session.csrfToken)
      .send({ expectedVersion: 0 });
    expect(read.status).toBe(403);
    expect(write.status).toBe(403);
  });

  it("returns authorized list/detail and normalizes bounded search filters", async () => {
    const auth = makeAuth();
    const adminInquiries = makeAdminInquiryService();
    const app = buildApp(auth, { adminInquiries });
    const session = await authenticatedAdmin(app, auth);
    const list = await request(app)
      .get(`${API_PREFIX}/admin/inquiries`)
      .query({
        query: " Maria ",
        status: "new",
        inquiryType: "property",
        source: "property-detail",
        propertyId: "rcpp-admin-001",
        queue: "all",
        page: "2",
        limit: "25",
      })
      .set("Cookie", session.cookie);
    const detail = await request(app)
      .get(`${API_PREFIX}/admin/inquiries/${ADMIN_INQUIRY_ID}`)
      .set("Cookie", session.cookie);

    expect(list.status).toBe(200);
    expect(list.headers["cache-control"]).toBe("no-store");
    expect(list.body.items[0]).not.toHaveProperty("message");
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({
      id: ADMIN_INQUIRY_ID,
      propertyId: "RCPP-ADMIN-001",
      status: "new",
    });
    expect(adminInquiries.listRequests).toEqual([
      {
        query: "Maria",
        status: "new",
        inquiryType: "property",
        source: "property-detail",
        propertyId: "RCPP-ADMIN-001",
        queue: "all",
        page: 2,
        limit: 25,
      },
    ]);
  });

  it("updates workflow, spam quarantine, notes, and archive using CSRF-protected actions", async () => {
    const auth = makeAuth();
    const adminInquiries = makeAdminInquiryService();
    const app = buildApp(auth, { adminInquiries });
    const session = await authenticatedAdmin(app, auth);
    const headers = {
      Cookie: session.cookie,
      Origin: ORIGIN,
      "X-CSRF-Token": session.csrfToken,
    };
    const status = await request(app)
      .patch(`${API_PREFIX}/admin/inquiries/${ADMIN_INQUIRY_ID}/status`)
      .set(headers)
      .send({ status: "in-progress", expectedVersion: 0 });
    const spam = await request(app)
      .post(`${API_PREFIX}/admin/inquiries/${ADMIN_INQUIRY_ID}/spam`)
      .set(headers)
      .send({ expectedVersion: 1 });
    const notSpam = await request(app)
      .post(`${API_PREFIX}/admin/inquiries/${ADMIN_INQUIRY_ID}/not-spam`)
      .set(headers)
      .send({ expectedVersion: 2 });
    const note = await request(app)
      .post(`${API_PREFIX}/admin/inquiries/${ADMIN_INQUIRY_ID}/notes`)
      .set(headers)
      .send({ note: "Followed up by phone.", expectedVersion: 3 });
    const archived = await request(app)
      .post(`${API_PREFIX}/admin/inquiries/${ADMIN_INQUIRY_ID}/archive`)
      .set(headers)
      .send({ expectedVersion: 4 });
    const restored = await request(app)
      .post(`${API_PREFIX}/admin/inquiries/${ADMIN_INQUIRY_ID}/restore`)
      .set(headers)
      .send({ expectedVersion: 5 });

    expect(status.body).toMatchObject({ status: "in-progress", version: 1 });
    expect(spam.body).toMatchObject({ status: "spam", version: 2 });
    expect(notSpam.body).toMatchObject({ status: "in-progress", version: 3 });
    expect(note.body.internalNotes).toHaveLength(1);
    expect(archived.body).toHaveProperty("archivedAt");
    expect(restored.body).not.toHaveProperty("archivedAt");
    expect(adminInquiries.mutations.map((mutation) => mutation.action)).toEqual([
      "status",
      "spam",
      "not-spam",
      "note",
      "archive",
      "restore",
    ]);
    expect(adminInquiries.mutations[0]?.context.actorStaffIdentityId).toMatch(
      /^staff-/,
    );
  });

  it("rejects unsafe pagination, operator input, invalid writes, missing CSRF, and missing records", async () => {
    const auth = makeAuth();
    const adminInquiries = makeAdminInquiryService();
    const app = buildApp(auth, { adminInquiries });
    const session = await authenticatedAdmin(app, auth);
    const headers = {
      Cookie: session.cookie,
      Origin: ORIGIN,
      "X-CSRF-Token": session.csrfToken,
    };
    const responses = await Promise.all([
      request(app)
        .get(`${API_PREFIX}/admin/inquiries?limit=101`)
        .set("Cookie", session.cookie),
      request(app)
        .get(`${API_PREFIX}/admin/inquiries?query%5B%24ne%5D=x`)
        .set("Cookie", session.cookie),
      request(app)
        .get(`${API_PREFIX}/admin/inquiries/not-an-id`)
        .set("Cookie", session.cookie),
      request(app)
        .patch(`${API_PREFIX}/admin/inquiries/${ADMIN_INQUIRY_ID}/status`)
        .set(headers)
        .send({ status: "spam", expectedVersion: 0 }),
      request(app)
        .post(`${API_PREFIX}/admin/inquiries/${ADMIN_INQUIRY_ID}/notes`)
        .set(headers)
        .send({ note: "x".repeat(1_001), expectedVersion: 0 }),
      request(app)
        .post(`${API_PREFIX}/admin/inquiries/${ADMIN_INQUIRY_ID}/archive`)
        .set(headers)
        .send({}),
      request(app)
        .get(`${API_PREFIX}/admin/inquiries/507f191e810c19729de860ff`)
        .set("Cookie", session.cookie),
    ]);
    const noCsrf = await request(app)
      .post(`${API_PREFIX}/admin/inquiries/${ADMIN_INQUIRY_ID}/spam`)
      .set("Cookie", session.cookie)
      .set("Origin", ORIGIN)
      .send({ expectedVersion: 0 });

    expect(responses.map((response) => response.status)).toEqual([
      400, 400, 400, 400, 400, 400, 404,
    ]);
    expect(noCsrf.status).toBe(403);
    expect(adminInquiries.mutations).toHaveLength(0);
  });
});
