import type { CreateInquiryRequest } from "@rc/shared";
import { env } from "../../config/env.js";

export const INQUIRY_NOTIFICATION_DESTINATION = "rcpremierph@gmail.com";

export interface InquiryNotificationMessage {
  to: string;
  subject: string;
  text: string;
}

export interface InquiryNotifier {
  send(message: InquiryNotificationMessage): Promise<void>;
}

/**
 * Application boundary used until a production transactional-mail provider is selected.
 * It intentionally performs no delivery and accepts no credentials.
 */
export class DisabledInquiryNotifier implements InquiryNotifier {
  async send(_message: InquiryNotificationMessage): Promise<void> {}
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
