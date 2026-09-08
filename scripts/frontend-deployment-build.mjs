import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const deploymentEnvironment = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV?.trim();
if (deploymentEnvironment !== "staging" && deploymentEnvironment !== "production") {
  console.error(
    "Set NEXT_PUBLIC_DEPLOYMENT_ENV to staging or production before running the deployment build.",
  );
  process.exit(1);
}

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error("Run the deployment build through npm from the repository root.");
  process.exit(1);
}

const build = spawn(
  process.execPath,
  [npmCli, "run", "build", "--workspace", "frontend"],
  { cwd: repositoryRoot, env: process.env, stdio: "inherit" },
);

build.once("error", (error) => {
  console.error("Unable to start the frontend deployment build:", error.message);
  process.exitCode = 1;
});

build.once("exit", (code, signal) => {
  if (signal) {
    console.error(`Frontend deployment build stopped by ${signal}.`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
