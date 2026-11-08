import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import {
  assertOperationalTarget,
  parseOperationalArguments,
} from "../lib/operational-target.js";
import { errorIdentity, operationalLogger } from "../lib/operational-logger.js";
import { HttpError } from "../middleware/errorHandler.js";
import { mongooseAuthStore } from "../modules/auth/auth.store.js";
import { PropertyModel } from "../modules/properties/property.model.js";
import {
  DefaultAdminPropertyService,
  MongoosePropertyAdminRepository,
  mongooseAdminPropertyService,
} from "../modules/properties/property.service.js";
import { parseCreateDraftPropertyBody } from "../modules/properties/property.validation.js";
import { inspectPropertyImage } from "../modules/properties/property-media.validation.js";
import { readListingPhoto } from "./rc-listings-photos.js";
import { RC_PREMIER_LISTINGS } from "./rc-premier-listings.js";

/**
 * Prepares the six RC Premier listings through the existing admin service.
 *
 *   --source <dir>          folder containing property-1 ... property-6 (required)
 *   --apply                 create records and upload photos; without it this is a dry run
 *   --database <db>         explicitly named database instead of the one in MONGODB_URI
 *   --expect-database <db>  the database name the connection must report (apply only)
 *   --actor-staff-id <id>   existing staff identity recorded in the audit trail (apply only)
 *   --unattributed          no staff identity yet: audit rows carry no actor and a batch id
 *
 * A dry run reads the photos and validates every listing but touches neither MongoDB nor
 * Cloudinary. Apply creates only listings that do not exist yet, always as drafts, and never
 * updates or deletes anything. Held listings are skipped.
 */
function option(name: string): string | undefined {
  const args = process.argv.slice(2);
  const inline = args.find((argument) => argument.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main(): Promise<void> {
  const command = parseOperationalArguments(process.argv.slice(2));
  const apply = process.argv.includes("--apply");
  assertOperationalTarget(command, env.NODE_ENV, apply);

  const sourceRoot = option("--source");
  if (!sourceRoot) throw new Error("--source <folder> is required.");
  const actorStaffIdentityId = option("--actor-staff-id");
  const unattributed = process.argv.includes("--unattributed");
  const expectedDatabase = option("--expect-database");
  if (apply) {
    if (!expectedDatabase)
      throw new Error("--apply requires --expect-database <name>.");
    if (unattributed === Boolean(actorStaffIdentityId)) {
      throw new Error(
        "--apply requires exactly one of --actor-staff-id or --unattributed.",
      );
    }
    if (actorStaffIdentityId && !/^[a-f0-9]{24}$/i.test(actorStaffIdentityId)) {
      throw new Error("--actor-staff-id must be an existing staff identity id.");
    }
  }

  // Everything is read and validated first, so a bad file or listing aborts before any write.
  const plan = [];
  for (const listing of RC_PREMIER_LISTINGS) {
    if (!listing.content) {
      plan.push({ listing, content: undefined, photos: [] });
      continue;
    }
    const content = parseCreateDraftPropertyBody(listing.content);
    const photos = [];
    for (const photo of listing.photos) {
      const read = await readListingPhoto(sourceRoot, listing, photo);
      await inspectPropertyImage(read.bytes, "image/jpeg");
      photos.push({ photo, ...read });
    }
    plan.push({ listing, content, photos });
  }

  console.log(`\n${apply ? "APPLY" : "DRY RUN"}: ${command.target}`);
  for (const { listing, content, photos } of plan) {
    if (!content) {
      console.log(`\n[hold] ${listing.folder}: ${listing.hold}`);
      console.log(`       ${listing.photos.length} photos prepared but not imported.`);
      continue;
    }
    console.log(
      `\n${content.propertyId} ${content.slug}  (${content.location.city}, owner-confirmed)  draft`,
    );
    photos.forEach(({ photo, width, height }, index) =>
      console.log(
        `  ${String(index + 1).padStart(2)}. rc-premier-properties/listings/${content.slug}/${content.slug}-${photo.name}  ${width}x${height}${index === 0 ? "  [cover]" : ""}`,
      ),
    );
  }
  if (!apply) {
    // With an explicit database, also report (read-only) what apply would create or skip.
    const database = option("--database");
    if (database) {
      await connectDatabase({ database });
      try {
        if (mongoose.connection.name !== database) {
          throw new Error(
            `Connected to "${mongoose.connection.name}", expected "${database}".`,
          );
        }
        const planned = plan.flatMap(({ content }) => (content ? [content] : []));
        const existing = await PropertyModel.find({
          $or: [
            { propertyId: { $in: planned.map((content) => content.propertyId) } },
            { slug: { $in: planned.map((content) => content.slug) } },
          ],
        })
          .select("propertyId slug")
          .lean();
        console.log(`\nAgainst ${database} (read-only):`);
        for (const content of planned) {
          const clash = existing.find(
            (record) =>
              record.propertyId === content.propertyId || record.slug === content.slug,
          );
          console.log(
            `  ${content.propertyId.padEnd(20)} ${
              clash
                ? `would SKIP (exists as ${clash.propertyId} / ${clash.slug})`
                : "would create draft"
            }`,
          );
        }
      } finally {
        await disconnectDatabase();
      }
    }
    console.log("\nDry run only. Nothing was written to MongoDB or Cloudinary.");
    return;
  }

  await connectDatabase({ database: option("--database") });
  try {
    // Refuse to write anywhere but the database the operator named.
    if (mongoose.connection.name !== expectedDatabase) {
      throw new Error(
        `Connected to database "${mongoose.connection.name}", expected "${expectedDatabase}". Nothing was written.`,
      );
    }
    const batchId = `rc-listings-import-${randomUUID()}`;
    // Unattributed runs drop the actor from the audit event and mark the batch in requestId.
    const service = unattributed
      ? new DefaultAdminPropertyService(new MongoosePropertyAdminRepository(), {
          recordAudit: (event) =>
            mongooseAuthStore.recordAudit({
              ...event,
              actorStaffIdentityId: undefined,
            }),
        })
      : mongooseAdminPropertyService;
    for (const { listing, content, photos } of plan) {
      if (!content) continue;
      const context = {
        actorStaffIdentityId: actorStaffIdentityId ?? "",
        requestId: unattributed ? batchId : randomUUID(),
      };
      let detail;
      try {
        detail = await service.createDraft(content, context);
      } catch (error) {
        if (error instanceof HttpError && error.status === 409) {
          console.log(`exists, skipped: ${content.propertyId} ${content.slug}`);
          continue;
        }
        throw error;
      }
      console.log(`created draft: ${content.propertyId} ${content.slug}`);
      for (const { photo, bytes } of photos) {
        const next = await service.uploadImage?.(
          detail.id,
          { expectedVersion: detail.version, alt: photo.alt },
          bytes,
          "image/jpeg",
          context,
          { fileName: `${content.slug}-${photo.name}` },
        );
        if (!next) throw new Error(`Upload returned nothing for ${photo.name}.`);
        detail = next;
      }
      console.log(`  uploaded ${photos.length} photos (${listing.folder})`);
    }
  } finally {
    await disconnectDatabase();
  }
}

main().catch((error) => {
  operationalLogger.error("rc_listings_import_failed", { ...errorIdentity(error) });
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
