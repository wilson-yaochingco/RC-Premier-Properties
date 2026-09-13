import type {
  AdminInquiryDetail,
  AdminInquiryListResponse,
  AdminInquirySearchResponse,
  CreateInquiryResponse,
} from "@rc/shared";
import type { Request, Response } from "express";
import { Types } from "mongoose";
import { HttpError } from "../../middleware/errorHandler.js";
import { getRequestId } from "../../middleware/requestContext.js";
import { authenticatedContext } from "../auth/auth.middleware.js";
import {
  honeypotResponse,
  mongooseAdminInquiryService,
  mongooseInquiryService,
} from "./inquiry.service.js";
import type { AdminInquiryService, InquiryService } from "./inquiry.types.js";
import {
  parseAddInquiryNoteBody,
  parseAdminInquiryId,
  parseAdminInquiryListQuery,
  parseAdminInquirySearchQuery,
  parseAdminInquiryTransitionBody,
  parseCreateInquiryBody,
  parseInquiryIdempotencyKey,
  parseUpdateInquiryStatusBody,
  parseUpdateViewingRequestBody,
} from "./inquiry.validation.js";

export function createInquiryController(
  service: InquiryService = mongooseInquiryService,
) {
  return {
    async create(req: Request, res: Response<CreateInquiryResponse>): Promise<void> {
      const inquiry = parseCreateInquiryBody(req.body);

      // Return the normal success shape without persistence so bots cannot probe the trap.
      if (inquiry.isHoneypotSubmission) {
        res
          .status(201)
          .json(
            honeypotResponse(
              new Types.ObjectId().toHexString(),
              inquiry.data.inquiryType,
            ),
          );
        return;
      }

      res
        .status(201)
        .json(
          await service.create(
            inquiry.data,
            parseInquiryIdempotencyKey(req.get("Idempotency-Key")),
          ),
        );
    },
  };
}

export function createAdminInquiryController(
  service: AdminInquiryService = mongooseAdminInquiryService,
) {
  function mutationContext(res: Response) {
    const context = authenticatedContext(res.locals);
    if (!context) throw new HttpError(401, "Authentication required.");
    return {
      actorStaffIdentityId: context.staff.id,
      requestId: getRequestId(res),
    };
  }

  return {
    async list(req: Request, res: Response<AdminInquiryListResponse>) {
      res.status(200).json(await service.list(parseAdminInquiryListQuery(req.query)));
    },

    async search(req: Request, res: Response<AdminInquirySearchResponse>) {
      res
        .status(200)
        .json(await service.search(parseAdminInquirySearchQuery(req.query)));
    },

    async detail(req: Request<{ id: string }>, res: Response<AdminInquiryDetail>) {
      const inquiry = await service.detail(parseAdminInquiryId(req.params.id));
      if (!inquiry) throw new HttpError(404, "Inquiry not found.");
      res.status(200).json(inquiry);
    },

    async updateStatus(
      req: Request<{ id: string }>,
      res: Response<AdminInquiryDetail>,
    ) {
      const inquiry = await service.updateStatus(
        parseAdminInquiryId(req.params.id),
        parseUpdateInquiryStatusBody(req.body),
        mutationContext(res),
      );
      if (!inquiry) throw new HttpError(404, "Inquiry not found.");
      res.status(200).json(inquiry);
    },

    async updateViewingRequest(
      req: Request<{ id: string }>,
      res: Response<AdminInquiryDetail>,
    ) {
      const inquiry = await service.updateViewingRequest(
        parseAdminInquiryId(req.params.id),
        parseUpdateViewingRequestBody(req.body),
        mutationContext(res),
      );
      if (!inquiry) throw new HttpError(404, "Inquiry not found.");
      res.status(200).json(inquiry);
    },

    async addNote(req: Request<{ id: string }>, res: Response<AdminInquiryDetail>) {
      const inquiry = await service.addNote(
        parseAdminInquiryId(req.params.id),
        parseAddInquiryNoteBody(req.body),
        mutationContext(res),
      );
      if (!inquiry) throw new HttpError(404, "Inquiry not found.");
      res.status(200).json(inquiry);
    },

    async markSpam(req: Request<{ id: string }>, res: Response<AdminInquiryDetail>) {
      const inquiry = await service.markSpam(
        parseAdminInquiryId(req.params.id),
        parseAdminInquiryTransitionBody(req.body),
        mutationContext(res),
      );
      if (!inquiry) throw new HttpError(404, "Inquiry not found.");
      res.status(200).json(inquiry);
    },

    async markNotSpam(req: Request<{ id: string }>, res: Response<AdminInquiryDetail>) {
      const inquiry = await service.markNotSpam(
        parseAdminInquiryId(req.params.id),
        parseAdminInquiryTransitionBody(req.body),
        mutationContext(res),
      );
      if (!inquiry) throw new HttpError(404, "Inquiry not found.");
      res.status(200).json(inquiry);
    },

    async archive(req: Request<{ id: string }>, res: Response<AdminInquiryDetail>) {
      const inquiry = await service.archive(
        parseAdminInquiryId(req.params.id),
        parseAdminInquiryTransitionBody(req.body),
        mutationContext(res),
      );
      if (!inquiry) throw new HttpError(404, "Inquiry not found.");
      res.status(200).json(inquiry);
    },

    async restore(req: Request<{ id: string }>, res: Response<AdminInquiryDetail>) {
      const inquiry = await service.restore(
        parseAdminInquiryId(req.params.id),
        parseAdminInquiryTransitionBody(req.body),
        mutationContext(res),
      );
      if (!inquiry) throw new HttpError(404, "Inquiry not found.");
      res.status(200).json(inquiry);
    },
  };
}
