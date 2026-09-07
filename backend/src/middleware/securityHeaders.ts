import helmet from "helmet";
import type { RequestHandler } from "express";

const ONE_YEAR_SECONDS = 31_536_000;

/** Security headers shared by every API response, with HSTS limited to HTTPS production. */
export function createSecurityHeaders(isProduction: boolean): RequestHandler[] {
  return [
    helmet({
      strictTransportSecurity: isProduction
        ? { maxAge: ONE_YEAR_SECONDS, includeSubDomains: false }
        : false,
    }),
    (_req, res, next) => {
      res.setHeader(
        "Permissions-Policy",
        "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
      );
      next();
    },
  ];
}
