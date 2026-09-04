import { Router } from "express";
import { createPropertyController } from "./property.controller.js";
import type { PropertyService } from "./property.types.js";

export function createPropertyRoutes(service?: PropertyService): Router {
  const router = Router();
  const controller = createPropertyController(service);

  router.get("/facets", controller.facets);
  router.get("/map", controller.map);
  router.get("/:slug", controller.detail);
  router.get("/", controller.search);

  return router;
}

export default createPropertyRoutes();
