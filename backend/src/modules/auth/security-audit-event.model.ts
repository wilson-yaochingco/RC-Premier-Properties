import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  AUDIT_ACTIONS,
  AUDIT_OUTCOMES,
  AUDIT_REASONS,
  type AuditAction,
  type AuditOutcome,
  type AuditReason,
} from "./auth.types.js";
import { AUTH_PERMISSIONS, type AuthPermission } from "@rc/shared";

export interface SecurityAuditEventEntity {
  actorStaffIdentity?: Types.ObjectId;
  action: AuditAction;
  entityType: "authentication" | "session" | "staff-identity";
  entityId?: string;
  outcome: AuditOutcome;
  requestId: string;
  details?: {
    reason?: AuditReason;
    permission?: AuthPermission;
    revokedSessionCount?: number;
  };
  occurredAt: Date;
}

const auditDetailsSchema = new Schema(
  {
    reason: { type: String, enum: AUDIT_REASONS },
    permission: { type: String, enum: AUTH_PERMISSIONS },
    revokedSessionCount: { type: Number, min: 0 },
  },
  { _id: false },
);

const securityAuditEventSchema = new Schema<SecurityAuditEventEntity>(
  {
    actorStaffIdentity: { type: Schema.Types.ObjectId, ref: "StaffIdentity" },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    entityType: {
      type: String,
      enum: ["authentication", "session", "staff-identity"],
      required: true,
    },
    entityId: { type: String, trim: true, maxlength: 255 },
    outcome: { type: String, enum: AUDIT_OUTCOMES, required: true },
    requestId: { type: String, required: true, trim: true, maxlength: 100 },
    details: { type: auditDetailsSchema },
    occurredAt: { type: Date, required: true },
  },
  { versionKey: false },
);

securityAuditEventSchema.index({ occurredAt: -1 });
securityAuditEventSchema.index({ actorStaffIdentity: 1, occurredAt: -1 });
securityAuditEventSchema.index({ action: 1, occurredAt: -1 });

export const SecurityAuditEventModel: Model<SecurityAuditEventEntity> =
  (mongoose.models.SecurityAuditEvent as Model<SecurityAuditEventEntity> | undefined) ??
  mongoose.model<SecurityAuditEventEntity>(
    "SecurityAuditEvent",
    securityAuditEventSchema,
  );
