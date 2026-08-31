import mongoose from "mongoose";
import { env } from "./env.js";

/**
 * MongoDB connection lifecycle. No schemas or models are defined here — this module
 * only owns connecting, reporting, and disconnecting.
 */

mongoose.connection.on("connected", () => {
  console.log(`[db] connected to ${mongoose.connection.name}`);
});

mongoose.connection.on("error", (error: Error) => {
  console.error("[db] connection error:", error.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("[db] disconnected");
});

/**
 * Connect to MongoDB.
 *
 * Throws on failure — the caller decides whether that is fatal. `server.ts` keeps the
 * HTTP server running in development so the API is workable before Mongo is installed,
 * and exits in every other environment.
 */
export async function connectDatabase(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
}

const READY_STATE_LABELS: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

/** Human-readable connection state, used by the health endpoint. */
export function getDatabaseStatus(): { status: string; readyState: number } {
  const readyState = mongoose.connection.readyState;
  return {
    status: READY_STATE_LABELS[readyState] ?? "unknown",
    readyState,
  };
}
