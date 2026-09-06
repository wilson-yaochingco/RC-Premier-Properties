import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

/** Assigns a server-generated correlation identifier without trusting caller input. */
export function requestContext(_req: Request, res: Response, next: NextFunction): void {
  const requestId = randomUUID();
  res.locals.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
}

export function getRequestId(res: Response): string {
  return typeof res.locals.requestId === "string" ? res.locals.requestId : randomUUID();
}
