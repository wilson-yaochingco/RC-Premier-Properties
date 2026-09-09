import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import {
  assertOperationalTarget,
  parseOperationalArguments,
} from "../lib/operational-target.js";
import { errorIdentity, operationalLogger } from "../lib/operational-logger.js";
import {
  inspectDataIntegrity,
  loadIntegritySnapshot,
} from "../modules/operations/integrity.service.js";

async function main(): Promise<void> {
  const command = parseOperationalArguments(process.argv.slice(2));
  assertOperationalTarget(command, env.NODE_ENV, false);
  await connectDatabase();
  try {
    const report = inspectDataIntegrity(await loadIntegritySnapshot());
    console.log(JSON.stringify(report, null, 2));
    if (report.counts.errors > 0) process.exitCode = 2;
  } finally {
    await disconnectDatabase();
  }
}

main().catch((error) => {
  operationalLogger.error("data_integrity_scan_failed", {
    ...errorIdentity(error),
  });
  process.exitCode = 1;
});
