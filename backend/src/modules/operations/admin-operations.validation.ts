import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  AUDIT_OUTCOMES,
  STAFF_STATUSES,
  type AdminAuditListRequest,
  type AdminStaffListRequest,
  type ValidationIssue,
} from "@rc/shared";
import { Types } from "mongoose";
import { HttpError } from "../../middleware/errorHandler.js";
import type { AdminViewingCalendarRequest } from "./admin-operations.types.js";

type RawQuery = Record<string, unknown>;

function text(
  query: RawQuery,
  field: string,
  issues: ValidationIssue[],
  maximum = 100,
): string | undefined {
  const raw = query[field];
  if (raw === undefined || raw === "") return undefined;
  if (typeof raw !== "string") {
    issues.push({ field, message: "Must be a single text value." });
    return undefined;
  }
  const value = raw.trim();
  if (!value) return undefined;
  if (value.length > maximum) {
    issues.push({ field, message: `Must be at most ${maximum} characters.` });
    return undefined;
  }
  return value;
}

function integer(
  query: RawQuery,
  field: string,
  issues: ValidationIssue[],
  fallback: number,
  maximum: number,
): number {
  const value = text(query, field, issues, 8);
  if (value === undefined) return fallback;
  if (!/^[1-9]\d*$/.test(value) || Number(value) > maximum) {
    issues.push({ field, message: `Must be a whole number from 1 to ${maximum}.` });
    return fallback;
  }
  return Number(value);
}

function enumValue<const T extends readonly string[]>(
  query: RawQuery,
  field: string,
  allowed: T,
  issues: ValidationIssue[],
): T[number] | undefined {
  const value = text(query, field, issues);
  if (value === undefined) return undefined;
  if (!allowed.includes(value)) {
    issues.push({ field, message: `Must be one of: ${allowed.join(", ")}.` });
    return undefined;
  }
  return value;
}

function rejectUnknown(
  query: RawQuery,
  allowed: readonly string[],
  issues: ValidationIssue[],
) {
  const fields = new Set(allowed);
  for (const field of Object.keys(query)) {
    if (!fields.has(field)) issues.push({ field, message: "Unknown query parameter." });
  }
}

function validDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function throwIssues(message: string, issues: ValidationIssue[]) {
  if (issues.length > 0) throw new HttpError(400, message, issues);
}

export function parseViewingCalendarQuery(
  query: RawQuery,
): AdminViewingCalendarRequest {
  const issues: ValidationIssue[] = [];
  rejectUnknown(query, ["start", "end", "page", "limit"], issues);
  const start = text(query, "start", issues, 10);
  const end = text(query, "end", issues, 10);
  if (!validDate(start))
    issues.push({ field: "start", message: "Use a real YYYY-MM-DD date." });
  if (!validDate(end))
    issues.push({ field: "end", message: "Use a real YYYY-MM-DD date." });
  if (validDate(start) && validDate(end)) {
    const days =
      (Date.parse(`${end}T00:00:00.000Z`) - Date.parse(`${start}T00:00:00.000Z`)) /
        86_400_000 +
      1;
    if (days < 1 || days > 42) {
      issues.push({ field: "end", message: "Choose a range from 1 to 42 days." });
    }
  }
  const page = integer(query, "page", issues, 1, 10_000);
  const limit = integer(query, "limit", issues, 200, 200);
  throwIssues("Invalid viewing calendar parameters.", issues);
  return { start: start!, end: end!, page, limit };
}

export function parseNoQuery(query: RawQuery): void {
  const issues: ValidationIssue[] = [];
  rejectUnknown(query, [], issues);
  throwIssues("This endpoint does not accept query parameters.", issues);
}

export function parseAdminAuditQuery(query: RawQuery): AdminAuditListRequest {
  const issues: ValidationIssue[] = [];
  rejectUnknown(
    query,
    [
      "action",
      "entityType",
      "outcome",
      "actorStaffIdentityId",
      "from",
      "to",
      "page",
      "limit",
    ],
    issues,
  );
  const action = enumValue(query, "action", AUDIT_ACTIONS, issues);
  const entityType = enumValue(query, "entityType", AUDIT_ENTITY_TYPES, issues);
  const outcome = enumValue(query, "outcome", AUDIT_OUTCOMES, issues);
  const actorStaffIdentityId = text(query, "actorStaffIdentityId", issues, 24);
  const from = text(query, "from", issues, 10);
  const to = text(query, "to", issues, 10);
  if (actorStaffIdentityId && !Types.ObjectId.isValid(actorStaffIdentityId)) {
    issues.push({
      field: "actorStaffIdentityId",
      message: "Must be a valid staff ID.",
    });
  }
  if (from && !validDate(from))
    issues.push({ field: "from", message: "Use a real YYYY-MM-DD date." });
  if (to && !validDate(to))
    issues.push({ field: "to", message: "Use a real YYYY-MM-DD date." });
  if (validDate(from) && validDate(to) && from > to) {
    issues.push({ field: "to", message: "Must be on or after the start date." });
  }
  const page = integer(query, "page", issues, 1, 10_000);
  const limit = integer(query, "limit", issues, 25, 100);
  throwIssues("Invalid audit filters.", issues);
  return {
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
    ...(outcome ? { outcome } : {}),
    ...(actorStaffIdentityId ? { actorStaffIdentityId } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    page,
    limit,
  };
}

export function parseAdminStaffQuery(query: RawQuery): AdminStaffListRequest {
  const issues: ValidationIssue[] = [];
  rejectUnknown(query, ["query", "status", "page", "limit"], issues);
  const search = text(query, "query", issues, 100);
  const status = enumValue(query, "status", STAFF_STATUSES, issues);
  const page = integer(query, "page", issues, 1, 10_000);
  const limit = integer(query, "limit", issues, 25, 50);
  throwIssues("Invalid staff filters.", issues);
  return {
    ...(search ? { query: search } : {}),
    ...(status ? { status } : {}),
    page,
    limit,
  };
}
