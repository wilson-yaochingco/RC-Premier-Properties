import { createHash } from "node:crypto";
import mongoose, { type Connection } from "mongoose";
import type { ClientRateLimitInfo, Options, Store } from "express-rate-limit";
import { DATABASE_OPERATION_TIMEOUT_MS } from "../config/database.js";

interface RateLimitRecord {
  _id: string;
  totalHits: number;
  resetAt: Date;
}

export class MongoRateLimitStore implements Store {
  readonly localKeys = false;
  readonly prefix: string;
  private windowMs!: number;
  private indexReady?: Promise<string>;

  constructor(
    name: string,
    private readonly connection: Connection = mongoose.connection,
  ) {
    this.prefix = `${name}:`;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  private key(key: string): string {
    return createHash("sha256").update(this.prefix).update(key).digest("hex");
  }

  private async collection() {
    const collection = this.connection.db!.collection<RateLimitRecord>("ratelimits");
    // Initialize after connection: limiter construction also happens before MongoDB connects.
    this.indexReady ??= collection
      .createIndex(
        { resetAt: 1 },
        { expireAfterSeconds: 0, maxTimeMS: DATABASE_OPERATION_TIMEOUT_MS },
      )
      .catch((error: unknown) => {
        this.indexReady = undefined;
        throw error;
      });
    await this.indexReady;
    return collection;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const collection = await this.collection();
    const expired = { $lte: [{ $ifNull: ["$resetAt", new Date(0)] }, "$$NOW"] };
    const record = await collection.findOneAndUpdate(
      { _id: this.key(key) },
      [
        {
          $set: {
            // Pipeline $add is the atomic $inc equivalent and resets an expired window in the same write.
            totalHits: { $cond: [expired, 1, { $add: ["$totalHits", 1] }] },
            resetAt: {
              $cond: [expired, { $add: ["$$NOW", this.windowMs] }, "$resetAt"],
            },
          },
        },
      ],
      {
        upsert: true,
        returnDocument: "after",
        maxTimeMS: DATABASE_OPERATION_TIMEOUT_MS,
      },
    );
    return { totalHits: record!.totalHits, resetTime: record!.resetAt };
  }

  async decrement(key: string): Promise<void> {
    const collection = await this.collection();
    await collection.updateOne(
      { _id: this.key(key), totalHits: { $gt: 0 } },
      { $inc: { totalHits: -1 } },
      { maxTimeMS: DATABASE_OPERATION_TIMEOUT_MS },
    );
  }

  async resetKey(key: string): Promise<void> {
    const collection = await this.collection();
    await collection.deleteOne(
      { _id: this.key(key) },
      { maxTimeMS: DATABASE_OPERATION_TIMEOUT_MS },
    );
  }
}
