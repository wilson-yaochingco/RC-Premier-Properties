import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import {
  assertOperationalTarget,
  parseOperationalArguments,
} from "../lib/operational-target.js";
import { errorIdentity, operationalLogger } from "../lib/operational-logger.js";
import { mongooseInquiryNotificationRetryService } from "../modules/inquiries/inquiry-notification-retry.service.js";

async function main(): Promise<void> {
  const command = parseOperationalArguments(process.argv.slice(2), 50);
  assertOperationalTarget(command, env.NODE_ENV, true);
  await connectDatabase();
  try {
    const result = await mongooseInquiryNotificationRetryService.processDue(
      command.limit,
    );
    operationalLogger.info("inquiry_notification_retry_batch_completed", {
      target: command.target,
      count: result.attempted,
      deliveredCount: result.delivered,
      retryPendingCount: result.retryPending,
      terminalFailureCount: result.terminalFailures,
      leaseConflictCount: result.leaseConflicts,
    });
  } finally {
    await disconnectDatabase();
  }
}

main().catch((error) => {
  operationalLogger.error("inquiry_notification_retry_batch_failed", {
    ...errorIdentity(error),
  });
  process.exitCode = 1;
});
