import type { Request, Response } from "express";
import type {
  AdminAuditListResponse,
  AdminDashboardResponse,
  AdminStaffListResponse,
  AdminViewingCalendarResponse,
} from "@rc/shared";
import { mongooseAdminOperationsService } from "./admin-operations.service.js";
import type { AdminOperationsService } from "./admin-operations.types.js";
import {
  parseAdminAuditQuery,
  parseAdminStaffQuery,
  parseNoQuery,
  parseViewingCalendarQuery,
} from "./admin-operations.validation.js";

export function createAdminOperationsController(
  service: AdminOperationsService = mongooseAdminOperationsService,
) {
  return {
    async dashboard(request: Request, response: Response<AdminDashboardResponse>) {
      parseNoQuery(request.query);
      response.status(200).json(await service.dashboard());
    },
    async viewingCalendar(
      request: Request,
      response: Response<AdminViewingCalendarResponse>,
    ) {
      response
        .status(200)
        .json(await service.viewingCalendar(parseViewingCalendarQuery(request.query)));
    },
    async auditEvents(request: Request, response: Response<AdminAuditListResponse>) {
      response
        .status(200)
        .json(await service.auditEvents(parseAdminAuditQuery(request.query)));
    },
    async staff(request: Request, response: Response<AdminStaffListResponse>) {
      response
        .status(200)
        .json(await service.staff(parseAdminStaffQuery(request.query)));
    },
  };
}
