import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";

async function start(): Promise<void> {
  try {
    await connectDatabase();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (env.IS_PRODUCTION) {
      console.error(`[db] connection failed, refusing to start: ${message}`);
      process.exit(1);
    }

    console.warn(
      `[db] connection failed: ${message}\n` +
        `[db] continuing without MongoDB (NODE_ENV=${env.NODE_ENV}). ` +
        `/api/health will report the database as disconnected.`,
    );
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(
      `[server] rc-premier-backend listening on http://localhost:${env.PORT} (${env.NODE_ENV})`,
    );
    console.log(`[server] health check: http://localhost:${env.PORT}/api/health`);
  });

  const shutdown = (signal: string): void => {
    console.log(`\n[server] ${signal} received, shutting down`);
    server.close(() => {
      void disconnectDatabase()
        .catch((error: unknown) => console.error("[db] close failed:", error))
        .finally(() => process.exit(0));
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

void start();
