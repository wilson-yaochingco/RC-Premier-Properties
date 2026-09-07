import express, { type Express } from "express";
import cors from "cors";
import { API_PREFIX } from "@rc/shared";
import { env } from "./config/env.js";
import { createApiRouter, type ApiDependencies } from "./routes.js";
import { apiRateLimit } from "./middleware/rateLimit.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestContext } from "./middleware/requestContext.js";
import { createSecurityHeaders } from "./middleware/securityHeaders.js";

/**
 * Builds the configured Express application without starting a listener, so it can be
 * imported directly by future integration tests.
 */
export function createApp(dependencies: ApiDependencies = {}): Express {
  const app = express();

  // Trust forwarded addresses only when the deployment explicitly states its exact
  // proxy depth. Direct deployments keep Express's safe default of trusting none.
  if (env.TRUST_PROXY_HOPS > 0) {
    app.set("trust proxy", env.TRUST_PROXY_HOPS);
  }

  app.use(...createSecurityHeaders(env.IS_PRODUCTION));
  app.use(requestContext);
  app.use(
    cors({
      origin: (origin, callback) => {
        callback(null, !origin || origin === env.CORS_ORIGIN);
      },
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
