import rateLimit, { type Store } from "express-rate-limit";
import { env } from "../config/env.js";
import { MongoRateLimitStore } from "./mongoRateLimitStore.js";

/** A tighter per-IP budget for the public form that persists personal information. */
export function createInquiryRateLimit(
  store: Store | undefined = env.IS_PRODUCTION
    ? new MongoRateLimitStore("inquiry")
    : undefined,
) {
  return rateLimit({
    store,
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: "error",
      statusCode: 429,
      message: "Too many inquiries, please try again later.",
    },
  });
}
