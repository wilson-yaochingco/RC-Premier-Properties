import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { API_PREFIX } from "@rc/shared";
import { env } from "./config/env.js";
import { createApiRouter, type ApiDependencies } from "./routes.js";
import { apiRateLimit } from "./middleware/rateLimit.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestContext } from "./middleware/requestContext.js";

/**
 * Builds the configured Express application without starting a listener, so it can be
 * imported directly by future integration tests.
 */
export function createApp(dependencies: ApiDependencies = {}): Express {
  const app = express();

  // Behind a reverse proxy in production, so rate limiting sees real client IPs.
  if (env.IS_PRODUCTION) {
    app.set("trust proxy", 1);
  }

  app.use(helmet());
  app.use(requestContext);
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.use(API_PREFIX, apiRateLimit, createApiRouter(dependencies));

  // Must stay last, and in this order.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
