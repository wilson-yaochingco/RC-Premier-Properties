import type {
  CreateInquiryRequest,
  CreateInquiryResponse,
  InquirySource,
  InquiryType,
} from "@rc/shared";

export const INQUIRY_STATUSES = ["new", "in-progress", "closed"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export interface InquiryEntity {
  name: string;
  email: string;
  phone?: string;
  inquiryType: InquiryType;
  source: InquirySource;
  propertyId?: string;
  subject?: string;
  message: string;
  privacyConsent: boolean;
  privacyConsentAt: Date;
  status: InquiryStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParsedInquiry {
  data: Omit<CreateInquiryRequest, "website">;
  isHoneypotSubmission: boolean;
}

export interface InquiryService {
  create(
    request: Omit<CreateInquiryRequest, "website">,
  ): Promise<CreateInquiryResponse>;
}
