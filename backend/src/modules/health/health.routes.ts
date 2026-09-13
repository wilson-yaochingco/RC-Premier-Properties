import { Router } from "express";
import {
  createGetHealth,
  createGetReadiness,
  type HealthDependencies,
} from "./health.controller.js";

export function createHealthRoutes(dependencies?: HealthDependencies): Router {
  const router = Router();
  router.get("/", createGetHealth(dependencies));
  router.get("/ready", createGetReadiness(dependencies));
  return router;
}

export default createHealthRoutes();
