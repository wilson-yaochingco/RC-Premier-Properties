import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND_HOST = "127.0.0.1";
const FRONTEND_PORT = 3100;
const FRONTEND_URL = `http://${FRONTEND_HOST}:${FRONTEND_PORT}`;
const FIXTURE_API_URL = "http://127.0.0.1:5051";
const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(FRONTEND_PORT, FRONTEND_HOST, () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function closeServer(server) {
  if (!server?.listening) return Promise.resolve();

  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections?.();
  });
}

async function stopServers(frontendServer, nextApp, fixtureServer) {
  const results = await Promise.allSettled([
    closeServer(frontendServer),
    nextApp?.close?.() ?? Promise.resolve(),
    closeServer(fixtureServer),
  ]);
  const errors = results
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason);

  if (errors.length > 0) {
    throw new AggregateError(errors, "Unable to stop the Playwright test servers.");
  }
}

export default async function globalSetup() {
  // These values are also embedded by e2e/build.mjs. Setting them here keeps
  // server-rendered requests and metadata on the same isolated test origins.
  process.env.NODE_ENV = "test";
  process.env.MONGODB_URI =
    "mongodb://127.0.0.1:27017/rc-premier-properties-playwright-unused";
  process.env.CORS_ORIGIN = FRONTEND_URL;
  process.env.NEXT_PUBLIC_API_URL = FIXTURE_API_URL;
  process.env.NEXT_PUBLIC_SITE_URL = FRONTEND_URL;

  let fixtureServer;
  let nextApp;
  let frontendServer;

  try {
    const [{ startFixtureApi }, { default: next }] = await Promise.all([
      import("./fixture-api.mjs"),
      import("next"),
    ]);

    fixtureServer = await startFixtureApi();
    nextApp = next({
      dev: false,
      dir: path.join(REPOSITORY_ROOT, "frontend"),
      hostname: FRONTEND_HOST,
      port: FRONTEND_PORT,
    });
    await nextApp.prepare();

    frontendServer = createServer(nextApp.getRequestHandler());
    await listen(frontendServer);
  } catch (error) {
    await stopServers(frontendServer, nextApp, fixtureServer).catch(() => {});
    throw error;
  }

  return async () => {
    await stopServers(frontendServer, nextApp, fixtureServer);
  };
}
