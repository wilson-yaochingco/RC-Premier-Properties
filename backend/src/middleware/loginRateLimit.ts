import rateLimit, { type Store } from "express-rate-limit";
import { env } from "../config/env.js";
import { MongoRateLimitStore } from "./mongoRateLimitStore.js";

/** A dedicated limit for authorization requests, separate from the general API budget. */
export function createLoginRateLimit(
  store: Store | undefined = env.IS_PRODUCTION
    ? new MongoRateLimitStore("login")
    : undefined,
) {
  return rateLimit({
    store,
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: "error",
      statusCode: 429,
      message: "Too many login attempts, please try again later.",
    },
  });
}
