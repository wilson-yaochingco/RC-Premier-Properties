import mongoose, { Schema, type Model } from "mongoose";

export interface OidcTransactionEntity {
  transactionHash: string;
  stateHash: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
  createdAt: Date;
  expiresAt: Date;
  consumedAt?: Date;
}

const oidcTransactionSchema = new Schema<OidcTransactionEntity>(
  {
    transactionHash: { type: String, required: true, select: false },
    stateHash: { type: String, required: true, select: false },
    nonce: { type: String, required: true, select: false },
    codeVerifier: { type: String, required: true, select: false },
    returnTo: { type: String, required: true, maxlength: 1_000 },
    createdAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date },
  },
  { versionKey: false },
);

oidcTransactionSchema.index({ transactionHash: 1 }, { unique: true });
oidcTransactionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OidcTransactionModel: Model<OidcTransactionEntity> =
  (mongoose.models.OidcTransaction as Model<OidcTransactionEntity> | undefined) ??
  mongoose.model<OidcTransactionEntity>("OidcTransaction", oidcTransactionSchema);
