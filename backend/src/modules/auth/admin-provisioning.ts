import { randomUUID } from "node:crypto";
import { StaffIdentityModel } from "./staff-identity.model.js";
import type { StaffIdentityRecord } from "./auth.types.js";
import { mongooseAuthStore } from "./auth.store.js";

export interface ProvisionAdminInput {
  issuer: string;
  subject: string;
  displayName: string;
  email: string;
  now?: Date;
}

function text(value: string, name: string, maximum: number): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) {
    throw new Error(`${name} must contain between 1 and ${maximum} characters.`);
  }
  return normalized;
}

function normalizedIssuer(value: string): string {
  const parsed = new URL(value.trim());
  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new Error("issuer must be an HTTPS origin.");
  }
  return `${parsed.origin}/`;
}

export function validateProvisionAdminInput(input: ProvisionAdminInput) {
  const issuer = normalizedIssuer(input.issuer);
  const subject = text(input.subject, "subject", 255);
  if (/\s/.test(subject)) throw new Error("subject must not contain whitespace.");
  const displayName = text(input.displayName, "display name", 160);
  const email = text(input.email, "email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("email must be a valid address.");
  }
  return { issuer, subject, displayName, email, now: input.now ?? new Date() };
}

/** Controlled bootstrap operation; it is deliberately not exposed through HTTP. */
export async function provisionAdmin(
  input: ProvisionAdminInput,
): Promise<StaffIdentityRecord> {
  const validated = validateProvisionAdminInput(input);
  const existing = await StaffIdentityModel.findOne({
    issuer: validated.issuer,
    subject: validated.subject,
  });
  const document = existing
    ? await StaffIdentityModel.findByIdAndUpdate(
        existing._id,
        {
          $set: {
            displayName: validated.displayName,
            email: validated.email,
            role: "admin",
            status: "active",
            updatedAt: validated.now,
          },
          $inc: { authorizationVersion: 1 },
        },
        { new: true, runValidators: true },
      )
    : await StaffIdentityModel.create({
        issuer: validated.issuer,
        subject: validated.subject,
        displayName: validated.displayName,
        email: validated.email,
        role: "admin",
        status: "active",
        authorizationVersion: 1,
        createdAt: validated.now,
        updatedAt: validated.now,
      });

  if (!document) throw new Error("Unable to provision administrator.");

  const requestId = randomUUID();
  const revokedSessionIds = existing
    ? await mongooseAuthStore.revokeSessionsForStaff(
        String(document._id),
        validated.now,
        "authorization-changed",
      )
    : [];

  await Promise.all(
    revokedSessionIds.map((sessionId) =>
      mongooseAuthStore.recordAudit({
        action: "auth.session.revoked",
        entityType: "session",
        entityId: sessionId,
        outcome: "succeeded",
        requestId,
        reason: "authorization-changed",
        occurredAt: validated.now,
      }),
    ),
  );

  await mongooseAuthStore.recordAudit({
    action: "staff.provisioned",
    entityType: "staff-identity",
    entityId: String(document._id),
    outcome: "succeeded",
    requestId,
    revokedSessionCount: revokedSessionIds.length,
    occurredAt: validated.now,
  });

  return {
    id: String(document._id),
    issuer: document.issuer,
    subject: document.subject,
    displayName: document.displayName,
    email: document.email,
    role: document.role,
    status: document.status,
    authorizationVersion: document.authorizationVersion,
    ...(document.lastLoginAt ? { lastLoginAt: document.lastLoginAt } : {}),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
