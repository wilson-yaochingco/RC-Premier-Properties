import type { AuthPermission, CurrentSessionResponse, StaffRole } from "@rc/shared";
import { HttpError } from "../../middleware/errorHandler.js";
import { ROLE_PERMISSIONS } from "./auth.constants.js";
import { AuthCrypto, isOpaqueToken } from "./auth.crypto.js";
import type {
  AuditReason,
  AuthenticatedContext,
  AuthServiceConfig,
  AuthStore,
  OidcProvider,
  SecurityAuditEventInput,
  SessionRevocationReason,
  StaffIdentityRecord,
} from "./auth.types.js";

const AUTHENTICATION_FAILED = "Authentication failed.";
const SESSION_REQUIRED = "Authentication required.";

export interface LoginStartResult {
  authorizationUrl: string;
  transactionToken: string;
}

export interface LoginCompletionResult {
  returnTo: string;
  sessionToken: string;
}

function earliest(left: Date, right: Date): Date {
  return left.getTime() <= right.getTime() ? left : right;
}

function isAssignedActiveAdmin(
  staff: StaffIdentityRecord,
): staff is StaffIdentityRecord & { role: StaffRole } {
  return staff.status === "active" && staff.role === "admin";
}

export class AuthService {
  constructor(
    private readonly store: AuthStore,
    private readonly provider: OidcProvider,
    private readonly crypto: AuthCrypto,
    readonly config: AuthServiceConfig,
  ) {}

