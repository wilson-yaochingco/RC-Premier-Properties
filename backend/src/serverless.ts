import type { IncomingMessage, ServerResponse } from "node:http";
import express, { type Express } from "express";
import cors from "cors";
import mongoose from "mongoose";
import { attachDatabasePool } from "@vercel/functions";
import { API_PREFIX } from "@rc/shared";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { errorHandler, HttpError } from "./middleware/errorHandler.js";
import { requestContext } from "./middleware/requestContext.js";
import { requestLogging } from "./middleware/requestLogging.js";
import { createSecurityHeaders } from "./middleware/securityHeaders.js";

let app: Express | undefined;
let unavailableApp: Express | undefined;
let connection: Promise<void> | undefined;

function ensureDatabase(): Promise<void> {
  connection ??= connectDatabase()
    .then(() => {
      attachDatabasePool(mongoose.connection.getClient());
    })
    .catch((error: unknown) => {
      connection = undefined;
      throw error;
    });
  return connection;
}

export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  // Next's own helpers shadow Express's prototype methods and query parser.
  for (const key of ["query", "cookies", "previewData", "preview", "draftMode"]) {
    Reflect.deleteProperty(req, key);
  }
  for (const key of [
    "status",
    "send",
    "json",
    "redirect",
    "setDraftMode",
    "setPreviewData",
    "clearPreviewData",
    "revalidate",
  ]) {
    Reflect.deleteProperty(res, key);
  }

  app ??= createApp();
  const path = req.url?.split("?")[0]?.replace(/\/$/, "").toLowerCase();
  if (path !== `${API_PREFIX}/health` && path !== `${API_PREFIX}/health/ready`) {
    try {
      await ensureDatabase();
    } catch {
      // Keep dependency failures on the normal security, logging and error stack.
      if (!unavailableApp) {
        unavailableApp = express();
        unavailableApp.use(...createSecurityHeaders(env.IS_PRODUCTION));
        unavailableApp.use(requestContext);
        unavailableApp.use(requestLogging);
        unavailableApp.use(
          cors({
            origin: (origin, callback) => {
              callback(null, !origin || origin === env.CORS_ORIGIN);
            },
            credentials: true,
            preflightContinue: true,
          }),
        );
        unavailableApp.use(() => {
          throw new HttpError(503, "Database service is unavailable.");
        });
        unavailableApp.use(errorHandler);
      }
      unavailableApp(req, res);
      return;
    }
  }
  app(req, res);
}
