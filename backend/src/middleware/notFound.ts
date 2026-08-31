import type { Request, Response, NextFunction } from "express";
import { HttpError } from "./errorHandler.js";

/** Catches any request that matched no route and hands it to the error handler. */
export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}
