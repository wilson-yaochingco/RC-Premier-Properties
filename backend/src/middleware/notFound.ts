import type { Request, Response, NextFunction } from "express";
import { HttpError } from "./errorHandler.js";

/** Catches any request that matched no route and hands it to the error handler. */
export function notFound(req: Request, _res: Response, next: NextFunction): void {
  // Never reflect the query string. OIDC callbacks and other URLs can carry one-time
  // credentials that do not belong in error responses or downstream logs.
  next(new HttpError(404, `Route not found: ${req.method} ${req.path}`));
}
