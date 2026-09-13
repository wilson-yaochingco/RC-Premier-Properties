import type { Environment } from "@rc/shared";

export type OperationalTarget = "development" | "staging" | "production";

export interface OperationalCommandArguments {
  target: OperationalTarget;
  limit: number;
  confirmProduction: boolean;
}

function valueAfter(args: readonly string[], prefix: string): string | undefined {
  const inline = args.find((argument) => argument.startsWith(`${prefix}=`));
  if (inline) return inline.slice(prefix.length + 1);
  const index = args.indexOf(prefix);
  return index >= 0 ? args[index + 1] : undefined;
}

export function parseOperationalArguments(
  args: readonly string[],
  defaultLimit = 100,
): OperationalCommandArguments {
  const target = valueAfter(args, "--target");
  if (!target || !["development", "staging", "production"].includes(target)) {
    throw new Error(
      "An explicit --target development|staging|production argument is required.",
    );
  }
  const rawLimit = valueAfter(args, "--limit");
  const limit = rawLimit === undefined ? defaultLimit : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new Error("--limit must be an integer from 1 to 500.");
  }
  return {
    target: target as OperationalTarget,
    limit,
    confirmProduction: args.includes("--confirm-production"),
  };
}

export function assertOperationalTarget(
  command: OperationalCommandArguments,
  nodeEnv: Environment,
  mutates: boolean,
): void {
  if (
    (command.target === "staging" || command.target === "production") &&
    nodeEnv !== "production"
  ) {
    throw new Error(`${command.target} operations require NODE_ENV=production.`);
  }
  if (command.target === "development" && nodeEnv === "production") {
    throw new Error("A production runtime cannot be targeted as development.");
  }
  if (mutates && command.target === "production" && !command.confirmProduction) {
    throw new Error(
      "Production mutation requires the explicit --confirm-production flag.",
    );
  }
}
