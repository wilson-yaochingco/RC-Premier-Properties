import { once } from "node:events";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Express } from "express";
import mongoose from "mongoose";
import { attachDatabasePool } from "@vercel/functions";
import { API_PREFIX } from "@rc/shared";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { HttpError } from "./middleware/errorHandler.js";

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
      unavailableApp ??= createApp({
        applicationRateLimit: (_req, _res, next) =>
          next(new HttpError(503, "Database service is unavailable.")),
      });
      const closed = once(res, "close");
      unavailableApp(req, res);
      await closed;
      return;
    }
  }
  const closed = once(res, "close");
  app(req, res);
  await closed;
}
