import { API_PREFIX } from "@rc/shared";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { safeErrorMessage } from "./lib/safe-error.js";

async function start(): Promise<void> {
  try {
    await connectDatabase();
  } catch (error) {
    const message = safeErrorMessage(error, [env.MONGODB_URI]);

    if (env.NODE_ENV !== "development") {
      console.error(
        `[db] connection failed, refusing to start in ${env.NODE_ENV}: ${message}`,
      );
      process.exit(1);
    }

    console.warn(
      `[db] connection failed: ${message}\n` +
        `[db] continuing without MongoDB (NODE_ENV=${env.NODE_ENV}). ` +
        `${API_PREFIX}/health will report the database as disconnected.`,
    );
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(
      `[server] rc-premier-backend listening on port ${env.PORT} (${env.NODE_ENV})`,
    );
    console.log(`[server] liveness: ${API_PREFIX}/health`);
    console.log(`[server] readiness: ${API_PREFIX}/health/ready`);
    if (env.APP_BUILD_ID) console.log(`[server] build: ${env.APP_BUILD_ID}`);
  });

  let shutdownStarted = false;
  let shutdownFinished = false;

  const shutdown = (signal: string): void => {
    if (shutdownStarted) return;
    shutdownStarted = true;
    console.log(`[server] ${signal} received, shutting down`);

    const finish = (exitCode: number): void => {
      if (shutdownFinished) return;
      shutdownFinished = true;
      void disconnectDatabase()
        .catch((error: unknown) =>
          console.error(
            "[db] close failed:",
            safeErrorMessage(error, [env.MONGODB_URI]),
          ),
        )
        .finally(() => process.exit(exitCode));
    };

    const forceTimer = setTimeout(() => {
      console.error(
        `[server] shutdown exceeded ${env.SHUTDOWN_GRACE_SECONDS} seconds; closing remaining connections`,
      );
      server.closeAllConnections();
      finish(1);
    }, env.SHUTDOWN_GRACE_SECONDS * 1_000);
    forceTimer.unref();

    server.close((error) => {
      clearTimeout(forceTimer);
      if (error) {
        console.error("[server] HTTP close failed:", safeErrorMessage(error));
      }
      finish(error ? 1 : 0);
    });
    server.closeIdleConnections();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

void start();
