import rateLimit from "express-rate-limit";

/**
 * Baseline rate limit for the API surface.
 *
 * The health endpoint is skipped so uptime monitors polling it can never be throttled
 * into reporting a false outage.
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    statusCode: 429,
    message: "Too many requests, please try again later.",
  },
  skip: (req) => req.path === "/health",
});
