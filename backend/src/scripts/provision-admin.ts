import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import { provisionAdmin } from "../modules/auth/admin-provisioning.js";

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

  await connectDatabase();
  try {
    const staff = await provisionAdmin({
      issuer: env.AUTH.issuerUrl,
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
  const message =
    error instanceof Error ? error.message : "Unknown provisioning error.";
  console.error(`[auth] admin provisioning failed: ${message}`);
  process.exitCode = 1;
});
