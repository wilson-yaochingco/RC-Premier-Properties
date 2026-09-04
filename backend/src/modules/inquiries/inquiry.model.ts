import mongoose, { Schema, type Model } from "mongoose";
import { INQUIRY_SOURCES, INQUIRY_TYPES } from "@rc/shared";
import { INQUIRY_STATUSES, type InquiryEntity } from "./inquiry.types.js";

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
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

inquirySchema.index({ createdAt: -1 });
inquirySchema.index({ email: 1, createdAt: -1 });
inquirySchema.index({ propertyId: 1, createdAt: -1 });
inquirySchema.index({ status: 1, createdAt: -1 });

export const InquiryModel: Model<InquiryEntity> =
  (mongoose.models.Inquiry as Model<InquiryEntity> | undefined) ??
  mongoose.model<InquiryEntity>("Inquiry", inquirySchema);
