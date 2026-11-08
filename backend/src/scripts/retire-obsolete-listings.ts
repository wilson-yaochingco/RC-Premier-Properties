import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import {
  assertOperationalTarget,
  parseOperationalArguments,
} from "../lib/operational-target.js";
import { errorIdentity, operationalLogger } from "../lib/operational-logger.js";
import { mongooseAuthStore } from "../modules/auth/auth.store.js";
import { PropertyModel } from "../modules/properties/property.model.js";
import {
  DefaultAdminPropertyService,
  MongoosePropertyAdminRepository,
  mongooseAdminPropertyService,
} from "../modules/properties/property.service.js";
import type { AdminPropertyRecord } from "../modules/properties/property.types.js";
import {
  LEGACY_PROPERTY_IDS,
  REPLACEMENT_PROPERTY_IDS,
  retirementBlocker,
} from "./legacy-property-retirement-plan.js";

/**
 * Archives only the two legacy RC Premier records. It cannot publish a replacement or
 * delete a property/inquiry; restore returns each record to unpublished for staff review.
 *
 * Default mode is read-only. Apply requires a freshly verified export, all six intended
 * replacements already published, an exact database guard, and an explicit audit actor.
 */
function option(name: string): string | undefined {
  const args = process.argv.slice(2);
  const inline = args.find((argument) => argument.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function canonical(value: unknown): string {
  return mongoose.mongo.BSON.EJSON.stringify(value, { relaxed: false });
}

interface Backup {
  format: "rc-premier-backup/1";
  database: string;
  collections: {
    properties: Record<string, unknown>[];
    inquiries: Record<string, unknown>[];
  };
}

async function readBackup(file: string, database: string): Promise<Backup> {
  const backup = mongoose.mongo.BSON.EJSON.parse(await readFile(file, "utf8"), {
    relaxed: false,
  }) as Backup;
  if (backup.format !== "rc-premier-backup/1" || backup.database !== database) {
    throw new Error(
      "--backup must be a verified rc-premier-backup/1 export for this database.",
    );
  }
  for (const propertyId of LEGACY_PROPERTY_IDS) {
    if (
      !backup.collections.properties.some((record) => record.propertyId === propertyId)
    ) {
      throw new Error(`Backup does not contain ${propertyId}.`);
    }
  }
  if (
    !backup.collections.inquiries.some(
      (record) => record.propertyId === LEGACY_PROPERTY_IDS[0],
    )
  ) {
    throw new Error(
      `Backup does not preserve an inquiry for ${LEGACY_PROPERTY_IDS[0]}.`,
    );
  }
  return backup;
}

async function main(): Promise<void> {
  const command = parseOperationalArguments(process.argv.slice(2));
  const apply = process.argv.includes("--apply");
  assertOperationalTarget(command, env.NODE_ENV, apply);
  const database = option("--database");
  const expectedDatabase = option("--expect-database");
  const backupPath = option("--backup");
  const actorStaffIdentityId = option("--actor-staff-id");
  const unattributed = process.argv.includes("--unattributed");

  if (!database) throw new Error("--database <name> is required.");
  if (apply && expectedDatabase !== database) {
    throw new Error("--apply requires --expect-database to exactly match --database.");
  }
  if (apply && !backupPath)
    throw new Error("--apply requires --backup <verified-export.json>.");
  if (apply && unattributed === Boolean(actorStaffIdentityId)) {
    throw new Error(
      "--apply requires exactly one of --actor-staff-id or --unattributed.",
    );
  }
  if (actorStaffIdentityId && !/^[a-f0-9]{24}$/i.test(actorStaffIdentityId)) {
    throw new Error("--actor-staff-id must be an existing staff identity id.");
  }

  const backup = backupPath ? await readBackup(backupPath, database) : undefined;
  await connectDatabase({ database });
  try {
    if (mongoose.connection.name !== database) {
      throw new Error(
        `Connected to "${mongoose.connection.name}", expected "${database}".`,
      );
    }
    const targets = await PropertyModel.find({
      propertyId: { $in: LEGACY_PROPERTY_IDS },
    })
      .select("+location.privateAddress +location.coordinates")
      .lean<AdminPropertyRecord[]>();
    const replacements = await PropertyModel.find({
      propertyId: { $in: REPLACEMENT_PROPERTY_IDS },
    })
      .select("propertyId publicationStatus gallery coverMedia")
      .lean<
        Array<
          Pick<
            AdminPropertyRecord,
            "propertyId" | "publicationStatus" | "gallery" | "coverMedia"
          >
        >
      >();
    const inquiryCount = await mongoose.connection
      .db!.collection("inquiries")
      .countDocuments({ propertyId: LEGACY_PROPERTY_IDS[0] });
    const publishedReplacements = replacements.filter(
      (record) => record.publicationStatus === "published",
    );

    console.log(`database: ${database}`);
    console.log(
      `legacy records: ${targets.map((record) => `${record.propertyId} (${record.publicationStatus})`).join(", ")}`,
    );
    console.log(
      `replacement records published: ${publishedReplacements.length}/${REPLACEMENT_PROPERTY_IDS.length}`,
    );
    console.log(`inquiries for ${LEGACY_PROPERTY_IDS[0]}: ${inquiryCount}`);

    if (!apply) {
      if (backup) {
        const backupTargets = backup.collections.properties
          .filter((record) =>
            LEGACY_PROPERTY_IDS.includes(
              record.propertyId as (typeof LEGACY_PROPERTY_IDS)[number],
            ),
          )
          .sort((left, right) =>
            String(left.propertyId).localeCompare(String(right.propertyId)),
          );
        const liveTargets = await mongoose.connection
          .db!.collection("properties")
          .find({ propertyId: { $in: LEGACY_PROPERTY_IDS } })
          .sort({ propertyId: 1 })
          .toArray();
        const backupInquiries = backup.collections.inquiries.filter(
          (record) => record.propertyId === LEGACY_PROPERTY_IDS[0],
        );
        const liveInquiries = await mongoose.connection
          .db!.collection("inquiries")
          .find({ propertyId: LEGACY_PROPERTY_IDS[0] })
          .sort({ _id: 1 })
          .toArray();
        const targetsMatch =
          backupTargets.length === liveTargets.length &&
          backupTargets.every(
            (record, index) => canonical(record) === canonical(liveTargets[index]),
          );
        const inquiriesMatch =
          backupInquiries.length === liveInquiries.length &&
          backupInquiries.every(
            (record, index) => canonical(record) === canonical(liveInquiries[index]),
          );
        console.log(`backup legacy records: ${targetsMatch ? "match" : "MISMATCH"}`);
        console.log(`backup linked inquiry: ${inquiriesMatch ? "match" : "MISMATCH"}`);
        if (!targetsMatch || !inquiriesMatch) {
          throw new Error(
            "Backup differs from the current legacy records or linked inquiry.",
          );
        }
      }
      console.log("Dry run only. Nothing was changed.");
      return;
    }
    if (!backup) throw new Error("A verified backup is required.");

    const backupTargets = backup.collections.properties
      .filter((record) =>
        LEGACY_PROPERTY_IDS.includes(
          record.propertyId as (typeof LEGACY_PROPERTY_IDS)[number],
        ),
      )
      .sort((left, right) =>
        String(left.propertyId).localeCompare(String(right.propertyId)),
      );
    const liveTargets = await mongoose.connection
      .db!.collection("properties")
      .find({ propertyId: { $in: LEGACY_PROPERTY_IDS } })
      .sort({ propertyId: 1 })
      .toArray();
    const backupTargetsMatch =
      backupTargets.length === liveTargets.length &&
      backupTargets.every(
        (record, index) => canonical(record) === canonical(liveTargets[index]),
      );
    const backedUpInquiries = backup.collections.inquiries.filter(
      (record) => record.propertyId === LEGACY_PROPERTY_IDS[0],
    );
    const liveInquiries = await mongoose.connection
      .db!.collection("inquiries")
      .find({ propertyId: LEGACY_PROPERTY_IDS[0] })
      .sort({ _id: 1 })
      .toArray();
    const backupInquiriesMatch = !(
      backedUpInquiries.length !== liveInquiries.length ||
      !backedUpInquiries.every(
        (record, index) => canonical(record) === canonical(liveInquiries[index]),
      )
    );
    const blocker = retirementBlocker({
      targetStatuses: new Map(
        targets.map((record) => [record.propertyId, record.publicationStatus]),
      ),
      publishedReplacementIds: publishedReplacements.map((record) => record.propertyId),
      linkedInquiryCount: inquiryCount,
      backupTargetsMatch,
      backupInquiriesMatch,
    });
    if (blocker) throw new Error(blocker);

    const audit = unattributed
      ? {
          recordAudit: async (
            event: Parameters<typeof mongooseAuthStore.recordAudit>[0],
          ) =>
            mongooseAuthStore.recordAudit({
              ...event,
              actorStaffIdentityId: undefined,
            }),
        }
      : mongooseAuthStore;
    const service = unattributed
      ? new DefaultAdminPropertyService(new MongoosePropertyAdminRepository(), audit)
      : mongooseAdminPropertyService;
    const requestId = `legacy-property-retirement-${randomUUID()}`;
    const archived: string[] = [];
    for (const current of targets) {
      let result;
      try {
        result = await service.archive(
          String(current._id),
          { expectedVersion: current.__v ?? 0 },
          { actorStaffIdentityId: actorStaffIdentityId ?? "", requestId },
        );
      } catch (error) {
        const previous = archived.length > 0 ? archived.join(", ") : "none";
        throw new Error(
          `Retirement stopped while archiving ${current.propertyId}. Previously archived: ${previous}. No automatic rollback was attempted. ${error instanceof Error ? error.message : "Unknown archive failure."}`,
        );
      }
      if (!result) {
        const previous = archived.length > 0 ? archived.join(", ") : "none";
        throw new Error(
          `Retirement stopped before archiving ${current.propertyId}; its lifecycle version or status changed. Previously archived: ${previous}. No automatic rollback was attempted.`,
        );
      }
      archived.push(current.propertyId);
      console.log(`archived: ${current.propertyId} (restores as unpublished)`);
    }
    const after = await mongoose.connection
      .db!.collection("inquiries")
      .countDocuments({ propertyId: LEGACY_PROPERTY_IDS[0] });
    if (after !== inquiryCount)
      throw new Error(
        "Inquiry count changed unexpectedly; stop and inspect the database.",
      );
    console.log(`preserved inquiries for ${LEGACY_PROPERTY_IDS[0]}: ${after}`);
  } finally {
    await disconnectDatabase();
  }
}

main().catch((error) => {
  operationalLogger.error("legacy_property_retirement_failed", {
    ...errorIdentity(error),
  });
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
