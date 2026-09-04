import type { Request, Response } from "express";
import { Types } from "mongoose";
import type { CreateInquiryResponse } from "@rc/shared";
import { honeypotResponse, mongooseInquiryService } from "./inquiry.service.js";
import type { InquiryService } from "./inquiry.types.js";
import { parseCreateInquiryBody } from "./inquiry.validation.js";

export function createInquiryController(
  service: InquiryService = mongooseInquiryService,
) {
  return {
    async create(req: Request, res: Response<CreateInquiryResponse>): Promise<void> {
      const inquiry = parseCreateInquiryBody(req.body);

      // Return the normal success shape without persistence so bots cannot probe the trap.
      if (inquiry.isHoneypotSubmission) {
        res.status(201).json(honeypotResponse(new Types.ObjectId().toHexString()));
        return;
      }

      res.status(201).json(await service.create(inquiry.data));
    },
  };
}
