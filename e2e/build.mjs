import { spawn } from "node:child_process";

const FRONTEND_URL = "http://127.0.0.1:3100";
const FIXTURE_API_URL = "http://127.0.0.1:5051";
const npmCli = process.env.npm_execpath;

if (!npmCli) {
  console.error("Run the Playwright build through the root npm pretest:e2e script.");
  process.exit(1);
}

// NEXT_PUBLIC_* values are embedded by `next build`, so setting them only on
// Playwright's `next start` process would leave the browser bundle pointed at the
// normal development API instead of the isolated fixture service.
const build = spawn(process.execPath, [npmCli, "run", "build"], {
  env: {
    ...process.env,
    NEXT_PUBLIC_API_URL: FIXTURE_API_URL,
    NEXT_PUBLIC_SITE_URL: FRONTEND_URL,
  },
  stdio: "inherit",
});

build.once("error", (error) => {
  console.error("Unable to start the Playwright production build.", error);
  process.exitCode = 1;
});

build.once("exit", (code, signal) => {
  if (signal) {
    console.error(`Playwright production build stopped by ${signal}.`);
    process.exitCode = 1;
    return;
  }

  process.exitCode = code ?? 1;
});
