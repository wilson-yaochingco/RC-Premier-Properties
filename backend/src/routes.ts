import { Router, type RequestHandler } from "express";
import { createHealthRoutes } from "./modules/health/health.routes.js";
import type { HealthDependencies } from "./modules/health/health.controller.js";
import {
  createAdminPropertyRoutes,
  createPropertyRoutes,
} from "./modules/properties/property.routes.js";
import type {
  AdminPropertyService,
  PropertyService,
} from "./modules/properties/property.types.js";
import {
  createAdminInquiryRoutes,
  createInquiryRoutes,
} from "./modules/inquiries/inquiry.routes.js";
import type {
  AdminInquiryService,
  InquiryService,
} from "./modules/inquiries/inquiry.types.js";
import {
  createAuthRoutes,
  resolveAuthRouteDependencies,
  type AuthRouteDependencies,
} from "./modules/auth/auth.routes.js";

/**
 * Root API router, mounted on `API_PREFIX` in `app.ts`.
 *
 * Each feature lives in its own folder under `src/modules/` and is registered here with
 * a single line. To add one, create `src/modules/<name>/` containing
 * `<name>.routes.ts`, `<name>.controller.ts`, `<name>.service.ts`, `<name>.model.ts`,
 * then add its router below.
 */
export interface ApiDependencies {
  health?: HealthDependencies;
  propertyService?: PropertyService;
  adminPropertyService?: AdminPropertyService;
  adminPropertyReadPermission?: RequestHandler;
  adminPropertyWritePermission?: RequestHandler;
  adminPropertyPublishPermission?: RequestHandler;
  adminPropertyAvailabilityPermission?: RequestHandler;
  inquiryService?: InquiryService;
  adminInquiryService?: AdminInquiryService;
  adminInquiryReadPermission?: RequestHandler;
  adminInquiryUpdatePermission?: RequestHandler;
  inquiryRateLimit?: RequestHandler;
  auth?: AuthRouteDependencies;
}

export function createApiRouter(dependencies: ApiDependencies = {}): Router {
  const router = Router();
  const auth = resolveAuthRouteDependencies(dependencies.auth);

  router.use("/health", createHealthRoutes(dependencies.health));
  router.use("/auth", createAuthRoutes(dependencies.auth, auth));
  router.use(
    "/admin/properties",
    createAdminPropertyRoutes({
      auth,
      ...(dependencies.adminPropertyService
        ? { service: dependencies.adminPropertyService }
        : {}),
      ...(dependencies.adminPropertyReadPermission
        ? { readPermission: dependencies.adminPropertyReadPermission }
        : {}),
      ...(dependencies.adminPropertyWritePermission
        ? { writePermission: dependencies.adminPropertyWritePermission }
        : {}),
      ...(dependencies.adminPropertyPublishPermission
        ? { publishPermission: dependencies.adminPropertyPublishPermission }
        : {}),
      ...(dependencies.adminPropertyAvailabilityPermission
        ? { availabilityPermission: dependencies.adminPropertyAvailabilityPermission }
        : {}),
    }),
  );
  router.use("/properties", createPropertyRoutes(dependencies.propertyService));
  router.use(
    "/admin/inquiries",
    createAdminInquiryRoutes({
      auth,
      ...(dependencies.adminInquiryService
        ? { service: dependencies.adminInquiryService }
        : {}),
      ...(dependencies.adminInquiryReadPermission
        ? { readPermission: dependencies.adminInquiryReadPermission }
        : {}),
      ...(dependencies.adminInquiryUpdatePermission
        ? { updatePermission: dependencies.adminInquiryUpdatePermission }
        : {}),
    }),
  );
  router.use(
    "/inquiries",
    createInquiryRoutes({
      service: dependencies.inquiryService,
      rateLimit: dependencies.inquiryRateLimit,
    }),
  );

  return router;
}

export default createApiRouter();
