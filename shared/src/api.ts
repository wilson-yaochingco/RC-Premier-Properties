/**
 * The API contract shared by the RC Premier Properties frontend and backend.
 *
 * This is the single source of truth for anything that crosses the network boundary.
 * Both apps compile against it, so a change here surfaces as a type error on whichever
 * side has not been updated -- the contract is enforced by the compiler rather than by
 * discipline. Add request/response types for each new module beside these.
 */

/** API version served under `/api/<version>`. */
export const API_VERSION = "v1";

/** Path prefix every API route is mounted on. Backend mounts it; frontend builds URLs from it. */
export const API_PREFIX = `/api/${API_VERSION}`;

/** Mongoose connection states, mapped to readable labels. */
export type DatabaseConnectionStatus =
  "connected" | "connecting" | "disconnected" | "disconnecting" | "unknown";

export interface DatabaseStatus {
  status: DatabaseConnectionStatus;
  /** Raw mongoose `connection.readyState`. */
  readyState: number;
}

export type Environment = "development" | "test" | "production";

/** Body of `GET /api/v1/health`. */
export interface HealthResponse {
  status: "ok";
  service: string;
  /** ISO 8601 timestamp. */
  timestamp: string;
  /** Process uptime in seconds. */
  uptime: number;
  environment: Environment;
  database: DatabaseStatus;
}

/** Body returned by the backend error handler for every non-2xx response. */
export interface ApiErrorResponse {
  status: "error";
  statusCode: number;
  message: string;
}
