import rateLimit from "express-rate-limit";

/** A tighter per-IP budget for the public form that persists personal information. */
export function createInquiryRateLimit() {
  return rateLimit({
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
