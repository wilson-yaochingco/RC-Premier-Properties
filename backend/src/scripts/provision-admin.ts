import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import { safeErrorMessage } from "../lib/safe-error.js";
import {
  normalizeStaffIssuer,
  provisionAdmin,
} from "../modules/auth/admin-provisioning.js";

function argument(name: string): string {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing --${name}.`);
  }
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
    const staff = await provisionAdmin({
      issuer,
      subject: argument("subject"),
      email: argument("email"),
      displayName: argument("name"),
    });
    console.log(
      `[auth] provisioned active admin ${staff.id} for issuer ${staff.issuer} and subject ${staff.subject}`,
    );
  } finally {
    await disconnectDatabase();
  }
}

void run().catch((error: unknown) => {
  const message = safeErrorMessage(error, [
    env.MONGODB_URI,
    env.AUTH?.clientSecret,
    env.AUTH?.sessionHashSecret,
  ]);
  console.error(`[auth] admin provisioning failed: ${message}`);
  process.exitCode = 1;
});
