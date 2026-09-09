import rateLimit from "express-rate-limit";

/**
 * Bound invalid OIDC callbacks separately from login starts and ordinary API traffic.
 * Successful callbacks are removed from the counter, so the response never reveals
 * whether a staff identity exists.
 */
export function createCallbackFailureRateLimit(limit = 20) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: "error",
      statusCode: 429,
      message: "Too many authentication attempts, please try again later.",
    },
  });
}
