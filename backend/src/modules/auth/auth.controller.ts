import type { Request, Response } from "express";
import type { CurrentSessionResponse, LogoutResponse } from "@rc/shared";
import { HttpError } from "../../middleware/errorHandler.js";
import { getRequestId } from "../../middleware/requestContext.js";
import {
  clearAuthCookies,
  clearTransactionCookie,
  readCookie,
  setSessionCookie,
  setTransactionCookie,
  type AuthCookieSettings,
} from "./auth.cookies.js";
import { authenticatedContext } from "./auth.middleware.js";
import { AuthService } from "./auth.service.js";

function returnToQuery(req: Request): string | undefined {
  const value = req.query.returnTo;
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new HttpError(400, "Invalid login return URL.");
  return value;
}

function callbackUrl(req: Request, configuredUrl: string): URL {
  const url = new URL(configuredUrl);
  url.search = new URL(req.originalUrl, "http://internal.invalid").search;
  return url;
}

export function createAuthController(
  service: AuthService,
  cookies: AuthCookieSettings,
) {
  return {
    async start(req: Request, res: Response): Promise<void> {
      try {
        const result = await service.startLogin(returnToQuery(req));
        setTransactionCookie(res, cookies, result.transactionToken);
        res.redirect(302, result.authorizationUrl);
      } catch (error) {
        throw error instanceof HttpError
          ? error
          : new HttpError(503, "Authentication service is unavailable.");
      }
    },

    async callback(req: Request, res: Response): Promise<void> {
      try {
        const result = await service.completeLogin({
          transactionToken: readCookie(req, cookies.transactionName),
          previousSessionToken: readCookie(req, cookies.sessionName),
          callbackUrl: callbackUrl(req, service.config.callbackUrl),
          requestId: getRequestId(res),
        });
        clearTransactionCookie(res, cookies);
        setSessionCookie(res, cookies, result.sessionToken);
        res.redirect(303, result.returnTo);
      } catch (error) {
        clearTransactionCookie(res, cookies);
        throw error instanceof HttpError
          ? error
          : new HttpError(503, "Authentication service is unavailable.");
      }
    },

    current(_req: Request, res: Response<CurrentSessionResponse>): void {
      const context = authenticatedContext(res.locals);
      if (!context) throw new HttpError(401, "Authentication required.");
      res.status(200).json(service.currentSession(context));
    },

    async logout(_req: Request, res: Response<LogoutResponse>): Promise<void> {
      try {
        await service.logout(authenticatedContext(res.locals), getRequestId(res));
        clearAuthCookies(res, cookies);
        res.status(200).json({ status: "logged-out" });
      } catch (error) {
        throw error instanceof HttpError
          ? error
          : new HttpError(503, "Authentication service is unavailable.");
      }
    },
  };
}
