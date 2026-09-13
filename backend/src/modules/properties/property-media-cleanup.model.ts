import { createHash } from "node:crypto";
import mongoose, { Schema, type Model, type Types } from "mongoose";

export const MEDIA_CLEANUP_REASONS = [
  "metadata-removed",
  "metadata-save-failed",
] as const;
export type MediaCleanupReason = (typeof MEDIA_CLEANUP_REASONS)[number];

export interface PropertyMediaCleanupTaskEntity {
  property: Types.ObjectId;
  /** Adapter-owned stable reference; selected only by trusted cleanup operations. */
  objectReference: string;
  referenceHash: string;
  reason: MediaCleanupReason;
  status: "pending-review";
  attempts: number;
  lastErrorCode: string;
  firstFailedAt: Date;
  lastFailedAt: Date;
}

const propertyMediaCleanupTaskSchema = new Schema<PropertyMediaCleanupTaskEntity>(
  {
    property: { type: Schema.Types.ObjectId, ref: "Property", required: true },
    objectReference: {
      type: String,
      required: true,
      maxlength: 2_048,
      select: false,
    },
    referenceHash: { type: String, required: true, maxlength: 64 },
    reason: { type: String, enum: MEDIA_CLEANUP_REASONS, required: true },
    status: { type: String, enum: ["pending-review"], required: true },
    attempts: { type: Number, required: true, min: 1 },
    lastErrorCode: { type: String, required: true, maxlength: 80 },
    firstFailedAt: { type: Date, required: true },
    lastFailedAt: { type: Date, required: true },
  },
  { versionKey: false },
);

propertyMediaCleanupTaskSchema.index({ referenceHash: 1, status: 1 }, { unique: true });
propertyMediaCleanupTaskSchema.index({ status: 1, firstFailedAt: 1 });

export const PropertyMediaCleanupTaskModel: Model<PropertyMediaCleanupTaskEntity> =
  (mongoose.models.PropertyMediaCleanupTask as
    Model<PropertyMediaCleanupTaskEntity> | undefined) ??
  mongoose.model<PropertyMediaCleanupTaskEntity>(
    "PropertyMediaCleanupTask",
    propertyMediaCleanupTaskSchema,
  );

export interface MediaCleanupDebtInput {
  propertyId: string;
  objectReference: string;
  reason: MediaCleanupReason;
  errorCode: string;
  failedAt: Date;
}

export interface MediaCleanupDebtRecorder {
  record(input: MediaCleanupDebtInput): Promise<void>;
}

export class MongooseMediaCleanupDebtRecorder implements MediaCleanupDebtRecorder {
  async record(input: MediaCleanupDebtInput): Promise<void> {
    const referenceHash = createHash("sha256")
      .update(input.objectReference)
      .digest("hex");
    await PropertyMediaCleanupTaskModel.updateOne(
      { referenceHash, status: "pending-review" },
      {
        $setOnInsert: {
          property: new mongoose.Types.ObjectId(input.propertyId),
          objectReference: input.objectReference,
          referenceHash,
          reason: input.reason,
          status: "pending-review",
          firstFailedAt: input.failedAt,
        },
        $set: {
          lastErrorCode: input.errorCode,
          lastFailedAt: input.failedAt,
        },
        $inc: { attempts: 1 },
      },
      { upsert: true },
    );
  }
}

export const mongooseMediaCleanupDebtRecorder = new MongooseMediaCleanupDebtRecorder();
