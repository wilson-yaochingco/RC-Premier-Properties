import { Router } from "express";
import healthRoutes from "./modules/health/health.routes.js";

/**
 * Root API router, mounted on `API_PREFIX` in `app.ts`.
 *
 * Each feature lives in its own folder under `src/modules/` and is registered here with
 * a single line. To add one, create `src/modules/<name>/` containing
 * `<name>.routes.ts`, `<name>.controller.ts`, `<name>.service.ts`, `<name>.model.ts`,
 * then add its router below.
 */
const router = Router();

router.use("/health", healthRoutes);

export default router;
