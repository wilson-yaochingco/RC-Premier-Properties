import { Router, raw, type RequestHandler } from "express";
import { MAX_PROPERTY_IMAGE_BYTES } from "@rc/shared";
import { HttpError } from "../../middleware/errorHandler.js";
import {
  noStore,
  requireAllowedOrigin,
  requireAuthentication,
  requireCsrf,
  requirePermission,
} from "../auth/auth.middleware.js";
import type { ResolvedAuthRouteDependencies } from "../auth/auth.routes.js";
import {
  createAdminPropertyController,
  createPropertyController,
} from "./property.controller.js";
import type { AdminPropertyService, PropertyService } from "./property.types.js";

export function createPropertyRoutes(service?: PropertyService): Router {
  const router = Router();
  const controller = createPropertyController(service);

  router.get("/facets", controller.facets);
  router.get("/map", controller.map);
  router.get("/:slug/related", controller.related);
  router.get("/:slug", controller.detail);
  router.get("/", controller.search);

  return router;
}

export interface AdminPropertyRouteDependencies {
  service?: AdminPropertyService;
  auth: ResolvedAuthRouteDependencies;
  readPermission?: RequestHandler;
  writePermission?: RequestHandler;
  publishPermission?: RequestHandler;
  availabilityPermission?: RequestHandler;
}

const requireJson: RequestHandler = (request, _response, next) => {
  if (!request.is("application/json")) {
    next(new HttpError(415, "Property requests must use application/json."));
    return;
  }
  next();
};

export function createAdminPropertyRoutes(
  dependencies: AdminPropertyRouteDependencies,
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

  const controller = createAdminPropertyController(dependencies.service);
  const authenticate = requireAuthentication(authService, cookies);
  const requireRead =
    dependencies.readPermission ??
    requirePermission(authService, "property:read-private");
  const requireWrite =
    dependencies.writePermission ?? requirePermission(authService, "property:write");
  const requirePublish =
    dependencies.publishPermission ??
    requirePermission(authService, "property:publish");
  const requireAvailability =
    dependencies.availabilityPermission ??
    requirePermission(authService, "property:change-availability");
  const allowedOrigin = requireAllowedOrigin(authService);
  const csrf = requireCsrf(authService);

  router.get("/", authenticate, requireRead, controller.list);
  router.get("/:id", authenticate, requireRead, controller.detail);
  router.post(
    "/",
    authenticate,
    allowedOrigin,
    csrf,
    requireWrite,
    requireJson,
    controller.create,
  );
  router.patch(
    "/:id",
    authenticate,
    allowedOrigin,
    csrf,
    requireWrite,
    requireJson,
    controller.update,
  );
  router.put(
    "/:id/media",
    authenticate,
    allowedOrigin,
    csrf,
    requireWrite,
    requireJson,
    controller.updateMedia,
  );
  router.post(
    "/:id/media/uploads",
    authenticate,
    allowedOrigin,
    csrf,
    requireWrite,
    raw({
      type: ["image/png", "image/jpeg", "image/webp"],
      limit: MAX_PROPERTY_IMAGE_BYTES,
    }),
    controller.uploadImage,
  );
  for (const [action, handler] of [
    ["publish", controller.publish],
    ["unpublish", controller.unpublish],
    ["archive", controller.archive],
    ["restore", controller.restore],
  ] as const) {
    router.post(
      `/:id/${action}`,
      authenticate,
      allowedOrigin,
      csrf,
      requirePublish,
      requireJson,
      handler,
    );
  }
  router.patch(
    "/:id/availability",
    authenticate,
    allowedOrigin,
    csrf,
    requireAvailability,
    requireJson,
    controller.changeAvailability,
  );
  router.patch(
    "/:id/featured",
    authenticate,
    allowedOrigin,
    csrf,
    requireWrite,
    requireJson,
    controller.updateFeatured,
  );

  return router;
}

export default createPropertyRoutes();
