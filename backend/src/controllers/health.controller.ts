import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { getDatabaseStatus } from "../config/database.js";

/**
 * Reports that the API process is up and whether its MongoDB connection is live.
 * This is the only endpoint in the foundation and exists to verify the setup.
 */
export function getHealth(_req: Request, res: Response): void {
  res.status(200).json({
    status: "ok",
    service: "rc-premier-backend",
    timestamp: new Date().toISOString(),
    uptime: Number(process.uptime().toFixed(2)),
    environment: env.NODE_ENV,
    database: getDatabaseStatus(),
  });
}
