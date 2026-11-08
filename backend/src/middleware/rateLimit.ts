import rateLimit, { type Store } from "express-rate-limit";
import { env } from "../config/env.js";
import { MongoRateLimitStore } from "./mongoRateLimitStore.js";

/**
 * Baseline rate limit for the API surface.
 *
 * The health endpoint is skipped so uptime monitors polling it can never be throttled
 * into reporting a false outage.
 */
export function createApiRateLimit(
  store: Store | undefined = env.IS_PRODUCTION
    ? new MongoRateLimitStore("api")
    : undefined,
) {
  return rateLimit({
    store,
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: "error",
      statusCode: 429,
      message: "Too many requests, please try again later.",
    },
    skip: (req) => req.path === "/health" || req.path === "/health/ready",
  });
}

export const apiRateLimit = createApiRateLimit();
