import {
  INQUIRY_SOURCES,
  INQUIRY_TYPES,
  type CreateInquiryRequest,
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
