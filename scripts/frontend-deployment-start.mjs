import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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
  [npmCli, "run", "start:next", "--workspace", "frontend"],
  { cwd: repositoryRoot, env: process.env, stdio: "inherit" },
);

server.once("error", (error) => {
  console.error("Unable to start the deployed frontend:", error.message);
  process.exitCode = 1;
});

server.once("exit", (code, signal) => {
  if (signal) {
    console.error(`Deployed frontend stopped by ${signal}.`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
