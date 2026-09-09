import { Router, type RequestHandler } from "express";
import { HttpError } from "../../middleware/errorHandler.js";
import {
  noStore,
  requireAuthentication,
  requirePermission,
} from "../auth/auth.middleware.js";
import type { ResolvedAuthRouteDependencies } from "../auth/auth.routes.js";
import { createAdminOperationsController } from "./admin-operations.controller.js";
import type { AdminOperationsService } from "./admin-operations.types.js";

export interface AdminOperationsRouteDependencies {
  service?: AdminOperationsService;
  auth: ResolvedAuthRouteDependencies;
  propertyReadPermission?: RequestHandler;
  inquiryReadPermission?: RequestHandler;
  auditReadPermission?: RequestHandler;
  staffPermission?: RequestHandler;
}

export function createAdminOperationsRoutes(
  dependencies: AdminOperationsRouteDependencies,
): Router {
  const router = Router();
  router.use(noStore());
  const { service: authService, cookies } = dependencies.auth;
  if (!authService || !cookies) {
    router.use((_request, _response, next) =>
      next(new HttpError(503, "Authentication is not configured.")),
    );
    return router;
  }
  const controller = createAdminOperationsController(dependencies.service);
  const authenticate = requireAuthentication(authService, cookies);
  const propertyRead =
    dependencies.propertyReadPermission ??
    requirePermission(authService, "property:read-private");
  const inquiryRead =
    dependencies.inquiryReadPermission ??
    requirePermission(authService, "inquiry:read");
  const auditRead =
    dependencies.auditReadPermission ?? requirePermission(authService, "audit:read");
  const staff =
    dependencies.staffPermission ?? requirePermission(authService, "staff:manage");

  router.get(
    "/dashboard",
    authenticate,
    propertyRead,
    inquiryRead,
    controller.dashboard,
  );
  router.get(
    "/viewings/calendar",
    authenticate,
    inquiryRead,
    controller.viewingCalendar,
  );
  router.get("/audit-events", authenticate, auditRead, controller.auditEvents);
  router.get("/staff", authenticate, staff, controller.staff);
  return router;
}
