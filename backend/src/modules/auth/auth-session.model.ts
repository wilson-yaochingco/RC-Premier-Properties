import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  SESSION_REVOCATION_REASONS,
  type SessionRevocationReason,
} from "./auth.types.js";

export interface AuthSessionEntity {
  sessionHash: string;
  staffIdentity: Types.ObjectId;
  staffAuthorizationVersion: number;
  createdAt: Date;
  lastActivityAt: Date;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  revocationReason?: SessionRevocationReason;
}

const authSessionSchema = new Schema<AuthSessionEntity>(
  {
    sessionHash: { type: String, required: true, select: false },
    staffIdentity: {
      type: Schema.Types.ObjectId,
      ref: "StaffIdentity",
      required: true,
    },
    staffAuthorizationVersion: { type: Number, required: true, min: 1 },
    createdAt: { type: Date, required: true },
    lastActivityAt: { type: Date, required: true },
    idleExpiresAt: { type: Date, required: true },
    absoluteExpiresAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    revocationReason: { type: String, enum: SESSION_REVOCATION_REASONS },
  },
  { versionKey: false },
);

authSessionSchema.index({ sessionHash: 1 }, { unique: true });
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
authSessionSchema.index({ staffIdentity: 1, revokedAt: 1, createdAt: -1 });

export const AuthSessionModel: Model<AuthSessionEntity> =
  (mongoose.models.AuthSession as Model<AuthSessionEntity> | undefined) ??
  mongoose.model<AuthSessionEntity>("AuthSession", authSessionSchema);
