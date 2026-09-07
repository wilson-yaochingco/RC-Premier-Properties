import mongoose, { Schema, type Model } from "mongoose";
import {
  INQUIRY_SOURCES,
  INQUIRY_STATUSES,
  INQUIRY_TYPES,
  INQUIRY_WORKFLOW_STATUSES,
} from "@rc/shared";
import type { InquiryEntity } from "./inquiry.types.js";

const statusHistorySchema = new Schema(
  {
    fromStatus: { type: String, enum: INQUIRY_STATUSES },
    toStatus: { type: String, enum: INQUIRY_STATUSES, required: true },
    changedByStaffIdentity: { type: Schema.Types.ObjectId, ref: "StaffIdentity" },
    changedAt: { type: Date, required: true },
  },
  { _id: false },
);

const inquiryNoteSchema = new Schema(
  {
    note: { type: String, required: true, trim: true, maxlength: 1_000 },
    authorStaffIdentity: {
      type: Schema.Types.ObjectId,
      ref: "StaffIdentity",
      required: true,
    },
    createdAt: { type: Date, required: true },
  },
  { _id: true },
);

const inquirySchema = new Schema<InquiryEntity>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
      match: /^[+()\d][+()\d\s.-]{5,28}[\d)]$/,
    },
    inquiryType: { type: String, enum: INQUIRY_TYPES, required: true },
    source: { type: String, enum: INQUIRY_SOURCES, required: true },
    propertyId: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 40,
      match: /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/,
    },
    subject: { type: String, trim: true, maxlength: 150 },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 3_000,
    },
    privacyConsent: {
      type: Boolean,
      required: true,
      validate: {
        validator: (value: boolean) => value === true,
        message: "Privacy consent is required.",
      },
    },
    privacyConsentAt: { type: Date, required: true },
    status: {
      type: String,
      enum: INQUIRY_STATUSES,
      required: true,
      default: "new",
    },
    statusBeforeSpam: { type: String, enum: INQUIRY_WORKFLOW_STATUSES },
    statusHistory: { type: [statusHistorySchema], default: [] },
    internalNotes: { type: [inquiryNoteSchema], default: [], select: false },
    archivedAt: { type: Date },
    archivedByStaffIdentity: { type: Schema.Types.ObjectId, ref: "StaffIdentity" },
    idempotencyKeyHash: {
      type: String,
      select: false,
      maxlength: 64,
    },
  },
  {
    timestamps: true,
    versionKey: "__v",
  },
);

inquirySchema.index({ createdAt: -1 });
inquirySchema.index({ email: 1, createdAt: -1 });
inquirySchema.index({ propertyId: 1, createdAt: -1 });
inquirySchema.index({ status: 1, createdAt: -1 });
inquirySchema.index({ archivedAt: 1, createdAt: -1 });
inquirySchema.index({ idempotencyKeyHash: 1 }, { unique: true, sparse: true });

export const InquiryModel: Model<InquiryEntity> =
  (mongoose.models.Inquiry as Model<InquiryEntity> | undefined) ??
  mongoose.model<InquiryEntity>("Inquiry", inquirySchema);
