import type { Request, Response } from "express";
import type { HealthResponse } from "@rc/shared";
import { env } from "../../config/env.js";
import { getDatabaseStatus } from "../../config/database.js";

/**
 * Reports that the API process is up and whether its MongoDB connection is live.
 * The response is typed by the shared contract, so any change to `HealthResponse`
 * breaks this handler and the frontend consumer at compile time.
 */
export function getHealth(_req: Request, res: Response<HealthResponse>): void {
  const body: HealthResponse = {
    status: "ok",
    service: "rc-premier-backend",
    timestamp: new Date().toISOString(),
    uptime: Number(process.uptime().toFixed(2)),
    environment: env.NODE_ENV,
    database: getDatabaseStatus(),
  };

  res.status(200).json(body);
}
