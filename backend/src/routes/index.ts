import { Router } from "express";
import healthRoutes from "./health.routes.js";

/**
 * Root API router, mounted at `/api` in `app.ts`.
 * Future feature routers are registered here, one line each.
 */
const router = Router();

router.use("/health", healthRoutes);

export default router;
