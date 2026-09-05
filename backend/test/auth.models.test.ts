import { describe, expect, it } from "vitest";
import { AuthSessionModel } from "../src/modules/auth/auth-session.model.js";
import { validateProvisionAdminInput } from "../src/modules/auth/admin-provisioning.js";
import {
  createAuthCookieSettings,
  readCookie,
} from "../src/modules/auth/auth.cookies.js";
import { AuthCrypto, isOpaqueToken } from "../src/modules/auth/auth.crypto.js";
import { OidcTransactionModel } from "../src/modules/auth/oidc-transaction.model.js";
import { SecurityAuditEventModel } from "../src/modules/auth/security-audit-event.model.js";
import { StaffIdentityModel } from "../src/modules/auth/staff-identity.model.js";

const SECRET = "model-test-session-secret-at-least-32-characters";

function indexFor(
  indexes: ReturnType<typeof StaffIdentityModel.schema.indexes>,
  key: string,
) {
  return indexes.find(([fields]) => Object.keys(fields).join(",") === key);
}

describe("authentication persistence schemas", () => {
  it("defines a unique stable issuer/subject allowlist identity", async () => {
    const staff = new StaffIdentityModel({
      issuer: "https://tenant.us.auth0.com/",
      subject: "auth0|test-admin",
      displayName: "Test Administrator",
      email: " ADMIN@EXAMPLE.TEST ",
      role: "admin",
    });

    await expect(staff.validate()).resolves.toBeUndefined();
    expect(staff.email).toBe("admin@example.test");
    expect(staff.status).toBe("active");
    expect(staff.authorizationVersion).toBe(1);
    expect(
      indexFor(StaffIdentityModel.schema.indexes(), "issuer,subject")?.[1],
    ).toMatchObject({ unique: true });
  });

  it("keeps session and transaction lookup material unselected and TTL bounded", () => {
    expect(AuthSessionModel.schema.path("sessionHash").options.select).toBe(false);
    expect(OidcTransactionModel.schema.path("transactionHash").options.select).toBe(
      false,
    );
    expect(OidcTransactionModel.schema.path("stateHash").options.select).toBe(false);
    expect(OidcTransactionModel.schema.path("codeVerifier").options.select).toBe(false);
    expect(
      indexFor(AuthSessionModel.schema.indexes(), "sessionHash")?.[1],
    ).toMatchObject({ unique: true });
    expect(indexFor(AuthSessionModel.schema.indexes(), "expiresAt")?.[1]).toMatchObject(
      {
        expireAfterSeconds: 0,
      },
    );
    expect(
      indexFor(OidcTransactionModel.schema.indexes(), "expiresAt")?.[1],
    ).toMatchObject({ expireAfterSeconds: 0 });
  });

  it("limits audit details to non-sensitive structured fields", async () => {
    const event = new SecurityAuditEventModel({
      action: "auth.session.revoked",
      entityType: "session",
      entityId: "safe-database-session-id",
      outcome: "succeeded",
      requestId: "request-test",
      details: {
        reason: "rotation",
        message: "private inquiry message",
        token: "provider-token",
      },
      occurredAt: new Date(),
    });
    await expect(event.validate()).resolves.toBeUndefined();
    const serialized = JSON.stringify(event.toObject());
    expect(event.details?.reason).toBe("rotation");
    expect(serialized).not.toContain("private inquiry message");
    expect(serialized).not.toContain("provider-token");
  });
});

describe("authentication token and cookie controls", () => {
  it("generates opaque tokens and domain-separated keyed hashes", () => {
    const crypto = new AuthCrypto(SECRET);
    const token = crypto.randomToken();
    expect(isOpaqueToken(token)).toBe(true);
    expect(crypto.hashSession(token)).not.toBe(token);
    expect(crypto.hashSession(token)).not.toBe(crypto.hashTransaction(token));
    expect(crypto.csrfToken(token)).not.toBe(crypto.hashSession(token));
  });

  it("uses __Host- cookie names only with production secure-cookie settings", () => {
    const development = createAuthCookieSettings(false, 1_000, 1_000);
    const production = createAuthCookieSettings(true, 1_000, 1_000);
    expect(development.sessionName.startsWith("__Host-")).toBe(false);
    expect(production.sessionName).toBe("__Host-rc_session");
    expect(production.transactionName).toBe("__Host-rc_oidc_transaction");
  });

  it("treats malformed cookie encoding as absent", () => {
    expect(
      readCookie({ headers: { cookie: "rc_session=%E0%A4%A" } } as never, "rc_session"),
    ).toBeUndefined();
  });
});

describe("administrator bootstrap validation", () => {
  it("normalizes only the non-secret local allowlist fields", () => {
    expect(
      validateProvisionAdminInput({
        issuer: "https://tenant.us.auth0.com",
        subject: " auth0|admin-id ",
        displayName: " Test Administrator ",
        email: " ADMIN@EXAMPLE.TEST ",
        now: new Date("2026-09-05T00:00:00.000Z"),
      }),
    ).toEqual({
      issuer: "https://tenant.us.auth0.com/",
      subject: "auth0|admin-id",
      displayName: "Test Administrator",
      email: "admin@example.test",
      now: new Date("2026-09-05T00:00:00.000Z"),
    });
  });

  it("rejects malformed subjects and email addresses", () => {
    expect(() =>
      validateProvisionAdminInput({
        issuer: "https://tenant.us.auth0.com/",
        subject: "auth0|bad subject",
        displayName: "Test Administrator",
        email: "not-an-email",
      }),
    ).toThrow();
    expect(() =>
      validateProvisionAdminInput({
        issuer: "http://tenant.us.auth0.com/path",
        subject: "auth0|admin-id",
        displayName: "Test Administrator",
        email: "admin@example.test",
      }),
    ).toThrow(/issuer/);
  });
});
