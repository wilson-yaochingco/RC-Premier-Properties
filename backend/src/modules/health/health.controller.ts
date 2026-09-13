import type { Request, Response } from "express";
import type { DatabaseStatus, HealthResponse, ReadinessResponse } from "@rc/shared";
import { env } from "../../config/env.js";
import { getDatabaseStatus } from "../../config/database.js";

export interface HealthDependencies {
  databaseStatus: () => DatabaseStatus;
}

const defaults: HealthDependencies = { databaseStatus: getDatabaseStatus };

function deploymentIdentity(): { buildId?: string } {
  return env.APP_BUILD_ID ? { buildId: env.APP_BUILD_ID } : {};
}

/** Liveness reports only that the API process can answer requests. */
export function createGetHealth(
  dependencies: HealthDependencies = defaults,
): (_req: Request, res: Response<HealthResponse>) => void {
  return (_req, res) => {
    const body: HealthResponse = {
      status: "ok",
      service: "rc-premier-backend",
      timestamp: new Date().toISOString(),
      uptime: Number(process.uptime().toFixed(2)),
      environment: env.NODE_ENV,
      database: dependencies.databaseStatus(),
      ...deploymentIdentity(),
    };

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(body);
  };
}

/** Readiness fails whenever MongoDB cannot safely serve required application work. */
export function createGetReadiness(
  dependencies: HealthDependencies = defaults,
): (_req: Request, res: Response<ReadinessResponse>) => void {
  return (_req, res) => {
    const database = dependencies.databaseStatus();
    const ready = database.status === "connected" && database.readyState === 1;
    const body: ReadinessResponse = {
      status: ready ? "ready" : "not-ready",
      service: "rc-premier-backend",
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      database,
      ...deploymentIdentity(),
    };

    res.setHeader("Cache-Control", "no-store");
    res.status(ready ? 200 : 503).json(body);
  };
}
