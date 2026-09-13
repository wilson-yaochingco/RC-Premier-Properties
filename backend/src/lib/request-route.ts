import type { Request } from "express";

/** Retain the registered endpoint without copying caller-controlled path parameters. */
export function requestRoute(req: Request): string {
  const route: unknown = req.route?.path;
  return typeof route === "string" ? `${req.baseUrl}${route}` : "unmatched";
}