  async startLogin(
    requestedReturnTo: string | undefined,
    now = new Date(),
  ): Promise<LoginStartResult> {
    const returnTo = this.returnUrl(requestedReturnTo);
    let request;
    try {
      request = await this.provider.createAuthorizationRequest();
    } catch {
      throw new HttpError(503, "Authentication service is unavailable.");
    }

    const transactionToken = this.crypto.randomToken();
    await this.store.createOidcTransaction({
      transactionHash: this.crypto.hashTransaction(transactionToken),
      stateHash: this.crypto.hashState(request.state),
      nonce: request.nonce,
      codeVerifier: request.codeVerifier,
      returnTo,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.config.transactionLifetimeMs),
    });
    return { authorizationUrl: request.authorizationUrl, transactionToken };
  }

  async completeLogin(input: {
    transactionToken: string | undefined;
    previousSessionToken: string | undefined;
    callbackUrl: URL;
    requestId: string;
    now?: Date;
  }): Promise<LoginCompletionResult> {
    const now = input.now ?? new Date();
    if (!input.transactionToken || !isOpaqueToken(input.transactionToken)) {
      await this.failedLogin("invalid-callback", input.requestId, now);
      throw new HttpError(401, AUTHENTICATION_FAILED);
    }

    const transaction = await this.store.consumeOidcTransaction(
      this.crypto.hashTransaction(input.transactionToken),
      now,
    );
    if (!transaction) {
      await this.failedLogin("invalid-callback", input.requestId, now);
      throw new HttpError(401, AUTHENTICATION_FAILED);
    }

    const states = input.callbackUrl.searchParams.getAll("state");
    if (
      states.length !== 1 ||
      !states[0] ||
      !this.crypto.equals(this.crypto.hashState(states[0]), transaction.stateHash)
    ) {
      await this.failedLogin("invalid-state", input.requestId, now);
      throw new HttpError(401, AUTHENTICATION_FAILED);
    }

    let identity;
    try {
      identity = await this.provider.completeAuthorization({
        callbackUrl: input.callbackUrl,
        expectedState: states[0],
        expectedNonce: transaction.nonce,
        codeVerifier: transaction.codeVerifier,
      });
    } catch {
      await this.failedLogin("invalid-callback", input.requestId, now);
      throw new HttpError(401, AUTHENTICATION_FAILED);
    }

    if (identity.issuer !== this.config.issuerUrl) {
      await this.failedLogin("invalid-callback", input.requestId, now);
      throw new HttpError(401, AUTHENTICATION_FAILED);
    }

    const staff = await this.store.findStaffByExternalIdentity(
      identity.issuer,
      identity.subject,
    );
    if (!staff) {
      await this.failedLogin("unknown-staff", input.requestId, now);
      throw new HttpError(401, AUTHENTICATION_FAILED);
    }
    if (staff.status !== "active") {
      await this.failedLogin("disabled-staff", input.requestId, now, staff.id);
      throw new HttpError(401, AUTHENTICATION_FAILED);
    }
    if (!staff.role) {
      await this.failedLogin("unassigned-staff", input.requestId, now, staff.id);
      throw new HttpError(401, AUTHENTICATION_FAILED);
    }
    if (!identity.authenticationMethods.includes(this.config.requiredAmr)) {
      await this.failedLogin("insufficient-assurance", input.requestId, now, staff.id);
      throw new HttpError(401, AUTHENTICATION_FAILED);
    }

    if (input.previousSessionToken && isOpaqueToken(input.previousSessionToken)) {
      const rotatedSession = await this.store.revokeSessionByHash(
        this.crypto.hashSession(input.previousSessionToken),
        now,
        "rotation",
      );
      if (rotatedSession) {
        await this.recordSessionRevocation(
          rotatedSession.id,
          "rotation",
          input.requestId,
          now,
        );
      }
    }

    const sessionToken = this.crypto.randomToken();
    const idleExpiresAt = new Date(now.getTime() + this.config.sessionIdleMs);
    const absoluteExpiresAt = new Date(now.getTime() + this.config.sessionAbsoluteMs);
    const sessionResult = await this.store.createSession(
      {
        sessionHash: this.crypto.hashSession(sessionToken),
        staffIdentityId: staff.id,
        staffAuthorizationVersion: staff.authorizationVersion,
        createdAt: now,
        lastActivityAt: now,
        idleExpiresAt,
        absoluteExpiresAt,
        expiresAt: earliest(idleExpiresAt, absoluteExpiresAt),
      },
      this.config.maxConcurrentSessions,
    );
    await this.recordSessionRevocations(
      sessionResult.revokedSessionIds,
      "concurrent-limit",
      input.requestId,
      now,
    );
    const session = sessionResult.session;
    await this.store.markStaffLogin(staff.id, now);
    await this.store.recordAudit({
      actorStaffIdentityId: staff.id,
      action: "auth.login.succeeded",
      entityType: "session",
      entityId: session.id,
      outcome: "succeeded",
      requestId: input.requestId,
      occurredAt: now,
    });

    return { returnTo: transaction.returnTo, sessionToken };
  }

  async authenticate(
    sessionToken: string | undefined,
    requestId: string,
    now = new Date(),
  ): Promise<AuthenticatedContext> {
    if (!sessionToken || !isOpaqueToken(sessionToken)) {
      throw new HttpError(401, SESSION_REQUIRED);
    }

    const session = await this.store.findSessionByHash(
      this.crypto.hashSession(sessionToken),
    );
    if (!session) {
      throw new HttpError(401, SESSION_REQUIRED);
    }
    if (session.revokedAt) {
      await this.rejectedSession(
        "revoked-session",
        requestId,
        now,
        session.staffIdentityId,
        session.id,
      );
      throw new HttpError(401, SESSION_REQUIRED);
    }
    if (
      session.idleExpiresAt.getTime() <= now.getTime() ||
      session.absoluteExpiresAt.getTime() <= now.getTime()
    ) {
      await this.rejectedSession(
        "expired-session",
        requestId,
        now,
        session.staffIdentityId,
        session.id,
      );
      throw new HttpError(401, SESSION_REQUIRED);
    }

    const staff = await this.store.findStaffById(session.staffIdentityId);
    if (!staff || !isAssignedActiveAdmin(staff)) {
      await this.revokeSessionByIdAndAudit(
        session.id,
        "authorization-changed",
        requestId,
        now,
      );
      await this.rejectedSession(
        "authorization-changed",
        requestId,
        now,
        staff?.id,
        session.id,
      );
      throw new HttpError(401, SESSION_REQUIRED);
    }
    if (session.staffAuthorizationVersion !== staff.authorizationVersion) {
      await this.revokeSessionByIdAndAudit(
        session.id,
        "authorization-changed",
        requestId,
        now,
      );
      await this.rejectedSession(
        "authorization-changed",
        requestId,
        now,
        staff.id,
        session.id,
      );
      throw new HttpError(401, SESSION_REQUIRED);
    }

    let activeSession = session;
    if (
      now.getTime() - session.lastActivityAt.getTime() >=
      this.config.sessionActivityTouchMs
    ) {
      const idleExpiresAt = new Date(now.getTime() + this.config.sessionIdleMs);
      const expiresAt = earliest(idleExpiresAt, session.absoluteExpiresAt);
      await this.store.touchSession(session.id, now, idleExpiresAt, expiresAt);
      activeSession = {
        ...session,
        lastActivityAt: now,
        idleExpiresAt,
        expiresAt,
      };
    }

    return {
      staff,
      session: activeSession,
      permissions: ROLE_PERMISSIONS[staff.role],
      csrfToken: this.crypto.csrfToken(sessionToken),
    };
  }

  currentSession(context: AuthenticatedContext): CurrentSessionResponse {
    return {
      authenticated: true,
      staff: {
        id: context.staff.id,
        displayName: context.staff.displayName,
        email: context.staff.email,
        role: context.staff.role,
      },
      permissions: [...context.permissions],
      csrfToken: context.csrfToken,
      idleExpiresAt: context.session.idleExpiresAt.toISOString(),
      absoluteExpiresAt: context.session.absoluteExpiresAt.toISOString(),
    };
  }

  csrfMatches(
    context: AuthenticatedContext,
    suppliedToken: string | undefined,
  ): boolean {
    return Boolean(
      suppliedToken && this.crypto.equals(suppliedToken, context.csrfToken),
    );
  }

  originAllowed(origin: string | undefined): boolean {
    return Boolean(origin && this.config.allowedOrigins.includes(origin));
  }

  async authorize(
    context: AuthenticatedContext,
    permission: AuthPermission,
    requestId: string,
    now = new Date(),
  ): Promise<void> {
    if (context.permissions.includes(permission)) return;
    await this.store.recordAudit({
      actorStaffIdentityId: context.staff.id,
      action: "auth.access.denied",
      entityType: "authentication",
      outcome: "denied",
      requestId,
      reason: "missing-permission",
      permission,
      occurredAt: now,
    });
    throw new HttpError(403, "Permission denied.");
  }

  async recordRequestRejection(
    context: AuthenticatedContext | undefined,
    reason: "missing-csrf" | "invalid-csrf" | "disallowed-origin",
    requestId: string,
    now = new Date(),
  ): Promise<void> {
    await this.store.recordAudit({
      ...(context ? { actorStaffIdentityId: context.staff.id } : {}),
      action: "auth.access.denied",
      entityType: "authentication",
      outcome: "denied",
      requestId,
      reason,
      occurredAt: now,
    });
  }

  async logout(
    context: AuthenticatedContext | undefined,
    requestId: string,
    now = new Date(),
  ): Promise<void> {
    if (!context) return;
    const revoked = await this.revokeSessionByIdAndAudit(
      context.session.id,
      "logout",
      requestId,
      now,
      context.staff.id,
    );
    if (!revoked) return;
    await this.store.recordAudit({
      actorStaffIdentityId: context.staff.id,
      action: "auth.logout.succeeded",
      entityType: "session",
      entityId: context.session.id,
      outcome: "succeeded",
      requestId,
      occurredAt: now,
    });
  }

  async deactivateStaff(
    staffIdentityId: string,
    requestId: string,
    now = new Date(),
  ): Promise<boolean> {
    const staff = await this.store.disableStaff(staffIdentityId, now);
    if (!staff) return false;
    const revokedSessionIds = await this.store.revokeSessionsForStaff(
      staffIdentityId,
      now,
      "staff-disabled",
    );
    await this.recordSessionRevocations(
      revokedSessionIds,
      "staff-disabled",
      requestId,
      now,
    );
    await this.store.recordAudit({
      action: "staff.deactivated",
      entityType: "staff-identity",
      entityId: staffIdentityId,
      outcome: "succeeded",
      requestId,
      revokedSessionCount: revokedSessionIds.length,
      occurredAt: now,
    });
    return true;
  }

  private returnUrl(requested: string | undefined): string {
    if (!requested) {
      const fallback = this.config.allowedReturnUrls[0];
      if (!fallback) throw new HttpError(503, "Authentication is not configured.");
      return fallback;
    }

    let normalized: string;
    try {
      normalized = new URL(requested).href;
    } catch {
      throw new HttpError(400, "Invalid login return URL.");
    }

    if (!this.config.allowedReturnUrls.includes(normalized)) {
      throw new HttpError(400, "Invalid login return URL.");
    }
    return normalized;
  }

  private async failedLogin(
    reason: AuditReason,
    requestId: string,
    occurredAt: Date,
    actorStaffIdentityId?: string,
  ): Promise<void> {
    await this.store.recordAudit({
      ...(actorStaffIdentityId ? { actorStaffIdentityId } : {}),
      action: "auth.login.failed",
      entityType: "authentication",
      outcome: "failed",
      requestId,
      reason,
      occurredAt,
    });
  }

  private async revokeSessionByIdAndAudit(
    sessionId: string,
    reason: SessionRevocationReason,
    requestId: string,
    occurredAt: Date,
    actorStaffIdentityId?: string,
  ): Promise<boolean> {
    const revoked = await this.store.revokeSessionById(sessionId, occurredAt, reason);
    if (!revoked) return false;
    await this.recordSessionRevocation(
      sessionId,
      reason,
      requestId,
      occurredAt,
      actorStaffIdentityId,
    );
    return true;
  }

  private async recordSessionRevocation(
    sessionId: string,
    reason: SessionRevocationReason,
    requestId: string,
    occurredAt: Date,
    actorStaffIdentityId?: string,
  ): Promise<void> {
    await this.store.recordAudit({
      ...(actorStaffIdentityId ? { actorStaffIdentityId } : {}),
      action: "auth.session.revoked",
      entityType: "session",
      entityId: sessionId,
      outcome: "succeeded",
      requestId,
      reason,
      occurredAt,
    });
  }

  private async recordSessionRevocations(
    sessionIds: readonly string[],
    reason: SessionRevocationReason,
    requestId: string,
    occurredAt: Date,
  ): Promise<void> {
    await Promise.all(
      sessionIds.map((sessionId) =>
        this.recordSessionRevocation(sessionId, reason, requestId, occurredAt),
      ),
    );
  }

  private async rejectedSession(
    reason: AuditReason,
    requestId: string,
    occurredAt: Date,
    actorStaffIdentityId?: string,
    entityId?: string,
  ): Promise<void> {
    const event: SecurityAuditEventInput = {
      ...(actorStaffIdentityId ? { actorStaffIdentityId } : {}),
      action: "auth.access.denied",
      entityType: entityId ? "session" : "authentication",
      ...(entityId ? { entityId } : {}),
      outcome: "denied",
      requestId,
      reason,
      occurredAt,
    };
    await this.store.recordAudit(event);
  }
}

/** Use only when revealing a protected resource's existence would disclose information. */
export function assertProtectedResourceVisible(visible: boolean): void {
  if (!visible) throw new HttpError(404, "Resource not found.");
}
