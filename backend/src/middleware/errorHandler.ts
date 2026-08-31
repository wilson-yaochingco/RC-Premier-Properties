import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

/** An error carrying an intended HTTP status code. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Terminal error middleware. Must be registered last, and must keep all four
 * parameters — Express identifies error handlers by arity.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = error instanceof HttpError ? error.status : 500;
  const message =
    error instanceof Error ? error.message : "Internal Server Error";

  if (status >= 500) {
    console.error("[error]", error);
  }

  res.status(status).json({
    status: "error",
    statusCode: status,
    message: status >= 500 && env.IS_PRODUCTION ? "Internal Server Error" : message,
  });
}
