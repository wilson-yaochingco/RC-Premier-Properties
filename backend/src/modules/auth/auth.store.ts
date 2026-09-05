import { Types } from "mongoose";
import { AuthSessionModel, type AuthSessionEntity } from "./auth-session.model.js";
import type {
  AuthSessionRecord,
  AuthStore,
  CreateAuthSessionInput,
  CreateOidcTransactionInput,
  OidcTransactionRecord,
  SecurityAuditEventInput,
  SessionRevocationReason,
  StaffIdentityRecord,
} from "./auth.types.js";
import {
  OidcTransactionModel,
  type OidcTransactionEntity,
} from "./oidc-transaction.model.js";
import { SecurityAuditEventModel } from "./security-audit-event.model.js";
import {
  StaffIdentityModel,
  type StaffIdentityEntity,
} from "./staff-identity.model.js";

type LeanStaffIdentity = StaffIdentityEntity & { _id: unknown };
type LeanAuthSession = AuthSessionEntity & { _id: unknown };
type LeanOidcTransaction = OidcTransactionEntity & { _id: unknown };

function toStaffRecord(record: LeanStaffIdentity): StaffIdentityRecord {
  return {
    id: String(record._id),
    issuer: record.issuer,
    subject: record.subject,
    displayName: record.displayName,
    email: record.email,
    role: record.role,
    status: record.status,
    authorizationVersion: record.authorizationVersion,
    ...(record.lastLoginAt ? { lastLoginAt: record.lastLoginAt } : {}),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toSessionRecord(record: LeanAuthSession): AuthSessionRecord {
  return {
    id: String(record._id),
    sessionHash: record.sessionHash,
    staffIdentityId: String(record.staffIdentity),
    staffAuthorizationVersion: record.staffAuthorizationVersion,
    createdAt: record.createdAt,
    lastActivityAt: record.lastActivityAt,
    idleExpiresAt: record.idleExpiresAt,
    absoluteExpiresAt: record.absoluteExpiresAt,
    expiresAt: record.expiresAt,
    ...(record.revokedAt ? { revokedAt: record.revokedAt } : {}),
    ...(record.revocationReason ? { revocationReason: record.revocationReason } : {}),
  };
}

function toTransactionRecord(record: LeanOidcTransaction): OidcTransactionRecord {
  return {
    id: String(record._id),
    transactionHash: record.transactionHash,
    stateHash: record.stateHash,
    nonce: record.nonce,
    codeVerifier: record.codeVerifier,
    returnTo: record.returnTo,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    ...(record.consumedAt ? { consumedAt: record.consumedAt } : {}),
  };
}

function objectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

export class MongooseAuthStore implements AuthStore {
  async createOidcTransaction(input: CreateOidcTransactionInput): Promise<void> {
    await OidcTransactionModel.create(input);
  }

  async consumeOidcTransaction(
    transactionHash: string,
    now: Date,
  ): Promise<OidcTransactionRecord | null> {
    const record = await OidcTransactionModel.findOneAndUpdate(
      {
        transactionHash,
        consumedAt: { $exists: false },
        expiresAt: { $gt: now },
      },
      { $set: { consumedAt: now } },
      { new: true },
    )
      .select("+transactionHash +stateHash +nonce +codeVerifier")
      .lean<LeanOidcTransaction | null>();
    return record ? toTransactionRecord(record) : null;
  }

  async findStaffByExternalIdentity(
    issuer: string,
    subject: string,
  ): Promise<StaffIdentityRecord | null> {
    const record = await StaffIdentityModel.findOne({
      issuer,
      subject,
    }).lean<LeanStaffIdentity | null>();
    return record ? toStaffRecord(record) : null;
  }

  async findStaffById(id: string): Promise<StaffIdentityRecord | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const record = await StaffIdentityModel.findById(
      id,
    ).lean<LeanStaffIdentity | null>();
    return record ? toStaffRecord(record) : null;
  }

  async markStaffLogin(id: string, at: Date): Promise<void> {
    await StaffIdentityModel.updateOne(
      { _id: objectId(id) },
      { $set: { lastLoginAt: at } },
    );
  }

  async createSession(
    input: CreateAuthSessionInput,
    maxConcurrentSessions: number,
  ): Promise<AuthSessionRecord> {
    const created = await AuthSessionModel.create({
      ...input,
      staffIdentity: objectId(input.staffIdentityId),
    });

    const excess = await AuthSessionModel.find({
      staffIdentity: objectId(input.staffIdentityId),
      revokedAt: { $exists: false },
      expiresAt: { $gt: input.createdAt },
    })
      .sort({ createdAt: -1, _id: -1 })
      .skip(maxConcurrentSessions)
      .select("_id")
      .lean<Array<{ _id: Types.ObjectId }>>();

    if (excess.length > 0) {
      await AuthSessionModel.updateMany(
        { _id: { $in: excess.map((record) => record._id) } },
        {
          $set: {
            revokedAt: input.createdAt,
            revocationReason: "concurrent-limit",
          },
        },
      );
    }

    return toSessionRecord(created.toObject() as LeanAuthSession);
  }

  async findSessionByHash(sessionHash: string): Promise<AuthSessionRecord | null> {
    const record = await AuthSessionModel.findOne({ sessionHash })
      .select("+sessionHash")
      .lean<LeanAuthSession | null>();
    return record ? toSessionRecord(record) : null;
  }

  async touchSession(
    id: string,
    lastActivityAt: Date,
    idleExpiresAt: Date,
    expiresAt: Date,
  ): Promise<void> {
    await AuthSessionModel.updateOne(
      { _id: objectId(id), revokedAt: { $exists: false } },
      { $set: { lastActivityAt, idleExpiresAt, expiresAt } },
    );
  }

  async revokeSessionByHash(
    sessionHash: string,
    at: Date,
    reason: SessionRevocationReason,
  ): Promise<boolean> {
    const result = await AuthSessionModel.updateOne(
      { sessionHash, revokedAt: { $exists: false } },
      { $set: { revokedAt: at, revocationReason: reason } },
    );
    return result.modifiedCount > 0;
  }

  async revokeSessionById(
    id: string,
    at: Date,
    reason: SessionRevocationReason,
  ): Promise<boolean> {
    const result = await AuthSessionModel.updateOne(
      { _id: objectId(id), revokedAt: { $exists: false } },
      { $set: { revokedAt: at, revocationReason: reason } },
    );
    return result.modifiedCount > 0;
  }

  async revokeSessionsForStaff(
    staffIdentityId: string,
    at: Date,
    reason: SessionRevocationReason,
  ): Promise<number> {
    const result = await AuthSessionModel.updateMany(
      { staffIdentity: objectId(staffIdentityId), revokedAt: { $exists: false } },
      { $set: { revokedAt: at, revocationReason: reason } },
    );
    return result.modifiedCount;
  }

  async disableStaff(id: string, at: Date): Promise<StaffIdentityRecord | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const record = await StaffIdentityModel.findOneAndUpdate(
      { _id: objectId(id) },
      {
        $set: { status: "disabled", updatedAt: at },
        $inc: { authorizationVersion: 1 },
      },
      { new: true },
    ).lean<LeanStaffIdentity | null>();
    return record ? toStaffRecord(record) : null;
  }

  async recordAudit(event: SecurityAuditEventInput): Promise<void> {
    await SecurityAuditEventModel.create({
      ...(event.actorStaffIdentityId
        ? { actorStaffIdentity: objectId(event.actorStaffIdentityId) }
        : {}),
      action: event.action,
      entityType: event.entityType,
      ...(event.entityId ? { entityId: event.entityId } : {}),
      outcome: event.outcome,
      requestId: event.requestId,
      ...(event.reason || event.permission || event.revokedSessionCount !== undefined
        ? {
            details: {
              ...(event.reason ? { reason: event.reason } : {}),
              ...(event.permission ? { permission: event.permission } : {}),
              ...(event.revokedSessionCount !== undefined
                ? { revokedSessionCount: event.revokedSessionCount }
                : {}),
            },
          }
        : {}),
      occurredAt: event.occurredAt,
    });
  }
}

export const mongooseAuthStore = new MongooseAuthStore();
