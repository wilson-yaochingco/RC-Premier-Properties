import { API_PREFIX } from "@rc/shared";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { errorIdentity, operationalLogger } from "./lib/operational-logger.js";

const HTTP_REQUEST_TIMEOUT_MS = 15_000;

async function start(): Promise<void> {
  try {
    await connectDatabase();
  } catch (error) {
    if (env.NODE_ENV !== "development") {
      operationalLogger.error("server_start_refused", {
        dependency: "mongodb",
        errorCode: "database_connection_failed",
        ...errorIdentity(error),
      });
      process.exit(1);
    }

    operationalLogger.warn("server_started_degraded", {
      dependency: "mongodb",
      errorCode: "database_connection_failed",
      ...errorIdentity(error),
    });
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    operationalLogger.info("server_listening", {
      operation: `port:${env.PORT}`,
    });
    operationalLogger.debug("server_health_routes", {
      route: `${API_PREFIX}/health`,
      operation: `${API_PREFIX}/health/ready`,
    });
  });
  server.requestTimeout = HTTP_REQUEST_TIMEOUT_MS;
  server.headersTimeout = 10_000;
  server.setTimeout(HTTP_REQUEST_TIMEOUT_MS);

  let shutdownStarted = false;
  let shutdownFinished = false;

  const shutdown = (signal: string): void => {
    if (shutdownStarted) return;
    shutdownStarted = true;
    operationalLogger.info("server_shutdown_started", { signal });

    const finish = (exitCode: number): void => {
      if (shutdownFinished) return;
      shutdownFinished = true;
      void disconnectDatabase()
        .catch((error: unknown) =>
          operationalLogger.error("dependency_close_failed", {
            dependency: "mongodb",
            ...errorIdentity(error),
          }),
        )
        .finally(() => process.exit(exitCode));
    };

    const forceTimer = setTimeout(() => {
      operationalLogger.error("server_shutdown_timeout", {
        errorCode: "shutdown_grace_exceeded",
      });
      server.closeAllConnections();
      finish(1);
    }, env.SHUTDOWN_GRACE_SECONDS * 1_000);
    forceTimer.unref();

    server.close((error) => {
      clearTimeout(forceTimer);
      if (error) {
        operationalLogger.error("server_http_close_failed", {
          ...errorIdentity(error),
        });
      }
      finish(error ? 1 : 0);
    });
    server.closeIdleConnections();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

void start();
