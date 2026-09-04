import type { CreateInquiryRequest, CreateInquiryResponse } from "@rc/shared";
import type { Model } from "mongoose";
import { InquiryModel } from "./inquiry.model.js";
import type { InquiryEntity, InquiryService } from "./inquiry.types.js";

const RECEIVED_MESSAGE =
  "Thank you. Your inquiry has been received and our team will be in touch.";

export class MongooseInquiryService implements InquiryService {
  constructor(private readonly model: Model<InquiryEntity> = InquiryModel) {}

  async create(
    request: Omit<CreateInquiryRequest, "website">,
  ): Promise<CreateInquiryResponse> {
    const inquiry = await this.model.create({
      ...request,
      privacyConsentAt: new Date(),
      status: "new",
    });

    return {
      inquiryId: String(inquiry._id),
      status: "received",
      message: RECEIVED_MESSAGE,
      createdAt: inquiry.createdAt.toISOString(),
    };
  }
}

export const mongooseInquiryService = new MongooseInquiryService();

export function honeypotResponse(inquiryId: string): CreateInquiryResponse {
  return {
    inquiryId,
    status: "received",
    message: RECEIVED_MESSAGE,
    createdAt: new Date().toISOString(),
  };
}
