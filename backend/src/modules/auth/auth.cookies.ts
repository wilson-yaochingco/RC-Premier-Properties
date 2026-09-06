import type { CookieOptions, Request, Response } from "express";
import {
  SESSION_COOKIE_DEVELOPMENT,
  SESSION_COOKIE_PRODUCTION,
  TRANSACTION_COOKIE_DEVELOPMENT,
  TRANSACTION_COOKIE_PRODUCTION,
} from "./auth.constants.js";

export interface AuthCookieSettings {
  secure: boolean;
  sessionName: string;
  transactionName: string;
  sessionMaxAgeMs: number;
  transactionMaxAgeMs: number;
}

export function createAuthCookieSettings(
  secure: boolean,
  sessionMaxAgeMs: number,
  transactionMaxAgeMs: number,
): AuthCookieSettings {
  return {
    secure,
    sessionName: secure ? SESSION_COOKIE_PRODUCTION : SESSION_COOKIE_DEVELOPMENT,
    transactionName: secure
      ? TRANSACTION_COOKIE_PRODUCTION
      : TRANSACTION_COOKIE_DEVELOPMENT,
    sessionMaxAgeMs,
    transactionMaxAgeMs,
  };
}

const baseCookieOptions = (settings: AuthCookieSettings): CookieOptions => ({
  httpOnly: true,
  secure: settings.secure,
  sameSite: "lax",
  path: "/",
});

export function setSessionCookie(
  res: Response,
  settings: AuthCookieSettings,
  token: string,
): void {
  res.cookie(settings.sessionName, token, {
    ...baseCookieOptions(settings),
    maxAge: settings.sessionMaxAgeMs,
  });
}

export function setTransactionCookie(
  res: Response,
  settings: AuthCookieSettings,
  token: string,
): void {
  res.cookie(settings.transactionName, token, {
    ...baseCookieOptions(settings),
    maxAge: settings.transactionMaxAgeMs,
  });
}

export function clearAuthCookies(res: Response, settings: AuthCookieSettings): void {
  const options = baseCookieOptions(settings);
  res.clearCookie(settings.sessionName, options);
  res.clearCookie(settings.transactionName, options);
}

export function clearTransactionCookie(
  res: Response,
  settings: AuthCookieSettings,
): void {
  res.clearCookie(settings.transactionName, baseCookieOptions(settings));
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    if (key !== name) continue;
    const value = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}
