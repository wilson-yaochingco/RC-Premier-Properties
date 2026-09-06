import rateLimit from "express-rate-limit";

/** A dedicated limit for authorization requests, separate from the general API budget. */
export function createLoginRateLimit() {
  return rateLimit({
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
