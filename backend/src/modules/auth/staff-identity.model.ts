import mongoose, { Schema, type Model } from "mongoose";
import { STAFF_ROLES } from "@rc/shared";
import { STAFF_STATUSES, type StaffIdentityRecord } from "./auth.types.js";

export type StaffIdentityEntity = Omit<StaffIdentityRecord, "id">;

const staffIdentitySchema = new Schema<StaffIdentityEntity>(
  {
    issuer: { type: String, required: true, trim: true, maxlength: 500 },
    subject: { type: String, required: true, trim: true, maxlength: 255 },
    displayName: { type: String, required: true, trim: true, maxlength: 160 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    role: { type: String, enum: STAFF_ROLES, default: null },
    status: {
      type: String,
      enum: STAFF_STATUSES,
      required: true,
      default: "active",
    },
    authorizationVersion: { type: Number, required: true, min: 1, default: 1 },
    lastLoginAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

staffIdentitySchema.index({ issuer: 1, subject: 1 }, { unique: true });
staffIdentitySchema.index({ status: 1, role: 1 });
staffIdentitySchema.index({ email: 1 });

export const StaffIdentityModel: Model<StaffIdentityEntity> =
  (mongoose.models.StaffIdentity as Model<StaffIdentityEntity> | undefined) ??
  mongoose.model<StaffIdentityEntity>("StaffIdentity", staffIdentitySchema);
