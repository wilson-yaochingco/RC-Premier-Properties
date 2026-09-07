import {
  ADMIN_INQUIRY_QUEUES,
  INQUIRY_SOURCES,
  INQUIRY_STATUSES,
  INQUIRY_TYPES,
  INQUIRY_WORKFLOW_STATUSES,
  type AddInquiryNoteRequest,
  type AdminInquiryListRequest,
  type AdminInquiryTransitionRequest,
  type CreateInquiryRequest,
  type InquiryWorkflowStatus,
  type UpdateInquiryStatusRequest,
  type ValidationIssue,
} from "@rc/shared";
import { HttpError } from "../../middleware/errorHandler.js";
import type { ParsedInquiry } from "./inquiry.types.js";

const ALLOWED_FIELDS = new Set([
  "name",
  "email",
  "phone",
  "inquiryType",
  "source",
  "propertyId",
  "subject",
  "message",
  "privacyConsent",
  "website",
]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+()\d][+()\d\s.-]{5,28}[\d)]$/;
const PROPERTY_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
}

function stringField(
  body: Record<string, unknown>,
  field: string,
  issues: ValidationIssue[],
  options: { required?: boolean; min?: number; max: number },
): string | undefined {
  const raw = body[field];
  if (raw === undefined || raw === null || raw === "") {
    if (options.required) issues.push({ field, message: "This field is required." });
    return undefined;
  }
  if (typeof raw !== "string") {
    issues.push({ field, message: "Must be text." });
    return undefined;
  }
  const value = raw.trim();
  if (value === "") {
    if (options.required) issues.push({ field, message: "This field is required." });
    return undefined;
  }
  if (options.min !== undefined && value.length < options.min) {
    issues.push({ field, message: `Must be at least ${options.min} characters.` });
  }
  if (value.length > options.max) {
    issues.push({ field, message: `Must be at most ${options.max} characters.` });
  }
  return value;
}

function enumField<const T extends readonly string[]>(
  body: Record<string, unknown>,
  field: string,
  values: T,
  issues: ValidationIssue[],
): T[number] | undefined {
  const value = stringField(body, field, issues, { required: true, max: 40 });
  if (value === undefined) return undefined;
  if (!values.includes(value)) {
    issues.push({ field, message: `Must be one of: ${values.join(", ")}.` });
    return undefined;
  }
  return value;
}

export function parseCreateInquiryBody(body: unknown): ParsedInquiry {
  if (!isPlainObject(body)) {
    throw new HttpError(400, "Invalid inquiry.", [
      { field: "body", message: "Must be a JSON object." },
    ]);
  }

  const issues: ValidationIssue[] = [];
  for (const field of Object.keys(body)) {
    if (!ALLOWED_FIELDS.has(field)) {
      issues.push({ field, message: "Unknown field." });
    }
  }

  const name = stringField(body, "name", issues, {
    required: true,
    min: 2,
    max: 100,
  });
  const email = stringField(body, "email", issues, {
    required: true,
    max: 254,
  });
  const phone = stringField(body, "phone", issues, { max: 30 });
  const inquiryType = enumField(body, "inquiryType", INQUIRY_TYPES, issues);
  const source = enumField(body, "source", INQUIRY_SOURCES, issues);
  const propertyId = stringField(body, "propertyId", issues, { max: 40 });
  const subject = stringField(body, "subject", issues, { max: 150 });
  const message = stringField(body, "message", issues, {
    required: true,
    min: 10,
    max: 3_000,
  });
  const website = stringField(body, "website", issues, { max: 200 });

  if (email && !EMAIL_PATTERN.test(email)) {
    issues.push({ field: "email", message: "Enter a valid email address." });
  }
  if (phone && !PHONE_PATTERN.test(phone)) {
    issues.push({ field: "phone", message: "Enter a valid phone number." });
  }
  if (propertyId && !PROPERTY_ID_PATTERN.test(propertyId)) {
    issues.push({
      field: "propertyId",
      message: "May contain only letters, numbers, hyphens, and underscores.",
    });
  }
  if (body.privacyConsent !== true) {
    issues.push({
      field: "privacyConsent",
      message: "Privacy consent is required.",
    });
  }

  if (issues.length > 0 || !name || !email || !inquiryType || !source || !message) {
    throw new HttpError(400, "Invalid inquiry.", issues);
  }

  const data: Omit<CreateInquiryRequest, "website"> = {
    name,
    email: email.toLowerCase(),
    ...(phone ? { phone } : {}),
    inquiryType,
    source,
    ...(propertyId ? { propertyId: propertyId.toUpperCase() } : {}),
    ...(subject ? { subject } : {}),
    message,
    privacyConsent: true,
  };

  return { data, isHoneypotSubmission: website !== undefined };
}

export function parseInquiryIdempotencyKey(raw: unknown): string | undefined {
  if (raw === undefined) return undefined;
  if (
    typeof raw !== "string" ||
    raw.length < 16 ||
    raw.length > 200 ||
    !IDEMPOTENCY_KEY_PATTERN.test(raw)
  ) {
    throw new HttpError(400, "Invalid inquiry idempotency key.", [
      {
        field: "Idempotency-Key",
        message:
          "Must be 16 to 200 letters, numbers, periods, underscores, colons, or hyphens.",
      },
    ]);
  }
  return raw;
}

const ADMIN_LIST_FIELDS = new Set([
  "query",
  "status",
  "inquiryType",
  "source",
  "propertyId",
  "queue",
  "page",
  "limit",
]);
const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]+$/;

function queryText(
  query: Record<string, unknown>,
  field: string,
  issues: ValidationIssue[],
  maximum: number,
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
  }
  return value;
}

