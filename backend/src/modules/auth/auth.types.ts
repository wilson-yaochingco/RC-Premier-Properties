import type { AuthPermission, StaffRole } from "@rc/shared";

export const STAFF_STATUSES = ["active", "disabled"] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];

export interface StaffIdentityRecord {
  id: string;
  issuer: string;
  subject: string;
  displayName: string;
  email: string;
  role: StaffRole | null;
  status: StaffStatus;
  authorizationVersion: number;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSessionRecord {
  id: string;
  sessionHash: string;
  staffIdentityId: string;
  staffAuthorizationVersion: number;
  createdAt: Date;
  lastActivityAt: Date;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  revocationReason?: SessionRevocationReason;
}

export interface OidcTransactionRecord {
  id: string;
  transactionHash: string;
  stateHash: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
  createdAt: Date;
  expiresAt: Date;
  consumedAt?: Date;
}

export const SESSION_REVOCATION_REASONS = [
  "logout",
  "rotation",
  "concurrent-limit",
  "staff-disabled",
  "authorization-changed",
] as const;
export type SessionRevocationReason = (typeof SESSION_REVOCATION_REASONS)[number];

export const AUDIT_ACTIONS = [
  "auth.login.succeeded",
  "auth.login.failed",
  "auth.logout.succeeded",
  "auth.session.revoked",
  "auth.access.denied",
  "staff.provisioned",
  "staff.deactivated",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_OUTCOMES = ["succeeded", "failed", "denied"] as const;
export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];

export const AUDIT_REASONS = [
  "invalid-callback",
  "invalid-state",
  "unknown-staff",
  "disabled-staff",
  "unassigned-staff",
  "insufficient-assurance",
  "invalid-session",
  "expired-session",
  "revoked-session",
  "authorization-changed",
  "missing-csrf",
  "invalid-csrf",
  "disallowed-origin",
  "missing-permission",
] as const;
export type AuditReason = (typeof AUDIT_REASONS)[number];

export interface SecurityAuditEventInput {
  actorStaffIdentityId?: string;
  action: AuditAction;
  entityType: "authentication" | "session" | "staff-identity";
  entityId?: string;
  outcome: AuditOutcome;
  requestId: string;
  reason?: AuditReason;
  permission?: AuthPermission;
  revokedSessionCount?: number;
  occurredAt: Date;
}

export interface CreateOidcTransactionInput {
  transactionHash: string;
  stateHash: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface CreateAuthSessionInput {
  sessionHash: string;
  staffIdentityId: string;
  staffAuthorizationVersion: number;
  createdAt: Date;
  lastActivityAt: Date;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
  expiresAt: Date;
}

export interface AuthStore {
  createOidcTransaction(input: CreateOidcTransactionInput): Promise<void>;
  consumeOidcTransaction(
    transactionHash: string,
    now: Date,
  ): Promise<OidcTransactionRecord | null>;
  findStaffByExternalIdentity(
    issuer: string,
    subject: string,
  ): Promise<StaffIdentityRecord | null>;
  findStaffById(id: string): Promise<StaffIdentityRecord | null>;
  markStaffLogin(id: string, at: Date): Promise<void>;
  createSession(
    input: CreateAuthSessionInput,
    maxConcurrentSessions: number,
  ): Promise<AuthSessionRecord>;
  findSessionByHash(sessionHash: string): Promise<AuthSessionRecord | null>;
  touchSession(
    id: string,
    lastActivityAt: Date,
    idleExpiresAt: Date,
    expiresAt: Date,
  ): Promise<void>;
  revokeSessionByHash(
    sessionHash: string,
    at: Date,
    reason: SessionRevocationReason,
  ): Promise<boolean>;
  revokeSessionById(
    id: string,
    at: Date,
    reason: SessionRevocationReason,
  ): Promise<boolean>;
  revokeSessionsForStaff(
    staffIdentityId: string,
    at: Date,
    reason: SessionRevocationReason,
  ): Promise<number>;
  disableStaff(id: string, at: Date): Promise<StaffIdentityRecord | null>;
  recordAudit(event: SecurityAuditEventInput): Promise<void>;
}

export interface OidcAuthorizationRequest {
  authorizationUrl: string;
  state: string;
  nonce: string;
  codeVerifier: string;
}

export interface VerifiedOidcIdentity {
  issuer: string;
  subject: string;
  authenticationMethods: string[];
  displayName?: string;
  email?: string;
}

export interface OidcProvider {
  createAuthorizationRequest(): Promise<OidcAuthorizationRequest>;
  completeAuthorization(input: {
    callbackUrl: URL;
    expectedState: string;
    expectedNonce: string;
    codeVerifier: string;
  }): Promise<VerifiedOidcIdentity>;
}

export interface AuthServiceConfig {
  issuerUrl: string;
  callbackUrl: string;
  allowedReturnUrls: readonly string[];
  allowedOrigins: readonly string[];
  requiredAmr: string;
  sessionIdleMs: number;
  sessionAbsoluteMs: number;
  sessionActivityTouchMs: number;
  maxConcurrentSessions: number;
  transactionLifetimeMs: number;
}

export interface AuthenticatedContext {
  staff: StaffIdentityRecord & { role: StaffRole };
  session: AuthSessionRecord;
  permissions: readonly AuthPermission[];
  csrfToken: string;
}
