import type { AuthPermission } from "@rc/shared";
import type { RequestHandler } from "express";
import { HttpError } from "../../middleware/errorHandler.js";
import { getRequestId } from "../../middleware/requestContext.js";
import { CSRF_HEADER_NAME } from "./auth.constants.js";
import { readCookie, type AuthCookieSettings } from "./auth.cookies.js";
import { AuthService } from "./auth.service.js";
import type { AuthenticatedContext } from "./auth.types.js";

function safeAuthError(error: unknown): HttpError {
  return error instanceof HttpError
    ? error
    : new HttpError(503, "Authentication service is unavailable.");
}

export function authenticatedContext(
  locals: Record<string, unknown>,
): AuthenticatedContext | undefined {
  return locals.auth as AuthenticatedContext | undefined;
}

export function noStore(): RequestHandler {
  return (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    next();
  };
}

export function requireAuthentication(
  service: AuthService,
  cookies: AuthCookieSettings,
): RequestHandler {
  return async (req, res, next) => {
    try {
      res.locals.auth = await service.authenticate(
        readCookie(req, cookies.sessionName),
        getRequestId(res),
      );
      res.setHeader("Cache-Control", "no-store");
      next();
    } catch (error) {
      next(safeAuthError(error));
    }
  };
}

export function optionalAuthenticationForLogout(
  service: AuthService,
  cookies: AuthCookieSettings,
): RequestHandler {
  return async (req, res, next) => {
    const token = readCookie(req, cookies.sessionName);
    if (!token) {
      next();
      return;
    }

    try {
      res.locals.auth = await service.authenticate(token, getRequestId(res));
      res.setHeader("Cache-Control", "no-store");
      next();
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) {
        next();
        return;
      }
      next(safeAuthError(error));
    }
  };
}

export function requireAllowedOrigin(service: AuthService): RequestHandler {
  return async (req, res, next) => {
    const context = authenticatedContext(res.locals);
    if (service.originAllowed(req.get("origin"))) {
      next();
      return;
    }
    try {
      await service.recordRequestRejection(
        context,
        "disallowed-origin",
        getRequestId(res),
      );
      next(new HttpError(403, "Request origin is not allowed."));
    } catch (error) {
      next(safeAuthError(error));
    }
  };
}

export function requireCsrf(
  service: AuthService,
  options: { allowAnonymous?: boolean } = {},
): RequestHandler {
  return async (req, res, next) => {
    const context = authenticatedContext(res.locals);
    if (!context && options.allowAnonymous) {
      next();
      return;
    }
    if (!context) {
      next(new HttpError(401, "Authentication required."));
      return;
    }

    const supplied = req.get(CSRF_HEADER_NAME);
    if (service.csrfMatches(context, supplied)) {
      next();
      return;
    }

    const reason = supplied ? "invalid-csrf" : "missing-csrf";
    try {
      await service.recordRequestRejection(context, reason, getRequestId(res));
      next(new HttpError(403, "CSRF validation failed."));
    } catch (error) {
      next(safeAuthError(error));
    }
  };
}

export function requirePermission(
  service: AuthService,
  permission: AuthPermission,
): RequestHandler {
  return async (_req, res, next) => {
    const context = authenticatedContext(res.locals);
    if (!context) {
      next(new HttpError(401, "Authentication required."));
      return;
    }
    try {
      await service.authorize(context, permission, getRequestId(res));
      next();
    } catch (error) {
      next(safeAuthError(error));
    }
  };
}
