import type { Request, Response, NextFunction } from "express";
import type { ApiErrorResponse, ValidationIssue } from "@rc/shared";
import { env } from "../config/env.js";
import { errorIdentity, operationalLogger } from "../lib/operational-logger.js";
import { getRequestId } from "./requestContext.js";
import { requestRoute } from "../lib/request-route.js";

/** An error carrying an intended HTTP status code. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly issues?: ValidationIssue[],
    /** Opt in only for reviewed static dependency messages without private details. */
    public readonly exposeMessage = false,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

function requestBodyError(error: unknown): { status: number; message: string } | null {
  if (typeof error !== "object" || error === null || !("type" in error)) return null;

  if (error.type === "entity.parse.failed") {
    return { status: 400, message: "Malformed JSON request body." };
  }
  if (error.type === "entity.too.large") {
    return { status: 413, message: "Request body exceeds the configured limit." };
  }
  return null;
}

/**
 * Terminal error middleware. Must be registered last, and must keep all four
 * parameters -- Express identifies error handlers by arity.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response<ApiErrorResponse>,
  _next: NextFunction,
): void {
  const bodyError = requestBodyError(error);
  const status = error instanceof HttpError ? error.status : (bodyError?.status ?? 500);
  const message =
    error instanceof HttpError
      ? error.message
      : (bodyError?.message ?? "Internal Server Error");

  if (status >= 500) {
    operationalLogger.error("http_request_failed", {
      requestId: getRequestId(res),
      method: req.method,
      route: requestRoute(req),
      statusCode: status,
      errorCode: bodyError
        ? "request_body_error"
        : error instanceof HttpError
          ? `http_error_${status}`
          : "unexpected_server_error",
      ...errorIdentity(error),
    });
  }

  const body: ApiErrorResponse = {
    status: "error",
    statusCode: status,
    message:
      status >= 500 &&
      env.IS_PRODUCTION &&
      !(error instanceof HttpError && error.exposeMessage)
        ? "Internal Server Error"
        : message,
    ...(error instanceof HttpError &&
    error.issues &&
    !(status >= 500 && env.IS_PRODUCTION)
      ? { issues: error.issues }
      : {}),
  };

  res.status(status).json(body);
}
