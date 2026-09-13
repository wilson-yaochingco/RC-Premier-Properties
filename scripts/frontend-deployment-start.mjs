import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { forwardTerminationSignals } from "./forward-termination-signals.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

const deploymentEnvironment = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV?.trim();
if (deploymentEnvironment !== "staging" && deploymentEnvironment !== "production") {
  console.error(
    "Set NEXT_PUBLIC_DEPLOYMENT_ENV to staging or production before starting the deployed frontend.",
  );
  process.exit(1);
}

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error("Start the deployed frontend through npm from the repository root.");
  process.exit(1);
}

const server = spawn(
  process.execPath,
  [
    require.resolve("next/dist/bin/next"),
    "start",
    path.join(repositoryRoot, "frontend"),
  ],
  { cwd: repositoryRoot, env: process.env, stdio: "inherit" },
);
const signalForwarding = forwardTerminationSignals(server);

server.once("error", (error) => {
  signalForwarding.cleanup();
  console.error("Unable to start the deployed frontend:", error.message);
  process.exitCode = 1;
});

server.once("exit", (code, signal) => {
  const forwardedSignal = signalForwarding.forwardedSignal();
  signalForwarding.cleanup();
  if (forwardedSignal) {
    process.kill(process.pid, forwardedSignal);
    return;
  }
  if (signal) {
    console.error(`Deployed frontend stopped by ${signal}.`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
