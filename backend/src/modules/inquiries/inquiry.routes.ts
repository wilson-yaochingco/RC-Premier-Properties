import { Router, type RequestHandler } from "express";
import { HttpError } from "../../middleware/errorHandler.js";
import { createInquiryRateLimit } from "../../middleware/inquiryRateLimit.js";
import { createInquiryController } from "./inquiry.controller.js";
import type { InquiryService } from "./inquiry.types.js";

export interface InquiryRouteDependencies {
  service?: InquiryService;
  rateLimit?: RequestHandler;
}

const requireJson: RequestHandler = (request, _response, next) => {
  if (!request.is("application/json")) {
    next(new HttpError(415, "Inquiry requests must use application/json."));
    return;
  }
  next();
};

export function createInquiryRoutes(
  dependencies: InquiryRouteDependencies = {},
): Router {
  const router = Router();
  const controller = createInquiryController(dependencies.service);

  router.post(
    "/",
    requireJson,
    dependencies.rateLimit ?? createInquiryRateLimit(),
    controller.create,
  );

  return router;
}

export default createInquiryRoutes();
