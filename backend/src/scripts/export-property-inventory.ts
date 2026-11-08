import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import {
  assertOperationalTarget,
  parseOperationalArguments,
} from "../lib/operational-target.js";
import { errorIdentity, operationalLogger } from "../lib/operational-logger.js";

/**
 * Read-only. Prints a property summary and writes a complete backup of `properties` and
 * `inquiries` (every field, including private ones) to the git-ignored `backups/` folder as
 * canonical Extended JSON, so ObjectIds and dates restore exactly. The file is then read
 * back and compared document by document with the live collections.
 *
 *   --database <name>   explicitly named database instead of the one in MONGODB_URI
 */
const COLLECTIONS = ["properties", "inquiries"] as const;

interface PropertySummaryRow {
  propertyId?: string;
  slug?: string;
  publicationStatus?: string;
  availability?: string;
  location?: { city?: string };
  price?: { amount?: number };
  gallery?: unknown[];
}

function option(name: string): string | undefined {
  const args = process.argv.slice(2);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

const { EJSON } = mongoose.mongo.BSON;
const canonical = (document: unknown) => EJSON.stringify(document, { relaxed: false });

async function main(): Promise<void> {
  const command = parseOperationalArguments(process.argv.slice(2), 500);
  assertOperationalTarget(command, env.NODE_ENV, false);
  const database = option("--database");
  await connectDatabase({ database });
  try {
    const db = mongoose.connection.db!;
    if (database && db.databaseName !== database) {
      throw new Error(`Connected to "${db.databaseName}", expected "${database}".`);
    }
    const read = async () =>
      Object.fromEntries(
        await Promise.all(
          COLLECTIONS.map(
            async (name) =>
              [
                name,
                await db.collection(name).find({}).sort({ _id: 1 }).toArray(),
              ] as const,
          ),
        ),
      ) as unknown as Record<(typeof COLLECTIONS)[number], Record<string, unknown>[]>;

    const data = await read();
    const inquiriesByProperty = new Map<string, number>();
    for (const inquiry of data.inquiries) {
      const key =
        typeof inquiry.propertyId === "string" ? inquiry.propertyId : "(none)";
      inquiriesByProperty.set(key, (inquiriesByProperty.get(key) ?? 0) + 1);
    }
    console.log(`database: ${db.databaseName}`);
    console.table(
      (data.properties as PropertySummaryRow[]).map((property) => ({
        propertyId: property.propertyId,
        slug: property.slug,
        status: property.publicationStatus,
        availability: property.availability,
        city: property.location?.city,
        price: property.price?.amount,
        images: property.gallery?.length ?? 0,
        inquiries: inquiriesByProperty.get(property.propertyId ?? "") ?? 0,
      })),
    );
    console.log(
      "inquiries by propertyId:",
      JSON.stringify(Object.fromEntries(inquiriesByProperty)),
    );

    const directory = path.resolve(process.cwd(), "backups");
    await mkdir(directory, { recursive: true });
    const file = path.join(
      directory,
      `${db.databaseName}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
    );
    const backup = {
      format: "rc-premier-backup/1",
      exportedAt: new Date().toISOString(),
      database: db.databaseName,
      counts: Object.fromEntries(COLLECTIONS.map((name) => [name, data[name].length])),
      collections: data,
    };
    await writeFile(file, canonical(backup), { flag: "wx" });

    // Verify: the written file must reproduce the live collections exactly.
    const restored = EJSON.parse(await readFile(file, "utf8"), { relaxed: false }) as {
      collections: typeof data;
    };
    const live = await read();
    for (const name of COLLECTIONS) {
      const fromFile = restored.collections[name].map(canonical);
      const fromDb = live[name].map(canonical);
      const identical =
        fromFile.length === fromDb.length &&
        fromFile.every((document, index) => document === fromDb[index]);
      console.log(
        `verify ${name}: ${fromFile.length} in backup, ${fromDb.length} live, ${identical ? "identical" : "MISMATCH"}`,
      );
      if (!identical) process.exitCode = 2;
    }
    console.log(`backup: ${path.relative(process.cwd(), file)}`);
  } finally {
    await disconnectDatabase();
  }
}

main().catch((error) => {
  operationalLogger.error("property_inventory_export_failed", {
    ...errorIdentity(error),
  });
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
