import { Router, type RequestHandler } from "express";
import { HttpError } from "../../middleware/errorHandler.js";
import { createInquiryRateLimit } from "../../middleware/inquiryRateLimit.js";
import {
  noStore,
  requireAllowedOrigin,
  requireAuthentication,
  requireCsrf,
  requirePermission,
} from "../auth/auth.middleware.js";
import type { ResolvedAuthRouteDependencies } from "../auth/auth.routes.js";
import {
  createAdminInquiryController,
  createInquiryController,
} from "./inquiry.controller.js";
import type { AdminInquiryService, InquiryService } from "./inquiry.types.js";

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

export interface AdminInquiryRouteDependencies {
  service?: AdminInquiryService;
  auth: ResolvedAuthRouteDependencies;
  readPermission?: RequestHandler;
  updatePermission?: RequestHandler;
}

export function createAdminInquiryRoutes(
  dependencies: AdminInquiryRouteDependencies,
): Router {
  const router = Router();
  router.use(noStore());
  const { service: authService, cookies } = dependencies.auth;
  if (!authService || !cookies) {
    router.use((_req, _res, next) => {
      next(new HttpError(503, "Authentication is not configured."));
    });
    return router;
  }

  const controller = createAdminInquiryController(dependencies.service);
  const authenticate = requireAuthentication(authService, cookies);
  const requireRead =
    dependencies.readPermission ?? requirePermission(authService, "inquiry:read");
  const requireUpdate =
    dependencies.updatePermission ?? requirePermission(authService, "inquiry:update");
  const allowedOrigin = requireAllowedOrigin(authService);
  const csrf = requireCsrf(authService);

  router.get("/", authenticate, requireRead, controller.list);
  router.get("/:id", authenticate, requireRead, controller.detail);
  router.patch(
    "/:id/status",
    authenticate,
    allowedOrigin,
    csrf,
    requireUpdate,
    requireJson,
    controller.updateStatus,
  );
  for (const [path, handler] of [
    ["notes", controller.addNote],
    ["spam", controller.markSpam],
    ["not-spam", controller.markNotSpam],
    ["archive", controller.archive],
    ["restore", controller.restore],
  ] as const) {
    router.post(
      `/:id/${path}`,
      authenticate,
      allowedOrigin,
      csrf,
      requireUpdate,
      requireJson,
      handler,
    );
  }

  return router;
}

export default createInquiryRoutes();
