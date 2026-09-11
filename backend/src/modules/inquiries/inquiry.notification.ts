import type { CreateInquiryRequest } from "@rc/shared";
import { env } from "../../config/env.js";

export const INQUIRY_NOTIFICATION_DESTINATION = "rcpropertiesss@gmail.com";

export interface InquiryNotificationMessage {
  to: string;
  subject: string;
  text: string;
}

export interface InquiryNotificationSendContext {
  /** Stable across retries; providers should use this as their idempotency key. */
  idempotencyKey: string;
}

export interface InquiryNotifier {
  readonly configured?: boolean;
  send(
    message: InquiryNotificationMessage,
    context: InquiryNotificationSendContext,
  ): Promise<void>;
}

export const INQUIRY_NOTIFICATION_MAX_ATTEMPTS = 5;
const RETRY_DELAYS_MS = [5, 30, 120, 360] as const;

export function nextInquiryNotificationAttempt(
  completedAttempts: number,
  now: Date,
): Date {
  const delayMinutes = RETRY_DELAYS_MS[Math.min(completedAttempts - 1, 3)] ?? 360;
  return new Date(now.getTime() + delayMinutes * 60_000);
}

export class InquiryNotificationUnavailableError extends Error {
  readonly code = "provider_not_configured";

  constructor() {
    super("Inquiry notification provider is not configured.");
    this.name = "InquiryNotificationUnavailableError";
  }
}

/**
 * Application boundary used until a production transactional-mail provider is selected.
 * It intentionally performs no delivery and accepts no credentials.
 */
export class DisabledInquiryNotifier implements InquiryNotifier {
  readonly configured = false;

  async send(
    _message: InquiryNotificationMessage,
    _context: InquiryNotificationSendContext,
  ): Promise<never> {
    throw new InquiryNotificationUnavailableError();
  }
}

export function inquiryNotificationErrorCode(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    /^[a-z0-9_-]{1,80}$/.test(error.code)
  ) {
    return error.code;
  }
  return "provider_delivery_failed";
}

export function buildInquiryNotification(
  inquiryId: string,
  request: Omit<CreateInquiryRequest, "website">,
  receivedAt: Date,
): InquiryNotificationMessage {
  const reference = request.propertyId
    ? `PREMIER PROPERTY #${request.propertyId}`
    : "General inquiry";
  const lines = [
    `Inquiry: ${inquiryId}`,
    `Type: ${request.inquiryType}`,
    `Property: ${reference}`,
    `Name: ${request.name}`,
    `Email: ${request.email}`,
    ...(request.phone ? [`Phone: ${request.phone}`] : []),
    ...(request.message ? [`Message: ${request.message}`] : []),
    `Received: ${receivedAt.toISOString()}`,
    `Admin: ${env.CORS_ORIGIN}/admin/inquiries/${inquiryId}`,
  ];
  return {
    to: INQUIRY_NOTIFICATION_DESTINATION,
    subject: `New RC Premier Inquiry — ${reference}`,
    text: lines.join("\n"),
  };
}

export const inquiryNotifier: InquiryNotifier = new DisabledInquiryNotifier();
