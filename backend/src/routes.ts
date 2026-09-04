import { Router, type RequestHandler } from "express";
import healthRoutes from "./modules/health/health.routes.js";
import { createPropertyRoutes } from "./modules/properties/property.routes.js";
import type { PropertyService } from "./modules/properties/property.types.js";
import { createInquiryRoutes } from "./modules/inquiries/inquiry.routes.js";
import type { InquiryService } from "./modules/inquiries/inquiry.types.js";

/**
 * Root API router, mounted on `API_PREFIX` in `app.ts`.
 *
 * Each feature lives in its own folder under `src/modules/` and is registered here with
 * a single line. To add one, create `src/modules/<name>/` containing
 * `<name>.routes.ts`, `<name>.controller.ts`, `<name>.service.ts`, `<name>.model.ts`,
 * then add its router below.
 */
export interface ApiDependencies {
  propertyService?: PropertyService;
  inquiryService?: InquiryService;
  inquiryRateLimit?: RequestHandler;
}

export function createApiRouter(dependencies: ApiDependencies = {}): Router {
  const router = Router();

  router.use("/health", healthRoutes);
  router.use("/properties", createPropertyRoutes(dependencies.propertyService));
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
