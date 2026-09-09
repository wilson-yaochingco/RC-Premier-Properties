import type { NextFunction, Request, Response } from "express";
import {
  operationalLogger,
  type OperationalLogger,
} from "../lib/operational-logger.js";
import { getRequestId } from "./requestContext.js";

/** Logs only allowlisted request metadata. Headers, query values and bodies are excluded. */
export function createRequestLogging(
  logger: OperationalLogger = operationalLogger,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const startedAt = process.hrtime.bigint();
    res.once("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const fields = {
        requestId: getRequestId(res),
        method: req.method,
        route: req.path,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
      };
      if (res.statusCode >= 500) logger.error("http_request_completed", fields);
      else if (res.statusCode >= 400) logger.warn("http_request_completed", fields);
      else logger.info("http_request_completed", fields);
    });
    next();
  };
}

export const requestLogging = createRequestLogging();
