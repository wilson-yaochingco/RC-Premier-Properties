import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import { safeErrorMessage } from "../lib/safe-error.js";
import {
  disableStaffIdentity,
  normalizeStaffIssuer,
} from "../modules/auth/admin-provisioning.js";

function argument(name: string): string {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || value.startsWith("--")) throw new Error(`Missing --${name}.`);
  return value;
}

async function run(): Promise<void> {
  if (!env.AUTH) {
    throw new Error(
      "Auth0 is not configured. Fill the AUTH0_* and AUTH_* values in backend/.env first.",
    );
  }

  const issuer = argument("issuer");
  if (normalizeStaffIssuer(issuer) !== env.AUTH.issuerUrl) {
    throw new Error("The explicit --issuer must exactly match AUTH0_ISSUER_URL.");
  }

  await connectDatabase();
  try {
    const result = await disableStaffIdentity({
      issuer,
      subject: argument("subject"),
    });
    if (!result) {
      throw new Error("The exact active staff identity was not found.");
    }
    console.log(
      `[auth] disabled staff ${result.staff.id} and revoked ${result.revokedSessionCount} session(s)`,
    );
  } finally {
    await disconnectDatabase();
  }
}

void run().catch((error: unknown) => {
  console.error(
    `[auth] staff disable failed: ${safeErrorMessage(error, [
      env.MONGODB_URI,
      env.AUTH?.clientSecret,
      env.AUTH?.sessionHashSecret,
    ])}`,
  );
  process.exitCode = 1;
});
