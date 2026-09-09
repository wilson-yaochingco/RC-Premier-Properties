import mongoose from "mongoose";
import type { DatabaseStatus } from "@rc/shared";
import { env } from "./env.js";
import { errorIdentity, operationalLogger } from "../lib/operational-logger.js";

/**
 * MongoDB connection lifecycle. No schemas or models are defined here — this module
 * only owns connecting, reporting, and disconnecting.
 */

mongoose.connection.on("connected", () => {
  operationalLogger.info("dependency_connected", { dependency: "mongodb" });
});

mongoose.connection.on("error", (error: Error) => {
  operationalLogger.error("dependency_connection_error", {
    dependency: "mongodb",
    ...errorIdentity(error),
  });
});

mongoose.connection.on("disconnected", () => {
  operationalLogger.warn("dependency_disconnected", { dependency: "mongodb" });
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

const READY_STATE_LABELS: Record<number, DatabaseStatus["status"]> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

/** Human-readable connection state, used by the health endpoint. */
export function getDatabaseStatus(): DatabaseStatus {
  const readyState = mongoose.connection.readyState;
  return {
    status: READY_STATE_LABELS[readyState] ?? "unknown",
    readyState,
  };
}