function queryEnum<const T extends readonly string[]>(
  query: Record<string, unknown>,
  field: string,
  allowed: T,
  issues: ValidationIssue[],
): T[number] | undefined {
  const value = queryText(query, field, issues, 40);
  if (value === undefined) return undefined;
  if (!allowed.includes(value)) {
    issues.push({ field, message: `Must be one of: ${allowed.join(", ")}.` });
    return undefined;
  }
  return value as T[number];
}

function positiveIntegerQuery(
  query: Record<string, unknown>,
  field: string,
  fallback: number,
  maximum: number,
  issues: ValidationIssue[],
): number {
  const raw = query[field];
  if (raw === undefined || raw === "") return fallback;
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) {
    issues.push({ field, message: "Must be a positive integer." });
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    issues.push({ field, message: `Must be between 1 and ${maximum}.` });
    return fallback;
  }
  return value;
}

export function parseAdminInquiryListQuery(rawQuery: unknown): AdminInquiryListRequest {
  if (!isPlainObject(rawQuery)) {
    throw new HttpError(400, "Invalid inquiry list parameters.", [
      { field: "query", message: "Must be query parameters." },
    ]);
  }
  const issues: ValidationIssue[] = [];
  for (const field of Object.keys(rawQuery)) {
    if (!ADMIN_LIST_FIELDS.has(field)) {
      issues.push({ field, message: "Unknown query parameter." });
    }
  }
  const query = queryText(rawQuery, "query", issues, 100);
  const status = queryEnum(rawQuery, "status", INQUIRY_STATUSES, issues);
  const inquiryType = queryEnum(rawQuery, "inquiryType", INQUIRY_TYPES, issues);
  const source = queryEnum(rawQuery, "source", INQUIRY_SOURCES, issues);
  const propertyId = queryText(rawQuery, "propertyId", issues, 40);
  const queue = queryEnum(rawQuery, "queue", ADMIN_INQUIRY_QUEUES, issues) ?? "active";
  const page = positiveIntegerQuery(rawQuery, "page", 1, 10_000, issues);
  const limit = positiveIntegerQuery(rawQuery, "limit", 20, 100, issues);

  if (propertyId && !PROPERTY_ID_PATTERN.test(propertyId)) {
    issues.push({
      field: "propertyId",
      message: "May contain only letters, numbers, hyphens, and underscores.",
    });
  }
  if (issues.length > 0) {
    throw new HttpError(400, "Invalid inquiry list parameters.", issues);
  }
  return {
    ...(query ? { query } : {}),
    ...(status ? { status } : {}),
    ...(inquiryType ? { inquiryType } : {}),
    ...(source ? { source } : {}),
    ...(propertyId ? { propertyId: propertyId.toUpperCase() } : {}),
    queue,
    page,
    limit,
  };
}

export function parseAdminInquiryId(rawId: unknown): string {
  if (typeof rawId !== "string" || !OBJECT_ID_PATTERN.test(rawId)) {
    throw new HttpError(400, "Invalid inquiry identifier.", [
      { field: "id", message: "Must be a valid inquiry identifier." },
    ]);
  }
  return rawId.toLowerCase();
}

function versionedBody(
  rawBody: unknown,
  allowedFields: readonly string[],
): { body: Record<string, unknown>; expectedVersion: number } {
  if (!isPlainObject(rawBody)) {
    throw new HttpError(400, "Invalid inquiry update.", [
      { field: "body", message: "Must be a JSON object." },
    ]);
  }
  const issues: ValidationIssue[] = [];
  for (const field of Object.keys(rawBody)) {
    if (!allowedFields.includes(field)) {
      issues.push({ field, message: "Unknown field." });
    }
  }
  const expectedVersion = rawBody.expectedVersion;
  if (
    typeof expectedVersion !== "number" ||
    !Number.isSafeInteger(expectedVersion) ||
    expectedVersion < 0
  ) {
    issues.push({
      field: "expectedVersion",
      message: "Must be a non-negative integer.",
    });
  }
  if (issues.length > 0 || typeof expectedVersion !== "number") {
    throw new HttpError(400, "Invalid inquiry update.", issues);
  }
  return { body: rawBody, expectedVersion };
}

export function parseUpdateInquiryStatusBody(
  rawBody: unknown,
): UpdateInquiryStatusRequest {
  const { body, expectedVersion } = versionedBody(rawBody, [
    "status",
    "expectedVersion",
  ]);
  const issues: ValidationIssue[] = [];
  const status =
    typeof body.status === "string" &&
    INQUIRY_WORKFLOW_STATUSES.some((candidate) => candidate === body.status)
      ? (body.status as InquiryWorkflowStatus)
      : undefined;
  if (!status) {
    issues.push({
      field: "status",
      message: `Must be one of: ${INQUIRY_WORKFLOW_STATUSES.join(", ")}.`,
    });
  }
  if (!status) throw new HttpError(400, "Invalid inquiry update.", issues);
  return { status, expectedVersion };
}

export function parseAddInquiryNoteBody(rawBody: unknown): AddInquiryNoteRequest {
  const { body, expectedVersion } = versionedBody(rawBody, ["note", "expectedVersion"]);
  const issues: ValidationIssue[] = [];
  const note = typeof body.note === "string" ? body.note.trim() : undefined;
  if (!note) {
    issues.push({ field: "note", message: "This field is required." });
  } else if (note.length > 1_000) {
    issues.push({ field: "note", message: "Must be at most 1000 characters." });
  }
  if (issues.length > 0 || !note) {
    throw new HttpError(400, "Invalid inquiry update.", issues);
  }
  return { note, expectedVersion };
}

export function parseAdminInquiryTransitionBody(
  rawBody: unknown,
): AdminInquiryTransitionRequest {
  const { expectedVersion } = versionedBody(rawBody, ["expectedVersion"]);
  return { expectedVersion };
}
