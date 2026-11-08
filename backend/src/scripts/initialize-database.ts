import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import {
  assertOperationalTarget,
  parseOperationalArguments,
} from "../lib/operational-target.js";
import { errorIdentity, operationalLogger } from "../lib/operational-logger.js";
import { AuthSessionModel } from "../modules/auth/auth-session.model.js";
import { OidcTransactionModel } from "../modules/auth/oidc-transaction.model.js";
import { SecurityAuditEventModel } from "../modules/auth/security-audit-event.model.js";
import { StaffIdentityModel } from "../modules/auth/staff-identity.model.js";
import { InquiryModel } from "../modules/inquiries/inquiry.model.js";
import { PropertyMediaCleanupTaskModel } from "../modules/properties/property-media-cleanup.model.js";
import { PropertyModel } from "../modules/properties/property.model.js";

/**
 * Creates every collection and builds the indexes the schemas declare, in a new database.
 * Additive only: existing collections and documents are untouched, and indexes are never
 * dropped (no syncIndexes). Requires `--expect-database <name>` to match the connection.
 */
const MODELS = [
  PropertyModel,
  InquiryModel,
  StaffIdentityModel,
  AuthSessionModel,
  OidcTransactionModel,
  SecurityAuditEventModel,
  PropertyMediaCleanupTaskModel,
] as const;

function option(name: string): string | undefined {
  const args = process.argv.slice(2);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main(): Promise<void> {
  const command = parseOperationalArguments(process.argv.slice(2));
  assertOperationalTarget(command, env.NODE_ENV, true);
  const expectedDatabase = option("--expect-database");
  if (!expectedDatabase) throw new Error("--expect-database <name> is required.");

  await connectDatabase();
  try {
    if (mongoose.connection.name !== expectedDatabase) {
      throw new Error(
        `Connected to database "${mongoose.connection.name}", expected "${expectedDatabase}". Nothing was changed.`,
      );
    }
    console.log(`database: ${mongoose.connection.name}`);
    for (const model of MODELS) {
      await model.createCollection();
      await model.createIndexes();
      const indexes = (await model.collection.indexes()).map((index) => index.name);
      console.log(`${model.collection.name}: ${indexes.join(", ")}`);
    }
  } finally {
    await disconnectDatabase();
  }
}

main().catch((error) => {
  operationalLogger.error("database_initialization_failed", {
    ...errorIdentity(error),
  });
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
